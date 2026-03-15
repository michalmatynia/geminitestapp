import type {
  CaseResolverDropDocumentToCanvasDetail,
  CaseResolverShowDocumentInCanvasDetail,
  CaseResolverTreeDragPayload,
} from '@/shared/contracts/case-resolver';
import { DRAG_KEYS, getFirstDragValue } from '@/shared/utils/drag-drop';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


export const CASE_RESOLVER_DROP_DOCUMENT_TO_CANVAS_EVENT = 'case_resolver:drop-document-to-canvas';
export const CASE_RESOLVER_SHOW_DOCUMENT_IN_CANVAS_EVENT = 'case_resolver:show-document-in-canvas';

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

    if (payload.entity === 'asset') {
      if (typeof payload.assetId !== 'string' || payload.assetId.trim().length === 0) return null;
      return payload;
    }

    if (payload.entity === 'file') {
      if (typeof payload.fileId !== 'string' || payload.fileId.trim().length === 0) return null;
      return payload;
    }

    return null;
  } catch (error) {
    logClientError(error);
    return null;
  }
};
