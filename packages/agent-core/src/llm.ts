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

  constructor(config: { apiKey?: string; apiKeys?: string[]; model?: string } = {}) {
    const singleKey = config.apiKey || process.env.GEMINI_API_KEY;
    const multiKeys = process.env.GEMINI_API_KEYS ? process.env.GEMINI_API_KEYS.split(',').map(k => k.trim()).filter(k => k) : [];
    
    this.apiKeys = config.apiKeys || (multiKeys.length > 0 ? multiKeys : (singleKey ? [singleKey] : []));
    
    if (this.apiKeys.length === 0) {
      throw new Error('No API keys provided. Please set GEMINI_API_KEY or GEMINI_API_KEYS.');
    }
    
    // Defaulting back to flash, since rotation solves the limit
    this.model = config.model || 'gemini-2.5-flash';
  }

  private getClient(): GoogleGenAI {
    const key = this.apiKeys[this.currentKeyIndex];
    // Round-robin rotation for the next call
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
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
    const config: any = {};
    if (systemInstruction) {
      config.systemInstruction = systemInstruction;
    }

    if (tools && tools.length > 0) {
      const functionDeclarations = tools.map(tool => {
        const schema = zodToJsonSchema(tool.schema as any);
        // Clean schema for Gemini format (Gemini expects schema at parameters root, without schema $schema prefix etc.)
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
}
