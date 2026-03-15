'use client';

import { createDocsTooltipEnhancer, DOCUMENTATION_MODULE_IDS } from '@/shared/lib/documentation';

export const DocsTooltipEnhancer = createDocsTooltipEnhancer({
  moduleId: DOCUMENTATION_MODULE_IDS.aiPaths,
  fallbackDocId: 'workflow_overview',
});
