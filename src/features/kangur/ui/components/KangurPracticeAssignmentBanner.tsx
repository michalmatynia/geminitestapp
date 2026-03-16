'use client';

import { Clock } from 'lucide-react';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import type { KangurAssignmentSnapshot } from '@/features/kangur/services/ports';
import { useInterval } from '@/features/kangur/shared/hooks/use-interval';
import { KangurAssignmentPriorityChip } from '@/features/kangur/ui/components/KangurAssignmentPriorityChip';
import { KangurTransitionLink as Link } from '@/features/kangur/ui/components/KangurTransitionLink';
import {
  KangurButton,
  KangurCardDescription,
  KangurCardTitle,
  KangurGlassPanel,
  KangurMetaText,
  KangurProgressBar,
  KangurStatusChip,
  KangurSummaryPanel,
  KangurSurfacePanel,
} from '@/features/kangur/ui/design/primitives';
import {
  buildKangurAssignmentListItem,
  formatKangurAssignmentOperationLabel,
  resolveKangurAssignmentCountdownLabel,
} from '@/features/kangur/ui/services/delegated-assignments';

type KangurPracticeAssignmentBannerProps = {
  assignment: KangurAssignmentSnapshot & { target: { type: 'practice' } };
  basePath: string;
  mode: 'queue' | 'active' | 'completed';
};

type KangurPracticeAssignmentBannerModel = {
  actionTransitionSourceId: string;
  helperLabel: string;
  priority: KangurAssignmentSnapshot['priority'];
  title: string;
  description: string;
  progressPercent: number;
  progressSummary: string;
  actionHref: string;
  actionLabel: string;
  timeLimitMinutes: number | null;
  timeLimitStartsAt: string | null;
  createdAt: string;
  status: KangurAssignmentSnapshot['progress']['status'];
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
    priority: item.priority,
    title: item.title,
    description: item.description,
    progressPercent: item.progressPercent,
    progressSummary: item.progressSummary,
    actionHref: item.actionHref,
    actionLabel: item.actionLabel,
    timeLimitMinutes: assignment.timeLimitMinutes ?? null,
    timeLimitStartsAt: assignment.timeLimitStartsAt ?? null,
    createdAt: assignment.createdAt,
    status: assignment.progress.status,
  };
};

function KangurPracticeAssignmentBannerBody(): React.JSX.Element {
  const banner = useKangurPracticeAssignmentBannerModel();
  const shouldTick = Boolean(banner.timeLimitMinutes) && banner.status !== 'completed';
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!shouldTick) {
      return;
    }

    setNow(Date.now());
  }, [shouldTick]);

  useInterval(() => {
    setNow(Date.now());
  }, shouldTick ? 1000 : null);

  const countdownLabel = resolveKangurAssignmentCountdownLabel({
    timeLimitMinutes: banner.timeLimitMinutes,
    timeLimitStartsAt: banner.timeLimitStartsAt,
    createdAt: banner.createdAt,
    status: banner.status,
    now,
  });

  return (
    <>
      <KangurStatusChip accent='amber' labelStyle='eyebrow'>
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
        <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
          <div className='min-w-0'>
            <KangurAssignmentPriorityChip
              accent='amber'
              labelStyle='caps'
              priority={banner.priority}
            />
            <KangurCardTitle className='mt-3' size='md'>
              {banner.title}
            </KangurCardTitle>
            <KangurCardDescription className='mt-1' relaxed size='sm'>
              {banner.description}
            </KangurCardDescription>
          </div>
          <KangurStatusChip
            accent='amber'
            className='self-start text-sm font-bold text-amber-800 sm:self-auto'
          >
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
        {countdownLabel ? (
          <KangurMetaText className='mt-3 flex items-center gap-2 text-sm'>
            <Clock className='h-4 w-4 text-slate-400' aria-hidden='true' />
            {countdownLabel}
          </KangurMetaText>
        ) : null}

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
