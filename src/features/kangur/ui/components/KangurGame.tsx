'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CheckCircle, Printer, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { KangurAnswerChoiceBadge } from '@/features/kangur/ui/components/KangurAnswerChoiceBadge';
import KangurAnswerChoiceCard from '@/features/kangur/ui/components/KangurAnswerChoiceCard';
import KangurExam from '@/features/kangur/ui/components/KangurExam';
import {
  Q1Illustration,
  Q2Illustration,
  Q3Illustration,
  Q4Illustration,
  Q5Illustration,
  Q6Illustration,
  Q7Illustration,
  Q8Illustration,
  Q9Illustration,
  Q10Illustration,
  Q11Illustration,
  Q15Illustration,
  Q16Illustration,
} from '@/features/kangur/ui/components/KangurIllustrations';
import {
  KangurPracticeGameSummary,
  KangurPracticeGameSummaryActions,
  KangurPracticeGameSummaryBreakdown,
  KangurPracticeGameSummaryEmoji,
  KangurPracticeGameSummaryMessage,
  KangurPracticeGameSummaryProgress,
  KangurPracticeGameSummaryTitle,
  KangurPracticeGameSummaryXP,
} from '@/features/kangur/ui/components/KangurPracticeGameChrome';
import {
  getKangurMiniGameAccuracyText,
  getKangurMiniGameScoreLabel,
} from '@/features/kangur/ui/constants/mini-game-i18n';
import { useKangurGameContext } from '@/features/kangur/ui/context/KangurGameContext';
import { useOptionalKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';
import { useOptionalKangurLessonPrint } from '@/features/kangur/ui/context/KangurLessonPrintContext';
import {
  KangurButton,
  KangurGlassPanel,
  KangurInfoCard,
  KangurProgressBar,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_ACCENT_STYLES,
  KANGUR_CENTER_ROW_CLASSNAME,
  KANGUR_PANEL_GAP_CLASSNAME,
  KANGUR_STACK_TIGHT_CLASSNAME,
  type KangurAccent,
} from '@/features/kangur/ui/design/tokens';
import { useKangurSubjectFocus } from '@/features/kangur/ui/context/KangurSubjectFocusContext';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { createKangurPageTransitionMotionProps } from '@/features/kangur/ui/motion/page-transition';
import { getKangurQuestions, isExamMode } from '@/features/kangur/ui/services/kangur-questions';
import {
  addXp,
  createGameSessionReward,
  loadProgress,
} from '@/features/kangur/ui/services/progress';
import type {
  KangurExamQuestion,
  KangurQuestionChoice,
  KangurRewardBreakdownEntry,
} from '@/features/kangur/ui/types';
import { cn } from '@/features/kangur/shared/utils';

type IllustrationComponent = () => React.JSX.Element;

type QuestionViewProps = {
  q: KangurExamQuestion;
  qIndex: number;
  total: number;
  onAnswer: (correct: boolean) => void;
};

type ResultViewProps = {
  rewardBreakdown?: KangurRewardBreakdownEntry[];
  xpEarned?: number;
  score: number;
  total: number;
  onRestart: () => void;
};

type KangurQuestionTier = {
  difficulty: 'easy' | 'medium' | 'hard';
  points: 3 | 4 | 5;
};

const ILLUSTRATIONS: Record<string, IllustrationComponent | undefined> = {
  '2024_1': Q1Illustration,
  '2024_2': Q2Illustration,
  '2024_3': Q3Illustration,
  '2024_4': Q4Illustration,
  '2024_5': Q5Illustration,
  '2024_6': Q6Illustration,
  '2024_7': Q7Illustration,
  '2024_8': Q8Illustration,
  '2024_4pt_9': Q9Illustration,
  '2024_4pt_10': Q10Illustration,
  '2024_4pt_11': Q11Illustration,
  '2024_4pt_15': Q15Illustration,
  '2024_4pt_16': Q16Illustration,
};

const resolveKangurQuestionTier = (questionId: string): KangurQuestionTier | null => {
  if (!/^\d{4}_/.test(questionId)) {
    return null;
  }

  if (questionId.includes('_5pt_')) {
    return { points: 5, difficulty: 'hard' };
  }

  if (questionId.includes('_4pt_')) {
    return { points: 4, difficulty: 'medium' };
  }

  return { points: 3, difficulty: 'easy' };
};

function QuestionView({ q, qIndex, total, onAnswer }: QuestionViewProps): React.JSX.Element {
  const translations = useTranslations('KangurGamePage');
  const lessonNavigationTranslations = useTranslations('KangurLessonsWidgets.navigation');
  const isCoarsePointer = useKangurCoarsePointer();
  const lessonPrint = useOptionalKangurLessonPrint();
  const [selected, setSelected] = useState<KangurQuestionChoice | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const choices = q.choices ?? [];
  const questionNumber = qIndex + 1;
  const progressValue = (qIndex / total) * 100;
  const pointTier = resolveKangurQuestionTier(q.id);
  const printPanelLabel = lessonNavigationTranslations('printPanel');
  const printPanelId = `kangur-game-question-${q.id}`;
  const printPanelTitle = translations('practiceQuestion.label', { number: questionNumber });

  const handleSelect = (choice: KangurQuestionChoice): void => {
    if (confirmed) {
      return;
    }
    setSelected(choice);
  };

  const handleConfirm = (): void => {
    if (selected === null || confirmed) {
      return;
    }
    setConfirmed(true);
    const correct = selected === q.answer;
    setTimeout(() => onAnswer(correct), 1400);
  };
  const handleChoiceConfirm = (choice: KangurQuestionChoice): void => {
    handleSelect(choice);
  };

  return (
    <div
      className={`flex flex-col w-full ${KANGUR_PANEL_GAP_CLASSNAME}`}
      data-kangur-print-panel='true'
      data-kangur-print-panel-id={printPanelId}
      data-kangur-print-panel-title={printPanelTitle}
      data-testid='kangur-game-question-print-panel'
    >
      <div
        className='kangur-print-only space-y-3 border-b border-slate-200 pb-4'
        data-testid='kangur-game-print-summary'
      >
        <div className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-500'>
          {translations('practiceQuestion.label', { number: questionNumber })}
        </div>
        <p className='text-base font-semibold leading-relaxed text-slate-900'>{q.question}</p>
        <ol className='space-y-2 text-sm text-slate-700'>
          {choices.map((choice, index) => (
            <li
              key={`print-${String(choice)}-${index}`}
              className='rounded-lg border border-slate-300 px-4 py-2'
              data-testid={`kangur-game-print-choice-${index}`}
            >
              <span className='font-semibold text-slate-500'>{String.fromCharCode(65 + index)}.</span>{' '}
              {choice}
            </li>
          ))}
        </ol>
        <p className='text-sm text-slate-600'>{translations('practiceQuestion.printHint')}</p>
      </div>

      <div data-kangur-print-exclude='true' data-testid='kangur-game-live-question-ui'>
        <div className={KANGUR_CENTER_ROW_CLASSNAME}>
          <KangurProgressBar
            accent='amber'
            className='flex-1'
            data-testid='kangur-game-progress-bar'
            size='sm'
            value={progressValue}
          />
          {lessonPrint?.onPrintPanel ? (
            <KangurButton
              onClick={() => lessonPrint.onPrintPanel?.(printPanelId)}
              className={cn(
                'justify-center px-4 shadow-sm [border-color:var(--kangur-soft-card-border)]',
                isCoarsePointer && 'min-h-11 touch-manipulation select-none active:scale-[0.97]'
              )}
              data-testid='kangur-game-print-button'
              size='sm'
              type='button'
              variant='surface'
              aria-label={printPanelLabel}
              title={printPanelLabel}
            >
              <Printer className='h-4 w-4 flex-shrink-0' aria-hidden='true' />
              <span className='sr-only'>{printPanelLabel}</span>
            </KangurButton>
          ) : null}
          <span className='text-xs font-bold [color:var(--kangur-page-muted-text)]'>
            {questionNumber}/{total}
          </span>
        </div>

        <KangurGlassPanel
          className='mt-6 flex flex-col kangur-panel-gap'
          data-testid='kangur-game-question-shell'
          padding='lg'
          surface='solid'
          variant='soft'
        >
          <div className='flex items-center justify-between mb-1'>
            <p className='break-words text-sm font-bold uppercase tracking-wide text-orange-500'>
              {translations('practiceQuestion.label', { number: questionNumber })}
            </p>
            {pointTier ? (
              <KangurStatusChip accent='emerald' data-testid='kangur-game-point-chip' size='sm'>
                {translations('practiceQuestion.pointChip', {
                  points: pointTier.points,
                  difficulty: translations(`practiceQuestion.difficulty.${pointTier.difficulty}`),
                })}
              </KangurStatusChip>
            ) : null}
          </div>
          <p className='break-words font-semibold leading-relaxed [color:var(--kangur-page-text)]'>
            {q.question}
          </p>
          {ILLUSTRATIONS[q.id] &&
            (() => {
              const Illustration = ILLUSTRATIONS[q.id];
              if (!Illustration) {
                return null;
              }
              return (
                <KangurInfoCard
                  accent='slate'
                  className='rounded-[22px]'
                  data-testid='kangur-game-illustration-shell'
                  padding='sm'
                  tone='muted'
                >
                  <Illustration />
                </KangurInfoCard>
              );
            })()}
        </KangurGlassPanel>

        {isCoarsePointer ? (
          <p
            className='mt-6 text-center text-xs font-semibold uppercase tracking-[0.16em] [color:var(--kangur-page-muted-text)]'
            data-testid='kangur-game-touch-hint'
          >
            {translations('practiceQuestion.touchHint')}
          </p>
        ) : null}

        <div className={`mt-6 ${KANGUR_STACK_TIGHT_CLASSNAME}`}>
          {choices.map((choice, index) => {
            let accent: KangurAccent = 'slate';
            let emphasis: 'neutral' | 'accent' = 'neutral';
            let state: 'default' | 'muted' = 'default';
            let style = '[color:var(--kangur-page-text)]';
            let badgeClassName = KANGUR_ACCENT_STYLES.slate.badge;
            if (confirmed) {
              if (choice === q.answer) {
                accent = 'emerald';
                emphasis = 'accent';
                style = KANGUR_ACCENT_STYLES.emerald.activeText;
                badgeClassName = KANGUR_ACCENT_STYLES.emerald.badge;
              } else if (choice === selected) {
                accent = 'rose';
                emphasis = 'accent';
                style = KANGUR_ACCENT_STYLES.rose.activeText;
                badgeClassName = KANGUR_ACCENT_STYLES.rose.badge;
              } else {
                state = 'muted';
                style = '';
                badgeClassName = KANGUR_ACCENT_STYLES.slate.badge;
              }
            } else if (choice === selected) {
              accent = 'amber';
              emphasis = 'accent';
              style = KANGUR_ACCENT_STYLES.amber.activeText;
              badgeClassName = KANGUR_ACCENT_STYLES.amber.badge;
            }

            return (
              <KangurAnswerChoiceCard
                accent={accent}
                buttonClassName={cn(
                  'flex items-center kangur-panel-gap px-4 py-3 font-semibold touch-manipulation select-none',
                  isCoarsePointer && 'min-h-[4.25rem] active:scale-[0.98]',
                  style,
                  confirmed ? 'cursor-default' : 'cursor-pointer'
                )}
                data-testid={`kangur-game-choice-${index}`}
                emphasis={emphasis}
                hoverScale={1.02}
                interactive={!confirmed}
                key={`${String(choice)}-${index}`}
                onClick={() => handleChoiceConfirm(choice)}
                state={state}
                tapScale={0.98}
                type='button'
              >
                <KangurAnswerChoiceBadge className={badgeClassName}>
                  {String.fromCharCode(65 + index)}
                </KangurAnswerChoiceBadge>
                <span className='min-w-0 flex-1 break-words'>{choice}</span>
                {confirmed && choice === q.answer && (
                  <>
                    <CheckCircle
                      aria-hidden='true'
                      className='w-4 h-4 text-green-600 ml-auto flex-shrink-0'
                    />
                    <span className='sr-only'>
                      {translations('practiceQuestion.answerState.correct')}
                    </span>
                  </>
                )}
                {confirmed && choice === selected && choice !== q.answer && (
                  <>
                    <XCircle
                      aria-hidden='true'
                      className='w-4 h-4 text-red-500 ml-auto flex-shrink-0'
                    />
                    <span className='sr-only'>
                      {translations('practiceQuestion.answerState.incorrect')}
                    </span>
                  </>
                )}
              </KangurAnswerChoiceCard>
            );
          })}
        </div>

        {confirmed && q.explanation && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <KangurInfoCard
              accent='sky'
              className='rounded-[22px] text-sm break-words'
              data-testid='kangur-game-explanation'
              padding='sm'
              tone='accent'
            >
              💡 {q.explanation}
            </KangurInfoCard>
          </motion.div>
        )}

        {!confirmed && (
          <KangurButton
            className={cn(
              'mt-6 w-full touch-manipulation select-none',
              isCoarsePointer && 'min-h-12 active:scale-[0.98]'
            )}
            disabled={selected === null}
            onClick={handleConfirm}
            size='lg'
            variant='primary'
          >
            {translations('practiceQuestion.confirm')}
          </KangurButton>
        )}
      </div>
    </div>
  );
}

