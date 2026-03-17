import { ProviderRegistry } from './registries/provider-registry.js';
import { ActionRegistry } from './registries/action-registry.js';
import { BookmarkProvider } from './providers/bookmark-provider.js';
import { HistoryProvider } from './providers/history-provider.js';
import { TabProvider } from './providers/tab-provider.js';
import { CommandProvider } from './providers/command-provider.js';
import { SearchEngineProvider } from './providers/search-engine-provider.js';
import { WorkflowProvider } from './providers/workflow-provider.js';
import {
  createActivateTabAction,
  createApplyCommandAction,
  createOpenUrlCurrentAction,
  createOpenUrlNewTabAction,
  createRunWorkflowAction
} from './actions/default-actions.js';
import { parseQueryIntent } from '../shared/query-utils.js';

export class PaletteController {
  constructor() {
    // Provider / Action 在 controller 构造时注册，
    // 后续如果要支持按 feature flag 裁剪，也只需要调整这里。
    this.providerRegistry = new ProviderRegistry([
      new CommandProvider(),
      new TabProvider(),
      new BookmarkProvider(),
      new HistoryProvider(),
      new SearchEngineProvider(),
      new WorkflowProvider()
    ]);

    this.actionRegistry = new ActionRegistry([
      createApplyCommandAction(),
      createOpenUrlCurrentAction(),
      createOpenUrlNewTabAction(),
      createActivateTabAction(),
      createRunWorkflowAction()
    ]);
  }

  async search(rawQuery, context = {}) {
    const intent = parseQueryIntent(rawQuery);
    const providers = this.providerRegistry.resolve(intent);
    const providerResults = await Promise.all(
      providers.map((provider) => provider.search(intent, context))
    );

    // 所有 provider 统一合并后按“匹配度 -> 使用频率 -> 最近使用时间”排序。
    // 这样既不会丢掉关键词精度，也能把常用结果稳定排在前面。
    return providerResults
      .flat()
      .sort(comparePaletteItems)
      .slice(0, 12);
  }

  async runAction(actionId, item, context = {}) {
    const action = this.actionRegistry.get(actionId);
    if (!action) {
      return {
        effect: 'none',
        error: `Unknown action: ${actionId}`
      };
    }

    return action.run(item, context);
  }
}

function comparePaletteItems(left, right) {
  // Keep currently opened tabs ahead of bookmark/history results so users can
  // jump to existing tabs first when the same keyword matches multiple sources.
  const tabPriorityDelta = compareTabPriority(left, right);
  if (tabPriorityDelta !== 0) return tabPriorityDelta;

  const scoreDelta = Number(right.score || 0) - Number(left.score || 0);
  if (scoreDelta !== 0) return scoreDelta;

  const usageDelta = Number(right.usageCount || 0) - Number(left.usageCount || 0);
  if (usageDelta !== 0) return usageDelta;

  const lastUsedDelta = Number(right.lastUsedAt || 0) - Number(left.lastUsedAt || 0);
  if (lastUsedDelta !== 0) return lastUsedDelta;

  return String(left.title || '').localeCompare(String(right.title || ''), 'zh-CN');
}

function compareTabPriority(left, right) {
  const leftRank = getTabPriorityRank(left);
  const rightRank = getTabPriorityRank(right);
  return rightRank - leftRank;
}

function getTabPriorityRank(item) {
  const source = item?.source;
  if (source === 'tab') return 2;
  if (source === 'bookmark' || source === 'history') return 1;
  return 0;
}
