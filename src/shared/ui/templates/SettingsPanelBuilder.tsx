'use client';

import { useMemo, type ReactNode } from 'react';

import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import { cn } from '@/shared/utils';

import { Checkbox } from '../checkbox';
import { FormField } from '../form-section';
import { FormModal } from '../FormModal';
import { Input } from '../input';
import { Label } from '../label';
import { SelectSimple } from '../select-simple';
import { Switch } from '../switch';
import { Textarea } from '../textarea';

export type FieldType =
  | 'text'
  | 'email'
  | 'password'
  | 'number'
  | 'textarea'
  | 'select'
  | 'checkbox'
  | 'switch'
  | 'color'
  | 'range'
  | 'custom';

export interface SettingsField<T extends object> {
  /** Field key in the form data */
  key: keyof T;

  /** Label displayed to user */
  label: string;

  /** Field type */
  type: FieldType;

  /** Placeholder text */
  placeholder?: string;

  /** Help text shown below field */
  helperText?: string;

  /** Is this field required? */
  required?: boolean;

  /** Disabled state */
  disabled?: boolean;

  /** For select fields, list of options */
  options?: Array<{ label: string; value: string | number }>;

  /** For number and range fields */
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;

  /** Custom render function for advanced fields */
  render?: (props: SettingsFieldRenderProps) => ReactNode;
}

export interface SettingsFieldRenderProps {
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
  disabled?: boolean;
}

