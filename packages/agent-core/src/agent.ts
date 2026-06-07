import { ToolRegistry, AgentContext } from './types';
import { GroqProvider, ChatMessage, ChatPart } from './llm';
import { withRetry, getRateLimiterForNamespace } from './resilience';
import { AgentTracer } from './tracing';

export interface AgentConfig {
  name: string;
  systemPrompt: string;
  toolRegistry: ToolRegistry;
  llmProvider: GroqProvider;
}

export class Agent {
  public name: string;
  private systemPrompt: string;
  private toolRegistry: ToolRegistry;
  private llmProvider: GroqProvider;

  constructor(config: AgentConfig) {
    this.name = config.name;
    this.systemPrompt = config.systemPrompt;
    this.toolRegistry = config.toolRegistry;
    this.llmProvider = config.llmProvider;
    for (const tool of this.toolRegistry.getAllTools()) {
      tool.setLLMProvider(this.llmProvider);
    }
  }

  async run(input: string, context: AgentContext): Promise<any> {
    return AgentTracer.traceCall(`Agent ${this.name} Run`, { runId: context.runId, agentName: this.name }, async (span) => {
      console.log(`[Agent ${this.name}] Starting run ${context.runId} with input: ${input}`);
      if (context.log) {
        await context.log('info', `Agent ${this.name} started execution run`, {
          toolInput: { input },
          agent: this.name,
          runId: context.runId,
          subrunId: context.runId
        });
      }

      let iteration = 0;
      const maxIterations = this.name === 'CEO-Parent' ? 10 : 6;
      let messages: ChatMessage[] = [
        { role: 'user', parts: [{ text: input }] }
      ];

      while (iteration < maxIterations) {
        iteration++;
        console.log(`[Agent ${this.name}] Iteration ${iteration}`);
        if (context.log) {
          await context.log('info', `${this.name} iteration ${iteration}`, {
            agent: this.name,
            iteration,
            subrunId: context.runId
          });
        }

        if (messages.length > 8) {
          messages = await this.summarizeHistory(messages, context);
        }

        const response = await withRetry(async () => {
          return await this.llmProvider.generate(
            messages,
            this.systemPrompt,
            this.toolRegistry.getAllTools()
          );
        }, {
          retries: this.name === 'CEO-Parent' ? 2 : 3,
          minTimeoutMs: 1000,
          factor: 2
        });

        if (response.toolCalls && response.toolCalls.length > 0) {
          const toolCallParts: ChatPart[] = response.toolCalls.map(tc => ({
            functionCall: { name: tc.name, args: tc.args }
          }));

          const toolResults = await Promise.all(response.toolCalls.map(async (toolCall) => {
            console.log(`[Agent ${this.name}] Model requested tool call: ${toolCall.name} with args:`, toolCall.args);

            const tool = this.toolRegistry.getTool(toolCall.name);
            if (!tool) {
              const errorMsg = `Tool ${toolCall.name} not found in registry.`;
              console.error(`[Agent ${this.name}] ${errorMsg}`);
              if (context.log) {
                await context.log('error', errorMsg, { toolName: toolCall.name, toolInput: toolCall.args, error: errorMsg, agent: this.name, subrunId: context.runId });
              }
              return { toolCall, resultPart: { functionResponse: { name: toolCall.name, response: { error: errorMsg } } } };
            }

            try {
              const limiter = getRateLimiterForNamespace(tool.namespace);
              await limiter.waitForToken();

              if (context.log) {
                await context.log('info', `Calling tool ${toolCall.name}`, { toolName: toolCall.name, toolInput: toolCall.args, agent: this.name, subrunId: context.runId });
              }

              const toolResult = await withRetry(async () => {
                return await AgentTracer.traceCall(`Tool ${toolCall.name} Execute`, { toolName: toolCall.name }, async () => {
                  return await tool.execute(toolCall.args, context);
                });
              }, {
                retries: 3,
                minTimeoutMs: 100,
                factor: 2
              });

              console.log(`[Agent ${this.name}] Tool ${toolCall.name} execution succeeded. Result:`, toolResult);
              if (context.log) {
                await context.log('info', `Tool ${toolCall.name} finished successfully`, { toolName: toolCall.name, toolInput: toolCall.args, toolOutput: toolResult, agent: this.name, subrunId: context.runId });
              }
              return { toolCall, resultPart: { functionResponse: { name: toolCall.name, response: toolResult } } };
            } catch (error: any) {
              console.error(`[Agent ${this.name}] Tool ${toolCall.name} execution failed. Error:`, error.message);
              if (context.log) {
                await context.log('error', `Tool ${toolCall.name} failed: ${error.message}`, { toolName: toolCall.name, toolInput: toolCall.args, error: error.message, agent: this.name, subrunId: context.runId });
              }
              return { toolCall, resultPart: { functionResponse: { name: toolCall.name, response: { error: error.message } } } };
            }
          }));

          const responseParts: ChatPart[] = toolResults.map(r => r.resultPart);

          messages.push({ role: 'model', parts: toolCallParts });
          messages.push({ role: 'user', parts: responseParts });

          continue;
        }

        // No tool calls, we have the final output
        console.log(`[Agent ${this.name}] Execution finished with response: ${response.content}`);
        if (context.log) {
          await context.log('info', `Agent ${this.name} finished execution successfully`, { toolOutput: { content: response.content } });
        }

        return {
          status: 'success',
          content: response.content,
          iterations: iteration
        };
      }

      const maxExceededError = `Agent ${this.name} exceeded maximum iterations (${maxIterations}) without reaching a final answer.`;
      if (context.log) {
        await context.log('error', maxExceededError, { error: maxExceededError });
      }
      throw new Error(maxExceededError);
    });
  }

  private async summarizeHistory(messages: ChatMessage[], context: AgentContext): Promise<ChatMessage[]> {
    console.log(`[Agent ${this.name}] History length is ${messages.length}. Condensing history to prevent plan coherence loss...`);

    const toSummarize = messages.slice(0, messages.length - 2);
    const toKeep = messages.slice(messages.length - 2);

    const summaryPrompt = `
You are a context compression assistant. Summarize the following execution steps of an autonomous agent.
Include:
1. The original goal.
2. The tools that were executed and their key outcomes.
3. The current status of the task.

Do not lose key data points (such as competitor names, metrics, or specific requirements).
Keep it concise but detailed enough to maintain full context.
`;

    try {
      const summaryResult = await withRetry(async () => {
        return await this.llmProvider.generate(
          [
            ...toSummarize,
            { role: 'user', parts: [{ text: summaryPrompt }] }
          ],
          'You are a precise summarization assistant.',
          []
        );
      }, {
        retries: 3,
        minTimeoutMs: 1500,
        factor: 2
      });

      const summaryText = summaryResult.content || 'Summary of previous steps completed.';
      console.log(`[Agent ${this.name}] Successfully condensed history. Summary: "${summaryText.substring(0, 100)}..."`);

      return [
        { role: 'user', parts: [{ text: `SUMMARY OF PREVIOUSLY COMPLETED STEPS:\n${summaryText}` }] },
        ...toKeep
      ];
    } catch (e: any) {
      console.warn(`[Agent ${this.name}] Failed to summarize history, continuing with raw history. Error:`, e.message);
      return messages;
    }
  }
}
