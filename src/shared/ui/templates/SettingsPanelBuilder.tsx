'use client';

import { ReactNode } from 'react';

import { FormModal } from '../FormModal';

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
          <div key={String(field.key)} className='space-y-2'>
            <label className='block text-sm font-medium'>
              {field.label}
              {field.required && <span className='text-red-500'>*</span>}
            </label>

            {field.render ? (
              field.render({
                value: values[field.key],
                onChange: (value: unknown) => handleFieldChange(field.key, value),
                disabled: field.disabled || isSaving,
                ...(errors[field.key] !== undefined ? { error: errors[field.key] } : {}),
              })
            ) : field.type === 'textarea' ? (
              <textarea
                value={(values[field.key] as string) || ''}
                onChange={e => handleFieldChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                disabled={field.disabled || isSaving}
                className='w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder-muted-foreground resize-vertical min-h-[100px]'
              />
            ) : field.type === 'select' ? (
              <select
                value={(values[field.key] as string) || ''}
                onChange={e => handleFieldChange(field.key, e.target.value)}
                disabled={field.disabled || isSaving}
                className='w-full px-3 py-2 border border-border rounded-md bg-background text-foreground'
              >
                <option value=''>Select an option</option>
                {field.options?.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : field.type === 'checkbox' ? (
              <label className='flex items-center gap-2 cursor-pointer'>
                <input
                  type='checkbox'
                  checked={(values[field.key] as boolean) || false}
                  onChange={e => handleFieldChange(field.key, e.target.checked)}
                  disabled={field.disabled || isSaving}
                  className='w-4 h-4 rounded border-border'
                />
                <span className='text-sm'>{field.placeholder}</span>
              </label>
            ) : (
              <input
                type={field.type}
                value={(values[field.key] as string | number) || ''}
                onChange={e => handleFieldChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                disabled={field.disabled || isSaving}
                className='w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder-muted-foreground'
              />
            )}

            {errors[field.key] && (
              <p className='text-sm text-red-500'>{errors[field.key]}</p>
            )}

            {field.helperText && !errors[field.key] && (
              <p className='text-sm text-muted-foreground'>{field.helperText}</p>
            )}
          </div>
        ))}
      </div>
    </FormModal>
  );
}
