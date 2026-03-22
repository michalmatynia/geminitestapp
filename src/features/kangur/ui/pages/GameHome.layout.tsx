import type { KangurUser } from '@kangur/platform';
import type { ReactNode, RefObject } from 'react';

import {
  GAME_HOME_ACTIONS_COLUMN_CLASSNAME,
  GAME_HOME_CENTERED_SECTION_CLASSNAME,
  GAME_HOME_LEADERBOARD_COLUMN_CLASSNAME,
  GAME_HOME_PLAYER_PROGRESS_COLUMN_CLASSNAME,
  GAME_HOME_PROGRESS_GRID_CLASSNAME,
  GAME_HOME_SECTION_CLASSNAME,
} from '@/features/kangur/ui/pages/GameHome.constants';
import type { KangurProgressState } from '@/features/kangur/ui/types';

type GameHomeProgressLike =
  | Partial<
      Pick<
        KangurProgressState,
        'dailyQuestsCompleted' | 'gamesPlayed' | 'lessonsCompleted' | 'totalXp'
      >
    >
  | null
  | undefined;

export type KangurGameHomeVisibility = {
  canAccessParentAssignments: boolean;
  hasMeaningfulProgress: boolean;
  hideLearnerWidgetsForParent: boolean;
  showAssignments: boolean;
  showParentSpotlight: boolean;
  showProgressGrid: boolean;
  showQuest: boolean;
  showSummary: boolean;
};

type SectionSlotProps = {
  headingId?: string;
  headingLabel?: string;
  id?: string;
  ref?: RefObject<HTMLElement | null>;
  testId?: string;
};

type ColumnSlotProps = {
  id?: string;
  ref?: RefObject<HTMLDivElement | null>;
  testId?: string;
};

export const hasMeaningfulGameHomeProgress = (progress: GameHomeProgressLike): boolean =>
  (progress?.totalXp ?? 0) > 0 ||
  (progress?.gamesPlayed ?? 0) > 0 ||
  (progress?.lessonsCompleted ?? 0) > 0 ||
  (progress?.dailyQuestsCompleted ?? 0) > 0;

export const resolveKangurGameHomeVisibility = ({
  canAccessParentAssignments,
  progress,
  user,
}: {
  canAccessParentAssignments: boolean;
  progress: GameHomeProgressLike;
  user: KangurUser | null | undefined;
}): KangurGameHomeVisibility => {
  const hideLearnerWidgetsForParent = user?.actorType === 'parent' && !user?.activeLearner?.id;
  const hasMeaningfulProgress = hasMeaningfulGameHomeProgress(progress);

  return {
    canAccessParentAssignments,
    hasMeaningfulProgress,
    hideLearnerWidgetsForParent,
    showAssignments: canAccessParentAssignments,
    showParentSpotlight: canAccessParentAssignments,
    showProgressGrid: !hideLearnerWidgetsForParent,
    showQuest: !hideLearnerWidgetsForParent,
    showSummary: !hideLearnerWidgetsForParent && hasMeaningfulProgress,
  };
};

