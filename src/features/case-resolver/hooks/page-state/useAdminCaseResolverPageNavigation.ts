import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCaseResolverState } from '../useCaseResolverState';

export function useAdminCaseResolverPageNavigation() {
  const state = useCaseResolverState();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const openEditorFromQueryHandledRef = useRef<string | null>(null);
  const autoClearRequestKeyHandledRef = useRef<string | null>(null);
  const editorDirtyEvalDurationMsRef = useRef<number | null>(null);
  const lastActiveCaseMetadataDraftFileIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!state.shouldOpenEditorFromQuery || !state.requestedFileId) {
      openEditorFromQueryHandledRef.current = null;
      return;
    }
  }, [state.shouldOpenEditorFromQuery, state.requestedFileId]);

  return {
    router,
    searchParams,
    openEditorFromQueryHandledRef,
    autoClearRequestKeyHandledRef,
    editorDirtyEvalDurationMsRef,
    lastActiveCaseMetadataDraftFileIdRef,
  };
}
