'use client';

import { Palette } from 'lucide-react';
import React, { useCallback, useMemo } from 'react';

import type { SettingsField, SettingsFieldOption } from '@/shared/contracts/cms';
import type { ColorScheme } from '@/shared/contracts/cms-theme';
import { Label, RadioGroup, RadioGroupItem, Button } from '@/shared/ui';

import { useOptionalSettingsForm } from './settings/SettingsFormContext';
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

import {
  FONT_FAMILY_OPTIONS,
  FONT_WEIGHT_OPTIONS,
  COLOR_SCHEME_OPTIONS,
} from './settings/fields/settings-field-constants';
import {
  CompositeFieldContext,
  type CompositeFieldContextValue,
} from './settings/fields/CompositeFieldContext';
import { SpacingField } from './settings/fields/composite/SpacingField';
import { BorderField } from './settings/fields/composite/BorderField';
import { ShadowField } from './settings/fields/composite/ShadowField';
import { BackgroundField } from './settings/fields/composite/BackgroundField';
import { TypographyField } from './settings/fields/composite/TypographyField';
import { LinkField } from './settings/fields/LinkField';

function CompositeFieldProvider({
  value,
  onChange,
  children,
}: {
  value: unknown;
  onChange: (value: unknown) => void;
  children: React.ReactNode;
}): React.JSX.Element {
  const contextValue = useMemo(
    (): CompositeFieldContextValue => ({ value, onChange }),
    [onChange, value]
  );

  return (
    <CompositeFieldContext.Provider value={contextValue}>{children}</CompositeFieldContext.Provider>
  );
}

export function SettingsFieldRenderer({
  field,
  value: propValue,
  onChange: propOnChange,
}: {
  field: SettingsField;
  value?: unknown;
  onChange?: (key: string, value: unknown) => void;
}): React.ReactNode {
  const context = useOptionalSettingsForm();

  const value = propValue !== undefined ? propValue : context?.values[field.key];
  const onChange = propOnChange || context?.onChange;

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
      ? field.options.filter(
          (opt: SettingsFieldOption) =>
            !baseOptions.some((base: SettingsFieldOption) => base.value === opt.value)
        )
      : [];
    return [...extraOptions, ...baseOptions];
  }, [field.options, theme.colorSchemes]);
  const handleChange = useCallback(
    (newValue: unknown): void => {
      if (onChange) {
        onChange(field.key, newValue);
      }
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
            typeof value === 'string' && value.trim().length > 0
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
            {(
              field.options ?? [
                { label: 'Left', value: 'left' },
                { label: 'Center', value: 'center' },
                { label: 'Right', value: 'right' },
              ]
            ).map((opt: SettingsFieldOption) => {
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
                <RadioGroupItem
                  value={opt.value}
                  id={`${field.key}-${opt.value}`}
                  disabled={isDisabled}
                />
                <Label
                  htmlFor={`${field.key}-${opt.value}`}
                  className='text-sm text-gray-300 cursor-pointer'
                >
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
          <CompositeFieldProvider value={value} onChange={handleChange}>
            <SpacingField />
          </CompositeFieldProvider>
        </>
      )}

      {field.type === 'border' && (
        <>
          <Label className='text-xs font-medium uppercase tracking-wide text-gray-400'>
            {field.label}
          </Label>
          <CompositeFieldProvider value={value} onChange={handleChange}>
            <BorderField />
          </CompositeFieldProvider>
        </>
      )}

      {field.type === 'shadow' && (
        <>
          <Label className='text-xs font-medium uppercase tracking-wide text-gray-400'>
            {field.label}
          </Label>
          <CompositeFieldProvider value={value} onChange={handleChange}>
            <ShadowField />
          </CompositeFieldProvider>
        </>
      )}

      {field.type === 'background' && (
        <>
          <Label className='text-xs font-medium uppercase tracking-wide text-gray-400'>
            {field.label}
          </Label>
          <CompositeFieldProvider value={value} onChange={handleChange}>
            <BackgroundField />
          </CompositeFieldProvider>
        </>
      )}

      {field.type === 'typography' && (
        <>
          <Label className='text-xs font-medium uppercase tracking-wide text-gray-400'>
            {field.label}
          </Label>
          <CompositeFieldProvider value={value} onChange={handleChange}>
            <TypographyField />
          </CompositeFieldProvider>
        </>
      )}
    </div>
  );
}
