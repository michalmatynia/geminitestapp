'use client';

import Link from 'next/link';
import { useCallback, useMemo } from 'react';

import {
  IMAGE_STUDIO_UI_ACTIVE_KEY,
  IMAGE_STUDIO_UI_PRESETS_KEY,
  parseImageStudioUiPresets,
  type ImageStudioUiPreset,
} from '@/features/ai/image-studio/utils/ui-presets';
import { useSettingsMap, useUpdateSetting } from '@/shared/hooks/use-settings';
import { Button, Label, Textarea, SelectSimple, useToast, Card, EmptyState } from '@/shared/ui';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { parseJsonSetting, serializeSetting } from '@/shared/utils/settings-json';

export function AdminImageStudioUiPresetsPage(): React.JSX.Element {
  const { toast } = useToast();
  const heavySettings = useSettingsMap({ scope: 'heavy' });
  const updateSetting = useUpdateSetting();

  const heavyMap = heavySettings.data ?? new Map<string, string>();
  const presetsRaw = heavyMap.get(IMAGE_STUDIO_UI_PRESETS_KEY);
  const activeRaw = heavyMap.get(IMAGE_STUDIO_UI_ACTIVE_KEY);

  const presets = useMemo(() => {
    return parseImageStudioUiPresets(presetsRaw);
  }, [presetsRaw]);

  const activeId = useMemo(() => {
    return parseJsonSetting<string | null>(activeRaw, null) ?? '';
  }, [activeRaw]);

  const handleSetActive = useCallback(
    async (id: string): Promise<void> => {
      try {
        await updateSetting.mutateAsync({
          key: IMAGE_STUDIO_UI_ACTIVE_KEY,
          value: serializeSetting(id),
        });
        toast('Active UI preset updated.', { variant: 'success' });
      } catch (error) {
        logClientError(error, {
          context: { source: 'AdminImageStudioUiPresetsPage', action: 'setActive' },
        });
        toast('Failed to update active UI preset.', { variant: 'error' });
      }
    },
    [toast, updateSetting]
  );

  const handleDelete = useCallback(
    async (id: string): Promise<void> => {
      const next = presets.filter((preset: ImageStudioUiPreset) => preset.id !== id);
      const nextActive = activeId === id ? '' : activeId;
      try {
        await updateSetting.mutateAsync({
          key: IMAGE_STUDIO_UI_PRESETS_KEY,
          value: serializeSetting(next),
        });
        await updateSetting.mutateAsync({
          key: IMAGE_STUDIO_UI_ACTIVE_KEY,
          value: serializeSetting(nextActive || null),
        });
        toast('UI preset deleted.', { variant: 'success' });
      } catch (error) {
        logClientError(error, {
          context: { source: 'AdminImageStudioUiPresetsPage', action: 'deletePreset' },
        });
        toast('Failed to delete UI preset.', { variant: 'error' });
      }
    },
    [activeId, presets, toast, updateSetting]
  );

  const empty = presets.length === 0;
  const activePreset =
    presets.find((preset: ImageStudioUiPreset) => preset.id === activeId) ?? null;
  const activePresetOptions = useMemo(
    () => [
      { value: '__none__', label: 'Select an active preset' },
      ...presets.map((preset: ImageStudioUiPreset) => ({ value: preset.id, label: preset.name })),
    ],
    [presets]
  );

  return (
    <div className='container mx-auto max-w-5xl py-6'>
      <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
        <div>
          <div className='text-lg text-gray-100'>Image Studio UI Presets</div>
          <div className='text-xs text-gray-500'>Manage saved UI control layouts and defaults.</div>
        </div>
        <div className='flex items-center gap-2 text-xs'>
          <Link href='/admin/image-studio' className='text-gray-300 hover:text-white'>
            Back to Studio
          </Link>
          <Link href='/admin/image-studio?tab=settings' className='text-gray-400 hover:text-white'>
            Settings
          </Link>
        </div>
      </div>

      <Card variant='subtle' padding='lg' className='border-border/60 bg-card/40 space-y-4'>
        <div className='space-y-1'>
          <Label className='text-xs text-gray-400'>Active UI preset</Label>
          <SelectSimple
            size='sm'
            value={activeId || '__none__'}
            onValueChange={(value: string) => {
              if (value === '__none__') return;
              void handleSetActive(value);
            }}
            options={activePresetOptions}
            className='max-w-md'
            placeholder='Select an active preset'
            triggerClassName='h-9'
            ariaLabel='Active UI preset'
          />
          {activePreset ? (
            <div className='text-[11px] text-gray-500'>
              Active: <span className='text-gray-300'>{activePreset.name}</span>
            </div>
          ) : null}
        </div>

        {empty ? (
          <EmptyState
            title='No presets'
            description='No UI presets saved yet. Save a UI from the Image Studio right panel.'
            variant='compact'
            className='border-dashed border-border py-8'
          />
        ) : (
          <div className='grid gap-4 md:grid-cols-2'>
            {presets.map((preset: ImageStudioUiPreset) => (
              <Card
                key={preset.id}
                variant='subtle-compact'
                padding='sm'
                className='border-border bg-card/50'
              >
                <div className='flex items-start justify-between gap-3'>
                  <div>
                    <div className='text-sm text-gray-100'>{preset.name}</div>
                    {preset.description ? (
                      <div className='mt-1 text-[11px] text-gray-400'>{preset.description}</div>
                    ) : null}
                    <div className='mt-2 text-[11px] text-gray-500'>
                      Params: {Object.keys(preset.params ?? {}).length}
                    </div>
                    <div className='text-[11px] text-gray-500'>Updated: {preset.updatedAt}</div>
                  </div>
                  <div className='flex flex-col gap-2'>
                    <Button
                      size='xs'
                      variant={activeId === preset.id ? 'default' : 'outline'}
                      onClick={() => void handleSetActive(preset.id)}
                    >
                      {activeId === preset.id ? 'Active' : 'Set active'}
                    </Button>
                    <Button
                      size='sm'
                      variant='outline'
                      onClick={() => void handleDelete(preset.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
                <Card
                  variant='subtle-compact'
                  padding='sm'
                  className='mt-3 border-border bg-card/60'
                >
                  <div className='text-[11px] text-gray-400'>Param UI overrides</div>
                  <Textarea
                    size='sm'
                    readOnly
                    className='mt-1 h-20 font-mono text-[10px]'
                    value={JSON.stringify(preset.paramUiOverrides ?? {}, null, 2)}
                  />
                </Card>
              </Card>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
