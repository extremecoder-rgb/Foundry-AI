import { Agent, AgentContext, GeminiProvider, ToolRegistry, EvaluationHarness } from '@foundry/agent-core';
import { ReadFileTool, WriteFileTool } from '@foundry/tools-system';
import { WebSearchTool } from '@foundry/tools-research';
import { DefineRequirementsTool, WriteUserStoriesTool } from '@foundry/tools-product';
import { ArchitectSystemTool, SelectTechStackTool } from '@foundry/tools-engineering';
import { EstimateCostsTool, PriceStrategyTool } from '@foundry/tools-finance';
import { randomUUID } from 'crypto';

async function bootstrap() {
  console.log('--- Foundry AI E2E Execution Script ---');

  // 1. Initialize Registry with a subset of tools across all 5 namespaces to simulate full workflow
  const registry = new ToolRegistry();
  registry.registerTool(new ReadFileTool());
  registry.registerTool(new WriteFileTool());
  registry.registerTool(new WebSearchTool());
  registry.registerTool(new DefineRequirementsTool());
  registry.registerTool(new WriteUserStoriesTool());
  registry.registerTool(new ArchitectSystemTool());
  registry.registerTool(new SelectTechStackTool());
  registry.registerTool(new EstimateCostsTool());
  registry.registerTool(new PriceStrategyTool());

  // 2. Initialize LLM Provider (Using mock/test setup or standard env API Key)
  const llmProvider = new GeminiProvider(process.env.GEMINI_API_KEY || 'mock-key');

  // 3. Initialize CEO Agent
  const ceoAgent = new Agent({
    name: 'CEO-Agent',
    systemPrompt: `You are the CEO Agent of Foundry AI. Your job is to orchestrate a venture blueprint.
You have access to cross-functional tools (System, Research, Product, Engineering, Finance).
Orchestrate a blueprint for the following venture idea and output a structured JSON plan.`,
    toolRegistry: registry,
    llmProvider: llmProvider
  });

  const context: AgentContext = {
    runId: randomUUID(),
    log: async (level, message, meta) => {
      // Simulate Database Logging
      console.log(`[DB-LOG] ${level.toUpperCase()}: ${message}`);
    }
  };

  const inputTask = 'Generate a venture blueprint for an AI-driven marketing automation SaaS.';
  console.log(`Starting CEO Agent with task: "${inputTask}"`);

  try {
    const result = await ceoAgent.run(inputTask, context);
    console.log('\n--- Final CEO Output ---');
    console.log(result.content);
    
    // Evaluate if output was valid JSON (Mock evaluation demonstration)
    console.log('\n--- Evaluating Output against Gold Standard ---');
    const mockGeneratedBlueprint = {
      concept: 'AI Marketing Automation SaaS',
      namespacesCovered: ['system', 'research', 'product', 'engineering', 'finance'],
      productRequirements: ['Automated email sequence', 'Customer segmentation'],
      architectureModules: ['Email Engine', 'Analytics DB'],
      financialModel: {
        monthlyOpexEstimate: 12500,
        pricingStrategy: [{ planName: 'Starter', price: 49 }, { planName: 'Pro', price: 149 }]
      },
      competitors: ['Mailchimp', 'Hubspot']
    };

    const goldStandard = {
      financialModel: {
        monthlyOpexEstimate: 15000,
        pricingStrategy: [{ planName: 'Starter', price: 50 }]
      }
    };

    const evalResult = EvaluationHarness.evaluate(mockGeneratedBlueprint, goldStandard);
    console.log('Evaluation Score:', evalResult.score + '/100');
    console.log('Criteria Met:', evalResult.criteria);
    console.log('Feedback:', evalResult.feedback.join(' | '));
  } catch (err: any) {
    console.error('Execution Failed:', err.message);
  }
}

bootstrap();
