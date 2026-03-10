'use client';

import React from 'react';

import type { ClusterPreset } from '@/shared/lib/ai-paths';
import { Button, Input, Label, Textarea, SimpleSettingsList, Card } from '@/shared/ui';


import { usePresetsState, usePresetsActions } from '../context';
import { useClusterPresetsActions } from './hooks/useClusterPresetsActions';

import type { ClusterPresetDraft } from '../context/PresetsContext';

export type { ClusterPresetDraft };

export function ClusterPresetsPanel(): React.JSX.Element {
  const nameFieldId = React.useId();
  const descriptionFieldId = React.useId();
  const bundlePortsFieldId = React.useId();
  const templateFieldId = React.useId();
  const { presetDraft, editingPresetId, clusterPresets } = usePresetsState();
  const { setPresetDraft, resetPresetDraft, loadPresetIntoDraft } = usePresetsActions();
  const {
    handlePresetFromSelection,
    handleSavePreset,
    handleApplyPreset,
    handleDeletePreset,
    handleExportPresets,
    ConfirmationModal,
  } = useClusterPresetsActions();

  return (
    <>
      <Card variant='subtle' padding='md' className='bg-card/60'>
        <div className='mb-3 flex items-center justify-between text-sm font-semibold text-white'>
          <span>Cluster Presets</span>
          <div className='flex items-center gap-2'>
            <Button
              type='button'
              className='rounded-md border px-2 py-1 text-[10px] text-gray-200 hover:bg-muted/60'
              onClick={() => {
                handlePresetFromSelection();
              }}
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
            <Label htmlFor={nameFieldId} className='text-[10px] uppercase text-gray-500'>
              Name
            </Label>
            <Input
              id={nameFieldId}
              className='mt-2 w-full rounded-md border border-border bg-card/70 px-3 py-2 text-xs text-white'
              value={presetDraft.name}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setPresetDraft((prev: ClusterPresetDraft) => ({ ...prev, name: event.target.value }))
              }
            />
          </div>
          <div>
            <Label htmlFor={descriptionFieldId} className='text-[10px] uppercase text-gray-500'>
              Description
            </Label>
            <Textarea
              id={descriptionFieldId}
              className='mt-2 min-h-[64px] w-full rounded-md border border-border bg-card/70 text-xs text-white'
              value={presetDraft.description}
              onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
                setPresetDraft((prev: ClusterPresetDraft) => ({
                  ...prev,
                  description: event.target.value,
                }))
              }
            />
          </div>
          <div>
            <Label htmlFor={bundlePortsFieldId} className='text-[10px] uppercase text-gray-500'>
              Bundle Ports (one per line)
            </Label>
            <Textarea
              id={bundlePortsFieldId}
              className='mt-2 min-h-[90px] w-full rounded-md border border-border bg-card/70 text-xs text-white'
              value={presetDraft.bundlePorts}
              onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
                setPresetDraft((prev: ClusterPresetDraft) => ({
                  ...prev,
                  bundlePorts: event.target.value,
                }))
              }
            />
          </div>
          <div>
            <Label htmlFor={templateFieldId} className='text-[10px] uppercase text-gray-500'>
              Template
            </Label>
            <Textarea
              id={templateFieldId}
              className='mt-2 min-h-[90px] w-full rounded-md border border-border bg-card/70 text-xs text-white'
              value={presetDraft.template}
              onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
                setPresetDraft((prev: ClusterPresetDraft) => ({
                  ...prev,
                  template: event.target.value,
                }))
              }
            />
          </div>
          <Button
            className='w-full rounded-md border border-emerald-500/40 text-xs text-emerald-200 hover:bg-emerald-500/10'
            type='button'
            onClick={() => {
              handleSavePreset().catch(() => undefined);
            }}
          >
            {editingPresetId ? 'Update Preset' : 'Save Preset'}
          </Button>
        </div>
        <div className='mt-4 space-y-2 text-xs text-gray-400'>
          <div className='text-[11px] uppercase text-gray-500'>Library</div>

          <SimpleSettingsList
            items={clusterPresets.map((preset: ClusterPreset) => ({
              id: preset.id,
              title: preset.name,
              description: preset.description,
              subtitle: `Updated: ${new Date(preset.updatedAt).toLocaleString()}`,
              original: preset,
            }))}
            emptyMessage='No presets yet. Save a bundle + template pair to reuse across apps.'
            renderActions={(item) => (
              <div className='flex items-center gap-2'>
                <Button
                  type='button'
                  className='rounded-md border px-2 py-1 text-[10px] text-gray-200 hover:bg-muted/60'
                  onClick={() => loadPresetIntoDraft(item.original)}
                >
                  Edit
                </Button>
                <Button
                  type='button'
                  className='rounded-md border border-emerald-500/40 px-2 py-1 text-[10px] text-emerald-200 hover:bg-emerald-500/10'
                  onClick={() => {
                    handleApplyPreset(item.original);
                  }}
                >
                  Apply
                </Button>
              </div>
            )}
            onDelete={(item) => {
              void handleDeletePreset(item.original.id);
            }}
          />
          <Button
            type='button'
            className='w-full rounded-md border text-xs text-white hover:bg-muted/60'
            onClick={() => {
              handleExportPresets();
            }}
          >
            Export / Import
          </Button>
        </div>
      </Card>
      <ConfirmationModal />
    </>
  );
}
