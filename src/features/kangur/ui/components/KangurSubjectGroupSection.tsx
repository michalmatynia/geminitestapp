import { KangurPanelSectionHeading } from '@/features/kangur/ui/components/KangurPanelSectionHeading';
import { cn } from '@/features/kangur/shared/utils';

import type { ReactNode } from 'react';

type KangurSubjectGroupSectionProps = {
  label: ReactNode;
  ariaLabel?: string;
  children: ReactNode;
  className?: string;
};

export function KangurSubjectGroupSection({
  label,
  ariaLabel,
  children,
  className,
}: KangurSubjectGroupSectionProps): React.JSX.Element {
  return (
    <section
      aria-label={String(ariaLabel ?? label)}
      className={cn('flex w-full flex-col items-center', className)}
    >
      <KangurPanelSectionHeading className='w-full text-center'>
        {label}
      </KangurPanelSectionHeading>
      <div className='flex w-full flex-col items-center'>{children}</div>
    </section>
  );
}
