import { createContext, useContext, useMemo } from 'react';

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
  buildKangurAssignmentListItem,
  formatKangurAssignmentOperationLabel,
} from '@/features/kangur/ui/services/delegated-assignments';

type KangurPracticeAssignmentBannerProps = {
  assignment: KangurAssignmentSnapshot & { target: { type: 'practice' } };
  basePath: string;
  mode: 'queue' | 'active' | 'completed';
};

type KangurPracticeAssignmentBannerModel = {
  actionTransitionSourceId: string;
  helperLabel: string;
  priorityLabel: string;
  title: string;
  description: string;
  progressPercent: number;
  progressSummary: string;
  actionHref: string;
  actionLabel: string;
};

const KangurPracticeAssignmentBannerContext =
  createContext<KangurPracticeAssignmentBannerModel | null>(null);

const useKangurPracticeAssignmentBannerModel = (): KangurPracticeAssignmentBannerModel => {
  const context = useContext(KangurPracticeAssignmentBannerContext);

  if (!context) {
    throw new Error(
      'useKangurPracticeAssignmentBannerModel must be used within KangurPracticeAssignmentBanner.'
    );
  }

  return context;
};

const buildKangurPracticeAssignmentBannerModel = (
  assignment: KangurAssignmentSnapshot & { target: { type: 'practice' } },
  basePath: string,
  mode: KangurPracticeAssignmentBannerProps['mode']
): KangurPracticeAssignmentBannerModel => {
  const item = buildKangurAssignmentListItem(basePath, assignment);
  const helperLabel =
    mode === 'active'
      ? 'W tej sesji realizujesz przydzielone zadanie.'
      : mode === 'completed'
        ? 'Zadanie od rodzica zostało ukończone w tej sesji.'
        : `Najbliższy priorytet w praktyce: ${formatKangurAssignmentOperationLabel(
          assignment.target.operation
        )}.`;

  return {
    actionTransitionSourceId: `practice-assignment-banner:${assignment.id}`,
    helperLabel,
    priorityLabel: item.priorityLabel,
    title: item.title,
    description: item.description,
    progressPercent: item.progressPercent,
    progressSummary: item.progressSummary,
    actionHref: item.actionHref,
    actionLabel: item.actionLabel,
  };
};

function KangurPracticeAssignmentBannerBody(): React.JSX.Element {
  const banner = useKangurPracticeAssignmentBannerModel();

  return (
    <>
      <KangurStatusChip accent='amber' className='text-[11px] uppercase tracking-[0.18em]'>
        Priorytet rodzica
      </KangurStatusChip>
      <div className='mt-3 text-sm font-semibold leading-6 text-amber-900'>{banner.helperLabel}</div>

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
              {banner.priorityLabel}
            </KangurStatusChip>
            <div className='mt-3 text-base font-extrabold [color:var(--kangur-page-text)]'>
              {banner.title}
            </div>
            <div className='mt-1 text-sm leading-6 [color:var(--kangur-page-muted-text)]'>
              {banner.description}
            </div>
          </div>
          <KangurStatusChip accent='amber' className='text-sm font-bold text-amber-800'>
            {banner.progressPercent}%
          </KangurStatusChip>
        </div>

        <KangurSummaryPanel
          accent='amber'
          className='mt-4 rounded-[24px]'
          description={banner.progressSummary}
          label='Postęp'
          padding='md'
          tone='accent'
        >
          <KangurProgressBar
            accent='amber'
            className='mt-3'
            data-testid='kangur-practice-assignment-progress-bar'
            size='sm'
            value={banner.progressPercent}
          />
        </KangurSummaryPanel>

        <KangurButton asChild className='mt-4' fullWidth variant='primary'>
          <Link
            href={banner.actionHref}
            transitionAcknowledgeMs={110}
            transitionSourceId={banner.actionTransitionSourceId}
          >
            {banner.actionLabel}
          </Link>
        </KangurButton>
      </KangurGlassPanel>
    </>
  );
}

export function KangurPracticeAssignmentBanner({
  assignment,
  basePath,
  mode,
}: KangurPracticeAssignmentBannerProps): React.JSX.Element {
  const banner = useMemo(
    () => buildKangurPracticeAssignmentBannerModel(assignment, basePath, mode),
    [assignment, basePath, mode]
  );

  return (
    <KangurPracticeAssignmentBannerContext.Provider value={banner}>
      <KangurSurfacePanel
        accent='amber'
        className='w-full max-w-md'
        data-testid='kangur-practice-assignment-shell'
        padding='lg'
        style={{
          background:
            'linear-gradient(135deg, color-mix(in srgb, var(--kangur-soft-card-background) 78%, rgba(254,243,199,0.96)) 0%, color-mix(in srgb, var(--kangur-soft-card-background) 82%, rgba(255,237,213,0.92)) 55%, color-mix(in srgb, var(--kangur-soft-card-background) 84%, rgba(254,205,211,0.88)) 100%)',
        }}
      >
        <KangurPracticeAssignmentBannerBody />
      </KangurSurfacePanel>
    </KangurPracticeAssignmentBannerContext.Provider>
  );
}

export default KangurPracticeAssignmentBanner;
