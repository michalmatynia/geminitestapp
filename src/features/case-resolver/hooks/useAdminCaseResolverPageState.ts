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

import { useToast } from '@/shared/ui/primitives.public';

import { useCaseResolverState } from './useCaseResolverState';
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
