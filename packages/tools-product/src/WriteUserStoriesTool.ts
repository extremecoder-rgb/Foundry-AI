import { BaseTool, AgentContext } from '@foundry/agent-core';
import { z } from 'zod';
import { Requirement } from './DefineRequirementsTool';

export interface UserStory {
  id: string;
  story: string;
  acceptanceCriteria: string[];
}

export class WriteUserStoriesTool extends BaseTool<
  { requirements: Requirement[]; productContext?: string },
  { userStories: UserStory[] }
> {
  name = 'product_write_user_stories';
  description = 'Convert a list of functional and non-functional requirements into Agile User Stories with acceptance criteria. Pure composition — no LLM call needed.';
  namespace = 'product';
  schema = z.object({
    requirements: z.array(z.object({
      id: z.string(),
      type: z.enum(['functional', 'non-functional']),
      description: z.string(),
      priority: z.enum(['high', 'medium', 'low'])
    })),
    productContext: z.string().optional()
  });

  async execute(
    input: { requirements: Requirement[]; productContext?: string },
    context: AgentContext
  ): Promise<{ userStories: UserStory[] }> {
    const contextSnippet = input.productContext ? `, in the context of ${input.productContext}` : '';
    const userStories: UserStory[] = input.requirements.map((req, index) => {
      const id = `US-${String(index + 1).padStart(3, '0')}`;
      const persona = req.type === 'functional' ? 'an end user' : 'a system administrator';
      const desire = req.type === 'functional' ? 'to accomplish the workflow' : 'to maintain reliability and performance';
      const story = `As ${persona}${contextSnippet}, I want "${req.description}", so that I can ${desire}.`;
      const acceptanceCriteria = req.type === 'functional'
        ? [
            'The capability executes end-to-end without errors for the documented input.',
            'Validation errors return clear, actionable messages within 200ms.',
            'The change is recorded in the activity log with the user identity.'
          ]
        : [
            `Measured ${req.description.toLowerCase()} is monitored continuously.`,
            'Alerts are triggered when the SLO is violated for more than 5 minutes.',
            'Quarterly review confirms the requirement still aligns with user needs.'
          ];
      return { id, story, acceptanceCriteria };
    });
    return { userStories };
  }
}
