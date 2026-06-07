import { BaseTool, AgentContext, generateStructuredJson } from '@foundry/agent-core';
import { z } from 'zod';

export interface CompetitorProfile {
  name: string;
  strengths: string[];
  weaknesses: string[];
  marketShare: string;
}

const FORBIDDEN_NAMES = [
  'incumbentcorp', 'fastscale', 'nichetech', 'competitor a', 'competitor b',
  'competitor 1', 'competitor 2', 'company a', 'company b', 'example inc',
  'example corp', 'acme', 'placeholder', 'unknown', 'n/a', 'tbd'
];

function cleanName(s: string): string | null {
  const t = (s || '').trim();
  if (t.length < 2 || t.length > 80) return null;
  const lower = t.toLowerCase();
  if (FORBIDDEN_NAMES.some(f => lower.includes(f))) return null;
  if (/^https?:/i.test(t)) return null;
  if (/^competitor\s*\d*$/i.test(t)) return null;
  return t;
}

export class CompetitorAnalysisTool extends BaseTool<
  { productCategory: string; rawSearchData?: string },
  { competitors: CompetitorProfile[]; dataSource: 'llm' | 'heuristic' }
> {
  name = 'research_competitor_analysis';
  description = 'Analyze key competitors in a product category by extracting names from raw search data when available. Uses an LLM for strength/weakness reasoning. Returns empty competitors array if the search data contains no real company names.';
  namespace = 'research';
  schema = z.object({
    productCategory: z.string().describe('The product category or sector to analyze.'),
    rawSearchData: z.string().optional().describe('Raw search results text containing competitor names to extract. Required for real output.')
  });

  async execute(
    input: { productCategory: string; rawSearchData?: string },
    context: AgentContext
  ): Promise<{ competitors: CompetitorProfile[]; dataSource: 'llm' | 'heuristic' }> {
    console.log(`[CompetitorAnalysisTool] Analyzing competitors for: "${input.productCategory}"`);

    if (!input.rawSearchData || input.rawSearchData.trim().length < 20) {
      return { competitors: [], dataSource: 'heuristic' };
    }

    const llm = this.resolveLLM(context);
    if (!llm) {
      return { competitors: [], dataSource: 'heuristic' };
    }

    const userPrompt = `From the following search result text, extract the actual company or product names that appear in titles or snippets. These will be treated as competitors in the "${input.productCategory}" category.

Search results:
${input.rawSearchData.slice(0, 2500)}

For each competitor you find, output a JSON object with name, 2-3 strengths, 2-3 weaknesses, and a market share estimate (e.g. "12%"). Reject any name that is generic, a placeholder word (like "Competitor A", "Insights", "Market leaders", "IncumbentCorp", "FastScale", "NicheTech"), or not clearly a real company or product.

Output ONLY a JSON object of the form:
{
  "competitors": [
    { "name": "Real Company Name", "strengths": ["..."], "weaknesses": ["..."], "marketShare": "<percent>" }
  ]
}

If no real company names are present, return {"competitors": []}. Do not invent names.`;

    const parsed = await generateStructuredJson(llm, userPrompt, {
      systemPrompt: 'You are a competitive intelligence analyst. Output only a JSON object. No markdown, no commentary. Reject placeholder names.',
      fallback: { competitors: [] }
    });

    const rawList = Array.isArray(parsed.competitors) ? parsed.competitors : [];
    const cleaned: CompetitorProfile[] = [];
    const seen = new Set<string>();
    for (const c of rawList) {
      const name = cleanName(c?.name || '');
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      cleaned.push({
        name,
        strengths: Array.isArray(c.strengths) ? c.strengths.slice(0, 3).map(String) : [],
        weaknesses: Array.isArray(c.weaknesses) ? c.weaknesses.slice(0, 3).map(String) : [],
        marketShare: String(c.marketShare || 'N/A')
      });
      if (cleaned.length >= 6) break;
    }

    return { competitors: cleaned, dataSource: 'llm' };
  }
}
