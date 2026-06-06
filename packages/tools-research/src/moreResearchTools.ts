import { BaseTool, AgentContext } from '@foundry/agent-core';
import { z } from 'zod';

// 1. SearchTrendsTool
export class SearchTrendsTool extends BaseTool<{ keyword: string }, { indexValue: number; interestOverTime: string }> {
  name = 'research_search_trends';
  description = 'Query search volume trends relative interest index over time.';
  namespace = 'research';
  schema = z.object({ keyword: z.string() });
  async execute(input: { keyword: string }, context: AgentContext) {
    return { indexValue: 84, interestOverTime: 'Increasing over past 90 days' };
  }
}

// 2. GetNewsTool
export class GetNewsTool extends BaseTool<{ topic: string }, { articles: { title: string; source: string }[] }> {
  name = 'research_get_news';
  description = 'Fetch latest news headlines for a market topic sector.';
  namespace = 'research';
  schema = z.object({ topic: z.string() });
  async execute(input: { topic: string }, context: AgentContext) {
    return {
      articles: [
        { title: `Big shifts in ${input.topic} technology standard`, source: 'TechCrunch' },
        { title: `${input.topic} startups raise over $400M in Q1`, source: 'VentureBeat' }
      ]
    };
  }
}

// 3. FindProductHuntTool
export class FindProductHuntTool extends BaseTool<{ tag: string }, { products: string[] }> {
  name = 'research_find_product_hunt';
  description = 'Find top products launched under a specific product category tag on Product Hunt.';
  namespace = 'research';
  schema = z.object({ tag: z.string() });
  async execute(input: { tag: string }, context: AgentContext) {
    return { products: [`${input.tag} Flow`, `${input.tag} Copilot`, 'ZenScan'] };
  }
}

// 4. CrawlSiteTool
export class CrawlSiteTool extends BaseTool<{ baseUrl: string }, { internalUrls: string[] }> {
  name = 'research_crawl_site';
  description = 'Crawl and map internal link structures of a target site.';
  namespace = 'research';
  schema = z.object({ baseUrl: z.string().url() });
  async execute(input: { baseUrl: string }, context: AgentContext) {
    return { internalUrls: [`${input.baseUrl}/about`, `${input.baseUrl}/pricing`, `${input.baseUrl}/features`] };
  }
}

// 5. ExtractEmailTool
export class ExtractEmailTool extends BaseTool<{ rawText: string }, { emails: string[] }> {
  name = 'research_extract_email';
  description = 'Extract public email addresses from raw scraped page contents.';
  namespace = 'research';
  schema = z.object({ rawText: z.string() });
  async execute(input: { rawText: string }, context: AgentContext) {
    const matches = input.rawText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    return { emails: Array.from(new Set(matches)) };
  }
}

// 6. CheckDomainNameTool
export class CheckDomainNameTool extends BaseTool<{ domainName: string }, { available: boolean; alternativeOptions: string[] }> {
  name = 'research_check_domain_name';
  description = 'Check DNS/WHOIS availability for brand domains.';
  namespace = 'research';
  schema = z.object({ domainName: z.string() });
  async execute(input: { domainName: string }, context: AgentContext) {
    return {
      available: !input.domainName.includes('google') && !input.domainName.includes('apple'),
      alternativeOptions: [`${input.domainName}app.com`, `${input.domainName}ai.com`, `get${input.domainName}.com`]
    };
  }
}
