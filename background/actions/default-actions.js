// Action 的执行结果统一返回 effect，
// content UI 只需要根据 effect 更新界面，不需要知道具体实现细节。

export function createApplyCommandAction() {
  return {
    id: 'apply-command',
    async run(item) {
      return {
        effect: 'apply-command',
        nextQuery: item.payload.nextQuery || ''
      };
    }
  };
}

export function createOpenUrlCurrentAction() {
  return {
    id: 'open-url-current',
    async run(item, context) {
      const targetUrl = item?.payload?.url;
      if (!targetUrl) {
        return {
          effect: 'none'
        };
      }

      if (context.senderTabId) {
        await chrome.tabs.update(context.senderTabId, { url: targetUrl });
        return { effect: 'close-palette' };
      }

      await chrome.tabs.create({ url: targetUrl });
      return { effect: 'close-palette' };
    }
  };
}

export function createOpenUrlNewTabAction() {
  return {
    id: 'open-url-new-tab',
    async run(item) {
      const targetUrl = item?.payload?.url;
      if (!targetUrl) {
        return {
          effect: 'none'
        };
      }

      await chrome.tabs.create({ url: targetUrl });
      return { effect: 'close-palette' };
    }
  };
}

export function createActivateTabAction() {
  return {
    id: 'activate-tab',
    async run(item) {
      const tabId = item?.payload?.tabId;
      const windowId = item?.payload?.windowId;

      if (!tabId) {
        return {
          effect: 'none'
        };
      }

      if (windowId) {
        await chrome.windows.update(windowId, { focused: true });
      }

      await chrome.tabs.update(tabId, { active: true });
      return { effect: 'close-palette' };
    }
  };
}

export function createRunWorkflowAction() {
  return {
    id: 'run-workflow',
    async run(item, context) {
      const workflow = item?.payload;
      const steps = Array.isArray(workflow?.steps) ? workflow.steps : [];
      let hasConsumedCurrentTab = false;

      for (const step of steps) {
        if (step.type === 'open-url' && step.url) {
          if (step.newTab || !context.senderTabId || hasConsumedCurrentTab) {
            await chrome.tabs.create({ url: step.url });
            continue;
          }

          await chrome.tabs.update(context.senderTabId, { url: step.url });
          hasConsumedCurrentTab = true;
        }
      }

      return { effect: 'close-palette' };
    }
  };
}
