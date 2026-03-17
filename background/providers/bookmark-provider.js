import { getBookmarkSearchItems } from '../../services/bookmark-service.js';
import { getHistoryUsageStatsMap } from '../../services/history-service.js';
import { PALETTE_SOURCES } from '../../shared/palette-constants.js';
import {
  createKeywordMatcher,
  getHistoryDedupKey,
  getHostname,
  getMatchScore,
  getUsageBonus
} from '../../shared/query-utils.js';

export class BookmarkProvider {
  constructor() {
    this.id = 'bookmark-provider';
  }

  supports(intent) {
    // Global mode: keep old behavior (requires keyword).
    // Command mode: explicitly handle /bookmarks.
    if (intent.mode === 'global') {
      return !!intent.keyword;
    }

    return intent.mode === 'command' && intent.command?.id === 'bookmarks' && !!intent.keyword;
  }

  async search(intent) {
    const keyword = intent.keyword || '';

    const [items, historyUsageStatsMap] = await Promise.all([
      getBookmarkSearchItems(),
      getHistoryUsageStatsMap()
    ]);
    const matcher = createKeywordMatcher(keyword);

    return items
      .map((bookmark) => {
        const usageStats = getBookmarkUsageStats(historyUsageStatsMap, bookmark.url);
        const titleScore = getMatchScore(matcher, bookmark.title);
        const domainScore = getMatchScore(matcher, getHostname(bookmark.url));
        const noteScore = getMatchScore(matcher, bookmark.note);
        const pathScore = getMatchScore(matcher, bookmark.folderPath.join(' / '));
        const coreScore = Math.max(titleScore * 3.2, domainScore * 2.3, noteScore * 1.6);

        // Ensure textual relevance first, then apply contextual bonus.
        if (coreScore <= 0) return null;

        const usageBonus = getUsageBonus(usageStats, {
          recencyWeight: 0.9,
          frequencyWeight: 1.2
        });
        const contextBonus = pathScore > 0 ? Math.round(pathScore * 0.35) : 0;
        const score = coreScore + contextBonus + usageBonus;

        return {
          id: `bookmark:${bookmark.id}`,
          source: PALETTE_SOURCES.BOOKMARK,
          title: bookmark.title,
          subtitle: `${bookmark.folderPath.join(' / ')} · ${getHostname(bookmark.url)}`,
          score,
          usageCount: usageStats?.visitCount || 0,
          lastUsedAt: usageStats?.lastVisitTime || 0,
          defaultActionId: 'open-url-current',
          actionIds: ['open-url-current', 'open-url-new-tab'],
          payload: {
            bookmarkId: bookmark.id,
            title: bookmark.title,
            url: bookmark.url,
            note: bookmark.note
          }
        };
      })
      .filter(Boolean);
  }
}

function getBookmarkUsageStats(historyUsageStatsMap, bookmarkUrl) {
  if (!historyUsageStatsMap || !bookmarkUrl) return null;

  const exactUrlStats = historyUsageStatsMap.exactUrlMap.get(bookmarkUrl);
  if (exactUrlStats) {
    return exactUrlStats;
  }

  return historyUsageStatsMap.dedupKeyMap.get(getHistoryDedupKey(bookmarkUrl)) || null;
}
