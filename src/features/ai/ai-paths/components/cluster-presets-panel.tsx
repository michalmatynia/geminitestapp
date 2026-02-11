'use client';

import type { ClusterPreset } from '@/features/ai/ai-paths/lib';
import { Button, Input, Label, Textarea } from '@/shared/ui';

import { usePresetsState, usePresetsActions } from '../context';
import { useAiPathsSettingsOrchestrator } from './ai-paths-settings/AiPathsSettingsOrchestratorContext';

export type ClusterPresetDraft = {
  name: string;
  description: string;
  bundlePorts: string;
  template: string;
};

export function ClusterPresetsPanel(): React.JSX.Element {
  // --- Context Hooks ---
  const orchestrator = useAiPathsSettingsOrchestrator();
  const { presetDraft: presetDraftContext, editingPresetId, clusterPresets } = usePresetsState();
  const { setPresetDraft: setPresetDraftContext, resetPresetDraft, loadPresetIntoDraft } = usePresetsActions();

  const presetDraft = presetDraftContext;
  const setPresetDraft = setPresetDraftContext;
  const handlePresetFromSelection = orchestrator.handlePresetFromSelection;
  const handleSavePreset = (): void => {
    void orchestrator.handleSavePreset().catch(() => {});
  };
  const handleApplyPreset = orchestrator.handleApplyPreset;
  const handleDeletePreset = (presetId: string): void => {
    void orchestrator.handleDeletePreset(presetId).catch(() => {});
  };
  const handleExportPresets = orchestrator.handleExportPresets;

  return (
    <div className='rounded-lg border border-border bg-card/60 p-4'>
      <div className='mb-3 flex items-center justify-between text-sm font-semibold text-white'>
        <span>Cluster Presets</span>
        <div className='flex items-center gap-2'>
          <Button
            type='button'
            className='rounded-md border px-2 py-1 text-[10px] text-gray-200 hover:bg-muted/60'
            onClick={handlePresetFromSelection}
          >
            From Selection
          </Button>
          {editingPresetId && (
            <Button
              type='button'
              className='rounded-md border px-2 py-1 text-[10px] text-gray-200 hover:bg-muted/60'
              onClick={resetPresetDraft}
            >
              New
            </Button>
          )}
        </div>
      </div>
      <div className='space-y-3 text-xs text-gray-300'>
        <div>
          <Label className='text-[10px] uppercase text-gray-500'>Name</Label>
          <Input
            className='mt-2 w-full rounded-md border border-border bg-card/70 px-3 py-2 text-xs text-white'
            value={presetDraft.name}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              setPresetDraft((prev: ClusterPresetDraft) => ({ ...prev, name: event.target.value }))
            }
          />
        </div>
        <div>
          <Label className='text-[10px] uppercase text-gray-500'>Description</Label>
          <Textarea
            className='mt-2 min-h-[64px] w-full rounded-md border border-border bg-card/70 text-xs text-white'
            value={presetDraft.description}
            onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
              setPresetDraft((prev: ClusterPresetDraft) => ({ ...prev, description: event.target.value }))
            }
          />
        </div>
        <div>
          <Label className='text-[10px] uppercase text-gray-500'>
            Bundle Ports (one per line)
          </Label>
          <Textarea
            className='mt-2 min-h-[90px] w-full rounded-md border border-border bg-card/70 text-xs text-white'
            value={presetDraft.bundlePorts}
            onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
              setPresetDraft((prev: ClusterPresetDraft) => ({ ...prev, bundlePorts: event.target.value }))
            }
          />
        </div>
        <div>
          <Label className='text-[10px] uppercase text-gray-500'>Template</Label>
          <Textarea
            className='mt-2 min-h-[90px] w-full rounded-md border border-border bg-card/70 text-xs text-white'
            value={presetDraft.template}
            onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
              setPresetDraft((prev: ClusterPresetDraft) => ({ ...prev, template: event.target.value }))
            }
          />
        </div>
        <Button
          className='w-full rounded-md border border-emerald-500/40 text-xs text-emerald-200 hover:bg-emerald-500/10'
          type='button'
          onClick={handleSavePreset}
        >
          {editingPresetId ? 'Update Preset' : 'Save Preset'}
        </Button>
      </div>
      <div className='mt-4 space-y-2 text-xs text-gray-400'>
        <div className='text-[11px] uppercase text-gray-500'>Library</div>
        {clusterPresets.length === 0 && (
          <div className='rounded-md border border-border bg-card/50 p-3 text-[11px] text-gray-500'>
            No presets yet. Save a bundle + template pair to reuse across apps.
          </div>
        )}
        {clusterPresets.map((preset: ClusterPreset) => (
          <div
            key={preset.id}
            className='rounded-md border border-border bg-card/50 p-3'
          >
            <div className='flex items-center justify-between gap-2'>
              <div>
                <div className='text-xs font-semibold text-white'>{preset.name}</div>
                {preset.description && (
                  <div className='text-[11px] text-gray-500'>{preset.description}</div>
                )}
              </div>
              <div className='flex items-center gap-2'>
                <Button
                  type='button'
                  className='rounded-md border px-2 py-1 text-[10px] text-gray-200 hover:bg-muted/60'
                  onClick={() => loadPresetIntoDraft(preset)}
                >
                  Edit
                </Button>
                <Button
                  type='button'
                  className='rounded-md border border-emerald-500/40 px-2 py-1 text-[10px] text-emerald-200 hover:bg-emerald-500/10'
                  onClick={() => handleApplyPreset(preset)}
                >
                  Apply
                </Button>
                <Button
                  type='button'
                  className='rounded-md border border-rose-500/40 px-2 py-1 text-[10px] text-rose-200 hover:bg-rose-500/10'
                  onClick={() => handleDeletePreset(preset.id)}
                >
                  Delete
                </Button>
              </div>
            </div>
            <div className='mt-2 text-[10px] text-gray-500'>
              Updated: {new Date(preset.updatedAt).toLocaleString()}
            </div>
          </div>
        ))}
        <Button
          type='button'
          className='w-full rounded-md border text-xs text-white hover:bg-muted/60'
          onClick={handleExportPresets}
        >
          Export / Import
        </Button>
      </div>
    </div>
  );
}
