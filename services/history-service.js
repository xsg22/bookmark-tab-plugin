import { getHistoryDedupKey } from '../shared/query-utils.js';

const MAX_HISTORY_ITEMS = 1000;
const HISTORY_LOOKBACK_MS = 1000 * 60 * 60 * 24 * 180;
const HISTORY_CACHE_TTL_MS = 30 * 1000;

let cachedHistoryItems = null;
let cachedHistoryItemsAt = 0;
let pendingHistoryItemsRequest = null;

// 浏览记录会同时给“历史搜索”和“书签使用频率加权”服务，
// 所以这里做一层轻缓存，避免用户每敲一个字都重新扫一次 history API。
export function getHistorySearchItems(options = {}) {
  if (!options.forceRefresh && hasFreshHistoryCache()) {
    return Promise.resolve(cachedHistoryItems);
  }

  if (!options.forceRefresh && pendingHistoryItemsRequest) {
    return pendingHistoryItemsRequest;
  }

  pendingHistoryItemsRequest = fetchHistorySearchItems().finally(() => {
    pendingHistoryItemsRequest = null;
  });

  return pendingHistoryItemsRequest;
}

// 给书签排序时使用的访问统计映射。
// exactUrl 和 dedupKey 都保留，既能命中完整 URL，也能兼容同一路径的等价 URL。
export async function getHistoryUsageStatsMap() {
  const items = await getHistorySearchItems();
  const exactUrlMap = new Map();
  const dedupKeyMap = new Map();

  items.forEach((item) => {
    const nextStats = {
      visitCount: item.visitCount || 0,
      lastVisitTime: item.lastVisitTime || 0
    };

    mergeUsageStats(exactUrlMap, item.url, nextStats);
    mergeUsageStats(dedupKeyMap, getHistoryDedupKey(item.url), nextStats);
  });

  return {
    exactUrlMap,
    dedupKeyMap
  };
}

function fetchHistorySearchItems() {
  return new Promise((resolve) => {
    if (!chrome.history || !chrome.history.search) {
      updateHistoryCache([]);
      resolve(cachedHistoryItems);
      return;
    }

    chrome.history.search(
      {
        text: '',
        maxResults: MAX_HISTORY_ITEMS,
        startTime: Date.now() - HISTORY_LOOKBACK_MS
      },
      (items) => {
        if (chrome.runtime.lastError) {
          updateHistoryCache([]);
          resolve(cachedHistoryItems);
          return;
        }

        const historyMap = new Map();

        items
          .filter((item) => item && item.url && /^https?:\/\//.test(item.url))
          .forEach((item) => {
            const key = getHistoryDedupKey(item.url);
            const existing = historyMap.get(key);

            if (!existing) {
              historyMap.set(key, {
                id: key,
                url: item.url,
                title: item.title || item.url,
                visitCount: item.visitCount || 0,
                lastVisitTime: item.lastVisitTime || 0
              });
              return;
            }

            if ((item.lastVisitTime || 0) >= existing.lastVisitTime) {
              existing.url = item.url;
              existing.title = item.title || existing.title;
              existing.lastVisitTime = item.lastVisitTime || existing.lastVisitTime;
            }

            existing.visitCount = Math.max(existing.visitCount, item.visitCount || 0);
          });

        updateHistoryCache(Array.from(historyMap.values()));
        resolve(cachedHistoryItems);
      }
    );
  });
}

function hasFreshHistoryCache() {
  return Array.isArray(cachedHistoryItems) && (Date.now() - cachedHistoryItemsAt) <= HISTORY_CACHE_TTL_MS;
}

function updateHistoryCache(items) {
  cachedHistoryItems = items;
  cachedHistoryItemsAt = Date.now();
}

function mergeUsageStats(targetMap, key, nextStats) {
  if (!key) return;

  const existingStats = targetMap.get(key);
  if (!existingStats) {
    targetMap.set(key, nextStats);
    return;
  }

  targetMap.set(key, {
    visitCount: Math.max(existingStats.visitCount, nextStats.visitCount),
    lastVisitTime: Math.max(existingStats.lastVisitTime, nextStats.lastVisitTime)
  });
}
