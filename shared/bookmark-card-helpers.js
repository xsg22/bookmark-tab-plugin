/**
 * 统一生成书签卡片的状态类名。
 * 这样渲染层只需要关心状态本身，不需要在模板里散落多个 class 拼接分支。
 */
export function buildBookmarkCardClassName({
  isDeleteConfirmOpen = false,
  isHighlightedBookmark = false,
  isDragging = false,
  isDropTarget = false,
  dropPosition = null
} = {}) {
  const classNames = ['bookmark-card'];

  if (isHighlightedBookmark) {
    classNames.push('is-copy-highlight');
  }

  if (isDeleteConfirmOpen) {
    classNames.push('has-delete-confirm', 'is-delete-layer-active');
  }

  if (isDragging) {
    classNames.push('is-dragging');
  }

  if (isDropTarget && dropPosition) {
    classNames.push('is-drop-target', `drop-${dropPosition}`);
  }

  return classNames.join(' ');
}

/**
 * 根据鼠标当前位置计算拖拽插入方向。
 * 宽卡片优先按水平中线判断，窄卡片或移动端单列时按垂直中线判断。
 */
export function getBookmarkDropPosition({ clientX, clientY, rect, columnCount = null }) {
  if (!rect || rect.width <= 0 || rect.height <= 0) {
    return 'before';
  }

  // 多列网格更符合左右插入的心理预期；单列时改为上下插入更自然。
  const prefersHorizontalSplit = typeof columnCount === 'number'
    ? columnCount > 1
    : rect.width >= rect.height;
  if (prefersHorizontalSplit) {
    return clientX - rect.left >= rect.width / 2 ? 'after' : 'before';
  }

  return clientY - rect.top >= rect.height / 2 ? 'after' : 'before';
}

/**
 * 计算 chrome.bookmarks.move 需要写入的最终索引。
 * 先移除被拖拽项，再根据目标项和 before/after 语义插入。
 */
export function getReorderedBookmarkIndex({
  orderedIds,
  draggedId,
  targetId,
  dropPosition
}) {
  if (!Array.isArray(orderedIds) || !draggedId || !targetId || !dropPosition) {
    return -1;
  }

  if (draggedId === targetId) {
    return -1;
  }

  const nextIds = orderedIds.filter((id) => id !== draggedId);
  const targetIndex = nextIds.indexOf(targetId);
  if (targetIndex === -1) {
    return -1;
  }

  return dropPosition === 'after' ? targetIndex + 1 : targetIndex;
}
