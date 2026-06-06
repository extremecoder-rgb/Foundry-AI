import { DefineRequirementsTool } from '@foundry/tools-product';
import { WriteUserStoriesTool } from '@foundry/tools-product';
import { AgentContext } from '@foundry/agent-core';

describe('Composable Tool Pipeline', () => {
  it('should successfully feed functional requirements from DefineRequirementsTool into WriteUserStoriesTool', async () => {
    const context: AgentContext = {
      runId: 'test-composition-run',
      metadata: {}
    };

    const requirementsTool = new DefineRequirementsTool();
    const userStoriesTool = new WriteUserStoriesTool();

    // 1. Run first tool to define requirements
    const reqResult = await requirementsTool.execute(
      {
        productConcept: 'AI-driven code security scanner'
      },
      context
    );

    expect(reqResult.requirements).toBeDefined();
    expect(reqResult.requirements.length).toBeGreaterThan(0);

    // 2. Compose tools: pass output of requirements tool as input into user stories tool
    const storyResult = await userStoriesTool.execute(
      {
        requirements: reqResult.requirements
      },
      context
    );

    // 3. Verify composition result
    expect(storyResult.userStories).toBeDefined();
    expect(storyResult.userStories.length).toBe(reqResult.requirements.length);
    
    // Check first story mapping
    const firstStory = storyResult.userStories[0];
    expect(firstStory.story).toContain('As an active user');
    expect(firstStory.story).toContain(reqResult.requirements[0].description);
    expect(firstStory.acceptanceCriteria.length).toBeGreaterThan(0);

    console.log('[Composition Test] Successfully verified composable pipeline:');
    console.log(`- Generated ${reqResult.requirements.length} requirements.`);
    console.log(`- Translated into ${storyResult.userStories.length} Agile User Stories.`);
  });
});
