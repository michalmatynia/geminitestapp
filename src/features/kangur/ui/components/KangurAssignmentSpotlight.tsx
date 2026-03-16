'use client';

import { Clock } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { useInterval } from '@/features/kangur/shared/hooks/use-interval';
import { KangurAssignmentPriorityChip } from '@/features/kangur/ui/components/KangurAssignmentPriorityChip';
import { KangurTransitionLink as Link } from '@/features/kangur/ui/components/KangurTransitionLink';
import {
  KangurButton,
  KangurDivider,
  KangurGlassPanel,
  KangurResultBadge,
} from '@/features/kangur/ui/design/primitives';
import { useKangurAssignments } from '@/features/kangur/ui/hooks/useKangurAssignments';
import {
  buildKangurAssignmentHref,
  getKangurAssignmentActionLabel,
  resolveKangurAssignmentCountdownLabel,
  selectKangurPriorityAssignments,
} from '@/features/kangur/ui/services/delegated-assignments';

type KangurAssignmentSpotlightProps = {
  basePath: string;
  enabled?: boolean;
};

export function KangurAssignmentSpotlight({
  basePath,
  enabled = false,
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
  const shouldTick =
    Boolean(assignment?.timeLimitMinutes) && assignment?.progress.status !== 'completed';
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

  if (!enabled || isLoading || error || !assignment) {
    return null;
  }

  const assignmentHref = buildKangurAssignmentHref(basePath, assignment);
  const transitionSourceId = `assignment-spotlight:${assignment.id}`;
  const countdownLabel = resolveKangurAssignmentCountdownLabel({
    timeLimitMinutes: assignment.timeLimitMinutes,
    timeLimitStartsAt: assignment.timeLimitStartsAt,
    createdAt: assignment.createdAt,
    status: assignment.progress.status,
    now,
  });

  return (
    <KangurGlassPanel
      className='mx-auto w-full max-w-3xl'
      data-testid='kangur-assignment-spotlight-shell'
      padding='md'
      surface='mist'
      variant='elevated'
    >
      <div className='px-3 pt-2 sm:px-4'>
        <div className='text-[1.6rem] font-extrabold tracking-tight [color:var(--kangur-page-text)] sm:text-[2rem]'>
          Sugestie od Rodzica
        </div>
      </div>

      <KangurGlassPanel
        className='relative mt-4'
        data-testid='kangur-assignment-spotlight-inner-shell'
        padding='lg'
        surface='solid'
        variant='subtle'
      >
        <KangurResultBadge
          className='mb-3 w-fit text-lg font-extrabold sm:absolute sm:right-5 sm:top-5 sm:mb-0'
          data-testid='kangur-assignment-spotlight-progress'
          tone='warning'
        >
          {assignment.progress.percent}%
        </KangurResultBadge>

        <div className='sm:pr-24'>
          <KangurAssignmentPriorityChip
            accent='amber'
            className='text-[11px] uppercase tracking-[0.18em]'
            priority={assignment.priority}
            size='sm'
          />
          <div className='mt-4 flex items-start gap-3'>
            <span className='mt-1 text-xl' aria-hidden='true'>
              {assignment.target.type === 'lesson' ? '📚' : '🎯'}
            </span>
            <div className='min-w-0'>
              <div className='break-words text-[1.55rem] font-extrabold tracking-tight [color:var(--kangur-page-text)]'>
                {assignment.title}
              </div>
              <div className='mt-4 break-words text-[1.04rem] leading-8 [color:var(--kangur-page-muted-text)]'>
                {assignment.description}
              </div>
            </div>
          </div>
        </div>

        {countdownLabel ? (
          <div className='mt-6 flex justify-center'>
            <div className='flex flex-wrap items-center justify-center gap-3 rounded-[28px] border border-amber-200/80 bg-amber-50/90 px-6 py-4 text-center text-2xl font-black tracking-tight text-amber-900 shadow-[0_24px_50px_-34px_rgba(251,191,36,0.7)] sm:text-3xl'>
              <Clock className='h-6 w-6 text-amber-500 sm:h-7 sm:w-7' aria-hidden='true' />
              <span>{countdownLabel}</span>
            </div>
          </div>
        ) : null}

        <div className='mt-5 space-y-4 text-sm [color:var(--kangur-page-muted-text)]'>
          <KangurDivider
            accent='slate'
            className='w-full'
            data-testid='kangur-assignment-spotlight-divider'
            size='sm'
          />
          <div>{assignment.progress.summary}</div>
        </div>

        <KangurButton
          asChild
          className='mt-5 rounded-[22px] py-3.5 text-lg font-extrabold shadow-[0_24px_58px_-30px_rgba(255,133,72,0.56)]'
          fullWidth
          variant='primary'
        >
          <Link
            href={assignmentHref}
            transitionAcknowledgeMs={110}
            transitionSourceId={transitionSourceId}
          >
            {getKangurAssignmentActionLabel(assignment)}
          </Link>
        </KangurButton>
      </KangurGlassPanel>
    </KangurGlassPanel>
  );
}

export default KangurAssignmentSpotlight;
