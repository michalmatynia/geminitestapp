import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import type { DataAttributes } from '@/shared/contracts/ui';
import { cn } from '@/shared/utils/ui-utils';
import { resolveAccessibleLabel, warnMissingAccessibleLabel } from '@/shared/utils/a11y';

const textareaVariants = cva(
  'flex min-h-[80px] w-full rounded-md border border-foreground/10 px-3 py-2 text-sm transition-colors ring-offset-background placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:border-foreground/30 hover:border-foreground/20 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-transparent',
        subtle: 'bg-foreground/5 border-foreground/5 focus:bg-transparent',
      },
      size: {
        default: '',
        xs: 'text-[11px]',
        sm: 'text-xs',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface TextareaProps
  extends
    React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof textareaVariants>,
    DataAttributes {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      variant,
      size,
      id,
      name,
      placeholder,
      title,
      'data-testid': dataTestId,
      'data-doc-id': dataDocId,
      'data-doc-alias': dataDocAlias,
      'aria-label': ariaLabelProp,
      'aria-labelledby': ariaLabelledByProp,
      ...props
    },
    ref
  ) => {
    const allowFallbackLabel = !ariaLabelledByProp && !id;
    const { ariaLabel: resolvedAriaLabel, hasAccessibleLabel } = resolveAccessibleLabel({
      children: null,
      ariaLabel: ariaLabelProp,
      ariaLabelledBy: ariaLabelledByProp,
      title: allowFallbackLabel ? title : undefined,
      fallbackLabel: allowFallbackLabel
        ? placeholder ??
          name ??
          (typeof dataDocAlias === 'string' ? dataDocAlias : undefined) ??
          (typeof dataDocId === 'string' ? dataDocId : undefined) ??
          (typeof dataTestId === 'string' ? dataTestId : undefined)
        : undefined,
    });
    const hasLabel = hasAccessibleLabel || Boolean(id);
    if (!hasLabel) {
      warnMissingAccessibleLabel({ componentName: 'Textarea', hasAccessibleLabel: hasLabel });
    }
    return (
      <textarea
        className={cn(textareaVariants({ variant, size, className }))}
        ref={ref}
        id={id}
        name={name}
        placeholder={placeholder}
        aria-label={resolvedAriaLabel}
        aria-labelledby={ariaLabelledByProp}
        title={title}
        data-testid={dataTestId}
        data-doc-id={dataDocId}
        data-doc-alias={dataDocAlias}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea };
