import React from 'react';

export function MockButton({
  children,
  disabled,
  loading: _loading,
  loadingText: _loadingText,
  onClick,
  type = 'button',
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  loadingText?: string;
}): React.JSX.Element {
  return (
    <button type={type} disabled={disabled} onClick={onClick} {...rest}>
      {children}
    </button>
  );
}

export function MockDetailModal({
  children,
  footer,
  header,
  isOpen,
  onClose,
  subtitle,
  title,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
  header?: React.ReactNode;
  isOpen: boolean;
  onClose?: () => void;
  subtitle?: string;
  title: string;
}): React.JSX.Element | null {
  if (!isOpen) return null;

  return (
    <div data-testid='detail-modal' data-open='true'>
      <div>{title}</div>
      {subtitle ? <div>{subtitle}</div> : null}
      {onClose ? (
        <button type='button' onClick={onClose}>
          Close
        </button>
      ) : null}
      {header}
      {children}
      {footer}
    </div>
  );
}

export function MockFormActions({
  cancelText = 'Cancel',
  isDisabled = false,
  onCancel,
  onSave,
  saveText = 'Save',
}: {
  cancelText?: string;
  isDisabled?: boolean;
  onCancel?: () => void;
  onSave?: () => void;
  saveText?: string;
}): React.JSX.Element {
  return (
    <div>
      <button type='button' onClick={onCancel}>
        {cancelText}
      </button>
      <button type='button' onClick={onSave} disabled={isDisabled}>
        {saveText}
      </button>
    </div>
  );
}

export function MockInput(
  props: React.InputHTMLAttributes<HTMLInputElement>
): React.JSX.Element {
  return <input {...props} />;
}

export function MockLabel({
  children,
  ...rest
}: React.LabelHTMLAttributes<HTMLLabelElement>): React.JSX.Element {
  return <label {...rest}>{children}</label>;
}

export function MockNextImage({
  fill: _fill,
  unoptimized: _unoptimized,
  ...props
}: React.ImgHTMLAttributes<HTMLImageElement> & {
  fill?: boolean;
  unoptimized?: boolean;
}): React.JSX.Element {
  // eslint-disable-next-line @next/next/no-img-element
  return <img {...props} alt={props.alt ?? ''} />;
}

export function MockSelectSimple({
  ariaLabel,
  onValueChange,
  options,
  value,
}: {
  ariaLabel?: string;
  onValueChange?: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  value: string;
}): React.JSX.Element {
  const label = ariaLabel ?? 'Preview Mode';

  return (
    <label>
      {label}
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onValueChange?.(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
