import type { KangurMobileLessonsBadgeItem } from '../useKangurMobileLessonsBadges';
import { KangurMobilePill as Pill } from '../../shared/KangurMobileUi';

export function LessonBadgeChip({
  item,
}: {
  item: KangurMobileLessonsBadgeItem;
}): React.JSX.Element {
  return (
    <Pill
      label={`${item.emoji} ${item.name}`}
      tone={{
        backgroundColor: '#eef2ff',
        borderColor: '#c7d2fe',
        textColor: '#4338ca',
      }}
    />
  );
}