export function KangurGameHomeSections({
  actionsColumn,
  actionsColumnProps,
  assignments,
  assignmentsSectionProps,
  leaderboard,
  leaderboardColumnProps,
  parentSpotlight,
  parentSpotlightSectionProps,
  playerProgress,
  playerProgressColumnProps,
  progressSectionProps,
  quest,
  questSectionProps,
  summary,
  summarySectionProps,
  visibility,
}: {
  actionsColumn: ReactNode;
  actionsColumnProps?: ColumnSlotProps;
  assignments?: ReactNode;
  assignmentsSectionProps?: SectionSlotProps;
  leaderboard?: ReactNode;
  leaderboardColumnProps?: ColumnSlotProps;
  parentSpotlight?: ReactNode;
  parentSpotlightSectionProps?: SectionSlotProps;
  playerProgress?: ReactNode;
  playerProgressColumnProps?: ColumnSlotProps;
  progressSectionProps?: SectionSlotProps;
  quest?: ReactNode;
  questSectionProps?: SectionSlotProps;
  summary?: ReactNode;
  summarySectionProps?: SectionSlotProps;
  visibility: KangurGameHomeVisibility;
}): React.JSX.Element {
  const shouldRenderProgressGrid =
    visibility.showProgressGrid && (leaderboard !== undefined || playerProgress !== undefined);

  return (
    <>
      {visibility.showParentSpotlight && parentSpotlight ? (
        <section
          className={GAME_HOME_SECTION_CLASSNAME}
          data-testid={parentSpotlightSectionProps?.testId}
          id={parentSpotlightSectionProps?.id}
          ref={parentSpotlightSectionProps?.ref}
          aria-labelledby={parentSpotlightSectionProps?.headingId}
        >
          {parentSpotlightSectionProps?.headingId && parentSpotlightSectionProps.headingLabel ? (
            <h3 id={parentSpotlightSectionProps.headingId} className='sr-only'>
              {parentSpotlightSectionProps.headingLabel}
            </h3>
          ) : null}
          {parentSpotlight}
        </section>
      ) : null}

      <div
        className={GAME_HOME_ACTIONS_COLUMN_CLASSNAME}
        data-testid={actionsColumnProps?.testId}
        id={actionsColumnProps?.id}
        ref={actionsColumnProps?.ref}
      >
        {actionsColumn}
      </div>

      {visibility.showQuest && quest ? (
        <section
          className={GAME_HOME_CENTERED_SECTION_CLASSNAME}
          data-testid={questSectionProps?.testId}
          id={questSectionProps?.id}
          ref={questSectionProps?.ref}
          aria-labelledby={questSectionProps?.headingId}
        >
          {questSectionProps?.headingId && questSectionProps.headingLabel ? (
            <h3 id={questSectionProps.headingId} className='sr-only'>
              {questSectionProps.headingLabel}
            </h3>
          ) : null}
          {quest}
        </section>
      ) : null}

      {visibility.showSummary && summary ? (
        <section
          className={GAME_HOME_SECTION_CLASSNAME}
          data-testid={summarySectionProps?.testId}
          id={summarySectionProps?.id}
          ref={summarySectionProps?.ref}
          aria-labelledby={summarySectionProps?.headingId}
        >
          {summarySectionProps?.headingId && summarySectionProps.headingLabel ? (
            <h3 id={summarySectionProps.headingId} className='sr-only'>
              {summarySectionProps.headingLabel}
            </h3>
          ) : null}
          {summary}
        </section>
      ) : null}

      {visibility.showAssignments && assignments ? (
        <section
          className={GAME_HOME_CENTERED_SECTION_CLASSNAME}
          data-testid={assignmentsSectionProps?.testId}
          id={assignmentsSectionProps?.id}
          ref={assignmentsSectionProps?.ref}
          aria-labelledby={assignmentsSectionProps?.headingId}
        >
          {assignmentsSectionProps?.headingId && assignmentsSectionProps.headingLabel ? (
            <h3 id={assignmentsSectionProps.headingId} className='sr-only'>
              {assignmentsSectionProps.headingLabel}
            </h3>
          ) : null}
          {assignments}
        </section>
      ) : null}

      {shouldRenderProgressGrid ? (
        <section
          className={GAME_HOME_PROGRESS_GRID_CLASSNAME}
          data-testid={progressSectionProps?.testId}
          id={progressSectionProps?.id}
          ref={progressSectionProps?.ref}
          aria-labelledby={progressSectionProps?.headingId}
        >
          {progressSectionProps?.headingId && progressSectionProps.headingLabel ? (
            <h3 id={progressSectionProps.headingId} className='sr-only'>
              {progressSectionProps.headingLabel}
            </h3>
          ) : null}
          <div
            className={GAME_HOME_LEADERBOARD_COLUMN_CLASSNAME}
            data-testid={leaderboardColumnProps?.testId}
            id={leaderboardColumnProps?.id}
            ref={leaderboardColumnProps?.ref}
          >
            {leaderboard}
          </div>
          <div
            className={GAME_HOME_PLAYER_PROGRESS_COLUMN_CLASSNAME}
            data-testid={playerProgressColumnProps?.testId}
            id={playerProgressColumnProps?.id}
            ref={playerProgressColumnProps?.ref}
          >
            {playerProgress}
          </div>
        </section>
      ) : null}
    </>
  );
}
