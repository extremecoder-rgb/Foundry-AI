import { GoogleGenAI } from '@google/genai';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { BaseTool } from './types';

export interface ChatPart {
  text?: string;
  functionCall?: {
    name: string;
    args: any;
  };
  functionResponse?: {
    name: string;
    response: any;
  };
}

export interface ChatMessage {
  role: 'user' | 'model';
  parts: ChatPart[];
}

export class GeminiProvider {
  private apiKeys: string[];
  private currentKeyIndex: number = 0;
  private model: string;
  private isGroq: boolean = false;

  constructor(config: { apiKey?: string; apiKeys?: string[]; model?: string } = {}) {
    const hasGroq = !!(process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY);
    this.isGroq = hasGroq;

    if (this.isGroq) {
      const rawKeysString = config.apiKey || process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || '';
      this.apiKeys = rawKeysString.split(',').map(k => k.trim()).filter(k => k);
      this.model = config.model || 'llama-3.3-70b-versatile';
    } else {
      const rawKeysString = config.apiKey || process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || '';
      this.apiKeys = rawKeysString.split(',').map(k => k.trim()).filter(k => k);
      this.model = config.model || 'gemini-2.5-flash';
    }
    
    if (this.apiKeys.length === 0) {
      throw new Error(this.isGroq ? 'No Groq API keys provided. Please set GROQ_API_KEY or GROQ_API_KEYS.' : 'No Gemini API keys provided. Please set GEMINI_API_KEY or GEMINI_API_KEYS.');
    }
  }

  private getClientKey(): string {
    const key = this.apiKeys[this.currentKeyIndex];
    // Round-robin rotation for the next call
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
    return key;
  }

  private getClient(): GoogleGenAI {
    const key = this.getClientKey();
    return new GoogleGenAI({ apiKey: key });
  }

  async generate(
    messages: ChatMessage[],
    systemInstruction?: string,
    tools?: BaseTool[]
  ): Promise<{
    content: string | null;
    toolCalls?: Array<{
      name: string;
      args: any;
    }>;
  }> {
    if (this.isGroq) {
      return this.generateGroq(messages, systemInstruction, tools);
    }

    const config: any = {};
    if (systemInstruction) {
      config.systemInstruction = systemInstruction;
    }

    if (tools && tools.length > 0) {
      const functionDeclarations = tools.map(tool => {
        const schema = zodToJsonSchema(tool.schema as any);
        const cleanedSchema = {
          type: 'OBJECT',
          properties: (schema as any).properties || {},
          required: (schema as any).required || [],
        };
        return {
          name: tool.name,
          description: tool.description,
          parameters: cleanedSchema,
        };
      });

      config.tools = [{ functionDeclarations }];
    }

    try {
      const ai = this.getClient();
      const response = await ai.models.generateContent({
        model: this.model,
        contents: messages,
        config
      });

      const candidate = response.candidates?.[0];
      const part = candidate?.content?.parts?.[0];

      if (part?.functionCall) {
        return {
          content: null,
          toolCalls: [{
            name: part.functionCall.name || '',
            args: part.functionCall.args,
          }]
        };
      }

      return {
        content: part?.text || '',
      };
    } catch (error: any) {
      console.error('Gemini API Error:', error);
      throw error;
    }
  }

  private async generateGroq(
    messages: ChatMessage[],
    systemInstruction?: string,
    tools?: BaseTool[]
  ): Promise<{
    content: string | null;
    toolCalls?: Array<{
      name: string;
      args: any;
    }>;
  }> {
    const openAIMessages: any[] = [];
    if (systemInstruction) {
      openAIMessages.push({ role: 'system', content: systemInstruction });
    }

    const toolCallIdMap = new Map<string, string>();
    let callCounter = 0;

    for (const msg of messages) {
      if (msg.role === 'user') {
        const toolParts = msg.parts.filter(p => p.functionResponse);
        if (toolParts.length > 0) {
          for (const part of toolParts) {
            const fnResp = part.functionResponse!;
            const id = toolCallIdMap.get(fnResp.name) || `call_mock_${callCounter++}`;
            openAIMessages.push({
              role: 'tool',
              tool_call_id: id,
              name: fnResp.name,
              content: typeof fnResp.response === 'string' ? fnResp.response : JSON.stringify(fnResp.response)
            });
          }
        } else {
          const text = msg.parts.map(p => p.text || '').join('\n');
          openAIMessages.push({ role: 'user', content: text });
        }
      } else if (msg.role === 'model') {
        const callParts = msg.parts.filter(p => p.functionCall);
        if (callParts.length > 0) {
          const tool_calls = callParts.map(part => {
            const fnCall = part.functionCall!;
            const id = `call_${fnCall.name}_${callCounter++}`;
            toolCallIdMap.set(fnCall.name, id);
            return {
              id,
              type: 'function',
              function: {
                name: fnCall.name,
                arguments: typeof fnCall.args === 'string' ? fnCall.args : JSON.stringify(fnCall.args)
              }
            };
          });
          openAIMessages.push({ role: 'assistant', tool_calls });
        } else {
          const text = msg.parts.map(p => p.text || '').join('\n');
          openAIMessages.push({ role: 'assistant', content: text });
        }
      }
    }

    const openAITools = (tools || []).map(tool => {
      const schema = zodToJsonSchema(tool.schema as any);
      return {
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: {
            type: 'object',
            properties: (schema as any).properties || {},
            required: (schema as any).required || []
          }
        }
      };
    });

    const apiKey = this.getClientKey();
    const payload: any = {
      model: this.model,
      messages: openAIMessages,
      temperature: 0.1
    };

    if (openAITools.length > 0) {
      payload.tools = openAITools;
    }

    try {
      const response = await (globalThis as any).fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Groq API Error (${response.status}): ${errorText}`);
      }

      const responseData: any = await response.json();
      const message = responseData.choices?.[0]?.message;
      const content = message?.content || null;
      
      let toolCalls: any[] | undefined = undefined;
      if (message?.tool_calls && message.tool_calls.length > 0) {
        toolCalls = message.tool_calls.map((tc: any) => {
          let parsedArgs = {};
          try {
            parsedArgs = typeof tc.function.arguments === 'string' 
              ? JSON.parse(tc.function.arguments) 
              : tc.function.arguments;
          } catch (e) {
            console.error('Failed to parse tool arguments from Groq:', tc.function.arguments);
          }
          return {
            name: tc.function.name,
            args: parsedArgs
          };
        });
      }

      return {
        content,
        toolCalls
      };
    } catch (error: any) {
      console.error('Groq API Call Error:', error.message);
      throw error;
    }
  }
}
