'use client';

import React from 'react';
import { Button, Card, Input } from '@/shared/ui/primitives.public';
import { FormField, Hint, ToggleRow } from '@/shared/ui/forms-and-actions.public';
import { SectionHeader } from '@/shared/ui/navigation-and-layout.public';
import {
  useImportExportState,
} from '@/features/data-import-export/context/ImportExportContext';
import {
  getDefaultImageRetryPresets,
  withImageRetryPresetLabels,
} from '@/features/data-import-export/utils/image-retry-presets';
import type { ImageRetryPreset } from '@/shared/contracts/integrations/base';

export function ExportImageRetryPresetsSection(): React.JSX.Element {
  const { imageRetryPresets, setImageRetryPresets } = useImportExportState();

  const imageRetryPresetsLoaded = true;

  const updateImageRetryPreset = (
    presetId: string,
    update: Partial<ImageRetryPreset['transform']>
  ): void => {
    setImageRetryPresets((prev: ImageRetryPreset[]) =>
      prev.map((preset: ImageRetryPreset) => {
        if (preset.id !== presetId) return preset;
        const nextPreset = withImageRetryPresetLabels({
          ...preset,
          transform: {
            ...preset.transform,
            ...update,
          },
        });
        return nextPreset;
      })
    );
  };

  const handleResetImageRetryPresets = (): void => {
    setImageRetryPresets(getDefaultImageRetryPresets());
  };

  return (
    <Card className='border-border/60 bg-card/40 p-4'>
      <SectionHeader
        title='Image retry presets'
        description='Used by Retry image export and Re-export images only actions.'
        size='xs'
        actions={
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={handleResetImageRetryPresets}
            disabled={!imageRetryPresetsLoaded}
          >
            Reset defaults
          </Button>
        }
      />
      {!imageRetryPresetsLoaded ? (
        <Hint className='mt-3'>Loading presets...</Hint>
      ) : (
        <div className='mt-3 space-y-3'>
          {imageRetryPresets.map((preset: ImageRetryPreset) => (
            <div key={preset.id} className='rounded-md border border-border/60 bg-card/30 p-3'>
              <div className='text-xs font-semibold text-gray-200'>{preset.name}</div>
              <Hint className='mt-1'>{preset.description}</Hint>
              <div className='mt-2 grid gap-3 md:grid-cols-2'>
                <FormField label='Max dimension (px)'>
                  <Input
                    type='number'
                    min={1}
                    value={preset.transform?.maxDimension ?? ''}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                      const raw = event.target.value;
                      updateImageRetryPreset(preset.id, {
                        maxDimension: raw ? Number(raw) : undefined,
                        width: raw ? Number(raw) : undefined,
                        height: raw ? Number(raw) : undefined,
                      });
                    }}
                    className='h-8'
                    aria-label='Max dimension (px)'
                    title='Max dimension (px)'
                  />
                </FormField>
                <FormField label='JPEG quality'>
                  <Input
                    type='number'
                    min={10}
                    max={100}
                    value={preset.transform?.jpegQuality ?? ''}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                      const raw = event.target.value;
                      updateImageRetryPreset(preset.id, {
                        jpegQuality: raw ? Number(raw) : undefined,
                        quality: raw ? Number(raw) : undefined,
                      });
                    }}
                    className='h-8'
                    aria-label='JPEG quality'
                    title='JPEG quality'
                  />
                </FormField>
              </div>
              <ToggleRow
                label='Force JPEG conversion'
                checked={preset.transform?.forceJpeg ?? true}
                onCheckedChange={(checked: boolean) =>
                  updateImageRetryPreset(preset.id, { forceJpeg: checked })
                }
                className='mt-2 border-none bg-transparent hover:bg-transparent p-0'
              />
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
