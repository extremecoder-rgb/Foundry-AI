import { Controller, Get, Post, Body } from '@nestjs/common';
import { AppService } from './app.service';
import { Agent, AgentContext, GeminiProvider, ToolRegistry, EvaluationHarness } from '@foundry/agent-core';
import { ReadFileTool, WriteFileTool, ListDirTool, SearchDirTool, FileMetadataTool, MakeDirTool, DeleteFileTool, CheckDiskSpaceTool, GetEnvTool, RenameFileTool, ZipFolderTool, UnzipFolderTool } from '@foundry/tools-system';
import { WebSearchTool, ScrapeUrlTool, AnalyzeTrendsTool, CompetitorAnalysisTool, SearchTrendsTool, GetNewsTool, FindProductHuntTool, CrawlSiteTool, ExtractEmailTool, CheckDomainNameTool, AnalyzeSentimentTool, SummarizeArticleTool } from '@foundry/tools-research';
import { DefineRequirementsTool, WriteUserStoriesTool, DesignWireframeSpecTool, MapUserJourneyTool, PrioritizeBacklogTool, DefinePersonaTool, DrawFlowchartTool, CompareFeaturesTool, EstimateVelocityTool, WriteReleaseNotesTool, CalculateNpsTool, MapCustomerJourneyTool } from '@foundry/tools-product';
import { ArchitectSystemTool, SelectTechStackTool, ScaffoldRepositoryTool, GenerateSchemaTool, GenerateRoutesTool, MockDatabaseDataTool, RunLinterTool, CheckDependenciesTool, EstimateLoCTool, CodeComplexityTool, CalculateTestCoverageTool, AuditSecurityTool } from '@foundry/tools-engineering';
import { BuildFinancialModelTool, EstimateCostsTool, PriceStrategyTool, BreakEvenAnalysisTool, ProjectRevenueTool, TaxEstimatorTool, SubscriptionCalculatorTool, CapTableSimulatorTool, LtvCacEstimatorTool, MarketingBudgetPlanTool, EstimateValuationTool, SimulateTaxScenariosTool } from '@foundry/tools-finance';
import { randomUUID } from 'crypto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('run')
  async runAgent(@Body('concept') concept: string) {
    const logs: { timestamp: string; level: string; message: string; meta?: any }[] = [];
    const logCallback = async (level: string, message: string, meta?: any) => {
      logs.push({
        timestamp: new Date().toISOString(),
        level,
        message,
        meta
      });
    };

    const registry = new ToolRegistry();
    // Register all tools across all namespaces (60 total)
    // System
    registry.registerTool(new ReadFileTool());
    registry.registerTool(new WriteFileTool());
    registry.registerTool(new ListDirTool());
    registry.registerTool(new SearchDirTool());
    registry.registerTool(new FileMetadataTool());
    registry.registerTool(new MakeDirTool());
    registry.registerTool(new DeleteFileTool());
    registry.registerTool(new CheckDiskSpaceTool());
    registry.registerTool(new GetEnvTool());
    registry.registerTool(new RenameFileTool());
    registry.registerTool(new ZipFolderTool());
    registry.registerTool(new UnzipFolderTool());

    // Research
    registry.registerTool(new WebSearchTool());
    registry.registerTool(new ScrapeUrlTool());
    registry.registerTool(new AnalyzeTrendsTool());
    registry.registerTool(new CompetitorAnalysisTool());
    registry.registerTool(new SearchTrendsTool());
    registry.registerTool(new GetNewsTool());
    registry.registerTool(new FindProductHuntTool());
    registry.registerTool(new CrawlSiteTool());
    registry.registerTool(new ExtractEmailTool());
    registry.registerTool(new CheckDomainNameTool());
    registry.registerTool(new AnalyzeSentimentTool());
    registry.registerTool(new SummarizeArticleTool());

    // Product
    registry.registerTool(new DefineRequirementsTool());
    registry.registerTool(new WriteUserStoriesTool());
    registry.registerTool(new DesignWireframeSpecTool());
    registry.registerTool(new MapUserJourneyTool());
    registry.registerTool(new PrioritizeBacklogTool());
    registry.registerTool(new DefinePersonaTool());
    registry.registerTool(new DrawFlowchartTool());
    registry.registerTool(new CompareFeaturesTool());
    registry.registerTool(new EstimateVelocityTool());
    registry.registerTool(new WriteReleaseNotesTool());
    registry.registerTool(new CalculateNpsTool());
    registry.registerTool(new MapCustomerJourneyTool());

    // Engineering
    registry.registerTool(new ArchitectSystemTool());
    registry.registerTool(new SelectTechStackTool());
    registry.registerTool(new ScaffoldRepositoryTool());
    registry.registerTool(new GenerateSchemaTool());
    registry.registerTool(new GenerateRoutesTool());
    registry.registerTool(new MockDatabaseDataTool());
    registry.registerTool(new RunLinterTool());
    registry.registerTool(new CheckDependenciesTool());
    registry.registerTool(new EstimateLoCTool());
    registry.registerTool(new CodeComplexityTool());
    registry.registerTool(new CalculateTestCoverageTool());
    registry.registerTool(new AuditSecurityTool());

    // Finance
    registry.registerTool(new BuildFinancialModelTool());
    registry.registerTool(new EstimateCostsTool());
    registry.registerTool(new PriceStrategyTool());
    registry.registerTool(new BreakEvenAnalysisTool());
    registry.registerTool(new ProjectRevenueTool());
    registry.registerTool(new TaxEstimatorTool());
    registry.registerTool(new SubscriptionCalculatorTool());
    registry.registerTool(new CapTableSimulatorTool());
    registry.registerTool(new LtvCacEstimatorTool());
    registry.registerTool(new MarketingBudgetPlanTool());
    registry.registerTool(new EstimateValuationTool());
    registry.registerTool(new SimulateTaxScenariosTool());

    const envPaths = [
      require('path').resolve(__dirname, '../../../.env'),
      require('path').resolve(__dirname, '../../../../.env'),
      require('path').resolve(process.cwd(), '../../.env'),
      require('path').resolve(process.cwd(), '.env')
    ];
    for (const p of envPaths) {
      if (require('fs').existsSync(p)) {
        require('dotenv').config({ path: p });
        break;
      }
    }

    const llmProvider = new GeminiProvider({ apiKey: process.env.GEMINI_API_KEY || 'mock-key' });
    const ceoAgent = new Agent({
      name: 'CEO-Parent',
      systemPrompt: `You are the lead CEO Agent of Foundry AI. Your job is to orchestrate a venture blueprint document.
      You must coordinate and delegate research, product, engineering, and finance tasks. Use your registered tools.
      CRITICAL INSTRUCTION: You MUST output ONLY a valid JSON block enclosed in \`\`\`json and \`\`\`. Do NOT include any conversational filler, introductory text, markdown headings, or explanations before or after the JSON block.
      JSON Schema format:
      {
        "concept": "venture name",
        "namespacesCovered": ["system", "research", "product", "engineering", "finance"],
        "productRequirements": ["requirement 1", "requirement 2"],
        "architectureModules": ["Auth Service", "Billing Gateway"],
        "financialModel": {
          "monthlyOpexEstimate": 12000,
          "pricingStrategy": [{"planName": "Starter", "price": 29}]
        },
        "competitors": ["Competitor A", "Competitor B"]
      }`,
      toolRegistry: registry,
      llmProvider
    });

    const context: AgentContext = {
      runId: randomUUID(),
      log: logCallback
    };

    try {
      await logCallback('info', `CEO-Parent run started with concept: "${concept}"`);
      const response = await ceoAgent.run(`Generate a full venture blueprint document for: ${concept}. Remember to end with the \`\`\`json block.`, context);

      const responseContent = response.content || '';
      
      // Attempt to parse the JSON block dynamically
      let parsedBlueprint: any = {
        concept: concept,
        namespacesCovered: ['system'],
        productRequirements: [],
        architectureModules: [],
        financialModel: { monthlyOpexEstimate: 0, pricingStrategy: [] },
        competitors: []
      };

      try {
        const markdownMatch = responseContent.match(/```(?:json|JSON)?\s*([\s\S]*?)\s*```/);
        let jsonText = '';
        if (markdownMatch) {
          jsonText = markdownMatch[1];
        } else {
          const firstBrace = responseContent.indexOf('{');
          const lastBrace = responseContent.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
             jsonText = responseContent.substring(firstBrace, lastBrace + 1);
          } else {
             jsonText = responseContent;
          }
        }
        parsedBlueprint = JSON.parse(jsonText.trim());
        await logCallback('info', `Successfully parsed dynamic JSON blueprint for evaluation.`);
      } catch (parseError: any) {
        await logCallback('warn', `Failed to parse agent JSON block: ${parseError.message}. Using default structural grading.`);
      }

      const goldStandard = {
        financialModel: {
          monthlyOpexEstimate: 15000,
          pricingStrategy: [{ planName: 'Starter', price: 30 }]
        }
      };

      const evalResult = EvaluationHarness.evaluate(parsedBlueprint, goldStandard);

      return {
        success: true,
        runId: context.runId,
        blueprint: responseContent,
        evaluation: evalResult,
        logs
      };
    } catch (error: any) {
      await logCallback('error', `Agent execution failed: ${error.message}`);
      return {
        success: false,
        runId: context.runId,
        error: error.message,
        logs
      };
    }
  }
}
