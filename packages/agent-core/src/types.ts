import { z } from 'zod';
import type { GroqProvider } from './llm';

export interface AgentContext {
  runId: string;
  metadata?: Record<string, any>;
  llmProvider?: GroqProvider;
  log?: (
    level: 'info' | 'warn' | 'error',
    message: string,
    detail?: { toolName?: string; toolInput?: any; toolOutput?: any; error?: string; agent?: string; iteration?: number; iterations?: number; runId?: string; subrunId?: string }
  ) => Promise<void>;
}

export abstract class BaseTool<TInput = any, TOutput = any> {
  abstract name: string;
  abstract description: string;
  abstract namespace: string;
  abstract schema: z.ZodType<TInput>;

  protected llmProvider?: GroqProvider;

  setLLMProvider(provider: GroqProvider | undefined) {
    this.llmProvider = provider;
  }

  protected resolveLLM(context?: AgentContext): GroqProvider | undefined {
    return context?.llmProvider || this.llmProvider;
  }

  abstract execute(input: TInput, context: AgentContext): Promise<TOutput>;
}

export class ToolRegistry {
  private tools = new Map<string, BaseTool>();

  registerTool(tool: BaseTool) {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool ${tool.name} is already registered`);
    }
    this.tools.set(tool.name, tool);
  }

  getTool(name: string): BaseTool | undefined {
    return this.tools.get(name);
  }

  getAllTools(): BaseTool[] {
    return Array.from(this.tools.values());
  }

  getToolsByNamespace(namespace: string): BaseTool[] {
    return this.getAllTools().filter(tool => tool.namespace === namespace);
  }
}
