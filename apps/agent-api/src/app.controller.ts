import { Controller, Get, Post, Body } from '@nestjs/common';
import { AppService } from './app.service';
import {
  Agent,
  AgentContext,
  GroqProvider,
  ToolRegistry,
  BaseTool,
  DelegateTool,
  EvaluationHarness
} from '@foundry/agent-core';
import {
  ReadFileTool,
  WriteFileTool,
  ListDirTool,
  SearchDirTool,
  FileMetadataTool,
  MakeDirTool,
  DeleteFileTool,
  CheckDiskSpaceTool,
  GetEnvTool,
  RenameFileTool,
  ZipFolderTool,
  UnzipFolderTool
} from '@foundry/tools-system';
import {
  WebSearchTool,
  ScrapeUrlTool,
  AnalyzeTrendsTool,
  CompetitorAnalysisTool,
  SearchTrendsTool,
  GetNewsTool,
  FindProductHuntTool,
  CrawlSiteTool,
  ExtractEmailTool,
  CheckDomainNameTool,
  AnalyzeSentimentTool,
  SummarizeArticleTool
} from '@foundry/tools-research';
import {
  DefineRequirementsTool,
  WriteUserStoriesTool,
  DesignWireframeSpecTool,
  MapUserJourneyTool,
  PrioritizeBacklogTool,
  DefinePersonaTool,
  DrawFlowchartTool,
  CompareFeaturesTool,
  EstimateVelocityTool,
  WriteReleaseNotesTool,
  CalculateNpsTool,
  MapCustomerJourneyTool
} from '@foundry/tools-product';
import {
  ArchitectSystemTool,
  SelectTechStackTool,
  ScaffoldRepositoryTool,
  GenerateSchemaTool,
  GenerateRoutesTool,
  MockDatabaseDataTool,
  RunLinterTool,
  CheckDependenciesTool,
  EstimateLoCTool,
  CodeComplexityTool,
  CalculateTestCoverageTool,
  AuditSecurityTool
} from '@foundry/tools-engineering';
import {
  BuildFinancialModelTool,
  EstimateCostsTool,
  PriceStrategyTool,
  BreakEvenAnalysisTool,
  ProjectRevenueTool,
  TaxEstimatorTool,
  SubscriptionCalculatorTool,
  CapTableSimulatorTool,
  LtvCacEstimatorTool,
  MarketingBudgetPlanTool,
  EstimateValuationTool,
  SimulateTaxScenariosTool
} from '@foundry/tools-finance';
import { randomUUID } from 'crypto';

interface TraceEvent {
  timestamp: string;
  level: string;
  message: string;
  meta?: any;
}

interface OrchestratorResult {
  success: boolean;
  runId: string;
  blueprint: string;
  evaluation?: any;
  logs: TraceEvent[];
  trace: {
    ceoIterations: number;
    subagents: Array<{ name: string; iterations: number }>;
  };
  error?: string;
}

