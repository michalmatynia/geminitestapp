'use client';

import React from 'react';

import type { ClusterPreset } from '@/shared/lib/ai-paths';
import { Button, Input, Label, Textarea, SimpleSettingsList, Card } from '@/shared/ui';

import { usePresetsState, usePresetsActions } from '../context';
import { useClusterPresetsActions } from './hooks/useClusterPresetsActions';
import { AiPathsPillButton } from './AiPathsPillButton';

import type { ClusterPresetDraft } from '../context/PresetsContext';

export type { ClusterPresetDraft };

type ClusterPresetFieldProps = {
  htmlFor: string;
  label: string;
  children: React.ReactNode;
};

const clusterPresetFieldLabelClassName = 'text-[10px] uppercase text-gray-500';

function renderClusterPresetField({
  htmlFor,
  label,
  children,
}: ClusterPresetFieldProps): React.JSX.Element {
  return (
    <div>
      <Label htmlFor={htmlFor} className={clusterPresetFieldLabelClassName}>
        {label}
      </Label>
      {children}
    </div>
  );
}

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

  const updatePresetDraftField = React.useCallback(
    <Field extends keyof ClusterPresetDraft>(
      field: Field,
      value: ClusterPresetDraft[Field]
    ) => {
      setPresetDraft((prev: ClusterPresetDraft) => ({
        ...prev,
        [field]: value,
      }));
    },
    [setPresetDraft]
  );

  return (
    <>
      <Card variant='subtle' padding='md' className='bg-card/60'>
        <div className='mb-3 flex items-center justify-between text-sm font-semibold text-white'>
          <span>Cluster Presets</span>
          <div className='flex items-center gap-2'>
            <AiPathsPillButton
              className='text-gray-200'
              onClick={() => {
                handlePresetFromSelection();
              }}
            >
              From Selection
            </AiPathsPillButton>
            {editingPresetId && (
              <AiPathsPillButton className='text-gray-200' onClick={resetPresetDraft}>
                New
              </AiPathsPillButton>
            )}
          </div>
        </div>
        <div className='space-y-3 text-xs text-gray-300'>
          {renderClusterPresetField({
            htmlFor: nameFieldId,
            label: 'Name',
            children: (
            <Input
              id={nameFieldId}
              className='mt-2 w-full rounded-md border border-border bg-card/70 px-3 py-2 text-xs text-white'
              value={presetDraft.name}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                updatePresetDraftField('name', event.target.value)
              }
              aria-label={nameFieldId}
              title={nameFieldId}
            />
            ),
          })}
          {renderClusterPresetField({
            htmlFor: descriptionFieldId,
            label: 'Description',
            children: (
            <Textarea
              id={descriptionFieldId}
              className='mt-2 min-h-[64px] w-full rounded-md border border-border bg-card/70 text-xs text-white'
              value={presetDraft.description}
              onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
                updatePresetDraftField('description', event.target.value)
              }
              aria-label={descriptionFieldId}
              title={descriptionFieldId}
            />
            ),
          })}
          {renderClusterPresetField({
            htmlFor: bundlePortsFieldId,
            label: 'Bundle Ports (one per line)',
            children: (
            <Textarea
              id={bundlePortsFieldId}
              className='mt-2 min-h-[90px] w-full rounded-md border border-border bg-card/70 text-xs text-white'
              value={presetDraft.bundlePorts}
              onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
                updatePresetDraftField('bundlePorts', event.target.value)
              }
              aria-label={bundlePortsFieldId}
              title={bundlePortsFieldId}
            />
            ),
          })}
          {renderClusterPresetField({
            htmlFor: templateFieldId,
            label: 'Template',
            children: (
            <Textarea
              id={templateFieldId}
              className='mt-2 min-h-[90px] w-full rounded-md border border-border bg-card/70 text-xs text-white'
              value={presetDraft.template}
              onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
                updatePresetDraftField('template', event.target.value)
              }
              aria-label={templateFieldId}
              title={templateFieldId}
            />
            ),
          })}
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
                <AiPathsPillButton
                  className='text-gray-200'
                  onClick={() => loadPresetIntoDraft(item.original)}
                >
                  Edit
                </AiPathsPillButton>
                <AiPathsPillButton
                  inactiveClassName='border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/10'
                  onClick={() => {
                    handleApplyPreset(item.original);
                  }}
                >
                  Apply
                </AiPathsPillButton>
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
