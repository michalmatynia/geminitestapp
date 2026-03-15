import type { ComponentProps, ReactNode } from 'react';

import {
  KangurCardDescription,
  KangurSectionEyebrow,
} from '@/features/kangur/ui/design/primitives';
import { cn } from '@/shared/utils';

type KangurLabeledValueSummaryProps = {
  className?: string;
  description?: ReactNode;
  descriptionClassName?: string;
  descriptionSize?: ComponentProps<typeof KangurCardDescription>['size'];
  label: ReactNode;
  labelClassName?: string;
  value: ReactNode;
  valueClassName?: string;
  valueTestId?: string;
};

export function KangurLabeledValueSummary({
  className,
  description,
  descriptionClassName,
  descriptionSize = 'xs',
  label,
  labelClassName,
  value,
  valueClassName,
  valueTestId,
}: KangurLabeledValueSummaryProps): React.JSX.Element {
  const labelClass = labelClassName;
  const summaryDescriptionClass = descriptionClassName;
  const summaryDescriptionSize = descriptionSize;

  return (
    <div className={className}>
      <KangurSectionEyebrow className={cn('tracking-[0.2em]', labelClass)}>
        {label}
      </KangurSectionEyebrow>
      <div
        className={cn('mt-2 text-base font-bold [color:var(--kangur-page-text)]', valueClassName)}
        data-testid={valueTestId}
      >
        {value}
      </div>
      {description ? (
        <KangurCardDescription
          as='p'
          className={cn('mt-1', summaryDescriptionClass)}
          size={summaryDescriptionSize}
        >
          {description}
        </KangurCardDescription>
      ) : null}
    </div>
  );
}

export default KangurLabeledValueSummary;
