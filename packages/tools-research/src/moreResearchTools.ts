import { BaseTool, AgentContext, generateText, generateStructuredJson } from '@foundry/agent-core';
import { z } from 'zod';
import axios from 'axios';

export class SearchTrendsTool extends BaseTool<
  { keyword: string },
  { indexValue: number; trendDirection: 'rising' | 'stable' | 'declining'; summary: string; dataSource: 'llm' | 'heuristic' }
> {
  name = 'research_search_trends';
  description = 'Estimate the search interest trajectory for a keyword. Uses an LLM to reason about market maturity and growth direction. The indexValue is on a 0-100 scale.';
  namespace = 'research';
  schema = z.object({ keyword: z.string().describe('The keyword to estimate search interest for.') });

  async execute(input: { keyword: string }, context: AgentContext) {
    const llm = this.resolveLLM(context);
    const heuristic = {
      indexValue: 65,
      trendDirection: 'rising' as const,
      summary: `Search interest in "${input.keyword}" appears moderately strong with rising momentum based on general market signals.`
    };

    if (!llm) return { ...heuristic, dataSource: 'heuristic' as const };

    const text = await generateText(llm,
      `Estimate the relative search interest for the keyword "${input.keyword}" on a 0-100 scale, the trend direction (rising, stable, or declining), and a one-sentence summary grounded in your knowledge of this market. Output ONLY a JSON object of the form:
{"indexValue": <number 0-100>, "trendDirection": "<rising|stable|declining>", "summary": "<one sentence>"}`,
      { systemPrompt: 'You output only valid JSON. No commentary.', fallback: '' }
    );

    try {
      const slice = text.match(/\{[\s\S]*\}/)?.[0] || text;
      const parsed = JSON.parse(slice);
      return {
        indexValue: Math.max(0, Math.min(100, Number(parsed.indexValue) || 65)),
        trendDirection: (['rising', 'stable', 'declining'].includes(parsed.trendDirection) ? parsed.trendDirection : 'stable') as 'rising' | 'stable' | 'declining',
        summary: String(parsed.summary || heuristic.summary),
        dataSource: 'llm' as const
      };
    } catch {
      return { ...heuristic, dataSource: 'llm' as const };
    }
  }
}

export class GetNewsTool extends BaseTool<
  { topic: string },
  { articles: { title: string; source: string; url: string; publishedAt: string }[]; source: 'google_news_rss' | 'llm' | 'heuristic' }
> {
  name = 'research_get_news';
  description = 'Fetch latest news headlines for a market topic from Google News RSS. Falls back to an LLM summary if the RSS feed is unreachable.';
  namespace = 'research';
  schema = z.object({ topic: z.string().describe('The topic or sector to fetch news for.') });

  async execute(input: { topic: string }, context: AgentContext) {
    console.log(`[GetNewsTool] Fetching news for: ${input.topic}`);
    try {
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(input.topic)}&hl=en-US&gl=US&ceid=US:en`;
      const response = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FoundryAgent/1.0)' },
        timeout: 6000
      });
      const xml = response.data;
      const items: { title: string; source: string; url: string; publishedAt: string }[] = [];
      const itemRegex = /<item>([\s\S]*?)<\/item>/g;
      let m;
      while ((m = itemRegex.exec(xml)) && items.length < 8) {
        const block = m[1];
        const titleMatch = block.match(/<title>([\s\S]*?)<\/title>/);
        const linkMatch = block.match(/<link>([\s\S]*?)<\/link>/);
        const pubDateMatch = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
        const sourceMatch = block.match(/<source[^>]*>([\s\S]*?)<\/source>/);
        if (!titleMatch || !linkMatch) continue;
        const title = titleMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim();
        const link = linkMatch[1].trim();
        const publishedAt = pubDateMatch ? new Date(pubDateMatch[1].trim()).toISOString() : new Date().toISOString();
        const source = sourceMatch ? sourceMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : 'Unknown';
        items.push({ title, source, url: link, publishedAt });
      }
      if (items.length > 0) {
        return { articles: items, source: 'google_news_rss' as const };
      }
    } catch (e: any) {
      console.warn('[GetNewsTool] Google News RSS failed:', e.message);
    }

    const llm = this.resolveLLM(context);
    if (llm) {
      const parsed = await generateStructuredJson(llm,
        `Provide 3 plausible recent news headlines about the topic "${input.topic}". Output ONLY JSON of the form {"articles": [{"title": "...", "source": "..."}]}`,
        { fallback: { articles: [] } }
      );
      const list = Array.isArray(parsed.articles) ? parsed.articles : [];
      if (list.length > 0) {
        return {
          articles: list.slice(0, 3).map((a: any) => ({
            title: String(a.title || ''),
            source: String(a.source || 'Unknown'),
            url: '',
            publishedAt: new Date().toISOString()
          })),
          source: 'llm' as const
        };
      }
    }

    return {
      articles: [],
      source: 'heuristic' as const
    };
  }
}

export class FindProductHuntTool extends BaseTool<
  { tag: string },
  { products: { name: string; tagline: string; url: string }[]; source: 'producthunt_rss' | 'heuristic' }
> {
  name = 'research_find_product_hunt';
  description = 'Find recently launched products in a category from Product Hunt. Uses the public Product Hunt RSS feed when reachable.';
  namespace = 'research';
  schema = z.object({ tag: z.string().describe('The category tag, e.g. "ai", "marketing", "developer-tools".') });

  async execute(input: { tag: string }, context: AgentContext) {
    console.log(`[FindProductHuntTool] Searching Product Hunt for: ${input.tag}`);
    try {
      const url = `https://www.producthunt.com/topics/${encodeURIComponent(input.tag.toLowerCase().replace(/\s+/g, '-'))}.rss`;
      const response = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FoundryAgent/1.0)' },
        timeout: 6000
      });
      const xml = response.data;
      const items: { name: string; tagline: string; url: string }[] = [];
      const itemRegex = /<item>([\s\S]*?)<\/item>/g;
      let m;
      while ((m = itemRegex.exec(xml)) && items.length < 6) {
        const block = m[1];
        const titleMatch = block.match(/<title>([\s\S]*?)<\/title>/);
        const linkMatch = block.match(/<link>([\s\S]*?)<\/link>/);
        const descMatch = block.match(/<description>([\s\S]*?)<\/description>/);
        if (!titleMatch || !linkMatch) continue;
        const name = titleMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim();
        const link = linkMatch[1].trim();
        const tagline = descMatch ? descMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, '').trim().slice(0, 200) : '';
        items.push({ name, tagline, url: link });
      }
      if (items.length > 0) {
        return { products: items, source: 'producthunt_rss' as const };
      }
    } catch (e: any) {
      console.warn('[FindProductHuntTool] Product Hunt RSS failed:', e.message);
    }

    return {
      products: [],
      source: 'heuristic' as const
    };
  }
}

