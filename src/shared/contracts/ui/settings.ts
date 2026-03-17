import type { ReactNode } from 'react';
import type { LabeledOptionDto } from './base';

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
  | 'background'
  | 'range'
  | 'custom';

export interface SettingsPanelField<T extends object> {
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
  options?: ReadonlyArray<LabeledOptionDto<string | number>>;

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
  fields: SettingsPanelField<T>[];
  values: T;
  errors?: Partial<Record<keyof T, string>>;
  onChange: (values: Partial<T>) => void;
  disabled?: boolean;
  className?: string;
}
