export interface VentureBlueprint {
  concept: string;
  namespacesCovered: string[];
  productRequirements: string[];
  architectureModules: string[];
  financialModel: {
    monthlyOpexEstimate: number;
    pricingStrategy: { planName: string; price: number }[];
  };
  competitors: string[];
}

export interface EvaluationResult {
  score: number; // out of 100
  criteria: {
    completeness: boolean; // all 5 namespaces covered
    hasPricing: boolean;
    hasOpex: boolean;
    hasModules: boolean;
    hasCompetitors: boolean;
  };
  feedback: string[];
}

export class EvaluationHarness {
  /**
   * Evaluates a generated VentureBlueprint against the Gold Standard benchmarks.
   */
  static evaluate(blueprint: VentureBlueprint, goldStandard: Partial<VentureBlueprint>): EvaluationResult {
    const feedback: string[] = [];
    let score = 0;

    // 1. Completeness Check (40 pts)
    const requiredNamespaces = ['system', 'research', 'product', 'engineering', 'finance'];
    const coveredCount = blueprint.namespacesCovered.filter(ns => requiredNamespaces.includes(ns)).length;
    const completenessScore = (coveredCount / requiredNamespaces.length) * 40;
    score += completenessScore;

    if (coveredCount < requiredNamespaces.length) {
      feedback.push(`Missing coverage. Covered ${coveredCount}/${requiredNamespaces.length} domain namespaces.`);
    } else {
      feedback.push('All 5 domain namespaces successfully represented in blueprint.');
    }

    const PLACEHOLDER_PATTERNS = [
      /^competitor\s*[a-z0-9]+$/i,
      /^incumbent\s*corp/i,
      /fastscale/i,
      /nichetech/i,
      /^company\s*[a-z0-9]+$/i,
      /^unknown/i,
      /^n\/?a$/i,
      /^tbd$/i,
      /placeholder/i,
      /example\s*(inc|corp|ltd|llc)/i
    ];

    const isPlaceholder = (s: string) => PLACEHOLDER_PATTERNS.some(rx => rx.test(s.trim()));

    const competitors = blueprint.competitors || [];
    const realCompetitors = competitors.filter(c => c && c.trim().length >= 2 && !isPlaceholder(c));
    const hasCompetitors = realCompetitors.length > 0;
    const hasModules = blueprint.architectureModules && blueprint.architectureModules.length > 0;

    if (realCompetitors.length > 0) {
      score += 10;
      if (realCompetitors.length < competitors.length) {
        feedback.push(`${competitors.length - realCompetitors.length} of ${competitors.length} competitor names look like placeholders or fabrications.`);
      }
    } else if (competitors.length > 0) {
      feedback.push(`All ${competitors.length} competitor entries look like placeholders. Run the research subagent's web_search again.`);
    } else {
      feedback.push('No competitors listed in research findings.');
    }

    if (hasModules) {
      score += 10;
    } else {
      feedback.push('No technical architectural modules specified.');
    }

    // 3. Financial Model Check (40 pts)
    const hasPricing = blueprint.financialModel?.pricingStrategy && blueprint.financialModel.pricingStrategy.length > 0;
    const hasOpex = blueprint.financialModel?.monthlyOpexEstimate !== undefined && blueprint.financialModel.monthlyOpexEstimate > 0;

    if (hasPricing) {
      score += 20;
      // Check if price tiers are realistic compared to benchmark gold standard
      if (goldStandard.financialModel?.pricingStrategy) {
        const starterBenchmark = goldStandard.financialModel.pricingStrategy.find(p => p.planName.toLowerCase() === 'starter')?.price;
        const starterActual = blueprint.financialModel.pricingStrategy.find(p => p.planName.toLowerCase() === 'starter')?.price;
        if (starterBenchmark && starterActual && Math.abs(starterActual - starterBenchmark) > starterBenchmark * 0.5) {
          feedback.push(`Starter plan pricing ($${starterActual}) deviates significantly from standard benchmark ($${starterBenchmark}).`);
        }
      }
    } else {
      feedback.push('No financial model pricing strategy tiers defined.');
    }

    if (hasOpex) {
      score += 20;
      // Check if OPEX is within threshold
      if (goldStandard.financialModel?.monthlyOpexEstimate) {
        const opexBenchmark = goldStandard.financialModel.monthlyOpexEstimate;
        const opexActual = blueprint.financialModel.monthlyOpexEstimate;
        if (opexActual > opexBenchmark * 1.5) {
          feedback.push(`Monthly OPEX estimate ($${opexActual}) is abnormally high compared to gold standard baseline ($${opexBenchmark}).`);
        }
      }
    } else {
      feedback.push('No monthly OPEX cost estimates provided.');
    }

    return {
      score: Math.round(score),
      criteria: {
        completeness: coveredCount === requiredNamespaces.length,
        hasPricing,
        hasOpex,
        hasModules,
        hasCompetitors
      },
      feedback
    };
  }
}
