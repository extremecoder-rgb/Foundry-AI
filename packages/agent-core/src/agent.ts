import { ToolRegistry, AgentContext } from './types';
import { GeminiProvider, ChatMessage, ChatPart } from './llm';

export interface AgentConfig {
  name: string;
  systemPrompt: string;
  toolRegistry: ToolRegistry;
  llmProvider: GeminiProvider;
}

export class Agent {
  public name: string;
  private systemPrompt: string;
  private toolRegistry: ToolRegistry;
  private llmProvider: GeminiProvider;

  constructor(config: AgentConfig) {
    this.name = config.name;
    this.systemPrompt = config.systemPrompt;
    this.toolRegistry = config.toolRegistry;
    this.llmProvider = config.llmProvider;
  }

  async run(input: string, context: AgentContext): Promise<any> {
    console.log(`[Agent ${this.name}] Starting run ${context.runId} with input: ${input}`);
    if (context.log) {
      await context.log('info', `Agent ${this.name} started execution run`, { toolInput: { input } });
    }

    let iteration = 0;
    const maxIterations = 25; // Supports 20+ tool calls requirement
    let messages: ChatMessage[] = [
      { role: 'user', parts: [{ text: input }] }
    ];

    while (iteration < maxIterations) {
      iteration++;
      console.log(`[Agent ${this.name}] Iteration ${iteration}`);

      // 1. Condense history if it grows too long (to prevent context overflow and coherence loss)
      if (messages.length > 10) {
        messages = await this.summarizeHistory(messages);
      }

      // 2. Call Gemini model
      const response = await this.llmProvider.generate(
        messages,
        this.systemPrompt,
        this.toolRegistry.getAllTools()
      );

      if (response.toolCalls && response.toolCalls.length > 0) {
        // Model decided to call tools
        const toolCallParts: ChatPart[] = [];
        const responseParts: ChatPart[] = [];

        for (const toolCall of response.toolCalls) {
          console.log(`[Agent ${this.name}] Model requested tool call: ${toolCall.name} with args:`, toolCall.args);
          toolCallParts.push({
            functionCall: {
              name: toolCall.name,
              args: toolCall.args
            }
          });

          const tool = this.toolRegistry.getTool(toolCall.name);
          if (!tool) {
            const errorMsg = `Tool ${toolCall.name} not found in registry.`;
            console.error(`[Agent ${this.name}] ${errorMsg}`);
            responseParts.push({
              functionResponse: {
                name: toolCall.name,
                response: { error: errorMsg }
              }
            });
            if (context.log) {
              await context.log('error', errorMsg, { toolName: toolCall.name, toolInput: toolCall.args, error: errorMsg });
            }
            continue;
          }

          try {
            if (context.log) {
              await context.log('info', `Calling tool ${toolCall.name}`, { toolName: toolCall.name, toolInput: toolCall.args });
            }

            const toolResult = await tool.execute(toolCall.args, context);
            console.log(`[Agent ${this.name}] Tool ${toolCall.name} execution succeeded. Result:`, toolResult);
            responseParts.push({
              functionResponse: {
                name: toolCall.name,
                response: toolResult
              }
            });

            if (context.log) {
              await context.log('info', `Tool ${toolCall.name} finished successfully`, { toolName: toolCall.name, toolInput: toolCall.args, toolOutput: toolResult });
            }
          } catch (error: any) {
            console.error(`[Agent ${this.name}] Tool ${toolCall.name} execution failed. Error:`, error.message);
            responseParts.push({
              functionResponse: {
                name: toolCall.name,
                response: { error: error.message }
              }
            });

            if (context.log) {
              await context.log('error', `Tool ${toolCall.name} failed: ${error.message}`, { toolName: toolCall.name, toolInput: toolCall.args, error: error.message });
            }
          }
        }

        // Save tool request and response to history
        messages.push({ role: 'model', parts: toolCallParts });
        messages.push({ role: 'user', parts: responseParts });
        
        // Continue loop to send tool responses back to model
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
  }

  private async summarizeHistory(messages: ChatMessage[]): Promise<ChatMessage[]> {
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
      const summaryResult = await this.llmProvider.generate(
        [
          ...toSummarize,
          { role: 'user', parts: [{ text: summaryPrompt }] }
        ],
        'You are a precise summarization assistant.',
        []
      );

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
