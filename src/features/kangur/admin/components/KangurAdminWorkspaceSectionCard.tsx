import { cn } from '@/features/kangur/utils/cn';
import { Badge } from '@/features/kangur/shared/ui';

import type { ReactNode } from 'react';

import { KangurAdminCard, KangurAdminCardHeader } from './KangurAdminCard';

export type KangurAdminWorkspaceSectionCardProps = {
  title: string;
  description?: string;
  badge?: string;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  bodyClassName?: string;
};

export function renderKangurAdminWorkspaceSectionCard({
  title,
  description,
  badge,
  actions,
  children,
  className,
  bodyClassName,
}: KangurAdminWorkspaceSectionCardProps): React.JSX.Element {
  return (
    <KangurAdminCard className={cn(className)}>
      <KangurAdminCardHeader
        title={title}
        titleAs='h3'
        description={description}
        badge={badge ? <Badge variant='outline'>{badge}</Badge> : undefined}
        actions={actions}
      />
      {children ? <div className={cn('mt-4', bodyClassName)}>{children}</div> : null}
    </KangurAdminCard>
  );
}
