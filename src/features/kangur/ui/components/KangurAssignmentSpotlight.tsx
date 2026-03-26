'use client';

import { Clock } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useState, type MouseEvent } from 'react';

import { getLocalizedKangurSubjectLabel } from '@/features/kangur/lessons/lesson-catalog-i18n';
import { useInterval } from '@/features/kangur/shared/hooks/use-interval';
import { KangurAssignmentPriorityChip } from '@/features/kangur/ui/components/KangurAssignmentPriorityChip';
import { KangurTransitionLink as Link } from '@/features/kangur/ui/components/KangurTransitionLink';
import { useKangurSubjectFocus } from '@/features/kangur/ui/context/KangurSubjectFocusContext';
import {
  KangurButton,
  KangurDivider,
  KangurGlassPanel,
  KangurResultBadge,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import { KANGUR_WRAP_CENTER_ROW_CLASSNAME, type KangurAccent } from '@/features/kangur/ui/design/tokens';
import { useKangurAssignments } from '@/features/kangur/ui/hooks/useKangurAssignments';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import {
  GAME_HOME_ASSIGNMENT_SPOTLIGHT_INNER_SHELL_CLASSNAME,
  GAME_HOME_ASSIGNMENT_SPOTLIGHT_SHELL_CLASSNAME,
} from '@/features/kangur/ui/pages/GameHome.constants';
import {
  buildKangurAssignmentHref,
  getKangurAssignmentActionLabel,
  resolveKangurAssignmentCountdownLabel,
  resolveKangurAssignmentSubject,
  selectKangurPriorityAssignments,
} from '@/features/kangur/ui/services/delegated-assignments';
import { cn } from '@/features/kangur/shared/utils';
import type { KangurLessonSubject } from '@/features/kangur/shared/contracts/kangur';

type KangurAssignmentSpotlightProps = {
  basePath: string;
  enabled?: boolean;
};

const SUBJECT_ACCENTS: Record<KangurLessonSubject, KangurAccent> = {
  alphabet: 'amber',
  art: 'rose',
  music: 'sky',
  geometry: 'emerald',
  english: 'sky',
  maths: 'violet',
  web_development: 'teal',
  agentic_coding: 'indigo',
};

export function KangurAssignmentSpotlight({
  basePath,
  enabled = false,
}: KangurAssignmentSpotlightProps): React.JSX.Element | null {
  const locale = useLocale();
  const runtimeTranslations = useTranslations('KangurAssignmentsRuntime');
  const isCoarsePointer = useKangurCoarsePointer();
  const { subject, setSubject } = useKangurSubjectFocus();
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

  const assignmentSubject = resolveKangurAssignmentSubject(assignment);
  const assignmentSubjectLabel = getLocalizedKangurSubjectLabel(assignmentSubject, locale);
  const assignmentSubjectAccent = SUBJECT_ACCENTS[assignmentSubject];
  const assignmentHref = buildKangurAssignmentHref(basePath, assignment);
  const transitionSourceId = `assignment-spotlight:${assignment.id}`;
  const countdownLabel = resolveKangurAssignmentCountdownLabel({
    timeLimitMinutes: assignment.timeLimitMinutes,
    timeLimitStartsAt: assignment.timeLimitStartsAt,
    createdAt: assignment.createdAt,
    status: assignment.progress.status,
    now,
  }, {
    locale,
    translate: runtimeTranslations,
  });

  return (
    <KangurGlassPanel
      className={GAME_HOME_ASSIGNMENT_SPOTLIGHT_SHELL_CLASSNAME}
      data-testid='kangur-assignment-spotlight-shell'
      padding='md'
      surface='mist'
      variant='elevated'
    >
      <div className='px-3 pt-2 sm:px-4'>
        <div className='text-[1.6rem] font-extrabold tracking-tight [color:var(--kangur-page-text)] sm:text-[2rem]'>
          {runtimeTranslations('spotlight.title')}
        </div>
      </div>

      <KangurGlassPanel
        className={GAME_HOME_ASSIGNMENT_SPOTLIGHT_INNER_SHELL_CLASSNAME}
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
          <div className={KANGUR_WRAP_CENTER_ROW_CLASSNAME}>
            <KangurAssignmentPriorityChip
              accent='amber'
              className='text-[11px] uppercase tracking-[0.18em]'
              priority={assignment.priority}
              size='sm'
            />
            <KangurStatusChip
              accent={assignmentSubjectAccent}
              className='text-[11px] uppercase tracking-[0.18em]'
              labelStyle='compact'
              size='sm'
            >
              {assignmentSubjectLabel}
            </KangurStatusChip>
          </div>
          <div className='mt-4 flex items-start kangur-panel-gap'>
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
            <div className='flex flex-wrap items-center justify-center kangur-panel-gap rounded-[28px] border border-amber-200/80 bg-amber-50/90 px-6 py-4 text-center text-2xl font-black tracking-tight text-amber-900 shadow-[0_24px_50px_-34px_rgba(251,191,36,0.7)] sm:text-3xl'>
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
          className={cn(
            'mt-5 rounded-[22px] py-3.5 text-lg font-extrabold shadow-[0_24px_58px_-30px_rgba(255,133,72,0.56)]',
            isCoarsePointer && 'min-h-12 px-4 touch-manipulation select-none active:scale-[0.985]'
          )}
          fullWidth
          variant='primary'
        >
          <Link
            href={assignmentHref}
            onClick={(event: MouseEvent<HTMLAnchorElement>) => {
              if (
                event.defaultPrevented ||
                event.button !== 0 ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
              ) {
                return;
              }
              if (assignmentSubject !== subject) {
                setSubject(assignmentSubject);
              }
            }}
            transitionSourceId={transitionSourceId}
          >
            {getKangurAssignmentActionLabel(assignment, {
              locale,
              translate: runtimeTranslations,
            })}
          </Link>
        </KangurButton>
      </KangurGlassPanel>
    </KangurGlassPanel>
  );
}

export default KangurAssignmentSpotlight;
