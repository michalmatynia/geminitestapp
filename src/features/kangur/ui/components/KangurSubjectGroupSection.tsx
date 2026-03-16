import { KangurPanelSectionHeading } from '@/features/kangur/ui/components/KangurPanelSectionHeading';

import type { ReactNode } from 'react';

type KangurSubjectGroupSectionProps = {
  label: string;
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
    <section aria-label={ariaLabel ?? label} className={className}>
      <KangurPanelSectionHeading>{label}</KangurPanelSectionHeading>
      {children}
    </section>
  );
}
