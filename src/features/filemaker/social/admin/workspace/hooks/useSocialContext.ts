'use client';

import { useCallback, useRef, useState, type MutableRefObject } from 'react';

import { safeClearTimeout, safeSetTimeout } from '@/shared/lib/timers';
import { useToast } from '@/shared/ui';
import {
  usePatchSocialPublishingPost,
} from '@/features/filemaker/social/hooks/useSocialPublishingPosts';
import {
  logSocialPublishingClientError,
} from '@/features/filemaker/social/client-observability';
import type { MutationResult } from '@/shared/contracts/ui/queries';
import { api } from '@/shared/lib/api-client';
import { useMutationV2 } from '@/shared/lib/query-factories-v2';
import type { SocialPublishingPost } from '@/shared/contracts/social-publishing-posts';

const MAX_PERSISTED_CONTEXT_SUMMARY_CHARS = 8000;

const normalizeLoadedContextSummary = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim() ?? '';
  if (trimmed.length === 0) return null;
  if (trimmed.length <= MAX_PERSISTED_CONTEXT_SUMMARY_CHARS) {
    return trimmed;
  }

  return trimmed.slice(0, MAX_PERSISTED_CONTEXT_SUMMARY_CHARS).trimEnd();
};

type SocialContextDeps = {
  activePost: SocialPublishingPost | null;
  resolveDocReferences: () => string[];
  setContextSummary: (value: string | null) => void;
  buildSocialContext: (overrides?: Record<string, unknown>) => Record<string, unknown>;
};

type LoadSocialContextVariables = {
  docRefs: string[];
};

type LoadSocialContextResponse = {
  context?: string;
  summary?: string;
  docCount?: number;
};

type LoadContextOptions = {
  notify?: boolean;
  persist?: boolean;
  useDirect?: boolean;
};

type LoadContextResult = {
  summary: string | null;
  docCount: number | null;
  error?: boolean;
};

type UseSocialContextResult = {
  contextLoading: boolean;
  handleLoadContext: (options?: LoadContextOptions) => Promise<LoadContextResult>;
};

type ResolvedLoadContextOptions = Required<LoadContextOptions>;
type PatchSocialPublishingPostMutation = ReturnType<typeof usePatchSocialPublishingPost>;
type ToastFn = ReturnType<typeof useToast>['toast'];

type PersistContextSummaryOptions = {
  activePost: SocialPublishingPost;
  patchMutation: PatchSocialPublishingPostMutation;
  summary: string;
  useDirect: boolean;
};

type ContextLoadReadiness =
  | { activePost: SocialPublishingPost }
  | { result: LoadContextResult };

type ApplyLoadedContextOptions = {
  activePost: SocialPublishingPost;
  contextData: LoadSocialContextResponse;
  deps: SocialContextDeps;
  options: ResolvedLoadContextOptions;
  patchMutation: PatchSocialPublishingPostMutation;
  toast: ToastFn;
};

const buildSocialContextUrl = (docRefs: string[]): string =>
  `/api/filemaker/social-posts/context${
    docRefs.length > 0 ? `?refs=${encodeURIComponent(docRefs.join(','))}` : ''
  }`;

const useLatestRef = <TValue,>(value: TValue): MutableRefObject<TValue> => {
  const ref = useRef(value);
  ref.current = value;
  return ref;
};

const resolveLoadContextOptions = (
  options: LoadContextOptions | undefined
): ResolvedLoadContextOptions => ({
  notify: options?.notify !== false,
  persist: options?.persist !== false,
  useDirect: options?.useDirect === true,
});

const resolveContextLoadReadiness = ({
  activePost,
  isLoading,
  notify,
  toast,
}: {
  activePost: SocialPublishingPost | null;
  isLoading: boolean;
  notify: boolean;
  toast: ToastFn;
}): ContextLoadReadiness => {
  if (activePost === null) {
    if (notify) {
      toast('Create or select a post first', { variant: 'warning' });
    }
    return { result: { summary: null, docCount: null, error: true } };
  }

  if (isLoading) {
    return { result: { summary: null, docCount: null } };
  }

  return { activePost };
};

const isBlockedContextLoad = (
  readiness: ContextLoadReadiness
): readiness is { result: LoadContextResult } => 'result' in readiness;

const fetchSocialContext = async ({
  docRefs,
}: LoadSocialContextVariables): Promise<LoadSocialContextResponse> => {
  const contextAbort = new AbortController();
  const contextTimer = safeSetTimeout(() => contextAbort.abort(), 30_000);
  const contextResponse = await fetch(buildSocialContextUrl(docRefs), {
    signal: contextAbort.signal,
  }).finally(() => safeClearTimeout(contextTimer));
  if (!contextResponse.ok) {
    throw new Error(`Failed to load social post context (${contextResponse.status}).`);
  }
  return (await contextResponse.json()) as LoadSocialContextResponse;
};

