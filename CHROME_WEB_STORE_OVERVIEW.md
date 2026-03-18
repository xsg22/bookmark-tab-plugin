# SearchDeck - Chrome Web Store 上架资料（2026-03-18）

> 本文档用于重新提交 SearchDeck 上架材料，重点覆盖权限申请与审核备注。  
> 已按当前 `manifest.json` 同步：`bookmarks`、`history`、`storage`、`favicon`、`tabs`、`scripting`、`activeTab`。

## 1. 产品一句话（中文）

SearchDeck 把 Chrome 新标签页升级为键盘友好的效率工作台，集中管理书签、最近浏览和快速搜索入口。

## 2. Single Purpose（英文，可用于商店说明）

SearchDeck has a single purpose: help users quickly find and reopen pages from a new-tab workspace by combining bookmarks, recent history, and keyboard-driven tab actions.

## 3. Chrome Web Store 短描述（英文）

Keyboard-first new tab for bookmarks, recent history, and fast tab/page navigation.

## 4. Chrome Web Store 详细描述（英文）

SearchDeck turns Chrome's new tab into a practical workspace for fast page access.

It helps users organize bookmarks, review recent pages, run quick searches, and jump to target tabs or URLs with keyboard-friendly interactions. The extension is designed for high-frequency Chrome users who want fewer clicks and faster context switching.

Key capabilities:

- Folder-based bookmark workspace with edit/move/pin actions
- Recent history panel with time/frequency-oriented sorting
- Unified search entry for bookmarks, history, and web search
- Keyboard navigation for result selection and opening behavior
- Quick command palette for tab activation and URL actions

## 5. 权限申请（重点）

### 5.1 Manifest 权限清单（必须与代码一致）

- `bookmarks`
- `history`
- `storage`
- `favicon`
- `tabs`
- `scripting`
- `activeTab`

`host_permissions`：无  
说明：未申请 `<all_urls>`，未申请任何常驻站点权限。

### 5.2 各权限用途说明（中文，提交“权限理由”可直接参考）

| 权限 | 申请原因 | 实际使用范围 | 最小化策略 |
| --- | --- | --- | --- |
| `bookmarks` | 在新标签页展示和管理书签（读取树、编辑、移动、删除、创建）。 | 仅用于用户在页面内主动触发的书签管理功能。 | 仅访问 Chrome 书签数据，不上传到外部服务器。 |
| `history` | 展示“最近浏览”并做排序（最近访问/访问频次）。 | 仅查询近期历史数据用于页面展示。 | 查询窗口限制为最近约 180 天、最多 1000 条；结果仅在本地处理。 |
| `storage` | 保存默认分组、布局偏好、工作流和设置。 | 使用 `chrome.storage.sync` 持久化用户配置。 | 仅存储扩展配置，不采集账号密码或支付信息。 |
| `favicon` | 显示页面图标，提高列表可读性与识别效率。 | 仅用于渲染书签/历史/标签项图标。 | 只请求图标资源，不读取页面正文。 |
| `tabs` | 支持命令面板查询已打开标签页、激活目标标签页、创建新标签页。 | 仅执行用户在命令面板中触发的标签操作。 | 不做后台批量操作，不做无交互的标签跳转。 |
| `scripting` | 在用户触发快捷键或点击扩展图标时，动态注入命令面板脚本。 | 仅注入 `content.js` 以展示命令面板 UI。 | 不使用远程脚本；注入由用户动作触发。 |
| `activeTab` | 为动态注入提供当前激活标签页的临时访问能力。 | 仅在用户触发扩展后对当前活动页生效。 | 不申请常驻 host 权限，依赖临时授权模型。 |

### 5.3 Permission Justification（英文，可粘贴到审核说明）

- `bookmarks`: Required to read and manage bookmarks in the new-tab workspace (load tree, create, update, move, remove).
- `history`: Required to show recent browsing entries and sort them by recency/frequency for quick revisit.
- `storage`: Required to persist user settings (default folder, layout preferences, workflows) via `chrome.storage.sync`.
- `favicon`: Required to render page icons for bookmark/history/tab items and improve recognition.
- `tabs`: Required for command-palette tab features (query open tabs, activate a tab, create a tab, update current tab URL).
- `scripting`: Required to inject the command-palette content script on demand after explicit user action.
- `activeTab`: Required to grant temporary access to the active tab for user-triggered script injection without broad host permissions.

No host permissions are requested. No remote code execution is used.

## 6. 审核备注（Notes to reviewer，可直接粘贴英文）

SearchDeck is a new-tab replacement extension focused on bookmark/history productivity.

The extension requests only feature-required permissions declared in manifest:
`bookmarks`, `history`, `storage`, `favicon`, `tabs`, `scripting`, `activeTab`.

`content.js` is injected only after explicit user action (toolbar click or keyboard command), using `activeTab` + `scripting`.  
The extension does not request persistent host permissions and does not use remote hosted code.

Browsing data is processed locally for UI rendering and ranking. We do not sell user data and do not transfer personal browsing data to third parties.

## 7. 隐私实践填写建议（提交前核对）

- 数据用途：仅用于扩展核心功能（书签管理、历史展示、标签导航、设置保存）。
- 数据处理位置：以本地处理为主，设置通过 `chrome.storage.sync` 在用户 Chrome 账户内同步。
- 第三方共享：不出售、不用于广告画像、不开启第三方数据交易。
- 推荐在隐私问卷中明确：
  - 使用浏览历史数据（`history`）用于“recent history”功能；
  - 使用当前标签页上下文（标题/URL/选中文本）仅用于命令面板即时交互，不做长期存储。

## 8. 提交前自检清单

- [ ] 商店文案中的权限列表与 `manifest.json` 完全一致
- [ ] 审核备注已明确“无 host permissions、无远程代码”
- [ ] 权限理由均与可见功能一一对应（可在 UI 中复现）
- [ ] 隐私问卷勾选项与实际行为一致（尤其 `history` / `tabs` / `activeTab`）
- [ ] 若后续移除命令面板注入能力，同步评估是否可删除 `scripting`/`activeTab`
