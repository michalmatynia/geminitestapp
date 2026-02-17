'use client';

import { ReactNode } from 'react';

import { cn } from '@/shared/utils';

import { Checkbox } from '../checkbox';
import { FormField } from '../form-section';
import { FormModal } from '../FormModal';
import { Input } from '../input';
import { Label } from '../label';
import { SelectSimple } from '../select-simple';
import { Switch } from '../switch';
import { Textarea } from '../textarea';

export type FieldType = 'text' | 'email' | 'password' | 'number' | 'textarea' | 'select' | 'checkbox' | 'switch' | 'color' | 'range' | 'custom';

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
export function SettingsFieldsRenderer<T extends object>({
  fields,
  values,
  errors = {},
  onChange,
  disabled = false,
  className,
}: SettingsFieldsRendererProps<T>) {
  const handleFieldChange = (key: keyof T, value: unknown) => {
    onChange({ [key]: value } as Partial<T>);
  };

  return (
    <div className={cn('space-y-6', className)}>
      {fields.map(field => (
        <div key={String(field.key)}>
          {field.render ? (
            <FormField 
              label={field.label} 
              required={field.required}
              description={field.helperText}
              error={errors[field.key]}
            >
              {field.render({
                value: values[field.key],
                onChange: (value: unknown) => handleFieldChange(field.key, value),
                disabled: field.disabled || disabled,
                ...(errors[field.key] !== undefined ? { error: errors[field.key] } : {}),
              })}
            </FormField>
          ) : field.type === 'textarea' ? (
            <FormField 
              label={field.label} 
              required={field.required}
              description={field.helperText}
              error={errors[field.key]}
            >
              <Textarea
                value={(values[field.key] as string) || ''}
                onChange={e => handleFieldChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                disabled={field.disabled || disabled}
                className='min-h-[100px]'
              />
            </FormField>
          ) : field.type === 'select' ? (
            <FormField 
              label={field.label} 
              required={field.required}
              description={field.helperText}
              error={errors[field.key]}
            >
              <SelectSimple
                value={String(values[field.key] || '')}
                onValueChange={val => handleFieldChange(field.key, val)}
                disabled={field.disabled || disabled}
                options={field.options?.map(opt => ({ label: opt.label, value: String(opt.value) })) || []}
                placeholder={field.placeholder || 'Select an option'}
              />
            </FormField>
          ) : field.type === 'checkbox' ? (
            <div className='flex items-center gap-2 py-2'>
              <Checkbox
                id={String(field.key)}
                checked={(values[field.key] as boolean) || false}
                onCheckedChange={checked => handleFieldChange(field.key, !!checked)}
                disabled={field.disabled || disabled}
              />
              <Label htmlFor={String(field.key)} className='text-sm cursor-pointer'>
                {field.label}
                {field.required && <span className='text-red-500 ml-1'>*</span>}
              </Label>
              {field.helperText && <p className='text-xs text-muted-foreground ml-6'>{field.helperText}</p>}
              {errors[field.key] && <p className='text-xs text-red-500 ml-6'>{errors[field.key]}</p>}
            </div>
          ) : field.type === 'switch' ? (
            <div className='flex items-center justify-between p-3 rounded-md border border-white/5 bg-card/30 transition-colors hover:bg-card/50'>
              <div className='flex flex-col gap-0.5'>
                <Label htmlFor={String(field.key)} className='text-sm font-medium text-gray-200 cursor-pointer'>
                  {field.label}
                  {field.required && <span className='text-red-500 ml-1'>*</span>}
                </Label>
                {field.helperText && <p className='text-[11px] text-muted-foreground'>{field.helperText}</p>}
              </div>
              <Switch
                id={String(field.key)}
                checked={(values[field.key] as boolean) || false}
                onCheckedChange={checked => handleFieldChange(field.key, !!checked)}
                disabled={field.disabled || disabled}
              />
              {errors[field.key] && <p className='text-xs text-red-500 mt-1'>{errors[field.key]}</p>}
            </div>
          ) : field.type === 'color' ? (
            <FormField 
              label={field.label} 
              required={field.required}
              description={field.helperText}
              error={errors[field.key]}
            >
              <div className='flex items-center gap-2'>
                <div 
                  className='size-8 rounded border border-border shrink-0 overflow-hidden'
                  style={{ backgroundColor: String(values[field.key] || '#000000') }}
                >
                  <input
                    type='color'
                    value={String(values[field.key] || '#000000')}
                    onChange={e => handleFieldChange(field.key, e.target.value)}
                    className='opacity-0 size-full cursor-pointer'
                    disabled={field.disabled || disabled}
                  />
                </div>
                <Input
                  value={String(values[field.key] || '#000000')}
                  onChange={e => handleFieldChange(field.key, e.target.value)}
                  placeholder='#000000'
                  disabled={field.disabled || disabled}
                  className='font-mono'
                />
              </div>
            </FormField>
          ) : field.type === 'range' ? (
            <FormField 
              label={field.label} 
              required={field.required}
              description={field.helperText}
              error={errors[field.key]}
              actions={<span className='text-xs font-mono text-muted-foreground'>{(values[field.key] as number) ?? 0}{field.suffix}</span>}
            >
              <input
                type='range'
                min={field.min ?? 0}
                max={field.max ?? 100}
                step={field.step ?? 1}
                value={(values[field.key] as number) ?? field.min ?? 0}
                onChange={e => handleFieldChange(field.key, Number(e.target.value))}
                className='w-full accent-primary h-2 bg-muted rounded-lg appearance-none cursor-pointer'
                disabled={field.disabled || disabled}
              />
            </FormField>
          ) : (
            <FormField 
              label={field.label} 
              required={field.required}
              description={field.helperText}
              error={errors[field.key]}
            >
              <div className='flex items-center gap-2'>
                <Input
                  type={field.type}
                  value={values[field.key] !== undefined && values[field.key] !== null ? String(values[field.key]) : ''}
                  onChange={e => handleFieldChange(field.key, field.type === 'number' ? Number(e.target.value) : e.target.value)}
                  placeholder={field.placeholder}
                  disabled={field.disabled || disabled}
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  className='flex-1'
                />
                {field.suffix && <span className='text-xs text-muted-foreground'>{field.suffix}</span>}
              </div>
            </FormField>
          )}
        </div>
      ))}
    </div>
  );
}

export interface SettingsPanelBuilderProps<T extends object> extends SettingsFieldsRendererProps<T> {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  onSave: () => Promise<void>;
  isSaving?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  saveText?: string;
}

/**
 * Generic settings panel builder modal.
 * Consolidates Theme, Component, Menu, Viewer3D settings patterns.
 */
export function SettingsPanelBuilder<T extends object>({
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
}: SettingsPanelBuilderProps<T>) {
  const handleSave = () => {
    void onSave();
  };

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={title}
      {...(subtitle !== undefined ? { subtitle } : {})}
      onSave={handleSave}
      isSaving={isSaving}
      size={size}
      saveText={saveText ?? (isSaving ? 'Saving...' : 'Save')}
    >
      <SettingsFieldsRenderer
        fields={fields}
        values={values}
        errors={errors}
        onChange={onChange}
        disabled={isSaving}
      />
    </FormModal>
  );
}
