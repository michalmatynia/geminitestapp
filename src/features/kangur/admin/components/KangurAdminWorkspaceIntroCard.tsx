import { cn } from '@/features/kangur/utils/cn';
import { Badge } from '@/features/kangur/shared/ui';

import type { ReactNode } from 'react';

import { KangurAdminCard, KangurAdminCardHeader } from './KangurAdminCard';

export type KangurAdminWorkspaceIntroCardProps = {
  title: string;
  description: string;
  badge?: string;
  actions?: ReactNode;
  className?: string;
};

export function renderKangurAdminWorkspaceIntroCard({
  title,
  description,
  badge,
  actions,
  className,
}: KangurAdminWorkspaceIntroCardProps): React.JSX.Element {
  return (
    <KangurAdminCard className={cn(className)}>
      <KangurAdminCardHeader
        title={title}
        titleAs='h2'
        titleClassName='text-base'
        description={description}
        descriptionClassName='mt-2 max-w-3xl'
        badge={badge ? <Badge variant='outline'>{badge}</Badge> : undefined}
        actions={actions}
      />
    </KangurAdminCard>
  );
}
