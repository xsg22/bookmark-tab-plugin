import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildBookmarkCardClassName,
  getBookmarkDropPosition,
  getReorderedBookmarkIndex
} from '../shared/bookmark-card-helpers.js';

test('buildBookmarkCardClassName adds delete and drop state classes', () => {
  const className = buildBookmarkCardClassName({
    isDeleteConfirmOpen: true,
    isHighlightedBookmark: false,
    isDragging: false,
    isDropTarget: true,
    dropPosition: 'after'
  });

  assert.equal(
    className,
    'bookmark-card has-delete-confirm is-delete-layer-active is-drop-target drop-after'
  );
});

test('getBookmarkDropPosition prefers after when pointer is in the right half', () => {
  const dropPosition = getBookmarkDropPosition({
    clientX: 190,
    clientY: 20,
    rect: { left: 0, top: 0, width: 200, height: 100 }
  });

  assert.equal(dropPosition, 'after');
});

test('getBookmarkDropPosition prefers before when pointer is in the upper-left area', () => {
  const dropPosition = getBookmarkDropPosition({
    clientX: 30,
    clientY: 20,
    rect: { left: 0, top: 0, width: 200, height: 100 }
  });

  assert.equal(dropPosition, 'before');
});

test('getReorderedBookmarkIndex returns append index when dragging after a later target', () => {
  const targetIndex = getReorderedBookmarkIndex({
    orderedIds: ['a', 'b', 'c', 'd'],
    draggedId: 'b',
    targetId: 'd',
    dropPosition: 'after'
  });

  assert.equal(targetIndex, 3);
});

test('getReorderedBookmarkIndex returns target index when dragging before an earlier target', () => {
  const targetIndex = getReorderedBookmarkIndex({
    orderedIds: ['a', 'b', 'c', 'd'],
    draggedId: 'd',
    targetId: 'b',
    dropPosition: 'before'
  });

  assert.equal(targetIndex, 1);
});
