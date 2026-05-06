import { useCallback } from 'react';

import { logClientError } from '@/shared/utils/observability/client-error-logger';

import {
  createFilemakerEmailCampaignSuppressionEntry,
  normalizeFilemakerEmailCampaignSuppressionRegistry,
  removeFilemakerEmailCampaignSuppressionEntryByAddress,
  upsertFilemakerEmailCampaignSuppressionEntry,
} from '../settings';
import type {
  CampaignEditActionContext,
  CampaignEditActions,
} from './AdminFilemakerCampaignEditPage.model-types';

type CampaignSuppressionActions = Pick<
  CampaignEditActions,
  'handleAddSuppressionEntry' | 'handleRemoveSuppressionEntry'
>;

const resolveCampaignId = (context: CampaignEditActionContext): string | null => {
  const campaignId = context.draftState.existingCampaign?.id ?? context.draftState.draft.id;
  if (campaignId.length > 0) return campaignId;
  return null;
};

export function useCampaignSuppressionActions(
  context: CampaignEditActionContext
): CampaignSuppressionActions {
  const handleAddSuppressionEntry = useCallback(async (): Promise<void> => {
    const normalizedEmail = context.draftState.suppressionEmailDraft.trim().toLowerCase();
    if (normalizedEmail.length === 0) {
      context.toast('Suppression email is required.', { variant: 'error' });
      return;
    }
    const normalizedNotes = context.draftState.suppressionNotesDraft.trim();
    const nextSuppressionRegistry = upsertFilemakerEmailCampaignSuppressionEntry({
      registry: normalizeFilemakerEmailCampaignSuppressionRegistry(context.registries.suppressionRegistry),
      entry: createFilemakerEmailCampaignSuppressionEntry({
        emailAddress: normalizedEmail,
        reason: context.draftState.suppressionReasonDraft,
        actor: 'admin',
        notes: normalizedNotes.length > 0 ? normalizedNotes : null,
        campaignId: resolveCampaignId(context),
      }),
    });
    try {
      await context.persistence.persistSuppressionRegistry(nextSuppressionRegistry);
      context.draftState.setSuppressionEmailDraft('');
      context.draftState.setSuppressionReasonDraft('manual_block');
      context.draftState.setSuppressionNotesDraft('');
      context.toast('Suppression entry saved.', { variant: 'success' });
    } catch (error: unknown) {
      logClientError(error);
      context.toast(error instanceof Error ? error.message : 'Failed to save suppression entry.', {
        variant: 'error',
      });
    }
  }, [context]);
  const handleRemoveSuppressionEntry = useCallback(
    async (emailAddress: string): Promise<void> => {
      const nextSuppressionRegistry = removeFilemakerEmailCampaignSuppressionEntryByAddress({
        registry: context.registries.suppressionRegistry,
        emailAddress,
      });
      try {
        await context.persistence.persistSuppressionRegistry(nextSuppressionRegistry);
        context.toast('Suppression entry removed.', { variant: 'success' });
      } catch (error: unknown) {
        logClientError(error);
        context.toast(error instanceof Error ? error.message : 'Failed to remove suppression entry.', {
          variant: 'error',
        });
      }
    },
    [context]
  );
  return { handleAddSuppressionEntry, handleRemoveSuppressionEntry };
}
