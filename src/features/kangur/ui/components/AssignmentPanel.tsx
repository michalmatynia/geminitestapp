import { useMemo, useState } from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import Link from 'next/link';

import {
  appendKangurUrlParams,
  getKangurPageHref as createPageUrl,
} from '@/features/kangur/config/routing';
import { KANGUR_ACCENT_STYLES } from '@/features/kangur/ui/design/tokens';
import {
  KangurButton,
  KangurEmptyState,
  KangurGlassPanel,
  KangurInfoCard,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import { buildKangurAssignments } from '@/features/kangur/ui/services/assignments';
import type { KangurProgressState } from '@/features/kangur/ui/types';
import { cn } from '@/shared/utils';

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
  return action.query ? appendKangurUrlParams(href, action.query, basePath) : href;
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
    <KangurGlassPanel
      data-testid='assignment-panel-shell'
      padding='lg'
      surface='neutral'
      variant='soft'
    >
      <header className='flex items-center justify-between gap-3'>
        <div className='text-sm font-bold uppercase tracking-[0.18em] text-slate-500'>Zadania</div>
        <KangurStatusChip accent='slate' className='text-[11px] uppercase tracking-[0.14em]'>
          {completionLabel}
        </KangurStatusChip>
      </header>
      {assignments.length === 0 ? (
        <KangurEmptyState
          accent='slate'
          className='mt-4 text-sm'
          description='Brak proponowanych zadań. Zbierz najpierw trochę postępu ucznia.'
          padding='lg'
        />
      ) : (
        <div className='mt-4 flex flex-col gap-3'>
          {assignments.map((assignment) => {
            const completed = completedIds.includes(assignment.id);
            return (
              <KangurInfoCard
                accent={completed ? 'emerald' : 'indigo'}
                data-testid={`assignment-panel-card-${assignment.id}`}
                key={assignment.id}
                className={cn(
                  'transition',
                  completed
                    ? KANGUR_ACCENT_STYLES.emerald.activeCard
                    : KANGUR_ACCENT_STYLES.indigo.hoverCard
                )}
                padding='md'
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
                      <KangurStatusChip
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
                      </KangurStatusChip>
                    </div>
                    <p className='mt-1 text-sm leading-6 text-slate-600'>
                      {assignment.description}
                    </p>
                    <KangurStatusChip
                      accent='indigo'
                      className='mt-2 text-[11px] uppercase tracking-[0.14em]'
                      size='sm'
                    >
                      Cel: {assignment.target}
                    </KangurStatusChip>
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
              </KangurInfoCard>
            );
          })}
        </div>
      )}
    </KangurGlassPanel>
  );
}

export default AssignmentPanel;
