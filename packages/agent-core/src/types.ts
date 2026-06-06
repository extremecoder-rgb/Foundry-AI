import { z } from 'zod';

export interface AgentContext {
  runId: string;
  metadata?: Record<string, any>;
  log?: (
    level: 'info' | 'warn' | 'error',
    message: string,
    detail?: { toolName?: string; toolInput?: any; toolOutput?: any; error?: string }
  ) => Promise<void>;
}

export abstract class BaseTool<TInput = any, TOutput = any> {
  abstract name: string;
  abstract description: string;
  abstract namespace: string;
  abstract schema: z.ZodType<TInput>;

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
