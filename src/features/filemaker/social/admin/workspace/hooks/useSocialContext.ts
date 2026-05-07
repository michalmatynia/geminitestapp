'use client';

import { useCallback, useRef, useState } from 'react';

import { safeClearTimeout, safeSetTimeout } from '@/shared/lib/timers';
import { useToast } from '@/shared/ui';
import {
  usePatchSocialPublishingPost,
} from '@/features/filemaker/social/hooks/useSocialPublishingPosts';
import {
  logSocialPublishingClientError,
} from '@/features/filemaker/social/client-observability';
import { api } from '@/shared/lib/api-client';
import type { SocialPublishingPost } from '@/shared/contracts/social-publishing-posts';

const MAX_PERSISTED_CONTEXT_SUMMARY_CHARS = 8000;

const normalizeLoadedContextSummary = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return null;
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

export function useSocialContext(deps: SocialContextDeps) {
  const { toast } = useToast();
  const patchMutation = usePatchSocialPublishingPost();
  const [contextLoading, setContextLoading] = useState(false);

  // Ref keeps the latest deps accessible inside the async callback
  // without putting the whole deps object in the useCallback dep array
  // (which would recreate the callback on every render).
  const depsRef = useRef(deps);
  depsRef.current = deps;
  const patchMutationRef = useRef(patchMutation);
  patchMutationRef.current = patchMutation;
  const contextLoadingRef = useRef(contextLoading);
  contextLoadingRef.current = contextLoading;

  const handleLoadContext = useCallback(
    async (options?: { notify?: boolean; persist?: boolean; useDirect?: boolean }): Promise<{
      summary: string | null;
      docCount: number | null;
      error?: boolean;
    }> => {
      const d = depsRef.current;
      const notify = options?.notify !== false;
      const persist = options?.persist !== false;
      const useDirect = options?.useDirect === true;
      if (!d.activePost) {
        if (notify) {
          toast('Create or select a post first', { variant: 'warning' });
        }
        return { summary: null, docCount: null, error: true };
      }
      if (contextLoadingRef.current) {
        return { summary: null, docCount: null };
      }
      setContextLoading(true);
      try {
        const docRefs = d.resolveDocReferences();
        const contextUrl = `/api/filemaker/social-posts/context${
          docRefs.length > 0 ? `?refs=${encodeURIComponent(docRefs.join(','))}` : ''
        }`;
        const contextAbort = new AbortController();
        const contextTimer = safeSetTimeout(() => contextAbort.abort(), 30_000);
        const contextResponse = await fetch(contextUrl, { signal: contextAbort.signal }).finally(
          () => safeClearTimeout(contextTimer)
        );
        if (!contextResponse.ok) {
          if (notify) {
            toast('Failed to load documentation context', { variant: 'error' });
          }
          return { summary: null, docCount: null, error: true };
        }
        const contextData = (await contextResponse.json()) as {
          context?: string;
          summary?: string;
          docCount?: number;
        };
        const summary = normalizeLoadedContextSummary(
          contextData.summary ?? contextData.context ?? null
        );
        if (!summary) {
          if (notify) {
            toast('No documentation context found', { variant: 'warning' });
          }
          return { summary: null, docCount: contextData.docCount ?? null };
        }
        d.setContextSummary(summary);
        if (persist) {
          try {
            if (useDirect) {
              await api.patch<SocialPublishingPost>(`/api/filemaker/social-posts/${d.activePost.id}`, {
                updates: { contextSummary: summary },
              });
            } else {
              await patchMutationRef.current.mutateAsync({
                id: d.activePost.id,
                updates: { contextSummary: summary },
              });
            }
          } catch {
            // Post may not exist server-side yet (e.g. pipeline runs before first save).
            // Context is already set in local state — persist failure is non-fatal.
          }
        }
        if (notify) {
          toast(
            `Loaded context from ${contextData.docCount ?? 0} document${
              contextData.docCount === 1 ? '' : 's'
            }`,
            { variant: 'success' }
          );
        }
        return { summary, docCount: contextData.docCount ?? null };
      } catch (error) {
        logSocialPublishingClientError(error, {
          source: 'AdminSocialPublishingPage',
          action: 'loadContext',
          ...depsRef.current.buildSocialContext({ error: true }),
        });
        if (notify) {
          toast('Failed to load documentation context', { variant: 'error' });
        }
        return { summary: null, docCount: null, error: true };
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
