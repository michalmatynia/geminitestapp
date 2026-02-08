import { Link2, Search, Palette } from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';

import type { ColorScheme } from '@/features/cms/types/theme-settings';
import {
  Input,
  Label,
  RadioGroup,
  RadioGroupItem,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  UnifiedSelect,
  SectionPanel,
} from '@/shared/ui';

import {
  ColorField,
  NumberField,
  RangeField,
  SelectField,
  TextField,
  ImagePickerField,
  Asset3DPickerField,
} from './shared-fields';
import { useThemeSettings } from './ThemeSettingsContext';
import { useCmsDomainSelection } from '../../hooks/useCmsDomainSelection';
import { useCmsSlugs } from '../../hooks/useCmsQueries';

import type { Slug } from '../../types';
import type { SettingsField, SettingsFieldOption } from '../../types/page-builder';




const FONT_FAMILY_OPTIONS: SettingsFieldOption[] = [
  { label: 'Inter', value: 'Inter, sans-serif' },
  { label: 'Bebas Neue', value: '\'Bebas Neue\', sans-serif' },
  { label: 'Space Grotesk', value: '\'Space Grotesk\', sans-serif' },
  { label: 'Manrope', value: 'Manrope, sans-serif' },
  { label: 'Outfit', value: 'Outfit, sans-serif' },
  { label: 'Plus Jakarta Sans', value: '\'Plus Jakarta Sans\', sans-serif' },
  { label: 'DM Sans', value: '\'DM Sans\', sans-serif' },
  { label: 'Sora', value: 'Sora, sans-serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Times New Roman', value: '\'Times New Roman\', serif' },
  { label: 'Courier New', value: '\'Courier New\', monospace' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
  { label: 'Trebuchet MS', value: '\'Trebuchet MS\', sans-serif' },
  { label: 'Palatino', value: '\'Palatino Linotype\', serif' },
  { label: 'System UI', value: 'system-ui, sans-serif' },
];

const FONT_WEIGHT_OPTIONS: SettingsFieldOption[] = [
  { label: '100 – Thin', value: '100' },
  { label: '200 – Extra Light', value: '200' },
  { label: '300 – Light', value: '300' },
  { label: '400 – Normal', value: '400' },
  { label: '500 – Medium', value: '500' },
  { label: '600 – Semi Bold', value: '600' },
  { label: '700 – Bold', value: '700' },
  { label: '800 – Extra Bold', value: '800' },
  { label: '900 – Black', value: '900' },
];

const BORDER_STYLE_OPTIONS: SettingsFieldOption[] = [
  { label: 'Solid', value: 'solid' },
  { label: 'Dashed', value: 'dashed' },
  { label: 'Dotted', value: 'dotted' },
  { label: 'None', value: 'none' },
];

const BG_TYPE_OPTIONS: SettingsFieldOption[] = [
  { label: 'None', value: 'none' },
  { label: 'Solid', value: 'solid' },
  { label: 'Gradient', value: 'gradient' },
  { label: 'Image', value: 'image' },
];

const GRADIENT_DIRECTION_OPTIONS: SettingsFieldOption[] = [
  { label: 'Top → Bottom', value: '180' },
  { label: 'Bottom → Top', value: '0' },
  { label: 'Left → Right', value: '90' },
  { label: 'Right → Left', value: '270' },
  { label: 'Top Left → Bottom Right', value: '135' },
  { label: 'Bottom Right → Top Left', value: '315' },
  { label: 'Top Right → Bottom Left', value: '225' },
  { label: 'Bottom Left → Top Right', value: '45' },
  { label: 'Custom angle…', value: 'custom' },
];

const COLOR_SCHEME_OPTIONS: SettingsFieldOption[] = [
  { label: 'Scheme 1', value: 'scheme-1' },
  { label: 'Scheme 2', value: 'scheme-2' },
  { label: 'Scheme 3', value: 'scheme-3' },
  { label: 'Scheme 4', value: 'scheme-4' },
  { label: 'Scheme 5', value: 'scheme-5' },
];



interface SettingsFieldRendererProps {
  field: SettingsField;
  value: unknown;
  onChange: (key: string, value: unknown) => void;
}

export function SettingsFieldRenderer({
  field,
  value,
  onChange,
}: SettingsFieldRendererProps): React.ReactNode {
  const { theme } = useThemeSettings();
  const isDisabled = Boolean(field.disabled);
  const colorSchemeOptions = useMemo<SettingsFieldOption[]>((): SettingsFieldOption[] => {
    const baseOptions =
      theme.colorSchemes.length === 0
        ? COLOR_SCHEME_OPTIONS
        : theme.colorSchemes.map((scheme: ColorScheme) => ({
          label: scheme.name || scheme.id,
          value: scheme.id,
        }));
    const extraOptions = field.options
      ? field.options.filter((opt: SettingsFieldOption) => !baseOptions.some((base: SettingsFieldOption) => base.value === opt.value))
      : [];
    return [...extraOptions, ...baseOptions];
  }, [field.options, theme.colorSchemes]);
  const handleChange = useCallback(
    (newValue: unknown): void => {
      onChange(field.key, newValue);
    },
    [field.key, onChange]
  );

  const imageValue = typeof value === 'string' ? value : '';
  const openColorSchemeCreator = useCallback((): void => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent('cms-builder-open-theme', {
        detail: { section: 'Colors', action: 'createScheme' },
      })
    );
  }, []);

  return (
    <div className='space-y-1.5'>
      {field.type === 'text' && (
        <TextField
          label={field.label}
          value={(value as string) ?? ''}
          onChange={handleChange}
          disabled={isDisabled}
        />
      )}

      {field.type === 'link' && (
        <>
          <Label className='text-xs font-medium uppercase tracking-wide text-gray-400'>
            {field.label}
          </Label>
          <LinkField value={(value as string) ?? ''} onChange={handleChange} />
        </>
      )}

      {field.type === 'number' && (
        <NumberField
          label={field.label}
          value={(value as number) ?? 0}
          onChange={handleChange}
          disabled={isDisabled}
          {...(field.min !== undefined && { min: field.min })}
          {...(field.max !== undefined && { max: field.max })}
        />
      )}

      {field.type === 'select' && (
        <SelectField
          label={field.label}
          value={
            (typeof value === 'string' && value.trim().length > 0)
              ? value
              : typeof field.defaultValue === 'string'
                ? field.defaultValue
                : ''
          }
          onChange={handleChange}
          options={field.options ?? []}
          disabled={isDisabled}
        />
      )}

      {field.type === 'alignment' && (
        <>
          <Label className='text-xs font-medium uppercase tracking-wide text-gray-400'>
            {field.label}
          </Label>
          <div className='grid grid-cols-3 gap-2'>
            {(field.options ?? [
              { label: 'Left', value: 'left' },
              { label: 'Center', value: 'center' },
              { label: 'Right', value: 'right' },
            ]).map((opt: SettingsFieldOption) => {
              const currentValue = (value as string) ?? field.options?.[0]?.value ?? 'left';
              const isActive = currentValue === opt.value;
              return (
                <Button
                  key={opt.value}
                  type='button'
                  variant='outline'
                  size='sm'
                  aria-pressed={isActive}
                  className={`w-full justify-center ${isActive ? 'border-primary/60 bg-primary/10 text-primary' : 'border-foreground/20'}`}
                  onClick={(): void => handleChange(opt.value)}
                  disabled={isDisabled}
                >
                  {opt.label}
                </Button>
              );
            })}
          </div>
        </>
      )}

      {field.type === 'asset3d' && (
        <Asset3DPickerField
          label={field.label}
          value={(value as string) ?? ''}
          onChange={handleChange}
          disabled={isDisabled}
        />
      )}

      {field.type === 'radio' && (
        <>
          <Label className='text-xs font-medium uppercase tracking-wide text-gray-400'>
            {field.label}
          </Label>
          <RadioGroup
            value={(value as string) ?? ''}
            onValueChange={(v: string): void => handleChange(v)}
            className='space-y-1'
          >
            {(field.options ?? []).map((opt: SettingsFieldOption) => (
              <div key={opt.value} className='flex items-center gap-2'>
                <RadioGroupItem value={opt.value} id={`${field.key}-${opt.value}`} disabled={isDisabled} />
                <Label htmlFor={`${field.key}-${opt.value}`} className='text-sm text-gray-300 cursor-pointer'>
                  {opt.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </>
      )}

      {field.type === 'image' && (
        <ImagePickerField
          label={field.label}
          value={imageValue}
          onChange={handleChange}
          disabled={isDisabled}
        />
      )}

      {field.type === 'range' && (
        <RangeField
          label={field.label}
          value={(value as number) ?? field.min ?? 1}
          onChange={handleChange}
          min={field.min ?? 1}
          max={field.max ?? 12}
          disabled={isDisabled}
        />
      )}

      {field.type === 'color-scheme' && (
        <div className='space-y-2'>
          <SelectField
            label={field.label}
            value={(value as string) ?? 'scheme-1'}
            onChange={handleChange}
            options={colorSchemeOptions}
            disabled={isDisabled}
          />
          <div className='flex items-center justify-between text-[11px] text-gray-500'>
            <span>Need a new scheme?</span>
            <Button
              type='button'
              size='sm'
              variant='ghost'
              onClick={openColorSchemeCreator}
              className='h-6 px-2 text-[11px] text-blue-300 hover:text-blue-200'
            >
              <Palette className='mr-1 size-3' />
              Create scheme
            </Button>
          </div>
        </div>
      )}

      {field.type === 'color' && (
        <ColorField
          label={field.label}
          value={(value as string) ?? '#ffffff'}
          onChange={handleChange}
          disabled={isDisabled}
        />
      )}

      {field.type === 'font-family' && (
        <SelectField
          label={field.label}
          value={((): string => {
            const fallback =
              (typeof field.defaultValue === 'string' && field.defaultValue.trim().length > 0
                ? field.defaultValue
                : theme.bodyFont) || 'Inter, sans-serif';
            return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
          })()}
          onChange={handleChange}
          options={FONT_FAMILY_OPTIONS}
          disabled={isDisabled}
        />
      )}

      {field.type === 'font-weight' && (
        <SelectField
          label={field.label}
          value={String((value as string | number) ?? '400')}
          onChange={handleChange}
          options={FONT_WEIGHT_OPTIONS}
          disabled={isDisabled}
        />
      )}

      {field.type === 'spacing' && (
        <>
          <Label className='text-xs font-medium uppercase tracking-wide text-gray-400'>
            {field.label}
          </Label>
          <SpacingField value={value} onChange={handleChange} fieldKey={field.key} />
        </>
      )}

      {field.type === 'border' && (
        <>
          <Label className='text-xs font-medium uppercase tracking-wide text-gray-400'>
            {field.label}
          </Label>
          <BorderField value={value} onChange={handleChange} fieldKey={field.key} />
        </>
      )}

      {field.type === 'shadow' && (
        <>
          <Label className='text-xs font-medium uppercase tracking-wide text-gray-400'>
            {field.label}
          </Label>
          <ShadowField value={value} onChange={handleChange} fieldKey={field.key} />
        </>
      )}

      {field.type === 'background' && (
        <>
          <Label className='text-xs font-medium uppercase tracking-wide text-gray-400'>
            {field.label}
          </Label>
          <BackgroundField value={value} onChange={handleChange} fieldKey={field.key} />
        </>
      )}

      {field.type === 'typography' && (
        <>
          <Label className='text-xs font-medium uppercase tracking-wide text-gray-400'>
            {field.label}
          </Label>
          <TypographyField value={value} onChange={handleChange} fieldKey={field.key} />
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Composite field components
// ---------------------------------------------------------------------------

interface CompositeFieldProps {
  value: unknown;
  onChange: (value: unknown) => void;
  fieldKey: string;
}

function SpacingField({ value, onChange }: CompositeFieldProps): React.ReactNode {
  const spacing = (value as Record<string, number>) ?? { top: 0, right: 0, bottom: 0, left: 0 };
  const update = (side: string, v: number): void => {
    onChange({ ...spacing, [side]: v });
  };
  return (
    <div className='grid grid-cols-4 gap-1.5'>
      {(['top', 'right', 'bottom', 'left'] as const).map((side: string) => (
        <div key={side} className='space-y-0.5'>
          <span className='text-[10px] text-gray-500 uppercase'>{side[0]}</span>
          <Input
            type='number'
            value={spacing[side] ?? 0}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => update(side, Number(e.target.value))}
            className='text-xs h-7 px-1.5'
          />
        </div>
      ))}
    </div>
  );
}

function BorderField({ value, onChange }: CompositeFieldProps): React.ReactNode {
  const border = (value as Record<string, unknown>) ?? { width: 0, style: 'solid', color: '#4b5563', radius: 0 };
  const update = (key: string, v: unknown): void => {
    onChange({ ...border, [key]: v });
  };
  return (
    <div className='space-y-2'>
      <div className='grid grid-cols-2 gap-2'>
        <div className='space-y-0.5'>
          <span className='text-[10px] text-gray-500 uppercase'>Width</span>
          <Input
            type='number'
            value={(border.width as number) ?? 0}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => update('width', Number(e.target.value))}
            className='text-xs h-7'
            min={0}
          />
        </div>
        <div className='space-y-0.5'>
          <span className='text-[10px] text-gray-500 uppercase'>Radius</span>
          <Input
            type='number'
            value={(border.radius as number) ?? 0}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => update('radius', Number(e.target.value))}
            className='text-xs h-7'
            min={0}
          />
        </div>
      </div>
      <div className='grid grid-cols-2 gap-2'>
        <div className='space-y-0.5'>
          <span className='text-[10px] text-gray-500 uppercase'>Style</span>
          <UnifiedSelect
            value={(border.style as string) ?? 'solid'}
            onValueChange={(v: string): void => update('style', v)}
            options={BORDER_STYLE_OPTIONS}
            triggerClassName='text-xs h-7'
          />
        </div>
        <div className='space-y-0.5'>
          <span className='text-[10px] text-gray-500 uppercase'>Color</span>
          <div className='flex items-center gap-1'>
            <input
              type='color'
              value={(border.color as string) ?? '#4b5563'}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void => update('color', e.target.value)}
              className='h-7 w-7 cursor-pointer rounded border border-border/50 bg-transparent p-0.5'
            />
            <Input
              value={(border.color as string) ?? '#4b5563'}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void => update('color', e.target.value)}
              className='text-xs h-7 font-mono flex-1'
              maxLength={7}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ShadowField({ value, onChange }: CompositeFieldProps): React.ReactNode {
  const shadow = (value as Record<string, unknown>) ?? { x: 0, y: 2, blur: 4, spread: 0, color: '#00000040' };
  const update = (key: string, v: unknown): void => {
    onChange({ ...shadow, [key]: v });
  };
  return (
    <div className='space-y-2'>
      <div className='grid grid-cols-4 gap-1.5'>
        {(['x', 'y', 'blur', 'spread'] as const).map((prop: string) => (
          <div key={prop} className='space-y-0.5'>
            <span className='text-[10px] text-gray-500 uppercase'>{prop}</span>
            <Input
              type='number'
              value={(shadow[prop] as number) ?? 0}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void => update(prop, Number(e.target.value))}
              className='text-xs h-7 px-1.5'
            />
          </div>
        ))}
      </div>
      <div className='flex items-center gap-1'>
        <span className='text-[10px] text-gray-500 uppercase w-10'>Color</span>
        <input
          type='color'
          value={(shadow.color as string)?.slice(0, 7) ?? '#000000'}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void => update('color', e.target.value)}
          className='h-7 w-7 cursor-pointer rounded border border-border/50 bg-transparent p-0.5'
        />
        <Input
          value={(shadow.color as string) ?? '#00000040'}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void => update('color', e.target.value)}
          className='text-xs h-7 font-mono flex-1'
        />
      </div>
    </div>
  );
}

function BackgroundField({ value, onChange }: CompositeFieldProps): React.ReactNode {
  const isRecord = (input: unknown): input is Record<string, unknown> =>
    Boolean(input) && typeof input === 'object' && !Array.isArray(input);
  const bg: Record<string, unknown> = isRecord(value) ? value : { type: 'none' };
  const bgType = typeof bg.type === 'string' ? bg.type : 'none';
  const update = (key: string, v: unknown): void => {
    onChange({ ...bg, [key]: v });
  };
  const normalizeAngle = (angle: unknown): number => {
    if (typeof angle !== 'number' || !Number.isFinite(angle)) return 180;
    const normalized = ((Math.round(angle) % 360) + 360) % 360;
    return normalized;
  };
  const currentAngle = normalizeAngle(bg.gradientAngle);
  const currentDirectionValue =
    GRADIENT_DIRECTION_OPTIONS.find((opt: SettingsFieldOption) => opt.value === String(currentAngle))
      ? String(currentAngle)
      : 'custom';
  const fromOpacity = typeof bg.gradientFromOpacity === 'number' ? bg.gradientFromOpacity : 100;
  const toOpacity = typeof bg.gradientToOpacity === 'number' ? bg.gradientToOpacity : 100;

  return (
    <div className='space-y-2'>
      <UnifiedSelect
        value={bgType}
        onValueChange={(v: string): void => update('type', v)}
        options={BG_TYPE_OPTIONS}
        triggerClassName='text-xs h-7'
      />

      {bgType === 'none' && (
        <SectionPanel variant='subtle-compact' className='px-3 py-2 text-[11px] text-gray-400'>
          No background override (uses color scheme / inherited background).
        </SectionPanel>
      )}

      {bgType === 'solid' && (
        <div className='flex items-center gap-2'>
          <input
            type='color'
            value={(bg.color as string) ?? '#000000'}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => update('color', e.target.value)}
            className='h-8 w-10 cursor-pointer rounded border border-border/50 bg-transparent p-0.5'
          />
          <Input
            value={(bg.color as string) ?? '#000000'}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => update('color', e.target.value)}
            className='flex-1 text-xs font-mono'
            maxLength={7}
          />
        </div>
      )}

      {bgType === 'gradient' && (
        <div className='space-y-1.5'>
          <div className='flex items-center gap-2'>
            <span className='text-[10px] text-gray-500 w-10'>Dir</span>
            <UnifiedSelect
              value={currentDirectionValue}
              onValueChange={(v: string): void => {
                if (v === 'custom') return;
                update('gradientAngle', Number(v));
              }}
              options={GRADIENT_DIRECTION_OPTIONS}
              className='flex-1'
              triggerClassName='text-xs h-7'
            />
          </div>
          <div className='flex items-center gap-2'>
            <span className='text-[10px] text-gray-500 w-10'>From</span>
            <input
              type='color'
              value={(bg.gradientFrom as string) ?? '#000000'}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void => update('gradientFrom', e.target.value)}
              className='h-7 w-7 cursor-pointer rounded border border-border/50 bg-transparent p-0.5'
            />
            <Input
              value={(bg.gradientFrom as string) ?? '#000000'}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void => update('gradientFrom', e.target.value)}
              className='flex-1 text-xs font-mono'
              maxLength={7}
            />
            <Input
              type='number'
              value={fromOpacity}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void => update('gradientFromOpacity', Number(e.target.value))}
              className='w-16 text-xs h-7'
              min={0}
              max={100}
              title='Opacity (%)'
            />
          </div>
          <div className='flex items-center gap-2'>
            <span className='text-[10px] text-gray-500 w-10'>To</span>
            <input
              type='color'
              value={(bg.gradientTo as string) ?? '#ffffff'}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void => update('gradientTo', e.target.value)}
              className='h-7 w-7 cursor-pointer rounded border border-border/50 bg-transparent p-0.5'
            />
            <Input
              value={(bg.gradientTo as string) ?? '#ffffff'}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void => update('gradientTo', e.target.value)}
              className='flex-1 text-xs font-mono'
              maxLength={7}
            />
            <Input
              type='number'
              value={toOpacity}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void => update('gradientToOpacity', Number(e.target.value))}
              className='w-16 text-xs h-7'
              min={0}
              max={100}
              title='Opacity (%)'
            />
          </div>
          <div className='flex items-center gap-2'>
            <span className='text-[10px] text-gray-500 w-10'>Angle</span>
            <Input
              type='number'
              value={currentAngle}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void => update('gradientAngle', Number(e.target.value))}
              className='w-20 text-xs h-7'
              min={0}
              max={360}
            />
            <span className='text-xs text-gray-500'>deg</span>
          </div>
          <p className='text-[11px] text-gray-500'>
            Use opacity to create transparent gradients (0–100%).
          </p>
        </div>
      )}

      {bgType === 'image' && (
        <Input
          value={(bg.imageUrl as string) ?? ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void => update('imageUrl', e.target.value)}
          placeholder='Image URL...'
          className='text-xs'
        />
      )}
    </div>
  );
}

