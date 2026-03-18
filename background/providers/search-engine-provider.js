import { PALETTE_SOURCES } from '../../shared/palette-constants.js';
import {
  buildSearchEngineUrl,
  getHostname,
  isLikelyUrl,
  normalizeUrl
} from '../../shared/query-utils.js';

export class SearchEngineProvider {
  constructor() {
    this.id = 'search-engine-provider';
  }

  supports(intent) {
    if (intent.mode === 'global') {
      return !!intent.keyword;
    }

    return !!intent.command;
  }

  async search(intent) {
    if (intent.mode === 'command') {
      return this.searchInCommandMode(intent);
    }

    return this.searchInGlobalMode(intent);
  }

  searchInGlobalMode(intent) {
    const keyword = intent.keyword.trim();
    if (!keyword) return [];

    // 输入起来像网址时，优先给一个“直接打开”的结果。
    if (isLikelyUrl(keyword)) {
      const url = normalizeUrl(keyword);
      return [
        {
          id: `open-url:${url}`,
          source: PALETTE_SOURCES.SEARCH_ENGINE,
          title: `打开 ${getHostname(url)}`,
          subtitle: url,
          score: 92,
          usageCount: 0,
          lastUsedAt: 0,
          defaultActionId: 'open-url-current',
          actionIds: ['open-url-current', 'open-url-new-tab'],
          payload: {
            url,
            title: url
          }
        }
      ];
    }

    return [
      {
        id: `search:google:${keyword}`,
        source: PALETTE_SOURCES.SEARCH_ENGINE,
        title: `用 Google 搜索 “${keyword}”`,
        subtitle: '搜索引擎',
        score: 84,
        usageCount: 0,
        lastUsedAt: 0,
        defaultActionId: 'open-url-current',
        actionIds: ['open-url-current', 'open-url-new-tab'],
        payload: {
          // engineId lets the content UI fall back to an engine-specific icon
          // when the remote favicon host does not return an image.
          engineId: 'google',
          url: buildSearchEngineUrl('google', keyword),
          title: keyword
        }
      }
    ];
  }

  searchInCommandMode(intent) {
    if (!intent.command) return [];

    const keyword = intent.keyword.trim();

    if (intent.command.id === 'google') {
      return keyword ? [this.buildEngineItem('google', `用 Google 搜索 “${keyword}”`, keyword)] : [];
    }

    if (intent.command.id === 'chatgpt') {
      return keyword ? [this.buildEngineItem('chatgpt', `用 ChatGPT 搜索 “${keyword}”`, keyword)] : [];
    }

    if (intent.command.id === 'github') {
      return keyword ? [this.buildEngineItem('github', `在 GitHub 中搜索 “${keyword}”`, keyword)] : [];
    }

    if (intent.command.id === 'site') {
      if (!keyword || !isLikelyUrl(keyword)) return [];
      const url = normalizeUrl(keyword);
      return [
        {
          id: `site:${url}`,
          source: PALETTE_SOURCES.SEARCH_ENGINE,
          title: `打开 ${getHostname(url)}`,
          subtitle: url,
          score: 130,
          usageCount: 0,
          lastUsedAt: 0,
          defaultActionId: 'open-url-current',
          actionIds: ['open-url-current', 'open-url-new-tab'],
          payload: {
            url,
            title: url
          }
        }
      ];
    }

    return [];
  }

  buildEngineItem(engineId, title, keyword) {
    return {
      id: `engine:${engineId}:${keyword}`,
      source: PALETTE_SOURCES.SEARCH_ENGINE,
      title,
      subtitle: `/${engineId}`,
      score: 130,
      usageCount: 0,
      lastUsedAt: 0,
      defaultActionId: 'open-url-current',
      actionIds: ['open-url-current', 'open-url-new-tab'],
      payload: {
        engineId,
        url: buildSearchEngineUrl(engineId, keyword),
        title: keyword
      }
    };
  }
}
