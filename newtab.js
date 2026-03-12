const DEFAULT_FOLDER_KEY = 'bookmark_tab_default_folder';
const SETTINGS_KEY = 'bookmark_tab_settings';
const GOOGLE_SEARCH_BASE_URL = 'https://www.google.com/search?udm=50';
const MAX_RECENT_HISTORY = 200;
const DEFAULT_RECENT_VISIBLE_COUNT = 20;
const MAX_GOOGLE_RECENT_SEARCHES = 6;

// 默认配置集中在一起，方便后续扩展更多工作台选项。
const defaultSettings = {
  defaultSidebarCollapsed: true,
  showGooglePanel: false,
  showRecentTab: true,
  densityMode: 'comfortable',
  recentFolderIds: [],
  folderOrder: [],
  pinnedBookmarkIdsByFolder: {},
  bookmarkNotes: {},
  googleRecentSearches: [],
  recentSort: 'recent'
};

const googlePromptSuggestions = [
  '帮我比较一下最近 3 个版本的 Chrome 扩展能力变化',
  '总结一下这个技术方案的关键风险',
  '给我一个适合今天推进的排查思路'
];

const state = {
  allFolders: [],
  allEditableFolders: [],
  foldersById: new Map(),
  bookmarkBarFolderId: null,
  currentFolderId: null,
  defaultFolderId: null,
  settings: { ...defaultSettings },
  sidebarCollapsed: true,
  currentView: 'bookmarks',
  historyItems: [],
  recentVisibleCount: DEFAULT_RECENT_VISIBLE_COUNT,
  searchResults: [],
  activeSearchIndex: -1,
  dragFolderId: null,
  pendingDeleteBookmarkId: null,
  keyboardScope: 'tabs',
  keyboardTabIndex: 0,
  keyboardRecentSortIndex: 0,
  keyboardContentIndex: 0
};

// 顶部与通用 DOM。
const bodyEl = document.body;
bodyEl.tabIndex = -1;
const toggleSidebarBtn = document.getElementById('toggle-sidebar-btn');
const settingsBtn = document.getElementById('settings-btn');
const toastEl = document.getElementById('toast');

// 搜索区域 DOM。
const searchShellEl = document.getElementById('search-shell');
const globalSearchInputEl = document.getElementById('global-search-input');
const clearSearchBtnEl = document.getElementById('clear-search-btn');
const searchResultsPanelEl = document.getElementById('search-results-panel');

// 左侧导航 DOM。
const quickFolderListEl = document.getElementById('quick-folder-list');
const folderListEl = document.getElementById('folder-list');

// 主内容 DOM。
const currentFolderTitleEl = document.getElementById('current-folder-title');
const contentSubtitleEl = document.getElementById('content-subtitle');
const defaultFolderBadgeEl = document.getElementById('default-folder-badge');
const renameFolderBtn = document.getElementById('rename-folder-btn');
const setDefaultBtn = document.getElementById('set-default-btn');
const tabBookmarksBtn = document.getElementById('tab-bookmarks-btn');
const tabRecentBtn = document.getElementById('tab-recent-btn');
const bookmarksViewEl = document.getElementById('bookmarks-view');
const recentViewEl = document.getElementById('recent-view');
const densityModeIndicatorEl = document.getElementById('density-mode-indicator');
const bookmarkGridEl = document.getElementById('bookmark-grid');
const recentListEl = document.getElementById('recent-list');
const recentSortRecentBtn = document.getElementById('recent-sort-recent-btn');
const recentSortFrequencyBtn = document.getElementById('recent-sort-frequency-btn');
const recentLoadMoreBtn = document.getElementById('recent-load-more-btn');

// 右侧 Google Agent DOM。
const googlePanelEl = document.getElementById('google-panel');
const googleAgentFormEl = document.getElementById('google-agent-form');
const googleAgentInputEl = document.getElementById('google-agent-input');
const googleAgentNewTabBtn = document.getElementById('google-agent-new-tab-btn');
const googleRecentSearchesEl = document.getElementById('google-recent-searches');
const googlePromptListEl = document.getElementById('google-prompt-list');

// 设置弹窗 DOM。
const settingsModalEl = document.getElementById('settings-modal');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const settingDefaultCollapseEl = document.getElementById('setting-default-collapse');
const settingShowGoogleEl = document.getElementById('setting-show-google');
const settingShowRecentTabEl = document.getElementById('setting-show-recent-tab');
const settingDensityComfortableEl = document.getElementById('setting-density-comfortable');
const settingDensityCompactEl = document.getElementById('setting-density-compact');

// 书签编辑弹窗 DOM。
const bookmarkEditModalEl = document.getElementById('bookmark-edit-modal');
const closeBookmarkEditBtnEl = document.getElementById('close-bookmark-edit-btn');
const bookmarkEditFormEl = document.getElementById('bookmark-edit-form');
const bookmarkEditNameEl = document.getElementById('bookmark-edit-name');
const bookmarkEditUrlEl = document.getElementById('bookmark-edit-url');
const bookmarkEditFolderEl = document.getElementById('bookmark-edit-folder');
const bookmarkEditNoteEl = document.getElementById('bookmark-edit-note');
const bookmarkEditCancelBtnEl = document.getElementById('bookmark-edit-cancel-btn');

let lastModalTriggerEl = null;

// 常用 SVG 图标用模板字符串复用，避免重复拼装。
const folderSvg = `
  <svg class="folder-item__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
  </svg>
`;

const dragSvg = `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="9" cy="6" r="1"></circle>
    <circle cx="9" cy="12" r="1"></circle>
    <circle cx="9" cy="18" r="1"></circle>
    <circle cx="15" cy="6" r="1"></circle>
    <circle cx="15" cy="12" r="1"></circle>
    <circle cx="15" cy="18" r="1"></circle>
  </svg>
`;

const pinSvg = `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M12 17v4"></path>
    <path d="M8 3h8l-1 5 3 3v2H6v-2l3-3-1-5z"></path>
  </svg>
`;

const newTabSvg = `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
    <polyline points="15 3 21 3 21 9"></polyline>
    <line x1="10" y1="14" x2="21" y2="3"></line>
  </svg>
`;

const editSvg = `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M12 20h9"></path>
    <path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"></path>
  </svg>
`;

const deleteSvg = `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
    <path d="M10 11v6"></path>
    <path d="M14 11v6"></path>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
  </svg>
`;

const searchSvg = `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="11" cy="11" r="7"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
`;

const historySvg = `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="1 4 1 10 7 10"></polyline>
    <path d="M3.51 15a9 9 0 1 0 .49-9.36L1 10"></path>
    <polyline points="12 7 12 12 15 15"></polyline>
  </svg>
`;

async function init() {
  await Promise.all([
    loadDefaultFolder(),
    loadSettings(),
    loadBookmarkTree(),
    loadRecentHistory()
  ]);

  state.sidebarCollapsed = !!state.settings.defaultSidebarCollapsed;
  state.currentView = 'bookmarks';
  state.recentVisibleCount = DEFAULT_RECENT_VISIBLE_COUNT;

  applySettingsToUI();
  renderFolderLists();
  ensureCurrentFolder();
  renderCurrentView();
  renderGooglePanel();
  setupEventListeners();
  resetKeyboardNavigation(state.currentView);
}

function loadDefaultFolder() {
  return new Promise((resolve) => {
    chrome.storage.sync.get([DEFAULT_FOLDER_KEY], (result) => {
      state.defaultFolderId = result[DEFAULT_FOLDER_KEY] || null;
      resolve();
    });
  });
}

function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get([SETTINGS_KEY], (result) => {
      state.settings = {
        ...defaultSettings,
        ...(result[SETTINGS_KEY] || {})
      };

      // 星标分组功能已移除，读取旧配置时顺手清掉历史字段。
      delete state.settings.starredFolderIds;
      resolve();
    });
  });
}

function persistSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ [SETTINGS_KEY]: state.settings }, () => resolve());
  });
}

function saveDefaultFolder(folderId) {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ [DEFAULT_FOLDER_KEY]: folderId }, () => {
      state.defaultFolderId = folderId;
      resolve();
    });
  });
}

// 加载书签树，并提取“直接含书签”的文件夹作为导航节点。
function loadBookmarkTree() {
  return new Promise((resolve) => {
    chrome.bookmarks.getTree((nodes) => {
      state.allFolders = [];
      state.allEditableFolders = [];
      state.foldersById = new Map();

      const rootNode = nodes[0];
      state.bookmarkBarFolderId = rootNode.children && rootNode.children[0] ? rootNode.children[0].id : null;

      walkBookmarkTree(rootNode, []);
      normalizeFolderOrder();
      cleanupInvalidSettingReferences();
      resolve();
    });
  });
}

