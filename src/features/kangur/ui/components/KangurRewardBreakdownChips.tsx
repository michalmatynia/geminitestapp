import { KangurStatusChip } from '@/features/kangur/ui/design/primitives';
import { type KangurAccent } from '@/features/kangur/ui/design/tokens';
import type { KangurRewardBreakdownEntry } from '@/features/kangur/ui/types';
import { cn } from '@/shared/utils';

type KangurRewardBreakdownChipsProps = {
  accent?: KangurAccent;
  breakdown?: KangurRewardBreakdownEntry[];
  chipClassName?: string;
  className?: string;
  dataTestId?: string;
  itemDataTestIdPrefix?: string;
  limit?: number;
};

export default function KangurRewardBreakdownChips({
  accent = 'slate',
  breakdown = [],
  chipClassName,
  className,
  dataTestId,
  itemDataTestIdPrefix,
  limit,
}: KangurRewardBreakdownChipsProps): React.JSX.Element | null {
  const visibleBreakdown =
    typeof limit === 'number' ? breakdown.slice(0, Math.max(0, limit)) : breakdown;

  if (visibleBreakdown.length === 0) {
    return null;
  }

  return (
    <div className={cn('flex flex-wrap gap-2', className)} data-testid={dataTestId}>
      {visibleBreakdown.map((entry) => (
        <KangurStatusChip
          accent={accent}
          className={cn('text-xs', chipClassName)}
          data-testid={
            itemDataTestIdPrefix ? `${itemDataTestIdPrefix}-${entry.kind}` : undefined
          }
          key={`${entry.kind}-${entry.label}`}
        >
          {entry.label} +{entry.xp}
        </KangurStatusChip>
      ))}
    </div>
  );
}
