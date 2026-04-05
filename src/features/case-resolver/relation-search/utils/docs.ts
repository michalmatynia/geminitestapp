import { DOCUMENTATION_MODULE_IDS } from '@/shared/contracts/documentation';
import { getDocumentationTooltip } from '@/shared/lib/documentation/tooltips';

export const CASE_RESOLVER_DOC_KEYS = {
  advancedFilters: 'case_resolver_advanced_filters',
  lockedIndicator: 'case_resolver_locked_indicator',
  linkDocument: 'case_resolver_link_document',
  browseCaseDocs: 'case_resolver_browse_case_docs',
  addToCanvasCenter: 'case_resolver_add_to_canvas_center',
  copyNodeId: 'case_resolver_copy_node_id',
  copyCaseId: 'case_resolver_copy_case_id',
  copyDocumentId: 'case_resolver_copy_document_id',
  dragToCanvas: 'case_resolver_drag_to_canvas',
} as const;

export function getCaseResolverDocTooltip(key: keyof typeof CASE_RESOLVER_DOC_KEYS): string {
  const docId = CASE_RESOLVER_DOC_KEYS[key];
  return getDocumentationTooltip(DOCUMENTATION_MODULE_IDS.caseResolver, docId) ?? '';
}

export function getCaseResolverDocTooltipWithFallback(
  key: keyof typeof CASE_RESOLVER_DOC_KEYS,
  fallback: string
): string {
  return getCaseResolverDocTooltip(key) || fallback;
}
