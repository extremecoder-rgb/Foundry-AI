import { BaseTool, AgentContext, generateStructuredJson } from '@foundry/agent-core';
import { z } from 'zod';

export class MapUserJourneyTool extends BaseTool<
  { personaName: string; productContext?: string },
  { steps: { stage: string; action: string; emotion: string }[]; dataSource: 'llm' | 'heuristic' }
> {
  name = 'product_map_user_journey';
  description = 'Map standard user journey funnel steps for a targeted buyer persona. LLM-augmented when available.';
  namespace = 'product';
  schema = z.object({
    personaName: z.string().describe('The persona name or role.'),
    productContext: z.string().optional()
  });

  async execute(input: { personaName: string; productContext?: string }, context: AgentContext) {
    const heuristic = {
      steps: [
        { stage: 'Awareness', action: `Discovers ${input.productContext || 'the product'} via search or referral`, emotion: 'curious' },
        { stage: 'Consideration', action: 'Reads documentation, reviews pricing', emotion: 'evaluative' },
        { stage: 'Trial', action: 'Creates account and runs first workflow', emotion: 'hopeful' },
        { stage: 'Adoption', action: 'Integrates into daily workflow', emotion: 'engaged' },
        { stage: 'Advocacy', action: 'Refers peers and submits feedback', emotion: 'enthusiastic' }
      ],
      dataSource: 'heuristic' as const
    };

    const llm = this.resolveLLM(context);
    if (!llm) return heuristic;

    const parsed = await generateStructuredJson(llm,
      `Map the user journey for the persona "${input.personaName}"${input.productContext ? ` using "${input.productContext}"` : ''}. Output ONLY a JSON object of the form:
{"steps": [{"stage": "<stage name>", "action": "<what the user does>", "emotion": "<one-word emotion>"}]}

Include 4-6 steps covering awareness through advocacy.`,
      { fallback: null }
    );
    if (!parsed || !Array.isArray(parsed.steps) || parsed.steps.length === 0) return heuristic;
    return {
      steps: parsed.steps.slice(0, 8).map((s: any) => ({
        stage: String(s.stage || ''),
        action: String(s.action || ''),
        emotion: String(s.emotion || 'neutral')
      })),
      dataSource: 'llm' as const
    };
  }
}

export class PrioritizeBacklogTool extends BaseTool<
  { features: { name: string; reach: number; impact: number; confidence: number; effort: number }[] },
  { prioritizedList: { feature: string; score: number; method: 'RICE' }[] }
> {
  name = 'product_prioritize_backlog';
  description = 'Apply RICE scoring (Reach × Impact × Confidence / Effort) to rank a product backlog.';
  namespace = 'product';
  schema = z.object({
    features: z.array(z.object({
      name: z.string(),
      reach: z.number().describe('Number of users per quarter.'),
      impact: z.number().min(0.25).max(3).describe('0.25=minimal, 0.5=low, 1=medium, 2=high, 3=massive.'),
      confidence: z.number().min(0).max(1).describe('Confidence percentage 0-1.'),
      effort: z.number().min(0.5).describe('Person-months of effort.')
    }))
  });

  async execute(input: { features: { name: string; reach: number; impact: number; confidence: number; effort: number }[] }, context: AgentContext) {
    const scored = input.features.map(f => {
      const score = (f.reach * f.impact * f.confidence) / Math.max(0.5, f.effort);
      return { feature: f.name, score: Math.round(score * 10) / 10, method: 'RICE' as const };
    });
    scored.sort((a, b) => b.score - a.score);
    return { prioritizedList: scored };
  }
}

export class DefinePersonaTool extends BaseTool<
  { segment: string; productContext?: string },
  { personas: { name: string; role: string; painPoints: string[]; goals: string[] }[]; dataSource: 'llm' | 'heuristic' }
