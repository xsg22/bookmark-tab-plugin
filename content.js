(() => {
  // Guard against duplicate injections from repeated command toggles.
  if (window.__tabShelfPaletteInjected) {
    return;
  }
  window.__tabShelfPaletteInjected = true;

  const PALETTE_MESSAGE_TYPES = {
    TOGGLE: 'palette/toggle',
    SEARCH: 'palette/search',
    RUN_ACTION: 'palette/run-action'
  };

  // 命令面板的结果区固定最多展示 7 条，避免高分辨率下弹框过高。
  // 最大可见结果数，命令面板最多展示7条结果，避免弹框过高
  const MAX_VISIBLE_RESULT_COUNT = 7;

  // 命令菜单的最小宽度（像素）
  const COMMAND_MENU_MIN_WIDTH = 148;
  // 命令菜单的最大宽度（像素）
  const COMMAND_MENU_MAX_WIDTH = 160;

  // 命令菜单的最大高度（像素），对应约7条结果
  const COMMAND_MENU_MAX_HEIGHT = 312;
  // 命令菜单的最小高度（像素）
  const COMMAND_MENU_MIN_HEIGHT = 100;

  // 命令菜单与窗口边缘的间距（像素）
  const COMMAND_MENU_EDGE_GAP = 8;
  // 命令菜单相对于触发按钮的间距（像素）
  const COMMAND_MENU_TRIGGER_GAP = 4;

  class PaletteOverlay {
    constructor() {
      this.isOpen = false;
      this.items = [];
      this.resultButtonEls = [];
      this.selectedIndex = 0;
      this.searchTimer = null;
      this.searchRequestId = 0;
      this.pendingActionRequestId = 0;
      this.lastFocusedElement = null;
      // Prevent one Escape key press from being handled twice
      // (keydown + keyup fallback).
      this.skipNextEscapeKeyup = false;

      this.hostEl = null;
      this.backdropEl = null;
      this.panelEl = null;
      this.commandTriggerEl = null;
      this.commandIconEl = null;
      this.commandLabelEl = null;
      this.commandMenuEl = null;
      this.isCommandMenuOpen = false;
      this.commandMenuFocusIndex = -1;
      this.inputEl = null;
      this.resultsEl = null;
      this.emptyEl = null;
      this.closeBtnEl = null;

      this.onDocumentKeydownCapture = this.onDocumentKeydownCapture.bind(this);
      this.onDocumentKeyupFallback = this.onDocumentKeyupFallback.bind(this);
      this.onWindowBlur = this.onWindowBlur.bind(this);
      this.onDocumentClickCapture = this.onDocumentClickCapture.bind(this);
    }

    mount() {
      if (this.hostEl) return;

      // 统一入口后，右侧命令快捷标签全部移除。
      // 保留空字符串是为了兼容旧模板中的占位符插值。
      var commandHintMarkupLegacy = '';

      // 统一入口后，右侧命令快捷标签全部移除；保留空字符串是为了兼容旧模板占位符。
      var commandHintMarkupCompat = '';

      var commandHintMarkup = '';
      this.hostEl = document.createElement('div');
      this.hostEl.id = 'tabshelf-palette-root';
      this.hostEl.innerHTML = `
        <style id="tabshelf-palette-style">
          #tabshelf-palette-root {
            --ts-panel-width: min(588px, calc(100vw - 32px));
            --ts-panel-radius: 22px;
            --ts-panel-padding: 10px;
            --ts-input-height: 48px;
            --ts-item-height: 54px;
            --ts-text-main: #0f172a;
            --ts-text-sub: #64748b;
            --ts-line: rgba(15, 23, 42, 0.07);
            --ts-panel-bg: rgba(255, 255, 255, 0.84);
            --ts-surface-bg: rgba(248, 250, 252, 0.8);
            --ts-control-bg: rgba(255, 255, 255, 0.72);
            --ts-muted-bg: rgba(255, 255, 255, 0.72);
            --ts-hover-bg: rgba(148, 163, 184, 0.08);
            --ts-active-bg: rgba(59, 130, 246, 0.1);
            --ts-active-line: #3b82f6;
            --ts-shadow: 0 22px 52px rgba(15, 23, 42, 0.16);
            position: fixed;
            inset: 0;
            z-index: 2147483647;
            display: none;
            font-family: "Noto Sans SC", "Segoe UI", system-ui, -apple-system, sans-serif;
          }

          #tabshelf-palette-root.ts-open {
            display: block;
          }

          #tabshelf-palette-root .ts-backdrop {
            position: absolute;
            inset: 0;
            background:
              radial-gradient(circle at top, rgba(15, 23, 42, 0.16), rgba(15, 23, 42, 0.46)),
              rgba(15, 23, 42, 0.12);
            backdrop-filter: blur(12px);
          }

          /* Panel shell: lighter, narrower, and closer to a modern command palette. */
          #tabshelf-palette-root .ts-wrap {
            position: relative;
            width: var(--ts-panel-width);
            max-height: 70vh;
            margin: min(10vh, 72px) auto 0;
            border-radius: var(--ts-panel-radius);
            overflow: visible;
            display: flex;
            flex-direction: column;
            background: var(--ts-panel-bg);
            border: 1px solid var(--ts-line);
            box-shadow: var(--ts-shadow);
            backdrop-filter: blur(18px);
            color: var(--ts-text-main);
          }

          #tabshelf-palette-root .ts-head {
            position: relative;
            z-index: 2;
            padding: var(--ts-panel-padding);
            border-bottom: 1px solid var(--ts-line);
          }

          #tabshelf-palette-root .ts-search-bar {
            display: grid;
            grid-template-columns: auto minmax(0, 1fr) auto;
            gap: 8px;
            align-items: center;
            min-height: var(--ts-input-height);
            padding: 0 10px;
            border-radius: 15px;
            background: var(--ts-surface-bg);
            border: 1px solid rgba(203, 213, 225, 0.65);
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.58);
          }

          #tabshelf-palette-root .ts-search-bar:focus-within {
            border-color: rgba(59, 130, 246, 0.22);
            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.6),
              0 8px 22px rgba(59, 130, 246, 0.08);
          }

          #tabshelf-palette-root .ts-command-trigger {
            width: 38px;
            height: 36px;
            border-radius: 11px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0;
            background: rgba(255, 255, 255, 0.94);
            color: #334155;
            user-select: none;
            border: 1px solid rgba(203, 213, 225, 0.88);
            cursor: pointer;
            padding: 0;
            position: relative;
            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.74),
              0 3px 10px rgba(15, 23, 42, 0.06);
            transition: border-color 150ms ease, background-color 150ms ease, box-shadow 150ms ease, color 150ms ease;
          }

          #tabshelf-palette-root .ts-command-trigger:hover {
            border-color: rgba(148, 163, 184, 0.52);
            background: rgba(255, 255, 255, 0.99);
            color: #0f172a;
            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.8),
              0 5px 14px rgba(15, 23, 42, 0.08);
          }

          #tabshelf-palette-root .ts-command-trigger.ts-open {
            border-color: rgba(59, 130, 246, 0.45);
            background: rgba(239, 246, 255, 0.96);
            color: #1e40af;
            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.8),
              0 6px 16px rgba(59, 130, 246, 0.14);
          }

          #tabshelf-palette-root .ts-command-trigger:focus-visible {
            outline: none;
            border-color: rgba(59, 130, 246, 0.5);
            box-shadow:
              0 0 0 2px rgba(59, 130, 246, 0.16),
              0 5px 14px rgba(15, 23, 42, 0.08);
          }

          #tabshelf-palette-root .ts-command-icon {
            width: 18px;
            height: 18px;
            border-radius: 0;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: transparent;
            color: #334155;
          }

          #tabshelf-palette-root .ts-command-icon svg {
            width: 18px;
            height: 18px;
            display: block;
          }

          #tabshelf-palette-root .ts-command-label {
            font-size: 12px;
            font-weight: 700;
            line-height: 1;
            letter-spacing: 0.01em;
            white-space: nowrap;
            color: currentColor;
          }

          #tabshelf-palette-root .ts-command-caret {
            width: 14px;
            height: 14px;
            color: #64748b;
            transition: transform 140ms ease;
            flex-shrink: 0;
          }

          #tabshelf-palette-root .ts-command-caret svg {
            width: 14px;
            height: 14px;
            display: block;
          }

          #tabshelf-palette-root .ts-command-trigger.ts-open .ts-command-caret {
            transform: rotate(180deg);
            color: #1d4ed8;
          }

          #tabshelf-palette-root .ts-command-menu {
            position: absolute;
            top: calc(100% + 4px);
            left: 0;
            width: 176px;
            max-height: 224px;
            overflow-y: auto;
            overflow-x: hidden;
            display: none;
            padding: 6px;
            border-radius: 14px;
            background: rgba(255, 255, 255, 0.97);
            border: 1px solid rgba(203, 213, 225, 0.82);
            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.78),
              0 16px 32px rgba(15, 23, 42, 0.14);
            backdrop-filter: blur(18px);
            z-index: 18;
          }

          #tabshelf-palette-root .ts-wrap.ts-command-menu-up .ts-command-menu {
            top: auto;
            bottom: calc(100% + 4px);
          }

          #tabshelf-palette-root .ts-command-menu.ts-visible {
            display: block;
          }

          #tabshelf-palette-root .ts-command-menu::-webkit-scrollbar {
            width: 7px;
          }

          #tabshelf-palette-root .ts-command-menu::-webkit-scrollbar-thumb {
            background: rgba(100, 116, 139, 0.24);
            border-radius: 999px;
          }

          #tabshelf-palette-root .ts-command-item {
            width: 100%;
            position: relative;
            border: 1px solid rgba(148, 163, 184, 0.14);
            border-radius: 10px;
            background: rgba(255, 255, 255, 0.86);
            color: inherit;
            display: grid;
            grid-template-columns: 30px minmax(0, 1fr);
            gap: 10px;
            align-items: center;
            text-align: left;
            cursor: pointer;
            padding: 9px 10px;
            transition: border-color 120ms ease, background-color 120ms ease, box-shadow 120ms ease;
          }

          #tabshelf-palette-root .ts-command-item:hover {
            border-color: rgba(148, 163, 184, 0.32);
            background: rgba(248, 250, 252, 0.96);
          }

          #tabshelf-palette-root .ts-command-item.ts-focused {
            border-color: rgba(148, 163, 184, 0.42);
            background: rgba(241, 245, 249, 0.94);
          }

          #tabshelf-palette-root .ts-command-item.ts-active {
            background: rgba(239, 246, 255, 0.92);
            border-color: rgba(59, 130, 246, 0.36);
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72);
          }

          #tabshelf-palette-root .ts-command-item::before {
            content: "";
            position: absolute;
            left: 2px;
            top: 8px;
            bottom: 8px;
            width: 2px;
            border-radius: 999px;
            background: var(--ts-active-line);
            opacity: 0;
            transition: opacity 120ms ease;
          }

          #tabshelf-palette-root .ts-command-item.ts-active::before {
            opacity: 1;
          }

          #tabshelf-palette-root .ts-command-item-icon {
            width: 28px;
            height: 28px;
            border-radius: 8px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: rgba(241, 245, 249, 0.98);
            color: #334155;
          }

          #tabshelf-palette-root .ts-command-item-icon svg {
            width: 16px;
            height: 16px;
            display: block;
          }

          #tabshelf-palette-root .ts-command-item-copy {
            min-width: 0;
            display: flex;
            flex-direction: column;
            gap: 2px;
          }

          #tabshelf-palette-root .ts-command-item-title {
            font-size: 13px;
            font-weight: 700;
            color: #0f172a;
            line-height: 1.25;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          #tabshelf-palette-root .ts-command-item-meta {
            font-size: 11px;
            color: #64748b;
            line-height: 1.3;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          #tabshelf-palette-root .ts-input {
            width: 100%;
            border: none;
            outline: none;
            background: transparent;
            color: var(--ts-text-main);
            font-size: 16px;
            font-weight: 500;
            line-height: 1.3;
          }

          #tabshelf-palette-root .ts-input::placeholder {
            color: #94a3b8;
            font-weight: 400;
          }

          #tabshelf-palette-root .ts-close {
            min-width: 0;
            height: 26px;
            padding: 0 9px;
            border-radius: 999px;
            border: 1px solid var(--ts-line);
            background: var(--ts-control-bg);
            color: var(--ts-text-sub);
            font-size: 11px;
            font-weight: 600;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: 140ms ease;
          }

          #tabshelf-palette-root .ts-close:hover {
            border-color: rgba(148, 163, 184, 0.24);
            background: rgba(255, 255, 255, 0.92);
            color: var(--ts-text-main);
          }

          /* 旧版右侧命令标签组已废弃，直接隐藏以保证单入口。 */
          #tabshelf-palette-root .ts-command-hints {
            display: none !important;
          }

          #tabshelf-palette-root .ts-results {
            flex: 1 1 auto;
            min-height: 0;
            overflow: auto;
            padding: 6px 12px 8px;
          }

          #tabshelf-palette-root .ts-results::-webkit-scrollbar {
            width: 8px;
          }

          #tabshelf-palette-root .ts-results::-webkit-scrollbar-thumb {
            background: rgba(100, 116, 139, 0.35);
            border-radius: 999px;
          }

          #tabshelf-palette-root .ts-item {
            width: 100%;
            position: relative;
            display: grid;
            grid-template-columns: 32px minmax(0, 1fr) max-content;
            gap: 12px;
            align-items: center;
            min-height: var(--ts-item-height);
            border: 1px solid transparent;
            border-radius: 14px;
            background: transparent;
            padding: 10px 12px;
            text-align: left;
            cursor: pointer;
            color: inherit;
            transition: 130ms ease;
          }

          #tabshelf-palette-root .ts-item:hover {
            background: var(--ts-hover-bg);
          }

          #tabshelf-palette-root .ts-item.ts-active {
            background: var(--ts-active-bg);
            border-color: rgba(59, 130, 246, 0.18);
          }

          #tabshelf-palette-root .ts-item.ts-active::before {
            content: "";
            position: absolute;
            left: 0;
            top: 10px;
            bottom: 10px;
            width: 3px;
            border-radius: 999px;
            background: var(--ts-active-line);
          }

          #tabshelf-palette-root .ts-item-icon {
            width: 32px;
            height: 32px;
            border-radius: 10px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: #f1f5f9;
            color: #475569;
            font-size: 12px;
            font-weight: 800;
            overflow: hidden;
            flex-shrink: 0;
          }

          #tabshelf-palette-root .ts-item-icon img {
            width: 18px;
            height: 18px;
            border-radius: 6px;
            object-fit: cover;
            display: block;
          }

          #tabshelf-palette-root .ts-item-icon svg {
            width: 18px;
            height: 18px;
            display: block;
          }

          #tabshelf-palette-root .ts-item-main {
            min-width: 0;
            overflow: hidden;
            display: flex;
            flex-direction: column;
          }

          #tabshelf-palette-root .ts-item-title {
            font-size: 14px;
            font-weight: 600;
            color: var(--ts-text-main);
            display: block;
            line-height: 1.3;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          #tabshelf-palette-root .ts-item-subtitle {
            margin-top: 2px;
            font-size: 12px;
            color: var(--ts-text-sub);
            display: block;
            line-height: 1.3;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          #tabshelf-palette-root .ts-item-subtitle:empty {
            display: none;
          }

          #tabshelf-palette-root .ts-item-badge {
            height: 24px;
            padding: 0 8px;
            border-radius: 999px;
            background: var(--ts-muted-bg);
            color: var(--ts-text-sub);
            font-size: 11px;
            font-weight: 600;
            white-space: nowrap;
            flex-shrink: 0;
            display: inline-flex;
            align-items: center;
          }

          #tabshelf-palette-root .ts-empty {
            display: none;
            padding: 24px 18px 28px;
            color: var(--ts-text-sub);
            text-align: center;
            font-size: 13px;
            line-height: 1.6;
          }

          #tabshelf-palette-root .ts-empty.ts-visible {
            display: block;
          }

          #tabshelf-palette-root .ts-foot {
            display: flex;
            justify-content: space-between;
            gap: 10px;
            flex-wrap: wrap;
            padding: 10px 14px 12px;
            border-top: 1px solid var(--ts-line);
            color: var(--ts-text-sub);
            font-size: 11px;
            line-height: 1.5;
            opacity: 0.78;
          }

          #tabshelf-palette-root .ts-foot > span {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            flex-wrap: wrap;
          }

          #tabshelf-palette-root .ts-key {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 20px;
            height: 20px;
            padding: 0 6px;
            border-radius: 999px;
            background: var(--ts-control-bg);
            border: 1px solid var(--ts-line);
            color: var(--ts-text-main);
            font-size: 11px;
            font-weight: 600;
          }

          @media (prefers-color-scheme: dark) {
            #tabshelf-palette-root {
              --ts-text-main: #f8fafc;
              --ts-text-sub: #94a3b8;
              --ts-line: rgba(148, 163, 184, 0.16);
              --ts-panel-bg: rgba(15, 23, 42, 0.82);
              --ts-surface-bg: rgba(30, 41, 59, 0.72);
              --ts-control-bg: rgba(15, 23, 42, 0.58);
              --ts-muted-bg: rgba(148, 163, 184, 0.12);
              --ts-hover-bg: rgba(148, 163, 184, 0.12);
              --ts-active-bg: rgba(59, 130, 246, 0.18);
              --ts-active-line: #60a5fa;
              --ts-shadow: 0 24px 60px rgba(2, 6, 23, 0.42);
            }

            #tabshelf-palette-root .ts-search-bar {
              border-color: rgba(148, 163, 184, 0.14);
              box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
            }

            #tabshelf-palette-root .ts-search-bar:focus-within {
              border-color: rgba(96, 165, 250, 0.28);
              box-shadow:
                inset 0 1px 0 rgba(255, 255, 255, 0.04),
                0 8px 24px rgba(59, 130, 246, 0.18);
            }

            #tabshelf-palette-root .ts-command-trigger {
              border-color: rgba(148, 163, 184, 0.3);
              background: rgba(15, 23, 42, 0.62);
              box-shadow:
                inset 0 1px 0 rgba(255, 255, 255, 0.06),
                0 4px 10px rgba(2, 6, 23, 0.24);
            }

            #tabshelf-palette-root .ts-command-trigger:hover {
              border-color: rgba(148, 163, 184, 0.46);
              background: rgba(30, 41, 59, 0.9);
            }

            #tabshelf-palette-root .ts-command-trigger.ts-open {
              border-color: rgba(96, 165, 250, 0.48);
              background: rgba(59, 130, 246, 0.28);
              color: #bfdbfe;
            }

            #tabshelf-palette-root .ts-command-icon {
              background: transparent;
              color: #cbd5e1;
            }

            #tabshelf-palette-root .ts-command-caret {
              color: #94a3b8;
            }

            #tabshelf-palette-root .ts-command-menu {
              background: rgba(15, 23, 42, 0.92);
              border-color: rgba(148, 163, 184, 0.22);
              box-shadow:
                inset 0 1px 0 rgba(255, 255, 255, 0.06),
                0 18px 40px rgba(2, 6, 23, 0.38);
            }

            #tabshelf-palette-root .ts-command-item:hover {
              border-color: rgba(148, 163, 184, 0.42);
              background: rgba(30, 41, 59, 0.86);
            }

            #tabshelf-palette-root .ts-command-item.ts-focused {
              border-color: rgba(148, 163, 184, 0.5);
              background: rgba(51, 65, 85, 0.84);
            }

            #tabshelf-palette-root .ts-command-item.ts-active {
              background: rgba(30, 58, 138, 0.34);
              border-color: rgba(96, 165, 250, 0.52);
            }

            #tabshelf-palette-root .ts-command-item-icon {
              background: rgba(15, 23, 42, 0.92);
            }

            #tabshelf-palette-root .ts-command-item-title {
              color: var(--ts-text-main);
            }

            #tabshelf-palette-root .ts-command-item-meta {
              color: var(--ts-text-sub);
            }

            #tabshelf-palette-root .ts-input {
              color: var(--ts-text-main);
            }

            #tabshelf-palette-root .ts-input::placeholder {
              color: #64748b;
            }

            #tabshelf-palette-root .ts-close:hover {
              background: rgba(30, 41, 59, 0.88);
            }

            #tabshelf-palette-root .ts-item-title {
              color: var(--ts-text-main);
            }

            #tabshelf-palette-root .ts-item-subtitle,
            #tabshelf-palette-root .ts-close,
            #tabshelf-palette-root .ts-empty,
            #tabshelf-palette-root .ts-foot {
              color: var(--ts-text-sub);
            }
          }
        </style>
        <div class="ts-backdrop" data-ts-close="true"></div>
        <section class="ts-wrap" role="dialog" aria-modal="true" aria-label="TabShelf 命令面板">
          <header class="ts-head">
            <div class="ts-search-bar">
              <button class="ts-command-trigger" type="button" aria-haspopup="listbox" aria-expanded="false" aria-label="选择命令">
                <span class="ts-command-icon" aria-hidden="true"></span>
              </button>
              <input class="ts-input" type="text" spellcheck="false" autocomplete="off"
                placeholder="搜索标签页、历史记录、书签">
              <button class="ts-close" type="button" aria-label="关闭面板">Esc</button>
            </div>
            <div class="ts-command-hints" aria-label="常用命令">
              ${commandHintMarkup}
            </div>
            <div class="ts-command-menu" role="listbox" aria-label="命令列表"></div>
          </header>
          <div class="ts-results"></div>
          <div class="ts-empty"></div>
          <footer class="ts-foot">
            <span><span class="ts-key">↑</span><span class="ts-key">↓</span> 切换 <span class="ts-key">Enter</span> 打开</span>
            <span><span class="ts-key">Ctrl</span><span class="ts-key">Enter</span> 新标签 <span class="ts-key">Esc</span> 关闭</span>
          </footer>
        </section>
      `;

      document.documentElement.appendChild(this.hostEl);

      this.backdropEl = this.hostEl.querySelector('.ts-backdrop');
      this.panelEl = this.hostEl.querySelector('.ts-wrap');
      this.commandTriggerEl = this.hostEl.querySelector('.ts-command-trigger');
      this.commandMenuEl = this.hostEl.querySelector('.ts-command-menu');
      this.inputEl = this.hostEl.querySelector('.ts-input');
      this.resultsEl = this.hostEl.querySelector('.ts-results');
      this.emptyEl = this.hostEl.querySelector('.ts-empty');
      this.closeBtnEl = this.hostEl.querySelector('.ts-close');

      // 兼容旧模板：运行时移除右侧命令快捷标签容器，确保入口唯一。
      var legacyHintsEl = this.hostEl.querySelector('.ts-command-hints');
      if (legacyHintsEl) {
        legacyHintsEl.remove();
      }

      // 统一命令入口按钮结构：图标 + 当前类型 + 下拉箭头。
      this.commandTriggerEl.innerHTML = `
        <span class="ts-command-icon" aria-hidden="true"></span>
      `;
      this.commandIconEl = this.commandTriggerEl.querySelector('.ts-command-icon');
      this.commandLabelEl = null;
      this.commandTriggerEl.setAttribute('aria-label', '切换搜索类型');
      this.commandTriggerEl.setAttribute('aria-controls', 'ts-command-menu');
      this.commandMenuEl.id = 'ts-command-menu';

      // Initialize head icon once after the DOM nodes are ready.
      this.updateHeadIcon();
      this.renderCommandMenu();
      this.bindEvents();
    }

    bindEvents() {
      this.backdropEl.addEventListener('click', () => this.close());
      this.closeBtnEl.addEventListener('click', () => this.close());
      this.commandTriggerEl.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.toggleCommandMenu();
      });
      this.commandTriggerEl.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          this.toggleCommandMenu();
          return;
        }

        if (event.key === 'ArrowDown') {
          event.preventDefault();
          if (!this.isCommandMenuOpen) {
            this.openCommandMenu();
            return;
          }
          this.moveCommandMenuFocus(1);
          return;
        }

        if (event.key === 'ArrowUp') {
          event.preventDefault();
          if (!this.isCommandMenuOpen) {
            this.openCommandMenu();
            return;
          }
          this.moveCommandMenuFocus(-1);
        }
      });
      this.commandMenuEl.addEventListener('click', (event) => {
        const commandItem = event.target.closest('[data-ts-command-id]');
        if (!commandItem) return;
        const commandId = commandItem.dataset.tsCommandId || '';
        this.applyCommandFromMenu(commandId);
      });

      this.inputEl.addEventListener('input', () => {
        this.selectedIndex = 0;
        this.closeCommandMenu();
        this.updateHeadIcon();
        this.scheduleSearch();
      });

      this.inputEl.addEventListener('keydown', (event) => {
        // Do not interfere with IME composition.
        if (event.isComposing || event.keyCode === 229) {
          return;
        }

        // Keep event away from page-level shortcut handlers.
        // We stop both normal propagation and same-target listeners,
        // because some websites bind aggressive keyboard shortcuts.
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === 'function') {
          event.stopImmediatePropagation();
        }

        if (event.key === 'Escape') {
          this.skipNextEscapeKeyup = true;
          event.preventDefault();
          if (this.isCommandMenuOpen) {
            this.closeCommandMenu();
            return;
          }

          this.close();
          return;
        }

        // Prioritize command menu keyboard navigation when the menu is visible.
        if (this.isCommandMenuOpen) {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            this.moveCommandMenuFocus(1);
            return;
          }

          if (event.key === 'ArrowUp') {
            event.preventDefault();
            this.moveCommandMenuFocus(-1);
            return;
          }

          if (event.key === 'Enter') {
            event.preventDefault();
            this.confirmCommandMenuSelection();
            return;
          }
        }

        // 命令菜单打开时，优先处理类型选择键盘交互。
        if (this.isCommandMenuOpen) {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            this.moveCommandMenuFocus(1);
            return;
          }

          if (event.key === 'ArrowUp') {
            event.preventDefault();
            this.moveCommandMenuFocus(-1);
            return;
          }

          if (event.key === 'Enter') {
            event.preventDefault();
            this.confirmCommandMenuSelection();
            return;
          }
        }

        if (event.key === 'ArrowDown') {
          event.preventDefault();
          if (!this.items.length) return;
          this.setSelectedIndex(this.selectedIndex + 1);
          return;
        }

        if (event.key === 'ArrowUp') {
          event.preventDefault();
          if (!this.items.length) return;
          this.setSelectedIndex(this.selectedIndex - 1);
          return;
        }

        if (event.key === 'Enter') {
          event.preventDefault();
          const activeItem = this.items[this.selectedIndex];
          if (!activeItem) return;

          const actionId = event.ctrlKey && activeItem.actionIds.includes('open-url-new-tab')
            ? 'open-url-new-tab'
            : activeItem.defaultActionId;

          void this.runAction(actionId, activeItem);
        }
      });

      // Capture-phase guard:
      // If palette is open but focus escaped, bring it back to the input so
      // website single-key shortcuts (like GitHub "t") do not take over.
      // Use window capture instead of document capture so we can intercept
      // before most site listeners on document/body (e.g. Telegram shortcuts).
      window.addEventListener('keydown', this.onDocumentKeydownCapture, true);
      // Some web apps grab Escape on keydown. A keyup listener gives the palette
      // a second chance to close itself and keeps state consistent.
      document.addEventListener('keyup', this.onDocumentKeyupFallback, true);
      document.addEventListener('click', this.onDocumentClickCapture, true);
      window.addEventListener('blur', this.onWindowBlur, true);
      window.addEventListener('resize', () => {
        if (!this.isOpen || !this.isCommandMenuOpen) return;
        this.syncCommandMenuPosition();
      });
    }

    onDocumentKeydownCapture(event) {
      if (!this.isOpen) return;

      const target = event.target instanceof HTMLElement ? event.target : null;
      const inPalette = !!(target && this.hostEl.contains(target));

      // While the palette is open, Escape always belongs to the palette.
      // Capture + immediate stop avoids Telegram/web-app global Esc handlers.
      if (event.key === 'Escape') {
        this.skipNextEscapeKeyup = true;
        event.preventDefault();
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === 'function') {
          event.stopImmediatePropagation();
        }
        if (this.isCommandMenuOpen) {
          this.closeCommandMenu();
          return;
        }

        this.close();
        return;
      }

      if (event.defaultPrevented) return;
      if (inPalette) return;

      const hasModifier = event.ctrlKey || event.metaKey || event.altKey;
      const isSingleChar = event.key && event.key.length === 1;

      // For printable keys without modifiers, force focus back before the site
      // can handle one-key shortcuts.
      if (!hasModifier && isSingleChar) {
        event.preventDefault();
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === 'function') {
          event.stopImmediatePropagation();
        }
        this.focusInput();
        this.insertText(event.key);
        return;
      }
    }

    onDocumentKeyupFallback(event) {
      if (!this.isOpen) return;
      if (event.key !== 'Escape') return;

      // If keydown already handled this Escape, ignore the paired keyup.
      if (this.skipNextEscapeKeyup) {
        this.skipNextEscapeKeyup = false;
        return;
      }

      // Keep keyup Escape owned by the palette.
      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === 'function') {
        event.stopImmediatePropagation();
      }

      if (this.isCommandMenuOpen) {
        this.closeCommandMenu();
        return;
      }

      this.close();
    }

    onDocumentClickCapture(event) {
      if (!this.isOpen || !this.isCommandMenuOpen) return;

      const target = event.target instanceof HTMLElement ? event.target : null;
      if (!target) return;

      // Keep menu open for interactions inside trigger/menu, close otherwise.
      if (this.commandTriggerEl.contains(target) || this.commandMenuEl.contains(target)) {
        return;
      }

      this.closeCommandMenu();
    }

    onWindowBlur() {
      if (!this.isOpen) return;

      // Keep palette editable when browser focus returns.
      // Delay lets native focus restoration settle first.
      setTimeout(() => {
        if (!this.isOpen) return;
        this.focusInput();
      }, 0);
    }

    toggle() {
      this.mount();

      if (this.isOpen) {
        this.close();
      } else {
        this.open();
      }
    }

    open() {
      this.mount();
      this.isOpen = true;
      this.skipNextEscapeKeyup = false;
      this.lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      this.hostEl.classList.add('ts-open');
      this.resetSession();
      this.focusInput();
      void this.requestSearch('');
    }

    close() {
      if (!this.isOpen) return;

      this.closeCommandMenu();
      this.isOpen = false;
      this.skipNextEscapeKeyup = false;
      this.hostEl.classList.remove('ts-open');
      this.clearSession();

      if (this.lastFocusedElement && this.lastFocusedElement.isConnected) {
        try {
          this.lastFocusedElement.focus({ preventScroll: true });
        } catch (error) {
          this.lastFocusedElement.focus();
        }
      }
    }

    focusInput() {
      requestAnimationFrame(() => {
        if (!this.isOpen) return;
        this.inputEl.focus({ preventScroll: true });
        const end = this.inputEl.value.length;
        this.inputEl.setSelectionRange(end, end);
      });
    }

    insertText(text) {
      const input = this.inputEl;
      const start = input.selectionStart ?? input.value.length;
      const end = input.selectionEnd ?? input.value.length;

      input.value = `${input.value.slice(0, start)}${text}${input.value.slice(end)}`;
      const nextPos = start + text.length;
      input.setSelectionRange(nextPos, nextPos);
      this.selectedIndex = 0;
      this.closeCommandMenu();
      this.updateHeadIcon();
      this.scheduleSearch();
    }

    clearSession() {
      clearTimeout(this.searchTimer);
      this.searchRequestId += 1;
      this.pendingActionRequestId = 0;
      this.commandMenuFocusIndex = -1;
      this.items = [];
      this.resultButtonEls = [];
      this.selectedIndex = 0;
      this.resultsEl.innerHTML = '';
      // 清空搜索时同时重置结果区高度，避免沿用上一次的行数限制。
      this.resultsEl.style.maxHeight = '';
      this.emptyEl.classList.remove('ts-visible');
    }

    resetSession() {
      this.clearSession();
      this.inputEl.value = '';
      this.closeCommandMenu();
      this.updateHeadIcon();
      this.renderEmpty('输入关键词开始搜索');
    }

    scheduleSearch() {
      clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(() => {
        void this.requestSearch(this.inputEl.value);
      }, 90);
    }

    async requestSearch(query) {
      if (!this.isOpen) return;
      const requestId = ++this.searchRequestId;

      if (!this.items.length) {
        this.renderEmpty('正在搜索...');
      }

      let response = null;
      try {
        response = await chrome.runtime.sendMessage({
          type: PALETTE_MESSAGE_TYPES.SEARCH,
          query,
          context: this.collectPageContext()
        });
      } catch (error) {
        response = null;
      }

      if (!this.isOpen) return;
      if (requestId !== this.searchRequestId) return;

      if (!response || !response.ok) {
        this.items = [];
        this.renderEmpty('搜索失败，请稍后重试。');
        return;
      }

      this.items = Array.isArray(response.items) ? response.items : [];
      this.selectedIndex = this.items.length ? Math.min(this.selectedIndex, this.items.length - 1) : 0;
      this.renderResults();
    }

    async runAction(actionId, item) {
      if (!actionId || !item) return;
      const requestId = ++this.pendingActionRequestId;

      let response = null;
      try {
        response = await chrome.runtime.sendMessage({
          type: PALETTE_MESSAGE_TYPES.RUN_ACTION,
          actionId,
          item,
          context: this.collectPageContext()
        });
      } catch (error) {
        response = null;
      }

      if (!this.isOpen) return;
      if (requestId !== this.pendingActionRequestId) return;
      this.pendingActionRequestId = 0;

      if (!response || !response.ok) {
        this.renderEmpty('操作失败，请稍后重试。');
        return;
      }

      const result = response.result || {};

      if (result.effect === 'apply-command') {
        this.inputEl.value = result.nextQuery || '';
        this.selectedIndex = 0;
        this.updateHeadIcon();
        this.focusInput();
        await this.requestSearch(this.inputEl.value);
        return;
      }

      if (result.effect === 'close-palette') {
        this.close();
      }
    }

    collectPageContext() {
      const selection = window.getSelection ? window.getSelection() : null;
      return {
        title: document.title || '',
        url: window.location.href,
        selectedText: selection ? selection.toString().trim() : ''
      };
    }

    renderResults() {
      this.resultsEl.innerHTML = '';
      this.resultButtonEls = [];

      if (!this.items.length) {
        if (this.inputEl.value.trim()) {
          this.renderEmpty('暂无匹配结果，试试更短的关键词');
        } else {
          this.renderEmpty('输入关键词开始搜索');
        }
        return;
      }

      this.emptyEl.classList.remove('ts-visible');

      this.items.forEach((item, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'ts-item';

        // Empty subtitles create unnecessary vertical whitespace, so only
        // render the secondary line when there is real supporting context.
        const subtitleMarkup = item.subtitle
          ? `<span class="ts-item-subtitle">${escapeHtml(item.subtitle)}</span>`
          : '';

        button.innerHTML = `
          <span class="ts-item-icon" data-ts-result-icon="true"></span>
          <span class="ts-item-main">
            <span class="ts-item-title">${escapeHtml(item.title)}</span>
            ${subtitleMarkup}
          </span>
          <span class="ts-item-badge">${escapeHtml(this.getBadge(item.source))}</span>
        `;

        // Prefer the real website favicon; fall back to source-specific SVG.
        this.fillResultIcon(button, item);

        button.addEventListener('mouseenter', () => {
          this.setSelectedIndex(index, { scrollIntoView: false });
        });

        button.addEventListener('click', () => {
          const actionId = item.defaultActionId;
          void this.runAction(actionId, item);
        });

        this.resultButtonEls.push(button);
        this.resultsEl.appendChild(button);
      });

      // 按真实渲染出来的行高限制结果区，只显示 7 条并保留滚动。
      this.syncResultsViewportHeight();
      this.updateActiveResult();
    }

    renderEmpty(text) {
      this.resultsEl.innerHTML = '';
      this.resultButtonEls = [];
      this.emptyEl.textContent = text;
      this.emptyEl.classList.add('ts-visible');
      this.syncResultsViewportHeight();
    }

    setSelectedIndex(nextIndex, options = {}) {
      if (!this.items.length) return;
      const maxIndex = this.items.length - 1;
      const normalized = nextIndex < 0 ? maxIndex : nextIndex > maxIndex ? 0 : nextIndex;
      this.selectedIndex = normalized;
      this.updateActiveResult(options);
    }

    updateActiveResult(options = {}) {
      const shouldScroll = options.scrollIntoView !== false;
      this.resultButtonEls.forEach((el, index) => {
        el.classList.toggle('ts-active', index === this.selectedIndex);
      });

      if (!shouldScroll) return;
      const active = this.resultButtonEls[this.selectedIndex];
      if (active) {
        active.scrollIntoView({ block: 'nearest' });
      }
    }

    syncResultsViewportHeight() {
      if (!this.resultsEl) return;

      if (!this.resultButtonEls.length) {
        this.resultsEl.style.maxHeight = '';
        return;
      }

      const visibleButtons = this.resultButtonEls.slice(0, MAX_VISIBLE_RESULT_COUNT);
      const computedStyle = window.getComputedStyle(this.resultsEl);
      const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
      const paddingBottom = parseFloat(computedStyle.paddingBottom) || 0;

      // 使用前 7 条结果的真实高度求和，避免字号、缩放或不同副标题高度导致截断。
      const visibleItemsHeight = visibleButtons.reduce((totalHeight, buttonEl) => {
        return totalHeight + Math.ceil(buttonEl.getBoundingClientRect().height);
      }, 0);

      this.resultsEl.style.maxHeight = `${visibleItemsHeight + paddingTop + paddingBottom}px`;
    }

    updateHeadIcon() {
      if (!this.commandIconEl || !this.inputEl || !this.commandTriggerEl) return;

      const commandId = this.getCurrentCommandId(this.inputEl.value);
      const commandItem = this.getCommandMenuItem(commandId);
      const commandDisplayMeta = this.getCommandDisplayMeta(commandItem.id);

      this.commandIconEl.innerHTML = this.getHeadIconMarkup(commandItem.id);
      this.inputEl.placeholder = commandDisplayMeta.placeholder;

      // 左侧按钮统一反馈“当前模式”。
      this.commandIconEl.innerHTML = this.getHeadIconMarkup(commandItem.id);
      if (this.commandLabelEl) {
        this.commandLabelEl.textContent = commandDisplayMeta.triggerLabel;
      }

      // placeholder 只负责提示“搜什么”，不再解释命令语法。
      this.inputEl.placeholder = commandDisplayMeta.placeholder;
      this.commandTriggerEl.setAttribute('aria-label', `切换搜索类型，当前：${commandDisplayMeta.triggerLabel}`);

      if (this.isCommandMenuOpen) {
        this.renderCommandMenu();
        this.syncCommandMenuPosition();
      }
    }

    getCommandMenuItem(commandId) {
      return COMMAND_MENU_ITEMS.find((item) => item.id === commandId) || COMMAND_MENU_ITEMS[0];
    }

    getCommandDisplayMeta(commandId) {
      const metaByCommandId = {
        default: {
          triggerLabel: '全部搜索',
          placeholder: '搜索全部来源'
        },
        google: {
          triggerLabel: 'Google',
          placeholder: '搜索 Google 结果'
        },
        github: {
          triggerLabel: 'GitHub',
          placeholder: '搜索 GitHub 仓库或代码'
        },
        bookmarks: {
          triggerLabel: '书签',
          placeholder: '搜索书签'
        },
        history: {
          triggerLabel: '历史',
          placeholder: '搜索历史记录'
        },
        site: {
          triggerLabel: '网址',
          placeholder: '输入网址或站点关键词'
        },
        workflow: {
          triggerLabel: '工作流',
          placeholder: '搜索工作流'
        }
      };

      return metaByCommandId[commandId] || metaByCommandId.default;
    }

    getCommandMenuIndex(commandId) {
      const index = COMMAND_MENU_ITEMS.findIndex((item) => item.id === commandId);
      return index >= 0 ? index : 0;
    }

    syncCommandMenuPosition() {
      if (!this.commandMenuEl || !this.commandTriggerEl || !this.panelEl) return;

      const layout = this.computeCommandMenuPlacement();
      if (!layout) return;
      this.applyCommandMenuLayout(layout);
    }

    measureCommandMenuWidth() {
      if (!this.commandMenuEl) return COMMAND_MENU_MIN_WIDTH;

      const titleEls = this.commandMenuEl.querySelectorAll('.ts-command-item-title');
      const titleMaxWidth = Array.from(titleEls).reduce((maxWidth, titleEl) => {
        return Math.max(maxWidth, Math.ceil(titleEl.scrollWidth));
      }, 0);

      if (!titleMaxWidth) return COMMAND_MENU_MIN_WIDTH;

      const firstItem = this.commandMenuEl.querySelector('.ts-command-item');
      if (!firstItem) return COMMAND_MENU_MIN_WIDTH;

      const itemStyle = window.getComputedStyle(firstItem);
      const menuStyle = window.getComputedStyle(this.commandMenuEl);
      const gap = parseFloat(itemStyle.columnGap || itemStyle.gap) || 10;
      const itemPaddingLeft = parseFloat(itemStyle.paddingLeft) || 0;
      const itemPaddingRight = parseFloat(itemStyle.paddingRight) || 0;
      const menuPaddingLeft = parseFloat(menuStyle.paddingLeft) || 0;
      const menuPaddingRight = parseFloat(menuStyle.paddingRight) || 0;
      const iconColumnWidth = 30;
      const scrollbarAllowance = 8;

      const measuredWidth = Math.ceil(
        iconColumnWidth +
        gap +
        titleMaxWidth +
        itemPaddingLeft +
        itemPaddingRight +
        menuPaddingLeft +
        menuPaddingRight +
        scrollbarAllowance
      );
      return Math.min(COMMAND_MENU_MAX_WIDTH, Math.max(COMMAND_MENU_MIN_WIDTH, measuredWidth));
    }

    computeCommandMenuPlacement() {
      if (!this.commandMenuEl || !this.commandTriggerEl || !this.panelEl) return null;

      var headEl = this.panelEl.querySelector('.ts-head');
      if (!headEl) return null;

      const panelRect = this.panelEl.getBoundingClientRect();
      const headRect = headEl.getBoundingClientRect();
      const triggerRect = this.commandTriggerEl.getBoundingClientRect();
      const measuredWidth = this.measureCommandMenuWidth();
      const availableHeadWidth = Math.max(96, Math.round(headRect.width - COMMAND_MENU_EDGE_GAP * 2));
      const width = Math.min(
        availableHeadWidth,
        Math.max(COMMAND_MENU_MIN_WIDTH, measuredWidth)
      );

      const leftByTrigger = Math.round(triggerRect.left - headRect.left);
      const maxLeft = Math.round(headRect.width - width - COMMAND_MENU_EDGE_GAP);
      const clampedMaxLeft = Math.max(COMMAND_MENU_EDGE_GAP, maxLeft);
      const left = Math.max(COMMAND_MENU_EDGE_GAP, Math.min(leftByTrigger, clampedMaxLeft));

      const availableBelow = Math.floor(
        panelRect.bottom - triggerRect.bottom - COMMAND_MENU_TRIGGER_GAP - COMMAND_MENU_EDGE_GAP
      );
      const availableAbove = Math.floor(
        triggerRect.top - panelRect.top - COMMAND_MENU_TRIGGER_GAP - COMMAND_MENU_EDGE_GAP
      );

      let placeUp = availableBelow < COMMAND_MENU_MIN_HEIGHT && availableAbove > availableBelow;
      let availableHeight = placeUp ? availableAbove : availableBelow;
      if (availableHeight < COMMAND_MENU_MIN_HEIGHT) {
        placeUp = availableAbove > availableBelow;
        availableHeight = Math.max(availableAbove, availableBelow);
      }

      const maxHeight = Math.max(88, Math.min(COMMAND_MENU_MAX_HEIGHT, availableHeight));
      return { left, width, maxHeight, placeUp };
    }

    applyCommandMenuLayout(layout) {
      if (!this.commandMenuEl || !this.panelEl || !layout) return;

      this.commandMenuEl.style.left = `${layout.left}px`;
      this.commandMenuEl.style.width = `${layout.width}px`;
      this.commandMenuEl.style.maxHeight = `${layout.maxHeight}px`;
      this.panelEl.classList.toggle('ts-command-menu-up', !!layout.placeUp);
    }

    setCommandMenuFocus(nextIndex, options = {}) {
      if (!COMMAND_MENU_ITEMS.length) return;

      const maxIndex = COMMAND_MENU_ITEMS.length - 1;
      const normalized = nextIndex < 0 ? maxIndex : nextIndex > maxIndex ? 0 : nextIndex;
      this.commandMenuFocusIndex = normalized;
      this.renderCommandMenu();

      if (options.shouldScroll === false) return;
      const focusedOptionEl = this.commandMenuEl?.querySelector(`[data-ts-command-index="${normalized}"]`);
      if (focusedOptionEl) {
        focusedOptionEl.scrollIntoView({ block: 'nearest' });
      }
    }

    moveCommandMenuFocus(step) {
      const activeCommandId = this.getCurrentCommandId(this.inputEl?.value || '');
      const baseIndex = this.commandMenuFocusIndex >= 0
        ? this.commandMenuFocusIndex
        : this.getCommandMenuIndex(activeCommandId);
      this.setCommandMenuFocus(baseIndex + step);
    }

    confirmCommandMenuSelection() {
      if (!COMMAND_MENU_ITEMS.length) return;

      const fallbackIndex = this.getCommandMenuIndex(this.getCurrentCommandId(this.inputEl?.value || ''));
      const focusIndex = this.commandMenuFocusIndex >= 0 ? this.commandMenuFocusIndex : fallbackIndex;
      const commandItem = COMMAND_MENU_ITEMS[focusIndex] || COMMAND_MENU_ITEMS[0];
      this.applyCommandFromMenu(commandItem.id);
    }

    toggleCommandMenu() {
      if (this.isCommandMenuOpen) {
        this.closeCommandMenu();
      } else {
        this.openCommandMenu();
      }
    }

    openCommandMenu() {
      if (!this.commandMenuEl || !this.commandTriggerEl) return;
      if (this.isCommandMenuOpen) return;

      this.isCommandMenuOpen = true;
      this.commandMenuFocusIndex = this.getCommandMenuIndex(this.getCurrentCommandId(this.inputEl?.value || ''));
      this.renderCommandMenu();
      this.commandMenuEl.classList.add('ts-visible');
      this.syncCommandMenuPosition();
      this.commandTriggerEl.classList.add('ts-open');
      this.commandTriggerEl.setAttribute('aria-expanded', 'true');
      this.focusInput();
    }

    closeCommandMenu() {
      if (!this.commandMenuEl || !this.commandTriggerEl) return;
      if (!this.isCommandMenuOpen) return;

      this.isCommandMenuOpen = false;
      this.commandMenuFocusIndex = -1;
      this.commandMenuEl.classList.remove('ts-visible');
      this.commandTriggerEl.classList.remove('ts-open');
      this.commandTriggerEl.setAttribute('aria-expanded', 'false');
      if (this.panelEl) {
        this.panelEl.classList.remove('ts-command-menu-up');
      }
    }

    renderCommandMenu() {
      if (!this.commandMenuEl) return;

      const activeCommandId = this.getCurrentCommandId(this.inputEl?.value || '');
      this.commandMenuEl.innerHTML = '';

      COMMAND_MENU_ITEMS.forEach((commandItem, index) => {
        const isActive = commandItem.id === activeCommandId;
        const isFocused = index === this.commandMenuFocusIndex;
        const commandTokenLabel = commandItem.id ? `/${commandItem.id}` : '/all';
        const optionButton = document.createElement('button');
        optionButton.type = 'button';
        optionButton.setAttribute('role', 'option');
        optionButton.dataset.tsCommandId = commandItem.id;
        optionButton.dataset.tsCommandIndex = String(index);
        optionButton.setAttribute('aria-selected', String(isActive));
        optionButton.className = `ts-command-item${isActive ? ' ts-active' : ''}${isFocused ? ' ts-focused' : ''}`;
        optionButton.innerHTML = `
          <span class="ts-command-item-icon">${this.getHeadIconMarkup(commandItem.id)}</span>
          <span class="ts-command-item-title">${escapeHtml(commandTokenLabel)}</span>
        `;
        this.commandMenuEl.appendChild(optionButton);
      });
    }

    applyCommandFromMenu(commandId) {
      const commandItem = this.getCommandMenuItem(commandId);
      const keyword = this.getSearchKeywordWithoutCommand(this.inputEl.value);

      // 选中模式立即生效：保留关键词，仅替换模式前缀。
      this.inputEl.value = commandItem.id ? `${commandItem.query}${keyword}` : keyword;
      this.selectedIndex = 0;
      this.closeCommandMenu();
      this.updateHeadIcon();
      this.focusInput();
      void this.requestSearch(this.inputEl.value);
    }

    getSearchKeywordWithoutCommand(query) {
      const normalized = String(query || '').trim();
      if (!normalized.startsWith('/')) return normalized;

      const firstSpaceIndex = normalized.search(/\s/);
      if (firstSpaceIndex < 0) return '';
      return normalized.slice(firstSpaceIndex + 1).trim();
    }

    getCurrentCommandId(query) {
      const trimmed = String(query || '').trim();
      if (!trimmed.startsWith('/')) return '';

      const commandToken = trimmed.slice(1).split(/\s+/)[0].toLowerCase();
      if (!commandToken) return '';

      if (commandToken === 'g' || commandToken === 'google') return 'google';
      if (commandToken === 'gh' || commandToken === 'github') return 'github';
      if (commandToken === 'h' || commandToken === 'his' || commandToken === 'history') return 'history';
      if (commandToken === 'b' || commandToken === 'bm' || commandToken === 'bookmark' || commandToken === 'bookmarks') return 'bookmarks';
      if (commandToken === 'open' || commandToken === 'url' || commandToken === 'site') return 'site';
      if (commandToken === 'wf' || commandToken === 'workflow') return 'workflow';
      return '';
    }

    fillResultIcon(resultButtonEl, item) {
      const iconHost = resultButtonEl.querySelector('[data-ts-result-icon="true"]');
      if (!iconHost) return;

      const iconCandidates = this.getResultIconCandidates(item);
      if (!iconCandidates.length) {
        iconHost.innerHTML = this.getSourceFallbackIconMarkup(item);
        return;
      }

      const iconImg = document.createElement('img');
      iconImg.alt = '';
      iconImg.loading = 'lazy';
      iconImg.decoding = 'async';

      let candidateIndex = 0;
      const tryNextCandidate = () => {
        if (candidateIndex >= iconCandidates.length) {
          iconHost.innerHTML = this.getSourceFallbackIconMarkup(item);
          return;
        }

        iconImg.src = iconCandidates[candidateIndex];
        candidateIndex += 1;
      };

      // Some pages block specific icon hosts; try multiple sources before fallback.
      iconImg.addEventListener('error', tryNextCandidate);

      iconHost.textContent = '';
      iconHost.appendChild(iconImg);
      tryNextCandidate();
    }

    getResultUrl(item) {
      const directUrl = item?.payload?.url;
      if (typeof directUrl === 'string' && directUrl) {
        return directUrl;
      }

      const firstWorkflowUrl = item?.payload?.steps?.find((step) => step.type === 'open-url' && step.url)?.url;
      if (typeof firstWorkflowUrl === 'string' && firstWorkflowUrl) {
        return firstWorkflowUrl;
      }

      return '';
    }

    getResultIconCandidates(item) {
      const candidates = [];

      // For tab results, prefer the exact favicon URL Chrome already has.
      const tabFavIconUrl = item?.payload?.favIconUrl;
      if (this.isUsableIconUrl(tabFavIconUrl)) {
        candidates.push(tabFavIconUrl);
      }

      const pageUrl = this.getResultUrl(item);
      if (this.isHttpUrl(pageUrl)) {
        candidates.push(`https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(pageUrl)}`);

        const hostname = this.getHostnameSafe(pageUrl);
        if (hostname) {
          candidates.push(`https://icons.duckduckgo.com/ip3/${hostname}.ico`);
        }
      }

      return dedupeStrings(candidates);
    }

    isUsableIconUrl(url) {
      if (typeof url !== 'string' || !url.trim()) return false;
      const trimmedUrl = url.trim();
      return /^https?:\/\//i.test(trimmedUrl) || /^data:image\//i.test(trimmedUrl);
    }

    isHttpUrl(url) {
      return typeof url === 'string' && /^https?:\/\//i.test(url);
    }

    getHostnameSafe(url) {
      try {
        return new URL(url).hostname;
      } catch (error) {
        return '';
      }
    }

    getBadge(source) {
      if (source === 'bookmark') return '书签';
      if (source === 'history') return '历史';
      if (source === 'tab') return '标签页';
      if (source === 'command') return '命令';
      if (source === 'workflow') return '工作流';
      return '搜索';
    }

    getSourceFallbackIconMarkup(item) {
      if (item?.source === 'command') {
        return this.getHeadIconMarkup(item?.payload?.commandId || '');
      }

      if (item?.source === 'bookmark') return ICON_MARKUPS.bookmarks;
      if (item?.source === 'history') return ICON_MARKUPS.history;
      if (item?.source === 'tab') return ICON_MARKUPS.tab;
      if (item?.source === 'workflow') return ICON_MARKUPS.workflow;
      return ICON_MARKUPS.site;
    }

    getHeadIconMarkup(commandId) {
      if (commandId === 'google') return ICON_MARKUPS.google;
      if (commandId === 'github') return ICON_MARKUPS.github;
      if (commandId === 'history') return ICON_MARKUPS.history;
      if (commandId === 'bookmarks') return ICON_MARKUPS.bookmarks;
      if (commandId === 'site') return ICON_MARKUPS.site;
      if (commandId === 'workflow') return ICON_MARKUPS.workflow;
      return ICON_MARKUPS.default;
    }
  }

  const COMMAND_MENU_ITEMS = [
    {
      id: '',
      label: '全部搜索',
      hint: '不限制命令，搜索全部来源',
      query: ''
    },
    {
      id: 'google',
      label: 'Google 搜索',
      hint: '/google 关键词',
      query: '/google '
    },
    {
      id: 'github',
      label: 'GitHub 搜索',
      hint: '/github 关键词',
      query: '/github '
    },
    {
      id: 'bookmarks',
      label: '书签搜索',
      hint: '/bookmarks 关键词',
      query: '/bookmarks '
    },
    {
      id: 'history',
      label: '历史记录搜索',
      hint: '/history 关键词',
      query: '/history '
    },
    {
      id: 'site',
      label: '网址直达',
      hint: '/site https://example.com',
      query: '/site '
    },
    {
      id: 'workflow',
      label: '工作流',
      hint: '/workflow 名称',
      query: '/workflow '
    }
  ];

  // 命令类型的按钮文案与输入提示统一收敛到这里，避免分散维护。
  const COMMAND_DISPLAY_META = {
    default: {
      triggerLabel: '全部搜索',
      placeholder: '搜索全部来源'
    },
    google: {
      triggerLabel: 'Google',
      placeholder: '搜索 Google 结果'
    },
    github: {
      triggerLabel: 'GitHub',
      placeholder: '搜索 GitHub 仓库或代码'
    },
    bookmarks: {
      triggerLabel: '书签',
      placeholder: '搜索书签'
    },
    history: {
      triggerLabel: '历史',
      placeholder: '搜索历史记录'
    },
    site: {
      triggerLabel: '网址',
      placeholder: '输入网址或站点关键词'
    },
    workflow: {
      triggerLabel: '工作流',
      placeholder: '搜索工作流'
    }
  };

  // Keep hint chips focused on the highest-frequency commands so the header
  // stays compact and readable.
  const COMMAND_HINT_ITEMS = [
    { id: '', label: '全部' },
    { id: 'bookmarks', label: '/bookmarks' },
    { id: 'history', label: '/history' },
    { id: 'github', label: '/github' },
    { id: 'google', label: '/google' }
  ];

  const ICON_MARKUPS = {
    default: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
        <path d="M5 7h14"></path>
        <path d="M5 12h10"></path>
        <path d="M5 17h8"></path>
      </svg>
    `,
    google: `
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M21.8 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.5a4.8 4.8 0 0 1-2 3.2v2.6h3.3c1.9-1.8 3-4.4 3-7.7z" fill="#4285F4"></path>
        <path d="M12 22c2.7 0 4.9-.9 6.5-2.4l-3.3-2.6c-.9.6-2 .9-3.2.9-2.5 0-4.6-1.7-5.4-4H3.2v2.7A10 10 0 0 0 12 22z" fill="#34A853"></path>
        <path d="M6.6 13.9a6 6 0 0 1 0-3.8V7.4H3.2a10 10 0 0 0 0 9.2l3.4-2.7z" fill="#FBBC05"></path>
        <path d="M12 6.1c1.4 0 2.6.5 3.6 1.4l2.8-2.8A10 10 0 0 0 3.2 7.4l3.4 2.7c.8-2.3 2.9-4 5.4-4z" fill="#EA4335"></path>
      </svg>
    `,
    github: `
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 .8a11.2 11.2 0 0 0-3.6 21.8c.6.1.8-.3.8-.6v-2.2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.2-1.7-1.2-1.7-1-.7.1-.7.1-.7 1.1.1 1.7 1.1 1.7 1.1 1 .1.2 2.7 3.3 1.9.1-.7.4-1.2.7-1.5-2.6-.3-5.4-1.3-5.4-5.8 0-1.3.4-2.3 1.1-3.1-.1-.3-.5-1.4.1-3 0 0 .9-.3 3.1 1.1a10.7 10.7 0 0 1 5.6 0c2.1-1.4 3-1.1 3-1.1.6 1.6.2 2.7.1 3 .7.8 1.1 1.8 1.1 3.1 0 4.5-2.8 5.5-5.4 5.8.4.4.8 1 .8 2v3c0 .3.2.7.8.6A11.2 11.2 0 0 0 12 .8z"></path>
      </svg>
    `,
    bookmarks: `
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="m12 2.5 2.9 5.9 6.5.9-4.7 4.6 1.1 6.4L12 17.4 6.2 20.3l1.1-6.4L2.6 9.3l6.5-.9L12 2.5z"></path>
      </svg>
    `,
    history: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 12a9 9 0 1 0 2.6-6.4"></path>
        <path d="M3 4v5h5"></path>
        <path d="M12 7v6l3 2"></path>
      </svg>
    `,
    site: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="9"></circle>
        <path d="M3 12h18"></path>
        <path d="M12 3a15 15 0 0 1 0 18"></path>
        <path d="M12 3a15 15 0 0 0 0 18"></path>
      </svg>
    `,
    tab: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="5" width="18" height="14" rx="3"></rect>
        <path d="M3 10h18"></path>
      </svg>
    `,
    workflow: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 7h7"></path>
        <circle cx="14" cy="7" r="3"></circle>
        <path d="M20 7h0"></path>
        <path d="M20 17h-7"></path>
        <circle cx="10" cy="17" r="3"></circle>
        <path d="M4 17h0"></path>
      </svg>
    `
  };

  function escapeHtml(value) {
    const el = document.createElement('div');
    el.appendChild(document.createTextNode(String(value || '')));
    return el.innerHTML;
  }

  function dedupeStrings(values) {
    const seen = new Set();
    const result = [];

    values.forEach((value) => {
      if (seen.has(value)) return;
      seen.add(value);
      result.push(value);
    });

    return result;
  }

  const palette = new PaletteOverlay();

  chrome.runtime.onMessage.addListener((message) => {
    if (!message || message.type !== PALETTE_MESSAGE_TYPES.TOGGLE) {
      return false;
    }
    palette.toggle();
    return false;
  });
})();