function TypographyField({ value, onChange }: CompositeFieldProps): React.ReactNode {
  const typo = (value as Record<string, unknown>) ?? {};
  const update = (key: string, v: unknown): void => {
    onChange({ ...typo, [key]: v });
  };
  return (
    <div className='space-y-2'>
      <div className='space-y-0.5'>
        <span className='text-[10px] text-gray-500 uppercase'>Font Family</span>
        <UnifiedSelect
          value={(typo.fontFamily as string) ?? 'Inter, sans-serif'}
          onValueChange={(v: string): void => update('fontFamily', v)}
          options={FONT_FAMILY_OPTIONS}
          triggerClassName='text-xs h-7'
        />
      </div>
      <div className='grid grid-cols-2 gap-2'>
        <div className='space-y-0.5'>
          <span className='text-[10px] text-gray-500 uppercase'>Weight</span>
          <UnifiedSelect
            value={String((typo.fontWeight as string | number) ?? '400')}
            onValueChange={(v: string): void => update('fontWeight', v)}
            options={FONT_WEIGHT_OPTIONS}
            triggerClassName='text-xs h-7'
          />
        </div>
        <div className='space-y-0.5'>
          <span className='text-[10px] text-gray-500 uppercase'>Size (px)</span>
          <Input
            type='number'
            value={(typo.fontSize as number) ?? 16}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => update('fontSize', Number(e.target.value))}
            className='text-xs h-7'
            min={8}
            max={200}
          />
        </div>
      </div>
      <div className='grid grid-cols-2 gap-2'>
        <div className='space-y-0.5'>
          <span className='text-[10px] text-gray-500 uppercase'>Line Height</span>
          <Input
            type='number'
            value={(typo.lineHeight as number) ?? 1.5}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => update('lineHeight', Number(e.target.value))}
            className='text-xs h-7'
            min={0.5}
            max={5}
            step={0.1}
          />
        </div>
        <div className='space-y-0.5'>
          <span className='text-[10px] text-gray-500 uppercase'>Letter Spacing</span>
          <Input
            type='number'
            value={(typo.letterSpacing as number) ?? 0}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => update('letterSpacing', Number(e.target.value))}
            className='text-xs h-7'
            step={0.5}
          />
        </div>
      </div>
      <div className='space-y-0.5'>
        <span className='text-[10px] text-gray-500 uppercase'>Text Color</span>
        <div className='flex items-center gap-2'>
          <input
            type='color'
            value={(typo.textColor as string) ?? '#ffffff'}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => update('textColor', e.target.value)}
            className='h-7 w-7 cursor-pointer rounded border border-border/50 bg-transparent p-0.5'
          />
          <Input
            value={(typo.textColor as string) ?? '#ffffff'}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => update('textColor', e.target.value)}
            className='flex-1 text-xs font-mono'
            maxLength={7}
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Link field (manual URL + slug picker)
// ---------------------------------------------------------------------------

