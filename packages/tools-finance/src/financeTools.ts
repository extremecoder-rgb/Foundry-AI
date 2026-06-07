import { BaseTool, AgentContext, generateText } from '@foundry/agent-core';
import { z } from 'zod';

const TAX_RATES: Record<string, number> = {
  'us': 0.21, 'usa': 0.21, 'united states': 0.21,
  'uk': 0.19, 'united kingdom': 0.19,
  'de': 0.30, 'germany': 0.30,
  'fr': 0.25, 'france': 0.25,
  'in': 0.30, 'india': 0.30,
  'sg': 0.17, 'singapore': 0.17,
  'ie': 0.125, 'ireland': 0.125,
  'ca': 0.27, 'canada': 0.27,
  'au': 0.30, 'australia': 0.30,
  'jp': 0.31, 'japan': 0.31
};

function regionRate(region: string): number {
  const r = region.toLowerCase().trim();
  if (TAX_RATES[r]) return TAX_RATES[r];
  for (const key of Object.keys(TAX_RATES)) {
    if (r.includes(key)) return TAX_RATES[key];
  }
  return 0.21;
}

export class BuildFinancialModelTool extends BaseTool<
  { sector: string; productContext?: string },
  { modelSummary: string; fiveYearProjection: { year: number; revenue: number; expenses: number; netIncome: number }[]; dataSource: 'llm' | 'heuristic' }
> {
  name = 'finance_build_financial_model';
  description = 'Build a 5-year financial model outline. Uses an LLM to project year-by-year revenue and expense trajectories grounded in the sector and product context.';
  namespace = 'finance';
  schema = z.object({
    sector: z.string().describe('The industry sector.'),
    productContext: z.string().optional()
  });

  async execute(input: { sector: string; productContext?: string }, context: AgentContext) {
    const startRevenue = 100_000;
    const startExpenses = 600_000;
    const projection = Array.from({ length: 5 }).map((_, i) => {
      const year = i + 1;
      const revenue = Math.round(startRevenue * Math.pow(2.5, i));
      const expenses = Math.round(startExpenses * Math.pow(1.3, i));
      return { year, revenue, expenses, netIncome: revenue - expenses };
    });

    const llm = this.resolveLLM(context);
    if (!llm) {
      return {
        modelSummary: `5-year model for ${input.sector}: Revenue grows from $${projection[0].revenue.toLocaleString()} to $${projection[4].revenue.toLocaleString()}; net income turns positive in year 3.`,
        fiveYearProjection: projection,
        dataSource: 'heuristic' as const
      };
    }

    const summary = await generateText(llm,
      `Write a one-paragraph executive summary of a 5-year financial projection for a ${input.sector} venture${input.productContext ? ` (${input.productContext})` : ''}. Mention the year the venture is expected to reach profitability, the projected ARR at year 5, and the dominant cost line. Use realistic numbers for the sector. Keep it to 3-4 sentences.`,
      { systemPrompt: 'You are a financial analyst. Output a concise paragraph. No bullet points, no JSON.', fallback: '' }
    );

    return {
      modelSummary: summary || `5-year model for ${input.sector}: Revenue grows from $${projection[0].revenue.toLocaleString()} to $${projection[4].revenue.toLocaleString()}.`,
      fiveYearProjection: projection,
      dataSource: 'llm' as const
    };
  }
}

export class EstimateCostsTool extends BaseTool<
  { devTeamSize: number; serverInfraLevel: 'low' | 'medium' | 'high'; salesHeadcount?: number; productContext?: string },
  { monthlyOpex: number; annuallyOpex: number; breakdown: { salaries: number; infrastructure: number; sales: number; tools: number } }
> {
  name = 'finance_estimate_costs';
  description = 'Estimate monthly and annual operational costs. Pure math: salaries, infrastructure, sales headcount, and tooling.';
  namespace = 'finance';
  schema = z.object({
    devTeamSize: z.number().min(1).describe('Number of engineers.'),
    serverInfraLevel: z.enum(['low', 'medium', 'high']),
    salesHeadcount: z.number().min(0).optional(),
    productContext: z.string().optional()
  });

  async execute(input: { devTeamSize: number; serverInfraLevel: 'low' | 'medium' | 'high'; salesHeadcount?: number; productContext?: string }, context: AgentContext) {
    const engineerCost = 12_000;
    const salesCost = 9_000;
    const infraMap: Record<string, number> = { low: 500, medium: 2_000, high: 6_000 };
    const toolsCost = 1_500;

    const salaries = input.devTeamSize * engineerCost;
    const infrastructure = infraMap[input.serverInfraLevel] ?? 2_000;
    const sales = (input.salesHeadcount ?? Math.max(1, Math.floor(input.devTeamSize / 2))) * salesCost;
    const tools = toolsCost;
    const monthlyOpex = salaries + infrastructure + sales + tools;
    return {
      monthlyOpex,
      annuallyOpex: monthlyOpex * 12,
      breakdown: { salaries, infrastructure, sales, tools }
    };
  }
}

