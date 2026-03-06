import { useMemo, useState } from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import Link from 'next/link';

import { getKangurPageHref as createPageUrl } from '@/features/kangur/config/routing';
import { buildKangurAssignments } from '@/features/kangur/ui/services/assignments';
import type { KangurProgressState } from '@/features/kangur/ui/types';

type AssignmentPanelProps = {
  basePath: string;
  progress: KangurProgressState;
};

const PRIORITY_STYLES = {
  high: 'bg-rose-100 text-rose-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-emerald-100 text-emerald-700',
} as const;

const buildAssignmentHref = (
  basePath: string,
  action: {
    page: 'Game' | 'Lessons' | 'ParentDashboard' | 'LearnerProfile';
    query?: Record<string, string>;
  }
): string => {
  const href = createPageUrl(action.page, basePath);
  const query = action.query ? new URLSearchParams(action.query).toString() : '';
  return query.length > 0 ? `${href}?${query}` : href;
};

export function AssignmentPanel({ basePath, progress }: AssignmentPanelProps): React.JSX.Element {
  const assignments = useMemo(() => buildKangurAssignments(progress), [progress]);
  const [completedIds, setCompletedIds] = useState<string[]>([]);

  const completionLabel = useMemo(() => {
    if (assignments.length === 0) {
      return 'Brak zadan';
    }
    if (completedIds.length === assignments.length) {
      return 'Wszystkie zadania ukończone';
    }
    return `Ukończono ${completedIds.length}/${assignments.length}`;
  }, [assignments.length, completedIds.length]);

  const toggleAssignment = (id: string): void => {
    setCompletedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <section className='bg-white rounded-2xl shadow p-4 flex flex-col gap-3'>
      <header className='flex items-center justify-between'>
        <h3 className='text-sm font-bold text-gray-600 uppercase tracking-wide'>Zadania</h3>
        <span className='text-xs text-gray-400'>{completionLabel}</span>
      </header>
      {assignments.length === 0 ? (
        <div className='rounded-xl border border-dashed border-gray-200 bg-gray-50 px-3 py-6 text-center text-sm text-gray-400'>
          Brak proponowanych zadan. Zbierz najpierw troche postepu ucznia.
        </div>
      ) : (
        <div className='flex flex-col gap-2'>
          {assignments.map((assignment) => {
            const completed = completedIds.includes(assignment.id);
            return (
              <div
                key={assignment.id}
                className={`w-full text-left border rounded-xl px-3 py-2 transition ${
                  completed
                    ? 'border-green-300 bg-green-50'
                    : 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50'
                }`}
              >
                <div className='flex items-start gap-2'>
                  <button
                    type='button'
                    onClick={() => toggleAssignment(assignment.id)}
                    className='mt-0.5 rounded-full transition hover:scale-105'
                    aria-label={
                      completed
                        ? `Oznacz ${assignment.title} jako nieukończone`
                        : `Oznacz ${assignment.title} jako ukończone`
                    }
                  >
                    {completed ? (
                      <CheckCircle2 className='w-4 h-4 text-green-600' />
                    ) : (
                      <Circle className='w-4 h-4 text-gray-400' />
                    )}
                  </button>
                  <div className='min-w-0'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <p className='text-sm font-semibold text-gray-800'>{assignment.title}</p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${PRIORITY_STYLES[assignment.priority]}`}
                      >
                        {assignment.priority === 'high'
                          ? 'Priorytet wysoki'
                          : assignment.priority === 'medium'
                            ? 'Priorytet sredni'
                            : 'Priorytet niski'}
                      </span>
                    </div>
                    <p className='text-xs text-gray-500'>{assignment.description}</p>
                    <p className='text-xs text-indigo-500 mt-0.5'>Cel: {assignment.target}</p>
                    <Link
                      href={buildAssignmentHref(basePath, assignment.action)}
                      className='mt-2 inline-flex items-center rounded-lg border border-indigo-200 px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 transition'
                    >
                      {assignment.action.label}
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default AssignmentPanel;
