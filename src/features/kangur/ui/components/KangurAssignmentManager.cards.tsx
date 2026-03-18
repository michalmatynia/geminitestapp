import type { ComponentProps, ReactNode } from 'react';

import {
  KangurInfoCard,
  KangurPanelRow,
} from '@/features/kangur/ui/design/primitives';

type KangurAssignmentManagerItemCardProps = {
  accent?: ComponentProps<typeof KangurInfoCard>['accent'];
  children: ReactNode;
  testId: string;
};

export function KangurAssignmentManagerItemCard({
  accent,
  children,
  testId,
}: KangurAssignmentManagerItemCardProps): React.JSX.Element {
  const cardAccent = accent;
  const cardTestId = testId;

  return (
    <KangurInfoCard accent={cardAccent} data-testid={cardTestId} padding='lg'>
      {children}
    </KangurInfoCard>
  );
}

export function KangurAssignmentManagerCardHeader({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  return <KangurPanelRow className='items-start sm:justify-between'>{children}</KangurPanelRow>;
}

export function KangurAssignmentManagerCardFooter({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  return <KangurPanelRow className='mt-3 sm:items-center sm:justify-between'>{children}</KangurPanelRow>;
}
