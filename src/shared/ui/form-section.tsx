import { cloneElement, isValidElement, useId, useMemo } from 'react';

import { cn } from '@/shared/utils';

import { Card } from './card';
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

export function FormSection(props: FormSectionProps): React.JSX.Element {
  const {
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
  } = props;

  const cardVariant =
    variant === 'glass' ? 'glass' : variant?.startsWith('subtle') ? 'subtle' : 'default';
  const cardPadding = variant?.endsWith('compact') ? 'sm' : 'default';
  const headerRuntime = useMemo(
    () => ({
      title: title ?? '',
      subtitle,
      icon: titleIcon,
      description,
      actions,
    }),
    [title, subtitle, titleIcon, description, actions]
  );

  return (
    <Card
      id={id}
      variant={cardVariant}
      padding={cardPadding}
      className={cn('space-y-4', className)}
    >
      {(title || subtitle || description || actions) && (
        <SectionHeader
          title={headerRuntime.title}
          subtitle={headerRuntime.subtitle}
          icon={headerRuntime.icon}
          description={headerRuntime.description}
          actions={headerRuntime.actions}
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
  controlId?: string | undefined;
  descriptionId?: string | undefined;
  errorId?: string | undefined;
}

export function FormField(props: FormFieldProps): React.JSX.Element {
  const {
    label,
    description,
    actions,
    children,
    error,
    required,
    className,
    id,
    controlId,
    descriptionId,
    errorId,
  } = props;

  const generatedId = useId().replace(/:/g, '');
  const fieldId = controlId ?? id ?? (label ? `form-field-${generatedId}` : undefined);
  const resolvedDescriptionId =
    descriptionId ?? (description && fieldId ? `${fieldId}-description` : undefined);
  const resolvedErrorId = errorId ?? (error && fieldId ? `${fieldId}-error` : undefined);

  const mergeIds = (existing?: string, next?: string): string | undefined => {
    if (!next) return existing;
    if (!existing) return next;
    const merged = new Set(
      `${existing} ${next}`
        .split(' ')
        .map((value) => value.trim())
        .filter(Boolean)
    );
    return Array.from(merged).join(' ');
  };

  const describedBy = mergeIds(resolvedDescriptionId, resolvedErrorId);

  const linkedChildren =
    isValidElement(children)
      ? cloneElement(children, {
          ...(fieldId &&
          !controlId &&
          (children.props.id === undefined || children.props.id === '')
            ? { id: fieldId }
            : {}),
          ...(describedBy
            ? {
                'aria-describedby': mergeIds(children.props['aria-describedby'], describedBy),
              }
            : {}),
          ...(resolvedErrorId
            ? {
                'aria-errormessage': mergeIds(
                  children.props['aria-errormessage'],
                  resolvedErrorId
                ),
              }
            : {}),
          ...(error
            ? {
                'aria-invalid':
                  children.props['aria-invalid'] !== undefined
                    ? children.props['aria-invalid']
                    : true,
              }
            : {}),
        })
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
          <p
            className='text-[10px] text-gray-500 italic leading-relaxed'
            id={resolvedDescriptionId}
          >
            {description}
          </p>
        )}
      </div>
      {linkedChildren ?? null}
      {error && (
        <p
          className='text-[10px] font-medium text-red-400 mt-1'
          role='alert'
          id={resolvedErrorId}
        >
          {error}
        </p>
      )}
    </div>
  );
}
