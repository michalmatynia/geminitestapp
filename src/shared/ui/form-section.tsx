'use client';

import { cn } from '@/shared/utils';

import { Label } from './label';
import { SectionHeader } from './section-header';

import type { ReactNode } from 'react';

interface FormSectionProps {
  title?: ReactNode | undefined;
  subtitle?: ReactNode | undefined;
  titleIcon?: ReactNode | undefined;
  description?: string | undefined;
  actions?: ReactNode | undefined;
  children?: ReactNode | undefined;
  className?: string | undefined;
  gridClassName?: string | undefined;
  variant?: 'default' | 'compact' | 'subtle' | 'subtle-compact' | 'glass' | undefined;
  id?: string | undefined;
}

export function FormSection({
  title,
  subtitle,
  titleIcon,
  description,
  actions,
  children,
  className,
  gridClassName,
  variant = 'subtle',
  id,
}: FormSectionProps): React.JSX.Element {
  const variantClasses = {
    default: 'rounded-lg border border-border bg-card p-4',
    compact: 'rounded-md border border-border bg-card p-3',
    subtle: 'rounded-lg border border-border/60 bg-card/40 p-4',
    'subtle-compact': 'rounded-md border border-border/60 bg-card/40 p-3',
    glass: 'rounded-lg border border-white/10 bg-white/5 backdrop-blur-md p-4',
  }[variant];

  return (
    <div id={id} className={cn('space-y-4', variantClasses, className)}>
      {(title || subtitle || description || actions) && (
        <SectionHeader
          title={title ?? ''}
          subtitle={subtitle}
          icon={titleIcon}
          description={description}
          actions={actions}
          size='xs'
        />
      )}
      {children ? (
        <div className={cn('grid grid-cols-1 gap-4', gridClassName)}>
          {children}
        </div>
      ) : null}
    </div>
  );
}

interface FormFieldProps {
  label?: string | undefined;
  description?: string | undefined;
  actions?: ReactNode | undefined;
  children?: ReactNode | undefined;
  error?: string | null | undefined;
  required?: boolean | undefined;
  className?: string | undefined;
  id?: string | undefined;
}

export function FormField({
  label,
  description,
  actions,
  children,
  error,
  required,
  className,
  id,
}: FormFieldProps): React.JSX.Element {
  return (
    <div className={cn('space-y-2', className)}>
      <div className='space-y-1'>
        {label || actions ? (
          <div className='flex items-center justify-between gap-2'>
            {label ? (
              <Label htmlFor={id} className={cn('text-[11px] font-medium uppercase tracking-wider text-gray-400', required && 'after:content-[\'*\'] after:ml-0.5 after:text-red-500')}>
                {label}
              </Label>
            ) : (
              <span />
            )}
            {actions ? <div className='shrink-0'>{actions}</div> : null}
          </div>
        ) : null}
        {description && <p className='text-[10px] text-gray-500 italic leading-relaxed'>{description}</p>}
      </div>
      {children ?? null}
      {error && (
        <p className='text-[10px] font-medium text-red-400 mt-1' role='alert'>
          {error}
        </p>
      )}
    </div>
  );
}
