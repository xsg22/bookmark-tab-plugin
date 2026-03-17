import { PaletteController } from './background/palette-controller.js';
import {
  EXTENSION_COMMANDS,
  PALETTE_MESSAGE_TYPES
} from './shared/palette-constants.js';

const paletteController = new PaletteController();

// 快捷键和扩展图标点击都走同一个入口，
// 保证命令面板入口只有一套调度逻辑。
chrome.commands.onCommand.addListener((command) => {
  if (command !== EXTENSION_COMMANDS.TOGGLE_PALETTE) return;
  void togglePaletteForActiveTab();
});

chrome.action.onClicked.addListener(() => {
  void togglePaletteForActiveTab();
});

// content script 只负责 UI，真正的搜索和动作执行统一由 background 编排。
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message.type !== 'string') {
    return false;
  }

  if (message.type === PALETTE_MESSAGE_TYPES.SEARCH) {
    void handleSearchMessage(message, sender, sendResponse);
    return true;
  }

  if (message.type === PALETTE_MESSAGE_TYPES.RUN_ACTION) {
    void handleRunActionMessage(message, sender, sendResponse);
    return true;
  }

  return false;
});

async function handleSearchMessage(message, sender, sendResponse) {
  try {
    const items = await paletteController.search(message.query || '', {
      senderTabId: sender.tab?.id || null,
      senderWindowId: sender.tab?.windowId || null,
      pageContext: message.context || {}
    });

    sendResponse({ ok: true, items });
  } catch (error) {
    sendResponse({
      ok: false,
      error: error instanceof Error ? error.message : 'Search failed'
    });
  }
}

async function handleRunActionMessage(message, sender, sendResponse) {
  try {
    const result = await paletteController.runAction(message.actionId, message.item, {
      senderTabId: sender.tab?.id || null,
      senderWindowId: sender.tab?.windowId || null,
      pageContext: message.context || {}
    });

    sendResponse({ ok: true, result });
  } catch (error) {
    sendResponse({
      ok: false,
      error: error instanceof Error ? error.message : 'Action failed'
    });
  }
}

async function togglePaletteForActiveTab() {
  const activeTab = await getActiveTab();
  if (!activeTab || !activeTab.id) return;

  try {
    // 通过 activeTab + scripting 动态注入，尽量避免申请全站点常驻权限，
    // 这样对发布审核和安装提示都更友好。
    await chrome.scripting.executeScript({
      target: { tabId: activeTab.id },
      files: ['content.js']
    });

    await chrome.tabs.sendMessage(activeTab.id, {
      type: PALETTE_MESSAGE_TYPES.TOGGLE
    });
  } catch (error) {
    // 在 chrome:// 等受限页面无法注入时，先回退到扩展自己的页面，
    // 保证快捷键至少有一个稳定的落点。
    await chrome.tabs.create({
      url: chrome.runtime.getURL('newtab.html')
    });
  }
}

function getActiveTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs && tabs[0] ? tabs[0] : null);
    });
  });
}

