import { BaseTool, AgentContext } from '@foundry/agent-core';
import { z } from 'zod';

// 1. MapUserJourneyTool
export class MapUserJourneyTool extends BaseTool<{ personaName: string }, { steps: string[] }> {
  name = 'product_map_user_journey';
  description = 'Map standard user journey funnel steps for a targeted buyer persona.';
  namespace = 'product';
  schema = z.object({ personaName: z.string() });
  async execute(input: { personaName: string }, context: AgentContext) {
    return { steps: ['Awareness: View landing page', 'Interest: Read features', 'Conversion: Register with OAuth', 'Retention: Spawn first run'] };
  }
}

// 2. PrioritizeBacklogTool
export class PrioritizeBacklogTool extends BaseTool<{ features: string[] }, { prioritizedList: { feature: string; method: string }[] }> {
  name = 'product_prioritize_backlog';
  description = 'Apply MoSCoW prioritization metrics to draft product roadmaps.';
  namespace = 'product';
  schema = z.object({ features: z.array(z.string()) });
  async execute(input: { features: string[] }, context: AgentContext) {
    return {
      prioritizedList: input.features.map((f, i) => ({
        feature: f,
        method: i === 0 ? 'Must-have' : i === 1 ? 'Should-have' : 'Could-have'
      }))
    };
  }
}

// 3. DefinePersonaTool
export class DefinePersonaTool extends BaseTool<{ segment: string }, { persona: { name: string; painPoints: string[] } }> {
  name = 'product_define_persona';
  description = 'Draft user personas profiles detailing goals and software frustration points.';
  namespace = 'product';
  schema = z.object({ segment: z.string() });
  async execute(input: { segment: string }, context: AgentContext) {
    return {
      persona: {
        name: `Developer Dan (${input.segment})`,
        painPoints: ['Lacks clear API documentation', 'Takes too long to compile builds', 'Too many manual testing steps']
      }
    };
  }
}

// 4. DrawFlowchartTool
export class DrawFlowchartTool extends BaseTool<{ processName: string }, { nodes: string[]; edges: string[] }> {
  name = 'product_draw_flowchart';
  description = 'Generate Mermaid diagram flowchart structure specs for workflows.';
  namespace = 'product';
  schema = z.object({ processName: z.string() });
  async execute(input: { processName: string }, context: AgentContext) {
    return {
      nodes: ['Start', 'Input task', 'Select agent', 'Run tool', 'Complete'],
      edges: ['Start -> Input task', 'Input task -> Select agent', 'Select agent -> Run tool', 'Run tool -> Complete']
    };
  }
}

// 5. CompareFeaturesTool
export class CompareFeaturesTool extends BaseTool<{ competitorFeatures: string[] }, { gaps: string[] }> {
  name = 'product_compare_features';
  description = 'Perform gaps analyses comparing our products features against main incumbents.';
  namespace = 'product';
  schema = z.object({ competitorFeatures: z.array(z.string()) });
  async execute(input: { competitorFeatures: string[] }, context: AgentContext) {
    return { gaps: ['Automated multi-agent execution is missing in competitor tools', 'Self-hosting options are unaddressed'] };
  }
}

// 6. EstimateVelocityTool
export class EstimateVelocityTool extends BaseTool<{ storyPoints: number }, { sprintsNeeded: number }> {
  name = 'product_estimate_velocity';
  description = 'Estimate sprint cycles required for implementation depending on team velocity.';
  namespace = 'product';
  schema = z.object({ storyPoints: z.number() });
  async execute(input: { storyPoints: number }, context: AgentContext) {
    const avgVelocity = 25;
    return { sprintsNeeded: Math.ceil(input.storyPoints / avgVelocity) };
  }
}

// 7. WriteReleaseNotesTool
export class WriteReleaseNotesTool extends BaseTool<{ featuresAdded: string[] }, { markdown: string }> {
  name = 'product_write_release_notes';
  description = 'Draft structured markdown release notes summarizing feature highlights.';
  namespace = 'product';
  schema = z.object({ featuresAdded: z.array(z.string()) });
  async execute(input: { featuresAdded: string[] }, context: AgentContext) {
    return {
      markdown: `## Release Notes\n\n### New Features:\n${input.featuresAdded.map(f => `- ${f}`).join('\n')}\n`
    };
  }
}
