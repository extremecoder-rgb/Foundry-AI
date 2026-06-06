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
    let iteration = 0;
    const maxIterations = 25; // Supports 20+ tool calls requirement

    const messages: ChatMessage[] = [
      { role: 'user', parts: [{ text: input }] }
    ];

    while (iteration < maxIterations) {
      iteration++;
      console.log(`[Agent ${this.name}] Iteration ${iteration}`);

      // Call Gemini model
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
            console.error(`[Agent ${this.name}] Tool ${toolCall.name} not found in registry.`);
            responseParts.push({
              functionResponse: {
                name: toolCall.name,
                response: { error: `Tool ${toolCall.name} not found.` }
              }
            });
            continue;
          }

          try {
            const toolResult = await tool.execute(toolCall.args, context);
            console.log(`[Agent ${this.name}] Tool ${toolCall.name} execution succeeded. Result:`, toolResult);
            responseParts.push({
              functionResponse: {
                name: toolCall.name,
                response: toolResult
              }
            });
          } catch (error: any) {
            console.error(`[Agent ${this.name}] Tool ${toolCall.name} execution failed. Error:`, error.message);
            responseParts.push({
              functionResponse: {
                name: toolCall.name,
                response: { error: error.message }
              }
            });
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
      return {
        status: 'success',
        content: response.content,
        iterations: iteration
      };
    }

    throw new Error(`Agent ${this.name} exceeded maximum iterations (${maxIterations}) without reaching a final answer.`);
  }
}
