'use client';

import React from 'react';
import { Badge, Button, FormField, Input, SelectSimple } from '@/features/kangur/shared/ui';
import { KangurAdminCard } from '../../components/KangurAdminCard';
import { KANGUR_SOCIAL_CAPTURE_PRESETS } from '@/features/kangur/shared/social-capture-presets';
import { cn } from '@/shared/utils';

export function SocialSettingsCaptureTab({
  addonForm,
  setAddonForm,
  handleCreateAddon,
  createAddonMutationPending,
  batchCaptureBaseUrl,
  setBatchCaptureBaseUrl,
  batchCapturePresetLimit,
  setBatchCapturePresetLimit,
  batchCapturePresetIds,
  handleToggleCapturePreset,
  selectAllCapturePresets,
  clearCapturePresets,
  handleBatchCapture,
  batchCaptureMutationPending,
  batchCaptureResult,
  batchCaptureLimitSummary,
}: {
  addonForm: { title: string; prompt: string };
  setAddonForm: React.Dispatch<React.SetStateAction<{ title: string; prompt: string }>>;
  handleCreateAddon: () => void;
  createAddonMutationPending: boolean;
  batchCaptureBaseUrl: string;
  setBatchCaptureBaseUrl: (val: string) => void;
  batchCapturePresetLimit: number;
  setBatchCapturePresetLimit: (val: number) => void;
  batchCapturePresetIds: string[];
  handleToggleCapturePreset: (id: string) => void;
  selectAllCapturePresets: () => void;
  clearCapturePresets: () => void;
  handleBatchCapture: () => void;
  batchCaptureMutationPending: boolean;
  batchCaptureResult: any;
  batchCaptureLimitSummary: string;
}) {
  return (
    <div className='space-y-4'>
      <KangurAdminCard>
        <div className='space-y-3'>
          <div>
            <div className='text-sm font-semibold text-foreground'>Capture single add-on</div>
            <div className='text-sm text-muted-foreground'>Create reusable visuals for any StudiQ Social post.</div>
          </div>
          <div className='grid gap-3 lg:grid-cols-2'>
            <Input
              placeholder='Add-on title'
              value={addonForm.title}
              onChange={(e) => setAddonForm((prev) => ({ ...prev, title: e.target.value }))}
              aria-label='Add-on title'
            />
            <Input
              placeholder='Add-on prompt'
              value={addonForm.prompt}
              onChange={(e) => setAddonForm((prev) => ({ ...prev, prompt: e.target.value }))}
              aria-label='Add-on prompt'
            />
          </div>
          <Button type='button' size='sm' onClick={handleCreateAddon} disabled={!addonForm.title || !addonForm.prompt || createAddonMutationPending}>
            {createAddonMutationPending ? 'Creating...' : 'Create single add-on'}
          </Button>
        </div>
      </KangurAdminCard>

      <KangurAdminCard>
        <div className='space-y-3'>
          <div>
            <div className='text-sm font-semibold text-foreground'>Batch capture preview</div>
            <div className='text-sm text-muted-foreground'>Capture multiple presets at once for the current post.</div>
          </div>
          <div className='grid gap-3 lg:grid-cols-3'>
            <FormField label='Base URL override' description='Optional local/preview URL.'>
              <Input
                type='url'
                placeholder='https://example.com'
                value={batchCaptureBaseUrl}
                onChange={(e) => setBatchCaptureBaseUrl(e.target.value)}
                size='sm'
              />
            </FormField>
            <FormField label='Capture limit' description='Max concurrent captures.'>
              <SelectSimple
                value={String(batchCapturePresetLimit)}
                onValueChange={(val) => setBatchCapturePresetLimit(Number(val))}
                options={['5', '10', '20', '50'].map((v) => ({ value: v, label: v }))}
                size='sm'
              />
            </FormField>
          </div>
          <div className='space-y-2'>
            <div className='flex items-center justify-between'>
              <div className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>Presets ({batchCapturePresetIds.length})</div>
              <div className='flex items-center gap-2'>
                <Button type='button' variant='ghost' size='xs' onClick={selectAllCapturePresets}>Select all</Button>
                <Button type='button' variant='ghost' size='xs' onClick={clearCapturePresets}>Clear</Button>
              </div>
            </div>
            <div className='flex flex-wrap gap-2 rounded-xl border border-border/60 bg-background/40 p-3'>
              {KANGUR_SOCIAL_CAPTURE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type='button'
                  onClick={() => handleToggleCapturePreset(preset.id)}
                  className={cn(
                    'inline-flex items-center rounded-lg border px-2 py-1 text-[11px] font-medium transition-colors',
                    batchCapturePresetIds.includes(preset.id) ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground hover:bg-muted'
                  )}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>
          <div className='flex flex-wrap items-center gap-3'>
            <Button type='button' size='sm' onClick={handleBatchCapture} disabled={batchCapturePresetIds.length === 0 || batchCaptureMutationPending}>
              {batchCaptureMutationPending ? 'Capturing...' : 'Launch batch capture'}
            </Button>
            <div className='text-xs text-muted-foreground'>{batchCaptureLimitSummary}</div>
          </div>
          {batchCaptureResult && (
            <div className='rounded-xl border border-border/60 bg-background/40 p-3 text-xs'>
              <div className='font-semibold text-foreground'>Last batch: {batchCaptureResult.batchId}</div>
              <div className='mt-1 text-muted-foreground'>
                Completed: {batchCaptureResult.completedCount} • Failed: {batchCaptureResult.failedCount} • Total: {batchCaptureResult.totalCount}
              </div>
            </div>
          )}
        </div>
      </KangurAdminCard>
    </div>
  );
}
