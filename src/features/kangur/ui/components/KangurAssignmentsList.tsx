import Link from 'next/link';

import type { KangurAssignmentSnapshot } from '@/features/kangur/services/ports';
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

const PRIORITY_STYLES = {
  high: 'bg-rose-100 text-rose-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-emerald-100 text-emerald-700',
} as const;

const STATUS_STYLES = {
  not_started: 'bg-slate-100 text-slate-600',
  in_progress: 'bg-indigo-100 text-indigo-700',
  completed: 'bg-emerald-100 text-emerald-700',
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
    <section className='bg-white/85 backdrop-blur rounded-2xl shadow p-5'>
      <div className='flex items-center justify-between gap-3 mb-3'>
        <div className='text-sm font-bold text-gray-500 uppercase tracking-wide'>{title}</div>
        <div className='text-xs text-gray-400'>{assignments.length} zadan</div>
      </div>
      {assignments.length === 0 ? (
        <div className='rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-6 text-center text-sm text-slate-400'>
          {emptyLabel}
        </div>
      ) : (
        <div className={`grid gap-3 ${compact ? 'grid-cols-1' : 'grid-cols-1 xl:grid-cols-2'}`}>
          {assignments.map((assignment) => {
            const lastActivity = formatTimestamp(assignment.progress.lastActivityAt);

            return (
              <article
                key={assignment.id}
                className='rounded-2xl border border-slate-100 bg-white/90 px-4 py-3 shadow-sm'
              >
                <div className='flex flex-wrap items-start justify-between gap-2'>
                  <div className='min-w-0'>
                    <div className='text-sm font-bold text-slate-800'>{assignment.title}</div>
                    <div className='mt-1 text-xs text-slate-500'>{assignment.description}</div>
                  </div>
                  <div className='flex flex-wrap items-center gap-2'>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${PRIORITY_STYLES[assignment.priority]}`}
                    >
                      {formatPriority(assignment.priority)}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${STATUS_STYLES[assignment.progress.status]}`}
                    >
                      {formatStatus(assignment.progress.status)}
                    </span>
                  </div>
                </div>

                <div className='mt-3'>
                  <div className='flex items-center justify-between gap-2 text-[11px] text-slate-500'>
                    <span>{assignment.progress.summary}</span>
                    <span>{assignment.progress.percent}%</span>
                  </div>
                  <div className='mt-1 h-2 overflow-hidden rounded-full bg-slate-100'>
                    <div
                      className='h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500'
                      style={{ width: `${assignment.progress.percent}%` }}
                    />
                  </div>
                  {lastActivity ? (
                    <div className='mt-2 text-[11px] text-slate-400'>Ostatnia aktywnosc: {lastActivity}</div>
                  ) : null}
                </div>

                <div className='mt-3 flex flex-wrap items-center gap-2'>
                  <Link
                    href={buildKangurAssignmentHref(basePath, assignment)}
                    className='inline-flex items-center rounded-lg border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 transition'
                  >
                    {getKangurAssignmentActionLabel(assignment)}
                  </Link>
                  {onArchive ? (
                    <button
                      type='button'
                      onClick={() => onArchive(assignment.id)}
                      className='inline-flex items-center rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition'
                    >
                      Archiwizuj
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default KangurAssignmentsList;
