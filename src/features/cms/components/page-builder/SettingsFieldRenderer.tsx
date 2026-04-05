'use client';

import { Palette } from 'lucide-react';
import React, { useCallback, useMemo } from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { SettingsField, SettingsFieldOption } from '@/shared/contracts/cms';
import type { ColorScheme } from '@/shared/contracts/cms-theme';
import { Label, RadioGroup, RadioGroupItem, Button } from '@/shared/ui/primitives.public';
import { SelectSimple } from '@/shared/ui/forms-and-actions.public';

import { BackgroundField } from './settings/fields/composite/BackgroundField';
import { BorderField } from './settings/fields/composite/BorderField';
import { ShadowField } from './settings/fields/composite/ShadowField';
import { SpacingField } from './settings/fields/composite/SpacingField';
import { TypographyField } from './settings/fields/composite/TypographyField';
import {
  CompositeFieldContext,
  type CompositeFieldContextValue,
} from './settings/fields/CompositeFieldContext';
import { LinkField } from './settings/fields/LinkField';
import {
  FONT_FAMILY_OPTIONS,
  FONT_WEIGHT_OPTIONS,
  COLOR_SCHEME_OPTIONS,
} from './settings/fields/settings-field-constants';
import {
  useOptionalSettingsFormActions,
  useOptionalSettingsFormState,
} from './settings/SettingsFormContext';
import {
  ColorField,
  NumberField,
  RangeField,
  TextField,
  ImagePickerField,
  Asset3DPickerField,
} from './shared-fields';
import { useThemeSettingsValue } from './ThemeSettingsContext';

const buildSelectOptions = (
  options?: ReadonlyArray<SettingsFieldOption>
): Array<LabeledOptionDto<string>> =>
  (options ?? []).map((option: SettingsFieldOption) => ({
    label: option.label,
    value: String(option.value),
  }));


function CompositeFieldProvider(props: {
  value: unknown;
  onChange: (value: unknown) => void;
  fieldLabel: string;
  fieldId: string;
  children: React.ReactNode;
}): React.JSX.Element {
  const { value, onChange, fieldLabel, fieldId, children } = props;

  const contextValue = useMemo(
    (): CompositeFieldContextValue => ({
      value,
      onChange,
      fieldLabel,
      fieldId,
      buildAriaLabel: (suffix: string): string => `${fieldLabel} ${suffix}`.trim(),
      buildControlId: (suffix: string): string =>
        `${fieldId}-${suffix.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase()}`,
    }),
    [fieldId, fieldLabel, onChange, value]
  );

  return (
    <CompositeFieldContext.Provider value={contextValue}>{children}</CompositeFieldContext.Provider>
  );
}

