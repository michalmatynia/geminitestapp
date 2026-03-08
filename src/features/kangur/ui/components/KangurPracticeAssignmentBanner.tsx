import type { KangurAssignmentSnapshot } from '@/features/kangur/services/ports';
import { KangurTransitionLink as Link } from '@/features/kangur/ui/components/KangurTransitionLink';
import {
  KangurButton,
  KangurGlassPanel,
  KangurProgressBar,
  KangurStatusChip,
  KangurSummaryPanel,
  KangurSurfacePanel,
} from '@/features/kangur/ui/design/primitives';
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
    <KangurSurfacePanel
      accent='amber'
      className='w-full max-w-md bg-gradient-to-r from-amber-50/95 via-orange-50/90 to-rose-50/90'
      data-testid='kangur-practice-assignment-shell'
      padding='lg'
    >
      <KangurStatusChip accent='amber' className='text-[11px] uppercase tracking-[0.18em]'>
        Priorytet rodzica
      </KangurStatusChip>
      <div className='mt-3 text-sm font-semibold leading-6 text-amber-900'>{helperLabel}</div>

      <KangurGlassPanel
        className='mt-4'
        data-testid='kangur-practice-assignment-inner-shell'
        padding='lg'
        surface='solid'
        variant='soft'
      >
        <div className='flex flex-wrap items-start justify-between gap-3'>
          <div className='min-w-0'>
            <KangurStatusChip accent='amber' className='text-[11px] uppercase tracking-[0.16em]'>
              {statusLabel}
            </KangurStatusChip>
            <div className='mt-3 text-base font-extrabold text-slate-900'>{assignment.title}</div>
            <div className='mt-1 text-sm leading-6 text-slate-600'>{assignment.description}</div>
          </div>
          <KangurStatusChip accent='amber' className='text-sm font-bold text-amber-800'>
            {assignment.progress.percent}%
          </KangurStatusChip>
        </div>

        <KangurSummaryPanel
          accent='amber'
          className='mt-4 rounded-[24px]'
          description={assignment.progress.summary}
          label='Postęp'
          padding='md'
          tone='accent'
        >
          <KangurProgressBar
            accent='amber'
            className='mt-3'
            data-testid='kangur-practice-assignment-progress-bar'
            size='sm'
            value={assignment.progress.percent}
          />
        </KangurSummaryPanel>

        <KangurButton asChild className='mt-4' fullWidth variant='primary'>
          <Link href={buildKangurAssignmentHref(basePath, assignment)}>
            {getKangurAssignmentActionLabel(assignment)}
          </Link>
        </KangurButton>
      </KangurGlassPanel>
    </KangurSurfacePanel>
  );
}

export default KangurPracticeAssignmentBanner;