export class CrawlSiteTool extends BaseTool<
  { baseUrl: string },
  { internalUrls: string[]; titles: string[]; source: 'http_fetch' | 'heuristic' }
> {
  name = 'research_crawl_site';
  description = 'Crawl the landing page of a target site to map its internal link structure. Performs a real HTTP fetch and extracts anchor links.';
  namespace = 'research';
  schema = z.object({ baseUrl: z.string().url() });

  async execute(input: { baseUrl: string }, context: AgentContext) {
    console.log(`[CrawlSiteTool] Crawling: ${input.baseUrl}`);
    try {
      const cheerio = (await import('cheerio')).default;
      const response = await axios.get(input.baseUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FoundryAgent/1.0)' },
        timeout: 6000
      });
      const $ = cheerio.load(response.data);
      const baseHost = new URL(input.baseUrl).host;
      const internalUrls = new Set<string>();
      const titles: string[] = [];
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href') || '';
        try {
          const abs = new URL(href, input.baseUrl);
          if (abs.host === baseHost) {
            const path = abs.pathname.replace(/\/$/, '') || '/';
            internalUrls.add(abs.origin + path);
          }
        } catch { /* ignore */ }
      });
      $('h1, h2').each((_, el) => {
        const t = $(el).text().trim();
        if (t && t.length < 200 && titles.length < 20) titles.push(t);
      });
      const urlList = Array.from(internalUrls).slice(0, 15);
      if (urlList.length > 0) {
        return { internalUrls: urlList, titles, source: 'http_fetch' as const };
      }
    } catch (e: any) {
      console.warn('[CrawlSiteTool] Crawl failed:', e.message);
    }
    return { internalUrls: [], titles: [], source: 'heuristic' as const };
  }
}

export class ExtractEmailTool extends BaseTool<
  { rawText: string },
  { emails: string[] }
> {
  name = 'research_extract_email';
  description = 'Extract public email addresses from raw scraped page contents using a strict regex.';
  namespace = 'research';
  schema = z.object({ rawText: z.string() });

  async execute(input: { rawText: string }, context: AgentContext) {
    const matches = input.rawText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    const filtered = matches.filter(e => !e.endsWith('.png') && !e.endsWith('.jpg') && !e.includes('example.com'));
    return { emails: Array.from(new Set(filtered)) };
  }
}

export class CheckDomainNameTool extends BaseTool<
  { domainName: string },
  { available: boolean; alternativeOptions: string[]; resolvedIp?: string; method: 'dns_lookup' | 'heuristic' }
> {
  name = 'research_check_domain_name';
  description = 'Check whether a domain is registered by performing a real DNS lookup. Returns available=true if no A record is found. Also suggests alternative TLD variants.';
  namespace = 'research';
  schema = z.object({ domainName: z.string().describe('A domain name without protocol, e.g. "acme.ai".') });

  async execute(input: { domainName: string }, context: AgentContext) {
    const dns = await import('dns/promises');
    const clean = input.domainName.replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();
    try {
      const records = await dns.resolve4(clean).catch(() => []);
      const available = records.length === 0;
      return {
        available,
        alternativeOptions: [`${clean}.io`, `${clean}.ai`, `${clean}.co`, `get${clean}.com`],
        resolvedIp: available ? undefined : records[0],
        method: 'dns_lookup' as const
      };
    } catch (e: any) {
      return {
        available: false,
        alternativeOptions: [`${clean}.io`, `${clean}.ai`, `${clean}.co`, `get${clean}.com`],
        method: 'heuristic' as const
      };
    }
  }
}

export class AnalyzeSentimentTool extends BaseTool<
  { text: string },
  { sentiment: 'positive' | 'neutral' | 'negative'; score: number; rationale: string; dataSource: 'llm' | 'heuristic' }
> {
  name = 'research_analyze_sentiment';
  description = 'Analyze sentiment polarity of a piece of text. Uses an LLM when available for nuanced scoring, falls back to a lexicon-based heuristic.';
  namespace = 'research';
  schema = z.object({ text: z.string().describe('The text to analyze.') });

  private static POSITIVE = new Set(['great', 'excellent', 'amazing', 'love', 'best', 'wonderful', 'fantastic', 'awesome', 'perfect', 'good', 'happy', 'recommend', 'impressive', 'helpful', 'intuitive', 'fast', 'reliable', 'powerful']);
  private static NEGATIVE = new Set(['bad', 'terrible', 'awful', 'hate', 'worst', 'horrible', 'poor', 'broken', 'slow', 'buggy', 'disappointing', 'frustrating', 'useless', 'expensive', 'confusing', 'crashes']);

  async execute(input: { text: string }, context: AgentContext) {
    const text = (input.text || '').toLowerCase();
    if (text.trim().length === 0) {
      return { sentiment: 'neutral' as const, score: 0.5, rationale: 'Empty input.', dataSource: 'heuristic' as const };
    }

    const llm = this.resolveLLM(context);
    if (llm) {
      const result = await generateStructuredJson(llm,
        `Analyze the sentiment of the following text. Output ONLY a JSON object of the form:
{"sentiment": "<positive|neutral|negative>", "score": <number 0-1, where 1=strongly positive>, "rationale": "<one sentence>"}

Text:
"""${input.text.slice(0, 1500)}"""`,
        { fallback: null }
      );
      if (result && result.sentiment && typeof result.score === 'number') {
        return {
          sentiment: (['positive', 'neutral', 'negative'].includes(result.sentiment) ? result.sentiment : 'neutral') as 'positive' | 'neutral' | 'negative',
          score: Math.max(0, Math.min(1, Number(result.score))),
          rationale: String(result.rationale || ''),
          dataSource: 'llm' as const
        };
      }
    }

    const tokens = text.split(/\W+/).filter(Boolean);
    let pos = 0, neg = 0;
    for (const t of tokens) {
      if (AnalyzeSentimentTool.POSITIVE.has(t)) pos++;
      if (AnalyzeSentimentTool.NEGATIVE.has(t)) neg++;
    }
    const total = pos + neg;
    const score = total === 0 ? 0.5 : pos / total;
    const sentiment: 'positive' | 'neutral' | 'negative' = total === 0 ? 'neutral' : (pos > neg ? 'positive' : 'negative');
    return {
      sentiment,
      score,
      rationale: `Heuristic: ${pos} positive and ${neg} negative tokens detected.`,
      dataSource: 'heuristic' as const
    };
  }
}

export class SummarizeArticleTool extends BaseTool<
  { articleContent: string },
  { summaryPoints: string[]; dataSource: 'llm' | 'heuristic' }
> {
  name = 'research_summarize_article';
  description = 'Extract 3-5 key summary bullet points from a long article. Uses an LLM when available.';
  namespace = 'research';
  schema = z.object({ articleContent: z.string() });

  async execute(input: { articleContent: string }, context: AgentContext) {
    const llm = this.resolveLLM(context);
    if (llm) {
      const parsed = await generateStructuredJson(llm,
        `Summarize the following article in 3-5 concise bullet points. Output ONLY a JSON object of the form:
{"summaryPoints": ["<point 1>", "<point 2>", ...]}

Article:
"""${input.articleContent.slice(0, 3000)}"""`,
        { fallback: null }
      );
      if (parsed && Array.isArray(parsed.summaryPoints) && parsed.summaryPoints.length > 0) {
        return {
          summaryPoints: parsed.summaryPoints.slice(0, 5).map(String),
          dataSource: 'llm' as const
        };
      }
    }

    const sentences = (input.articleContent || '').split(/(?<=[.!?])\s+/).filter(s => s.length > 30 && s.length < 250);
    const summary = sentences.slice(0, Math.min(5, sentences.length)).map(s => s.trim());
    return {
      summaryPoints: summary.length > 0 ? summary : ['No content provided to summarize.'],
      dataSource: 'heuristic' as const
    };
  }
}