const useLoadSocialContextMutation = (): MutationResult<
  LoadSocialContextResponse,
  LoadSocialContextVariables
> =>
  useMutationV2<LoadSocialContextResponse, LoadSocialContextVariables>({
    mutationKey: ['filemaker', 'social-posts', 'context'],
    mutationFn: fetchSocialContext,
    meta: {
      source: 'features.filemaker.social.admin.workspace.useSocialContext',
      operation: 'action',
      resource: 'filemaker.social-post.context',
      domain: 'files',
      description: 'Load documentation context for a Filemaker social publishing post.',
      errorPresentation: 'toast',
    },
  });

const resolveLoadedContextResult = (
  contextData: LoadSocialContextResponse,
  notify: boolean,
  toast: ToastFn
): LoadContextResult => {
  const summary = normalizeLoadedContextSummary(contextData.summary ?? contextData.context ?? null);
  if (summary !== null) {
    return { summary, docCount: contextData.docCount ?? null };
  }

  if (notify) {
    toast('No documentation context found', { variant: 'warning' });
  }
  return { summary: null, docCount: contextData.docCount ?? null };
};

const persistContextSummary = async ({
  activePost,
  patchMutation,
  summary,
  useDirect,
}: PersistContextSummaryOptions): Promise<void> => {
  try {
    if (useDirect) {
      await api.patch<SocialPublishingPost>(`/api/filemaker/social-posts/${activePost.id}`, {
        updates: { contextSummary: summary },
      });
      return;
    }
    await patchMutation.mutateAsync({
      id: activePost.id,
      updates: { contextSummary: summary },
    });
  } catch {
    // Post may not exist server-side yet (e.g. pipeline runs before first save).
    // Context is already set in local state; persist failure is non-fatal.
  }
};

const toastLoadedContext = (toast: ToastFn, docCount: number | null): void => {
  toast(`Loaded context from ${docCount ?? 0} document${docCount === 1 ? '' : 's'}`, {
    variant: 'success',
  });
};

const applyLoadedContext = async ({
  activePost,
  contextData,
  deps,
  options,
  patchMutation,
  toast,
}: ApplyLoadedContextOptions): Promise<LoadContextResult> => {
  const loadedContext = resolveLoadedContextResult(contextData, options.notify, toast);
  if (loadedContext.summary === null) {
    return loadedContext;
  }

  deps.setContextSummary(loadedContext.summary);
  if (options.persist) {
    await persistContextSummary({
      activePost,
      patchMutation,
      summary: loadedContext.summary,
      useDirect: options.useDirect,
    });
  }
  if (options.notify) {
    toastLoadedContext(toast, loadedContext.docCount);
  }
  return loadedContext;
};

const handleContextLoadFailure = (
  error: unknown,
  deps: SocialContextDeps,
  notify: boolean,
  toast: ToastFn
): LoadContextResult => {
  logSocialPublishingClientError(error, {
    source: 'AdminSocialPublishingPage',
    action: 'loadContext',
    ...deps.buildSocialContext({ error: true }),
  });
  if (notify) {
    toast('Failed to load documentation context', { variant: 'error' });
  }
  return { summary: null, docCount: null, error: true };
};

export function useSocialContext(deps: SocialContextDeps): UseSocialContextResult {
  const { toast } = useToast();
  const patchMutation = usePatchSocialPublishingPost();
  const loadContextMutation = useLoadSocialContextMutation();
  const [contextLoading, setContextLoading] = useState(false);

  const depsRef = useLatestRef(deps);
  const patchMutationRef = useLatestRef(patchMutation);
  const loadContextMutationRef = useLatestRef(loadContextMutation);
  const contextLoadingRef = useLatestRef(contextLoading);

  const handleLoadContext = useCallback(
    async (options?: LoadContextOptions): Promise<LoadContextResult> => {
      const d = depsRef.current;
      const resolvedOptions = resolveLoadContextOptions(options);
      const readiness = resolveContextLoadReadiness({
        activePost: d.activePost,
        isLoading: contextLoadingRef.current,
        notify: resolvedOptions.notify,
        toast,
      });
      if (isBlockedContextLoad(readiness)) {
        return readiness.result;
      }

      setContextLoading(true);
      try {
        const contextData = await loadContextMutationRef.current.mutateAsync({
          docRefs: d.resolveDocReferences(),
        });
        return await applyLoadedContext({
          activePost: readiness.activePost,
          contextData,
          deps: d,
          options: resolvedOptions,
          patchMutation: patchMutationRef.current,
          toast,
        });
      } catch (error) {
        return handleContextLoadFailure(error, d, resolvedOptions.notify, toast);
      } finally {
        setContextLoading(false);
      }
    },
    [toast]
  );

  return {
    contextLoading,
    handleLoadContext,
  };
}
