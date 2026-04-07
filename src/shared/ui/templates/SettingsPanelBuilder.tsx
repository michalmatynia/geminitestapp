'use client';

import type { LabeledOptionDto, UnknownRecordDto } from '@/shared/contracts/base';
import type { SettingsFieldsRendererProps, SettingsPanelField } from '@/shared/contracts/ui/settings';
import { cn } from '@/shared/utils/ui-utils';

import { Checkbox } from '../checkbox';
import { FormField } from '../form-section';
import { FormModal } from '../FormModal';
import { Input } from '../input';
import { PasswordInput } from '../password-input';
import { Label } from '../label';
import { SelectSimple } from '../select-simple';
import { Switch } from '../switch';
import { Textarea } from '../textarea';

const normalizeSelectOptions = (
  options?: ReadonlyArray<LabeledOptionDto<string | number>>
): Array<LabeledOptionDto<string>> =>
  (options ?? []).map((option) => ({ label: option.label, value: String(option.value) }));

export type {
  SettingsFieldsRendererProps,
  SettingsPanelField,
} from '@/shared/contracts/ui';
export type { FieldType, SettingsFieldRenderProps } from '@/shared/contracts/ui';

/**
 * Renders a list of settings fields based on configuration.
 */
export function SettingsFieldsRenderer<T extends object>(props: SettingsFieldsRendererProps<T>) {
  const { fields, values, errors, onChange, disabled = false, className } = props;
  const resolvedErrors: Partial<Record<keyof T, string>> =
    errors ?? ({} as Partial<Record<keyof T, string>>);
  const isHexColor = (value: string): boolean =>
    /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value.trim());
  const clampChannel = (value: number): number => Math.max(0, Math.min(255, Math.round(value)));
  const normalizeHexColor = (value: string): string | null => {
    const trimmed = value.trim();
    if (!trimmed.startsWith('#')) return null;
    const hex = trimmed.slice(1);
    if (!hex.length) return null;
    if (hex.length === 3 || hex.length === 4) {
      return `#${hex
        .slice(0, 3)
        .split('')
        .map((char) => char + char)
        .join('')}`;
    }
    if (hex.length === 6 || hex.length === 8) {
      return `#${hex.slice(0, 6)}`;
    }
    return null;
  };
  const extractColorToken = (value: string): string | null => {
    const match = value.match(
      /(#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})|rgba?\([^)]*\)|hsla?\([^)]*\))/i
    );
    return match ? match[0] : null;
  };
  const parseRgbToHex = (value: string): string | null => {
    const match = value.match(/rgba?\(([^)]+)\)/i);
    if (!match?.[1]) return null;
    const parts = match[1].split(',').map((part) => part.trim());
    if (parts.length < 3) return null;
    const toChannel = (part: string): number => {
      if (part.endsWith('%')) {
        return clampChannel((parseFloat(part) / 100) * 255);
      }
      const parsed = parseFloat(part);
      if (Number.isNaN(parsed)) return 0;
      if (parsed <= 1 && part.includes('.')) {
        return clampChannel(parsed * 255);
      }
      return clampChannel(parsed);
    };
    const r = toChannel(parts[0]!);
    const g = toChannel(parts[1]!);
    const b = toChannel(parts[2]!);    return (
      '#' +
      [r, g, b]
        .map((channel) => channel.toString(16).padStart(2, '0'))
        .join('')
    );
  };
  const hslToRgb = (hue: number, saturation: number, lightness: number): [number, number, number] => {
    const s = Math.max(0, Math.min(1, saturation));
    const l = Math.max(0, Math.min(1, lightness));
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const h = ((hue % 360) + 360) % 360;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0;
    let g = 0;
    let b = 0;

    if (h < 60) {
      r = c;
      g = x;
    } else if (h < 120) {
      r = x;
      g = c;
    } else if (h < 180) {
      g = c;
      b = x;
    } else if (h < 240) {
      g = x;
      b = c;
    } else if (h < 300) {
      r = x;
      b = c;
    } else {
      r = c;
      b = x;
    }

    return [
      clampChannel((r + m) * 255),
      clampChannel((g + m) * 255),
      clampChannel((b + m) * 255),
    ];
  };
  const parseHslToHex = (value: string): string | null => {
    const match = value.match(/hsla?\(([^)]+)\)/i);
    if (!match?.[1]) return null;
    const parts = match[1].split(',').map((part) => part.trim());
    if (parts.length < 3) return null;
    const hue = parseFloat(parts[0]!);
    const saturationRaw = parts[1]!;
    const lightnessRaw = parts[2]!;    if (Number.isNaN(hue)) return null;
    const saturation = saturationRaw.endsWith('%')
      ? parseFloat(saturationRaw) / 100
      : parseFloat(saturationRaw);
    const lightness = lightnessRaw.endsWith('%')
      ? parseFloat(lightnessRaw) / 100
      : parseFloat(lightnessRaw);
    if (Number.isNaN(saturation) || Number.isNaN(lightness)) return null;
    const [r, g, b] = hslToRgb(hue, saturation, lightness);
    return (
      '#' +
      [r, g, b]
        .map((channel) => channel.toString(16).padStart(2, '0'))
        .join('')
    );
  };
  const derivePickerColor = (rawValue: string): string => {
    const trimmed = rawValue.trim();
    if (!trimmed.length) return '#000000';
    const normalizedHex =
      (isHexColor(trimmed) ? normalizeHexColor(trimmed) : null) ??
      normalizeHexColor(extractColorToken(trimmed) ?? '');
    if (normalizedHex) return normalizedHex;
    const token = extractColorToken(trimmed) ?? trimmed;
    const rgbHex = parseRgbToHex(token);
    if (rgbHex) return rgbHex;
    const hslHex = parseHslToHex(token);
    if (hslHex) return hslHex;
    return '#000000';
  };

  const handleFieldChange = (key: keyof T, value: unknown) => {
    onChange({ [key]: value } as Partial<T>);
  };

  return (
    <div className={cn('space-y-6', className)}>
      {fields.map((field, index: number) => {
        const fieldName = field.key;
        const fieldKey = `${String(field.key)}-${index}`;
        const fieldId = `settings-field-${fieldKey}`;
        const fieldValue = values[fieldName];
        const fieldError = resolvedErrors[fieldName];
        const descriptionId = field.helperText ? `${fieldId}-description` : undefined;
        const errorId = fieldError ? `${fieldId}-error` : undefined;
        const describedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined;
        const isInvalid = Boolean(fieldError);
        return (
          <div key={fieldKey}>
            {field.render ? (
              <FormField
                id={fieldId}
                label={field.label}
                required={field.required}
                description={field.helperText}
                descriptionId={descriptionId}
                error={fieldError}
                errorId={errorId}
              >
                {field.render({
                  value: fieldValue,
                  onChange: (value: unknown) => handleFieldChange(fieldName, value),
                  disabled: field.disabled || disabled,
                  ...(fieldError !== undefined ? { error: fieldError } : {}),
                })}
              </FormField>
            ) : field.type === 'textarea' ? (
              <FormField
                controlId={fieldId}
                label={field.label}
                required={field.required}
                description={field.helperText}
                descriptionId={descriptionId}
                error={fieldError}
                errorId={errorId}
              >
                <Textarea
                  id={fieldId}
                  value={typeof fieldValue === 'string' ? fieldValue : ''}
                  onChange={(e) => handleFieldChange(fieldName, e.target.value)}
                  placeholder={field.placeholder}
                  disabled={field.disabled || disabled}
                  className='min-h-[100px]'
                  aria-describedby={describedBy}
                  aria-invalid={isInvalid || undefined}
                  aria-errormessage={errorId}
                  aria-label={field.label}
                 title={field.placeholder}/>
              </FormField>
            ) : field.type === 'select' ? (
              <FormField
                controlId={fieldId}
                label={field.label}
                required={field.required}
                description={field.helperText}
                descriptionId={descriptionId}
                error={fieldError}
                errorId={errorId}
              >
                <SelectSimple
                  value={
                    fieldValue !== undefined && fieldValue !== null ? String(fieldValue) : ''
                  }
                  onValueChange={(val: string) => handleFieldChange(fieldName, val)}
                  disabled={field.disabled || disabled}
                  options={normalizeSelectOptions(field.options)}
                  placeholder={field.placeholder || 'Select an option'}
                  ariaLabel={field.label}
                  id={fieldId}
                  ariaDescribedBy={describedBy}
                  ariaInvalid={isInvalid || undefined}
                  ariaErrorMessage={errorId}
                 title={field.placeholder || 'Select an option'}/>
              </FormField>
            ) : field.type === 'checkbox' ? (
              <div className='flex items-center gap-2 py-2'>
                <Checkbox
                  id={fieldId}
                  checked={Boolean(fieldValue)}
                  onCheckedChange={(checked: boolean) => handleFieldChange(fieldName, !!checked)}
                  disabled={field.disabled || disabled}
                  aria-describedby={describedBy}
                  aria-invalid={isInvalid || undefined}
                  aria-errormessage={errorId}
                />
                <Label htmlFor={fieldId} className='text-sm cursor-pointer'>
                  {field.label}
                  {field.required && <span className='text-red-500 ml-1'>*</span>}
                </Label>
                {field.helperText && (
                  <p className='text-xs text-muted-foreground ml-6' id={descriptionId}>
                    {field.helperText}
                  </p>
                )}
                {fieldError && (
                  <p className='text-xs text-red-500 ml-6' id={errorId} role='alert'>
                    {fieldError}
                  </p>
                )}
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
                    <p className='text-[11px] text-muted-foreground' id={descriptionId}>
                      {field.helperText}
                    </p>
                  )}
                </div>
                <Switch
                  id={fieldId}
                  checked={Boolean(fieldValue)}
                  onCheckedChange={(checked: boolean) => handleFieldChange(fieldName, !!checked)}
                  disabled={field.disabled || disabled}
                  aria-describedby={describedBy}
                  aria-invalid={isInvalid || undefined}
                  aria-errormessage={errorId}
                />
                {fieldError && (
                  <p className='text-xs text-red-500 mt-1' id={errorId} role='alert'>
                    {fieldError}
                  </p>
                )}
              </div>
            ) : field.type === 'color' ? (
              <FormField
                controlId={fieldId}
                label={field.label}
                required={field.required}
                description={field.helperText}
                descriptionId={descriptionId}
                error={fieldError}
                errorId={errorId}
              >
                <div className='flex items-center gap-2'>
                  <div
                    className='size-8 rounded border border-border shrink-0 overflow-hidden'
                    style={{ backgroundColor: String(fieldValue || '#000000') }}
                  >
                    <input
                      type='color'
                      id={`${fieldId}-picker`}
                      value={String(fieldValue || '#000000')}
                      onChange={(e) => handleFieldChange(fieldName, e.target.value)}
                      className='opacity-0 size-full cursor-pointer'
                      disabled={field.disabled || disabled}
                      aria-describedby={describedBy}
                      aria-invalid={isInvalid || undefined}
                      aria-errormessage={errorId}
                      aria-label={`${field.label} color picker`}
                    />
                  </div>
                  <Input
                    id={fieldId}
                    value={String(fieldValue || '#000000')}
                    onChange={(e) => handleFieldChange(fieldName, e.target.value)}
                    placeholder='#000000'
                    disabled={field.disabled || disabled}
                    className='font-mono'
                    aria-describedby={describedBy}
                    aria-invalid={isInvalid || undefined}
                    aria-errormessage={errorId}
                    aria-label={`${field.label} value`}
                   title='#000000'/>
                </div>
              </FormField>
            ) : field.type === 'background' ? (
              <FormField
                controlId={fieldId}
                label={field.label}
                required={field.required}
                description={field.helperText}
                descriptionId={descriptionId}
                error={fieldError}
                errorId={errorId}
              >
                {(() => {
                  const rawValue = String(fieldValue ?? '');
                  const trimmedValue = rawValue.trim();
                  const isAuto = trimmedValue.length === 0;
                  return (
                <div className='flex items-center gap-2'>
                  <div
                    className={cn(
                      'size-8 rounded border border-border shrink-0 overflow-hidden flex items-center justify-center text-[8px] uppercase',
                      isAuto ? 'border-dashed bg-muted/40' : ''
                    )}
                    style={isAuto ? undefined : { background: rawValue }}
                  >
                    {isAuto ? <span className='text-muted-foreground'>Auto</span> : null}
                  </div>
                  <input
                    type='color'
                    id={`${fieldId}-picker`}
                    value={derivePickerColor(rawValue)}
                    onChange={(e) => handleFieldChange(fieldName, e.target.value)}
                    className='h-8 w-8 cursor-pointer rounded border border-border'
                    disabled={field.disabled || disabled}
                    aria-describedby={describedBy}
                    aria-invalid={isInvalid || undefined}
                    aria-errormessage={errorId}
                    aria-label={`${field.label} color picker`}
                  />
                  <Input
                    id={fieldId}
                    value={rawValue}
                    onChange={(e) => handleFieldChange(fieldName, e.target.value)}
                    placeholder={field.placeholder}
                    disabled={field.disabled || disabled}
                    className='font-mono'
                    aria-describedby={describedBy}
                    aria-invalid={isInvalid || undefined}
                    aria-errormessage={errorId}
                    aria-label={`${field.label} value`}
                   title={field.placeholder}/>
                </div>
                  );
                })()}
              </FormField>
            ) : field.type === 'range' ? (
              <FormField
                controlId={fieldId}
                label={field.label}
                required={field.required}
                description={field.helperText}
                descriptionId={descriptionId}
                error={fieldError}
                errorId={errorId}
                actions={
                  <span className='text-xs font-mono text-muted-foreground'>
                    {(typeof fieldValue === 'number' ? fieldValue : 0) ?? 0}
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
                  value={(typeof fieldValue === 'number' ? fieldValue : undefined) ?? field.min ?? 0}
                  onChange={(e) => handleFieldChange(fieldName, Number(e.target.value))}
                  className='w-full accent-primary h-2 bg-muted rounded-lg appearance-none cursor-pointer'
                  disabled={field.disabled || disabled}
                  aria-describedby={describedBy}
                  aria-invalid={isInvalid || undefined}
                  aria-errormessage={errorId}
                  aria-label={field.label}
                />
              </FormField>
            ) : (
              <FormField
                controlId={fieldId}
                label={field.label}
                required={field.required}
                description={field.helperText}
                descriptionId={descriptionId}
                error={fieldError}
                errorId={errorId}
              >
                <div className='flex items-center gap-2'>
                  {field.type === 'password' ? (
                    <PasswordInput
                      id={fieldId}
                      value={
                        fieldValue !== undefined && fieldValue !== null
                          ? String(fieldValue)
                          : ''
                      }
                      onChange={(e) => handleFieldChange(fieldName, e.target.value)}
                      placeholder={field.placeholder}
                      disabled={field.disabled || disabled}
                      className='flex-1'
                      containerClassName='flex-1'
                      aria-describedby={describedBy}
                      aria-invalid={isInvalid || undefined}
                      aria-errormessage={errorId}
                      aria-label={field.label}
                      title={field.placeholder}
                    />
                  ) : (
                    <Input
                      id={fieldId}
                      type={field.type}
                      value={
                        fieldValue !== undefined && fieldValue !== null
                          ? String(fieldValue)
                          : ''
                      }
                      onChange={(e) =>
                        handleFieldChange(
                          fieldName,
                          field.type === 'number' ? Number(e.target.value) : e.target.value
                        )
                      }
                      placeholder={field.placeholder}
                      disabled={field.disabled || disabled}
                      min={field.min}
                      max={field.max}
                      step={field.step}
                      className='flex-1'
                      aria-describedby={describedBy}
                      aria-invalid={isInvalid || undefined}
                      aria-errormessage={errorId}
                      aria-label={field.label}
                      title={field.placeholder}
                    />
                  )}
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

type SettingsPanelBuilderShape = UnknownRecordDto;

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
      cancelText={cancelText ?? 'Cancel'}
      showSaveButton={showSaveButton}
      showCancelButton={showCancelButton}
    >
      <SettingsFieldsRenderer
        fields={fields as SettingsPanelField<SettingsPanelBuilderShape>[]}
        values={values as SettingsPanelBuilderShape}
        errors={errors as Partial<Record<string, string>>}
        onChange={(nextValues: Partial<SettingsPanelBuilderShape>) => {
          onChange(nextValues as Partial<T>);
        }}
        disabled={isSaving}
      />
    </FormModal>
  );
}
