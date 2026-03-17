import React from 'react';

export const UI_CENTER_ROW_SPACED_CLASSNAME = 'ui-center-row-spaced';
export const UI_GRID_RELAXED_CLASSNAME = 'ui-grid-relaxed';

export function MockButton({
  children,
  disabled,
  loading: _loading,
  onClick,
  type = 'button',
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
}): React.JSX.Element {
  return (
    <button type={type} disabled={disabled} onClick={onClick} {...rest}>
      {children}
    </button>
  );
}

export function MockEmptyState({
  description,
  title,
}: {
  description: string;
  title: string;
}): React.JSX.Element {
  return (
    <div>
      <div>{title}</div>
      <div>{description}</div>
    </div>
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

export function MockFormModal({
  actions,
  children,
  isSaveDisabled = false,
  onClose,
  onSave,
  open,
  saveText = 'Save',
  title,
}: {
  actions?: React.ReactNode;
  children: React.ReactNode;
  isSaveDisabled?: boolean;
  onClose: () => void;
  onSave: () => void;
  open: boolean;
  saveText?: string;
  title: string;
}): React.JSX.Element | null {
  if (!open) return null;

  return (
    <div data-testid='form-modal'>
      <div>{title}</div>
      <button type='button' onClick={onClose}>
        Close
      </button>
      <button type='button' onClick={onSave} disabled={isSaveDisabled}>
        {saveText}
      </button>
      {actions}
      {children}
    </div>
  );
}

export function MockHint({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return <div>{children}</div>;
}

export function MockInlineImagePreviewCanvas({
  imageAlt,
  imageSrc,
}: {
  imageAlt: string;
  imageSrc: string | null;
}): React.JSX.Element {
  return (
    <div>
      Preview:{imageAlt}:{imageSrc ?? 'none'}
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
      {onSave ? (
        <button type='button' onClick={onSave} disabled={isDisabled}>
          {saveText}
        </button>
      ) : null}
    </div>
  );
}

export function MockFileUploadTrigger({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return <>{children}</>;
}

export function MockLoadingState({
  message,
}: {
  message: string;
}): React.JSX.Element {
  return <div>{message}</div>;
}

export function MockMetadataItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}): React.JSX.Element {
  return (
    <div>
      {label}:{value}
    </div>
  );
}

export function MockStandardDataTablePanel({
  data,
}: {
  data: Array<{ path: string; value: unknown }>;
}): React.JSX.Element {
  return (
    <div>
      {data.map((row) => (
        <div key={row.path}>
          {row.path}:{String(row.value)}
        </div>
      ))}
    </div>
  );
}

export function MockTestTabs({
  children,
  onValueChange,
  value,
}: {
  children: React.ReactNode;
  onValueChange: (value: string) => void;
  value: string;
}): React.JSX.Element {
  return (
    <div data-testid='tabs-root' data-value={value}>
      <button type='button' onClick={() => onValueChange('generations')}>
        Trigger Generations
      </button>
      <button type='button' onClick={() => onValueChange('not-a-real-tab')}>
        Trigger Invalid
      </button>
      {children}
    </div>
  );
}

export function MockTestTabsList({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return <div>{children}</div>;
}

export function MockTestTabsTrigger({
  children,
  value,
}: {
  children: React.ReactNode;
  value: string;
}): React.JSX.Element {
  return <button type='button'>{children}:{value}</button>;
}

export function MockNextImage({
  fill: _fill,
  unoptimized: _unoptimized,
  ...props
}: React.ImgHTMLAttributes<HTMLImageElement> & {
  fill?: boolean;
  unoptimized?: boolean;
}): React.JSX.Element {
  return React.createElement('img', { ...props, alt: props.alt ?? '' });
}

export function MockStatusBadge({
  status,
}: {
  status: string;
}): React.JSX.Element {
  return <div>{status}</div>;
}

export function MockProductImageManager({
  showDragHandle,
}: {
  showDragHandle?: boolean;
}): React.JSX.Element {
  return <div>Product Image Manager:{showDragHandle ? 'drag' : 'nodrag'}</div>;
}

export function MockProductImageManagerControllerProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: { imageSlots?: unknown[] };
}): React.JSX.Element {
  return (
    <div data-testid='product-image-manager-provider' data-slot-count={value.imageSlots?.length ?? 0}>
      {children}
    </div>
  );
}

export function MockTabsContent({
  children,
  className,
  value,
}: {
  children: React.ReactNode;
  className?: string;
  value: string;
}): React.JSX.Element {
  return (
    <div data-testid='tabs-content' data-classname={className ?? ''} data-value={value}>
      {children}
    </div>
  );
}