export function SettingsFieldRenderer(props: {
  field: SettingsField;
  value?: unknown;
  onChange?: (key: string, value: unknown) => void;
}): React.ReactNode {
  const { field, value: propValue, onChange: propOnChange } = props;

  const contextState = useOptionalSettingsFormState();
  const contextActions = useOptionalSettingsFormActions();

  const value = propValue !== undefined ? propValue : contextState?.values[field.key];
  const onChange = propOnChange || contextActions?.onChange;

  const theme = useThemeSettingsValue();
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
  const selectOptions = useMemo<Array<LabeledOptionDto<string>>>(
    () => buildSelectOptions(field.options),
    [field.options]
  );
  const colorSchemeSelectOptions = useMemo<Array<LabeledOptionDto<string>>>(
    () => buildSelectOptions(colorSchemeOptions),
    [colorSchemeOptions]
  );
  const handleChange = useCallback(
    (newValue: unknown): void => {
      if (onChange) {
        onChange(field.key, newValue);
      }
    },
    [field.key, onChange]
  );
  const generatedId = React.useId().replace(/:/g, '');
  const controlId = useMemo(
    () => `settings-field-${String(field.key).replace(/[^a-zA-Z0-9-_]/g, '-')}-${generatedId}`,
    [field.key, generatedId]
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
        <>
          <Label
            className='text-xs font-medium uppercase tracking-wide text-gray-400'
            htmlFor={controlId}
          >
            {field.label}
          </Label>
          <TextField
            label={undefined}
            value={(value as string) ?? ''}
            onChange={handleChange}
            disabled={isDisabled}
            ariaLabel={field.label}
            id={controlId}
          />
        </>
      )}

      {field.type === 'link' && (
        <>
          <Label
            className='text-xs font-medium uppercase tracking-wide text-gray-400'
            htmlFor={controlId}
          >
            {field.label}
          </Label>
          <LinkField
            value={(value as string) ?? ''}
            onChange={handleChange}
            ariaLabel={field.label}
            id={controlId}
          />
        </>
      )}

      {field.type === 'number' && (
        <>
          <Label
            className='text-xs font-medium uppercase tracking-wide text-gray-400'
            htmlFor={controlId}
          >
            {field.label}
          </Label>
          <NumberField
            label={undefined}
            value={(value as number) ?? 0}
            onChange={handleChange}
            disabled={isDisabled}
            ariaLabel={field.label}
            id={controlId}
            {...(field.min !== undefined && { min: field.min })}
            {...(field.max !== undefined && { max: field.max })}
          />
        </>
      )}

      {field.type === 'select' && (
        <>
          <Label
            className='text-xs font-medium uppercase tracking-wide text-gray-400'
            htmlFor={controlId}
          >
            {field.label}
          </Label>
          <SelectSimple
            size='sm'
            value={
              typeof value === 'string' && value.trim().length > 0
                ? value
                : typeof field.defaultValue === 'string'
                  ? field.defaultValue
                  : ''
            }
            onValueChange={handleChange}
            options={selectOptions}
            disabled={isDisabled}
            ariaLabel={field.label}
            id={controlId}
            triggerClassName='h-7 bg-card/40 text-xs mt-1'
           title={controlId}/>
        </>
      )}

      {field.type === 'alignment' && (
        <>
          <Label
            className='text-xs font-medium uppercase tracking-wide text-gray-400'
            id={`${controlId}-label`}
          >
            {field.label}
          </Label>
          <div className='grid grid-cols-3 gap-2' aria-labelledby={`${controlId}-label`}>
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
        <>
          <Label className='text-xs font-medium uppercase tracking-wide text-gray-400'>
            {field.label}
          </Label>
          <Asset3DPickerField
            label={undefined}
            value={(value as string) ?? ''}
            onChange={handleChange}
            disabled={isDisabled}
          />
        </>
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
        <>
          <Label className='text-xs font-medium uppercase tracking-wide text-gray-400'>
            {field.label}
          </Label>
          <ImagePickerField
            label={undefined}
            value={imageValue}
            onChange={handleChange}
            disabled={isDisabled}
            ariaLabel={field.label}
          />
        </>
      )}

      {field.type === 'range' && (
        <>
          <Label
            className='text-xs font-medium uppercase tracking-wide text-gray-400'
            htmlFor={controlId}
          >
            {field.label}
          </Label>
          <RangeField
            label={undefined}
            value={(value as number) ?? field.min ?? 1}
            onChange={handleChange}
            min={field.min ?? 1}
            max={field.max ?? 12}
            disabled={isDisabled}
            ariaLabel={field.label}
            id={controlId}
          />
        </>
      )}

      {field.type === 'color-scheme' && (
        <div className='space-y-2'>
          <Label
            className='text-xs font-medium uppercase tracking-wide text-gray-400'
            htmlFor={controlId}
          >
            {field.label}
          </Label>
          <SelectSimple
            size='sm'
            value={(value as string) ?? 'scheme-1'}
            onValueChange={handleChange}
            options={colorSchemeSelectOptions}
            disabled={isDisabled}
            ariaLabel={field.label}
            id={controlId}
            triggerClassName='h-7 bg-card/40 text-xs mt-1'
           title={controlId}/>
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
        <>
          <Label
            className='text-xs font-medium uppercase tracking-wide text-gray-400'
            htmlFor={controlId}
          >
            {field.label}
          </Label>
          <ColorField
            label={undefined}
            value={(value as string) ?? '#ffffff'}
            onChange={handleChange}
            disabled={isDisabled}
            ariaLabel={field.label}
            id={controlId}
          />
        </>
      )}

      {field.type === 'font-family' && (
        <>
          <Label
            className='text-xs font-medium uppercase tracking-wide text-gray-400'
            htmlFor={controlId}
          >
            {field.label}
          </Label>
          <SelectSimple
            size='sm'
            value={((): string => {
              const fallback =
                (typeof field.defaultValue === 'string' && field.defaultValue.trim().length > 0
                  ? field.defaultValue
                  : theme.bodyFont) || 'Inter, sans-serif';
              return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
            })()}
            onValueChange={handleChange}
            options={FONT_FAMILY_OPTIONS}
            disabled={isDisabled}
            ariaLabel={field.label}
            id={controlId}
            triggerClassName='h-7 bg-card/40 text-xs mt-1'
           title={controlId}/>
        </>
      )}

      {field.type === 'font-weight' && (
        <>
          <Label
            className='text-xs font-medium uppercase tracking-wide text-gray-400'
            htmlFor={controlId}
          >
            {field.label}
          </Label>
          <SelectSimple
            size='sm'
            value={String((value as string | number) ?? '400')}
            onValueChange={handleChange}
            options={FONT_WEIGHT_OPTIONS}
            disabled={isDisabled}
            ariaLabel={field.label}
            id={controlId}
            triggerClassName='h-7 bg-card/40 text-xs mt-1'
           title={controlId}/>
        </>
      )}

      {field.type === 'spacing' && (
        <>
          <Label
            className='text-xs font-medium uppercase tracking-wide text-gray-400'
            id={`${controlId}-label`}
          >
            {field.label}
          </Label>
          <div role='group' aria-labelledby={`${controlId}-label`}>
            <CompositeFieldProvider
              value={value}
              onChange={handleChange}
              fieldLabel={field.label}
              fieldId={controlId}
            >
              <SpacingField />
            </CompositeFieldProvider>
          </div>
        </>
      )}

      {field.type === 'border' && (
        <>
          <Label
            className='text-xs font-medium uppercase tracking-wide text-gray-400'
            id={`${controlId}-label`}
          >
            {field.label}
          </Label>
          <div role='group' aria-labelledby={`${controlId}-label`}>
            <CompositeFieldProvider
              value={value}
              onChange={handleChange}
              fieldLabel={field.label}
              fieldId={controlId}
            >
              <BorderField />
            </CompositeFieldProvider>
          </div>
        </>
      )}

      {field.type === 'shadow' && (
        <>
          <Label
            className='text-xs font-medium uppercase tracking-wide text-gray-400'
            id={`${controlId}-label`}
          >
            {field.label}
          </Label>
          <div role='group' aria-labelledby={`${controlId}-label`}>
            <CompositeFieldProvider
              value={value}
              onChange={handleChange}
              fieldLabel={field.label}
              fieldId={controlId}
            >
              <ShadowField />
            </CompositeFieldProvider>
          </div>
        </>
      )}

      {field.type === 'background' && (
        <>
          <Label
            className='text-xs font-medium uppercase tracking-wide text-gray-400'
            id={`${controlId}-label`}
          >
            {field.label}
          </Label>
          <div role='group' aria-labelledby={`${controlId}-label`}>
            <CompositeFieldProvider
              value={value}
              onChange={handleChange}
              fieldLabel={field.label}
              fieldId={controlId}
            >
              <BackgroundField />
            </CompositeFieldProvider>
          </div>
        </>
      )}

      {field.type === 'typography' && (
        <>
          <Label
            className='text-xs font-medium uppercase tracking-wide text-gray-400'
            id={`${controlId}-label`}
          >
            {field.label}
          </Label>
          <div role='group' aria-labelledby={`${controlId}-label`}>
            <CompositeFieldProvider
              value={value}
              onChange={handleChange}
              fieldLabel={field.label}
              fieldId={controlId}
            >
              <TypographyField />
            </CompositeFieldProvider>
          </div>
        </>
      )}
    </div>
  );
}