function walkBookmarkTree(node, path) {
  if (!node.children) return;

  const nextPath = node.title ? [...path, node.title] : [...path];
  const directBookmarks = node.children.filter((child) => child.url);

  if (node.title) {
    state.allEditableFolders.push({
      id: node.id,
      title: node.title,
      path: nextPath
    });
  }

  if (directBookmarks.length > 0 && node.title) {
    const folder = {
      id: node.id,
      title: node.title,
      path: nextPath,
      children: directBookmarks.map((bookmark) => ({
        id: bookmark.id,
        title: bookmark.title || '未命名书签',
        url: bookmark.url,
        parentId: node.id
      }))
    };

    state.allFolders.push(folder);
    state.foldersById.set(folder.id, folder);
  }

  node.children.forEach((child) => walkBookmarkTree(child, nextPath));
}

function normalizeFolderOrder() {
  const currentIds = state.allFolders.map((folder) => folder.id);
  const ordered = state.settings.folderOrder.filter((id) => currentIds.includes(id));
  const missing = currentIds.filter((id) => !ordered.includes(id));
  state.settings.folderOrder = [...ordered, ...missing];
}

function cleanupInvalidSettingReferences() {
  const validFolderIds = new Set(state.allFolders.map((folder) => folder.id));

  state.settings.recentFolderIds = state.settings.recentFolderIds.filter((id) => validFolderIds.has(id));

  Object.keys(state.settings.pinnedBookmarkIdsByFolder).forEach((folderId) => {
    if (!validFolderIds.has(folderId)) {
      delete state.settings.pinnedBookmarkIdsByFolder[folderId];
    }
  });
}

function ensureCurrentFolder() {
  if (state.currentFolderId && state.foldersById.has(state.currentFolderId)) {
    updateCurrentFolderIndicators();
    return;
  }

  if (state.defaultFolderId && state.foldersById.has(state.defaultFolderId)) {
    selectFolder(state.defaultFolderId, false);
    return;
  }

  if (state.allFolders.length > 0) {
    selectFolder(getOrderedFolders()[0].id, false);
    return;
  }

  state.currentFolderId = null;
  updateCurrentFolderIndicators();
}

// 使用 history API 读取最近流量，按 URL 聚合并保留访问次数与最近时间。
function loadRecentHistory() {
  return new Promise((resolve) => {
    if (!chrome.history || !chrome.history.search) {
      state.historyItems = [];
      resolve();
      return;
    }

    chrome.history.search(
      {
        text: '',
        maxResults: MAX_RECENT_HISTORY,
        startTime: Date.now() - 1000 * 60 * 60 * 24 * 30
      },
      (items) => {
        if (chrome.runtime.lastError) {
          state.historyItems = [];
          resolve();
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
                dedupKey: key,
                url: item.url,
                title: item.title || getHostname(item.url),
                visitCount: item.visitCount || 0,
                lastVisitTime: item.lastVisitTime || 0
              });
              return;
            }

            if ((item.lastVisitTime || 0) >= existing.lastVisitTime) {
              existing.url = item.url;
              existing.lastVisitTime = item.lastVisitTime || 0;
              existing.title = item.title || existing.title;
            }

            existing.visitCount = Math.max(existing.visitCount, item.visitCount || 0);
          });

        state.historyItems = Array.from(historyMap.values());
        resolve();
      }
    );
  });
}

function setupEventListeners() {
  toggleSidebarBtn.addEventListener('click', () => {
    state.sidebarCollapsed = !state.sidebarCollapsed;
    applySidebarState();
  });

  settingsBtn.addEventListener('click', openSettingsModal);
  closeSettingsBtn.addEventListener('click', closeSettingsModal);

  settingsModalEl.addEventListener('click', (event) => {
    if (event.target === settingsModalEl) {
      closeSettingsModal();
    }
  });

  closeBookmarkEditBtnEl.addEventListener('click', closeBookmarkEditModal);
  bookmarkEditCancelBtnEl.addEventListener('click', closeBookmarkEditModal);
  bookmarkEditFormEl.addEventListener('submit', handleBookmarkEditSubmit);
  bookmarkEditModalEl.addEventListener('click', (event) => {
    if (event.target === bookmarkEditModalEl) {
      closeBookmarkEditModal();
    }
  });

  settingDefaultCollapseEl.addEventListener('change', async () => {
    state.settings.defaultSidebarCollapsed = settingDefaultCollapseEl.checked;
    state.sidebarCollapsed = state.settings.defaultSidebarCollapsed;
    applySidebarState();
    await persistSettings();
    showToast('已保存默认折叠配置');
  });

  settingShowGoogleEl.addEventListener('change', async () => {
    state.settings.showGooglePanel = settingShowGoogleEl.checked;
    applySettingsToUI();
    await persistSettings();
    showToast('已更新 Google 面板显示状态');
  });

  settingShowRecentTabEl.addEventListener('change', async () => {
    state.settings.showRecentTab = settingShowRecentTabEl.checked;
    applySettingsToUI();
    await persistSettings();
    showToast('已更新最近浏览 Tab 设置');
  });

  settingDensityComfortableEl.addEventListener('change', async () => {
    if (!settingDensityComfortableEl.checked) return;
    state.settings.densityMode = 'comfortable';
    applyDensityMode();
    await persistSettings();
    showToast('已切换为舒适模式');
  });

  settingDensityCompactEl.addEventListener('change', async () => {
    if (!settingDensityCompactEl.checked) return;
    state.settings.densityMode = 'compact';
    applyDensityMode();
    await persistSettings();
    showToast('已切换为紧凑模式');
  });

  tabBookmarksBtn.addEventListener('click', () => switchView('bookmarks'));
  tabRecentBtn.addEventListener('click', () => switchView('recent'));

  recentSortRecentBtn.addEventListener('click', () => changeRecentSort('recent'));
  recentSortFrequencyBtn.addEventListener('click', () => changeRecentSort('frequency'));
  recentLoadMoreBtn.addEventListener('click', () => {
    state.recentVisibleCount += DEFAULT_RECENT_VISIBLE_COUNT;
    renderRecentList();
  });

  renameFolderBtn.addEventListener('click', () => {
    if (!state.currentFolderId) return;
    const currentFolder = state.foldersById.get(state.currentFolderId);
    if (!currentFolder) return;
    promptRenameCurrentFolder(currentFolder);
  });

  setDefaultBtn.addEventListener('click', async () => {
    if (!state.currentFolderId) return;

    if (state.currentFolderId === state.defaultFolderId) {
      showToast('当前分组已经是默认分组');
      return;
    }

    await saveDefaultFolder(state.currentFolderId);
    renderFolderLists();
    updateCurrentFolderIndicators();
    showToast('已设为默认分组');
  });

  // 顶部搜索：实时检索本地数据，并保持纯键盘可操作。
  globalSearchInputEl.addEventListener('input', () => {
    updateSearchResults(globalSearchInputEl.value);
  });

  globalSearchInputEl.addEventListener('keydown', handleSearchInputKeydown);

  clearSearchBtnEl.addEventListener('click', () => {
    globalSearchInputEl.value = '';
    updateSearchResults('');
    globalSearchInputEl.focus();
  });

  searchResultsPanelEl.addEventListener('mousemove', (event) => {
    const item = event.target.closest('[data-result-index]');
    if (!item) return;
    setActiveSearchIndex(Number(item.dataset.resultIndex));
  });

  searchResultsPanelEl.addEventListener('click', (event) => {
    const item = event.target.closest('[data-result-index]');
    if (!item) return;
    const index = Number(item.dataset.resultIndex);
    const result = state.searchResults[index];
    if (!result) return;
    void openSearchResult(result, false);
  });

  // Google Agent 面板输入，和顶部搜索共享统一的 Google 搜索地址。
  googleAgentFormEl.addEventListener('submit', (event) => {
    event.preventDefault();
    void triggerGoogleAgentSearch(false);
  });

  googleAgentInputEl.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && event.ctrlKey) {
      event.preventDefault();
      void triggerGoogleAgentSearch(true);
    }
  });

  googleAgentNewTabBtn.addEventListener('click', () => {
    void triggerGoogleAgentSearch(true);
  });

  // 书签卡片和最近流量按钮都使用事件代理，减少重复绑定。
  bookmarkGridEl.addEventListener('click', handleBookmarkGridClick);
  recentListEl.addEventListener('click', handleRecentListClick);

  // 左侧分组列表支持点击、拖拽排序。
  quickFolderListEl.addEventListener('click', handleFolderListClick);
  folderListEl.addEventListener('click', handleFolderListClick);
  folderListEl.addEventListener('dragstart', handleFolderDragStart);
  folderListEl.addEventListener('dragover', handleFolderDragOver);
  folderListEl.addEventListener('dragleave', handleFolderDragLeave);
  folderListEl.addEventListener('drop', handleFolderDrop);
  folderListEl.addEventListener('dragend', handleFolderDragEnd);

  // 页面级快捷键：支持直接输入搜索和 / 聚焦。
  document.addEventListener('keydown', handleDocumentKeydown);
  document.addEventListener('click', handleDocumentClick);
}

