'use client';

import { ReactNode } from 'react';

import { FormModal } from '../FormModal';
import { FormField } from '../form-section';
import { Input } from '../input';
import { Textarea } from '../textarea';
import { Checkbox } from '../checkbox';
import { SelectSimple } from '../select-simple';
import { Label } from '../label';

export type FieldType = 'text' | 'email' | 'number' | 'textarea' | 'select' | 'checkbox' | 'custom';

export interface SettingsField<T extends Record<string, unknown>> {
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
  
  /** Custom render function for advanced fields */
  render?: (props: SettingsFieldRenderProps) => ReactNode;
}

export interface SettingsFieldRenderProps {
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
  disabled?: boolean;
}

export interface SettingsPanelBuilderProps<T extends Record<string, unknown>> {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  fields: SettingsField<T>[];
  values: T;
  errors?: Partial<Record<keyof T, string>>;
  onChange: (values: Partial<T>) => void;
  onSave: () => Promise<void>;
  isSaving?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * Generic settings panel builder.
 * Consolidates Theme, Component, Menu, Viewer3D settings patterns.
 */
export function SettingsPanelBuilder<T extends Record<string, unknown>>({
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
}: SettingsPanelBuilderProps<T>) {
  const handleFieldChange = (key: keyof T, value: unknown) => {
    onChange({ [key]: value } as Partial<T>);
  };

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
      saveText={isSaving ? 'Saving...' : 'Save'}
    >
      <div className='space-y-6'>
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
                  disabled: field.disabled || isSaving,
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
                  disabled={field.disabled || isSaving}
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
                  disabled={field.disabled || isSaving}
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
                  disabled={field.disabled || isSaving}
                />
                <Label htmlFor={String(field.key)} className='text-sm cursor-pointer'>
                  {field.label}
                  {field.required && <span className='text-red-500 ml-1'>*</span>}
                </Label>
                {field.helperText && <p className='text-xs text-muted-foreground ml-6'>{field.helperText}</p>}
                {errors[field.key] && <p className='text-xs text-red-500 ml-6'>{errors[field.key]}</p>}
              </div>
            ) : (
              <FormField 
                label={field.label} 
                required={field.required}
                description={field.helperText}
                error={errors[field.key]}
              >
                <Input
                  type={field.type}
                  value={(values[field.key] as string | number) || ''}
                  onChange={e => handleFieldChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  disabled={field.disabled || isSaving}
                />
              </FormField>
            )}
          </div>
        ))}
      </div>
    </FormModal>
  );
}
