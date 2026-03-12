'use client';

import type { ComponentProps } from 'react';

import { KangurInfoCard, KangurStatusChip } from '@/features/kangur/ui/design/primitives';
import { cn } from '@/shared/utils';

type KangurRecommendationCardProps = {
  accent: ComponentProps<typeof KangurInfoCard>['accent'];
  className?: string;
  dataTestId: string;
  description?: string;
  descriptionTestId?: string;
  label: string;
  labelTestId: string;
  title: string;
  titleTestId: string;
};

export default function KangurRecommendationCard({
  accent,
  className,
  dataTestId,
  description,
  descriptionTestId,
  label,
  labelTestId,
  title,
  titleTestId,
}: KangurRecommendationCardProps): React.JSX.Element {
  return (
    <KangurInfoCard
      accent={accent}
      className={cn('w-full rounded-[24px]', className)}
      data-testid={dataTestId}
      padding='md'
      tone='accent'
    >
      <div className='flex flex-col gap-2 text-left'>
        <KangurStatusChip
          accent={accent}
          className='w-fit text-[11px] uppercase tracking-[0.16em]'
          data-testid={labelTestId}
          size='sm'
        >
          {label}
        </KangurStatusChip>
        <p className='text-sm font-extrabold [color:var(--kangur-page-text)]' data-testid={titleTestId}>
          {title}
        </p>
        {description ? (
          <p
            className='text-xs [color:var(--kangur-page-muted-text)]'
            data-testid={descriptionTestId}
          >
            {description}
          </p>
        ) : null}
      </div>
    </KangurInfoCard>
  );
}
