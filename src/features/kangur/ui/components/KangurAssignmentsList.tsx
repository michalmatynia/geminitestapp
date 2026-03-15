import { Clock } from 'lucide-react';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { KangurAssignmentPriorityChip } from '@/features/kangur/ui/components/KangurAssignmentPriorityChip';
import { KangurTransitionLink as Link } from '@/features/kangur/ui/components/KangurTransitionLink';
import {
  KangurButton,
  KangurCardDescription,
  KangurMetaText,
  KangurCardTitle,
  KangurDivider,
  KangurEmptyState,
  KangurGlassPanel,
  KangurInfoCard,
  KangurPanelIntro,
  KangurProgressBar,
  KangurSectionEyebrow,
  KangurStatusChip,
  KangurSummaryPanel,
} from '@/features/kangur/ui/design/primitives';
import {
  resolveKangurAssignmentCountdownLabel,
  type KangurAssignmentListItem,
} from '@/features/kangur/ui/services/delegated-assignments';

const ASSIGNMENTS_LIST_ROUTE_ACKNOWLEDGE_MS = 110;

type KangurAssignmentsListProps = {
  items: KangurAssignmentListItem[];
  title: string;
  summary?: string;
  emptyLabel?: string;
  compact?: boolean;
  showTimeCountdown?: boolean;
  onArchive?: (assignmentId: string) => void;
  onTimeLimitClick?: (assignmentId: string) => void;
  onReassign?: (assignmentId: string) => void;
  reassigningId?: string | null;
};

type KangurAssignmentsListItemContextValue = {
  item: KangurAssignmentListItem;
};

type KangurAssignmentsListArchiveContextValue = {
  onArchive?: (assignmentId: string) => void;
  onTimeLimitClick?: (assignmentId: string) => void;
  onReassign?: (assignmentId: string) => void;
  reassigningId?: string | null;
};

type KangurAssignmentsListRuntimeContextValue = {
  now: number;
  showTimeCountdown: boolean;
};

const KangurAssignmentsListItemContext = createContext<KangurAssignmentsListItemContextValue | null>(
  null
);
const KangurAssignmentsListArchiveContext =
  createContext<KangurAssignmentsListArchiveContextValue | null>(null);
const KangurAssignmentsListRuntimeContext =
  createContext<KangurAssignmentsListRuntimeContextValue | null>(null);

const useKangurAssignmentsListItem = (): KangurAssignmentListItem => {
  const context = useContext(KangurAssignmentsListItemContext);

  if (!context) {
    throw new Error('useKangurAssignmentsListItem must be used within KangurAssignmentsList.');
  }

  return context.item;
};

const useKangurAssignmentsListArchive = (): KangurAssignmentsListArchiveContextValue => {
  return useContext(KangurAssignmentsListArchiveContext) ?? {};
};

const useKangurAssignmentsListRuntime = (): KangurAssignmentsListRuntimeContextValue => {
  return useContext(KangurAssignmentsListRuntimeContext) ?? {
    now: Date.now(),
    showTimeCountdown: false,
  };
};

const formatAssignmentCountLabel = (count: number): string => {
  if (count === 1) return '1 zadanie';
  if (count >= 2 && count <= 4) return `${count} zadania`;
  return `${count} zadań`;
};

const resolveCountdownLabel = (
  item: KangurAssignmentListItem,
  now: number,
  showTimeCountdown: boolean
): string | null =>
  showTimeCountdown
    ? resolveKangurAssignmentCountdownLabel({
        timeLimitMinutes: item.timeLimitMinutes,
        timeLimitStartsAt: item.timeLimitStartsAt,
        createdAt: item.createdAt,
        status: item.status,
        now,
      })
    : null;

