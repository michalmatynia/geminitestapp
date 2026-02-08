'use client';

import { cn } from '@/shared/utils';

import { Label } from './label';
import { SectionPanel } from './section-panel';

import type { ReactNode } from 'react';

interface FormSectionProps {
  title?: string | undefined;
  description?: string | undefined;
  children: ReactNode;
  className?: string | undefined;
  gridClassName?: string | undefined;
  variant?: 'default' | 'compact' | 'subtle' | 'subtle-compact' | undefined;
}

export function FormSection({
  title,
  description,
  children,
  className,
  gridClassName,
  variant = 'subtle',
}: FormSectionProps): React.JSX.Element {
  return (
    <SectionPanel variant={variant} className={cn('space-y-4', className)}>
      {(title || description) && (
        <div className='space-y-1'>
          {title && <h3 className='text-sm font-semibold text-foreground'>{title}</h3>}
          {description && <p className='text-xs text-muted-foreground'>{description}</p>}
        </div>
      )}
      <div className={cn('grid grid-cols-1 gap-4', gridClassName)}>
        {children}
      </div>
    </SectionPanel>
  );
}

interface FormFieldProps {
  label: string;
  description?: string | undefined;
  children: ReactNode;
  error?: string | undefined;
  required?: boolean | undefined;
  className?: string | undefined;
  id?: string | undefined;
}

export function FormField({
  label,
  description,
  children,
  error,
  required,
  className,
  id,
}: FormFieldProps): React.JSX.Element {
  return (
    <div className={cn('space-y-2', className)}>
      <div className='space-y-1'>
        <Label htmlFor={id} className={cn('text-[11px] font-medium uppercase tracking-wider text-gray-400', required && 'after:content-[\'*\'] after:ml-0.5 after:text-red-500')}>
          {label}
        </Label>
        {description && <p className='text-[10px] text-gray-500 italic leading-relaxed'>{description}</p>}
      </div>
      {children}
      {error && (
        <p className='text-[10px] font-medium text-red-400 mt-1' role='alert'>
          {error}
        </p>
      )}
    </div>
  );
}
