import { BaseTool, AgentContext } from '@foundry/agent-core';
import { z } from 'zod';
import { Requirement } from './DefineRequirementsTool';

export interface UserStory {
  id: string;
  story: string; // "As a... I want to... So that..."
  acceptanceCriteria: string[];
}

export class WriteUserStoriesTool extends BaseTool<
  { requirements: Requirement[] },
  { userStories: UserStory[] }
> {
  name = 'product_write_user_stories';
  description = 'Convert a list of functional and non-functional requirements into Agile User Stories with acceptance criteria.';
  namespace = 'product';
  // Composable schema: consumes Requirement objects
  schema = z.object({
    requirements: z.array(
      z.object({
        id: z.string(),
        type: z.enum(['functional', 'non-functional']),
        description: z.string(),
        priority: z.enum(['high', 'medium', 'low'])
      })
    ).describe('A list of structured requirements to convert into user stories.')
  });

  async execute(
    input: { requirements: Requirement[] },
    context: AgentContext
  ): Promise<{ userStories: UserStory[] }> {
    console.log(`[WriteUserStoriesTool] Writing user stories for ${input.requirements.length} requirements`);

    const userStories: UserStory[] = input.requirements.map((req, index) => {
      const id = `US-00${index + 1}`;
      let story = '';
      let acceptanceCriteria: string[] = [];

      if (req.type === 'functional') {
        story = `As an active user, I want to execute the following capability: "${req.description}", so that I can accomplish my product workflow goals.`;
        acceptanceCriteria = [
          'The capability executes successfully without errors.',
          'UI feedback is provided immediately to the user.'
        ];
      } else {
        story = `As a system administrator, I want the system to satisfy: "${req.description}", so that the platform remains stable and responsive.`;
        acceptanceCriteria = [
          'Performance metrics are monitored and recorded.',
          'Alerts are triggered if criteria are violated.'
        ];
      }

      return { id, story, acceptanceCriteria };
    });

    return { userStories };
  }
}
