'use client';

import React, { useEffect, useMemo, useState } from 'react';

import type { LabeledOptionDto, LabeledOptionWithDescriptionDto } from '@/shared/contracts/base';
import { AdminSettingsPageLayout } from '@/shared/ui/admin.public';
import { Button, Tooltip, useToast, useToastSettings } from '@/shared/ui/primitives.public';
import { FormActions, FormField, FormSection, Hint, SelectSimple } from '@/shared/ui/forms-and-actions.public';
import { MetadataItem, UI_GRID_ROOMY_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';

const positionOptions = [
  { value: 'top-right', label: 'Top Right', description: 'Corner top right' },
  { value: 'top-left', label: 'Top Left', description: 'Corner top left' },
  { value: 'bottom-right', label: 'Bottom Right', description: 'Corner bottom right' },
  { value: 'bottom-left', label: 'Bottom Left', description: 'Corner bottom left' },
] as const satisfies ReadonlyArray<LabeledOptionWithDescriptionDto<string>>;

const accentOptions = [
  { value: 'emerald', label: 'Emerald', color: 'bg-emerald-500' },
  { value: 'blue', label: 'Blue', color: 'bg-blue-500' },
  { value: 'amber', label: 'Amber', color: 'bg-amber-500' },
  { value: 'rose', label: 'Rose', color: 'bg-rose-500' },
  { value: 'slate', label: 'Slate', color: 'bg-slate-500' },
] as const satisfies ReadonlyArray<LabeledOptionDto<string> & { color: string }>;

type PositionType = (typeof positionOptions)[number]['value'];
type AccentType = (typeof accentOptions)[number]['value'];

const positionPreview: Record<PositionType, { x: string; y: string }> = {
  'top-right': { x: 'right', y: 'top' },
  'top-left': { x: 'left', y: 'top' },
  'bottom-right': { x: 'right', y: 'bottom' },
  'bottom-left': { x: 'left', y: 'bottom' },
};

const previewMessages = {
  success: 'This is a success notification',
  error: 'This is an error notification',
  info: 'This is an info notification',
} as const;

function getAccentColor(accent: AccentType): string {
  return accentOptions.find((option: { value: string; color: string }) => option.value === accent)?.color ?? 'bg-emerald-500';
}

function buildAccentSelectOptions(accent: AccentType): LabeledOptionDto<string>[] {
  return accentOptions.map((option) => ({
    value: option.value,
    label: option.label,
    description: option.value === accent ? 'Currently selected' : undefined,
  }));
}

function AccentPalette({
  accent,
  setAccent,
}: {
  accent: AccentType;
  setAccent: (accent: AccentType) => void;
}): React.JSX.Element {
  return (
    <FormField label='Available Colors'>
      <div className='grid grid-cols-5 gap-2'>
        {accentOptions.map((option: LabeledOptionDto<string> & { color: string }) => (
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
  );
}

function PreviewButtons({
  onPreview,
}: {
  onPreview: (variant: 'success' | 'error' | 'info') => void;
}): React.JSX.Element {
  return (
    <>
      <Button variant='outline' onClick={() => onPreview('success')} size='sm'>
        Preview Success
      </Button>
      <Button variant='outline' onClick={() => onPreview('info')} size='sm'>
        Preview Info
      </Button>
      <Button variant='outline' onClick={() => onPreview('error')} size='sm'>
        Preview Error
      </Button>
    </>
  );
}

type NotificationsSettingsFormProps = {
  accent: AccentType;
  accentSelectOptions: LabeledOptionDto<string>[];
  onPreview: (variant: 'success' | 'error' | 'info') => void;
  onSave: () => void;
  position: PositionType;
  setAccent: (accent: AccentType) => void;
  setPosition: (position: PositionType) => void;
};

function NotificationsSettingsForm({
  accent,
  accentSelectOptions,
  onPreview,
  onSave,
  position,
  setAccent,
  setPosition,
}: NotificationsSettingsFormProps): React.JSX.Element {
  return (
    <FormSection title='Notification Preferences' className='p-6'>
      <div className='space-y-6'>
        <FormField
          label='Toast Position'
          description='Choose where notifications appear on your screen.'
        >
          <SelectSimple
            size='sm'
            value={position}
            onValueChange={(val: string) => setPosition(val as PositionType)}
            options={positionOptions}
            placeholder='Select position'
            ariaLabel='Select position'
            title='Select position'
          />
        </FormField>

        <FormField
          label='Accent Color'
          description='Select the primary color for success notifications.'
        >
          <SelectSimple
            size='sm'
            value={accent}
            onValueChange={(val: string) => setAccent(val as AccentType)}
            options={accentSelectOptions}
            placeholder='Select accent color'
            ariaLabel='Select accent color'
            title='Select accent color'
          />
        </FormField>

        <AccentPalette accent={accent} setAccent={setAccent} />

        <FormActions
          onSave={onSave}
          saveText='Save Settings'
          className='justify-start border-t border-border pt-6'
        >
          <PreviewButtons onPreview={onPreview} />
        </FormActions>
      </div>
    </FormSection>
  );
}

type NotificationsPreviewProps = {
  accent: AccentType;
  accentColor: string;
  position: PositionType;
  preview: { x: string; y: string };
};

function NotificationsPreview({
  accent,
  accentColor,
  position,
  preview,
}: NotificationsPreviewProps): React.JSX.Element {
  return (
    <FormSection title='Position Preview' className='sticky top-6 p-6'>
      <FormSection variant='subtle' className='relative aspect-video w-full bg-card/40'>
        <div
          className={`absolute ${preview.x}-3 ${preview.y}-3 flex size-10 items-center justify-center rounded-lg border-2 border-dashed border-emerald-400/50 bg-emerald-400/10`}
        >
          <div className='size-1 rounded-full bg-emerald-400' />
        </div>

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
            icon={<span className={`size-2 rounded-full ${accentColor}`} aria-hidden='true' />}
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
        Click the preview buttons to see how notifications appear with your settings.
      </Hint>
    </FormSection>
  );
}

export function AdminNotificationsSettingsPage(): React.JSX.Element {
  const { settings, updateSettings } = useToastSettings();
  const { toast } = useToast();
  const [position, setPosition] = useState<PositionType>(settings.position);
  const [accent, setAccent] = useState<AccentType>(settings.accent);

  useEffect(() => {
    setPosition(settings.position);
    setAccent(settings.accent);
  }, [settings]);

  const handleSave = (): void => {
    updateSettings({ position, accent });
    toast('Notification settings saved successfully', { variant: 'success' });
  };

  const showPreview = (variant: 'success' | 'error' | 'info'): void => {
    toast(previewMessages[variant], { variant });
  };

  const preview = positionPreview[position];
  const accentColor = getAccentColor(accent);
  const accentSelectOptions = useMemo(() => buildAccentSelectOptions(accent), [accent]);

  return (
    <AdminSettingsPageLayout
      title='Notifications'
      current='Notifications'
      description='Customize toast position, accent color, and preview behavior.'
    >
      <div className={`${UI_GRID_ROOMY_CLASSNAME} lg:grid-cols-3`}>
        <div className='space-y-6 lg:col-span-2'>
          <NotificationsSettingsForm
            accent={accent}
            accentSelectOptions={accentSelectOptions}
            onPreview={showPreview}
            onSave={handleSave}
            position={position}
            setAccent={setAccent}
            setPosition={setPosition}
          />
        </div>

        <div>
          <NotificationsPreview
            accent={accent}
            accentColor={accentColor}
            position={position}
            preview={preview}
          />
        </div>
      </div>
    </AdminSettingsPageLayout>
  );
}
