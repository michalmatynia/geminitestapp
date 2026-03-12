import KangurBadgeTrackGrid from '@/features/kangur/ui/components/KangurBadgeTrackGrid';
import { KangurSectionEyebrow } from '@/features/kangur/ui/design/primitives';
import type { KangurProgressState } from '@/features/kangur/ui/types';
import { cn } from '@/shared/utils';

type KangurBadgeTrackSectionProps = {
  className?: string;
  dataTestIdPrefix: string;
  emptyTestId: string;
  gridClassName?: string;
  heading?: React.ReactNode;
  headingAs?: 'div' | 'p' | 'span';
  headingClassName?: string;
  progress: KangurProgressState;
};

export function KangurBadgeTrackSection({
  className,
  dataTestIdPrefix,
  emptyTestId,
  gridClassName,
  heading = 'Ścieżki odznak',
  headingAs = 'p',
  headingClassName,
  progress,
}: KangurBadgeTrackSectionProps): React.JSX.Element {
  return (
    <div className={className}>
      <KangurSectionEyebrow as={headingAs} className={cn('mb-3', headingClassName)}>
        {heading}
      </KangurSectionEyebrow>
      <KangurBadgeTrackGrid
        className={gridClassName}
        dataTestIdPrefix={dataTestIdPrefix}
        emptyTestId={emptyTestId}
        progress={progress}
      />
    </div>
  );
}
