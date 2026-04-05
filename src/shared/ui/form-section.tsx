'use client';

import { cloneElement, isValidElement, useId, useMemo } from 'react';

import { cn } from '@/shared/utils/ui-utils';

import { Card } from './card';
import { Label } from './label';
import { SectionHeader } from './section-header';


import type { ReactElement, ReactNode } from 'react';

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

  const childElement = isValidElement(children)
    ? (children as ReactElement<Record<string, unknown>>)
    : null;
  const childProps = childElement?.props ?? {};
  const childId = typeof childProps['id'] === 'string' ? childProps['id'] : undefined;
  const childDescribedBy =
    typeof childProps['aria-describedby'] === 'string'
      ? childProps['aria-describedby']
      : undefined;
  const childErrorMessage =
    typeof childProps['aria-errormessage'] === 'string'
      ? childProps['aria-errormessage']
      : undefined;
  const childAriaInvalid =
    typeof childProps['aria-invalid'] === 'boolean' || typeof childProps['aria-invalid'] === 'string'
      ? childProps['aria-invalid']
      : undefined;

  const linkedChildren = childElement
    ? cloneElement(childElement, {
        ...(fieldId && !controlId && (!childId || childId === '') ? { id: fieldId } : {}),
        ...(describedBy ? { 'aria-describedby': mergeIds(childDescribedBy, describedBy) } : {}),
        ...(resolvedErrorId
          ? {
              'aria-errormessage': mergeIds(childErrorMessage, resolvedErrorId),
            }
          : {}),
        ...(error ? { 'aria-invalid': childAriaInvalid ?? true } : {}),
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
