// tabs API 的能力后面会同时服务命令面板和工作流系统，
// 所以提前独立成服务层。

export function getOpenTabItems() {
  return new Promise((resolve) => {
    chrome.tabs.query({}, (tabs) => {
      if (chrome.runtime.lastError) {
        resolve([]);
        return;
      }

      resolve(
        tabs
          .filter((tab) => tab && tab.id && tab.url)
          .map((tab) => ({
            id: String(tab.id),
            tabId: tab.id,
            windowId: tab.windowId,
            title: tab.title || tab.url,
            url: tab.url,
            // Keep the tab's native favicon URL so UI can prefer the same
            // icon Chrome already resolved for the tab strip.
            favIconUrl: tab.favIconUrl || '',
            active: !!tab.active,
            pinned: !!tab.pinned
          }))
      );
    });
  });
}
