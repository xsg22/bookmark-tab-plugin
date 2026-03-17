import { getHistorySearchItems } from '../../services/history-service.js';
import { PALETTE_SOURCES } from '../../shared/palette-constants.js';
import {
  createKeywordMatcher,
  getDisplayUrl,
  getHostname,
  getMatchScore,
  getRecencyBonus
} from '../../shared/query-utils.js';

export class HistoryProvider {
  constructor() {
    this.id = 'history-provider';
  }

  supports(intent) {
    // Global mode: keep old behavior (requires keyword).
    // Command mode: explicitly handle /history.
    if (intent.mode === 'global') {
      return !!intent.keyword;
    }

    return intent.mode === 'command' && intent.command?.id === 'history' && !!intent.keyword;
  }

  async search(intent) {
    const keyword = intent.keyword || '';
    const items = await getHistorySearchItems();
    const matcher = createKeywordMatcher(keyword);

    return items
      .map((item) => {
        const titleScore = getMatchScore(matcher, item.title);
        const domainScore = getMatchScore(matcher, getHostname(item.url));
        const urlScore = getMatchScore(matcher, getDisplayUrl(item.url, { includeSearch: true }));
        const baseScore = Math.max(titleScore * 3, domainScore * 2.2, urlScore * 1.8);

        // History results should also pass keyword relevance first.
        if (baseScore <= 0) return null;

        const score = baseScore + getRecencyBonus(item.lastVisitTime) + Math.min(item.visitCount || 0, 40);

        return {
          id: `history:${item.id}`,
          source: PALETTE_SOURCES.HISTORY,
          title: item.title,
          subtitle: `${getDisplayUrl(item.url, { includeSearch: true })} · 访问 ${item.visitCount || 0} 次`,
          score,
          usageCount: item.visitCount || 0,
          lastUsedAt: item.lastVisitTime || 0,
          defaultActionId: 'open-url-current',
          actionIds: ['open-url-current', 'open-url-new-tab'],
          payload: {
            url: item.url,
            title: item.title,
            lastVisitTime: item.lastVisitTime
          }
        };
      })
      .filter(Boolean);
  }
}