function applySettingsToUI() {
  applySidebarState();
  applyDensityMode();

  bodyEl.classList.toggle('hide-google-panel', !state.settings.showGooglePanel);
  googlePanelEl.classList.toggle('hidden', !state.settings.showGooglePanel);

  tabRecentBtn.classList.toggle('hidden', !state.settings.showRecentTab);
  if (!state.settings.showRecentTab && state.currentView === 'recent') {
    switchView('bookmarks');
  }

  settingDefaultCollapseEl.checked = !!state.settings.defaultSidebarCollapsed;
  settingShowGoogleEl.checked = !!state.settings.showGooglePanel;
  settingShowRecentTabEl.checked = !!state.settings.showRecentTab;
  settingDensityComfortableEl.checked = state.settings.densityMode === 'comfortable';
  settingDensityCompactEl.checked = state.settings.densityMode === 'compact';
}

function applySidebarState() {
  bodyEl.classList.toggle('sidebar-collapsed', state.sidebarCollapsed);
  toggleSidebarBtn.title = state.sidebarCollapsed ? '展开分组栏' : '折叠分组栏';
  toggleSidebarBtn.setAttribute('aria-label', toggleSidebarBtn.title);
}

function applyDensityMode() {
  bodyEl.classList.toggle('density-compact', state.settings.densityMode === 'compact');
  densityModeIndicatorEl.textContent = state.settings.densityMode === 'compact' ? '紧凑模式' : '舒适模式';
}

function openSettingsModal() {
  applySettingsToUI();
  lastModalTriggerEl = document.activeElement instanceof HTMLElement ? document.activeElement : settingsBtn;
  settingsModalEl.inert = false;
  settingsModalEl.classList.remove('hidden');
  requestAnimationFrame(() => {
    closeSettingsBtn.focus();
  });
}

function closeSettingsModal() {
  const focusedEl = document.activeElement;
  const fallbackFocusEl = lastModalTriggerEl instanceof HTMLElement ? lastModalTriggerEl : settingsBtn;
  if (focusedEl && settingsModalEl.contains(focusedEl)) {
    focusedEl.blur();
    fallbackFocusEl.focus();
  }

  requestAnimationFrame(() => {
    settingsModalEl.inert = true;
    settingsModalEl.classList.add('hidden');
  });
}

function openBookmarkEditModal(bookmark) {
  if (!bookmark) return;

  lastModalTriggerEl = document.activeElement instanceof HTMLElement ? document.activeElement : globalSearchInputEl;

  // 编辑弹窗除了标题、地址，也支持直接切换目标分组和备注。
  bookmarkEditFormEl.dataset.bookmarkId = bookmark.id;
  bookmarkEditNameEl.value = bookmark.title || '';
  bookmarkEditUrlEl.value = bookmark.url || '';
  bookmarkEditNoteEl.value = (state.settings.bookmarkNotes || {})[bookmark.id] || '';
  renderBookmarkFolderOptions(bookmark.parentId);

  bookmarkEditModalEl.inert = false;
  bookmarkEditModalEl.classList.remove('hidden');

  requestAnimationFrame(() => {
    bookmarkEditNameEl.focus();
    bookmarkEditNameEl.select();
  });
}

function closeBookmarkEditModal() {
  const focusedEl = document.activeElement;
  const fallbackFocusEl = lastModalTriggerEl instanceof HTMLElement && lastModalTriggerEl.isConnected
    ? lastModalTriggerEl
    : globalSearchInputEl;

  delete bookmarkEditFormEl.dataset.bookmarkId;

  if (focusedEl && bookmarkEditModalEl.contains(focusedEl)) {
    focusedEl.blur();
  }

  requestAnimationFrame(() => {
    bookmarkEditModalEl.inert = true;
    bookmarkEditModalEl.classList.add('hidden');
    if (fallbackFocusEl instanceof HTMLElement) {
      fallbackFocusEl.focus({ preventScroll: true });
    }
  });
}

function renderBookmarkFolderOptions(selectedFolderId) {
  const options = state.allEditableFolders
    .map((folder) => {
      const label = folder.path && folder.path.length ? folder.path.join(' / ') : folder.title;
      const isSelected = folder.id === selectedFolderId ? ' selected' : '';
      return `<option value="${escapeHTML(folder.id)}"${isSelected}>${escapeHTML(label)}</option>`;
    })
    .join('');

  bookmarkEditFolderEl.innerHTML = options;
}

function getKeyboardTabs() {
  const tabs = [{ view: 'bookmarks', element: tabBookmarksBtn }];

  if (state.settings.showRecentTab && !tabRecentBtn.classList.contains('hidden')) {
    tabs.push({ view: 'recent', element: tabRecentBtn });
  }

  return tabs;
}

function getKeyboardTabIndexByView(view) {
  const tabs = getKeyboardTabs();
  const tabIndex = tabs.findIndex((tab) => tab.view === view);
  return tabIndex >= 0 ? tabIndex : 0;
}

function getKeyboardRecentSortButtons() {
  if (state.currentView !== 'recent') return [];

  return [
    { sortMode: 'recent', element: recentSortRecentBtn },
    { sortMode: 'frequency', element: recentSortFrequencyBtn }
  ];
}

function getKeyboardRecentSortIndexByMode(sortMode) {
  const buttons = getKeyboardRecentSortButtons();
  const sortIndex = buttons.findIndex((item) => item.sortMode === sortMode);
  return sortIndex >= 0 ? sortIndex : 0;
}

function getKeyboardContentItems() {
  if (state.currentView === 'recent') {
    return Array.from(recentListEl.querySelectorAll('.recent-row'));
  }

  return Array.from(bookmarkGridEl.querySelectorAll('.bookmark-card'));
}

function getBookmarkGridColumnCount() {
  const cards = Array.from(bookmarkGridEl.querySelectorAll('.bookmark-card'));
  if (cards.length <= 1) return 1;

  const firstTop = cards[0].offsetTop;
  let columns = 0;

  cards.forEach((card) => {
    if (Math.abs(card.offsetTop - firstTop) <= 4) {
      columns += 1;
    }
  });

  return Math.max(1, columns);
}

function syncKeyboardNavigationState() {
  const tabs = getKeyboardTabs();
  if (!tabs.length) return;

  state.keyboardTabIndex = Math.max(0, Math.min(state.keyboardTabIndex, tabs.length - 1));

  const recentSortButtons = getKeyboardRecentSortButtons();
  if (!recentSortButtons.length && state.keyboardScope === 'recent-sort') {
    state.keyboardScope = 'tabs';
  }
  if (recentSortButtons.length) {
    state.keyboardRecentSortIndex = Math.max(0, Math.min(state.keyboardRecentSortIndex, recentSortButtons.length - 1));
  }

  const items = getKeyboardContentItems();
  if (!items.length) {
    state.keyboardContentIndex = 0;
    if (state.keyboardScope === 'content') {
      state.keyboardScope = recentSortButtons.length ? 'recent-sort' : 'tabs';
    }
    return;
  }

  state.keyboardContentIndex = Math.max(0, Math.min(state.keyboardContentIndex, items.length - 1));
}

