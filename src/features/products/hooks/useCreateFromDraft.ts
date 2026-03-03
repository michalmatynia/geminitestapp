'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { draftKeys } from '@/features/drafter/hooks/useDraftQueries';
import type { ProductDraftDto } from '@/shared/contracts/products';
import { api } from '@/shared/lib/api-client';
import { fetchQueryV2 } from '@/shared/lib/query-factories-v2';
import { normalizeQueryKey } from '@/shared/lib/query-key-utils';
import { useToast } from '@/shared/ui';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

type UseCreateFromDraftProps = {
  setCreateDraft: (draft: ProductDraftDto | null) => void;
  handleOpenCreateFromDraft: (draft: ProductDraftDto) => void;
};

export function useCreateFromDraft({
  setCreateDraft,
  handleOpenCreateFromDraft,
}: UseCreateFromDraftProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleCreateFromDraft = useCallback(
    async (draftId: string) => {
      try {
        const draft = await fetchQueryV2<ProductDraftDto>(queryClient, {
          queryKey: normalizeQueryKey(draftKeys.detail(draftId)),
          queryFn: () =>
            api.get<ProductDraftDto>(`/api/drafts/${draftId}`, {
              timeout: 30_000,
            }),
          staleTime: 5 * 60 * 1000,
          meta: {
            source: 'products.hooks.useCreateFromDraft',
            operation: 'detail',
            resource: 'drafts.detail',
            domain: 'drafter',
            queryKey: normalizeQueryKey(draftKeys.detail(draftId)),
            tags: ['drafts', 'detail', 'fetch'],
          },
        })();
        setCreateDraft(draft);
        handleOpenCreateFromDraft(draft);
        toast(`Creating product from draft: ${draft.name}`, { variant: 'success' });
      } catch (error) {
        logClientError(error, {
          context: { source: 'useCreateFromDraft', action: 'createFromDraft', draftId },
        });
        toast('Failed to load draft template', { variant: 'error' });
      }
    },
    [queryClient, setCreateDraft, handleOpenCreateFromDraft, toast]
  );

  return { handleCreateFromDraft };
}
