'use client';

import React, { createContext, useContext, useMemo, useCallback } from 'react';
import type { DropResult } from '@hello-pangea/dnd';
import { useCalendarInteractiveGameState } from './CalendarInteractiveGame.hooks';
import type {
  CalendarInteractiveGameProps,
  Season,
} from './CalendarInteractiveGame.types';
import type { KangurIntlTranslate } from '@/features/kangur/ui/types';
import {
  getCalendarCells,
  getCalendarInteractiveMonthName,
  resolveSeasonFromDroppableId,
} from './CalendarInteractiveGame.utils';
import { getDayOfWeek } from './CalendarInteractiveGame.utils';

const markCalendarInteractiveSuccess = ({
  setFeedback,
  setScore,
}: {
  setFeedback: (value: 'success' | 'error') => void;
  setScore: React.Dispatch<React.SetStateAction<number>>;
}): void => {
  setFeedback('success');
  setScore((current) => current + 1);
};

const markCalendarInteractiveError = (
  setFeedback: (value: 'success' | 'error') => void
): void => {
  setFeedback('error');
};

const handleCalendarInteractiveDateSelection = ({
  day,
  targetDay,
  setFeedback,
  setScore,
}: {
  day: number;
  setFeedback: (value: 'success' | 'error') => void;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  targetDay: number;
}): void => {
  if (day === targetDay) {
    markCalendarInteractiveSuccess({ setFeedback, setScore });
    return;
  }

  markCalendarInteractiveError(setFeedback);
};

const handleCalendarInteractiveWeekendSelection = ({
  checkedAllWeekends,
  day,
  month,
  setCheckedAllWeekends,
  setFeedback,
  setScore,
  targetCount,
  weekendDayIndex,
  year,
}: {
  checkedAllWeekends: number[];
  day: number;
  month: number;
  setCheckedAllWeekends: React.Dispatch<React.SetStateAction<number[]>>;
  setFeedback: (value: 'success' | 'error') => void;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  targetCount: number;
  weekendDayIndex: 5 | 6;
  year: number;
}): void => {
  if (getDayOfWeek(year, month, day) !== weekendDayIndex) {
    markCalendarInteractiveError(setFeedback);
    return;
  }
  if (checkedAllWeekends.includes(day)) {
    return;
  }

  const nextChecked = [...checkedAllWeekends, day];
  setCheckedAllWeekends(nextChecked);
  if (nextChecked.length === targetCount) {
    markCalendarInteractiveSuccess({ setFeedback, setScore });
  }
};

const handleCalendarInteractiveSeasonDrop = ({
  correctSeason,
  droppableId,
  setFeedback,
  setScore,
}: {
  correctSeason: Season;
  droppableId: string;
  setFeedback: (value: 'success' | 'error') => void;
  setScore: React.Dispatch<React.SetStateAction<number>>;
}): void => {
  const droppedSeason = resolveSeasonFromDroppableId(droppableId);
  if (droppedSeason === correctSeason) {
    markCalendarInteractiveSuccess({ setFeedback, setScore });
    return;
  }

  markCalendarInteractiveError(setFeedback);
};

const handleCalendarInteractiveMonthFlip = ({
  month,
  delta,
  setMonth,
  setFeedback,
  setScore,
  targetMonth,
}: {
  delta: number;
  month: number;
  setFeedback: (value: 'success' | 'error') => void;
  setMonth: React.Dispatch<React.SetStateAction<number>>;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  targetMonth: number;
}): void => {
  const nextMonth = (month + delta + 12) % 12;
  setMonth(nextMonth);

  if (nextMonth === targetMonth) {
    markCalendarInteractiveSuccess({ setFeedback, setScore });
  }
};

const handleCalendarInteractiveWeekdaySelection = ({
  idx,
  setFeedback,
  setScore,
  targetIdx,
}: {
  idx: number;
  setFeedback: (value: 'success' | 'error') => void;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  targetIdx: number;
}): void => {
  if (idx === targetIdx) {
    markCalendarInteractiveSuccess({ setFeedback, setScore });
    return;
  }

  markCalendarInteractiveError(setFeedback);
};

const handleCalendarInteractiveSeasonSelection = ({
  correctSeason,
  seasonId,
  setFeedback,
  setScore,
}: {
  correctSeason: Season;
  seasonId: Season;
  setFeedback: (value: 'success' | 'error') => void;
  setScore: React.Dispatch<React.SetStateAction<number>>;
}): void => {
  if (seasonId === correctSeason) {
    markCalendarInteractiveSuccess({ setFeedback, setScore });
    return;
  }

  markCalendarInteractiveError(setFeedback);
};

const resolveCalendarInteractiveGuidance = ({
  section,
  translations,
}: {
  section: string;
  translations: KangurIntlTranslate;
}): { prompt: string | null; title: string | null } =>
  section === 'mixed'
    ? { prompt: null, title: null }
    : {
        prompt: translations(`calendarInteractive.section.${section}.promptLabel`),
        title: translations(`calendarInteractive.section.${section}.guidanceTitle`),
      };