> {
  name = 'product_define_persona';
  description = 'Draft 2 user personas for a target segment. LLM-augmented for context-specific personas when an LLM is available.';
  namespace = 'product';
  schema = z.object({
    segment: z.string().describe('The target customer segment.'),
    productContext: z.string().optional()
  });

  async execute(input: { segment: string; productContext?: string }, context: AgentContext) {
    const heuristic = {
      personas: [
        {
          name: `Primary Buyer (${input.segment})`,
          role: `Decision maker in the ${input.segment} segment`,
          painPoints: [
            `Lacks visibility into current ${input.productContext || 'workflow'} outcomes`,
            'Spends too much time on manual reporting and coordination',
            'Existing tools do not integrate with the team stack'
          ],
          goals: [
            `Reduce time spent on ${input.productContext || 'operational'} tasks`,
            'Demonstrate ROI to leadership within one quarter',
            'Adopt a tool the team will actually use'
          ]
        },
        {
          name: `End User (${input.segment})`,
          role: `Day-to-day operator affected by ${input.productContext || 'the workflow'}`,
          painPoints: [
            'Context switching between too many tools',
            'Repetitive manual work that could be automated',
            'No clear feedback loop on what is working'
          ],
          goals: [
            'Complete daily work in fewer clicks',
            'Trust the data shown on dashboards',
            'Avoid learning yet another complex tool'
          ]
        }
      ],
      dataSource: 'heuristic' as const
    };

    const llm = this.resolveLLM(context);
    if (!llm) return heuristic;

    const parsed = await generateStructuredJson(llm,
      `Define 2 distinct user personas for the segment "${input.segment}"${input.productContext ? ` of the product "${input.productContext}"` : ''}. Output ONLY a JSON object of the form:
{"personas": [{"name": "<persona name>", "role": "<one-line role>", "painPoints": ["<3 specific pain points>"], "goals": ["<2-3 goals>"]}]}

Persona names should feel like real names (e.g. "Marketing Manager Maya") not "Developer Dan". Pain points must be specific to the segment.`,
      { fallback: null }
    );
    if (!parsed || !Array.isArray(parsed.personas) || parsed.personas.length === 0) return heuristic;
    return {
      personas: parsed.personas.slice(0, 3).map((p: any) => ({
        name: String(p.name || `Persona (${input.segment})`),
        role: String(p.role || ''),
        painPoints: Array.isArray(p.painPoints) ? p.painPoints.slice(0, 4).map(String) : [],
        goals: Array.isArray(p.goals) ? p.goals.slice(0, 4).map(String) : []
      })),
      dataSource: 'llm' as const
    };
  }
}

export class DrawFlowchartTool extends BaseTool<
  { processName: string; steps?: string[] },
  { nodes: string[]; edges: string[]; mermaid: string; dataSource: 'llm' | 'heuristic' }
> {
  name = 'product_draw_flowchart';
  description = 'Generate a Mermaid diagram flowchart for a named process. LLM-augmented to derive steps from the process name when no steps are provided.';
  namespace = 'product';
  schema = z.object({
    processName: z.string().describe('The name of the process to diagram.'),
    steps: z.array(z.string()).optional()
  });

  async execute(input: { processName: string; steps?: string[] }, context: AgentContext) {
    let steps = input.steps;
    if (!steps || steps.length === 0) {
      const llm = this.resolveLLM(context);
      if (llm) {
        const parsed = await generateStructuredJson(llm,
          `List 4-7 ordered steps in the process "${input.processName}". Output ONLY a JSON object of the form {"steps": ["step 1", "step 2", ...]}.`,
          { fallback: { steps: ['Start', `Execute ${input.processName}`, 'End'] } }
        );
        if (Array.isArray(parsed.steps) && parsed.steps.length > 0) {
          steps = parsed.steps.map(String);
        }
      }
    }
    if (!steps || steps.length === 0) steps = ['Start', `Execute ${input.processName}`, 'End'];

    const nodes = ['Start', ...steps, 'End'];
    const edges: string[] = [];
    for (let i = 0; i < nodes.length - 1; i++) {
      edges.push(`${nodes[i]} -> ${nodes[i + 1]}`);
    }
    const mermaid = `flowchart TD\n${nodes.map((n, i) => `  N${i}["${n}"]`).join('\n')}\n${edges.map((e, i) => {
      const [from, to] = e.split(' -> ');
      const fi = nodes.indexOf(from);
      const ti = nodes.indexOf(to);
      return `  N${fi} --> N${ti}`;
    }).join('\n')}`;
    return { nodes, edges, mermaid, dataSource: steps ? 'llm' as const : 'heuristic' as const };
  }
}

