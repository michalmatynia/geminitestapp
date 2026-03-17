import { KangurStatusChip } from '@/features/kangur/ui/design/primitives';
import { KANGUR_WRAP_ROW_CLASSNAME, type KangurAccent } from '@/features/kangur/ui/design/tokens';
import type { KangurRewardBreakdownEntry } from '@/features/kangur/ui/types';
import { cn } from '@/features/kangur/shared/utils';

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
  const chipAccent = accent;
  const chipClasses = chipClassName;
  const chipTestIdPrefix = itemDataTestIdPrefix;
  const visibleBreakdown =
    typeof limit === 'number' ? breakdown.slice(0, Math.max(0, limit)) : breakdown;
  const formatXp = (value: number): string => {
    if (value > 0) {
      return `+${value}`;
    }
    if (value < 0) {
      return `${value}`;
    }
    return '0';
  };

  if (visibleBreakdown.length === 0) {
    return null;
  }

  return (
    <div className={cn(KANGUR_WRAP_ROW_CLASSNAME, className)} data-testid={dataTestId}>
      {visibleBreakdown.map((entry) => (
        <KangurStatusChip
          accent={chipAccent}
          className={cn('text-xs', chipClasses)}
          data-testid={chipTestIdPrefix ? `${chipTestIdPrefix}-${entry.kind}` : undefined}
          key={`${entry.kind}-${entry.label}`}
        >
          {entry.label} {formatXp(entry.xp)}
        </KangurStatusChip>
      ))}
    </div>
  );
}