function renderKeyboardNavigationState() {
  syncKeyboardNavigationState();

  getKeyboardTabs().forEach((tab, index) => {
    tab.element.classList.toggle('is-keyboard-selected', state.keyboardScope === 'tabs' && index === state.keyboardTabIndex);
  });

  getKeyboardRecentSortButtons().forEach((button, index) => {
    button.element.classList.toggle('is-keyboard-selected', state.keyboardScope === 'recent-sort' && index === state.keyboardRecentSortIndex);
  });

  if (state.currentView !== 'recent') {
    recentSortRecentBtn.classList.remove('is-keyboard-selected');
    recentSortFrequencyBtn.classList.remove('is-keyboard-selected');
  }

  Array.from(bookmarkGridEl.querySelectorAll('.bookmark-card')).forEach((item) => {
    item.classList.remove('is-keyboard-selected');
  });

  Array.from(recentListEl.querySelectorAll('.recent-row')).forEach((item) => {
    item.classList.remove('is-keyboard-selected');
  });

  if (state.keyboardScope !== 'content') return;

  const items = getKeyboardContentItems();
  const activeItem = items[state.keyboardContentIndex];
  if (!activeItem) return;

  activeItem.classList.add('is-keyboard-selected');
  activeItem.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

function resetKeyboardNavigation(view = state.currentView) {
  state.keyboardScope = 'tabs';
  state.keyboardTabIndex = getKeyboardTabIndexByView(view);
  state.keyboardRecentSortIndex = getKeyboardRecentSortIndexByMode(state.settings.recentSort);
  state.keyboardContentIndex = 0;
  renderKeyboardNavigationState();
}

function openKeyboardSelectedContent(openInNewTab) {
  const items = getKeyboardContentItems();
  const activeItem = items[state.keyboardContentIndex];
  if (!activeItem) return false;

  const url = activeItem.dataset.url;
  if (!url) return false;

  openUrl(url, openInNewTab);
  return true;
}

function moveKeyboardSelectionInContent(eventKey) {
  const items = getKeyboardContentItems();
  if (!items.length) return false;

  let nextIndex = state.keyboardContentIndex;

  if (state.currentView === 'recent') {
    if (eventKey === 'ArrowDown') {
      nextIndex = Math.min(items.length - 1, state.keyboardContentIndex + 1);
    } else if (eventKey === 'ArrowUp') {
      if (state.keyboardContentIndex === 0) {
        state.keyboardScope = 'recent-sort';
        renderKeyboardNavigationState();
        return true;
      }

      nextIndex = Math.max(0, state.keyboardContentIndex - 1);
    } else {
      renderKeyboardNavigationState();
      return true;
    }
  } else {
    const columnCount = getBookmarkGridColumnCount();

    if (eventKey === 'ArrowRight') {
      nextIndex = Math.min(items.length - 1, state.keyboardContentIndex + 1);
    } else if (eventKey === 'ArrowLeft') {
      nextIndex = Math.max(0, state.keyboardContentIndex - 1);
    } else if (eventKey === 'ArrowDown') {
      nextIndex = Math.min(items.length - 1, state.keyboardContentIndex + columnCount);
    } else if (eventKey === 'ArrowUp') {
      if (state.keyboardContentIndex < columnCount) {
        state.keyboardScope = 'tabs';
        renderKeyboardNavigationState();
        return true;
      }

      nextIndex = Math.max(0, state.keyboardContentIndex - columnCount);
    }
  }

  state.keyboardContentIndex = nextIndex;
  renderKeyboardNavigationState();
  return true;
}

function handlePageKeyboardNavigation(event) {
  const isNavigationKey = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter'].includes(event.key);
  if (!isNavigationKey) return false;

  const tabs = getKeyboardTabs();
  if (!tabs.length) return false;

  if (state.keyboardScope === 'tabs') {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      state.keyboardTabIndex = Math.max(0, state.keyboardTabIndex - 1);
      renderKeyboardNavigationState();
      return true;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      state.keyboardTabIndex = Math.min(tabs.length - 1, state.keyboardTabIndex + 1);
      renderKeyboardNavigationState();
      return true;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const targetTab = tabs[state.keyboardTabIndex];
      if (targetTab) {
        switchView(targetTab.view);
      }
      return true;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const targetTab = tabs[state.keyboardTabIndex];
      if (targetTab && targetTab.view !== state.currentView) {
        switchView(targetTab.view);
      }

      if (state.currentView === 'recent') {
        state.keyboardScope = 'recent-sort';
        state.keyboardRecentSortIndex = getKeyboardRecentSortIndexByMode(state.settings.recentSort);
        renderKeyboardNavigationState();
        return true;
      }

      const items = getKeyboardContentItems();
      if (!items.length) {
        renderKeyboardNavigationState();
        return true;
      }

      state.keyboardScope = 'content';
      state.keyboardContentIndex = 0;
      renderKeyboardNavigationState();
      return true;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      renderKeyboardNavigationState();
      return true;
    }
  }

  if (state.keyboardScope === 'recent-sort') {
    const sortButtons = getKeyboardRecentSortButtons();
    if (!sortButtons.length) {
      state.keyboardScope = 'tabs';
      renderKeyboardNavigationState();
      return true;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      state.keyboardRecentSortIndex = Math.max(0, state.keyboardRecentSortIndex - 1);
      renderKeyboardNavigationState();
      return true;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      state.keyboardRecentSortIndex = Math.min(sortButtons.length - 1, state.keyboardRecentSortIndex + 1);
      renderKeyboardNavigationState();
      return true;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      state.keyboardScope = 'tabs';
      renderKeyboardNavigationState();
      return true;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const items = getKeyboardContentItems();
      if (!items.length) {
        renderKeyboardNavigationState();
        return true;
      }

      state.keyboardScope = 'content';
      state.keyboardContentIndex = 0;
      renderKeyboardNavigationState();
      return true;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const targetButton = sortButtons[state.keyboardRecentSortIndex];
      if (targetButton) {
        void changeRecentSort(targetButton.sortMode);
      }
      return true;
    }
  }

  if (state.keyboardScope === 'content') {
    if (event.key === 'Enter') {
      event.preventDefault();
      return openKeyboardSelectedContent(event.ctrlKey);
    }

    if (event.key.startsWith('Arrow')) {
      event.preventDefault();
      return moveKeyboardSelectionInContent(event.key);
    }
  }

  return false;
}

function getOrderedFolders() {
  const orderIndexMap = new Map(state.settings.folderOrder.map((id, index) => [id, index]));

  return [...state.allFolders].sort((a, b) => {
    const aIndex = orderIndexMap.has(a.id) ? orderIndexMap.get(a.id) : Number.MAX_SAFE_INTEGER;
    const bIndex = orderIndexMap.has(b.id) ? orderIndexMap.get(b.id) : Number.MAX_SAFE_INTEGER;
    return aIndex - bIndex;
  });
}

// 左侧导航分两组：快捷分组（默认/最近）和全部分组。
function renderFolderLists() {
  renderQuickFolderList();
  renderAllFolderList();
}

function renderQuickFolderList() {
  quickFolderListEl.innerHTML = '';

  const quickGroups = [];
  const defaultFolder = state.defaultFolderId ? state.foldersById.get(state.defaultFolderId) : null;
  const recentFolders = state.settings.recentFolderIds
    .map((id) => state.foldersById.get(id))
    .filter(Boolean)
    .filter((folder) => !defaultFolder || folder.id !== defaultFolder.id);

  if (defaultFolder) {
    quickGroups.push({ title: '默认分组', folders: [defaultFolder] });
  }

  if (recentFolders.length) {
    quickGroups.push({ title: '最近使用', folders: recentFolders });
  }

  if (!quickGroups.length) {
    quickFolderListEl.innerHTML = `<div class="search-empty">暂无快捷分组，可先设置默认分组或打开最近使用的分组。</div>`;
    return;
  }

  quickGroups.forEach((group) => {
    const titleEl = document.createElement('div');
    titleEl.className = 'sidebar-section-header';
    titleEl.innerHTML = `<span>${group.title}</span>`;
    quickFolderListEl.appendChild(titleEl);

    group.folders.forEach((folder) => {
      quickFolderListEl.appendChild(createFolderItem(folder, false));
    });
  });
}

function renderAllFolderList() {
  folderListEl.innerHTML = '';

  getOrderedFolders().forEach((folder) => {
    folderListEl.appendChild(createFolderItem(folder, true));
  });
}

function createFolderItem(folder, allowDrag) {
  const item = document.createElement('button');
  item.type = 'button';
  item.className = `folder-item ${folder.id === state.currentFolderId ? 'is-active' : ''}`;
  item.dataset.folderId = folder.id;
  item.title = folder.title;
  item.draggable = !!allowDrag;

  const badges = [];
  if (folder.id === state.defaultFolderId) {
    badges.push('<span class="folder-item__badge default">默认</span>');
  }

  item.innerHTML = `
    ${folderSvg}
    <span class="folder-item__label">
      <span class="folder-item__name">${escapeHTML(folder.title)}</span>
      ${badges.join('')}
    </span>
    ${allowDrag ? `<span class="folder-item__drag" aria-hidden="true">${dragSvg}</span>` : '<span></span>'}
  `;

  return item;
}

async function selectFolder(folderId, persistRecent = true) {
  if (!state.foldersById.has(folderId)) return;

  state.currentFolderId = folderId;
  state.pendingDeleteBookmarkId = null;
  renderFolderLists();
  updateCurrentFolderIndicators();
  renderBookmarksView();

  if (persistRecent) {
    state.settings.recentFolderIds = [folderId, ...state.settings.recentFolderIds.filter((id) => id !== folderId)].slice(0, 6);
    await persistSettings();
    renderQuickFolderList();
  }
}

function updateCurrentFolderIndicators() {
  const folder = state.currentFolderId ? state.foldersById.get(state.currentFolderId) : null;
  const bookmarkCount = folder ? folder.children.length : 0;
  const isDefault = !!folder && folder.id === state.defaultFolderId;

  renderContentHeader(folder, bookmarkCount, isDefault);
}

function renderCurrentView() {
  updateCurrentFolderIndicators();
  switchView(state.currentView, false);
}

function switchView(view, shouldUpdateButtons = true) {
  if (view === 'recent' && !state.settings.showRecentTab) {
    view = 'bookmarks';
  }

  const previousView = state.currentView;
  state.currentView = view;
  state.keyboardTabIndex = getKeyboardTabIndexByView(view);
  if (previousView !== view) {
    state.keyboardContentIndex = 0;
  }

  if (view !== 'bookmarks') {
    state.pendingDeleteBookmarkId = null;
  }

  const isBookmarks = view === 'bookmarks';
  tabBookmarksBtn.classList.toggle('is-active', isBookmarks);
  tabRecentBtn.classList.toggle('is-active', !isBookmarks);
  bookmarksViewEl.classList.toggle('hidden', !isBookmarks);
  recentViewEl.classList.toggle('hidden', isBookmarks);
  updateCurrentFolderIndicators();

  if (shouldUpdateButtons !== false) {
    if (isBookmarks) {
      renderBookmarksView();
    } else {
      renderRecentList();
    }
  }

  renderKeyboardNavigationState();
}

