import { BaseTool, AgentContext, ToolRegistry } from './types';
import { Agent } from './agent';
import { GroqProvider } from './llm';
import { z } from 'zod';

export class SubagentTool extends BaseTool<
  { task: string; agentType: 'researcher' | 'writer' | 'programmer' },
  { result: any }
> {
  name = 'spawn_subagent';
  description = 'Spawn a subagent to execute a specific sub-task in isolation and return a structured result.';
  namespace = 'orchestration';
  schema = z.object({
    task: z.string().describe('The task description for the subagent to perform.'),
    agentType: z.enum(['researcher', 'writer', 'programmer']).describe('The type of subagent to spawn.')
  });

  private provider: GroqProvider;

  constructor(provider: GroqProvider) {
    super();
    this.provider = provider;
  }

  async execute(
    input: { task: string; agentType: 'researcher' | 'writer' | 'programmer' },
    context: AgentContext
  ): Promise<{ result: any }> {
    // 1. Create a completely isolated ToolRegistry for the subagent
    const subagentRegistry = new ToolRegistry();
    
    // Scoped tools based on agent type
    let systemPrompt = '';
    if (input.agentType === 'researcher') {
      systemPrompt = 'You are a research subagent. Your goal is to analyze, summarize, and extract key insights about the given task. Do not make assumptions, report factual data.';
      // Register researcher-specific tools here (e.g., ReadFileTool can be passed or registered)
    } else if (input.agentType === 'writer') {
      systemPrompt = 'You are a writing subagent. Your goal is to draft clear, structured documentation, summaries, or reports based on the inputs.';
    } else if (input.agentType === 'programmer') {
      systemPrompt = 'You are a programmer subagent. Your goal is to architect solutions, outline code structures, or write code snippets.';
    }

    // 2. Create the subagent in an isolated context
    const subagent = new Agent({
      name: `${input.agentType}-subagent`,
      systemPrompt,
      toolRegistry: subagentRegistry,
      llmProvider: this.provider
    });

    const subrunId = `${context.runId}/${input.agentType}-${Date.now()}`;
    console.log(`[SubagentTool] Spawning isolated ${input.agentType} subagent (Subrun ID: ${subrunId})`);

    const output = await subagent.run(input.task, {
      runId: subrunId,
      metadata: { parentRunId: context.runId }
    });

    return { result: output };
  }
}