function KangurAssignmentsListCompactCard(): React.JSX.Element {
  const item = useKangurAssignmentsListItem();
  const { now, showTimeCountdown } = useKangurAssignmentsListRuntime();
  const countdownLabel = resolveCountdownLabel(item, now, showTimeCountdown);

  return (
    <KangurInfoCard
      data-testid={`kangur-assignments-list-card-${item.id}`}
      className='relative'
      padding='lg'
    >
      <div className='mb-4 flex flex-wrap items-center gap-2 sm:absolute sm:right-5 sm:top-5 sm:mb-0 sm:justify-end'>
        <KangurAssignmentPriorityChip labelStyle='compact' priority={item.priority} />
        <KangurStatusChip
          accent={item.statusAccent}
          className='px-4 py-2 text-base font-extrabold'
          size='md'
        >
          {item.progressPercent}%
        </KangurStatusChip>
        <KangurMetaText size='lg'>
          {item.progressCountLabel}
        </KangurMetaText>
      </div>

      <div className='pr-0 pt-0 sm:pr-52'>
        <KangurCardTitle
          as='div'
          className='flex min-w-0 items-center gap-2 text-base sm:text-[1.1rem]'
        >
          <span aria-hidden='true'>{item.icon}</span>
          <span className='min-w-0 break-words'>{item.title}</span>
        </KangurCardTitle>
        <KangurCardDescription
          as='div'
          className='mt-4 break-words leading-7'
          size='md'
        >
          {item.description}
        </KangurCardDescription>
      </div>

      <div className='mt-4 space-y-4'>
        <KangurDivider
          accent='slate'
          className='w-full'
          data-testid={`kangur-assignments-list-divider-${item.id}`}
          size='sm'
        />
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <KangurCardDescription as='div' size='sm'>
            {item.progressSummary}
          </KangurCardDescription>
          <KangurButton asChild size='sm' variant={item.actionVariant}>
            <Link
              href={item.actionHref}
              transitionAcknowledgeMs={ASSIGNMENTS_LIST_ROUTE_ACKNOWLEDGE_MS}
              transitionSourceId={`assignments-list:compact:${item.id}`}
            >
              {item.actionLabel}
            </Link>
          </KangurButton>
        </div>
        {countdownLabel ? (
          <KangurMetaText className='flex items-center gap-2'>
            <Clock className='h-4 w-4 text-slate-400' aria-hidden='true' />
            {countdownLabel}
          </KangurMetaText>
        ) : null}
        {item.timeLimitLabel ? (
          <KangurMetaText className='flex items-center gap-2'>
            <Clock className='h-4 w-4 text-slate-400' aria-hidden='true' />
            {item.timeLimitLabel}
          </KangurMetaText>
        ) : null}
        {item.lastActivityLabel ? (
          <KangurMetaText>Ostatnia aktywność: {item.lastActivityLabel}</KangurMetaText>
        ) : null}
      </div>
    </KangurInfoCard>
  );
}

function KangurAssignmentsListStandardCard(): React.JSX.Element {
  const item = useKangurAssignmentsListItem();
  const { onArchive, onTimeLimitClick, onReassign, reassigningId } =
    useKangurAssignmentsListArchive();
  const { now, showTimeCountdown } = useKangurAssignmentsListRuntime();
  const countdownLabel = resolveCountdownLabel(item, now, showTimeCountdown);
  const canReassign = Boolean(onReassign && item.status === 'completed');
  const isReassigning = Boolean(reassigningId && reassigningId === item.id);

  return (
    <KangurInfoCard
      data-testid={`kangur-assignments-list-card-${item.id}`}
      className='h-full'
      padding='lg'
    >
      <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
        <div className='min-w-0'>
          <KangurCardTitle className='break-words text-lg' size='lg'>
            {item.title}
          </KangurCardTitle>
          <KangurCardDescription as='div' className='mt-2 break-words' relaxed size='sm'>
            {item.description}
          </KangurCardDescription>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <KangurAssignmentPriorityChip labelStyle='compact' priority={item.priority} />
          <KangurStatusChip
            accent={item.statusAccent}
            labelStyle='compact'
          >
            {item.statusLabel}
          </KangurStatusChip>
          <KangurStatusChip accent={item.statusAccent} className='text-sm font-extrabold'>
            {item.progressPercent}%
          </KangurStatusChip>
        </div>
      </div>

      <KangurSummaryPanel
        accent='indigo'
        className='mt-5 rounded-[24px]'
        description={item.progressSummary}
        label='Postęp'
        padding='md'
      >
        <KangurProgressBar
          accent='indigo'
          className='mt-3'
          data-testid={`kangur-assignments-list-progress-${item.id}`}
          size='sm'
          value={item.progressPercent}
        />
        {countdownLabel || item.timeLimitLabel || item.lastActivityLabel ? (
          <div className='mt-3 space-y-2'>
            {countdownLabel ? (
              <KangurMetaText className='flex items-center gap-2'>
                <Clock className='h-4 w-4 text-slate-400' aria-hidden='true' />
                {countdownLabel}
              </KangurMetaText>
            ) : null}
            {item.timeLimitLabel ? (
              <KangurMetaText className='flex items-center gap-2'>
                <Clock className='h-4 w-4 text-slate-400' aria-hidden='true' />
                {item.timeLimitLabel}
              </KangurMetaText>
            ) : null}
            {item.lastActivityLabel ? (
              <KangurMetaText>Ostatnia aktywność: {item.lastActivityLabel}</KangurMetaText>
            ) : null}
          </div>
        ) : null}
      </KangurSummaryPanel>

      <div className='mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center'>
        <KangurButton asChild className='w-full sm:w-auto' size='sm' variant='surface'>
          <Link
            href={item.actionHref}
            transitionAcknowledgeMs={ASSIGNMENTS_LIST_ROUTE_ACKNOWLEDGE_MS}
            transitionSourceId={`assignments-list:standard:${item.id}`}
          >
            {item.actionLabel}
          </Link>
        </KangurButton>
        {onTimeLimitClick ? (
          <KangurButton
            aria-label='Czas na wykonanie'
            title='Czas na wykonanie'
            className='w-full sm:w-auto sm:px-3'
            type='button'
            onClick={() => onTimeLimitClick(item.id)}
            size='sm'
            variant='ghost'
          >
            <Clock className='h-4 w-4' aria-hidden='true' />
          </KangurButton>
        ) : null}
        {canReassign ? (
          <KangurButton
            className='w-full sm:w-auto'
            type='button'
            onClick={() => onReassign?.(item.id)}
            size='sm'
            variant='ghost'
            disabled={isReassigning}
          >
            {isReassigning ? 'Przypisywanie...' : 'Przypisz ponownie'}
          </KangurButton>
        ) : null}
        {onArchive ? (
          <KangurButton
            className='w-full sm:w-auto'
            type='button'
            onClick={() => onArchive(item.id)}
            size='sm'
            variant='ghost'
          >
            Archiwizuj
          </KangurButton>
        ) : null}
      </div>
    </KangurInfoCard>
  );
}

