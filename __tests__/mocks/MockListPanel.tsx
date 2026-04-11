import React, { type ReactNode } from 'react';

export interface MockListPanelProps {
  title?: string;
  description?: string;
  eyebrow?: ReactNode;
  icon?: ReactNode;
  headerActions?: ReactNode;
  header?: ReactNode;
  alerts?: ReactNode;
  filters?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  className?: string;
  contentClassName?: string;
  variant?: string;
  isLoading?: boolean;
  loadingMessage?: string;
}

export function MockListPanel(props: MockListPanelProps): React.JSX.Element {
  const {
    title,
    description,
    header,
    filters,
    actions,
    alerts,
    footer,
    children,
    isLoading,
    loadingMessage,
    className,
    contentClassName,
    variant,
  } = props;

  return (
    <div
      data-testid="list-panel"
      data-class-name={className}
      data-content-class-name={contentClassName}
      data-is-loading={String(isLoading)}
      data-loading-message={loadingMessage}
      data-variant={variant}
    >
      {title && <h1>{title}</h1>}
      {description && <p>{description}</p>}
      <div data-testid="list-panel-header">{header}</div>
      <div data-testid="list-panel-alerts">{alerts}</div>
      <div data-testid="list-panel-filters">{filters}</div>
      <div data-testid="list-panel-actions">{actions}</div>
      <div data-testid="list-panel-footer">{footer}</div>
      {isLoading ? (
        <div role="status" aria-live="polite" aria-atomic="true">
          {loadingMessage ?? 'Loading...'}
        </div>
      ) : (
        children
      )}
    </div>
  );
}