type CalendarInteractiveState = ReturnType<typeof useCalendarInteractiveGameState> & {
  guidancePrompt: string | null;
  guidanceTitle: string | null;
  cells: Array<number | null>;
  monthName: string;
  onFinish?: () => void;
  stage?: { onFinish: () => void };
  handleCellClick: (day: number | null) => void;
  handleDragEnd: (result: DropResult) => void;
  handleMonthChange: (delta: number) => void;
  handleSeasonSelect: (seasonId: Season) => void;
  handleWeekdayClick: (idx: number) => void;
};

const CalendarInteractiveContext = createContext<CalendarInteractiveState | null>(null);

export function CalendarInteractiveProvider({
  children,
  ...props
}: CalendarInteractiveGameProps & { children: React.ReactNode }) {
  const state = useCalendarInteractiveGameState(props);
  const {
    translations,
    month,
    setMonth,
    year,
    task,
    feedback,
    setFeedback,
    setScore,
    checkedAllWeekends,
    setCheckedAllWeekends,
    section,
  } = state;

  const { prompt: guidancePrompt, title: guidanceTitle } = useMemo(
    () => resolveCalendarInteractiveGuidance({ section, translations }),
    [section, translations]
  );
  const cells = useMemo(() => getCalendarCells(month, year), [month, year]);
  const monthName = useMemo(() => getCalendarInteractiveMonthName(translations, month), [translations, month]);

  const handleCellClick = useCallback((day: number | null): void => {
    if (day === null || feedback !== null) {
      return;
    }
    if (task.type === 'click_date') {
      handleCalendarInteractiveDateSelection({
        day,
        setFeedback,
        setScore,
        targetDay: task.targetDay,
      });
      return;
    }
    if (task.type === 'click_all_weekends') {
      handleCalendarInteractiveWeekendSelection({
        checkedAllWeekends,
        day,
        month,
        setCheckedAllWeekends,
        setFeedback,
        setScore,
        targetCount: task.targets.length,
        weekendDayIndex: task.dayIdx,
        year,
      });
    }
  }, [feedback, task, setFeedback, setScore, checkedAllWeekends, month, setCheckedAllWeekends, year]);

  const handleDragEnd = useCallback((result: DropResult): void => {
    if (feedback !== null || !result.destination || task.type !== 'drag_season') {
      return;
    }

    handleCalendarInteractiveSeasonDrop({
      correctSeason: task.correctSeason,
      droppableId: result.destination.droppableId,
      setFeedback,
      setScore,
    });
  }, [feedback, task, setFeedback, setScore]);

  const handleMonthChange = useCallback((delta: number): void => {
    if (feedback !== null) {
      return;
    }

    if (task.type === 'flip_month') {
      handleCalendarInteractiveMonthFlip({
        month,
        delta,
        setFeedback,
        setMonth,
        setScore,
        targetMonth: task.targetMonth,
      });
      return;
    }

    setMonth((current) => (current + delta + 12) % 12);
  }, [feedback, task, month, setFeedback, setMonth, setScore]);

  const handleWeekdayClick = useCallback((idx: number): void => {
    if (feedback !== null || task.type !== 'click_weekday_name') {
      return;
    }

    handleCalendarInteractiveWeekdaySelection({
      idx,
      setFeedback,
      setScore,
      targetIdx: task.targetIdx,
    });
  }, [feedback, task, setFeedback, setScore]);

  const handleSeasonSelect = useCallback((seasonId: Season): void => {
    if (feedback !== null || task.type !== 'drag_season') {
      return;
    }

    handleCalendarInteractiveSeasonSelection({
      correctSeason: task.correctSeason,
      seasonId,
      setFeedback,
      setScore,
    });
  }, [feedback, task, setFeedback, setScore]);

  const contextValue = useMemo(() => ({
    ...state,
    guidancePrompt,
    guidanceTitle,
    cells,
    monthName,
    onFinish: props.onFinish,
    stage: props.stage,
    handleCellClick,
    handleDragEnd,
    handleMonthChange,
    handleSeasonSelect,
    handleWeekdayClick,
  }), [
    state,
    guidancePrompt,
    guidanceTitle,
    cells,
    monthName,
    props.onFinish,
    props.stage,
    handleCellClick,
    handleDragEnd,
    handleMonthChange,
    handleSeasonSelect,
    handleWeekdayClick,
  ]);

  return (
    <CalendarInteractiveContext.Provider value={contextValue}>
      {children}
    </CalendarInteractiveContext.Provider>
  );
}

import { internalError } from '@/shared/errors/app-error';

export function useCalendarInteractiveContext() {
  const context = useContext(CalendarInteractiveContext);
  if (!context) {
    throw internalError('useCalendarInteractiveContext must be used within a CalendarInteractiveProvider');
  }
  return context;
}
