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
  private ai: GoogleGenAI;
  private model: string;

  constructor(config: { apiKey?: string; model?: string } = {}) {
    const apiKey = config.apiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not defined. Please set the environment variable or pass it to GeminiProvider.');
    }
    this.ai = new GoogleGenAI({ apiKey });
    this.model = config.model || 'gemini-1.5-flash';
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
      const response = await this.ai.models.generateContent({
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
