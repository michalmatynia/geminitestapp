'use client';

import { createDocsTooltipEnhancer, DOCUMENTATION_MODULE_IDS } from '@/shared/lib/documentation';

export const DocsTooltipEnhancer = createDocsTooltipEnhancer({
  moduleId: DOCUMENTATION_MODULE_IDS.promptExploder,
  fallbackDocId: 'workflow_overview',
});
