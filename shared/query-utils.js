import {
  BUILTIN_COMMANDS,
  CHATGPT_SEARCH_BASE_URL,
  GITHUB_SEARCH_BASE_URL,
  GOOGLE_SEARCH_BASE_URL
} from './palette-constants.js';
import { buildPinyinSearchForms, isPinyinSearchSupported } from './pinyin-utils.js';

// 对用户输入做统一解析。
// 这样后面 provider 只关心“当前是什么模式”，不需要自己拆 slash command。
export function parseQueryIntent(rawQuery) {
  const raw = String(rawQuery || '');
  const trimmed = raw.trim();

  if (!trimmed) {
    return {
      raw,
      trimmed,
      mode: 'global',
      commandToken: '',
      keyword: '',
      command: null
    };
  }

  if (!trimmed.startsWith('/')) {
    return {
      raw,
      trimmed,
      mode: 'global',
      commandToken: '',
      keyword: trimmed,
      command: null
    };
  }

  const withoutSlash = trimmed.slice(1);
  const [rawCommandToken = '', ...restParts] = withoutSlash.split(/\s+/);
  const commandToken = rawCommandToken.toLowerCase();
  const keyword = restParts.join(' ').trim();
  const command = resolveCommandDefinition(commandToken);

  return {
    raw,
    trimmed,
    mode: 'command',
    commandToken,
    keyword,
    command
  };
}

// 命令解析在 command id 和 alias 之间做统一匹配。
export function resolveCommandDefinition(commandToken) {
  if (!commandToken) return null;

  return BUILTIN_COMMANDS.find((command) => {
    return command.id === commandToken || command.aliases.includes(commandToken);
  }) || null;
}

const pinyinSearchFormCache = new Map();
const PINYIN_CACHE_LIMIT = 2000;

// 搜索改成“完整关键词优先”，避免现在这种过宽的子序列匹配把无关结果也带出来。
// 同时对纯字母 query 补一层拼音和拼音首字母匹配，尽量让中文标题也能被拼音搜到。
export function createKeywordMatcher(rawQuery) {
  const normalizedQuery = normalizeText(rawQuery);
  const queryTokens = normalizedQuery.split(' ').filter(Boolean);
  const compactQuery = queryTokens.join('');
  const latinQuery = compactQuery.replace(/[^a-z]/g, '');

  return {
    rawQuery: String(rawQuery || ''),
    normalizedQuery,
    queryTokens,
    compactQuery,
    latinQuery,
    canUsePinyin: !!latinQuery && latinQuery.length === compactQuery.length
  };
}

export function getMatchScore(matcherOrQuery, rawText) {
  const matcher = typeof matcherOrQuery === 'string'
    ? createKeywordMatcher(matcherOrQuery)
    : matcherOrQuery;

  const normalizedText = normalizeText(rawText);
  if (!matcher.normalizedQuery || !normalizedText) return 0;

  const directTextScore = getDirectTextMatchScore(matcher, normalizedText);
  const pinyinScore = getPinyinMatchScore(matcher, rawText);
  return Math.max(directTextScore, pinyinScore);
}

