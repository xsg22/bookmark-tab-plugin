let allFolders = [];
let currentFolderId = null;
let defaultFolderId = null;

const DEFAULT_FOLDER_KEY = 'bookmark_tab_default_folder';

// DOM Elements
const folderListEl = document.getElementById('folder-list');
const bookmarkGridEl = document.getElementById('bookmark-grid');
const currentFolderTitleEl = document.getElementById('current-folder-title');
const setDefaultBtn = document.getElementById('set-default-btn');
const toastEl = document.getElementById('toast');

// SVGs
const folderSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`;

// Initialize
async function init() {
  await loadDefaultFolder();
  await loadBookmarkTree();
  setupEventListeners();
}

// Load default folder preference
function loadDefaultFolder() {
  return new Promise((resolve) => {
    chrome.storage.sync.get([DEFAULT_FOLDER_KEY], (result) => {
      if (result[DEFAULT_FOLDER_KEY]) {
        defaultFolderId = result[DEFAULT_FOLDER_KEY];
      }
      resolve();
    });
  });
}

// Save default folder preference
function saveDefaultFolder(folderId) {
  defaultFolderId = folderId;
  chrome.storage.sync.set({ [DEFAULT_FOLDER_KEY]: folderId }, () => {
    showToast('Default folder updated!');
    renderFolders(); // Update UI to show the star
    updateDefaultBtnStyle();
  });
}

// Fetch and structure bookmarks
function loadBookmarkTree() {
  return new Promise((resolve) => {
    chrome.bookmarks.getTree((bookmarkTreeNodes) => {
      allFolders = [];
      processNode(bookmarkTreeNodes[0]);
      
      if (allFolders.length > 0) {
        renderFolders();
        
        // Decide which folder to show first
        let initialFolderId = allFolders[0].id;
        
        // Check if default folder exists in our list
        if (defaultFolderId && allFolders.some(f => f.id === defaultFolderId)) {
          initialFolderId = defaultFolderId;
        }
        
        selectFolder(initialFolderId);
      } else {
        renderEmptyState('No bookmarks found. Add some bookmarks in Chrome first!');
      }
      resolve();
    });
  });
}

// Recursively find folders and their content
function processNode(node) {
  if (node.children) {
    // Only add folders that have items (either bookmarks or subfolders that might have items)
    // Actually, let's add any folder that has children and at least one direct child is a URL
    const hasBookmarks = node.children.some(child => child.url);
    if (hasBookmarks && node.title) {
       allFolders.push({
         id: node.id,
         title: node.title,
         children: node.children.filter(child => child.url) // Only keep actual bookmarks for the view
       });
    }
    
    // Continue traversing
    node.children.forEach(child => processNode(child));
  }
}

// Render the sidebar folders
function renderFolders() {
  folderListEl.innerHTML = '';
  
  allFolders.forEach(folder => {
    const el = document.createElement('div');
    el.className = `folder-item ${folder.id === currentFolderId ? 'active' : ''} ${folder.id === defaultFolderId ? 'default-badge' : ''}`;
    el.innerHTML = `${folderSvg} ${escapeHTML(folder.title)}`;
    el.addEventListener('click', () => selectFolder(folder.id));
    folderListEl.appendChild(el);
  });
}

// Select a folder and render its bookmarks
function selectFolder(folderId) {
  currentFolderId = folderId;
  const folder = allFolders.find(f => f.id === folderId);
  
  if (!folder) return;

  renderFolders(); // Update active state
  updateDefaultBtnStyle();
  
  currentFolderTitleEl.textContent = folder.title;
  renderBookmarks(folder.children);
}

// Render bookmarks in the grid
function renderBookmarks(bookmarks) {
  bookmarkGridEl.innerHTML = '';
  
  if (bookmarks.length === 0) {
    renderEmptyState('This folder is empty.');
    return;
  }
  
  bookmarks.forEach(bookmark => {
    let domain = '';
    try {
      const urlObj = new URL(bookmark.url);
      domain = urlObj.hostname;
    } catch (e) {
      // Handle invalid URLs just in case
    }
    
    // Using Chrome's native favicon service (requires 'favicon' permission in MV3 manifest)
    const iconUrl = `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(bookmark.url)}&size=32`;
    
    const el = document.createElement('a');
    el.className = 'bookmark-card';
    el.href = bookmark.url;
    el.innerHTML = `
      <div class="bookmark-icon">
        <img src="${iconUrl}" alt="" loading="lazy" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdib3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOTRhM2I4IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTEyIDJ2MjBNMTcgNUg5LjVhMy41IDMuNSAwIDAgMCAwIDdoNWEzLjUgMy41IDAgMCAxIDAgN0g2Ij48L3BhdGg+PC9zdmc+'">
      </div>
      <div class="bookmark-title" title="${escapeHTML(bookmark.title)}">${escapeHTML(bookmark.title)}</div>
      <div class="bookmark-url" title="${bookmark.url}">${domain}</div>
    `;
    bookmarkGridEl.appendChild(el);
  });
}

function renderEmptyState(message) {
  bookmarkGridEl.innerHTML = `
    <div class="empty-state">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
      <p>${message}</p>
    </div>
  `;
}

function updateDefaultBtnStyle() {
  if (currentFolderId === defaultFolderId) {
    setDefaultBtn.classList.add('is-default');
    setDefaultBtn.title = "This is the default folder";
    setDefaultBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;
  } else {
    setDefaultBtn.classList.remove('is-default');
    setDefaultBtn.title = "Set this folder as default";
    setDefaultBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;
  }
}

function setupEventListeners() {
  setDefaultBtn.addEventListener('click', () => {
    if (currentFolderId && currentFolderId !== defaultFolderId) {
      saveDefaultFolder(currentFolderId);
    }
  });
}

let toastTimeout;
function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toastEl.classList.remove('show');
  }, 3000);
}

// Utility to prevent XSS
function escapeHTML(str) {
  const p = document.createElement('p');
  p.appendChild(document.createTextNode(str));
  return p.innerHTML;
}

// Start
document.addEventListener('DOMContentLoaded', init);
