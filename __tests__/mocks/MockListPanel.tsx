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
  const { title, description, header, filters, actions, alerts, footer, children } = props;
  return (
    <div data-testid="list-panel">
      {title && <h1>{title}</h1>}
      {description && <p>{description}</p>}
      {header}
      {filters}
      {actions}
      {alerts}
      {children}
      {footer}
    </div>
  );
}
