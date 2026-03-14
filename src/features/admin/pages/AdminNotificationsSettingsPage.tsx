'use client';

import React, { useState } from 'react';

import {
  AdminSettingsPageLayout,
  Button,
  FormActions,
  FormField,
  FormSection,
  Hint,
  MetadataItem,
  SelectSimple,
  Tooltip,
  useToast,
  useToastSettings,
} from '@/shared/ui';

const positionOptions = [
  { value: 'top-right', label: 'Top Right', description: 'Corner top right' },
  { value: 'top-left', label: 'Top Left', description: 'Corner top left' },
  { value: 'bottom-right', label: 'Bottom Right', description: 'Corner bottom right' },
  { value: 'bottom-left', label: 'Bottom Left', description: 'Corner bottom left' },
] as const;

const accentOptions = [
  { value: 'emerald', label: 'Emerald', color: 'bg-emerald-500' },
  { value: 'blue', label: 'Blue', color: 'bg-blue-500' },
  { value: 'amber', label: 'Amber', color: 'bg-amber-500' },
  { value: 'rose', label: 'Rose', color: 'bg-rose-500' },
  { value: 'slate', label: 'Slate', color: 'bg-slate-500' },
] as const;

type PositionType = (typeof positionOptions)[number]['value'];
type AccentType = (typeof accentOptions)[number]['value'];

export function AdminNotificationsSettingsPage(): React.JSX.Element {
  const { settings, updateSettings } = useToastSettings();
  const { toast } = useToast();
  const [position, setPosition] = useState<PositionType>('top-right');
  const [accent, setAccent] = useState<AccentType>('emerald');

  const [prevSettings, setPrevSettings] = useState(settings);

  if (settings !== prevSettings) {
    setPrevSettings(settings);
    setPosition(settings.position ?? 'top-right');
    setAccent(settings.accent ?? 'emerald');
  }

  const handleSave = (): void => {
    updateSettings({ position, accent });
    toast('Notification settings saved successfully', { variant: 'success' });
  };

  const showPreview = (variant: 'success' | 'error' | 'info'): void => {
    const messages = {
      success: 'This is a success notification',
      error: 'This is an error notification',
      info: 'This is an info notification',
    };
    toast(messages[variant], { variant });
  };

  const positionPreview: Record<PositionType, { x: string; y: string }> = {
    'top-right': { x: 'right', y: 'top' },
    'top-left': { x: 'left', y: 'top' },
    'bottom-right': { x: 'right', y: 'bottom' },
    'bottom-left': { x: 'left', y: 'bottom' },
  };

  const preview = positionPreview[position];
  const accentColor =
    accentOptions.find((option: { value: string; color: string }) => option.value === accent)
      ?.color ?? 'bg-emerald-500';

  return (
    <AdminSettingsPageLayout
      title='Notifications'
      current='Notifications'
      description='Customize toast position, accent color, and preview behavior.'
    >
      <div className='grid gap-6 lg:grid-cols-3'>
        {/* Settings Panel */}
        <div className='lg:col-span-2 space-y-6'>
          <FormSection title='Notification Preferences' className='p-6'>
            <div className='space-y-6'>
              {/* Position Setting */}
              <FormField
                label='Toast Position'
                description='Choose where notifications appear on your screen.'
              >
                <SelectSimple
                  size='sm'
                  value={position}
                  onValueChange={(val: string) => setPosition(val as PositionType)}
                  options={positionOptions.map(
                    (opt: { value: string; label: string; description: string }) => ({
                      value: opt.value,
                      label: opt.label,
                      description: opt.description,
                    })
                  )}
                  placeholder='Select position'
                 ariaLabel="Select position" title="Select position"/>
              </FormField>

              {/* Accent Color Setting */}
              <FormField
                label='Accent Color'
                description='Select the primary color for success notifications.'
              >
                <SelectSimple
                  size='sm'
                  value={accent}
                  onValueChange={(val: string) => setAccent(val as AccentType)}
                  options={accentOptions.map(
                    (opt: { value: string; label: string; color: string }) => ({
                      value: opt.value,
                      label: opt.label,
                      description: opt.value === accent ? 'Currently selected' : undefined,
                    })
                  )}
                  placeholder='Select accent color'
                 ariaLabel="Select accent color" title="Select accent color"/>
              </FormField>

              {/* Color Palette Preview */}
              <FormField label='Available Colors'>
                <div className='grid grid-cols-5 gap-2'>
                  {accentOptions.map((option: { value: string; label: string; color: string }) => (
                    <Tooltip key={option.value} content={option.label}>
                      <Button
                        onClick={() => setAccent(option.value as AccentType)}
                        className={`group relative flex items-center justify-center rounded-lg px-3 py-2 transition-all ${
                          accent === option.value
                            ? 'ring-2 ring-offset-2 ring-offset-gray-950 ring-white'
                            : 'border hover:border-border/60'
                        }`}
                        aria-label={`Select ${option.label} accent color`}
                        title={option.label}
                      >
                        <div className={`size-6 rounded-md ${option.color}`} />
                      </Button>
                    </Tooltip>
                  ))}
                </div>
              </FormField>

              {/* Action Buttons */}
              <FormActions
                onSave={handleSave}
                saveText='Save Settings'
                className='border-t border-border pt-6 justify-start'
              >
                <Button variant='outline' onClick={() => showPreview('success')} size='sm'>
                  Preview Success
                </Button>
                <Button variant='outline' onClick={() => showPreview('info')} size='sm'>
                  Preview Info
                </Button>
                <Button variant='outline' onClick={() => showPreview('error')} size='sm'>
                  Preview Error
                </Button>
              </FormActions>
            </div>
          </FormSection>
        </div>

        {/* Preview Panel */}
        <div>
          <FormSection title='Position Preview' className='sticky top-6 p-6'>
            <FormSection variant='subtle' className='relative aspect-video w-full bg-card/40'>
              {/* Position indicator */}
              <div
                className={`absolute size-10 rounded-lg border-2 border-dashed border-emerald-400/50 bg-emerald-400/10 ${preview.x}-3 ${preview.y}-3 flex items-center justify-center`}
              >
                <div className='size-1 rounded-full bg-emerald-400' />
              </div>

              {/* Corner labels */}
              <div className='absolute left-2 top-2 text-xs text-gray-500'>TL</div>
              <div className='absolute right-2 top-2 text-xs text-gray-500'>TR</div>
              <div className='absolute bottom-2 left-2 text-xs text-gray-500'>BL</div>
              <div className='absolute bottom-2 right-2 text-xs text-gray-500'>BR</div>
            </FormSection>

            <FormSection variant='subtle-compact' className='mt-4 space-y-2 bg-card/40 p-3'>
              <p className='text-xs font-medium text-gray-300'>Current Settings:</p>
              <div className='space-y-1.5'>
                <MetadataItem
                  label='Position'
                  value={position}
                  valueClassName='capitalize'
                  mono
                  variant='minimal'
                />
                <MetadataItem
                  label='Accent'
                  icon={
                    <span className={`size-2 rounded-full ${accentColor}`} aria-hidden='true' />
                  }
                  value={accent}
                  valueClassName='capitalize'
                  mono
                  variant='minimal'
                />
              </div>
            </FormSection>

            <Hint
              variant='info'
              className='mt-4 rounded-md border border-blue-500/20 bg-blue-500/5 p-3 italic'
              size='xs'
            >
              💡 Click the preview buttons to see how notifications appear with your settings.
            </Hint>
          </FormSection>
        </div>
      </div>
    </AdminSettingsPageLayout>
  );
}
