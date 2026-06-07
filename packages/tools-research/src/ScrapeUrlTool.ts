import { BaseTool, AgentContext, generateStructuredJson } from '@foundry/agent-core';
import { z } from 'zod';
import axios from 'axios';
import * as cheerio from 'cheerio';

export class ScrapeUrlTool extends BaseTool<
  { url: string },
  { title: string; content: string; headings: string[]; outboundLinks: string[]; scrapeError?: string }
> {
  name = 'research_scrape_url';
  description = 'Fetch the HTML content of a URL and extract the visible text, headings, and outbound links.';
  namespace = 'research';
  schema = z.object({
    url: z.string().url().describe('The URL of the webpage to scrape.')
  });

  async execute(input: { url: string }, context: AgentContext): Promise<{ title: string; content: string; headings: string[]; outboundLinks: string[]; scrapeError?: string }> {
    console.log(`[ScrapeUrlTool] Scraping URL: ${input.url}`);
    try {
      const response = await axios.get(input.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml'
        },
        timeout: 6000,
        maxContentLength: 2 * 1024 * 1024
      });

      const $ = cheerio.load(response.data);
      const title = $('title').text().trim() || $('h1').first().text().trim() || 'Untitled Page';

      $('script, style, noscript, iframe, nav, footer, header, aside, form, button').remove();

      const headings: string[] = [];
      $('h1, h2, h3').each((_, el) => {
        const text = $(el).text().trim();
        if (text && text.length < 200) headings.push(text);
      });

      const baseHost = new URL(input.url).host;
      const outboundLinks: string[] = [];
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href') || '';
        if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
        try {
          const abs = new URL(href, input.url).toString();
          if (!outboundLinks.includes(abs) && outboundLinks.length < 20) {
            const linkHost = new URL(abs).host;
            if (linkHost === baseHost || outboundLinks.length < 5) {
              outboundLinks.push(abs);
            }
          }
        } catch { /* ignore bad URLs */ }
      });

      const rawText = $('body').text();
      const content = rawText.replace(/\s+/g, ' ').trim().substring(0, 3000);

      return { title, content, headings, outboundLinks };
    } catch (error: any) {
      console.warn(`[ScrapeUrlTool] Scrape failed for ${input.url}:`, error.message);
      return {
        title: 'Scrape failed',
        content: '',
        headings: [],
        outboundLinks: [],
        scrapeError: error.message
      };
    }
  }
}