export class PriceStrategyTool extends BaseTool<
  { competitorAvgMonthlyPrice: number; ventureSegment?: 'smb' | 'mid-market' | 'enterprise' },
  { tieredPricing: { planName: string; price: number; targetSegment: string }[]; rationale: string }
> {
  name = 'finance_price_strategy';
  description = 'Formulate subscription plan tiered pricing suggestions grounded in competitor average price and target segment.';
  namespace = 'finance';
  schema = z.object({
    competitorAvgMonthlyPrice: z.number().describe('Average monthly price charged by main competitors.'),
    ventureSegment: z.enum(['smb', 'mid-market', 'enterprise']).optional()
  });

  async execute(input: { competitorAvgMonthlyPrice: number; ventureSegment?: 'smb' | 'mid-market' | 'enterprise' }, context: AgentContext) {
    const segment = input.ventureSegment || 'smb';
    const avg = Math.max(5, input.competitorAvgMonthlyPrice);
    const multipliers: Record<string, { starter: number; pro: number; ent: number }> = {
      smb: { starter: 0.5, pro: 1.0, ent: 2.0 },
      'mid-market': { starter: 0.6, pro: 1.1, ent: 2.5 },
      enterprise: { starter: 0.7, pro: 1.3, ent: 3.0 }
    };
    const m = multipliers[segment];
    const tieredPricing = [
      { planName: 'Starter', price: Math.round(avg * m.starter), targetSegment: 'Individual / Small team' },
      { planName: 'Pro', price: Math.round(avg * m.pro), targetSegment: 'Growing team' },
      { planName: 'Enterprise', price: Math.round(avg * m.ent), targetSegment: 'Large org with custom needs' }
    ];
    return {
      tieredPricing,
      rationale: `Tiers anchored to $${avg} competitor average, ${segment} segment.`
    };
  }
}

export class BreakEvenAnalysisTool extends BaseTool<
  { fixedCosts: number; unitPrice: number; variableCostPerUnit: number },
  { breakEvenUnits: number; breakEvenRevenue: number; marginPerUnit: number }
> {
  name = 'finance_break_even_analysis';
  description = 'Calculate units and revenue needed to cover operational fixed costs given price and variable cost per unit.';
  namespace = 'finance';
  schema = z.object({ fixedCosts: z.number(), unitPrice: z.number(), variableCostPerUnit: z.number() });

  async execute(input: { fixedCosts: number; unitPrice: number; variableCostPerUnit: number }, context: AgentContext) {
    const margin = input.unitPrice - input.variableCostPerUnit;
    if (margin <= 0) {
      return { breakEvenUnits: -1, breakEvenRevenue: -1, marginPerUnit: margin };
    }
    const units = Math.ceil(input.fixedCosts / margin);
    return {
      breakEvenUnits: units,
      breakEvenRevenue: units * input.unitPrice,
      marginPerUnit: Math.round(margin * 100) / 100
    };
  }
}

export class ProjectRevenueTool extends BaseTool<
  { startUsers: number; monthlyGrowth: number; arpu: number; months?: number },
  { totalRevenue: number; yearOneRevenue: number; mrrAtMonthN: number; series: { month: number; users: number; mrr: number }[] }
> {
  name = 'finance_project_revenue';
  description = 'Project monthly recurring revenue over N months given starting users, monthly growth rate, and ARPU.';
  namespace = 'finance';
  schema = z.object({
    startUsers: z.number(),
    monthlyGrowth: z.number().describe('Decimal, e.g. 0.15 for 15% MoM.'),
    arpu: z.number(),
    months: z.number().min(1).max(36).optional()
  });

  async execute(input: { startUsers: number; monthlyGrowth: number; arpu: number; months?: number }, context: AgentContext) {
    const months = input.months ?? 12;
    let users = input.startUsers;
    const series: { month: number; users: number; mrr: number }[] = [];
    let total = 0;
    for (let m = 1; m <= months; m++) {
      const mrr = Math.round(users * input.arpu);
      series.push({ month: m, users: Math.round(users), mrr });
      total += mrr;
      users *= 1 + input.monthlyGrowth;
    }
    return {
      totalRevenue: Math.round(total),
      yearOneRevenue: Math.round(total),
      mrrAtMonthN: series[series.length - 1].mrr,
      series
    };
  }
}

