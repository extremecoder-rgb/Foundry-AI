import { BaseTool, AgentContext, generateStructuredJson } from '@foundry/agent-core';
import { z } from 'zod';

export interface WireframeElement {
  type: 'button' | 'input' | 'table' | 'chart' | 'text' | 'card' | 'list' | 'nav';
  label: string;
  position: string;
}

export class DesignWireframeSpecTool extends BaseTool<
  { screenName: string; userStoriesDescription?: string; productContext?: string },
  { layout: string; elements: WireframeElement[]; dataSource: 'llm' | 'heuristic' }
> {
  name = 'product_design_wireframe_spec';
  description = 'Create a wireframe spec listing UI elements for a specific screen, guided by user stories. Uses an LLM when available for context-aware element selection.';
  namespace = 'product';
  schema = z.object({
    screenName: z.string().describe('The name of the screen (e.g. Dashboard, Login).'),
    userStoriesDescription: z.string().optional().describe('Optional user story text driving the UI.'),
    productContext: z.string().optional().describe('Optional product concept to ground the wireframe in.')
  });

  async execute(
    input: { screenName: string; userStoriesDescription?: string; productContext?: string },
    context: AgentContext
  ): Promise<{ layout: string; elements: WireframeElement[]; dataSource: 'llm' | 'heuristic' }> {
    const heuristic = this.buildHeuristic(input.screenName, input.productContext);
    const llm = this.resolveLLM(context);
    if (!llm) return { ...heuristic, dataSource: 'heuristic' };

    const grounding = input.userStoriesDescription ? `\nUser stories: ${input.userStoriesDescription.slice(0, 600)}` : '';
    const product = input.productContext ? ` for the product "${input.productContext}"` : '';
    const parsed = await generateStructuredJson(llm,
      `Design a wireframe for the "${input.screenName}" screen${product}.${grounding}

Output ONLY a JSON object of the form:
{
  "layout": "<one-sentence description of the overall layout>",
  "elements": [
    { "type": "<button|input|table|chart|text|card|list|nav>", "label": "<descriptive label>", "position": "<e.g. top-left, center, sidebar-right>" }
  ]
}

Include 4-8 elements. Element labels should reference what the screen is for, not generic words.`,
      { fallback: null }
    );

    if (!parsed || !Array.isArray(parsed.elements) || parsed.elements.length === 0) {
      return { ...heuristic, dataSource: 'heuristic' };
    }
    const validTypes = new Set(['button', 'input', 'table', 'chart', 'text', 'card', 'list', 'nav']);
    const elements: WireframeElement[] = parsed.elements.slice(0, 10).map((e: any) => ({
      type: validTypes.has(e.type) ? e.type : 'text',
      label: String(e.label || 'Element'),
      position: String(e.position || 'center')
    }));
    return {
      layout: String(parsed.layout || heuristic.layout),
      elements,
      dataSource: 'llm'
    };
  }

  private buildHeuristic(screenName: string, productContext?: string): { layout: string; elements: WireframeElement[] } {
    const product = productContext ? ` for ${productContext}` : '';
    const elements: WireframeElement[] = [
      { type: 'nav', label: `${screenName} Top Navigation`, position: 'top' },
      { type: 'text', label: `${screenName} Header${product}`, position: 'top-left' },
      { type: 'button', label: 'Primary Action', position: 'top-right' }
    ];
    const lower = screenName.toLowerCase();
    if (lower.includes('dashboard')) {
      elements.push(
        { type: 'chart', label: 'Key Metric Trend', position: 'middle-left' },
        { type: 'table', label: 'Recent Records', position: 'middle-right' },
        { type: 'list', label: 'Activity Feed', position: 'bottom' }
      );
    } else if (lower.includes('login') || lower.includes('signin')) {
      elements.push(
        { type: 'input', label: 'Email Field', position: 'center-top' },
        { type: 'input', label: 'Password Field', position: 'center-middle' },
        { type: 'button', label: 'Sign In', position: 'center-bottom' }
      );
    } else if (lower.includes('settings') || lower.includes('profile')) {
      elements.push(
        { type: 'input', label: 'Display Name', position: 'middle-left' },
        { type: 'input', label: 'Email Notifications Toggle', position: 'middle-right' },
        { type: 'button', label: 'Save Changes', position: 'bottom-right' }
      );
    } else {
      elements.push(
        { type: 'text', label: 'Section Heading', position: 'middle-left' },
        { type: 'card', label: 'Information Card', position: 'middle-right' }
      );
    }
    return {
      layout: `Single-column responsive grid layout for ${screenName}${product} with a top navigation, primary header, and contextual body content.`,
      elements
    };
  }
}
