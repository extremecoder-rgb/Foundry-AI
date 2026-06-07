import { z } from 'zod';
import { BaseTool, AgentContext, ToolRegistry } from './types';
import { Agent } from './agent';
import { GroqProvider } from './llm';

export type DelegateDomain = 'research' | 'product' | 'engineering' | 'finance';

export interface DelegateToolConfig {
  domain: DelegateDomain;
  systemPrompt: string;
  tools: BaseTool[];
  llmProvider: GroqProvider;
  maxIterations?: number;
}

const DELEGATE_INPUT_SCHEMA = z.object({
  task: z.string().describe(
    'A precise, self-contained task description for the subagent. Include the venture concept and any prior context it needs to produce a useful structured answer.'
  )
});

export class DelegateTool extends BaseTool<
  z.infer<typeof DELEGATE_INPUT_SCHEMA>,
  { result: any; subagentName: string; iterations: number }
> {
  name: string;
  description: string;
  namespace = 'orchestration';
  schema = DELEGATE_INPUT_SCHEMA;
  private subagentSystemPrompt: string;
  private subagentTools: BaseTool[];
  protected llmProvider: GroqProvider;
  private subagentName: string;
  private maxIterations: number;

  constructor(config: DelegateToolConfig) {
    super();
    this.name = `delegate_to_${config.domain}`;
    this.description = `Delegate a sub-task to the ${config.domain} subagent. The subagent has its own isolated tool registry and will run autonomously. Pass a self-contained task description; the subagent returns a structured summary you can synthesize into the final blueprint.`;
    this.subagentSystemPrompt = config.systemPrompt;
    this.subagentTools = config.tools;
    this.llmProvider = config.llmProvider;
    this.subagentName = `${config.domain}-subagent`;
    this.maxIterations = config.maxIterations ?? 6;
  }

  async execute(
    input: z.infer<typeof DELEGATE_INPUT_SCHEMA>,
    context: AgentContext
  ): Promise<{ result: any; subagentName: string; iterations: number }> {
    const subagentRegistry = new ToolRegistry();
    for (const tool of this.subagentTools) {
      subagentRegistry.registerTool(tool);
    }

    const subagent = new Agent({
      name: this.subagentName,
      systemPrompt: this.subagentSystemPrompt,
      toolRegistry: subagentRegistry,
      llmProvider: this.llmProvider
    });

    const subrunId = `${context.runId}/${this.subagentName}-${Date.now()}`;
    if (context.log) {
      await context.log('info', `Delegating to ${this.subagentName}`, {
        toolName: this.name,
        toolInput: input,
        agent: this.subagentName,
        subrunId
      });
    }

    const propagateLog: AgentContext['log'] = async (level, message, detail) => {
      if (context.log) {
        await context.log(level, `[${this.subagentName}] ${message}`, {
          ...(detail || {}),
          agent: this.subagentName,
          subrunId
        });
      }
    };

    const output = await subagent.run(input.task, {
      runId: subrunId,
      log: propagateLog,
      metadata: { parentRunId: context.runId, parentAgent: 'CEO-Parent', domain: this.subagentName }
    });

    if (context.log) {
      await context.log('info', `${this.subagentName} returned`, {
        toolName: this.name,
        toolOutput: { iterations: output.iterations, contentLength: (output.content || '').length },
        agent: this.subagentName,
        subrunId,
        iterations: output.iterations
      });
    }

    return {
      result: output.content,
      subagentName: this.subagentName,
      iterations: output.iterations
    };
  }
}
