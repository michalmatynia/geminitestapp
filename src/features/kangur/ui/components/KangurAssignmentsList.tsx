import Link from 'next/link';

import type { KangurAssignmentSnapshot } from '@/features/kangur/services/ports';
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
import {
  buildKangurAssignmentHref,
  getKangurAssignmentActionLabel,
} from '@/features/kangur/ui/services/delegated-assignments';

type KangurAssignmentsListProps = {
  assignments: KangurAssignmentSnapshot[];
  basePath: string;
  title: string;
  emptyLabel: string;
  compact?: boolean;
  onArchive?: (assignmentId: string) => void;
};

const PRIORITY_ACCENTS = {
  high: 'rose',
  medium: 'amber',
  low: 'emerald',
} as const;

const STATUS_ACCENTS = {
  not_started: 'slate',
  in_progress: 'indigo',
  completed: 'emerald',
} as const;

const formatPriority = (value: KangurAssignmentSnapshot['priority']): string => {
  if (value === 'high') return 'Priorytet wysoki';
  if (value === 'medium') return 'Priorytet sredni';
  return 'Priorytet niski';
};

const formatStatus = (value: KangurAssignmentSnapshot['progress']['status']): string => {
  if (value === 'completed') return 'Ukonczone';
  if (value === 'in_progress') return 'W trakcie';
  return 'Nowe';
};

const formatAssignmentCountLabel = (count: number): string => {
  if (count === 1) return '1 zadanie';
  if (count >= 2 && count <= 4) return `${count} zadania`;
  return `${count} zadan`;
};

