import { cn } from '@/shared/utils';

import { Card } from './card';
import { Label } from './label';
import { SectionHeader } from './section-header';

import { cloneElement, isValidElement, useId } from 'react';

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
  const cardVariant =
    variant === 'glass' ? 'glass' : variant?.startsWith('subtle') ? 'subtle' : 'default';
  const cardPadding = variant?.endsWith('compact') ? 'sm' : 'default';

  return (
    <Card
      id={id}
      variant={cardVariant}
      padding={cardPadding}
      className={cn('space-y-4', className)}
    >
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
        <div className={cn('grid grid-cols-1 gap-4', gridClassName)}>{children}</div>
      ) : null}
    </Card>
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
  const generatedId = useId().replace(/:/g, '');
  const fieldId = id ?? (label ? `form-field-${generatedId}` : undefined);

  const linkedChildren =
    fieldId &&
    isValidElement<{ id?: string }>(children) &&
    (children.props.id === undefined || children.props.id === '')
      ? cloneElement(children, { id: fieldId })
      : children;

  return (
    <div className={cn('space-y-2', className)}>
      <div className='space-y-1'>
        {label || actions ? (
          <div className='flex items-center justify-between gap-2'>
            {label ? (
              <Label
                htmlFor={fieldId}
                className={cn(
                  'text-[11px] font-medium uppercase tracking-wider text-gray-400',
                  required && 'after:content-[\'*\'] after:ml-0.5 after:text-red-500'
                )}
              >
                {label}
              </Label>
            ) : (
              <span />
            )}
            {actions ? <div className='shrink-0'>{actions}</div> : null}
          </div>
        ) : null}
        {description && (
          <p className='text-[10px] text-gray-500 italic leading-relaxed'>{description}</p>
        )}
      </div>
      {linkedChildren ?? null}
      {error && (
        <p className='text-[10px] font-medium text-red-400 mt-1' role='alert'>
          {error}
        </p>
      )}
    </div>
  );
}
