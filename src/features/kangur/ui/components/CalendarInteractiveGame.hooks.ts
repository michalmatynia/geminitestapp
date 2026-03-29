'use client';

import { useCallback, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useKangurProgressOwnerKey } from '@/features/kangur/ui/hooks/useKangurProgressOwnerKey';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import {
  addXp,
  createLessonPracticeReward,
  loadProgress,
} from '@/features/kangur/ui/services/progress';
import { persistKangurSessionScore } from '@/features/kangur/ui/services/session-score';
import type {
  KangurMiniGameBinaryFeedbackState,
  KangurRewardBreakdownEntry,
} from '@/features/kangur/ui/types';
import type {
  CalendarInteractiveGameProps,
  Task,
} from './CalendarInteractiveGame.types';
import {
  getCalendarInteractiveSectionContent,
  generateTask,
} from './CalendarInteractiveGame.utils';

const TOTAL_ROUNDS = 10;

export function useCalendarInteractiveGameState(props: CalendarInteractiveGameProps) {
  const ownerKey = useKangurProgressOwnerKey();
  const translations = useTranslations('KangurMiniGames');
  const isCoarsePointer = useKangurCoarsePointer();

  const [roundIndex, setRoundIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [year] = useState(() => new Date().getFullYear());
  const [task, setTask] = useState<Task>(() =>
    generateTask(month, year, translations, props.calendarSection ?? props.section ?? props.stage?.section ?? 'mixed')
  );
  const [feedback, setFeedback] = useState<KangurMiniGameBinaryFeedbackState>(null);
  const [done, setDone] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [xpBreakdown, setXpBreakdown] = useState<KangurRewardBreakdownEntry[]>([]);
  const [checkedAllWeekends, setCheckedAllWeekends] = useState<number[]>([]);
  const sessionStartedAtRef = useRef(Date.now());

  const section = props.calendarSection ?? props.section ?? props.stage?.section ?? 'mixed';
  const sectionContent = getCalendarInteractiveSectionContent(section);

  const handleNext = useCallback(() => {
    if (roundIndex + 1 >= TOTAL_ROUNDS) {
      const finalScore = score;
      const progress = loadProgress({ ownerKey });
      const reward = createLessonPracticeReward(progress, 'calendar', finalScore, TOTAL_ROUNDS);
      addXp(reward.xp, reward.progressUpdates, { ownerKey });
      void persistKangurSessionScore({
        operation: 'calendar',
        score: finalScore,
        totalQuestions: TOTAL_ROUNDS,
        correctAnswers: finalScore,
        timeTakenSeconds: Math.round((Date.now() - sessionStartedAtRef.current) / 1000),
        xpEarned: reward.xp,
      });
      setXpEarned(reward.xp);
      setXpBreakdown(reward.breakdown ?? []);
      setDone(true);
      return;
    }

    const nextIdx = roundIndex + 1;
    const nextMonth = Math.floor(Math.random() * 12);
    setRoundIndex(nextIdx);
    setMonth(nextMonth);
    setTask(generateTask(nextMonth, year, translations, section));
    setFeedback(null);
    setCheckedAllWeekends([]);
  }, [month, ownerKey, roundIndex, score, section, translations, year]);

  const handleRestart = useCallback(() => {
    setRoundIndex(0);
    setScore(0);
    const initialMonth = new Date().getMonth();
    setMonth(initialMonth);
    setTask(generateTask(initialMonth, year, translations, section));
    setFeedback(null);
    setDone(false);
    setXpEarned(0);
    setXpBreakdown([]);
    setCheckedAllWeekends([]);
    sessionStartedAtRef.current = Date.now();
  }, [section, translations, year]);

  return {
    translations,
    isCoarsePointer,
    roundIndex,
    score,
    setScore,
    month,
    setMonth,
    year,
    task,
    setTask,
    feedback,
    setFeedback,
    done,
    xpEarned,
    xpBreakdown,
    checkedAllWeekends,
    setCheckedAllWeekends,
    section,
    sectionContent,
    handleNext,
    handleRestart,
    TOTAL_ROUNDS,
  };
}