function loadEnv() {
  const envPaths = [
    require('path').resolve(__dirname, '../../../.env'),
    require('path').resolve(__dirname, '../../../../.env'),
    require('path').resolve(process.cwd(), '../../.env'),
    require('path').resolve(process.cwd(), '.env')
  ];
  for (const p of envPaths) {
    if (require('fs').existsSync(p)) {
      require('dotenv').config({ path: p });
      return;
    }
  }
}

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  private buildCatalogRegistry(): ToolRegistry {
    const registry = new ToolRegistry();
    [
      new ReadFileTool(), new WriteFileTool(), new ListDirTool(), new SearchDirTool(),
      new FileMetadataTool(), new MakeDirTool(), new DeleteFileTool(), new CheckDiskSpaceTool(),
      new GetEnvTool(), new RenameFileTool(), new ZipFolderTool(), new UnzipFolderTool()
    ].forEach(t => registry.registerTool(t));
    [
      new WebSearchTool(), new ScrapeUrlTool(), new AnalyzeTrendsTool(), new CompetitorAnalysisTool(),
      new SearchTrendsTool(), new GetNewsTool(), new FindProductHuntTool(), new CrawlSiteTool(),
      new ExtractEmailTool(), new CheckDomainNameTool(), new AnalyzeSentimentTool(), new SummarizeArticleTool()
    ].forEach(t => registry.registerTool(t));
    [
      new DefineRequirementsTool(), new WriteUserStoriesTool(), new DesignWireframeSpecTool(),
      new MapUserJourneyTool(), new PrioritizeBacklogTool(), new DefinePersonaTool(),
      new DrawFlowchartTool(), new CompareFeaturesTool(), new EstimateVelocityTool(),
      new WriteReleaseNotesTool(), new CalculateNpsTool(), new MapCustomerJourneyTool()
    ].forEach(t => registry.registerTool(t));
    [
      new ArchitectSystemTool(), new SelectTechStackTool(), new ScaffoldRepositoryTool(),
      new GenerateSchemaTool(), new GenerateRoutesTool(), new MockDatabaseDataTool(),
      new RunLinterTool(), new CheckDependenciesTool(), new EstimateLoCTool(),
      new CodeComplexityTool(), new CalculateTestCoverageTool(), new AuditSecurityTool()
    ].forEach(t => registry.registerTool(t));
    [
      new BuildFinancialModelTool(), new EstimateCostsTool(), new PriceStrategyTool(),
      new BreakEvenAnalysisTool(), new ProjectRevenueTool(), new TaxEstimatorTool(),
      new SubscriptionCalculatorTool(), new CapTableSimulatorTool(), new LtvCacEstimatorTool(),
      new MarketingBudgetPlanTool(), new EstimateValuationTool(), new SimulateTaxScenariosTool()
    ].forEach(t => registry.registerTool(t));
    return registry;
  }

  private buildResearchSubagent(llmProvider: GroqProvider, contextLLM: GroqProvider): DelegateTool {
    const tools: BaseTool[] = [
      new WebSearchTool(),
      new ScrapeUrlTool(),
      new AnalyzeTrendsTool(),
      new CompetitorAnalysisTool(),
      new SearchTrendsTool(),
      new GetNewsTool(),
      new AnalyzeSentimentTool()
    ];
    for (const t of tools) t.setLLMProvider(contextLLM);
    return new DelegateTool({
      domain: 'research',
      llmProvider,
      tools,
      systemPrompt: `You are the research subagent for Foundry AI. Your output is fed directly to the CEO orchestrator.

Your job is to identify 3-6 REAL, named competitor companies or products for the given venture concept.

Workflow:
1. Call research_web_search exactly once with a short, focused query (4-6 words max). For example: "AI video ad generation companies", "DeFi yield optimizer protocols", "code security scanner tools". Do NOT copy the full concept as a query.
2. Read the title and snippet fields of EVERY result returned by the tool.
3. Extract any real company or product names that appear in those results.
4. If the search results are generic (Wikipedia encyclopedia articles, news aggregators, unrelated pages) AND contain no company names — then use your own training knowledge to name 3-5 real, well-known companies or products that directly compete in this space. Label the source as "llm-knowledge".
5. Optionally call research_analyze_trends with the concept to capture market signals.

What counts as a REAL competitor:
- A named company: "Synthesia", "Runway ML", "HeyGen", "Pika Labs", "Yearn Finance", "Beefy Finance", "Snyk", "Veracode", etc.
- A named product: "Adobe Firefly", "Sora by OpenAI", "Luma AI", etc.
- It must operate in the same market as the venture concept.

Hard rules:
- NEVER output generic placeholders: not "Competitor A", "IncumbentCorp", "FastScale", "NicheTech", "Industry leaders", "Top players", or similar.
- NEVER copy example strings from this prompt (the examples above are illustrative only).
- If you are using your training knowledge because search failed, still only name real companies you are confident exist.

Return a single JSON block (enclosed in \`\`\`json and \`\`\`) with this exact shape:
{
  "competitors": ["Real Company Name 1", "Real Company Name 2", "Real Company Name 3"],
  "marketSignals": ["Short market signal"],
  "sources": ["https://url-from-search-result-1.com or \"llm-knowledge\""]
}`
    });
  }

  private buildProductSubagent(llmProvider: GroqProvider, contextLLM: GroqProvider): DelegateTool {
    const tools: BaseTool[] = [
      new DefineRequirementsTool(),
      new WriteUserStoriesTool(),
      new DefinePersonaTool(),
      new PrioritizeBacklogTool(),
      new MapUserJourneyTool(),
      new CompareFeaturesTool()
    ];
    for (const t of tools) t.setLLMProvider(contextLLM);
    return new DelegateTool({
      domain: 'product',
      llmProvider,
      tools,
      systemPrompt: `You are the product subagent for Foundry AI.

You MUST call product_define_requirements with the venture concept on your first turn. Then call product_define_persona with the same concept. Call each tool exactly once — do not duplicate.

The product_define_requirements tool returns concept-specific requirements when an LLM is available, or a generic template as fallback. You MUST ensure every requirement is specific to the venture concept.

The five requirement strings you return must each describe a real capability that the venture must have. The same goes for the personas: they must be specific to the target segment.

Return a single JSON block (enclosed in \`\`\`json and \`\`\`) with this exact shape:
{
  "productRequirements": [
    "Functional requirement 1 specific to the concept",
    "Functional requirement 2 specific to the concept",
    "Non-functional requirement 1 specific to the concept",
    "Non-functional requirement 2 specific to the concept",
    "Non-functional requirement 3 specific to the concept"
  ],
  "personas": ["Specific persona 1", "Specific persona 2"]
}

Do not return any requirement that could apply to any SaaS product. Do not copy any phrase from this prompt.`
    });
  }

  private buildEngineeringSubagent(llmProvider: GroqProvider, contextLLM: GroqProvider): DelegateTool {
    const tools: BaseTool[] = [
      new ArchitectSystemTool(),
      new SelectTechStackTool(),
      new GenerateSchemaTool(),
      new GenerateRoutesTool(),
      new EstimateLoCTool(),
      new AuditSecurityTool()
    ];
    for (const t of tools) t.setLLMProvider(contextLLM);
    return new DelegateTool({
      domain: 'engineering',
      llmProvider,
      tools,
      systemPrompt: `You are the engineering subagent for Foundry AI.

You MUST call engineering_architect_system with the venture concept on your first turn. Then call engineering_select_tech_stack with the concept. Call each tool exactly once — do not duplicate.

The engineering_architect_system tool returns concept-specific module names when an LLM is available. You MUST ensure every module name is specific to the venture concept. Zero generic module names.

Return a single JSON block (enclosed in \`\`\`json and \`\`\`) with this exact shape:
{
  "architectureModules": [
    "Module 1 named for the concept",
    "Module 2 named for the concept",
    "Module 3 named for the concept",
    "Specific database or cache chosen for the concept",
    "Specific third-party integration or gateway"
  ],
  "techStack": {
    "languages": ["Lang 1", "Lang 2"],
    "framework": "Specific framework choice",
    "infra": "Specific hosting infrastructure"
  }
}

Zero phrases copied from this prompt. Every name must reference the venture concept.`
    });
  }

  private buildFinanceSubagent(llmProvider: GroqProvider, contextLLM: GroqProvider): DelegateTool {
    const tools: BaseTool[] = [
      new EstimateCostsTool(),
      new PriceStrategyTool(),
      new BreakEvenAnalysisTool(),
      new LtvCacEstimatorTool(),
      new SubscriptionCalculatorTool(),
      new EstimateValuationTool()
    ];
    for (const t of tools) t.setLLMProvider(contextLLM);
    return new DelegateTool({
      domain: 'finance',
      llmProvider,
      tools,
      systemPrompt: `You are the finance subagent for Foundry AI.

You MUST call finance_estimate_costs with sensible inputs for the venture. Pick devTeamSize and serverInfraLevel appropriate for the venture's stage. Choose inputs that produce a realistic monthly OPEX in the $20k-$80k range for an early-stage venture.

Then call finance_price_strategy with the competitor average price. For SMB-targeted SaaS, $30-$80 is a reasonable average; for enterprise, $200-$500.

Return a single JSON block (enclosed in \`\`\`json and \`\`\`) with this exact shape:
{
  "monthlyOpexEstimate": <number from finance_estimate_costs>,
  "pricingStrategy": [
    { "planName": "Starter", "price": <number> },
    { "planName": "Pro", "price": <number> },
    { "planName": "Enterprise", "price": <number> }
  ]
}

All numbers must come from tool outputs. Do not invent values.`
    });
  }

  @Get('tools')
  getTools() {
    const registry = this.buildCatalogRegistry();
    const tools = registry.getAllTools().map(t => ({
      name: t.name,
      description: t.description,
      namespace: t.namespace
    }));
    const byNamespace: Record<string, number> = {};
    for (const t of tools) {
      byNamespace[t.namespace] = (byNamespace[t.namespace] || 0) + 1;
    }
    return {
      count: tools.length,
      byNamespace,
      tools
    };
  }

  @Get('agents')
  getAgentTopology() {
    return {
      ceo: {
        name: 'CEO-Parent',
        role: 'Orchestrator. Plans the venture blueprint and delegates to four specialist subagents.',
        delegateTools: [
          'delegate_to_research',
          'delegate_to_product',
          'delegate_to_engineering',
          'delegate_to_finance'
        ]
      },
      subagents: [
        {
          name: 'research-subagent',
          domain: 'research',
          tools: [
            'research_web_search', 'research_scrape_url', 'research_analyze_trends',
            'research_competitor_analysis', 'research_search_trends', 'research_get_news',
            'research_analyze_sentiment'
          ]
        },
        {
          name: 'product-subagent',
          domain: 'product',
          tools: [
            'product_define_requirements', 'product_write_user_stories', 'product_define_persona',
            'product_prioritize_backlog', 'product_map_user_journey', 'product_compare_features'
          ]
        },
        {
          name: 'engineering-subagent',
          domain: 'engineering',
          tools: [
            'engineering_architect_system', 'engineering_select_tech_stack', 'engineering_generate_schema',
            'engineering_generate_routes', 'engineering_estimate_loc', 'engineering_audit_security'
          ]
        },
        {
          name: 'finance-subagent',
          domain: 'finance',
          tools: [
            'finance_estimate_costs', 'finance_price_strategy', 'finance_break_even_analysis',
            'finance_ltv_cac_estimator', 'finance_subscription_calculator', 'finance_estimate_valuation'
          ]
        }
      ]
    };
  }

  @Post('run')
  async runAgent(@Body('concept') concept: string): Promise<OrchestratorResult> {
    const logs: TraceEvent[] = [];
    const traceLog = async (level: string, message: string, meta?: any) => {
      logs.push({ timestamp: new Date().toISOString(), level, message, meta });
    };

    loadEnv();

    const runId = randomUUID();
    const context: AgentContext = { runId, log: traceLog };

    try {
      await traceLog('info', `Orchestrator run started for concept: "${concept}"`, { agent: 'CEO-Parent', runId });

      const keys = (process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || '').split(',').map(k => k.trim()).filter(k => k);
      const ceoProvider = new GroqProvider({ apiKeys: keys, model: 'llama-3.3-70b-versatile' });
      const subagentProvider = new GroqProvider({ apiKeys: keys, model: 'llama-3.1-8b-instant' });
      const toolProvider = new GroqProvider({ apiKeys: keys, model: 'llama-3.1-8b-instant' });

      const ceoRegistry = new ToolRegistry();
      ceoRegistry.registerTool(this.buildResearchSubagent(subagentProvider, toolProvider));
      ceoRegistry.registerTool(this.buildProductSubagent(subagentProvider, toolProvider));
      ceoRegistry.registerTool(this.buildEngineeringSubagent(subagentProvider, toolProvider));
      ceoRegistry.registerTool(this.buildFinanceSubagent(subagentProvider, toolProvider));

      const ceo = new Agent({
        name: 'CEO-Parent',
        systemPrompt: `You are the lead CEO orchestrator agent for Foundry AI. You build a venture blueprint by delegating work to four specialist subagents in parallel.

Your ONLY tools are the four delegate_to_* subagent tools. You MUST call all four subagents in parallel in a single response, then synthesize their JSON outputs into a final blueprint.

Process:
1. On your FIRST turn, call all four delegate_to_* tools in a single response. Pass each a self-contained task that includes the venture concept and any context it needs. Do not invent data yourself.
2. After the four subagent responses return, synthesize them into a single JSON blueprint with this exact shape:
   {
     "concept": "<venture concept>",
     "namespacesCovered": ["system", "research", "product", "engineering", "finance"],
     "productRequirements": [<from product subagent>],
     "architectureModules": [<from engineering subagent>],
     "financialModel": { "monthlyOpexEstimate": <number>, "pricingStrategy": [...] },
     "competitors": [<from research subagent>],
     "namespacesJustification": {
       "system": "<one-line note>",
       "research": "<one-line note>",
       "product": "<one-line note>",
       "engineering": "<one-line note>",
       "finance": "<one-line note>"
     }
   }
3. Output ONLY the final JSON block enclosed in \`\`\`json and \`\`\`. No prose before or after.

Do not skip subagents. Do not fabricate competitor names or financial numbers — if the research subagent returned an empty competitors array, use an empty array in the blueprint. Never invent competitor names yourself.`,
        toolRegistry: ceoRegistry,
        llmProvider: ceoProvider
      });

      const response = await ceo.run(
        `Build a complete venture blueprint for: ${concept}. Call all four subagents in parallel on your first turn, then synthesize their JSON outputs into the final blueprint.`,
        context
      );

      const blueprint = response.content || '';
      await traceLog('info', `CEO-Parent finished`, { agent: 'CEO-Parent', iterations: response.iterations, runId });

      const subagentRuns = logs
        .filter(l => l.meta?.subrunId && typeof l.meta.subrunId === 'string' && l.meta.subrunId.startsWith(runId + '/'))
        .reduce<Record<string, number>>((acc, l) => {
          const id = l.meta.subrunId as string;
          if (l.meta.iterations) acc[id] = l.meta.iterations;
          return acc;
        }, {});

      const subagentSummary = Object.values(subagentRuns).length
        ? Object.entries(subagentRuns).map(([id, iters]) => ({
            name: id.split('/')[1]?.split('-').slice(0, -1).join('-') + '-subagent' || 'unknown',
            iterations: iters
          }))
        : [];

      let parsedBlueprint: any = {
        concept,
        namespacesCovered: ['system', 'research', 'product', 'engineering', 'finance'],
        productRequirements: [],
        architectureModules: [],
        financialModel: { monthlyOpexEstimate: 0, pricingStrategy: [] },
        competitors: []
      };
      try {
        const md = blueprint.match(/```(?:json|JSON)?\s*([\s\S]*?)\s*```/);
        const jsonText = md ? md[1] : (() => {
          const a = blueprint.indexOf('{'); const b = blueprint.lastIndexOf('}');
          return a !== -1 && b !== -1 && b > a ? blueprint.substring(a, b + 1) : blueprint;
        })();
        parsedBlueprint = JSON.parse(jsonText.trim());
        await traceLog('info', `Parsed final blueprint JSON`, { agent: 'CEO-Parent' });
      } catch (parseError: any) {
        await traceLog('warn', `Failed to parse final JSON: ${parseError.message}. Using fallback blueprint.`, { agent: 'CEO-Parent' });
      }

      const goldStandard = {
        financialModel: { monthlyOpexEstimate: 15000, pricingStrategy: [{ planName: 'Starter', price: 30 }] }
      };
      const evaluation = EvaluationHarness.evaluate(parsedBlueprint, goldStandard);

      return {
        success: true,
        runId,
        blueprint,
        evaluation,
        logs,
        trace: {
          ceoIterations: response.iterations,
          subagents: subagentSummary
        }
      };
    } catch (error: any) {
      await traceLog('error', `Orchestrator failed: ${error.message}`, { agent: 'CEO-Parent', error: error.message });
      return {
        success: false,
        runId,
        blueprint: '',
        logs,
        trace: { ceoIterations: 0, subagents: [] },
        error: error.message
      };
    }
  }
}
