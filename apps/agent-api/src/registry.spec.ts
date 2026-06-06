import { ToolRegistry } from '@foundry/agent-core';
import { ReadFileTool, WriteFileTool, ListDirTool, SearchDirTool, FileMetadataTool, MakeDirTool, DeleteFileTool, CheckDiskSpaceTool, GetEnvTool, RenameFileTool } from '@foundry/tools-system';
import { WebSearchTool, ScrapeUrlTool, AnalyzeTrendsTool, CompetitorAnalysisTool, SearchTrendsTool, GetNewsTool, FindProductHuntTool, CrawlSiteTool, ExtractEmailTool, CheckDomainNameTool } from '@foundry/tools-research';
import { DefineRequirementsTool, WriteUserStoriesTool, DesignWireframeSpecTool, MapUserJourneyTool, PrioritizeBacklogTool, DefinePersonaTool, DrawFlowchartTool, CompareFeaturesTool, EstimateVelocityTool, WriteReleaseNotesTool } from '@foundry/tools-product';
import { ArchitectSystemTool, SelectTechStackTool, ScaffoldRepositoryTool, GenerateSchemaTool, GenerateRoutesTool, MockDatabaseDataTool, RunLinterTool, CheckDependenciesTool, EstimateLoCTool, CodeComplexityTool } from '@foundry/tools-engineering';
import { BuildFinancialModelTool, EstimateCostsTool, PriceStrategyTool, BreakEvenAnalysisTool, ProjectRevenueTool, TaxEstimatorTool, SubscriptionCalculatorTool, CapTableSimulatorTool, LtvCacEstimatorTool, MarketingBudgetPlanTool } from '@foundry/tools-finance';

describe('Venture Studio Tool Registry Integration', () => {
  it('should successfully register and retrieve 50+ unique model-driven tools across 5 namespaces', () => {
    const registry = new ToolRegistry();

    // Namespace 1: System (10 tools)
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

    // Namespace 2: Research (10 tools)
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

    // Namespace 3: Product (10 tools)
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

    // Namespace 4: Engineering (10 tools)
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

    // Namespace 5: Finance (10 tools)
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

    // Assert total count >= 50
    const allTools = registry.getAllTools();
    expect(allTools.length).toBeGreaterThanOrEqual(50);
    console.log(`[Registry Integration] Verified registration of ${allTools.length} total unique tools.`);

    // Assert namespace groupings
    const systemTools = registry.getToolsByNamespace('system');
    const researchTools = registry.getToolsByNamespace('research');
    const productTools = registry.getToolsByNamespace('product');
    const engineeringTools = registry.getToolsByNamespace('engineering');
    const financeTools = registry.getToolsByNamespace('finance');

    expect(systemTools.length).toBe(10);
    expect(researchTools.length).toBe(10);
    expect(productTools.length).toBe(10);
    expect(engineeringTools.length).toBe(10);
    expect(financeTools.length).toBe(10);

    console.log('[Registry Integration] Namespace tool breakdown:');
    console.log(`- System: ${systemTools.length} tools`);
    console.log(`- Research: ${researchTools.length} tools`);
    console.log(`- Product: ${productTools.length} tools`);
    console.log(`- Engineering: ${engineeringTools.length} tools`);
    console.log(`- Finance: ${financeTools.length} tools`);
  });
});
