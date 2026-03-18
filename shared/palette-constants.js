// Shared storage keys.
export const DEFAULT_FOLDER_KEY = 'bookmark_tab_default_folder';
export const SETTINGS_KEY = 'bookmark_tab_settings';

// Search engine base URLs used by providers.
export const GOOGLE_SEARCH_BASE_URL = 'https://www.google.com/search?udm=50';
export const GITHUB_SEARCH_BASE_URL = 'https://github.com/search?q=';
export const CHATGPT_SEARCH_BASE_URL = 'https://chatgpt.com/?prompt=';

// Extension-level settings with safe defaults.
export const defaultExtensionSettings = {
  defaultSidebarCollapsed: true,
  showGooglePanel: false,
  showRecentTab: true,
  recentFolderIds: [],
  folderOrder: [],
  bookmarkNotes: {},
  googleRecentSearches: [],
  recentSort: 'recent',
  paletteRecentQueries: [],
  customCommands: [],
  workflows: []
};

// Message contract between UI surfaces and background.
export const PALETTE_MESSAGE_TYPES = {
  TOGGLE: 'palette/toggle',
  SEARCH: 'palette/search',
  RUN_ACTION: 'palette/run-action'
};

// Chrome command ids.
export const EXTENSION_COMMANDS = {
  TOGGLE_PALETTE: 'toggle-palette'
};

// Built-in slash commands.
export const BUILTIN_COMMANDS = [
  {
    id: 'google',
    aliases: ['g'],
    title: 'Google 搜索',
    description: '使用 Google 搜索输入关键词',
    placeholder: '/google 关键词',
    argumentMode: 'text'
  },
  {
    id: 'chatgpt',
    aliases: [],
    title: 'ChatGPT 搜索',
    description: '使用 ChatGPT 搜索输入关键词',
    placeholder: '/chatgpt 关键词',
    argumentMode: 'text'
  },
  {
    id: 'github',
    aliases: ['gh'],
    title: 'GitHub 搜索',
    description: '在 GitHub 中搜索仓库、代码或议题',
    placeholder: '/github 关键词',
    argumentMode: 'text'
  },
  {
    id: 'history',
    aliases: ['his', 'h'],
    title: 'History 搜索',
    description: '在浏览历史中搜索关键词',
    placeholder: '/history 关键词',
    argumentMode: 'text'
  },
  {
    id: 'bookmarks',
    aliases: ['bookmark', 'bm', 'b'],
    title: 'Bookmarks 搜索',
    description: '在书签中搜索关键词',
    placeholder: '/bookmarks 关键词',
    argumentMode: 'text'
  },
  {
    id: 'site',
    aliases: ['open', 'url'],
    title: '打开网址',
    description: '直接打开输入的网址',
    placeholder: '/site https://example.com',
    argumentMode: 'url'
  },
  {
    id: 'workflow',
    aliases: ['wf'],
    title: '工作流',
    description: '执行预定义的工作流',
    placeholder: '/workflow 名称',
    argumentMode: 'text'
  }
];

// Built-in workflow examples.
export const DEFAULT_WORKFLOWS = [
  {
    id: 'open-release-watchlist',
    title: '打开发布关注页',
    description: '示例工作流：在新标签中打开常看的发布信息页',
    trigger: 'release',
    steps: [
      { type: 'open-url', url: 'https://github.com/releases', newTab: true },
      { type: 'open-url', url: 'https://developer.chrome.com/docs/extensions', newTab: true }
    ]
  }
];

// Unified source tags for result items.
export const PALETTE_SOURCES = {
  BOOKMARK: 'bookmark',
  HISTORY: 'history',
  TAB: 'tab',
  SEARCH_ENGINE: 'search-engine',
  COMMAND: 'command',
  WORKFLOW: 'workflow'
};
