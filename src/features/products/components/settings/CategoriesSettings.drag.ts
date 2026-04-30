import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

const NO_DRAG_SELECTOR =
  'button,[role="button"],input,textarea,select,a,[data-master-tree-no-drag="true"]';
const DRAG_HANDLE_SELECTOR = '[data-master-tree-drag-handle="category"]';
const DRAG_SURFACE_SELECTOR = '[data-master-tree-drag-surface="category"]';

const matchesSelector = (element: Element | null, selector: string): boolean =>
  element?.closest(selector) !== null && element?.closest(selector) !== undefined;

export const getDragPointerElement = (
  event: React.DragEvent<HTMLDivElement>
): Element | null =>
  typeof document !== 'undefined'
    ? document.elementFromPoint(event.clientX, event.clientY)
    : null;

export const canStartCategoryDrag = ({
  event,
}: {
  node: MasterTreeNode;
  event: React.DragEvent<HTMLDivElement>;
}): boolean => {
  const eventTarget = event.target instanceof Element ? event.target : null;
  const pointerElement = getDragPointerElement(event);
  if (
    matchesSelector(eventTarget, DRAG_HANDLE_SELECTOR) ||
    matchesSelector(pointerElement, DRAG_HANDLE_SELECTOR)
  ) {
    return true;
  }
  if (
    matchesSelector(eventTarget, NO_DRAG_SELECTOR) ||
    matchesSelector(pointerElement, NO_DRAG_SELECTOR)
  ) {
    return false;
  }
  return (
    matchesSelector(eventTarget, DRAG_SURFACE_SELECTOR) ||
    matchesSelector(pointerElement, DRAG_SURFACE_SELECTOR)
  );
};
