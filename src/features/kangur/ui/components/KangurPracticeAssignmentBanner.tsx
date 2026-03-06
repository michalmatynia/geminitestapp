import Link from 'next/link';

import type { KangurAssignmentSnapshot } from '@/features/kangur/services/ports';
import {
  buildKangurAssignmentHref,
  formatKangurAssignmentOperationLabel,
  getKangurAssignmentActionLabel,
} from '@/features/kangur/ui/services/delegated-assignments';

type KangurPracticeAssignmentBannerProps = {
  assignment: KangurAssignmentSnapshot & { target: { type: 'practice' } };
  basePath: string;
  mode: 'queue' | 'active' | 'completed';
};

export function KangurPracticeAssignmentBanner({
  assignment,
  basePath,
  mode,
}: KangurPracticeAssignmentBannerProps): React.JSX.Element {
  const statusLabel =
    assignment.priority === 'high'
      ? 'Priorytet wysoki'
      : assignment.priority === 'medium'
        ? 'Priorytet sredni'
        : 'Priorytet niski';
  const helperLabel =
    mode === 'active'
      ? 'W tej sesji realizujesz przydzielone zadanie.'
      : mode === 'completed'
        ? 'Zadanie od rodzica zostalo ukonczone w tej sesji.'
        : `Najblizszy priorytet w praktyce: ${formatKangurAssignmentOperationLabel(
          assignment.target.operation
        )}.`;

  return (
    <section className='w-full max-w-md rounded-3xl border border-amber-200 bg-gradient-to-r from-amber-50 via-orange-50 to-rose-50 px-4 py-4 shadow-sm'>
      <div className='text-[11px] font-bold uppercase tracking-[0.18em] text-amber-600'>
        Priorytet rodzica
      </div>
      <div className='mt-1 text-sm font-semibold text-amber-700'>{helperLabel}</div>

      <div className='mt-3 rounded-2xl border border-white/80 bg-white/90 px-4 py-3 shadow-sm'>
        <div className='flex items-start justify-between gap-3'>
          <div>
            <div className='text-xs font-bold uppercase tracking-wide text-amber-500'>
              {statusLabel}
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

export default KangurPracticeAssignmentBanner;