export function KangurAssignmentsList({
  items,
  title,
  summary,
  emptyLabel = 'Brak zadań do pokazania.',
  compact = false,
  showTimeCountdown = false,
  onArchive,
  onTimeLimitClick,
  onReassign,
  reassigningId,
}: KangurAssignmentsListProps): React.JSX.Element {
  const emptyStateDescription = emptyLabel;
  const panelSummary = summary;
  const panelTitle = title;
  const archiveContextValue = { onArchive, onTimeLimitClick, onReassign, reassigningId };
  const shouldTick =
    showTimeCountdown &&
    items.some((item) => Boolean(item.timeLimitMinutes) && item.status !== 'completed');
  const [now, setNow] = useState(() => Date.now());
  const runtimeContextValue = useMemo(
    () => ({
      now,
      showTimeCountdown,
    }),
    [now, showTimeCountdown]
  );

  useEffect(() => {
    if (!shouldTick) {
      return;
    }

    setNow(Date.now());
    const timerId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, [shouldTick]);

  if (compact) {
    return (
      <KangurAssignmentsListRuntimeContext.Provider value={runtimeContextValue}>
        <KangurGlassPanel
          data-testid='kangur-assignments-list-shell'
          padding='lg'
          surface='mist'
          variant='soft'
        >
          <div className='mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between'>
            <KangurPanelIntro
              description={panelSummary}
              eyebrow='Szybki podgląd'
              title={panelTitle}
              titleAs='div'
              titleClassName='text-lg font-extrabold tracking-tight sm:text-xl'
            />
            <KangurSectionEyebrow className='tracking-[0.18em]'>
              {formatAssignmentCountLabel(items.length)}
            </KangurSectionEyebrow>
          </div>
          {items.length === 0 ? (
            <KangurEmptyState
              accent='slate'
              className='text-sm'
              description={emptyStateDescription}
              padding='lg'
            />
          ) : (
            <div className='grid grid-cols-1 gap-3'>
              {items.map((item) => (
                <KangurAssignmentsListItemContext.Provider key={item.id} value={{ item }}>
                  <KangurAssignmentsListCompactCard />
                </KangurAssignmentsListItemContext.Provider>
              ))}
            </div>
          )}
        </KangurGlassPanel>
      </KangurAssignmentsListRuntimeContext.Provider>
    );
  }

  return (
    <KangurAssignmentsListRuntimeContext.Provider value={runtimeContextValue}>
      <KangurAssignmentsListArchiveContext.Provider value={archiveContextValue}>
        <KangurGlassPanel
          data-testid='kangur-assignments-list-shell'
          padding='lg'
          surface='mistStrong'
          variant='soft'
        >
          <div className='mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between'>
            <KangurPanelIntro
              description={panelSummary}
              eyebrow='Przydzielone zadania'
              title={panelTitle}
              titleAs='div'
              titleClassName='text-lg font-extrabold tracking-tight sm:text-xl'
            />
            <KangurStatusChip accent='slate' labelStyle='caps'>
              {items.length} zadań
            </KangurStatusChip>
          </div>
          {items.length === 0 ? (
            <KangurEmptyState
              accent='slate'
              className='text-sm'
              description={emptyStateDescription}
              padding='lg'
            />
          ) : (
            <div className='grid grid-cols-1 gap-3 xl:grid-cols-2'>
              {items.map((item) => (
                <KangurAssignmentsListItemContext.Provider key={item.id} value={{ item }}>
                  <KangurAssignmentsListStandardCard />
                </KangurAssignmentsListItemContext.Provider>
              ))}
            </div>
          )}
        </KangurGlassPanel>
      </KangurAssignmentsListArchiveContext.Provider>
    </KangurAssignmentsListRuntimeContext.Provider>
  );
}

export default KangurAssignmentsList;
