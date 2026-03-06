import Link from 'next/link';

import type { KangurAssignmentSnapshot } from '@/features/kangur/services/ports';
import {
  KangurLessonCallout,
  KangurLessonChip,
} from '@/features/kangur/ui/design/lesson-primitives';
import { KangurButton, KangurPanel } from '@/features/kangur/ui/design/primitives';
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
        ? 'Priorytet średni'
        : 'Priorytet niski';
  const helperLabel =
    mode === 'active'
      ? 'W tej sesji realizujesz przydzielone zadanie.'
      : mode === 'completed'
        ? 'Zadanie od rodzica zostało ukończone w tej sesji.'
        : `Najbliższy priorytet w praktyce: ${formatKangurAssignmentOperationLabel(
          assignment.target.operation
        )}.`;

  return (
    <KangurPanel
      className='w-full max-w-md border-amber-200/80 bg-gradient-to-r from-amber-50/95 via-orange-50/90 to-rose-50/90'
      padding='lg'
      variant='elevated'
    >
      <KangurLessonChip accent='amber' className='text-[11px] uppercase tracking-[0.18em]'>
        Priorytet rodzica
      </KangurLessonChip>
      <div className='mt-3 text-sm font-semibold leading-6 text-amber-900'>{helperLabel}</div>

      <KangurPanel className='mt-4 border-white/85 bg-white/95' padding='lg' variant='subtle'>
        <div className='flex flex-wrap items-start justify-between gap-3'>
          <div className='min-w-0'>
            <KangurLessonChip accent='amber' className='text-[11px] uppercase tracking-[0.16em]'>
              {statusLabel}
            </KangurLessonChip>
            <div className='mt-3 text-base font-extrabold text-slate-900'>{assignment.title}</div>
            <div className='mt-1 text-sm leading-6 text-slate-600'>{assignment.description}</div>
          </div>
          <KangurLessonChip accent='amber' className='text-sm font-bold text-amber-800'>
            {assignment.progress.percent}%
          </KangurLessonChip>
        </div>

        <KangurLessonCallout accent='amber' className='mt-4' padding='md'>
          <div className='flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-800/80'>
            <span>{assignment.progress.summary}</span>
            <span>Postęp</span>
          </div>
          <div className='mt-3 h-2.5 overflow-hidden rounded-full bg-white/75'>
            <div
              className='h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400'
              style={{ width: `${assignment.progress.percent}%` }}
            />
          </div>
        </KangurLessonCallout>

        <KangurButton asChild className='mt-4' fullWidth variant='primary'>
          <Link href={buildKangurAssignmentHref(basePath, assignment)}>
            {getKangurAssignmentActionLabel(assignment)}
          </Link>
        </KangurButton>
      </KangurPanel>
    </KangurPanel>
  );
}

export default KangurPracticeAssignmentBanner;
