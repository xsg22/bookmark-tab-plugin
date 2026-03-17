import {
  DEFAULT_FOLDER_KEY,
  SETTINGS_KEY,
  DEFAULT_WORKFLOWS,
  defaultExtensionSettings
} from '../shared/palette-constants.js';

// 设置存储统一从这里读写。
// 这样新旧页面、background 和未来的 options 页都能共享同一层接口。

export function loadExtensionSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get([SETTINGS_KEY], (result) => {
      resolve({
        ...defaultExtensionSettings,
        ...(result[SETTINGS_KEY] || {})
      });
    });
  });
}

export function saveExtensionSettings(nextSettings) {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ [SETTINGS_KEY]: nextSettings }, () => resolve());
  });
}

export function loadDefaultFolderId() {
  return new Promise((resolve) => {
    chrome.storage.sync.get([DEFAULT_FOLDER_KEY], (result) => {
      resolve(result[DEFAULT_FOLDER_KEY] || null);
    });
  });
}

export function saveDefaultFolderId(folderId) {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ [DEFAULT_FOLDER_KEY]: folderId }, () => resolve());
  });
}

export async function getWorkflows() {
  const settings = await loadExtensionSettings();
  const customWorkflows = Array.isArray(settings.workflows) ? settings.workflows : [];
  return [...DEFAULT_WORKFLOWS, ...customWorkflows];
}