interface LinkFieldProps {
  value: string;
  onChange: (value: string) => void;
}

function LinkField({ value, onChange }: LinkFieldProps): React.ReactNode {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { activeDomainId } = useCmsDomainSelection();
  const slugsQuery = useCmsSlugs(activeDomainId);
  const slugs = slugsQuery.data ?? [];
  const filtered = slugs.filter((slug: Slug) =>
    slug.slug.toLowerCase().includes(query.trim().toLowerCase())
  );

  const handleSelect = (slug: Slug): void => {
    onChange(`/${slug.slug}`);
    setOpen(false);
  };

  return (
    <div className='space-y-2'>
      <div className='relative'>
        <Input
          value={value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void => onChange(e.target.value)}
          className='pr-10 text-sm'
          placeholder='https://example.com or /your-slug'
        />
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              type='button'
              variant='ghost'
              size='icon'
              className='absolute right-1 top-1 h-7 w-7 text-gray-400 hover:text-gray-200'
              title='Pick from slugs'
            >
              <Link2 className='size-3.5' />
            </Button>
          </DialogTrigger>
          <DialogContent className='max-w-lg'>
            <DialogHeader>
              <DialogTitle>Select a slug</DialogTitle>
            </DialogHeader>
            <div className='space-y-3'>
              <div className='relative'>
                <Search className='pointer-events-none absolute left-2.5 top-2.5 size-4 text-gray-500' />
                <Input
                  value={query}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setQuery(e.target.value)}
                  className='pl-8 text-sm'
                  placeholder='Search slugs...'
                />
              </div>
              <div className='max-h-64 space-y-1 overflow-y-auto rounded border border-border/50 p-2'>
                {slugsQuery.isLoading && (
                  <div className='p-2 text-xs text-gray-500'>Loading slugs...</div>
                )}
                {!slugsQuery.isLoading && filtered.length === 0 && (
                  <div className='p-2 text-xs text-gray-500'>No slugs found.</div>
                )}
                {filtered.map((slug: Slug) => (
                  <button
                    key={slug.id}
                    type='button'
                    onClick={(): void => handleSelect(slug)}
                    className='flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm text-gray-200 hover:bg-foreground/5'
                  >
                    <span>/{slug.slug}</span>
                    {slug.isDefault ? (
                      <span className='text-[10px] uppercase tracking-wide text-gray-500'>
                        Default
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {value ? (
        <Button
          type='button'
          size='sm'
          variant='ghost'
          className='w-full text-xs text-gray-400 hover:text-gray-200'
          onClick={(): void => onChange('')}
        >
          Clear link
        </Button>
      ) : null}
    </div>
  );
}
