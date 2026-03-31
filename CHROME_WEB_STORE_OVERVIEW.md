# SearchDeck - Chrome Web Store Submission Notes (2026-03-30)

> This document matches the current `manifest.json` and the current product scope.
> SearchDeck no longer overrides Chrome's new tab page. The extension now keeps a single purpose: shortcut search through a command palette.

## 1. One-line product summary

SearchDeck opens a keyboard-friendly shortcut search palette so users can quickly find bookmarks, tabs, history entries, and web search results.

## 2. Single purpose statement

SearchDeck has a single purpose: help users quickly search and reopen content through an on-page command palette triggered by the toolbar button or keyboard shortcut.

## 3. Chrome Web Store short description

Keyboard-first shortcut search for bookmarks, tabs, history, and web results.

## 4. Chrome Web Store detailed description

SearchDeck adds a lightweight command palette to the current page.

Users can open the palette with the extension action or the `Ctrl+Shift+F` / `Command+Shift+F` shortcut, then:

- search bookmarks
- search recent history
- jump to existing tabs
- open direct URLs
- send keywords to supported search engines

The extension does not replace Chrome's new tab page and does not change the user's default search provider.

## 5. Permissions

### 5.1 Manifest permissions

- `bookmarks`
- `history`
- `storage`
- `favicon`
- `tabs`
- `scripting`
- `activeTab`

No `host_permissions` are requested.

### 5.2 Permission justification

| Permission | Why it is needed | Real usage scope | Minimization |
| --- | --- | --- | --- |
| `bookmarks` | Search bookmark titles and URLs. | Only when the user opens the palette and searches. | Bookmark data stays local. |
| `history` | Search recent browsing history. | Only when the user opens the palette and searches. | History data stays local. |
| `storage` | Persist extension settings and workflows. | Only for SearchDeck configuration. | No account or payment data is stored. |
| `favicon` | Show item icons in search results. | Only for visual identification inside the palette. | Used only for icon rendering. |
| `tabs` | Query and activate existing tabs, or open a result. | Only for user-triggered tab actions from the palette. | No background tab automation. |
| `scripting` | Inject `content.js` after explicit user action. | Only on demand after toolbar click or keyboard command. | No remote scripts are used. |
| `activeTab` | Grant temporary access to the active tab for injection. | Only for the tab the user is interacting with. | Avoids broad site access. |

## 6. Notes to reviewer

SearchDeck is a shortcut-search extension centered on a single command palette experience.

The extension requests only the permissions required for that palette:
`bookmarks`, `history`, `storage`, `favicon`, `tabs`, `scripting`, `activeTab`.

`content.js` is injected only after explicit user action through the toolbar icon or keyboard shortcut.
The extension does not request persistent host permissions, does not override Chrome's new tab page, and does not change the default search engine.

Browsing data is processed locally for ranking and display. We do not sell user data and do not transfer personal browsing data to third parties.

## 7. Privacy form checklist

- Data is used only for the extension's shortcut search features.
- Browsing data is processed locally and settings are stored with `chrome.storage.sync`.
- No data is sold or used for advertising.
- No remote hosted code is executed.

## 8. Pre-submission checklist

- [ ] Store copy matches `manifest.json`
- [ ] Reviewer notes clearly state "no new tab override"
- [ ] Reviewer notes clearly state "no default search engine change"
- [ ] Permission reasons match visible functionality
- [ ] Privacy answers match actual runtime behavior