export function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isLikelyUrl(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return false;
  if (/^https?:\/\//i.test(trimmed)) return true;
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+([/?#].*)?$/i.test(trimmed);
}

export function normalizeUrl(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function getHostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch (error) {
    return url || '';
  }
}

export function getDisplayUrl(url, options = {}) {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname === '/' ? '' : parsed.pathname;
    const search = options.includeSearch ? parsed.search : '';
    return `${parsed.hostname}${path}${search}`;
  } catch (error) {
    return url || '';
  }
}

export function getHistoryDedupKey(url) {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    return `${parsed.origin}${parsed.pathname}${parsed.search}`;
  } catch (error) {
    return url || '';
  }
}

export function getRecencyBonus(lastVisitTime) {
  const ageHours = Math.max(0, (Date.now() - Number(lastVisitTime || 0)) / (1000 * 60 * 60));
  if (ageHours <= 1) return 28;
  if (ageHours <= 12) return 18;
  if (ageHours <= 24) return 10;
  if (ageHours <= 24 * 7) return 4;
  return 0;
}

// “用得多、最近用过”的结果应该稍微往前，
// 但不能压过明显更准确的关键词匹配，所以这里把加权控制在中等强度。
export function getFrequencyBonus(visitCount) {
  const normalizedVisitCount = Math.max(0, Number(visitCount || 0));
  if (normalizedVisitCount <= 0) return 0;
  return Math.min(26, Math.round(Math.log2(normalizedVisitCount + 1) * 6));
}

export function getUsageBonus(usageStats, options = {}) {
  if (!usageStats) return 0;

  const recencyWeight = Number(options.recencyWeight || 1);
  const frequencyWeight = Number(options.frequencyWeight || 1);

  return Math.round(
    getRecencyBonus(usageStats.lastVisitTime) * recencyWeight
      + getFrequencyBonus(usageStats.visitCount) * frequencyWeight
  );
}

// 统一构造搜索引擎结果，Provider 就只需要传命令类型和关键词。
export function buildSearchEngineUrl(engineId, keyword) {
  const normalizedKeyword = String(keyword || '').trim();

  // ChatGPT command uses the prompt query param so the provider only needs
  // to pass the normalized keyword.
  if (engineId === 'chatgpt') {
    return `${CHATGPT_SEARCH_BASE_URL}${encodeURIComponent(normalizedKeyword)}`;
  }

  if (engineId === 'github') {
    return `${GITHUB_SEARCH_BASE_URL}${encodeURIComponent(normalizedKeyword)}`;
  }

  return normalizedKeyword
    ? `${GOOGLE_SEARCH_BASE_URL}&q=${encodeURIComponent(normalizedKeyword)}`
    : GOOGLE_SEARCH_BASE_URL;
}

function getDirectTextMatchScore(matcher, normalizedText) {
  const compactText = normalizedText.replace(/\s+/g, '');

  if (normalizedText === matcher.normalizedQuery) return 140;
  if (compactText === matcher.compactQuery) return 134;
  if (normalizedText.startsWith(matcher.normalizedQuery)) return 120;
  if (compactText.startsWith(matcher.compactQuery)) return 114;
  if (normalizedText.includes(matcher.normalizedQuery)) return 104;
  if (compactText.includes(matcher.compactQuery)) return 98;

  // 多关键词搜索时，要求每个 token 都完整出现在候选文本里，
  // 不再使用松散的字符跳跃匹配。
  if (matcher.queryTokens.length > 1 && matcher.queryTokens.every((token) => normalizedText.includes(token))) {
    return 84;
  }

  return 0;
}

function getPinyinMatchScore(matcher, rawText) {
  if (!matcher.canUsePinyin || matcher.latinQuery.length < 2 || !isPinyinSearchSupported()) {
    return 0;
  }

  const { full, initials } = getCachedPinyinForms(rawText);
  if (!full && !initials) return 0;

  if (full === matcher.latinQuery) return 132;
  if (full.startsWith(matcher.latinQuery)) return 118;
  if (full.includes(matcher.latinQuery)) return 102;
  if (initials === matcher.latinQuery) return 94;
  if (initials.startsWith(matcher.latinQuery)) return 86;
  return 0;
}

function getCachedPinyinForms(rawText) {
  const cacheKey = normalizeText(rawText);
  if (!cacheKey) {
    return {
      full: '',
      initials: ''
    };
  }

  if (pinyinSearchFormCache.has(cacheKey)) {
    return pinyinSearchFormCache.get(cacheKey);
  }

  const forms = buildPinyinSearchForms(rawText);
  pinyinSearchFormCache.set(cacheKey, forms);

  if (pinyinSearchFormCache.size > PINYIN_CACHE_LIMIT) {
    const oldestKey = pinyinSearchFormCache.keys().next().value;
    if (oldestKey) {
      pinyinSearchFormCache.delete(oldestKey);
    }
  }

  return forms;
}
