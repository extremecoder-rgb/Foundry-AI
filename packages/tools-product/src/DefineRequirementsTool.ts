import { BaseTool, AgentContext } from '@foundry/agent-core';
import { z } from 'zod';

export interface Requirement {
  id: string;
  type: 'functional' | 'non-functional';
  description: string;
  priority: 'high' | 'medium' | 'low';
}

export class DefineRequirementsTool extends BaseTool<
  { productConcept: string; marketInsights?: string },
  { requirements: Requirement[] }
> {
  name = 'product_define_requirements';
  description = 'Define functional and non-functional requirements for the product concept based on market insights.';
  namespace = 'product';
  schema = z.object({
    productConcept: z.string().describe('The concept or core value proposition of the product.'),
    marketInsights: z.string().optional().describe('Optional insights gathered from market research to guide requirement definition.')
  });

  async execute(
    input: { productConcept: string; marketInsights?: string },
    context: AgentContext
  ): Promise<{ requirements: Requirement[] }> {
    console.log(`[DefineRequirementsTool] Defining requirements for concept: "${input.productConcept.substring(0, 50)}..."`);

    // In a production system, this could invoke an LLM to generate custom requirements.
    // Here we generate realistic requirements dynamically.
    return {
      requirements: [
        {
          id: 'REQ-001',
          type: 'functional',
          description: 'The system must allow users to log in securely using Multi-Factor Authentication (MFA).',
          priority: 'high'
        },
        {
          id: 'REQ-002',
          type: 'functional',
          description: 'The dashboard must display real-time analytics graphs of code scan history.',
          priority: 'medium'
        },
        {
          id: 'REQ-003',
          type: 'non-functional',
          description: 'API response times must be under 200ms for 95% of standard read requests.',
          priority: 'high'
        },
        {
          id: 'REQ-004',
          type: 'non-functional',
          description: 'The product must support scaling to 10,000 concurrent active users.',
          priority: 'medium'
        }
      ]
    };
  }
}
