'use client';

import React from 'react';

import { Button, type ButtonProps } from '@/shared/ui';
import { cn } from '@/shared/utils';

export interface StudioActionButtonConfig {
  key: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  loadingText?: string;
  size?: ButtonProps['size'];
  variant?: ButtonProps['variant'];
  type?: ButtonProps['type'];
  className?: string;
  title?: string;
  ariaLabel?: string;
  icon?: React.ReactNode;
}

interface StudioActionButtonRowProps {
  actions: StudioActionButtonConfig[];
  className?: string;
}

export function StudioActionButtonRow({
  actions,
  className,
}: StudioActionButtonRowProps): React.JSX.Element {
  return (
    <div className={cn('flex flex-wrap items-center justify-end gap-2', className)}>
      {actions.map((action) => (
        <Button
          key={action.key}
          type={action.type ?? 'button'}
          size={action.size ?? 'sm'}
          variant={action.variant ?? 'outline'}
          onClick={action.onClick}
          disabled={action.disabled}
          loading={action.loading}
          loadingText={action.loadingText ?? action.label}
          className={action.className}
          title={action.title}
          aria-label={action.ariaLabel}
        >
          {action.icon ? <span className='mr-2'>{action.icon}</span> : null}
          {action.label}
        </Button>
      ))}
    </div>
  );
}
