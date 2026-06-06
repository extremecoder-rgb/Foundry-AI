import { ToolRegistry, withRetry, RateLimiter, AgentTracer, EvaluationHarness } from '@foundry/agent-core';
import { ReadFileTool, WriteFileTool, ListDirTool, SearchDirTool, FileMetadataTool, MakeDirTool, DeleteFileTool, CheckDiskSpaceTool, GetEnvTool, RenameFileTool, ZipFolderTool, UnzipFolderTool } from '@foundry/tools-system';
import { WebSearchTool, ScrapeUrlTool, AnalyzeTrendsTool, CompetitorAnalysisTool, SearchTrendsTool, GetNewsTool, FindProductHuntTool, CrawlSiteTool, ExtractEmailTool, CheckDomainNameTool, AnalyzeSentimentTool, SummarizeArticleTool } from '@foundry/tools-research';
import { DefineRequirementsTool, WriteUserStoriesTool, DesignWireframeSpecTool, MapUserJourneyTool, PrioritizeBacklogTool, DefinePersonaTool, DrawFlowchartTool, CompareFeaturesTool, EstimateVelocityTool, WriteReleaseNotesTool, CalculateNpsTool, MapCustomerJourneyTool } from '@foundry/tools-product';
import { ArchitectSystemTool, SelectTechStackTool, ScaffoldRepositoryTool, GenerateSchemaTool, GenerateRoutesTool, MockDatabaseDataTool, RunLinterTool, CheckDependenciesTool, EstimateLoCTool, CodeComplexityTool, CalculateTestCoverageTool, AuditSecurityTool } from '@foundry/tools-engineering';
import { BuildFinancialModelTool, EstimateCostsTool, PriceStrategyTool, BreakEvenAnalysisTool, ProjectRevenueTool, TaxEstimatorTool, SubscriptionCalculatorTool, CapTableSimulatorTool, LtvCacEstimatorTool, MarketingBudgetPlanTool, EstimateValuationTool, SimulateTaxScenariosTool } from '@foundry/tools-finance';
import { trace } from '@opentelemetry/api';

describe('Venture Studio Tool Registry Integration', () => {
  it('should successfully register and retrieve 60+ unique model-driven tools across 5 namespaces', () => {
    const registry = new ToolRegistry();

    // Namespace 1: System (12 tools)
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

    // Namespace 2: Research (12 tools)
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

    // Namespace 3: Product (12 tools)
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

    // Namespace 4: Engineering (12 tools)
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

    // Namespace 5: Finance (12 tools)
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

    // Assert total count >= 60
    const allTools = registry.getAllTools();
    expect(allTools.length).toBeGreaterThanOrEqual(60);
    console.log(`[Registry Integration] Verified registration of ${allTools.length} total unique tools.`);

    // Assert namespace groupings
    const systemTools = registry.getToolsByNamespace('system');
    const researchTools = registry.getToolsByNamespace('research');
    const productTools = registry.getToolsByNamespace('product');
    const engineeringTools = registry.getToolsByNamespace('engineering');
    const financeTools = registry.getToolsByNamespace('finance');

    expect(systemTools.length).toBe(12);
    expect(researchTools.length).toBe(12);
    expect(productTools.length).toBe(12);
    expect(engineeringTools.length).toBe(12);
    expect(financeTools.length).toBe(12);

    console.log('[Registry Integration] Namespace tool breakdown:');
    console.log(`- System: ${systemTools.length} tools`);
    console.log(`- Research: ${researchTools.length} tools`);
    console.log(`- Product: ${productTools.length} tools`);
    console.log(`- Engineering: ${engineeringTools.length} tools`);
    console.log(`- Finance: ${financeTools.length} tools`);
  });

  describe('Resilience: Exponential Backoff Retries', () => {
    it('should retry a failing function and succeed on subsequent attempts', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Transient failure');
        }
        return 'success';
      };

      const result = await withRetry(fn, { retries: 4, minTimeoutMs: 10, factor: 1.5 });
      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });

    it('should throw an error after all retries are exhausted', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        throw new Error('Persistent failure');
      };

      await expect(withRetry(fn, { retries: 3, minTimeoutMs: 10, factor: 1.5 })).rejects.toThrow('Persistent failure');
      expect(attempts).toBe(3);
    });
  });

  describe('Resilience: Rate Limiting', () => {
    it('should rate limit requests using token bucket', async () => {
      const limiter = new RateLimiter(2, 1); // Max 2 tokens per 1 second
      
      const first = await limiter.acquire();
      const second = await limiter.acquire();
      const third = await limiter.acquire();

      expect(first).toBe(true);
      expect(second).toBe(true);
      expect(third).toBe(false); // Exhausted
    });
  });

  describe('Observability: OpenTelemetry Tracing', () => {
    it('should successfully trace actions using AgentTracer', async () => {
      const tracer = AgentTracer.getTracer();
      expect(tracer).toBeDefined();

      const result = await AgentTracer.traceCall('test-trace', { some: 'attribute' }, async (span) => {
        expect(span).toBeDefined();
        return 'traced-val';
      });

      expect(result).toBe('traced-val');
    });
  });

  describe('Evaluation Harness: Venture Blueprint Grading', () => {
    it('should grade a comprehensive blueprint with 100% score', () => {
      const blueprint = {
        concept: 'SaaS code reviews platform',
        namespacesCovered: ['system', 'research', 'product', 'engineering', 'finance'],
        productRequirements: ['Feature A', 'Feature B'],
        architectureModules: ['Auth Service', 'Gateway'],
        financialModel: {
          monthlyOpexEstimate: 12000,
          pricingStrategy: [{ planName: 'Starter', price: 29 }, { planName: 'Pro', price: 99 }]
        },
        competitors: ['Reviewable.io']
      };

      const goldStandard = {
        financialModel: {
          monthlyOpexEstimate: 15000,
          pricingStrategy: [{ planName: 'Starter', price: 30 }]
        }
      };

      const result = EvaluationHarness.evaluate(blueprint, goldStandard);
      expect(result.score).toBe(100);
      expect(result.criteria.completeness).toBe(true);
      expect(result.criteria.hasPricing).toBe(true);
      expect(result.criteria.hasOpex).toBe(true);
    });

    it('should penalize blueprints with missing sections', () => {
      const blueprint = {
        concept: 'Simple website',
        namespacesCovered: ['system', 'research', 'product'], // missing engineering, finance
        productRequirements: ['Feature A'],
        architectureModules: [],
        financialModel: {
          monthlyOpexEstimate: 0,
          pricingStrategy: []
        },
        competitors: []
      };

      const result = EvaluationHarness.evaluate(blueprint, {});
      expect(result.score).toBeLessThan(50);
      expect(result.criteria.completeness).toBe(false);
      expect(result.feedback.length).toBeGreaterThan(0);
    });
  });
});
