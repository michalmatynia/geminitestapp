import {
  KANGUR_PENDING_STEP_PILL_CLASSNAME,
  KANGUR_STEP_PILL_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { cn } from '@/shared/utils';

type KangurLessonProgressDotsProps = {
  activeDotClassName: string;
  className?: string;
  dotTestIdPrefix?: string;
  srLabel?: string;
  testId?: string;
  totalCount: number;
  viewedCount: number;
};

export function KangurLessonProgressDots({
  activeDotClassName,
  className,
  dotTestIdPrefix,
  srLabel,
  testId,
  totalCount,
  viewedCount,
}: KangurLessonProgressDotsProps): React.JSX.Element | null {
  if (totalCount <= 0) {
    return null;
  }

  const normalizedViewedCount = Math.min(Math.max(Math.floor(viewedCount), 0), totalCount);

  return (
    <div className={cn('flex items-center gap-1.5', className)} data-testid={testId}>
      {Array.from({ length: totalCount }).map((_, index) => (
        <span
          key={index}
          aria-hidden='true'
          data-testid={dotTestIdPrefix ? `${dotTestIdPrefix}-${index}` : undefined}
          className={cn(
            KANGUR_STEP_PILL_CLASSNAME,
            'h-[9px] min-w-[9px] cursor-default shadow-none',
            index < normalizedViewedCount ? ['w-4', activeDotClassName] : KANGUR_PENDING_STEP_PILL_CLASSNAME
          )}
        />
      ))}
      {srLabel ? <span className='sr-only'>{srLabel}</span> : null}
    </div>
  );
}
