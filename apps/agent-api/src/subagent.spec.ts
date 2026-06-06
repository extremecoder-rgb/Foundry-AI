import { Agent, ToolRegistry, SubagentTool, GroqProvider } from '@foundry/agent-core';

class MockGroqProvider extends GroqProvider {
  private callCount = 0;

  constructor() {
    super({ apiKey: 'dummy-key' });
  }

  override async generate(messages: any[], systemInstruction?: string, tools?: any[]): Promise<any> {
    this.callCount++;
    // If the system instruction belongs to the writer subagent
    if (systemInstruction?.includes('writing subagent')) {
      return {
        content: 'Mocked subagent document contents.'
      };
    }

    // Parent agent logic
    if (this.callCount === 1) {
      return {
        content: null,
        toolCalls: [{
          name: 'spawn_subagent',
          args: {
            task: 'Please write a business plan draft.',
            agentType: 'writer'
          }
        }]
      };
    }

    // Second call: parent agent receives subagent's response and finishes
    return {
      content: `I received the drafted document: "${messages[messages.length - 1]?.parts?.[0]?.functionResponse?.response?.result?.content || ''}"`
    };
  }
}

describe('Subagent Orchestration & Isolation', () => {
  it('should spawn a subagent in an isolated context and return result to parent', async () => {
    const mockProvider = new MockGroqProvider();
    const registry = new ToolRegistry();
    
    // Register the SubagentTool to the parent
    registry.registerTool(new SubagentTool(mockProvider));

    const parentAgent = new Agent({
      name: 'CEO-Parent',
      systemPrompt: 'You are the parent CEO agent.',
      toolRegistry: registry,
      llmProvider: mockProvider
    });

    const result = await parentAgent.run(
      'Spawn a subagent to write a business plan.',
      { runId: 'test-parent-run-id' }
    );

    expect(result.status).toBe('success');
    expect(result.iterations).toBe(2);
    expect(result.content).toContain('Mocked subagent document contents.');
  });
});