function renderContentHeader(folder, bookmarkCount, isDefault) {
  const isBookmarksView = state.currentView === 'bookmarks';

  if (isBookmarksView) {
    currentFolderTitleEl.textContent = folder ? folder.title : '书签';
    contentSubtitleEl.textContent = folder
      ? `当前分组包含 ${bookmarkCount} 个书签，可继续通过快捷搜索直达或在右侧发起 Google Agent 搜索。`
      : '当前没有可展示的书签分组。';

    defaultFolderBadgeEl.classList.toggle('hidden', !isDefault);
    setDefaultBtn.classList.toggle('is-active', isDefault);
    renameFolderBtn.classList.remove('hidden');
    setDefaultBtn.classList.remove('hidden');
    return;
  }

  currentFolderTitleEl.textContent = '最近浏览';
  contentSubtitleEl.textContent = folder
    ? `回到刚刚看过的页面，并可一键加入当前分组「${folder.title}」。`
    : '回到刚刚看过的页面，并可一键沉淀为书签。';

  defaultFolderBadgeEl.classList.add('hidden');
  renameFolderBtn.classList.add('hidden');
  setDefaultBtn.classList.add('hidden');
}

function renderBookmarksView() {
  const folder = state.currentFolderId ? state.foldersById.get(state.currentFolderId) : null;
  bookmarkGridEl.innerHTML = '';

  if (!folder || !folder.children.length) {
    renderBookmarkEmptyState();
    return;
  }

  const pinnedIds = new Set(getPinnedBookmarkIds(folder.id));
  const notes = state.settings.bookmarkNotes || {};
  const bookmarks = [...folder.children].sort((a, b) => {
    const aPinned = pinnedIds.has(a.id) ? 1 : 0;
    const bPinned = pinnedIds.has(b.id) ? 1 : 0;
    if (aPinned !== bPinned) return bPinned - aPinned;
    return a.title.localeCompare(b.title, 'zh-CN');
  });

  bookmarks.forEach((bookmark) => {
    const note = notes[bookmark.id] || '';
    const isPinned = pinnedIds.has(bookmark.id);
    const isDeleteConfirmOpen = state.pendingDeleteBookmarkId === bookmark.id;
    const card = document.createElement('article');
    card.className = `bookmark-card ${isPinned ? 'is-pinned' : ''} ${isDeleteConfirmOpen ? 'has-delete-confirm' : ''}`;
    card.dataset.bookmarkId = bookmark.id;
    card.dataset.url = bookmark.url;

    card.innerHTML = `
      <div class="bookmark-card-top">
        <a
          class="bookmark-card-body"
          href="${escapeHTML(bookmark.url)}"
          data-open-bookmark="true"
          data-url="${escapeHTML(bookmark.url)}"
          title="${escapeHTML(bookmark.title)}"
        >
          <div class="bookmark-icon">
            <img src="${getFaviconUrl(bookmark.url)}" alt="" loading="lazy">
          </div>
        </a>
        <div class="bookmark-actions-wrap">
          <div class="bookmark-actions">
            <button
              class="bookmark-action bookmark-action--pin ${isPinned ? 'is-active' : ''}"
              type="button"
              data-bookmark-action="pin"
              data-bookmark-id="${bookmark.id}"
              title="${isPinned ? '取消置顶' : '置顶'}"
              aria-pressed="${isPinned ? 'true' : 'false'}"
            >
              <span class="bookmark-action__icon">${pinSvg}</span>
              <span class="bookmark-action__label">${isPinned ? '已置顶' : '置顶'}</span>
            </button>
            <button class="bookmark-action" type="button" data-bookmark-action="new-tab" data-bookmark-id="${bookmark.id}" title="在新标签页打开">${newTabSvg}</button>
            <button class="bookmark-action" type="button" data-bookmark-action="edit" data-bookmark-id="${bookmark.id}" title="编辑">${editSvg}</button>
            <button class="bookmark-action ${isDeleteConfirmOpen ? 'is-danger' : ''}" type="button" data-bookmark-action="delete" data-bookmark-id="${bookmark.id}" title="删除" aria-expanded="${isDeleteConfirmOpen ? 'true' : 'false'}">${deleteSvg}</button>
          </div>
          ${isDeleteConfirmOpen ? `
            <div class="bookmark-delete-confirm" data-delete-confirm="true">
              <p class="bookmark-delete-confirm__text">确认删除这个书签？</p>
              <div class="bookmark-delete-confirm__actions">
                <button class="bookmark-delete-confirm__btn bookmark-delete-confirm__btn--ghost" type="button" data-bookmark-action="cancel-delete" data-bookmark-id="${bookmark.id}">取消</button>
                <button class="bookmark-delete-confirm__btn bookmark-delete-confirm__btn--danger" type="button" data-bookmark-action="confirm-delete" data-bookmark-id="${bookmark.id}">删除</button>
              </div>
            </div>
          ` : ''}
        </div>
      </div>
      <a
        class="bookmark-card-body bookmark-meta"
        href="${escapeHTML(bookmark.url)}"
        data-open-bookmark="true"
        data-url="${escapeHTML(bookmark.url)}"
        title="${escapeHTML(bookmark.title)}"
      >
        ${isPinned ? '<div class="bookmark-meta-badges"><span class="bookmark-pin-badge">已置顶</span></div>' : ''}
        <div class="bookmark-title">${escapeHTML(bookmark.title)}</div>
        <div class="bookmark-domain">${escapeHTML(getHostname(bookmark.url))}</div>
        ${note ? `<div class="bookmark-note">${escapeHTML(note)}</div>` : ''}
      </a>
    `;

    bookmarkGridEl.appendChild(card);
  });

  renderKeyboardNavigationState();
}

function renderBookmarkEmptyState() {
  const empty = document.createElement('div');
  empty.className = 'empty-state';
  empty.innerHTML = `
    <p>当前分组还没有书签。你可以切到最近流量把刚访问过的页面加入当前分组，或者去浏览器里添加新的书签。</p>
    <div class="empty-actions">
      <button id="empty-to-recent-btn" class="secondary-btn" type="button">查看最近流量</button>
      <button id="empty-open-bookmarks-btn" class="secondary-btn" type="button">打开书签管理页</button>
    </div>
  `;

  bookmarkGridEl.appendChild(empty);
}

function getPinnedBookmarkIds(folderId) {
  return state.settings.pinnedBookmarkIdsByFolder[folderId] || [];
}

function closePendingDeleteConfirmation() {
  if (!state.pendingDeleteBookmarkId) return;

  state.pendingDeleteBookmarkId = null;

  // 删除确认是卡片内浮层，关闭时只需要刷新书签视图即可。
  if (state.currentView === 'bookmarks') {
    renderBookmarksView();
  }
}

function renderRecentList() {
  recentListEl.innerHTML = '';
  const items = getSortedRecentItems();
  const visibleItems = items.slice(0, state.recentVisibleCount);

  recentSortRecentBtn.classList.toggle('is-active', state.settings.recentSort === 'recent');
  recentSortFrequencyBtn.classList.toggle('is-active', state.settings.recentSort === 'frequency');

  if (!visibleItems.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = '<p>还没有读取到最近流量记录，请确认扩展已经授予 history 权限。</p>';
    recentListEl.appendChild(empty);
    recentLoadMoreBtn.classList.add('hidden');
    return;
  }

  visibleItems.forEach((item) => {
    const row = document.createElement('article');
    row.className = 'recent-row';
    row.dataset.url = item.url;

    row.innerHTML = `
      <a class="recent-icon" href="${escapeHTML(item.url)}" data-recent-open="true" title="${escapeHTML(item.title)}">
        <img src="${getFaviconUrl(item.url)}" alt="" loading="lazy">
      </a>
      <div class="recent-main">
        <a class="recent-title" href="${escapeHTML(item.url)}" data-recent-open="true" title="${escapeHTML(item.title)}">${escapeHTML(item.title)}</a>
        <div class="recent-meta">
          <span>${escapeHTML(getDisplayUrl(item.url, { includeSearch: true }))}</span>
          <span>${escapeHTML(formatRelativeTime(item.lastVisitTime))}</span>
          <span>访问 ${item.visitCount} 次</span>
        </div>
      </div>
      <div class="recent-actions">
        <button class="recent-action-label" type="button" data-recent-action="add-current" data-url="${escapeHTML(item.url)}">加入当前分组</button>
        <button class="recent-action-label" type="button" data-recent-action="bookmark" data-url="${escapeHTML(item.url)}">收藏</button>
        <button class="recent-action-label" type="button" data-recent-action="new-tab" data-url="${escapeHTML(item.url)}">新标签打开</button>
      </div>
    `;

    recentListEl.appendChild(row);
  });

  recentLoadMoreBtn.classList.toggle('hidden', items.length <= state.recentVisibleCount);
  renderKeyboardNavigationState();
}

