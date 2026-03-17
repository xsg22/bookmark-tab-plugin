import { loadExtensionSettings } from './settings-service.js';

// 把 Chrome 原生书签树拍平成命令面板更容易消费的数据结构。
// 这里不关心 UI，只返回查询需要的字段。

export async function getBookmarkSearchItems() {
  const [settings, bookmarkTree] = await Promise.all([
    loadExtensionSettings(),
    getBookmarkTree()
  ]);

  const notes = settings.bookmarkNotes || {};
  const items = [];

  walkBookmarkTree(bookmarkTree, [], (bookmark, folderPath) => {
    items.push({
      id: bookmark.id,
      title: bookmark.title || '未命名书签',
      url: bookmark.url,
      parentId: bookmark.parentId || null,
      folderPath,
      note: notes[bookmark.id] || ''
    });
  });

  return items;
}

export function createBookmarkNode(bookmarkData) {
  return new Promise((resolve, reject) => {
    chrome.bookmarks.create(bookmarkData, (createdBookmark) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve(createdBookmark);
    });
  });
}

export function updateBookmarkNode(bookmarkId, changes) {
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

export function removeBookmarkNode(bookmarkId) {
  return new Promise((resolve, reject) => {
    chrome.bookmarks.remove(bookmarkId, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve();
    });
  });
}

function getBookmarkTree() {
  return new Promise((resolve) => {
    chrome.bookmarks.getTree((nodes) => resolve(nodes[0]));
  });
}

function walkBookmarkTree(node, path, onBookmark) {
  if (!node || !node.children) return;

  const nextPath = node.title ? [...path, node.title] : path;

  node.children.forEach((child) => {
    if (child.url) {
      onBookmark(child, nextPath);
      return;
    }

    walkBookmarkTree(child, nextPath, onBookmark);
  });
}