export interface SettingsFieldsRendererProps<T extends object> {
  fields: SettingsField<T>[];
  values: T;
  errors?: Partial<Record<keyof T, string>>;
  onChange: (values: Partial<T>) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Renders a list of settings fields based on configuration.
 */
export function SettingsFieldsRenderer<T extends object>(props: SettingsFieldsRendererProps<T>) {
  const { fields, values, errors, onChange, disabled = false, className } = props;
  const resolvedErrors: Partial<Record<keyof T, string>> =
    errors ?? ({} as Partial<Record<keyof T, string>>);

  const handleFieldChange = (key: keyof T, value: unknown) => {
    onChange({ [key]: value } as Partial<T>);
  };

  return (
    <div className={cn('space-y-6', className)}>
      {fields.map((field, index) => {
        const fieldKey = `${String(field.key)}-${index}`;
        const fieldId = `settings-field-${fieldKey}`;
        const fieldError = resolvedErrors[field.key];
        return (
          <div key={fieldKey}>
            {field.render ? (
              <FormField
                label={field.label}
                required={field.required}
                description={field.helperText}
                error={fieldError}
              >
                {field.render({
                  value: values[field.key],
                  onChange: (value: unknown) => handleFieldChange(field.key, value),
                  disabled: field.disabled || disabled,
                  ...(fieldError !== undefined ? { error: fieldError } : {}),
                })}
              </FormField>
            ) : field.type === 'textarea' ? (
              <FormField
                label={field.label}
                required={field.required}
                description={field.helperText}
                error={fieldError}
              >
                <Textarea
                  id={fieldId}
                  value={(values[field.key] as string) || ''}
                  onChange={(e) => handleFieldChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  disabled={field.disabled || disabled}
                  className='min-h-[100px]'
                  aria-label={field.label}
                />
              </FormField>
            ) : field.type === 'select' ? (
              <FormField
                label={field.label}
                required={field.required}
                description={field.helperText}
                error={fieldError}
              >
                <SelectSimple
                  value={String(values[field.key] || '')}
                  onValueChange={(val) => handleFieldChange(field.key, val)}
                  disabled={field.disabled || disabled}
                  options={
                    field.options?.map((opt) => ({ label: opt.label, value: String(opt.value) })) ||
                    []
                  }
                  placeholder={field.placeholder || 'Select an option'}
                  ariaLabel={field.label}
                />
              </FormField>
            ) : field.type === 'checkbox' ? (
              <div className='flex items-center gap-2 py-2'>
                <Checkbox
                  id={fieldId}
                  checked={(values[field.key] as boolean) || false}
                  onCheckedChange={(checked) => handleFieldChange(field.key, !!checked)}
                  disabled={field.disabled || disabled}
                />
                <Label htmlFor={fieldId} className='text-sm cursor-pointer'>
                  {field.label}
                  {field.required && <span className='text-red-500 ml-1'>*</span>}
                </Label>
                {field.helperText && (
                  <p className='text-xs text-muted-foreground ml-6'>{field.helperText}</p>
                )}
                {fieldError && <p className='text-xs text-red-500 ml-6'>{fieldError}</p>}
              </div>
            ) : field.type === 'switch' ? (
              <div className='flex items-center justify-between p-3 rounded-md border border-white/5 bg-card/30 transition-colors hover:bg-card/50'>
                <div className='flex flex-col gap-0.5'>
                  <Label
                    htmlFor={fieldId}
                    className='text-sm font-medium text-gray-200 cursor-pointer'
                  >
                    {field.label}
                    {field.required && <span className='text-red-500 ml-1'>*</span>}
                  </Label>
                  {field.helperText && (
                    <p className='text-[11px] text-muted-foreground'>{field.helperText}</p>
                  )}
                </div>
                <Switch
                  id={fieldId}
                  checked={(values[field.key] as boolean) || false}
                  onCheckedChange={(checked) => handleFieldChange(field.key, !!checked)}
                  disabled={field.disabled || disabled}
                />
                {fieldError && <p className='text-xs text-red-500 mt-1'>{fieldError}</p>}
              </div>
            ) : field.type === 'color' ? (
              <FormField
                label={field.label}
                required={field.required}
                description={field.helperText}
                error={fieldError}
              >
                <div className='flex items-center gap-2'>
                  <div
                    className='size-8 rounded border border-border shrink-0 overflow-hidden'
                    style={{ backgroundColor: String(values[field.key] || '#000000') }}
                  >
                    <input
                      type='color'
                      id={`${fieldId}-picker`}
                      value={String(values[field.key] || '#000000')}
                      onChange={(e) => handleFieldChange(field.key, e.target.value)}
                      className='opacity-0 size-full cursor-pointer'
                      disabled={field.disabled || disabled}
                      aria-label={`${field.label} color picker`}
                    />
                  </div>
                  <Input
                    id={fieldId}
                    value={String(values[field.key] || '#000000')}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    placeholder='#000000'
                    disabled={field.disabled || disabled}
                    className='font-mono'
                    aria-label={`${field.label} value`}
                  />
                </div>
              </FormField>
            ) : field.type === 'range' ? (
              <FormField
                label={field.label}
                required={field.required}
                description={field.helperText}
                error={fieldError}
                actions={
                  <span className='text-xs font-mono text-muted-foreground'>
                    {(values[field.key] as number) ?? 0}
                    {field.suffix}
                  </span>
                }
              >
                <input
                  id={fieldId}
                  type='range'
                  min={field.min ?? 0}
                  max={field.max ?? 100}
                  step={field.step ?? 1}
                  value={(values[field.key] as number) ?? field.min ?? 0}
                  onChange={(e) => handleFieldChange(field.key, Number(e.target.value))}
                  className='w-full accent-primary h-2 bg-muted rounded-lg appearance-none cursor-pointer'
                  disabled={field.disabled || disabled}
                  aria-label={field.label}
                />
              </FormField>
            ) : (
              <FormField
                label={field.label}
                required={field.required}
                description={field.helperText}
                error={fieldError}
              >
                <div className='flex items-center gap-2'>
                  <Input
                    id={fieldId}
                    type={field.type}
                    value={
                      values[field.key] !== undefined && values[field.key] !== null
                        ? String(values[field.key])
                        : ''
                    }
                    onChange={(e) =>
                      handleFieldChange(
                        field.key,
                        field.type === 'number' ? Number(e.target.value) : e.target.value
                      )
                    }
                    placeholder={field.placeholder}
                    disabled={field.disabled || disabled}
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    className='flex-1'
                    aria-label={field.label}
                  />
                  {field.suffix && (
                    <span className='text-xs text-muted-foreground'>{field.suffix}</span>
                  )}
                </div>
              </FormField>
            )}
          </div>
        );
      })}
    </div>
  );
}

export interface SettingsPanelBuilderProps<
  T extends object,
> extends SettingsFieldsRendererProps<T> {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  onSave: () => Promise<void>;
  isSaving?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  saveText?: string;
  cancelText?: string;
  showSaveButton?: boolean;
  showCancelButton?: boolean;
}

type SettingsPanelBuilderShape = Record<string, unknown>;

type SettingsPanelBuilderRuntimeValue = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  onSave: () => void;
  isSaving: boolean;
  size: 'sm' | 'md' | 'lg' | 'xl';
  saveText: string;
  cancelText: string;
  showSaveButton: boolean;
  showCancelButton: boolean;
  fields: SettingsField<SettingsPanelBuilderShape>[];
  values: SettingsPanelBuilderShape;
  errors: Partial<Record<string, string>>;
  onChange: (values: Partial<SettingsPanelBuilderShape>) => void;
};

const {
  Context: SettingsPanelBuilderRuntimeContext,
  useStrictContext: useSettingsPanelBuilderRuntime,
} = createStrictContext<SettingsPanelBuilderRuntimeValue>({
  hookName: 'useSettingsPanelBuilderRuntime',
  providerName: 'SettingsPanelBuilderRuntimeProvider',
  displayName: 'SettingsPanelBuilderRuntimeContext',
});

function SettingsPanelBuilderRuntimePanel(): React.JSX.Element {
  const runtime = useSettingsPanelBuilderRuntime();

  return (
    <FormModal
      open={runtime.open}
      onClose={runtime.onClose}
      title={runtime.title}
      {...(runtime.subtitle !== undefined ? { subtitle: runtime.subtitle } : {})}
      onSave={runtime.onSave}
      isSaving={runtime.isSaving}
      size={runtime.size}
      saveText={runtime.saveText}
      cancelText={runtime.cancelText}
      showSaveButton={runtime.showSaveButton}
      showCancelButton={runtime.showCancelButton}
    >
      <SettingsFieldsRenderer
        fields={runtime.fields}
        values={runtime.values}
        errors={runtime.errors}
        onChange={runtime.onChange}
        disabled={runtime.isSaving}
      />
    </FormModal>
  );
}

/**
 * Generic settings panel builder modal.
 * Consolidates Theme, Component, Menu, Viewer3D settings patterns.
 */
export function SettingsPanelBuilder<T extends object>(props: SettingsPanelBuilderProps<T>) {
  const {
    open,
    onClose,
    title,
    subtitle,
    fields,
    values,
    errors = {},
    onChange,
    onSave,
    isSaving = false,
    size = 'md',
    saveText,
    cancelText,
    showSaveButton = true,
    showCancelButton = true,
  } = props;

  const handleSave = () => {
    void onSave();
  };
  const runtimeValue = useMemo<SettingsPanelBuilderRuntimeValue>(
    () => ({
      open,
      onClose,
      title,
      subtitle,
      onSave: handleSave,
      isSaving,
      size,
      saveText: saveText ?? (isSaving ? 'Saving...' : 'Save'),
      cancelText: cancelText ?? 'Cancel',
      showSaveButton,
      showCancelButton,
      fields: fields as SettingsField<SettingsPanelBuilderShape>[],
      values: values as SettingsPanelBuilderShape,
      errors: errors as Partial<Record<string, string>>,
      onChange: (nextValues: Partial<SettingsPanelBuilderShape>) => {
        onChange(nextValues as Partial<T>);
      },
    }),
    [
      open,
      onClose,
      title,
      subtitle,
      isSaving,
      size,
      saveText,
      cancelText,
      showSaveButton,
      showCancelButton,
      fields,
      values,
      errors,
      onChange,
      onSave,
    ]
  );

  return (
    <SettingsPanelBuilderRuntimeContext.Provider value={runtimeValue}>
      <SettingsPanelBuilderRuntimePanel />
    </SettingsPanelBuilderRuntimeContext.Provider>
  );
}