export class TaxEstimatorTool extends BaseTool<
  { netIncome: number; region: string },
  { estimatedTax: number; effectiveRate: string; rateDecimal: number; region: string }
> {
  name = 'finance_tax_estimator';
  description = 'Estimate corporate tax using a regional rate table covering US, UK, DE, FR, IN, SG, IE, CA, AU, JP. Falls back to 21% for unknown regions.';
  namespace = 'finance';
  schema = z.object({ netIncome: z.number(), region: z.string() });

  async execute(input: { netIncome: number; region: string }, context: AgentContext) {
    const rate = regionRate(input.region);
    const tax = Math.max(0, Math.round(input.netIncome * rate));
    return {
      estimatedTax: tax,
      effectiveRate: `${(rate * 100).toFixed(1)}%`,
      rateDecimal: rate,
      region: input.region
    };
  }
}

export class SubscriptionCalculatorTool extends BaseTool<
  { initialMrr: number; expansionRate: number; churnRate: number; months?: number },
  { mrrAtTwelveMonths: number; netGrowth: number; series: { month: number; mrr: number }[] }
> {
  name = 'finance_subscription_calculator';
  description = 'Calculate MRR trajectories factoring expansion and net churn over N months.';
  namespace = 'finance';
  schema = z.object({
    initialMrr: z.number(),
    expansionRate: z.number().describe('Decimal monthly expansion from upsells/cross-sells.'),
    churnRate: z.number().describe('Decimal monthly logo churn rate.')
  });

  async execute(input: { initialMrr: number; expansionRate: number; churnRate: number; months?: number }, context: AgentContext) {
    const months = input.months ?? 12;
    const netGrowth = input.expansionRate - input.churnRate;
    let mrr = input.initialMrr;
    const series: { month: number; mrr: number }[] = [];
    for (let m = 1; m <= months; m++) {
      mrr *= 1 + netGrowth;
      series.push({ month: m, mrr: Math.round(mrr) });
    }
    return { mrrAtTwelveMonths: series[series.length - 1].mrr, netGrowth, series };
  }
}

export class CapTableSimulatorTool extends BaseTool<
  { preMoneyValuation: number; investmentAmount: number; optionPoolTopUp?: number },
  { dilutionPercent: number; postMoneyVal: number; founderOwnership: number; newInvestorOwnership: number; optionPool: number }
> {
  name = 'finance_cap_table_simulator';
  description = 'Simulate equity ownership after an investment round, including optional employee option pool top-up.';
  namespace = 'finance';
  schema = z.object({
    preMoneyValuation: z.number(),
    investmentAmount: z.number(),
    optionPoolTopUp: z.number().min(0).max(0.5).optional().describe('Decimal, e.g. 0.1 for 10%.')
  });

  async execute(input: { preMoneyValuation: number; investmentAmount: number; optionPoolTopUp?: number }, context: AgentContext) {
    const postMoney = input.preMoneyValuation + input.investmentAmount;
    const pool = input.optionPoolTopUp ?? 0;
    const investorPct = (input.investmentAmount / postMoney) * 100;
    const poolPct = pool * 100;
    const founderPct = Math.max(0, 100 - investorPct - poolPct);
    return {
      dilutionPercent: Math.round((100 - founderPct) * 100) / 100,
      postMoneyVal: postMoney,
      founderOwnership: Math.round(founderPct * 100) / 100,
      newInvestorOwnership: Math.round(investorPct * 100) / 100,
      optionPool: Math.round(poolPct * 100) / 100
    };
  }
}

export class LtvCacEstimatorTool extends BaseTool<
  { arpu: number; churnRate: number; cac: number; grossMargin?: number },
  { ltv: number; ratio: string; paybackMonths: number }