export class CompareFeaturesTool extends BaseTool<
  { ourFeatures: string[]; competitorFeatures: string[]; productContext?: string },
  { gaps: string[]; differentiators: string[]; dataSource: 'llm' | 'heuristic' }
> {
  name = 'product_compare_features';
  description = 'Perform a gaps analysis comparing our features against competitor features. Identifies gaps in competitor offerings and our differentiators.';
  namespace = 'product';
  schema = z.object({
    ourFeatures: z.array(z.string()),
    competitorFeatures: z.array(z.string()),
    productContext: z.string().optional()
  });

  async execute(input: { ourFeatures: string[]; competitorFeatures: string[]; productContext?: string }, context: AgentContext) {
    const ourSet = new Set(input.ourFeatures.map(f => f.toLowerCase()));
    const compSet = new Set(input.competitorFeatures.map(f => f.toLowerCase()));

    const gaps: string[] = [];
    for (const c of input.competitorFeatures) {
      if (!ourSet.has(c.toLowerCase())) gaps.push(`Missing: ${c}`);
      if (gaps.length >= 5) break;
    }
    const differentiators: string[] = [];
    for (const o of input.ourFeatures) {
      if (!compSet.has(o.toLowerCase())) differentiators.push(`Unique: ${o}`);
      if (differentiators.length >= 5) break;
    }
    if (gaps.length === 0 && differentiators.length === 0) {
      return { gaps: ['Feature parity with competitors.'], differentiators: ['No unique differentiators detected.'], dataSource: 'heuristic' as const };
    }
    return { gaps, differentiators, dataSource: 'heuristic' as const };
  }
}

export class EstimateVelocityTool extends BaseTool<
  { storyPoints: number; teamSize?: number; sprintLengthDays?: number },
  { sprintsNeeded: number; personDays: number; assumptions: string }
> {
  name = 'product_estimate_velocity';
  description = 'Estimate sprint cycles required for implementation based on team velocity and sprint length.';
  namespace = 'product';
  schema = z.object({
    storyPoints: z.number().describe('Total story points to deliver.'),
    teamSize: z.number().min(1).optional().describe('Engineers in the team (default 4).'),
    sprintLengthDays: z.number().min(1).optional().describe('Sprint length in days (default 10).')
  });

  async execute(input: { storyPoints: number; teamSize?: number; sprintLengthDays?: number }, context: AgentContext) {
    const team = Math.max(1, input.teamSize ?? 4);
    const sprintDays = input.sprintLengthDays ?? 10;
    const velocityPerSprint = Math.max(8, team * 6);
    const sprints = Math.max(1, Math.ceil(input.storyPoints / velocityPerSprint));
    const personDays = sprints * sprintDays * team;
    return {
      sprintsNeeded: sprints,
      personDays,
      assumptions: `Team of ${team}, ${sprintDays}-day sprints, ${velocityPerSprint} story points/sprint (industry baseline).`
    };
  }
}

export class WriteReleaseNotesTool extends BaseTool<
  { version: string; featuresAdded: string[]; bugFixes?: string[] },
  { markdown: string }