function getSortedRecentItems() {
  const items = [...state.historyItems];

  if (state.settings.recentSort === 'frequency') {
    items.sort((a, b) => {
      if (b.visitCount !== a.visitCount) return b.visitCount - a.visitCount;
      return b.lastVisitTime - a.lastVisitTime;
    });
    return items;
  }

  items.sort((a, b) => b.lastVisitTime - a.lastVisitTime);
  return items;
}

async function changeRecentSort(sortMode) {
  state.settings.recentSort = sortMode;
  state.keyboardRecentSortIndex = getKeyboardRecentSortIndexByMode(sortMode);
  state.recentVisibleCount = DEFAULT_RECENT_VISIBLE_COUNT;
  renderRecentList();
  await persistSettings();
}

function renderGooglePanel() {
  renderGoogleRecentSearches();
  renderGooglePromptList();
}

function renderGoogleRecentSearches() {
  googleRecentSearchesEl.innerHTML = '';
  const searches = state.settings.googleRecentSearches || [];

  if (!searches.length) {
    const empty = document.createElement('button');
    empty.type = 'button';
    empty.className = 'chip-btn';
    empty.textContent = '暂无历史搜索';
    empty.disabled = true;
    googleRecentSearchesEl.appendChild(empty);
    return;
  }

  searches.forEach((keyword) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip-btn';
    chip.textContent = keyword;
    chip.addEventListener('click', () => {
      googleAgentInputEl.value = keyword;
      triggerGoogleAgentSearch(false);
    });
    googleRecentSearchesEl.appendChild(chip);
  });
}

function renderGooglePromptList() {
  googlePromptListEl.innerHTML = '';

  googlePromptSuggestions.forEach((promptText) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'prompt-btn';
    chip.textContent = promptText;
    chip.addEventListener('click', () => {
      googleAgentInputEl.value = promptText;
      triggerGoogleAgentSearch(false);
    });
    googlePromptListEl.appendChild(chip);
  });
}

async function triggerGoogleAgentSearch(openInNewTab) {
  const keyword = googleAgentInputEl.value.trim();
  const url = buildGoogleSearchUrl(keyword);

  await saveGoogleRecentSearch(keyword);
  openUrl(url, openInNewTab);
}

async function saveGoogleRecentSearch(keyword) {
  const trimmed = keyword.trim();
  if (!trimmed) return;

  state.settings.googleRecentSearches = [
    trimmed,
    ...state.settings.googleRecentSearches.filter((item) => item !== trimmed)
  ].slice(0, MAX_GOOGLE_RECENT_SEARCHES);

  renderGoogleRecentSearches();
  await persistSettings();
}

function buildGoogleSearchUrl(keyword) {
  const trimmed = (keyword || '').trim();
  if (!trimmed) return GOOGLE_SEARCH_BASE_URL;
  return `${GOOGLE_SEARCH_BASE_URL}&q=${encodeURIComponent(trimmed)}`;
}

function handleFolderListClick(event) {
  const folderButton = event.target.closest('[data-folder-id]');
  if (!folderButton) return;
  selectFolder(folderButton.dataset.folderId);
}

function handleFolderDragStart(event) {
  const folderButton = event.target.closest('[data-folder-id]');
  if (!folderButton) return;

  state.dragFolderId = folderButton.dataset.folderId;
  folderButton.classList.add('is-dragging');

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', state.dragFolderId);
  }
}

function handleFolderDragOver(event) {
  event.preventDefault();
  const folderButton = event.target.closest('[data-folder-id]');
  if (!folderButton || folderButton.dataset.folderId === state.dragFolderId) return;

  clearFolderDropTargets();
  folderButton.classList.add('is-drop-target');
}

function handleFolderDragLeave(event) {
  const folderButton = event.target.closest('[data-folder-id]');
  if (!folderButton) return;
  folderButton.classList.remove('is-drop-target');
}

async function handleFolderDrop(event) {
  event.preventDefault();
  const targetButton = event.target.closest('[data-folder-id]');
  if (!targetButton || !state.dragFolderId || targetButton.dataset.folderId === state.dragFolderId) {
    clearFolderDropTargets();
    return;
  }

  const order = [...state.settings.folderOrder];
  const fromIndex = order.indexOf(state.dragFolderId);
  const toIndex = order.indexOf(targetButton.dataset.folderId);
  if (fromIndex === -1 || toIndex === -1) {
    clearFolderDropTargets();
    return;
  }

  order.splice(fromIndex, 1);
  order.splice(toIndex, 0, state.dragFolderId);
  state.settings.folderOrder = order;

  clearFolderDropTargets();
  renderAllFolderList();
  await persistSettings();
  showToast('已更新分组排序');
}

function handleFolderDragEnd() {
  state.dragFolderId = null;
  clearFolderDropTargets();
  folderListEl.querySelectorAll('.folder-item.is-dragging').forEach((item) => {
    item.classList.remove('is-dragging');
  });
}

function clearFolderDropTargets() {
  folderListEl.querySelectorAll('.folder-item.is-drop-target').forEach((item) => {
    item.classList.remove('is-drop-target');
  });
}

function handleBookmarkGridClick(event) {
  const openTarget = event.target.closest('[data-open-bookmark="true"]');
  if (openTarget) return;

  const actionBtn = event.target.closest('[data-bookmark-action]');
  if (!actionBtn) return;

  const action = actionBtn.dataset.bookmarkAction;
  const bookmarkId = actionBtn.dataset.bookmarkId;
  const folder = state.currentFolderId ? state.foldersById.get(state.currentFolderId) : null;
  const bookmark = folder ? folder.children.find((item) => item.id === bookmarkId) : null;
  if (!bookmark) return;

  const isDeleteAction = ['delete', 'cancel-delete', 'confirm-delete'].includes(action);
  if (!isDeleteAction && state.pendingDeleteBookmarkId) {
    closePendingDeleteConfirmation();
  }

  if (action === 'new-tab') {
    openUrl(bookmark.url, true);
    return;
  }

  if (action === 'pin') {
    toggleBookmarkPinned(bookmark.parentId, bookmark.id);
    return;
  }

  if (action === 'edit') {
    openBookmarkEditModal(bookmark);
    return;
  }

  if (action === 'delete') {
    state.pendingDeleteBookmarkId = state.pendingDeleteBookmarkId === bookmark.id ? null : bookmark.id;
    renderBookmarksView();
    return;
  }

  if (action === 'cancel-delete') {
    closePendingDeleteConfirmation();
    return;
  }

  if (action === 'confirm-delete') {
    deleteBookmark(bookmark);
  }
}

async function toggleBookmarkPinned(folderId, bookmarkId) {
  const pinnedIds = getPinnedBookmarkIds(folderId);
  const nextPinnedIds = pinnedIds.includes(bookmarkId)
    ? pinnedIds.filter((id) => id !== bookmarkId)
    : [bookmarkId, ...pinnedIds.filter((id) => id !== bookmarkId)];

  state.settings.pinnedBookmarkIdsByFolder[folderId] = nextPinnedIds;
  renderBookmarksView();
  await persistSettings();
  showToast(nextPinnedIds.includes(bookmarkId) ? '已置顶书签' : '已取消置顶');
}

function promptRenameCurrentFolder(folder) {
  const nextName = window.prompt('请输入新的分组名称', folder.title);
  if (nextName === null) return;

  const trimmed = nextName.trim();
  if (!trimmed || trimmed === folder.title) return;

  chrome.bookmarks.update(folder.id, { title: trimmed }, async () => {
    if (chrome.runtime.lastError) {
      showToast('重命名失败，请稍后重试');
      return;
    }

    await loadBookmarkTree();
    await selectFolder(folder.id, false);
    renderFolderLists();
    updateCurrentFolderIndicators();
    showToast('分组名称已更新');
  });
}

function findBookmarkById(bookmarkId) {
  for (const folder of state.foldersById.values()) {
    const bookmark = folder.children.find((item) => item.id === bookmarkId);
    if (bookmark) return bookmark;
  }

  return null;
}

function updateBookmarkNode(bookmarkId, changes) {
  return new Promise((resolve, reject) => {
    chrome.bookmarks.update(bookmarkId, changes, (updatedBookmark) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve(updatedBookmark);
    });
  });
}

function moveBookmarkNode(bookmarkId, parentId) {
  return new Promise((resolve, reject) => {
    chrome.bookmarks.move(bookmarkId, { parentId }, (movedBookmark) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve(movedBookmark);
    });
  });
}

