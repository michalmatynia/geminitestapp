import Link from 'next/link';

import type { KangurAssignmentSnapshot } from '@/features/kangur/services/ports';
import {
  KangurLessonCallout,
  KangurLessonChip,
} from '@/features/kangur/ui/design/lesson-primitives';
import { KangurButton, KangurPanel } from '@/features/kangur/ui/design/primitives';
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
    <KangurPanel
      className={compact ? 'border-white/78 bg-white/58' : 'border-white/78 bg-white/68'}
      padding='lg'
      variant='soft'
    >
      <div className='mb-5 flex items-center justify-between gap-3'>
        <div className='text-2xl font-extrabold tracking-tight text-[#7a86b0]'>{title}</div>
        {compact ? (
          <div className='text-sm font-medium text-[#96a0be]'>
            {formatAssignmentCountLabel(assignments.length)}
          </div>
        ) : (
          <KangurLessonChip accent='slate' className='text-[11px] uppercase tracking-[0.16em]'>
            {assignments.length} zadań
          </KangurLessonChip>
        )}
      </div>
      {assignments.length === 0 ? (
        <KangurLessonCallout
          accent='slate'
          className='border-dashed text-center text-sm text-slate-500'
          padding='lg'
        >
          {emptyLabel}
        </KangurLessonCallout>
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
                <div
                  key={assignment.id}
                  className='relative rounded-[26px] border border-white/86 bg-white/95 px-6 py-5 shadow-[0_22px_58px_-42px_rgba(60,52,94,0.22)]'
                >
                  <div className='absolute right-5 top-5 flex flex-wrap items-center justify-end gap-2'>
                    <KangurLessonChip
                      accent={priorityAccent}
                      className='text-[11px] uppercase tracking-[0.14em]'
                    >
                      {formatPriority(assignment.priority)}
                    </KangurLessonChip>
                    <div className='rounded-full bg-[#eaedf7] px-4 py-2 text-base font-extrabold text-[#2f457b]'>
                      {assignment.progress.percent}%
                    </div>
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

                  <div className='mt-4 border-t border-[#ececf2] pt-4'>
                    <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                      <div className='text-sm text-[#7d86a7]'>{assignment.progress.summary}</div>
                      <Link
                        href={buildKangurAssignmentHref(basePath, assignment)}
                        className='text-sm font-bold text-[#34497d] transition hover:text-[#ff8451]'
                      >
                        {actionLabel}
                      </Link>
                    </div>
                    {lastActivity ? (
                      <div className='mt-3 text-[11px] text-[#97a0bc]'>
                        Ostatnia aktywność: {lastActivity}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            }

            return (
              <KangurPanel
                key={assignment.id}
                className='h-full border-white/82 bg-white/90'
                padding='lg'
                variant='subtle'
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
                    <KangurLessonChip
                      accent={priorityAccent}
                      className='text-[11px] uppercase tracking-[0.14em]'
                    >
                      {formatPriority(assignment.priority)}
                    </KangurLessonChip>
                    <KangurLessonChip
                      accent={statusAccent}
                      className='text-[11px] uppercase tracking-[0.14em]'
                    >
                      {formatStatus(assignment.progress.status)}
                    </KangurLessonChip>
                    <div className='rounded-full border border-slate-200/80 bg-white px-3 py-1 text-sm font-extrabold text-slate-700 shadow-[0_16px_36px_-30px_rgba(30,41,59,0.24)]'>
                      {assignment.progress.percent}%
                    </div>
                  </div>
                </div>

                <KangurLessonCallout accent='indigo' className='mt-5' padding='md'>
                  <div className='flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-800/80'>
                    <span>{assignment.progress.summary}</span>
                    <span>Postęp</span>
                  </div>
                  <div className='mt-3 h-2.5 overflow-hidden rounded-full bg-white/75'>
                    <div
                      className='h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500'
                      style={{ width: `${assignment.progress.percent}%` }}
                    />
                  </div>
                  {lastActivity ? (
                    <div className='mt-3 text-[11px] text-slate-500'>
                      Ostatnia aktywność: {lastActivity}
                    </div>
                  ) : null}
                </KangurLessonCallout>

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
                      variant='secondary'
                    >
                      Archiwizuj
                    </KangurButton>
                  ) : null}
                </div>
              </KangurPanel>
            );
          })}
        </div>
      )}
    </KangurPanel>
  );
}

export default KangurAssignmentsList;
