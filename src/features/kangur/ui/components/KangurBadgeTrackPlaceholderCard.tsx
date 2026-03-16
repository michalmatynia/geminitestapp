import {
  KangurCardDescription,
  KangurCardTitle,
  KangurInfoCard,
  KangurProgressBar,
  KangurSectionEyebrow,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import { cn } from '@/features/kangur/shared/utils';

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
  const infoCardClassName = cn('rounded-[24px] text-left', cardClassName);
  const headerClassNameValue = cn(
    'flex flex-col items-start kangur-panel-gap md:flex-row md:items-start md:justify-between',
    headerClassName
  );
  const trackLabelClassNameValue = cn('tracking-[0.16em]', trackLabelClassName);
  const statusChipClassNameValue = cn(
    'self-start whitespace-nowrap md:shrink-0',
    statusChipClassName
  );
  const infoCardProps = {
    className: infoCardClassName,
    dashed: true,
    padding: 'md' as const,
    tone: 'muted' as const,
    'data-testid': dataTestId,
  };
  const statusChipProps = {
    accent: 'slate' as const,
    className: statusChipClassNameValue,
    size: 'sm' as const,
  };

  return (
    <KangurInfoCard {...infoCardProps}>
      <div className={headerClassNameValue}>
        <div className='min-w-0 md:flex-1'>
          <KangurSectionEyebrow as='p' className={trackLabelClassNameValue}>
            {trackEmoji} {label}
          </KangurSectionEyebrow>
          <KangurCardTitle as='p' className='mt-1'>
            {title}
          </KangurCardTitle>
          <KangurCardDescription as='p' className='mt-1 leading-5' size='xs'>
            {description}
          </KangurCardDescription>
        </div>
        <KangurStatusChip {...statusChipProps}>
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
