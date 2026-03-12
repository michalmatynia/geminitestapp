import {
  KangurCardDescription,
  KangurCardTitle,
  KangurInfoCard,
  KangurProgressBar,
  KangurSectionEyebrow,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import { cn } from '@/shared/utils';

type KangurBadgeTrackPlaceholderCardProps = {
  cardClassName?: string;
  dataTestId: string;
  description: string;
  headerClassName?: string;
  label: string;
  statusChipClassName?: string;
  title: string;
  trackEmoji?: string;
  trackLabelClassName?: string;
};

export function KangurBadgeTrackPlaceholderCard({
  cardClassName,
  dataTestId,
  description,
  headerClassName,
  label,
  statusChipClassName,
  title,
  trackEmoji = '✨',
  trackLabelClassName,
}: KangurBadgeTrackPlaceholderCardProps): React.JSX.Element {
  return (
    <KangurInfoCard
      className={cn('rounded-[24px] text-left', cardClassName)}
      dashed
      data-testid={dataTestId}
      padding='md'
      tone='muted'
    >
      <div
        className={cn(
          'flex flex-col items-start gap-4 md:flex-row md:items-start md:justify-between',
          headerClassName
        )}
      >
        <div className='min-w-0 md:flex-1'>
          <KangurSectionEyebrow as='p' className={cn('tracking-[0.16em]', trackLabelClassName)}>
            {trackEmoji} {label}
          </KangurSectionEyebrow>
          <KangurCardTitle as='p' className='mt-1'>
            {title}
          </KangurCardTitle>
          <KangurCardDescription as='p' className='mt-1 leading-5' size='xs'>
            {description}
          </KangurCardDescription>
        </div>
        <KangurStatusChip
          accent='slate'
          className={cn('self-start whitespace-nowrap md:shrink-0', statusChipClassName)}
          size='sm'
        >
          Czeka
        </KangurStatusChip>
      </div>
      <KangurProgressBar
        accent='slate'
        aria-hidden='true'
        className='mt-3 opacity-45'
        size='sm'
        value={0}
      />
    </KangurInfoCard>
  );
}

export default KangurBadgeTrackPlaceholderCard;