const formatTimestamp = (value: string | null): string | null => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toLocaleString('pl-PL', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

export function KangurAssignmentsList({
  assignments,
  basePath,
  title,
  emptyLabel,
  compact = false,
  onArchive,
}: KangurAssignmentsListProps): React.JSX.Element {
  return (
    <KangurGlassPanel
      data-testid='kangur-assignments-list-shell'
      padding='lg'
      surface={compact ? 'mist' : 'mistStrong'}
      variant='soft'
    >
      <div className='mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between'>
        <div>
          <div className='text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500'>
            {compact ? 'Szybki podglad' : 'Przydzielone zadania'}
          </div>
          <div className='mt-1 text-xl font-extrabold tracking-tight text-slate-800'>{title}</div>
        </div>
        {compact ? (
          <div className='text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500'>
            {formatAssignmentCountLabel(assignments.length)}
          </div>
        ) : (
          <KangurStatusChip accent='slate' className='text-[11px] uppercase tracking-[0.16em]'>
            {assignments.length} zadań
          </KangurStatusChip>
        )}
      </div>
      {assignments.length === 0 ? (
        <KangurEmptyState
          accent='slate'
          className='text-sm'
          description={emptyLabel}
          padding='lg'
        />
      ) : (
        <div className={`grid gap-3 ${compact ? 'grid-cols-1' : 'grid-cols-1 xl:grid-cols-2'}`}>
          {assignments.map((assignment) => {
            const lastActivity = formatTimestamp(assignment.progress.lastActivityAt);
            const actionLabel = getKangurAssignmentActionLabel(assignment);
            const priorityAccent = PRIORITY_ACCENTS[assignment.priority];
            const statusAccent = STATUS_ACCENTS[assignment.progress.status];
            const progressCountLabel = `${assignment.progress.attemptsCompleted}/${assignment.progress.attemptsRequired}`;

            if (compact) {
              return (
                <KangurInfoCard
                  data-testid={`kangur-assignments-list-card-${assignment.id}`}
                  key={assignment.id}
                  className='relative'
                  padding='lg'
                >
                  <div className='absolute right-5 top-5 flex flex-wrap items-center justify-end gap-2'>
                    <KangurStatusChip
                      accent={priorityAccent}
                      className='text-[11px] uppercase tracking-[0.14em]'
                    >
                      {formatPriority(assignment.priority)}
                    </KangurStatusChip>
                    <KangurStatusChip
                      accent={statusAccent}
                      className='px-4 py-2 text-base font-extrabold'
                      size='md'
                    >
                      {assignment.progress.percent}%
                    </KangurStatusChip>
                    <div className='text-2xl font-medium text-[#7f8ab0]'>{progressCountLabel}</div>
                  </div>

                  <div className='pr-0 pt-12 sm:pr-52 sm:pt-0'>
                    <div className='flex items-center gap-2 text-[1.1rem] font-extrabold tracking-tight text-[#233b73]'>
                      <span aria-hidden='true'>
                        {assignment.target.type === 'lesson' ? '📚' : '🎯'}
                      </span>
                      <span>{assignment.title}</span>
                    </div>
                    <div className='mt-4 text-base leading-7 text-[#62709a]'>
                      {assignment.description}
                    </div>
                  </div>

                  <div className='mt-4 space-y-4'>
                    <KangurDivider
                      accent='slate'
                      className='w-full'
                      data-testid={`kangur-assignments-list-divider-${assignment.id}`}
                      size='sm'
                    />
                    <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                      <div className='text-sm text-[#7d86a7]'>{assignment.progress.summary}</div>
                      <KangurButton
                        asChild
                        size='sm'
                        variant={assignment.target.type === 'lesson' ? 'warm' : 'surface'}
                      >
                        <Link href={buildKangurAssignmentHref(basePath, assignment)}>{actionLabel}</Link>
                      </KangurButton>
                    </div>
                    {lastActivity ? (
                      <div className='text-[11px] text-[#97a0bc]'>
                        Ostatnia aktywność: {lastActivity}
                      </div>
                    ) : null}
                  </div>
                </KangurInfoCard>
              );
            }

            return (
              <KangurInfoCard
                data-testid={`kangur-assignments-list-card-${assignment.id}`}
                key={assignment.id}
                className='h-full'
                padding='lg'
              >
                <div className='flex flex-wrap items-start justify-between gap-3'>
                  <div className='min-w-0'>
                    <div className='text-lg font-extrabold tracking-tight text-slate-900'>
                      {assignment.title}
                    </div>
                    <div className='mt-2 text-sm leading-6 text-slate-600'>
                      {assignment.description}
                    </div>
                  </div>
                  <div className='flex flex-wrap items-center gap-2'>
                    <KangurStatusChip
                      accent={priorityAccent}
                      className='text-[11px] uppercase tracking-[0.14em]'
                    >
                      {formatPriority(assignment.priority)}
                    </KangurStatusChip>
                    <KangurStatusChip
                      accent={statusAccent}
                      className='text-[11px] uppercase tracking-[0.14em]'
                    >
                      {formatStatus(assignment.progress.status)}
                    </KangurStatusChip>
                    <KangurStatusChip accent={statusAccent} className='text-sm font-extrabold'>
                      {assignment.progress.percent}%
                    </KangurStatusChip>
                  </div>
                </div>

                <KangurSummaryPanel
                  accent='indigo'
                  className='mt-5 rounded-[24px]'
                  description={assignment.progress.summary}
                  label='Postęp'
                  padding='md'
                >
                  <KangurProgressBar
                    accent='indigo'
                    className='mt-3'
                    data-testid={`kangur-assignments-list-progress-${assignment.id}`}
                    size='sm'
                    value={assignment.progress.percent}
                  />
                  {lastActivity ? (
                    <div className='mt-3 text-[11px] text-slate-500'>
                      Ostatnia aktywność: {lastActivity}
                    </div>
                  ) : null}
                </KangurSummaryPanel>

                <div className='mt-5 flex flex-wrap items-center gap-2'>
                  <KangurButton asChild size='sm' variant={compact ? 'warm' : 'surface'}>
                    <Link href={buildKangurAssignmentHref(basePath, assignment)}>
                      {actionLabel}
                    </Link>
                  </KangurButton>
                  {onArchive ? (
                    <KangurButton
                      type='button'
                      onClick={() => onArchive(assignment.id)}
                      size='sm'
                      variant='ghost'
                    >
                      Archiwizuj
                    </KangurButton>
                  ) : null}
                </div>
              </KangurInfoCard>
            );
          })}
        </div>
      )}
    </KangurGlassPanel>
  );
}

export default KangurAssignmentsList;
