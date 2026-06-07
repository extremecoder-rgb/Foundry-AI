import { BaseTool, AgentContext, generateStructuredJson } from '@foundry/agent-core';
import { z } from 'zod';

export class AnalyzeTrendsTool extends BaseTool<
  { marketName: string; rawSearchData?: string },
  { marketSize: string; cagr: string; drivers: string[]; headwinds: string[]; segments: string[]; dataSource: 'llm' | 'heuristic' }
> {
  name = 'research_analyze_trends';
  description = 'Analyze market size, CAGR, growth drivers, headwinds, and segments for an industry sector. Uses an LLM when available and falls back to a heuristic.';
  namespace = 'research';
  schema = z.object({
    marketName: z.string().describe('The name of the market or industry to analyze.'),
    rawSearchData: z.string().optional().describe('Optional raw search snippets to ground the analysis on.')
  });

  async execute(
    input: { marketName: string; rawSearchData?: string },
    context: AgentContext
  ): Promise<{ marketSize: string; cagr: string; drivers: string[]; headwinds: string[]; segments: string[]; dataSource: 'llm' | 'heuristic' }> {
    console.log(`[AnalyzeTrendsTool] Analyzing trends for: "${input.marketName}"`);

    const llm = this.resolveLLM(context);
    const heuristic = {
      marketSize: '$8.0 Billion',
      cagr: '14.5%',
      drivers: [
        `Adoption of AI-driven automation in ${input.marketName}`,
        'Cost pressure pushing enterprises toward SaaS solutions',
        'Regulatory and compliance modernization initiatives'
      ],
      headwinds: [
        'Data privacy and cybersecurity concerns',
        'Integration with legacy enterprise systems',
        'Talent shortage in specialized domains'
      ],
      segments: ['Enterprise', 'Mid-Market', 'SMB'],
      dataSource: 'heuristic' as const
    };

    if (!llm) return heuristic;

    const grounding = input.rawSearchData
      ? `\n\nGrounding evidence from web search:\n${input.rawSearchData.slice(0, 1500)}`
      : '';
    const userPrompt = `Analyze the "${input.marketName}" market and output ONLY a JSON object with this exact shape:
{
  "marketSize": "<a dollar figure, e.g. '$12.4 Billion'>",
  "cagr": "<a percent, e.g. '17.3%'>",
  "drivers": ["<3-5 short growth driver phrases grounded in the market>"],
  "headwinds": ["<3-5 short headwind phrases>"],
  "segments": ["<3-5 buyer segments or sub-markets>"]
}

Numbers should be plausible for the market's actual stage and geography. Use the grounding evidence if provided.${grounding}`;

    const parsed = await generateStructuredJson(llm, userPrompt, {
      systemPrompt: 'You are a market analyst. Output a single JSON object. No markdown fences, no commentary.',
      fallback: heuristic
    });

    return {
      marketSize: String(parsed.marketSize || heuristic.marketSize),
      cagr: String(parsed.cagr || heuristic.cagr),
      drivers: Array.isArray(parsed.drivers) && parsed.drivers.length > 0 ? parsed.drivers.slice(0, 5).map(String) : heuristic.drivers,
      headwinds: Array.isArray(parsed.headwinds) && parsed.headwinds.length > 0 ? parsed.headwinds.slice(0, 5).map(String) : heuristic.headwinds,
      segments: Array.isArray(parsed.segments) && parsed.segments.length > 0 ? parsed.segments.slice(0, 5).map(String) : heuristic.segments,
      dataSource: 'llm'
    };
  }
}
