// ProductListActivityPill: small badge/pill used in the product list to
// surface scan/trigger/queue activity states per-product. Purely presentational
// and consumes a config object to keep rendering logic centralized.
import type React from 'react';
import { RectangleHorizontal, Search } from 'lucide-react';

import { Badge } from '@/shared/ui/badge';
import { cn } from '@/shared/utils/ui-utils';

type ProductListActivityPillConfig = {
  kind: 'trigger-button' | 'scan';
  label: string;
  variant:
    | 'pending'
    | 'active'
    | 'failed'
    | 'removed'
    | 'neutral'
    | 'info'
    | 'success'
    | 'warning'
    | 'error'
    | 'processing';
  badgeClassName?: string | null | undefined;
  className?: string | undefined;
};

const resolveIcon = (kind: ProductListActivityPillConfig['kind']): React.JSX.Element =>
  kind === 'scan' ? (
    <Search className='size-3' />
  ) : (
    <RectangleHorizontal className='size-3' />
  );

export function ProductListActivityPill({
  config,
}: {
  config: ProductListActivityPillConfig;
}): React.JSX.Element {
  const { kind, label, variant, badgeClassName, className } = config;

  return (
    <Badge
      variant={variant}
      icon={resolveIcon(kind)}
      data-activity-kind={kind}
      className={cn(
        'ml-1 rounded-full border px-1.5 py-0.5 text-[11px] font-medium',
        badgeClassName,
        className
      )}
    >
      {label}
    </Badge>
  );
}
