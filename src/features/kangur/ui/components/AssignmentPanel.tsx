import { useMemo, useState } from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import Link from 'next/link';

import {
  appendKangurUrlParams,
  getKangurPageHref as createPageUrl,
} from '@/features/kangur/config/routing';
import {
  KangurLessonCallout,
  KangurLessonChip,
} from '@/features/kangur/ui/design/lesson-primitives';
import { KangurButton, KangurPanel } from '@/features/kangur/ui/design/primitives';
import { buildKangurAssignments } from '@/features/kangur/ui/services/assignments';
import type { KangurProgressState } from '@/features/kangur/ui/types';

type AssignmentPanelProps = {
  basePath: string;
  progress: KangurProgressState;
};

const buildAssignmentHref = (
  basePath: string,
  action: {
    page: 'Game' | 'Lessons' | 'ParentDashboard' | 'LearnerProfile';
    query?: Record<string, string>;
  }
): string => {
  const href = createPageUrl(action.page, basePath);
  return action.query ? appendKangurUrlParams(href, action.query) : href;
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
    <KangurPanel className='border-slate-200/70 bg-white/88' padding='lg' variant='soft'>
      <header className='flex items-center justify-between gap-3'>
        <div className='text-sm font-bold uppercase tracking-[0.18em] text-slate-500'>Zadania</div>
        <KangurLessonChip accent='slate' className='text-[11px] uppercase tracking-[0.14em]'>
          {completionLabel}
        </KangurLessonChip>
      </header>
      {assignments.length === 0 ? (
        <KangurLessonCallout
          accent='slate'
          className='mt-4 border-dashed text-center text-sm text-slate-500'
          padding='lg'
        >
          Brak proponowanych zadań. Zbierz najpierw trochę postępu ucznia.
        </KangurLessonCallout>
      ) : (
        <div className='mt-4 flex flex-col gap-3'>
          {assignments.map((assignment) => {
            const completed = completedIds.includes(assignment.id);
            return (
              <KangurPanel
                key={assignment.id}
                className={`w-full border transition ${
                  completed
                    ? 'border-emerald-200/80 bg-emerald-50/72'
                    : 'border-slate-200/80 bg-white/95 hover:border-indigo-200 hover:bg-indigo-50/35'
                }`}
                padding='md'
                variant='subtle'
              >
                <div className='flex items-start gap-2'>
                  <KangurButton
                    type='button'
                    onClick={() => toggleAssignment(assignment.id)}
                    aria-label={
                      completed
                        ? `Oznacz ${assignment.title} jako nieukończone`
                        : `Oznacz ${assignment.title} jako ukończone`
                    }
                    aria-pressed={completed}
                    className='mt-0.5 h-8 w-8 min-w-0 rounded-full px-0'
                    data-testid={`assignment-panel-toggle-${assignment.id}`}
                    size='sm'
                    variant={completed ? 'success' : 'secondary'}
                  >
                    {completed ? (
                      <CheckCircle2 className='h-4 w-4 text-emerald-600' />
                    ) : (
                      <Circle className='h-4 w-4 text-slate-400' />
                    )}
                  </KangurButton>
                  <div className='min-w-0'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <p className='text-sm font-semibold text-slate-900'>{assignment.title}</p>
                      <KangurLessonChip
                        accent={
                          assignment.priority === 'high'
                            ? 'rose'
                            : assignment.priority === 'medium'
                              ? 'amber'
                              : 'emerald'
                        }
                        className='text-[11px] uppercase tracking-[0.14em]'
                      >
                        {assignment.priority === 'high'
                          ? 'Priorytet wysoki'
                          : assignment.priority === 'medium'
                            ? 'Priorytet średni'
                            : 'Priorytet niski'}
                      </KangurLessonChip>
                    </div>
                    <p className='mt-1 text-sm leading-6 text-slate-600'>{assignment.description}</p>
                    <p className='mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600'>
                      Cel: {assignment.target}
                    </p>
                    <KangurButton
                      asChild
                      className='mt-3'
                      size='sm'
                      variant={completed ? 'success' : 'surface'}
                    >
                      <Link href={buildAssignmentHref(basePath, assignment.action)}>
                        {assignment.action.label}
                      </Link>
                    </KangurButton>
                  </div>
                </div>
              </KangurPanel>
            );
          })}
        </div>
      )}
    </KangurPanel>
  );
}

export default AssignmentPanel;
