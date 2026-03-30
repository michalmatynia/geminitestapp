import type {
  CaseResolverDropDocumentToCanvasDetail,
  CaseResolverShowDocumentInCanvasDetail,
  CaseResolverTreeDragPayload,
} from '@/shared/contracts/case-resolver';
import { DRAG_KEYS, getFirstDragValue } from '@/shared/utils/drag-drop';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

export const CASE_RESOLVER_DROP_DOCUMENT_TO_CANVAS_EVENT = 'case_resolver:drop-document-to-canvas';
export const CASE_RESOLVER_SHOW_DOCUMENT_IN_CANVAS_EVENT = 'case_resolver:show-document-in-canvas';

const isNonEmptyId = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const hasValidTreeDragEntityId = (payload: CaseResolverTreeDragPayload): boolean => {
  switch (payload.entity) {
    case 'asset':
      return isNonEmptyId(payload.assetId);
    case 'file':
      return isNonEmptyId(payload.fileId);
    default:
      return false;
  }
};

export const emitCaseResolverDropDocumentToCanvas = (
  detail: CaseResolverDropDocumentToCanvasDetail
): void => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<CaseResolverDropDocumentToCanvasDetail>(
      CASE_RESOLVER_DROP_DOCUMENT_TO_CANVAS_EVENT,
      { detail }
    )
  );
};

export const emitCaseResolverShowDocumentInCanvas = (
  detail: CaseResolverShowDocumentInCanvasDetail
): void => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<CaseResolverShowDocumentInCanvasDetail>(
      CASE_RESOLVER_SHOW_DOCUMENT_IN_CANVAS_EVENT,
      { detail }
    )
  );
};

export const parseCaseResolverTreeDropPayload = (
  dataTransfer: DataTransfer
): CaseResolverTreeDragPayload | null => {
  const raw = getFirstDragValue(dataTransfer, [DRAG_KEYS.CASE_RESOLVER_ITEM]);
  if (!raw) return null;
  try {
    const payload = JSON.parse(raw) as CaseResolverTreeDragPayload;
    if (payload.source !== 'case_resolver_tree') return null;
    return hasValidTreeDragEntityId(payload) ? payload : null;
  } catch (error) {
    logClientError(error);
    return null;
  }
};
