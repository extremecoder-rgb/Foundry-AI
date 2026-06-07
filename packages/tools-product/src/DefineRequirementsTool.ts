import { BaseTool, AgentContext, generateStructuredJson } from '@foundry/agent-core';
import { z } from 'zod';

export interface Requirement {
  id: string;
  type: 'functional' | 'non-functional';
  description: string;
  priority: 'high' | 'medium' | 'low';
}

export class DefineRequirementsTool extends BaseTool<
  { productConcept: string; marketInsights?: string; minRequirements?: number },
  { requirements: Requirement[]; dataSource: 'llm' | 'heuristic' }
> {
  name = 'product_define_requirements';
  description = 'Define 4-6 functional and non-functional requirements for a product concept. When an LLM is available it generates concept-specific requirements; otherwise it falls back to a generic template.';
  namespace = 'product';
  schema = z.object({
    productConcept: z.string().describe('The concept or core value proposition of the product.'),
    marketInsights: z.string().optional().describe('Optional market insights to ground the requirements.'),
    minRequirements: z.number().optional().describe('Minimum number of requirements to return (default 5).')
  });

  async execute(
    input: { productConcept: string; marketInsights?: string; minRequirements?: number },
    context: AgentContext
  ): Promise<{ requirements: Requirement[]; dataSource: 'llm' | 'heuristic' }> {
    console.log(`[DefineRequirementsTool] Defining requirements for: "${input.productConcept.substring(0, 60)}"`);
    const min = Math.max(4, Math.min(8, input.minRequirements ?? 5));
    const heuristic: Requirement[] = this.buildHeuristic(input.productConcept, min);
    heuristic[0].description = `The system must provide core ${input.productConcept.toLowerCase()} capabilities to end users.`;
    heuristic[0].type = 'functional';

    const llm = this.resolveLLM(context);
    if (!llm) return { requirements: heuristic, dataSource: 'heuristic' };

    const grounding = input.marketInsights
      ? `\n\nMarket context to ground requirements:\n${input.marketInsights.slice(0, 1200)}`
      : '';
    const userPrompt = `Generate ${min} product requirements for the following venture concept: "${input.productConcept}".

Each requirement must be:
- Specifically about what this venture does (not generic SaaS boilerplate like "MFA login" or "real-time analytics" unless the concept is genuinely about that)
- A mix of functional and non-functional
- Tagged with priority (high, medium, low)

Output ONLY a JSON object of the form:
{
  "requirements": [
    { "id": "REQ-001", "type": "<functional|non-functional>", "description": "<specific to the concept>", "priority": "<high|medium|low>" }
  ]
}${grounding}`;

    const parsed = await generateStructuredJson(llm, userPrompt, {
      systemPrompt: 'You are a product manager. Output only a JSON object. No commentary. Make every requirement specific to the concept.',
      fallback: { requirements: heuristic }
    });

    const list = Array.isArray(parsed.requirements) ? parsed.requirements : [];
    if (list.length === 0) return { requirements: heuristic, dataSource: 'heuristic' };

    const cleaned: Requirement[] = list.slice(0, 8).map((r: any, i: number) => ({
      id: String(r.id || `REQ-00${i + 1}`),
      type: r.type === 'non-functional' ? 'non-functional' : 'functional',
      description: String(r.description || '').trim() || `Functional capability ${i + 1} for ${input.productConcept}`,
      priority: ['high', 'medium', 'low'].includes(r.priority) ? r.priority : 'medium'
    })).filter((r: Requirement) => r.description.length > 10);

    if (cleaned.length === 0) return { requirements: heuristic, dataSource: 'heuristic' };
    return { requirements: cleaned, dataSource: 'llm' };
  }

  private buildHeuristic(concept: string, min: number): Requirement[] {
    const list: Requirement[] = [
      { id: 'REQ-001', type: 'functional', description: `The system must allow users to access ${concept} functionality through a secure web dashboard.`, priority: 'high' },
      { id: 'REQ-002', type: 'functional', description: `Users must be able to configure and customize core ${concept} workflows.`, priority: 'high' },
      { id: 'REQ-003', type: 'non-functional', description: `API response times must remain under 300ms for 95% of standard read requests.`, priority: 'high' },
      { id: 'REQ-004', type: 'non-functional', description: `The platform must support horizontal scaling to 10,000 concurrent active users.`, priority: 'medium' },
      { id: 'REQ-005', type: 'functional', description: `The system must generate exportable reports of ${concept} activity.`, priority: 'medium' }
    ];
    while (list.length < min) {
      list.push({
        id: `REQ-00${list.length + 1}`,
        type: 'non-functional',
        description: `The platform must enforce role-based access control with audit logging.`,
        priority: 'medium'
      });
    }
    return list;
  }
}
