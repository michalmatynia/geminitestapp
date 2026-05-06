/**
 * Admin Case Resolver Page State Hook
 * 
 * Administrative interface state management for case resolution workflows.
 * Provides:
 * - Router integration with loading states
 * - URL parameter synchronization for admin views
 * - FileMaker party integration and labeling
 * - Case resolver node metadata management
 * - Path validation and folder hierarchy handling
 */

'use client';

import { useRouter } from 'nextjs-toploader/app';
import { useSearchParams } from 'next/navigation';
import React, { useCallback, useMemo, useRef, useEffect } from 'react';

import { isPathWithinFolder } from '@/features/case-resolver/utils/caseResolverUtils';
import type { FilemakerPartyKind } from '@/features/filemaker/public';
import { resolveFilemakerPartyLabel } from '@/features/filemaker/public';
import { DEFAULT_CASE_RESOLVER_NODE_META } from '@/shared/contracts/case-resolver/constants';
import type { AiNode } from '@/shared/contracts/case-resolver/../ai-paths-core';
import type { CaseResolverFile } from '@/shared/contracts/case-resolver/file';
import type { CaseResolverNodeMeta } from '@/shared/contracts/case-resolver/graph';
import type { CaseResolverWorkspace } from '@/shared/contracts/case-resolver/workspace';
import { stableStringify } from '@/shared/lib/ai-paths/core/utils/runtime';
import { useToast } from '@/shared/ui/primitives.public';

import { useCaseResolverState } from './useCaseResolverState';
import { hasCaseResolverDraftMeaningfulChanges } from './useCaseResolverState.helpers';
import { stripCaseContextQueryParams } from './useCaseResolverState.helpers.requested-context';
import { logCaseResolverDurationMetric } from '../runtime';
import { type CaseResolverFileEditDraft, type CaseResolverStateValue } from '../types';
import { deleteCaseResolverNodeFileSnapshot } from '../workspace-persistence';
import { useAdminCaseResolverCaptureActions } from './useAdminCaseResolverCaptureActions';
import { useAdminCaseResolverDocumentActions } from './useAdminCaseResolverDocumentActions';
import { useAdminCaseResolverEditorUiState } from './useAdminCaseResolverEditorUiState';
import { useAdminCaseResolverMetadataActions } from './useAdminCaseResolverMetadataActions';
import { useAdminCaseResolverRelationActions } from './useAdminCaseResolverRelationActions';
import { buildCaseMetadataDraft, buildCaseMetadataPatch } from '../case-overview-draft';

import { useAdminCaseResolverPageNavigation } from './page-state/useAdminCaseResolverPageNavigation';
import { useAdminCaseResolverPageEditor } from './page-state/useAdminCaseResolverPageEditor';
import { useAdminCaseResolverPageMetadata } from './page-state/useAdminCaseResolverPageMetadata';

export function useAdminCaseResolverPageState() {
  const state = useCaseResolverState();
  const navigation = useAdminCaseResolverPageNavigation();
  const editor = useAdminCaseResolverPageEditor();
  const metadata = useAdminCaseResolverPageMetadata();
  const { toast } = useToast();

  // Return the combined state
  return {
    ...state,
    ...navigation,
    ...editor,
    ...metadata,
    toast,
  };
}
