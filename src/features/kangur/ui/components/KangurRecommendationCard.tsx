'use client';

import type { ComponentProps, ReactNode } from 'react';

import {
  KangurCardDescription,
  KangurCardTitle,
  KangurInfoCard,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import { cn } from '@/shared/utils';

type KangurRecommendationCardProps = {
  action?: ReactNode;
  accent: ComponentProps<typeof KangurInfoCard>['accent'];
  bodyClassName?: string;
  className?: string;
  contentClassName?: string;
  dataTestId: string;
  description?: ReactNode;
  descriptionClassName?: string;
  descriptionRelaxed?: boolean;
  descriptionSize?: ComponentProps<typeof KangurCardDescription>['size'];
  descriptionTestId?: string;
  headerClassName?: string;
  headerExtras?: ReactNode;
  label?: ReactNode;
  labelClassName?: string;
  labelContent?: ReactNode;
  labelSize?: ComponentProps<typeof KangurStatusChip>['size'];
  labelStyle?: ComponentProps<typeof KangurStatusChip>['labelStyle'];
  labelTestId?: string;
  title: ReactNode;
  titleClassName?: string;
  titleSize?: ComponentProps<typeof KangurCardTitle>['size'];
  titleTestId: string;
};

export default function KangurRecommendationCard({
  action,
  accent,
  bodyClassName,
  className,
  contentClassName,
  dataTestId,
  description,
  descriptionClassName,
  descriptionRelaxed,
  descriptionSize,
  descriptionTestId,
  headerClassName,
  headerExtras,
  label,
  labelClassName,
  labelContent,
  labelSize,
  labelStyle,
  labelTestId,
  title,
  titleClassName,
  titleSize,
  titleTestId,
}: KangurRecommendationCardProps): React.JSX.Element {
  return (
    <KangurInfoCard
      accent={accent}
      className={cn('w-full', className)}
      data-testid={dataTestId}
      padding='md'
      tone='accent'
    >
      <div className={cn('flex flex-col gap-2 text-left', contentClassName)}>
        <div className={cn('flex flex-wrap items-center gap-2', headerClassName)}>
          {labelContent ??
            (label ? (
              <KangurStatusChip
                accent={accent}
                className={cn('w-fit text-[11px] uppercase tracking-[0.16em]', labelClassName)}
                data-testid={labelTestId}
                labelStyle={labelStyle}
                size={labelSize}
              >
                {label}
              </KangurStatusChip>
            ) : null)}
          {headerExtras}
        </div>
        <div className={cn('flex flex-col', bodyClassName)}>
          <KangurCardTitle
            as='p'
            className={titleClassName}
            data-testid={titleTestId}
            size={titleSize}
          >
            {title}
          </KangurCardTitle>
          {description ? (
            <KangurCardDescription
              as='p'
              className={descriptionClassName}
              data-testid={descriptionTestId}
              relaxed={descriptionRelaxed}
              size={descriptionSize}
            >
              {description}
            </KangurCardDescription>
          ) : null}
        </div>
        {action}
      </div>
    </KangurInfoCard>
  );
}