function ResultView({
  rewardBreakdown = [],
  xpEarned = 0,
  score,
  total,
  onRestart,
}: ResultViewProps): React.JSX.Element {
  const translations = useTranslations('KangurMiniGames');
  const lessonNavigationTranslations = useTranslations('KangurLessonsWidgets.navigation');
  const { onBack } = useKangurGameContext();
  const lessonPrint = useOptionalKangurLessonPrint();
  const isCoarsePointer = useKangurCoarsePointer();
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const emoji = pct === 100 ? '🏆' : pct >= 70 ? '🌟' : pct >= 40 ? '👍' : '💪';
  const summaryBreakdown = rewardBreakdown;
  const summaryTitle = getKangurMiniGameScoreLabel(translations, score, total);
  const summaryXpEarned = xpEarned;
  const accuracyText = getKangurMiniGameAccuracyText(translations, pct);
  const printPanelLabel = lessonNavigationTranslations('printPanel');
  const printPanelId = 'kangur-game-result';
  const printPanelTitle = summaryTitle;
  const handleRestart = (): void => {
    onRestart();
  };

  return (
    <div
      className={`w-full flex flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}
      data-kangur-print-panel='true'
      data-kangur-print-panel-id={printPanelId}
      data-kangur-print-panel-title={printPanelTitle}
      data-testid='kangur-game-result-print-panel'
    >
      <div
        className='kangur-print-only space-y-3 border-b border-slate-200 pb-4'
        data-testid='kangur-game-result-print-summary'
      >
        <div className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-500'>
          {summaryTitle}
        </div>
        <p className='text-base font-semibold leading-relaxed text-slate-900'>{accuracyText}</p>
        <p className='text-sm text-slate-600'>
          {pct === 100
            ? translations('kangurGame.summary.perfect')
            : pct >= 70
              ? translations('kangurGame.summary.good')
              : pct >= 40
                ? translations('kangurGame.summary.fair')
                : translations('kangurGame.summary.retry')}
        </p>
      </div>
      <div data-kangur-print-exclude='true'>
        {lessonPrint?.onPrintPanel ? (
          <div className='mb-3 flex justify-end'>
            <KangurButton
              onClick={() => lessonPrint.onPrintPanel?.(printPanelId)}
              className={cn(
                'justify-center px-4 shadow-sm [border-color:var(--kangur-soft-card-border)]',
                isCoarsePointer && 'min-h-11 touch-manipulation select-none active:scale-[0.97]'
              )}
              data-testid='kangur-game-print-button'
              size='sm'
              type='button'
              variant='surface'
              aria-label={printPanelLabel}
              title={printPanelLabel}
            >
              <Printer className='h-4 w-4 flex-shrink-0' aria-hidden='true' />
              <span className='sr-only'>{printPanelLabel}</span>
            </KangurButton>
          </div>
        ) : null}
        <KangurPracticeGameSummary dataTestId='kangur-game-summary-shell'>
          <KangurPracticeGameSummaryEmoji dataTestId='kangur-game-summary-emoji' emoji={emoji} />
          <KangurPracticeGameSummaryTitle accent='amber' title={summaryTitle} />
          <KangurPracticeGameSummaryXP accent='indigo' xpEarned={summaryXpEarned} />
          <KangurPracticeGameSummaryBreakdown
            breakdown={summaryBreakdown}
            dataTestId='kangur-game-summary-breakdown'
            itemDataTestIdPrefix='kangur-game-summary-breakdown'
          />
          <KangurPracticeGameSummaryProgress
            accent='amber'
            dataTestId='kangur-game-summary-progress-bar'
            percent={pct}
          />
          <p className='break-words text-sm [color:var(--kangur-page-muted-text)]'>{accuracyText}</p>
          <KangurPracticeGameSummaryMessage>
            {pct === 100
              ? translations('kangurGame.summary.perfect')
              : pct >= 70
                ? translations('kangurGame.summary.good')
                : pct >= 40
                  ? translations('kangurGame.summary.fair')
                  : translations('kangurGame.summary.retry')}
          </KangurPracticeGameSummaryMessage>
          <KangurPracticeGameSummaryActions
            finishLabel={translations('kangurGame.actions.retry')}
            onFinish={handleRestart}
            onRestart={onBack}
            restartLabel={translations('kangurGame.actions.menu')}
          />
        </KangurPracticeGameSummary>
      </div>
    </div>
  );
}

function PracticeModeGame(): React.JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const questionMotionProps = createKangurPageTransitionMotionProps(prefersReducedMotion);
  const { mode } = useKangurGameContext();
  const { subjectKey } = useKangurSubjectFocus();
  const runtime = useOptionalKangurGameRuntime();
  const questions = getKangurQuestions(mode);
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [resultRewardXp, setResultRewardXp] = useState(0);
  const [resultRewardBreakdown, setResultRewardBreakdown] = useState<
    KangurRewardBreakdownEntry[]
  >([]);

  const handleAnswer = (correct: boolean): void => {
    const newScore = correct ? score + 1 : score;
    if (correct) {
      setScore(newScore);
    }

    if (current + 1 >= questions.length) {
      const progress = loadProgress({ ownerKey: subjectKey });
      const reward = createGameSessionReward(progress, {
        operation: mode ?? 'mixed',
        difficulty: null,
        correctAnswers: newScore,
        followsRecommendation: Boolean(runtime?.activeSessionRecommendation),
        totalQuestions: questions.length,
      });

      addXp(reward.xp, reward.progressUpdates, { ownerKey: subjectKey });
      setResultRewardXp(reward.xp);
      setResultRewardBreakdown(reward.breakdown ?? []);
      setScore(newScore);
      setFinished(true);
    } else {
      setCurrent((previous) => previous + 1);
    }
  };

  const handleRestart = (): void => {
    setCurrent(0);
    setScore(0);
    setFinished(false);
    setResultRewardXp(0);
    setResultRewardBreakdown([]);
  };

  if (finished) {
    return (
      <ResultView
        rewardBreakdown={resultRewardBreakdown}
        score={score}
        total={questions.length}
        onRestart={handleRestart}
        xpEarned={resultRewardXp}
      />
    );
  }

  const activeQuestion = questions[current];
  if (!activeQuestion) {
    return (
      <ResultView
        rewardBreakdown={resultRewardBreakdown}
        score={score}
        total={questions.length}
        onRestart={handleRestart}
        xpEarned={resultRewardXp}
      />
    );
  }

  return (
    <AnimatePresence mode='wait'>
      <motion.div
        key={current}
        {...questionMotionProps}
        className='w-full'
      >
        <QuestionView
          q={activeQuestion}
          qIndex={current}
          total={questions.length}
          onAnswer={handleAnswer}
        />
      </motion.div>
    </AnimatePresence>
  );
}

function KangurGameContent(): React.JSX.Element {
  const { mode } = useKangurGameContext();
  if (isExamMode(mode)) {
    return <KangurExam />;
  }
  return <PracticeModeGame />;
}

export default function KangurGame(): React.JSX.Element {
  return (
    <div data-testid='kangur-game-print-panel'>
      <KangurGameContent />
    </div>
  );
}
