import { createContext, useContext } from 'react';

import { KangurTransitionLink as Link } from '@/features/kangur/ui/components/KangurTransitionLink';
import {
  KangurButton,
  KangurDivider,
  KangurEmptyState,
  KangurGlassPanel,
  KangurInfoCard,
  KangurProgressBar,
  KangurStatusChip,
  KangurSummaryPanel,
} from '@/features/kangur/ui/design/primitives';
import type { KangurAssignmentListItem } from '@/features/kangur/ui/services/delegated-assignments';

const ASSIGNMENTS_LIST_ROUTE_ACKNOWLEDGE_MS = 110;

type KangurAssignmentsListProps = {
  items: KangurAssignmentListItem[];
  title: string;
  emptyLabel?: string;
  compact?: boolean;
  onArchive?: (assignmentId: string) => void;
};

type KangurAssignmentsListItemContextValue = {
  item: KangurAssignmentListItem;
};

type KangurAssignmentsListArchiveContextValue = {
  onArchive?: (assignmentId: string) => void;
};

const KangurAssignmentsListItemContext = createContext<KangurAssignmentsListItemContextValue | null>(
  null
);
const KangurAssignmentsListArchiveContext =
  createContext<KangurAssignmentsListArchiveContextValue | null>(null);

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

const formatAssignmentCountLabel = (count: number): string => {
  if (count === 1) return '1 zadanie';
  if (count >= 2 && count <= 4) return `${count} zadania`;
  return `${count} zadań`;
};

function KangurAssignmentsListCompactCard(): React.JSX.Element {
  const item = useKangurAssignmentsListItem();

  return (
    <KangurInfoCard
      data-testid={`kangur-assignments-list-card-${item.id}`}
      className='relative'
      padding='lg'
    >
      <div className='absolute right-5 top-5 flex flex-wrap items-center justify-end gap-2'>
        <KangurStatusChip
          accent={item.priorityAccent}
          className='text-[11px] uppercase tracking-[0.14em]'
        >
          {item.priorityLabel}
        </KangurStatusChip>
        <KangurStatusChip
          accent={item.statusAccent}
          className='px-4 py-2 text-base font-extrabold'
          size='md'
        >
          {item.progressPercent}%
        </KangurStatusChip>
        <div className='text-2xl font-medium [color:var(--kangur-page-muted-text)]'>
          {item.progressCountLabel}
        </div>
      </div>

      <div className='pr-0 pt-12 sm:pr-52 sm:pt-0'>
        <div className='flex items-center gap-2 text-[1.1rem] font-extrabold tracking-tight [color:var(--kangur-page-text)]'>
          <span aria-hidden='true'>{item.icon}</span>
          <span>{item.title}</span>
        </div>
        <div className='mt-4 text-base leading-7 [color:var(--kangur-page-muted-text)]'>
          {item.description}
        </div>
      </div>

      <div className='mt-4 space-y-4'>
        <KangurDivider
          accent='slate'
          className='w-full'
          data-testid={`kangur-assignments-list-divider-${item.id}`}
          size='sm'
        />
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div className='text-sm [color:var(--kangur-page-muted-text)]'>{item.progressSummary}</div>
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
        {item.lastActivityLabel ? (
          <div className='text-[11px] [color:var(--kangur-page-muted-text)]'>
            Ostatnia aktywność: {item.lastActivityLabel}
          </div>
        ) : null}
      </div>
    </KangurInfoCard>
  );
}

function KangurAssignmentsListStandardCard(): React.JSX.Element {
  const item = useKangurAssignmentsListItem();
  const { onArchive } = useKangurAssignmentsListArchive();

  return (
    <KangurInfoCard
      data-testid={`kangur-assignments-list-card-${item.id}`}
      className='h-full'
      padding='lg'
    >
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div className='min-w-0'>
          <div className='text-lg font-extrabold tracking-tight [color:var(--kangur-page-text)]'>
            {item.title}
          </div>
          <div className='mt-2 text-sm leading-6 [color:var(--kangur-page-muted-text)]'>
            {item.description}
          </div>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <KangurStatusChip
            accent={item.priorityAccent}
            className='text-[11px] uppercase tracking-[0.14em]'
          >
            {item.priorityLabel}
          </KangurStatusChip>
          <KangurStatusChip
            accent={item.statusAccent}
            className='text-[11px] uppercase tracking-[0.14em]'
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
        {item.lastActivityLabel ? (
          <div className='mt-3 text-[11px] [color:var(--kangur-page-muted-text)]'>
            Ostatnia aktywność: {item.lastActivityLabel}
          </div>
        ) : null}
      </KangurSummaryPanel>

      <div className='mt-5 flex flex-wrap items-center gap-2'>
        <KangurButton asChild size='sm' variant='surface'>
          <Link
            href={item.actionHref}
            transitionAcknowledgeMs={ASSIGNMENTS_LIST_ROUTE_ACKNOWLEDGE_MS}
            transitionSourceId={`assignments-list:standard:${item.id}`}
          >
            {item.actionLabel}
          </Link>
        </KangurButton>
        {onArchive ? (
          <KangurButton
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
  emptyLabel = 'Brak zadań do pokazania.',
  compact = false,
  onArchive,
}: KangurAssignmentsListProps): React.JSX.Element {
  const emptyStateDescription = emptyLabel;

  if (compact) {
    return (
      <KangurGlassPanel
        data-testid='kangur-assignments-list-shell'
        padding='lg'
        surface='mist'
        variant='soft'
      >
        <div className='mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between'>
          <div>
            <div className='text-[11px] font-bold uppercase tracking-[0.22em] [color:var(--kangur-page-muted-text)]'>
              Szybki podgląd
            </div>
            <div className='mt-1 text-xl font-extrabold tracking-tight [color:var(--kangur-page-text)]'>
              {title}
            </div>
          </div>
          <div className='text-[11px] font-bold uppercase tracking-[0.18em] [color:var(--kangur-page-muted-text)]'>
            {formatAssignmentCountLabel(items.length)}
          </div>
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
    );
  }

  return (
    <KangurAssignmentsListArchiveContext.Provider value={{ onArchive }}>
      <KangurGlassPanel
        data-testid='kangur-assignments-list-shell'
        padding='lg'
        surface='mistStrong'
        variant='soft'
      >
        <div className='mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between'>
          <div>
            <div className='text-[11px] font-bold uppercase tracking-[0.22em] [color:var(--kangur-page-muted-text)]'>
              Przydzielone zadania
            </div>
            <div className='mt-1 text-xl font-extrabold tracking-tight [color:var(--kangur-page-text)]'>
              {title}
            </div>
          </div>
          <KangurStatusChip accent='slate' className='text-[11px] uppercase tracking-[0.16em]'>
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
  );
}

export default KangurAssignmentsList;
