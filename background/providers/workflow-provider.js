import { getWorkflowItems } from '../../services/workflow-service.js';
import { PALETTE_SOURCES } from '../../shared/palette-constants.js';
import { createKeywordMatcher, getMatchScore } from '../../shared/query-utils.js';

export class WorkflowProvider {
  constructor() {
    this.id = 'workflow-provider';
  }

  supports(intent) {
    return intent.mode === 'command' && intent.command && intent.command.id === 'workflow';
  }

  async search(intent) {
    const workflows = await getWorkflowItems();
    const matcher = createKeywordMatcher(intent.keyword);

    return workflows
      .map((workflow) => {
        // /workflow 空参数时，直接列出所有工作流，作为“命令菜单”。
        const titleScore = matcher.normalizedQuery ? getMatchScore(matcher, workflow.title) : 120;
        const triggerScore = matcher.normalizedQuery ? getMatchScore(matcher, workflow.trigger) : 100;
        const descriptionScore = matcher.normalizedQuery ? getMatchScore(matcher, workflow.description) : 0;
        const score = Math.max(titleScore * 2.8, triggerScore * 2.2, descriptionScore * 1.4);

        if (score <= 0) return null;

        return {
          id: `workflow:${workflow.id}`,
          source: PALETTE_SOURCES.WORKFLOW,
          title: workflow.title,
          subtitle: workflow.description || workflow.trigger,
          score,
          usageCount: 0,
          lastUsedAt: 0,
          defaultActionId: 'run-workflow',
          actionIds: ['run-workflow'],
          payload: workflow
        };
      })
      .filter(Boolean);
  }
}
