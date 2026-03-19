'use client';

import { useState } from 'react';

import { useToast } from '@/features/kangur/shared/ui';
import {
  useApplyKangurSocialDocUpdates,
  useGenerateKangurSocialPost,
  usePreviewKangurSocialDocUpdates,
} from '@/features/kangur/ui/hooks/useKangurSocialPosts';
import {
  logKangurClientError,
  trackKangurClientEvent,
} from '@/features/kangur/observability/client';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system-client';
import type {
  KangurSocialDocUpdatesResponse,
  KangurSocialPost,
} from '@/shared/contracts/kangur-social-posts';

type SocialGenerationDeps = {
  activePost: KangurSocialPost | null;
  resolveDocReferences: () => string[];
  generationNotes: string;
  brainModelId: string | null;
  visionModelId: string | null;
  canGenerateDraft: boolean;
  generateDraftBlockedReason: string | null;
  imageAddonIds: string[];
  projectUrl: string;
  buildSocialContext: (overrides?: Record<string, unknown>) => Record<string, unknown>;
};

export function useSocialGeneration(deps: SocialGenerationDeps) {
  const { toast } = useToast();
  const generateMutation = useGenerateKangurSocialPost();
  const previewDocUpdatesMutation = usePreviewKangurSocialDocUpdates();
  const applyDocUpdatesMutation = useApplyKangurSocialDocUpdates();
  const [docUpdatesResult, setDocUpdatesResult] =
    useState<KangurSocialDocUpdatesResponse | null>(null);

  const handleGenerate = async (): Promise<void> => {
    if (!deps.canGenerateDraft) {
      toast(
        deps.generateDraftBlockedReason ??
          'Assign an AI Brain model for StudiQ Social Post Generation first.',
        { variant: 'warning' }
      );
      return;
    }
    if (!deps.activePost) return;
    trackKangurClientEvent(
      'kangur_social_post_generate_attempt',
      deps.buildSocialContext()
    );
    try {
      await generateMutation.mutateAsync({
        postId: deps.activePost.id,
        docReferences: deps.resolveDocReferences(),
        notes: deps.generationNotes,
        imageAddonIds: deps.imageAddonIds,
        projectUrl: deps.projectUrl || undefined,
      });
      setDocUpdatesResult(null);
      trackKangurClientEvent(
        'kangur_social_post_generate_success',
        deps.buildSocialContext()
      );
    } catch (error) {
      void ErrorSystem.captureException(error);
      logKangurClientError(error, {
        source: 'AdminKangurSocialPage',
        action: 'generatePost',
        ...deps.buildSocialContext(),
      });
      trackKangurClientEvent(
        'kangur_social_post_generate_failed',
        deps.buildSocialContext({ error: true })
      );
    }
  };

  const handlePreviewDocUpdates = async (): Promise<void> => {
    if (!deps.activePost) return;
    trackKangurClientEvent(
      'kangur_social_doc_updates_preview_attempt',
      deps.buildSocialContext()
    );
    try {
      const result = await previewDocUpdatesMutation.mutateAsync(deps.activePost.id);
      setDocUpdatesResult(result);
      const fileCount = result.plan.files.length;
      const updateCount = result.plan.items.length;
      toast(
        `Documentation preview ready (${fileCount} file${fileCount === 1 ? '' : 's'}, ${updateCount} update${updateCount === 1 ? '' : 's'})`,
        { variant: 'success' }
      );
      trackKangurClientEvent(
        'kangur_social_doc_updates_preview_success',
        deps.buildSocialContext({ fileCount, updateCount })
      );
    } catch (error) {
      void ErrorSystem.captureException(error);
      logKangurClientError(error, {
        source: 'AdminKangurSocialPage',
        action: 'previewDocUpdates',
        ...deps.buildSocialContext({ error: true }),
      });
      toast('Failed to preview documentation updates', { variant: 'error' });
      trackKangurClientEvent(
        'kangur_social_doc_updates_preview_failed',
        deps.buildSocialContext({ error: true })
      );
    }
  };

  const handleApplyDocUpdates = async (): Promise<void> => {
    if (!deps.activePost) return;
    trackKangurClientEvent(
      'kangur_social_doc_updates_apply_attempt',
      deps.buildSocialContext()
    );
    try {
      const result = await applyDocUpdatesMutation.mutateAsync(deps.activePost.id);
      setDocUpdatesResult(result);
      const appliedFiles = result.plan.files.filter((file) => file.applied).length;
      const updateCount = result.plan.items.length;
      toast(
        `${appliedFiles > 0 ? 'Documentation updated' : 'No documentation changes applied'} (${appliedFiles} file${appliedFiles === 1 ? '' : 's'} updated, ${updateCount} update${updateCount === 1 ? '' : 's'})`,
        { variant: appliedFiles > 0 ? 'success' : 'warning' }
      );
      trackKangurClientEvent(
        'kangur_social_doc_updates_apply_success',
        deps.buildSocialContext({ appliedFiles, updateCount })
      );
    } catch (error) {
      void ErrorSystem.captureException(error);
      logKangurClientError(error, {
        source: 'AdminKangurSocialPage',
        action: 'applyDocUpdates',
        ...deps.buildSocialContext({ error: true }),
      });
      toast('Failed to apply documentation updates', { variant: 'error' });
      trackKangurClientEvent(
        'kangur_social_doc_updates_apply_failed',
        deps.buildSocialContext({ error: true })
      );
    }
  };

  return {
    generateMutation,
    previewDocUpdatesMutation,
    applyDocUpdatesMutation,
    docUpdatesResult,
    setDocUpdatesResult,
    handleGenerate,
    handlePreviewDocUpdates,
    handleApplyDocUpdates,
  };
}
