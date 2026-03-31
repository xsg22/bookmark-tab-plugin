import { PaletteController } from './background/palette-controller.js';
import {
  EXTENSION_COMMANDS,
  PALETTE_MESSAGE_TYPES
} from './shared/palette-constants.js';

const paletteController = new PaletteController();

// Keyboard shortcut and toolbar click share the same entry path so the
// extension keeps one clear, single-purpose interaction model.
chrome.commands.onCommand.addListener((command) => {
  if (command !== EXTENSION_COMMANDS.TOGGLE_PALETTE) return;
  void togglePaletteForActiveTab();
});

chrome.action.onClicked.addListener(() => {
  void togglePaletteForActiveTab();
});

// The content script owns the overlay UI. Background only handles search and
// action execution so every surface reuses the same behavior contract.
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
    // Use activeTab + scripting for on-demand injection so we do not need a
    // broader host permission footprint for the shortcut palette.
    await chrome.scripting.executeScript({
      target: { tabId: activeTab.id },
      files: ['content.js']
    });

    await chrome.tabs.sendMessage(activeTab.id, {
      type: PALETTE_MESSAGE_TYPES.TOGGLE
    });
  } catch (error) {
    // Keep the extension single-purpose. If Chrome blocks injection on a
    // restricted page, stop here instead of redirecting to another UI.
    console.warn('SearchDeck palette is unavailable on this page.', error);
  }
}

function getActiveTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs && tabs[0] ? tabs[0] : null);
    });
  });
}
