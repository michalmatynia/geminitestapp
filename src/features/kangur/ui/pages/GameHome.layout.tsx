import type { ReactNode, RefObject } from 'react';

import {
  GAME_HOME_ACTIONS_COLUMN_CLASSNAME,
  GAME_HOME_CENTERED_SECTION_CLASSNAME,
  GAME_HOME_LEADERBOARD_COLUMN_CLASSNAME,
  GAME_HOME_PLAYER_PROGRESS_COLUMN_CLASSNAME,
  GAME_HOME_PROGRESS_GRID_CLASSNAME,
  GAME_HOME_SECTION_CLASSNAME,
} from '@/features/kangur/ui/pages/GameHome.constants';
export {
  hasMeaningfulGameHomeProgress,
  resolveKangurGameHomeVisibility,
  type KangurGameHomeVisibility,
} from '@/features/kangur/ui/pages/GameHome.visibility';
import type { KangurGameHomeVisibility } from '@/features/kangur/ui/pages/GameHome.visibility';

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

export type KangurGameHomeSectionsProps = {
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
};

function GameHomeSectionHeading(props: {
  slotProps?: SectionSlotProps;
}): React.JSX.Element | null {
  const { slotProps } = props;

  if (!slotProps?.headingId || !slotProps.headingLabel) {
    return null;
  }

  return (
    <h3 id={slotProps.headingId} className='sr-only'>
      {slotProps.headingLabel}
    </h3>
  );
}

function GameHomeSectionSlot(props: {
  children?: ReactNode;
  className: string;
  enabled: boolean;
  slotProps?: SectionSlotProps;
}): React.JSX.Element | null {
  const { children, className, enabled, slotProps } = props;

  if (!enabled || children == null) {
    return null;
  }

  return (
    <section
      className={className}
      data-testid={slotProps?.testId}
      id={slotProps?.id}
      ref={slotProps?.ref}
      aria-labelledby={slotProps?.headingId}
    >
      <GameHomeSectionHeading slotProps={slotProps} />
      {children}
    </section>
  );
}

function GameHomeColumnSlot(props: {
  children?: ReactNode;
  className: string;
  slotProps?: ColumnSlotProps;
}): React.JSX.Element {
  const { children, className, slotProps } = props;

  return (
    <div
      className={className}
      data-testid={slotProps?.testId}
      id={slotProps?.id}
      ref={slotProps?.ref}
    >
      {children}
    </div>
  );
}

const resolveShouldRenderGameHomeProgressGrid = ({
  leaderboard,
  playerProgress,
  visibility,
}: {
  leaderboard: ReactNode;
  playerProgress: ReactNode;
  visibility: KangurGameHomeVisibility;
}): boolean =>
  visibility.showProgressGrid && (leaderboard !== undefined || playerProgress !== undefined);

function GameHomeProgressGrid(props: {
  enabled: boolean;
  leaderboard?: ReactNode;
  leaderboardColumnProps?: ColumnSlotProps;
  playerProgress?: ReactNode;
  playerProgressColumnProps?: ColumnSlotProps;
  progressSectionProps?: SectionSlotProps;
}): React.JSX.Element | null {
  const {
    enabled,
    leaderboard,
    leaderboardColumnProps,
    playerProgress,
    playerProgressColumnProps,
    progressSectionProps,
  } = props;

  if (!enabled) {
    return null;
  }

  return (
    <section
      className={GAME_HOME_PROGRESS_GRID_CLASSNAME}
      data-testid={progressSectionProps?.testId}
      id={progressSectionProps?.id}
      ref={progressSectionProps?.ref}
      aria-labelledby={progressSectionProps?.headingId}
    >
      <GameHomeSectionHeading slotProps={progressSectionProps} />
      <GameHomeColumnSlot
        className={GAME_HOME_LEADERBOARD_COLUMN_CLASSNAME}
        slotProps={leaderboardColumnProps}
      >
        {leaderboard}
      </GameHomeColumnSlot>
      <GameHomeColumnSlot
        className={GAME_HOME_PLAYER_PROGRESS_COLUMN_CLASSNAME}
        slotProps={playerProgressColumnProps}
      >
        {playerProgress}
      </GameHomeColumnSlot>
    </section>
  );
}

export function KangurGameHomeSections(
  props: KangurGameHomeSectionsProps
): React.JSX.Element {
  const {
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
  } = props;

  return (
    <>
      <GameHomeSectionSlot
        className={GAME_HOME_SECTION_CLASSNAME}
        enabled={visibility.showParentSpotlight}
        slotProps={parentSpotlightSectionProps}
      >
        {parentSpotlight}
      </GameHomeSectionSlot>

      <GameHomeColumnSlot className={GAME_HOME_ACTIONS_COLUMN_CLASSNAME} slotProps={actionsColumnProps}>
        {actionsColumn}
      </GameHomeColumnSlot>

      <GameHomeSectionSlot
        className={GAME_HOME_CENTERED_SECTION_CLASSNAME}
        enabled={visibility.showQuest}
        slotProps={questSectionProps}
      >
        {quest}
      </GameHomeSectionSlot>

      <GameHomeSectionSlot
        className={GAME_HOME_SECTION_CLASSNAME}
        enabled={visibility.showSummary}
        slotProps={summarySectionProps}
      >
        {summary}
      </GameHomeSectionSlot>

      <GameHomeSectionSlot
        className={GAME_HOME_CENTERED_SECTION_CLASSNAME}
        enabled={visibility.showAssignments}
        slotProps={assignmentsSectionProps}
      >
        {assignments}
      </GameHomeSectionSlot>

      <GameHomeProgressGrid
        enabled={resolveShouldRenderGameHomeProgressGrid({
          leaderboard,
          playerProgress,
          visibility,
        })}
        leaderboard={leaderboard}
        leaderboardColumnProps={leaderboardColumnProps}
        playerProgress={playerProgress}
        playerProgressColumnProps={playerProgressColumnProps}
        progressSectionProps={progressSectionProps}
      />
    </>
  );
}
