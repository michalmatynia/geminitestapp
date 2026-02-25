import {
  DOCUMENTATION_MODULE_IDS,
} from '@/features/documentation';
import { getDocumentationTooltip } from '@/features/tooltip-engine';

export const CASE_RESOLVER_DOC_KEYS = {
  advancedFilters: 'case_resolver_advanced_filters',
  lockedIndicator: 'case_resolver_locked_indicator',
  linkDocument: 'case_resolver_link_document',
  browseCaseDocs: 'case_resolver_browse_case_docs',
} as const;

export function getCaseResolverDocTooltip(key: keyof typeof CASE_RESOLVER_DOC_KEYS): string {
  const docId = CASE_RESOLVER_DOC_KEYS[key];
  return getDocumentationTooltip(DOCUMENTATION_MODULE_IDS.caseResolver, docId) ?? '';
}
