import { BaseTool, AgentContext } from '@foundry/agent-core';
import { z } from 'zod';

export interface WireframeElement {
  type: 'button' | 'input' | 'table' | 'chart' | 'text';
  label: string;
  position: string;
}

export class DesignWireframeSpecTool extends BaseTool<
  { screenName: string; userStoriesDescription?: string },
  { layout: string; elements: WireframeElement[] }
> {
  name = 'product_design_wireframe_spec';
  description = 'Create a wireframe spec and list of UI layout elements for a specific screen, guided by user stories.';
  namespace = 'product';
  schema = z.object({
    screenName: z.string().describe('The name of the screen/page to design (e.g. Dashboard, Login).'),
    userStoriesDescription: z.string().optional().describe('Optional description of user stories driving the UI layout.')
  });

  async execute(
    input: { screenName: string; userStoriesDescription?: string },
    context: AgentContext
  ): Promise<{ layout: string; elements: WireframeElement[] }> {
    console.log(`[DesignWireframeSpecTool] Designing layout for screen: "${input.screenName}"`);

    const elements: WireframeElement[] = [
      { type: 'text', label: `${input.screenName} Header`, position: 'Top-Left' },
      { type: 'button', label: 'Refresh Data', position: 'Top-Right' }
    ];

    if (input.screenName.toLowerCase().includes('dashboard')) {
      elements.push(
        { type: 'chart', label: 'Active Users Growth Line Chart', position: 'Middle-Left' },
        { type: 'table', label: 'Recent Security Scans', position: 'Middle-Right' }
      );
    } else if (input.screenName.toLowerCase().includes('login')) {
      elements.push(
        { type: 'input', label: 'Email Field', position: 'Center-Top' },
        { type: 'input', label: 'Password Field', position: 'Center-Middle' },
        { type: 'button', label: 'Submit MFA Button', position: 'Center-Bottom' }
      );
    }

    return {
      layout: `Standard grid layout for ${input.screenName} containing structural elements.`,
      elements
    };
  }
}
