'use client';

import { useCallback } from 'react';

import type { ClusterPreset } from '@/shared/contracts/ai-paths';
import { useConfirm } from '@/shared/hooks/ui/useConfirm';
import { CLUSTER_PRESETS_KEY, createPresetId } from '@/shared/lib/ai-paths';
import { updateAiPathsSetting } from '@/shared/lib/ai-paths/settings-store-client';
import { useToast } from '@/shared/ui';

import { usePresetsActions, usePresetsState } from '../../context';
import { useAiPathsErrorState } from '../ai-paths-settings/hooks/useAiPathsErrorState';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


export function usePresetsImport() {
  const { toast } = useToast();
  const { confirm, ConfirmationModal } = useConfirm();
  const { clusterPresets, presetsJson } = usePresetsState();
  const presetsActions = usePresetsActions();
  const { reportAiPathsError } = useAiPathsErrorState({ toast });

  const saveClusterPresets = useCallback(
    async (nextPresets: ClusterPreset[]): Promise<void> => {
      try {
        await updateAiPathsSetting(CLUSTER_PRESETS_KEY, JSON.stringify(nextPresets));
      } catch (error: unknown) {
        logClientError(error);
        reportAiPathsError(error, { action: 'saveClusterPresets' }, 'Failed to save presets:');
        toast('Failed to save cluster presets.', { variant: 'error' });
      }
    },
    [reportAiPathsError, toast]
  );

  const handleImportPresets = useCallback(
    async (mode: 'merge' | 'replace'): Promise<void> => {
      if (!presetsJson.trim()) {
        toast('Paste presets JSON to import.', { variant: 'error' });
        return;
      }

      const performImport = async (): Promise<void> => {
        try {
          const parsed = JSON.parse(presetsJson) as unknown;
          const list = (
            Array.isArray(parsed)
              ? parsed
              : parsed &&
                  typeof parsed === 'object' &&
                  'presets' in (parsed as Record<string, unknown>)
                ? (parsed as Record<string, unknown>)['presets']
                : null
          ) as unknown[] | null;
          if (!list) {
            toast('Invalid presets JSON. Expected an array.', { variant: 'error' });
            return;
          }
          const normalized = list.map(
            (item: unknown): ClusterPreset =>
              presetsActions.normalizeClusterPreset(item as Partial<ClusterPreset>)
          );
          let nextPresets = mode === 'replace' ? [] : [...clusterPresets];
          const existingIds = new Set(
            nextPresets.map((preset: ClusterPreset): string => preset.id)
          );
          const merged = normalized.map((preset: ClusterPreset): ClusterPreset => {
            if (existingIds.has(preset.id)) {
              return { ...preset, id: createPresetId(), updatedAt: new Date().toISOString() };
            }
            return preset;
          });
          nextPresets = [...nextPresets, ...merged];
          presetsActions.setClusterPresets(nextPresets);
          await saveClusterPresets(nextPresets);
          toast('Presets imported.', { variant: 'success' });
        } catch (error: unknown) {
          logClientError(error);
          reportAiPathsError(error, { action: 'importPresets' }, 'Failed to import presets:');
          toast('Failed to import presets. Check JSON format.', { variant: 'error' });
        }
      };

      if (mode === 'replace') {
        confirm({
          title: 'Replace Presets?',
          message: 'Replace existing presets? This cannot be undone.',
          confirmText: 'Replace All',
          isDangerous: true,
          onConfirm: performImport,
        });
        return;
      }

      await performImport();
    },
    [presetsJson, clusterPresets, presetsActions, toast, confirm, reportAiPathsError, saveClusterPresets]
  );

  return { handleImportPresets, ConfirmationModal };
}