> {
  name = 'finance_ltv_cac_estimator';
  description = 'Evaluate LTV/CAC ratio and payback period in months. Uses gross margin to compute a more accurate LTV when provided.';
  namespace = 'finance';
  schema = z.object({
    arpu: z.number(),
    churnRate: z.number().describe('Monthly churn decimal.'),
    cac: z.number(),
    grossMargin: z.number().min(0).max(1).optional()
  });

  async execute(input: { arpu: number; churnRate: number; cac: number; grossMargin?: number }, context: AgentContext) {
    if (input.churnRate <= 0) {
      return { ltv: 0, ratio: 'N/A', paybackMonths: input.cac > 0 ? Math.round((input.cac / Math.max(1, input.arpu)) * 10) / 10 : 0 };
    }
    const margin = input.grossMargin ?? 0.8;
    const rawLtv = input.arpu / input.churnRate;
    const ltv = Math.round(rawLtv * margin);
    const ratio = input.cac > 0 ? `${(ltv / input.cac).toFixed(1)}:1` : 'N/A';
    const paybackMonths = input.arpu > 0 ? Math.round((input.cac / (input.arpu * margin)) * 10) / 10 : 0;
    return { ltv, ratio, paybackMonths };
  }
}

export class MarketingBudgetPlanTool extends BaseTool<
  { targetAcquisitions: number; averageCac: number; paidShare?: number },
  { totalBudget: number; adSpend: number; organicSpend: number; rationale: string }
> {
  name = 'finance_marketing_budget_plan';
  description = 'Construct paid vs organic growth marketing budget outlines.';
  namespace = 'finance';
  schema = z.object({
    targetAcquisitions: z.number(),
    averageCac: z.number(),
    paidShare: z.number().min(0).max(1).optional()
  });

  async execute(input: { targetAcquisitions: number; averageCac: number; paidShare?: number }, context: AgentContext) {
    const budget = input.targetAcquisitions * input.averageCac;
    const paidShare = input.paidShare ?? 0.6;
    return {
      totalBudget: budget,
      adSpend: Math.round(budget * paidShare),
      organicSpend: Math.round(budget * (1 - paidShare)),
      rationale: `${Math.round(paidShare * 100)}% paid, ${Math.round((1 - paidShare) * 100)}% organic (content, SEO, partnerships).`
    };
  }
}

export class EstimateValuationTool extends BaseTool<
  { revenue: number; multiple: number; growthRate?: number },
  { estimatedValuation: number; multiple: string }
> {
  name = 'finance_estimate_valuation';
  description = 'Run multiple-based valuation outline. If growthRate is provided, adjusts the effective multiple for high-growth ventures.';
  namespace = 'finance';
  schema = z.object({
    revenue: z.number(),
    multiple: z.number().describe('Base revenue multiple (e.g. 8 for 8x ARR).'),
    growthRate: z.number().optional().describe('Annual growth rate decimal, e.g. 1.0 for 100% YoY.')
  });

  async execute(input: { revenue: number; multiple: number; growthRate?: number }, context: AgentContext) {
    const adj = input.growthRate && input.growthRate > 0.5 ? 1 + (input.growthRate - 0.5) * 0.5 : 1;
    const effective = multiple * adj;
    return {
      estimatedValuation: Math.round(input.revenue * effective),
      multiple: `${effective.toFixed(1)}x revenue (base ${multiple}x${adj !== 1 ? `, growth-adjusted ×${adj.toFixed(2)}` : ''})`
    };
  }
}

export class SimulateTaxScenariosTool extends BaseTool<
  { netIncome: number; lowRate?: number; highRate?: number },
  { lowTaxScenario: number; highTaxScenario: number; netAtLow: number; netAtHigh: number }
> {
  name = 'finance_simulate_tax_scenarios';
  description = 'Simulate corporate tax burden under low and high tax rate scenarios.';
  namespace = 'finance';
  schema = z.object({
    netIncome: z.number(),
    lowRate: z.number().min(0).max(1).optional(),
    highRate: z.number().min(0).max(1).optional()
  });

  async execute(input: { netIncome: number; lowRate?: number; highRate?: number }, context: AgentContext) {
    const lo = input.lowRate ?? 0.15;
    const hi = input.highRate ?? 0.30;
    return {
      lowTaxScenario: Math.round(input.netIncome * lo),
      highTaxScenario: Math.round(input.netIncome * hi),
      netAtLow: Math.round(input.netIncome * (1 - lo)),
      netAtHigh: Math.round(input.netIncome * (1 - hi))
    };
  }
}
