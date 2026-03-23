import { KangurPanelSectionHeading } from '@/features/kangur/ui/components/KangurPanelSectionHeading';
import { LESSONS_LIBRARY_COLUMN_CLASSNAME } from '@/features/kangur/ui/pages/lessons/Lessons.constants';
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
      <div className={LESSONS_LIBRARY_COLUMN_CLASSNAME}>{children}</div>
    </section>
  );
}
