'use client';

import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import * as React from 'react';

import type { DataAttributes } from '@/shared/contracts/ui';
import { cn } from '@/shared/utils/ui-utils';
import { resolveAccessibleLabel, warnMissingAccessibleLabel } from '@/shared/utils/a11y';

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> & DataAttributes
>(
  (
    {
      className,
      id,
      name,
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
        ? name ??
          (typeof dataDocAlias === 'string' ? dataDocAlias : undefined) ??
          (typeof dataDocId === 'string' ? dataDocId : undefined) ??
          (typeof dataTestId === 'string' ? dataTestId : undefined)
        : undefined,
    });
    const hasLabel = hasAccessibleLabel || Boolean(id);
    if (!hasLabel) {
      warnMissingAccessibleLabel({ componentName: 'Checkbox', hasAccessibleLabel: hasLabel });
    }

    return (
      <CheckboxPrimitive.Root
        ref={ref}
        className={cn(
          'peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
          className
        )}
        id={id}
        name={name}
        aria-label={hasLabel ? resolvedAriaLabel : undefined}
        aria-labelledby={ariaLabelledByProp}
        title={title}
        data-testid={dataTestId}
        data-doc-id={dataDocId}
        data-doc-alias={dataDocAlias}
        {...props}
      >
        <CheckboxPrimitive.Indicator
          className={cn('flex items-center justify-center text-current')}
        >
          <Check className='size-4' aria-hidden='true' />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
    );
  }
);
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
