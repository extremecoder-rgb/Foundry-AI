import { BaseTool, AgentContext, generateStructuredJson } from '@foundry/agent-core';
import { z } from 'zod';
import axios from 'axios';
import * as cheerio from 'cheerio';

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

const FORBIDDEN_TOKENS = [
  'competitor', 'competitors', 'insights', 'market leaders', 'incumbentcorp',
  'fastscale', 'nichetech', 'tbd', 'n/a', 'unknown', 'placeholder', 'example inc',
  'industry leaders', 'top players', 'key players', 'main players'
];

function looksLikeCompanyName(s: string): boolean {
  const t = s.trim();
  if (t.length < 2 || t.length > 60) return false;
  if (/^https?:/i.test(t)) return false;
  const lower = t.toLowerCase();
  if (FORBIDDEN_TOKENS.some(tok => lower === tok || lower.includes(tok))) return false;
  if (/^(the|a|an)\s/i.test(t) && t.split(/\s+/).length < 3) return false;
  return true;
}

function simplifyQuery(query: string): string[] {
  // Lowercase and clean punctuation
  let clean = query.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, " ").replace(/\s+/g, " ").trim();
  
  // Remove common prefix/suffix fillers
  const stopWords = new Set([
    'a', 'an', 'the', 'of', 'for', 'in', 'on', 'at', 'by', 'with', 'about', 'to', 'from',
    'competitors', 'competitor', 'companies', 'company', 'startup', 'startups', 'platforms',
    'platform', 'software', 'tool', 'tools', 'service', 'services', 'system', 'systems', 'engine',
    'engines', 'toolkit', 'toolkits', 'top', 'best', 'popular', 'list', 'of', 'leading', 'analyze', 'analysis',
    'market', 'trends', 'signals', 'for'
  ]);

  // If there are conjunctions like "and", "or", "vs", "versus", split them to search separately
  const parts = clean.split(/\s+(?:and|or|vs|versus)\s+/i);
  const queries: string[] = [];
  
  for (const part of parts) {
    const words = part.split(/\s+/).filter(w => !stopWords.has(w.toLowerCase()));
    if (words.length > 0) {
      queries.push(words.join(' '));
    }
  }
  
  // If we ended up with nothing, fallback to original query
  if (queries.length === 0) {
    return [query];
  }
  return queries;
}

export class WebSearchTool extends BaseTool<
  { query: string },
  { results: SearchResult[]; searchUnavailable?: boolean; reason?: string }
> {
  name = 'research_web_search';
  description = 'Search the web for pages matching the query, returning titles, URLs, and snippets. Uses DuckDuckGo HTML and falls back to Wikipedia. Returns searchUnavailable=true if both fail.';
  namespace = 'research';
  schema = z.object({
    query: z.string().describe('The search query to execute.')
  });

  async execute(input: { query: string }, context: AgentContext): Promise<{ results: SearchResult[]; searchUnavailable?: boolean; reason?: string }> {
    console.log(`[WebSearchTool] Searching for: "${input.query}"`);
    const results: SearchResult[] = [];
    const searchQueries = simplifyQuery(input.query);
    console.log(`[WebSearchTool] Simplified queries:`, searchQueries);

    for (const q of searchQueries.slice(0, 2)) {
      try {
        const response = await axios.get(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          },
          timeout: 5000
        });

        const $ = cheerio.load(response.data);
        $('.result').each((i, element) => {
          const title = $(element).find('.result__a').text().trim();
          const url = $(element).find('.result__url').text().trim();
          const snippet = $(element).find('.result__snippet').text().trim();

          if (title && snippet) {
            const cleanUrl = url.startsWith('http') ? url : `https://${url}`;
            // Avoid duplicates
            if (!results.some(r => r.url === cleanUrl || r.title === title)) {
              results.push({
                title,
                url: cleanUrl,
                snippet
              });
            }
          }
        });
      } catch (e: any) {
        console.warn(`[WebSearchTool] DuckDuckGo failed for query "${q}":`, e.message);
      }
    }

    if (results.length === 0) {
      for (const q of searchQueries.slice(0, 2)) {
        try {
          const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&format=json&origin=*`;
          const wikiResponse = await axios.get(wikiUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 4000
          });
          const wikiList = wikiResponse.data?.query?.search || [];
          for (const item of wikiList.slice(0, 5)) {
            const cleanSnippet = (item.snippet || '').replace(/<span class="searchmatch">/g, '').replace(/<\/span>/g, '').trim();
            const url = `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title)}`;
            if (!results.some(r => r.url === url || r.title === item.title)) {
              results.push({
                title: item.title,
                url,
                snippet: cleanSnippet
              });
            }
          }
        } catch (wikiErr: any) {
          console.warn(`[WebSearchTool] Wikipedia fallback failed for query "${q}":`, wikiErr.message);
        }
      }
    }

    if (results.length === 0) {
      return {
        results: [],
        searchUnavailable: true,
        reason: 'Both DuckDuckGo and Wikipedia returned no results. The venture concept may be too niche or the search backend is unreachable.'
      };
    }

    // Limit to top 6 merged results
    return { results: results.slice(0, 6), searchUnavailable: false };
  }
}
