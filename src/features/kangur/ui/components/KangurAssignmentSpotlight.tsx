import Link from 'next/link';
import { useMemo } from 'react';

import { useKangurAssignments } from '@/features/kangur/ui/hooks/useKangurAssignments';
import {
  buildKangurAssignmentHref,
  getKangurAssignmentActionLabel,
  selectKangurPriorityAssignments,
} from '@/features/kangur/ui/services/delegated-assignments';

type KangurAssignmentSpotlightProps = {
  basePath: string;
  enabled?: boolean;
};

export function KangurAssignmentSpotlight({
  basePath,
  enabled = true,
}: KangurAssignmentSpotlightProps): React.JSX.Element | null {
  const { assignments, isLoading, error } = useKangurAssignments({
    enabled,
    query: {
      includeArchived: false,
    },
  });

  const assignment = useMemo(
    () => selectKangurPriorityAssignments(assignments, 1)[0] ?? null,
    [assignments]
  );

  if (!enabled || isLoading || error || !assignment) {
    return null;
  }

  return (
    <section className='w-full rounded-3xl border border-amber-200 bg-gradient-to-r from-amber-50 via-orange-50 to-rose-50 px-4 py-4 shadow-sm'>
      <div className='text-[11px] font-bold uppercase tracking-[0.18em] text-amber-600'>
        Na teraz
      </div>
      <div className='mt-1 text-lg font-extrabold text-slate-800'>Zadanie od rodzica</div>

      <div className='mt-3 rounded-2xl border border-white/80 bg-white/90 px-4 py-3 shadow-sm'>
        <div className='flex items-start justify-between gap-3'>
          <div>
            <div className='text-xs font-bold uppercase tracking-wide text-amber-500'>
              {assignment.priority === 'high'
                ? 'Priorytet wysoki'
                : assignment.priority === 'medium'
                  ? 'Priorytet sredni'
                  : 'Priorytet niski'}
            </div>
            <div className='mt-1 text-base font-extrabold text-slate-800'>{assignment.title}</div>
            <div className='mt-1 text-sm text-slate-600'>{assignment.description}</div>
          </div>
          <div className='rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700'>
            {assignment.progress.percent}%
          </div>
        </div>

        <div className='mt-3'>
          <div className='flex items-center justify-between gap-2 text-[11px] text-slate-500'>
            <span>{assignment.progress.summary}</span>
            <span>Postep</span>
          </div>
          <div className='mt-1 h-2 overflow-hidden rounded-full bg-amber-100'>
            <div
              className='h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400'
              style={{ width: `${assignment.progress.percent}%` }}
            />
          </div>
        </div>

        <Link
          href={buildKangurAssignmentHref(basePath, assignment)}
          className='mt-3 inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-2.5 text-sm font-extrabold text-white shadow transition hover:brightness-105'
        >
          {getKangurAssignmentActionLabel(assignment)}
        </Link>
      </div>
    </section>
  );
}

export default KangurAssignmentSpotlight;