async function handleBookmarkEditSubmit(event) {
  event.preventDefault();

  const bookmarkId = bookmarkEditFormEl.dataset.bookmarkId;
  const bookmark = findBookmarkById(bookmarkId);
  if (!bookmark) {
    showToast('未找到要编辑的书签');
    closeBookmarkEditModal();
    return;
  }

  const nextTitle = bookmarkEditNameEl.value.trim() || bookmark.title;
  const nextUrl = normalizeUrl(bookmarkEditUrlEl.value.trim() || bookmark.url);
  const nextFolderId = bookmarkEditFolderEl.value || bookmark.parentId;
  const nextNote = bookmarkEditNoteEl.value.trim();

  try {
    // 先更新基础字段，再根据需要移动分组，和浏览器原生编辑弹窗的保存顺序保持一致。
    await updateBookmarkNode(bookmark.id, {
      title: nextTitle,
      url: nextUrl
    });

    if (nextFolderId !== bookmark.parentId) {
      await moveBookmarkNode(bookmark.id, nextFolderId);
    }

    if (nextNote) {
      state.settings.bookmarkNotes[bookmark.id] = nextNote;
    } else {
      delete state.settings.bookmarkNotes[bookmark.id];
    }

    await persistSettings();
    await loadBookmarkTree();
    closeBookmarkEditModal();
    await selectFolder(nextFolderId, false);
    renderFolderLists();
    showToast('书签已更新');
  } catch (error) {
    showToast('书签更新失败');
  }
}

function deleteBookmark(bookmark) {
  // 使用卡片内确认浮层，不再调用系统 confirm。
  state.pendingDeleteBookmarkId = null;

  chrome.bookmarks.remove(bookmark.id, async () => {
    if (chrome.runtime.lastError) {
      showToast('删除失败，请稍后重试');
      renderBookmarksView();
      return;
    }

    delete state.settings.bookmarkNotes[bookmark.id];
    state.settings.pinnedBookmarkIdsByFolder[bookmark.parentId] = getPinnedBookmarkIds(bookmark.parentId).filter((id) => id !== bookmark.id);

    await persistSettings();
    await loadBookmarkTree();
    ensureCurrentFolder();
    renderFolderLists();
    renderBookmarksView();
    showToast('书签已删除');
  });
}

function handleRecentListClick(event) {
  const actionBtn = event.target.closest('[data-recent-action]');
  if (!actionBtn) return;

  const url = actionBtn.dataset.url;
  const historyItem = state.historyItems.find((item) => item.url === url);
  if (!historyItem) return;

  if (actionBtn.dataset.recentAction === 'new-tab') {
    openUrl(url, true);
    return;
  }

  if (actionBtn.dataset.recentAction === 'bookmark') {
    addHistoryItemToBookmarks(historyItem, state.defaultFolderId || state.bookmarkBarFolderId, '已加入书签');
    return;
  }

  if (actionBtn.dataset.recentAction === 'add-current') {
    addHistoryItemToBookmarks(historyItem, state.currentFolderId || state.defaultFolderId || state.bookmarkBarFolderId, '已加入当前分组');
  }
}

function addHistoryItemToBookmarks(item, targetFolderId, successMessage) {
  if (!targetFolderId) {
    showToast('没有可用的目标分组');
    return;
  }

  chrome.bookmarks.create(
    {
      parentId: targetFolderId,
      title: item.title || getHostname(item.url),
      url: item.url
    },
    async () => {
      if (chrome.runtime.lastError) {
        showToast('加入书签失败');
        return;
      }

      await loadBookmarkTree();
      renderFolderLists();
      if (state.currentFolderId === targetFolderId) {
        renderBookmarksView();
      }
      showToast(successMessage);
    }
  );
}

function handleSearchInputKeydown(event) {
  const hasResults = state.searchResults.length > 0;
  const hasActiveResult = state.activeSearchIndex >= 0 && state.activeSearchIndex < state.searchResults.length;

  if (event.key === 'ArrowDown' && hasResults) {
    event.preventDefault();
    if (!hasActiveResult) {
      setActiveSearchIndex(0);
      return;
    }

    setActiveSearchIndex((state.activeSearchIndex + 1) % state.searchResults.length);
    return;
  }

  if (event.key === 'ArrowUp' && hasResults) {
    event.preventDefault();
    if (!hasActiveResult) {
      setActiveSearchIndex(state.searchResults.length - 1);
      return;
    }

    setActiveSearchIndex((state.activeSearchIndex - 1 + state.searchResults.length) % state.searchResults.length);
    return;
  }

  if (event.key === 'Enter') {
    if (hasActiveResult) {
      event.preventDefault();
      const activeResult = state.searchResults[state.activeSearchIndex];
      void openSearchResult(activeResult, event.ctrlKey);
      return;
    }

    if (globalSearchInputEl.value.trim()) {
      event.preventDefault();
      void openSearchResult(buildGoogleSearchResult(globalSearchInputEl.value.trim()), event.ctrlKey);
    }
    return;
  }

  if (event.key === 'Tab' && hasActiveResult) {
    event.preventDefault();
    const activeResult = state.searchResults[state.activeSearchIndex];
    if (activeResult && activeResult.fillValue) {
      globalSearchInputEl.value = activeResult.fillValue;
      updateSearchResults(globalSearchInputEl.value);
    }
    return;
  }

  if (event.key === 'Escape') {
    event.preventDefault();
    closeSearchResults();
    globalSearchInputEl.blur();
    bodyEl.focus({ preventScroll: true });
    resetKeyboardNavigation(state.currentView);
    return;
  }

  if (event.key === 'Backspace' && !globalSearchInputEl.value) {
    closeSearchResults();
  }
}

// 页面级按键：/ 聚焦搜索框，直接输入时自动进入搜索态。
function handleDocumentKeydown(event) {
  const settingsModalOpen = !settingsModalEl.classList.contains('hidden');
  const bookmarkEditModalOpen = !bookmarkEditModalEl.classList.contains('hidden');
  const modalOpen = settingsModalOpen || bookmarkEditModalOpen;

  if (settingsModalOpen && event.key === 'Escape') {
    closeSettingsModal();
    return;
  }

  if (bookmarkEditModalOpen && event.key === 'Escape') {
    closeBookmarkEditModal();
    return;
  }

  if (event.key === 'Escape' && state.pendingDeleteBookmarkId) {
    closePendingDeleteConfirmation();
    return;
  }

  if (modalOpen) return;

  if (event.key === 'Escape') {
    event.preventDefault();
    bodyEl.focus({ preventScroll: true });
    resetKeyboardNavigation(state.currentView);
    return;
  }

  const activeTag = document.activeElement ? document.activeElement.tagName : '';
  const isEditable = ['INPUT', 'TEXTAREA'].includes(activeTag) || document.activeElement?.isContentEditable;

  if (event.key === '/' && !isEditable) {
    event.preventDefault();
    globalSearchInputEl.focus();
    globalSearchInputEl.select();
    return;
  }

  if (isEditable) return;

  if (handlePageKeyboardNavigation(event)) {
    return;
  }

  if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
    globalSearchInputEl.focus();
    globalSearchInputEl.value = event.key;
    updateSearchResults(globalSearchInputEl.value);
    event.preventDefault();
  }
}

function handleDocumentClick(event) {
  if (!searchShellEl.contains(event.target)) {
    closeSearchResults();
  }

  if (
    state.pendingDeleteBookmarkId &&
    !event.target.closest('[data-delete-confirm="true"]') &&
    !event.target.closest('[data-bookmark-action="delete"]')
  ) {
    closePendingDeleteConfirmation();
  }

  if (event.target.id === 'empty-to-recent-btn') {
    switchView('recent');
  }

  if (event.target.id === 'empty-open-bookmarks-btn') {
    openUrl('chrome://bookmarks/', true);
  }
}

function updateSearchResults(keyword) {
  const query = keyword.trim();
  clearSearchBtnEl.classList.toggle('hidden', !query);

  if (!query) {
    closeSearchResults();
    return;
  }

  state.searchResults = buildSearchResults(query);
  // 输入搜索时默认不选中任何结果，回车直接触发 Google 搜索。
  state.activeSearchIndex = -1;
  renderSearchResults();
}

// 搜索联想只展示本地结果，避免在输入阶段把 Google 搜索项混进来。
function buildSearchResults(query) {
  return [
    ...buildBookmarkSearchResults(query),
    ...buildHistorySearchResults(query)
  ]
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}

function buildBookmarkSearchResults(query) {
  const normalizedQuery = normalizeText(query);
  const results = [];

  getOrderedFolders().forEach((folder) => {
    folder.children.forEach((bookmark) => {
      const titleScore = getMatchScore(normalizedQuery, bookmark.title);
      const domainScore = getMatchScore(normalizedQuery, getHostname(bookmark.url));
      const folderScore = getMatchScore(normalizedQuery, folder.title);
      const noteScore = getMatchScore(normalizedQuery, (state.settings.bookmarkNotes || {})[bookmark.id] || '');

      const bestScore = Math.max(titleScore * 3, domainScore * 2.2, folderScore * 1.4, noteScore * 1.6);
      if (bestScore <= 0) return;

      results.push({
        key: `bookmark:${bookmark.id}`,
        type: 'bookmark',
        title: bookmark.title,
        meta: `${folder.title} · ${getHostname(bookmark.url)}`,
        url: bookmark.url,
        fillValue: bookmark.title,
        score: bestScore + (getPinnedBookmarkIds(folder.id).includes(bookmark.id) ? 18 : 0),
        icon: 'bookmark'
      });
    });
  });

  return results;
}