> {
  name = 'product_write_release_notes';
  description = 'Draft structured markdown release notes with sections for features, improvements, and bug fixes.';
  namespace = 'product';
  schema = z.object({
    version: z.string().describe('Semver version, e.g. "1.2.0".'),
    featuresAdded: z.array(z.string()),
    bugFixes: z.array(z.string()).optional()
  });

  async execute(input: { version: string; featuresAdded: string[]; bugFixes?: string[] }, context: AgentContext) {
    const today = new Date().toISOString().slice(0, 10);
    const sections: string[] = [`# Release ${input.version} — ${today}`, ''];
    sections.push('## New Features');
    sections.push(input.featuresAdded.length > 0 ? input.featuresAdded.map(f => `- ${f}`).join('\n') : '- No new features in this release.');
    sections.push('');
    sections.push('## Bug Fixes');
    sections.push((input.bugFixes && input.bugFixes.length > 0) ? input.bugFixes.map(f => `- ${f}`).join('\n') : '- No bug fixes in this release.');
    return { markdown: sections.join('\n') };
  }
}

export class CalculateNpsTool extends BaseTool<
  { promoters: number; detractors: number; passives: number },
  { nps: number; interpretation: string }
> {
  name = 'product_calculate_nps';
  description = 'Calculate Net Promoter Score from customer survey counts. NPS ranges from -100 to +100.';
  namespace = 'product';
  schema = z.object({ promoters: z.number(), detractors: z.number(), passives: z.number() });

  async execute(input: { promoters: number; detractors: number; passives: number }, context: AgentContext) {
    const total = input.promoters + input.detractors + input.passives;
    if (total === 0) return { nps: 0, interpretation: 'No survey responses recorded.' };
    const nps = Math.round(((input.promoters - input.detractors) / total) * 100);
    let interpretation: string;
    if (nps >= 50) interpretation = 'World-class. Customers are highly likely to recommend.';
    else if (nps >= 0) interpretation = 'Healthy. More promoters than detractors.';
    else interpretation = 'Negative. Investigate top detractor reasons.';
    return { nps, interpretation };
  }
}

export class MapCustomerJourneyTool extends BaseTool<
  { stages: string[]; productContext?: string },
  { journeyOutline: string; mermaid: string; dataSource: 'llm' | 'heuristic' }
> {
  name = 'product_map_customer_journey';
  description = 'Document stages of a customer journey, optionally enriching each stage with a goal and metric. Outputs both prose and a Mermaid diagram.';
  namespace = 'product';
  schema = z.object({
    stages: z.array(z.string()).describe('Ordered list of journey stage names.'),
    productContext: z.string().optional()
  });

  async execute(input: { stages: string[]; productContext?: string }, context: AgentContext) {
    const context = input.productContext ? ` for ${input.productContext}` : '';
    const lines: string[] = [`Customer journey${context}:`];
    input.stages.forEach((s, i) => {
      lines.push(`${i + 1}. ${s} — success metric: ${this.stageMetric(s)}`);
    });
    const mermaid = `journey\n  title Customer Journey${context}\n${input.stages.map((s, i) => `  section ${this.titleCase(s)}\n    ${i + 1}: ${i + 1}: ${this.stageMetric(s)}`).join('\n')}`;
    return { journeyOutline: lines.join('\n'), mermaid, dataSource: 'heuristic' as const };
  }

  private stageMetric(stage: string): string {
    const s = stage.toLowerCase();
    if (s.includes('aware') || s.includes('discov')) return 'Reach';
    if (s.includes('trial') || s.includes('sign')) return 'Sign-up rate';
    if (s.includes('active') || s.includes('use') || s.includes('engage')) return 'Weekly active rate';
    if (s.includes('pay') || s.includes('conver')) return 'Conversion to paid';
    if (s.includes('retain') || s.includes('loyal')) return 'Retention %';
    if (s.includes('refer') || s.includes('advocat')) return 'Referral count';
    return 'Completion rate';
  }

  private titleCase(s: string): string {
    return s.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }
}
