import { getOpenTabItems } from '../../services/tab-service.js';
import { PALETTE_SOURCES } from '../../shared/palette-constants.js';
import { createKeywordMatcher, getDisplayUrl, getHostname, getMatchScore } from '../../shared/query-utils.js';

export class TabProvider {
  constructor() {
    this.id = 'tab-provider';
  }

  supports(intent) {
    // 空输入时也返回当前打开标签页，作为命令面板默认内容。
    return intent.mode === 'global';
  }

  async search(intent) {
    const tabs = await getOpenTabItems();
    const matcher = createKeywordMatcher(intent.keyword);

    return tabs
      .map((tab) => {
        if (!matcher.normalizedQuery) {
          return {
            id: `tab:${tab.tabId}`,
            source: PALETTE_SOURCES.TAB,
            title: tab.title,
            subtitle: `${getDisplayUrl(tab.url)}${tab.active ? ' · 当前标签' : ''}`,
            score: tab.active ? 180 : tab.pinned ? 130 : 100,
            usageCount: tab.active ? 2 : tab.pinned ? 1 : 0,
            lastUsedAt: tab.active ? Date.now() : 0,
            defaultActionId: 'activate-tab',
            actionIds: ['activate-tab'],
            payload: {
              tabId: tab.tabId,
              windowId: tab.windowId,
              url: tab.url,
              title: tab.title,
              // Forward tab favicon URL to the content UI for first-choice icon rendering.
              favIconUrl: tab.favIconUrl || ''
            }
          };
        }

        const titleScore = getMatchScore(matcher, tab.title);
        const domainScore = getMatchScore(matcher, getHostname(tab.url));
        const urlScore = getMatchScore(matcher, getDisplayUrl(tab.url, { includeSearch: true }));
        const baseScore = Math.max(titleScore * 3.2, domainScore * 2.2, urlScore * 1.8);

        // 已打开标签页也要先命中关键词，当前激活标签只能作为命中后的轻微加权。
        if (baseScore <= 0) return null;

        const score = baseScore + (tab.active ? 20 : 0);

        return {
          id: `tab:${tab.tabId}`,
          source: PALETTE_SOURCES.TAB,
          title: tab.title,
          subtitle: `${getDisplayUrl(tab.url, { includeSearch: true })}${tab.active ? ' · 当前标签' : ''}`,
          score,
          usageCount: tab.active ? 2 : tab.pinned ? 1 : 0,
          lastUsedAt: tab.active ? Date.now() : 0,
          defaultActionId: 'activate-tab',
          actionIds: ['activate-tab'],
          payload: {
            tabId: tab.tabId,
            windowId: tab.windowId,
            url: tab.url,
            title: tab.title,
            // Forward tab favicon URL to the content UI for first-choice icon rendering.
            favIconUrl: tab.favIconUrl || ''
          }
        };
      })
      .filter(Boolean);
  }
}