function buildHistorySearchResults(query) {
  const normalizedQuery = normalizeText(query);
  const results = [];
  const seenKeys = new Set();

  state.historyItems.forEach((item) => {
    const dedupKey = item.dedupKey || getHistoryDedupKey(item.url);
    if (seenKeys.has(dedupKey)) return;

    const titleScore = getMatchScore(normalizedQuery, item.title);
    const domainScore = getMatchScore(normalizedQuery, getHostname(item.url));
    const bestScore = Math.max(titleScore * 3, domainScore * 2.2);
    if (bestScore <= 0) return;

    const recencyBonus = getRecencyBonus(item.lastVisitTime);
    const frequencyBonus = Math.min(item.visitCount || 0, 50);
    seenKeys.add(dedupKey);

    results.push({
      key: `history:${dedupKey}`,
      type: 'history',
      title: item.title,
      // 最近浏览结果展示 host + path，并保留原始 query，方便一眼区分同站点的不同页面。
      meta: `${getDisplayUrl(item.url, { includeSearch: true })} · ${formatRelativeTime(item.lastVisitTime)} · ${item.visitCount || 0} 次访问`,
      url: item.url,
      fillValue: item.title || getHostname(item.url),
      score: bestScore + recencyBonus + frequencyBonus,
      icon: 'history'
    });
  });

  return results;
}

function buildGoogleSearchResult(query) {
  const keyword = query.trim();
  return {
    key: `google:${keyword}`,
    type: 'google',
    title: `使用 Google Agent 搜索：${keyword}`,
    // 搜索结果里只保留“动作 + 关键词”，不再展示完整搜索地址。
    meta: '',
    url: buildGoogleSearchUrl(keyword),
    fillValue: keyword,
    score: 800,
    icon: 'google'
  };
}

function renderSearchResults() {
  if (!state.searchResults.length) {
    searchResultsPanelEl.innerHTML = '<div class="search-empty">无本地结果，按 Enter 使用 Google 搜索。</div>';
    searchResultsPanelEl.classList.remove('hidden');
    return;
  }

  searchResultsPanelEl.innerHTML = '';
  searchResultsPanelEl.classList.remove('hidden');

  state.searchResults.forEach((result, index) => {
    const item = document.createElement('div');
    item.className = `search-result-item ${index === state.activeSearchIndex ? 'is-active' : ''}`;
    item.dataset.resultIndex = String(index);

    const metaMarkup = result.meta
      ? `<span class="search-result-meta">${escapeHTML(result.meta)}</span>`
      : '';

    item.innerHTML = `
      <span class="search-result-icon ${getResultIconClassName(result.type)}">${getResultIconMarkup(result.icon)}</span>
      <span class="search-result-main">
        <span class="search-result-title">${escapeHTML(result.title)}</span>
        ${metaMarkup}
      </span>
      <span class="search-result-badge">${getResultBadgeLabel(result.type)}</span>
    `;

    searchResultsPanelEl.appendChild(item);
  });

  scrollActiveSearchResultIntoView();
}

function getHistoryDedupKey(url) {
  try {
    const parsed = new URL(normalizeUrl(url));
    const params = new URLSearchParams(parsed.search);

    // 过滤常见追踪参数，避免“同一页面不同追踪串”在最近浏览里重复出现。
    Array.from(params.keys()).forEach((key) => {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.startsWith('utm_') ||
        ['spm', 'ref', 'from', 'source', 'trackid'].includes(lowerKey)
      ) {
        params.delete(key);
      }
    });

    const normalizedPath = parsed.pathname.replace(/\/+$/, '') || '/';
    const normalizedSearch = params.toString();
    return `${parsed.origin}${normalizedPath}${normalizedSearch ? `?${normalizedSearch}` : ''}`;
  } catch (error) {
    return url || '';
  }
}

function setActiveSearchIndex(index) {
  if (!state.searchResults.length) {
    state.activeSearchIndex = -1;
    return;
  }

  if (index < 0) {
    state.activeSearchIndex = -1;
  } else {
    state.activeSearchIndex = Math.max(0, Math.min(index, state.searchResults.length - 1));
  }

  Array.from(searchResultsPanelEl.querySelectorAll('.search-result-item')).forEach((item, itemIndex) => {
    item.classList.toggle('is-active', itemIndex === state.activeSearchIndex);
  });

  scrollActiveSearchResultIntoView();
}

function scrollActiveSearchResultIntoView() {
  const activeEl = searchResultsPanelEl.querySelector('.search-result-item.is-active');
  if (!activeEl) return;
  activeEl.scrollIntoView({ block: 'nearest' });
}

function closeSearchResults() {
  state.searchResults = [];
  state.activeSearchIndex = -1;
  searchResultsPanelEl.classList.add('hidden');
  searchResultsPanelEl.innerHTML = '';
  clearSearchBtnEl.classList.toggle('hidden', !globalSearchInputEl.value.trim());
}

async function openSearchResult(result, openInNewTab) {
  if (!result) return;

  if (result.type === 'google') {
    await saveGoogleRecentSearch(result.fillValue);
  }

  openUrl(result.url, openInNewTab);
}

function getMatchScore(normalizedQuery, rawText) {
  const text = normalizeText(rawText);
  if (!normalizedQuery || !text) return 0;

  if (text === normalizedQuery) return 220;
  if (text.startsWith(normalizedQuery)) return 170;
  if (text.includes(normalizedQuery)) return 120;

  const initials = buildInitials(rawText);
  if (initials && initials.startsWith(normalizedQuery)) return 105;
  if (isSubsequence(normalizedQuery, text)) return 70;
  return 0;
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKC')
    .replace(/\s+/g, '')
    .trim();
}

// 首字母补全主要覆盖英文词和域名场景，中文本身仍支持直接模糊匹配。
function buildInitials(value) {
  const text = String(value || '').toLowerCase();
  const tokens = text.split(/[^a-z0-9\u4e00-\u9fa5]+/).filter(Boolean);
  return tokens.map((token) => token[0]).join('');
}

function isSubsequence(query, text) {
  let qIndex = 0;
  let tIndex = 0;

  while (qIndex < query.length && tIndex < text.length) {
    if (query[qIndex] === text[tIndex]) {
      qIndex += 1;
    }
    tIndex += 1;
  }

  return qIndex === query.length;
}

function getRecencyBonus(lastVisitTime) {
  const diff = Date.now() - (lastVisitTime || 0);
  const day = 1000 * 60 * 60 * 24;
  const diffDays = diff / day;
  return Math.max(0, 40 - diffDays);
}

function normalizeUrl(value) {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function getDisplayUrl(url, options = {}) {
  const { includeSearch = false } = options;

  try {
    const parsed = new URL(normalizeUrl(url));

    // 搜索面板里优先展示“域名 + 路径”，这样比只看 host 更容易识别具体页面。
    const pathname = parsed.pathname && parsed.pathname !== '/' ? parsed.pathname : '';
    return `${parsed.hostname}${pathname}${includeSearch ? parsed.search : ''}`;
  } catch (error) {
    return url || '';
  }
}

function getResultBadgeLabel(type) {
  if (type === 'bookmark') return '书签';
  if (type === 'history') return '最近浏览';
  return 'Google';
}

function getResultIconClassName(type) {
  if (type === 'bookmark') return 'search-result-icon--bookmark';
  if (type === 'history') return 'search-result-icon--history';
  if (type === 'google') return 'search-result-icon--google';
  return '';
}

function getResultIconMarkup(icon) {
  if (icon === 'bookmark') return folderSvg;
  if (icon === 'history') return historySvg;
  return searchSvg;
}

function formatRelativeTime(time) {
  if (!time) return '未知时间';

  const diff = Date.now() - time;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return '刚刚';
  if (diff < hour) return `${Math.floor(diff / minute)} 分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`;
  if (diff < day * 30) return `${Math.floor(diff / day)} 天前`;

  const date = new Date(time);
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

function getHostname(url) {
  try {
    return new URL(url).hostname;
  } catch (error) {
    return url || '';
  }
}

function getFaviconUrl(url) {
  return `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(url)}&size=32`;
}

function openUrl(url, openInNewTab) {
  if (openInNewTab) {
    window.open(url, '_blank', 'noopener');
    return;
  }

  window.location.href = url;
}

let toastTimer = null;
function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('show');

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.classList.remove('show');
  }, 2200);
}

function escapeHTML(value) {
  const p = document.createElement('p');
  p.appendChild(document.createTextNode(String(value || '')));
  return p.innerHTML;
}

document.addEventListener('DOMContentLoaded', init);
