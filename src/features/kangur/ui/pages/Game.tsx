import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Home,
  LayoutGrid,
  LogIn,
} from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

import {
  Leaderboard,
  OperationSelector,
  QuestionCard,
  ResultScreen,
  TrainingSetup,
} from '@/features/kangur/ui/components/game';
import KangurAssignmentSpotlight from '@/features/kangur/ui/components/KangurAssignmentSpotlight';
import KangurPriorityAssignments from '@/features/kangur/ui/components/KangurPriorityAssignments';
import KangurPracticeAssignmentBanner from '@/features/kangur/ui/components/KangurPracticeAssignmentBanner';
import { KangurProfileMenu } from '@/features/kangur/ui/components/KangurProfileMenu';
import { PlayerProgressCard, XpToast } from '@/features/kangur/ui/components/progress';
import { getKangurPageHref as createPageUrl } from '@/features/kangur/config/routing';
import {
  KangurButton,
  KangurPageContainer,
  KangurPageShell,
  KangurPageTopBar,
  KangurPanel,
  KangurTopNavGroup,
} from '@/features/kangur/ui/design/primitives';
import { logKangurClientError } from '@/features/kangur/observability/client';
import { getKangurPlatform } from '@/features/kangur/services/kangur-platform';
import type { KangurPlatform, KangurUser } from '@/features/kangur/services/ports';
import { isKangurAuthStatusError } from '@/features/kangur/services/status-errors';
import { KangurGameProvider } from '@/features/kangur/ui/context/KangurGameContext';
import { useKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import { useKangurAssignments } from '@/features/kangur/ui/hooks/useKangurAssignments';
import { useKangurProgressState } from '@/features/kangur/ui/hooks/useKangurProgressState';
import {
  DIFFICULTY_CONFIG,
  generateQuestions,
  generateTrainingQuestions,
} from '@/features/kangur/ui/services/math-questions';
import { XP_REWARDS, addXp, loadProgress } from '@/features/kangur/ui/services/progress';
import {
  mapKangurPracticeAssignmentsByOperation,
  parseKangurMixedTrainingQuickStartParams,
  selectKangurPracticeAssignmentForScreen,
  selectKangurResultPracticeAssignment,
} from '@/features/kangur/ui/services/delegated-assignments';
import type {
  KangurDifficulty,
  KangurGameScreen,
  KangurMode,
  KangurOperation,
  KangurQuestion,
  KangurTrainingSelection,
  KangurXpToastState,
} from '@/features/kangur/ui/types';
import { cn } from '@/shared/utils';

const TOTAL_QUESTIONS = 10;
type KangurSetupProps = {
  onStart: (mode: KangurMode) => void;
  onBack: () => void;
};
type CalendarTrainingGameProps = {
  onFinish: () => void;
};
type GeometryDrawingGameProps = {
  onFinish: () => void;
};

const DeferredModuleFallback = (): React.JSX.Element => (
  <div className='w-full max-w-md rounded-3xl border border-indigo-200/70 bg-white/90 p-6 text-center shadow-lg text-sm text-indigo-500'>
    Ladowanie...
  </div>
);

const KangurSetup = dynamic<KangurSetupProps>(
  () => import('@/features/kangur/ui/components/KangurSetup'),
  {
    ssr: false,
    loading: DeferredModuleFallback,
  }
);
const KangurGame = dynamic(() => import('@/features/kangur/ui/components/KangurGame'), {
  ssr: false,
  loading: DeferredModuleFallback,
});
const CalendarTrainingGame = dynamic<CalendarTrainingGameProps>(
  () => import('@/features/kangur/ui/components/CalendarTrainingGame'),
  {
    ssr: false,
    loading: DeferredModuleFallback,
  }
);
const GeometryDrawingGame = dynamic<GeometryDrawingGameProps>(
  () => import('@/features/kangur/ui/components/GeometryDrawingGame'),
  {
    ssr: false,
    loading: DeferredModuleFallback,
  }
);

const kangurPlatform: KangurPlatform = getKangurPlatform();
const KANGUR_OPERATIONS: KangurOperation[] = [
  'addition',
  'subtraction',
  'multiplication',
  'division',
  'decimals',
  'powers',
  'roots',
  'clock',
  'mixed',
];
const KANGUR_DIFFICULTIES: KangurDifficulty[] = ['easy', 'medium', 'hard'];
const GAME_BRAND_NAME = 'Sprycio';

const isKangurOperation = (value: string | null): value is KangurOperation =>
  Boolean(value && KANGUR_OPERATIONS.includes(value as KangurOperation));

const isKangurDifficulty = (value: string | null): value is KangurDifficulty =>
  Boolean(value && KANGUR_DIFFICULTIES.includes(value as KangurDifficulty));

type HomeActionTone = 'neutral' | 'violet' | 'sky' | 'mist' | 'sand';

type HomeAction = {
  id: string;
  label: string;
  symbol: string;
  trailingSymbol?: string;
  tone: HomeActionTone;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
};

const HOME_ACTION_TONE_STYLES: Record<
  HomeActionTone,
  {
    card: string;
    label: string;
    icon: string;
    active?: boolean;
  }
> = {
  neutral: {
    card: 'home-action-soft',
    label: 'text-[#2d3f84]',
    icon: 'drop-shadow-[0_2px_4px_rgba(255,255,255,0.65)]',
  },
  violet: {
    card: 'home-action-active',
    label: 'text-white',
    icon: 'drop-shadow-[0_3px_8px_rgba(74,54,190,0.25)]',
    active: true,
  },
  sky: {
    card: 'home-action-soft',
    label: 'text-[#2d3f84]',
    icon: 'drop-shadow-[0_2px_4px_rgba(255,255,255,0.65)]',
  },
  mist: {
    card: 'home-action-soft',
    label: 'text-[#2d3f84]',
    icon: 'drop-shadow-[0_2px_4px_rgba(255,255,255,0.65)]',
  },
  sand: {
    card: 'home-action-soft',
    label: 'text-[#c55f1f]',
    icon: 'drop-shadow-[0_2px_4px_rgba(255,255,255,0.65)]',
  },
};

function KangurHomeActionCard({
  action,
  index,
}: {
  action: HomeAction;
  index: number;
}): React.JSX.Element {
  const tone = HOME_ACTION_TONE_STYLES[action.tone];
  const isActive = tone.active === true;
  const wrapperClassName = cn('relative', action.disabled ? 'opacity-55' : null);
  const sharedClassName = cn(
    'group relative w-full text-center',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300/70 focus-visible:ring-offset-2 ring-offset-white',
    'disabled:cursor-not-allowed',
    tone.card
  );

  const content = (
    <>
      {isActive ? (
        <>
          <span className='pointer-events-none absolute inset-[1px] rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.26)_0%,rgba(255,255,255,0.08)_36%,rgba(255,255,255,0)_58%)]' />
          <span className='pointer-events-none absolute left-[10%] top-[18%] h-[34px] w-[140px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.22)_0%,rgba(255,255,255,0)_70%)] blur-xl sm:h-[52px] sm:w-[220px]' />
          <span className='pointer-events-none absolute right-[8%] top-[14%] h-[36px] w-[110px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0)_72%)] blur-xl sm:h-[60px] sm:w-[180px]' />
        </>
      ) : (
        <>
          <span className='pointer-events-none absolute inset-[1px] rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.45)_0%,rgba(255,255,255,0.08)_38%,rgba(255,255,255,0)_60%)]' />
          <span className='pointer-events-none absolute inset-x-[18px] bottom-[8px] h-[16px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(185,176,228,0.26)_0%,rgba(185,176,228,0)_72%)] blur-md sm:bottom-[10px] sm:h-[18px]' />
        </>
      )}

      <span
        className={cn(
          'relative z-10 flex min-w-0 items-center justify-center',
          isActive
            ? 'gap-4 text-[20px] font-semibold tracking-[-0.05em] text-white sm:gap-6 sm:text-[24px]'
            : 'gap-4 text-[18px] font-semibold tracking-[-0.04em] sm:gap-5 sm:text-[22px]',
          tone.label
        )}
      >
        <span
          className={cn(
            'leading-none transition-transform duration-200 group-hover:scale-[1.02]',
            isActive ? 'text-[20px] sm:text-[24px]' : 'text-[20px] sm:text-[24px]',
            tone.icon
          )}
          aria-hidden='true'
        >
          {action.symbol}
        </span>
        <span>{action.label}</span>
        {action.trailingSymbol ? (
          <span
            className={cn(
              'leading-none transition-transform duration-200 group-hover:scale-[1.02]',
              isActive ? 'text-[20px] sm:text-[24px]' : 'text-[20px] sm:text-[24px]',
              tone.icon
            )}
            aria-hidden='true'
          >
            {action.trailingSymbol}
          </span>
        ) : null}
      </span>

      {isActive ? (
        <>
          <span className='pointer-events-none absolute left-[31%] top-[34%] text-[10px] text-white/60 sm:text-[14px]'>
            ✦
          </span>
          <span className='pointer-events-none absolute right-[29%] top-[26%] text-[10px] text-white/60 sm:text-[14px]'>
            ✦
          </span>
          <span className='pointer-events-none absolute right-[20%] top-[46%] text-[9px] text-white/50 sm:text-[12px]'>
            ✦
          </span>
        </>
      ) : null}
    </>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.06 * index }}
      className={wrapperClassName}
    >
      {isActive ? <div className='home-action-active-underlay' /> : null}
      {action.href ? (
        <Link href={action.href} className={sharedClassName}>
          {content}
        </Link>
      ) : (
        <button
          type='button'
          onClick={action.onClick}
          disabled={action.disabled}
          className={sharedClassName}
        >
          {content}
        </button>
      )}
    </motion.div>
  );
}

export default function Game() {
  const { basePath } = useKangurRouting();
  const quickStartConsumedRef = useRef(false);
  const [screen, setScreen] = useState<KangurGameScreen>('home');
  const [user, setUser] = useState<KangurUser | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [playerName, setPlayerName] = useState('');
  const [operation, setOperation] = useState<KangurOperation | null>(null);
  const [difficulty, setDifficulty] = useState<KangurDifficulty>('medium');
  const [questions, setQuestions] = useState<KangurQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [timeTaken, setTimeTaken] = useState(0);
  const progress = useKangurProgressState();
  const { assignments: delegatedAssignments, refresh: refreshAssignments } = useKangurAssignments({
    enabled: Boolean(user),
    query: {
      includeArchived: false,
    },
  });
  const [xpToast, setXpToast] = useState<KangurXpToastState>({
    visible: false,
    xpGained: 0,
    newBadges: [],
  });

  const showXpToast = (xpGained: number, newBadges: string[]): void => {
    setXpToast({ visible: true, xpGained, newBadges });
    setTimeout(() => setXpToast((t) => ({ ...t, visible: false })), 2800);
  };

  useEffect(() => {
    kangurPlatform.auth
      .me()
      .then((u) => {
        setUser(u);
        if (u?.full_name) setPlayerName(u.full_name);
      })
      .catch((error: unknown) => {
        if (isKangurAuthStatusError(error)) {
          return;
        }
        logKangurClientError(error, {
          source: 'KangurGamePage',
          action: 'loadCurrentUser',
        });
      })
      .finally(() => setUserLoading(false));
  }, []);

  const handleLogin = (): void => {
    kangurPlatform.auth.redirectToLogin(window.location.href);
  };

  const handleLogout = (): void => {
    void kangurPlatform.auth.logout().catch((error: unknown) => {
      logKangurClientError(error, {
        source: 'KangurGamePage',
        action: 'logout',
      });
    });
  };

  const handleStartGame = (): void => setScreen('operation');

  const handleStartTraining = ({
    categories,
    count,
    difficulty: diff,
  }: KangurTrainingSelection): void => {
    const qs = generateTrainingQuestions(categories, diff, count);
    setOperation('mixed');
    setDifficulty(diff);
    setQuestions(qs);
    setCurrent(0);
    setScore(0);
    setStartTime(Date.now());
    setScreen('playing');
  };

  const handleSelectOperation = (op: KangurOperation, diff: KangurDifficulty): void => {
    const qs = generateQuestions(op, diff, TOTAL_QUESTIONS);
    setOperation(op);
    setDifficulty(diff);
    setQuestions(qs);
    setCurrent(0);
    setScore(0);
    setStartTime(Date.now());
    setScreen('playing');
  };

  useEffect(() => {
    if (
      quickStartConsumedRef.current ||
      screen !== 'home' ||
      typeof window === 'undefined' ||
      userLoading
    ) {
      return;
    }

    const url = new URL(window.location.href);
    const quickStart = url.searchParams.get('quickStart');
    if (!quickStart) {
      return;
    }

    const clearQuickStartParams = (): void => {
      url.searchParams.delete('quickStart');
      url.searchParams.delete('operation');
      url.searchParams.delete('categories');
      url.searchParams.delete('count');
      url.searchParams.delete('difficulty');
      const nextHref = `${url.pathname}${url.search}${url.hash}`;
      window.history.replaceState({}, '', nextHref);
    };

    if (quickStart === 'training') {
      quickStartConsumedRef.current = true;
      if (!user && playerName.trim().length === 0) {
        setPlayerName('Gracz');
      }
      const trainingPreset = parseKangurMixedTrainingQuickStartParams(url.searchParams);
      clearQuickStartParams();
      if (trainingPreset) {
        handleStartTraining(trainingPreset);
        return;
      }
      setScreen('training');
      return;
    }

    if (quickStart === 'operation') {
      const requestedOperation = url.searchParams.get('operation');
      const requestedDifficulty = url.searchParams.get('difficulty');
      const operation = isKangurOperation(requestedOperation) ? requestedOperation : null;
      const difficulty = isKangurDifficulty(requestedDifficulty) ? requestedDifficulty : 'medium';

      quickStartConsumedRef.current = true;
      if (!user && playerName.trim().length === 0) {
        setPlayerName('Gracz');
      }
      clearQuickStartParams();
      if (operation) {
        handleSelectOperation(operation, difficulty);
      } else {
        setScreen('operation');
      }
    }
  }, [playerName, screen, user, userLoading]);

  const handleAnswer = (correct: boolean): void => {
    const newScore = correct ? score + 1 : score;
    if (correct) setScore(newScore);

    if (current + 1 >= TOTAL_QUESTIONS) {
      const taken = Math.round((Date.now() - (startTime ?? Date.now())) / 1000);
      const selectedOperation = operation ?? 'mixed';
      setTimeTaken(taken);
      setScore(newScore);
      void kangurPlatform.score
        .create({
          player_name: playerName,
          score: newScore,
          operation: selectedOperation,
          total_questions: TOTAL_QUESTIONS,
          correct_answers: newScore,
          time_taken: taken,
        })
        .finally(() => {
          if (user) {
            void refreshAssignments();
          }
        });

      // XP & progress
      const prog = loadProgress();
      const isPerfect = newScore === TOTAL_QUESTIONS;
      const isGreat = newScore >= 8;
      const xp = isPerfect
        ? XP_REWARDS.perfect_game
        : isGreat
          ? XP_REWARDS.great_game
          : XP_REWARDS.good_game;
      const ops = [...new Set([...(prog.operationsPlayed || []), selectedOperation])];
      const { newBadges } = addXp(xp, {
        gamesPlayed: prog.gamesPlayed + 1,
        perfectGames: isPerfect ? prog.perfectGames + 1 : prog.perfectGames,
        operationsPlayed: ops,
      });
      showXpToast(xp, newBadges);

      setTimeout(() => setScreen('result'), 1000);
    } else {
      setTimeout(() => setCurrent((c) => c + 1), 1000);
    }
  };

  const [kangurMode, setKangurMode] = useState<KangurMode | null>(null);

  const handleStartKangur = (mode: KangurMode): void => {
    setKangurMode(mode);
    setScreen('kangur');
  };

  const handleRestart = () => setScreen('operation');

  const handleHome = () => {
    setScreen('home');
    if (!user) setPlayerName('');
  };

  const activeQuestion = questions[current];
  const practiceAssignmentsByOperation = useMemo(
    () => mapKangurPracticeAssignmentsByOperation(delegatedAssignments),
    [delegatedAssignments]
  );
  const activePracticeAssignment = useMemo(
    () => selectKangurPracticeAssignmentForScreen(delegatedAssignments, screen, operation),
    [delegatedAssignments, operation, screen]
  );
  const resultPracticeAssignment = useMemo(
    () =>
      screen === 'result'
        ? selectKangurResultPracticeAssignment(delegatedAssignments, operation)
        : null,
    [delegatedAssignments, operation, screen]
  );
  const canStartFromHome = Boolean(user || playerName.trim().length > 0);
  const homeActions = useMemo<HomeAction[]>(
    () => [
      {
        id: 'lessons',
        label: 'Lekcje',
        symbol: '📚',
        tone: 'neutral',
        href: createPageUrl('Lessons', basePath),
      },
      {
        id: 'play',
        label: 'Grajmy!',
        symbol: '🪐',
        trailingSymbol: '🚀',
        tone: 'violet',
        onClick: handleStartGame,
        disabled: !canStartFromHome,
      },
      {
        id: 'training',
        label: 'Trening mieszany',
        symbol: '🤸',
        tone: 'sky',
        onClick: () => setScreen('training'),
        disabled: !canStartFromHome,
      },
      {
        id: 'geometry',
        label: 'Trening figur',
        symbol: '🔷',
        tone: 'mist',
        onClick: () => setScreen('geometry_quiz'),
        disabled: !canStartFromHome,
      },
      {
        id: 'kangur',
        label: 'Kangur Matematyczny',
        symbol: '🦘',
        tone: 'sand',
        onClick: () => setScreen('kangur_setup'),
        disabled: !canStartFromHome,
      },
    ],
    [basePath, canStartFromHome, handleStartGame]
  );

  return (
    <KangurPageShell tone='play'>
      <XpToast
        xpGained={xpToast.xpGained}
        newBadges={xpToast.newBadges}
        visible={xpToast.visible}
      />
      <KangurPageTopBar
        contentClassName='justify-center'
        left={
          <KangurTopNavGroup>
            <KangurButton
              onClick={handleHome}
              size='md'
              variant={screen === 'home' ? 'navigationActive' : 'navigation'}
            >
              <Home className='h-[22px] w-[22px]' strokeWidth={2.1} />
              <span>Strona glowna</span>
            </KangurButton>
            <KangurButton asChild size='md' variant='navigation'>
              <Link href={createPageUrl('Lessons', basePath)}>
                <BookOpen className='h-[22px] w-[22px]' strokeWidth={2.1} />
                <span>Lekcje</span>
              </Link>
            </KangurButton>
            <KangurProfileMenu
              basePath={basePath}
              isAuthenticated={Boolean(user)}
              onLogout={handleLogout}
              onLogin={handleLogin}
              isActive={false}
            />
            {user?.canManageLearners && (
              <KangurButton asChild size='md' variant='navigation'>
                <Link href={createPageUrl('ParentDashboard', basePath)}>
                  <LayoutGrid className='h-[22px] w-[22px]' strokeWidth={2.1} />
                  <span>Rodzic</span>
                </Link>
              </KangurButton>
            )}
          </KangurTopNavGroup>
        }
      />

      <KangurPageContainer className='flex flex-col items-center gap-10 pt-6 sm:pt-8'>
        <h1 className='sr-only'>{GAME_BRAND_NAME}</h1>
        <AnimatePresence mode='wait'>
          {screen === 'home' && (
            <motion.div
              key='home'
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className='flex w-full flex-col items-center gap-10'
            >
              <section className='w-full max-w-[520px] space-y-5'>
                {user ? (
                  <KangurAssignmentSpotlight basePath={basePath} />
                ) : (
                  <KangurPanel className='w-full border-white/78 bg-white/58' padding='lg' variant='elevated'>
                    <div className='px-1'>
                      <label className='block text-[14px] font-bold uppercase tracking-[0.12em] text-[#97a0c3]'>
                        Imie gracza
                      </label>
                      <input
                        type='text'
                        placeholder='Wpisz swoje imie...'
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && playerName.trim() && handleStartGame()}
                        className='mt-4 h-[58px] w-full rounded-[22px] border border-[#eceff7] bg-white px-4 text-[18px] text-slate-700 outline-none transition focus:border-[#cdd7ff] focus:ring-2 focus:ring-[#e6ebff]'
                        maxLength={20}
                      />
                      <div className='mt-4 flex flex-wrap items-center justify-between gap-3 text-[15px] text-[#8c97bb]'>
                        <span>Zaloguj się, aby Twój wynik pojawił się na tablicy.</span>
                        <KangurButton onClick={handleLogin} size='sm' variant='secondary'>
                          <LogIn className='w-4 h-4' /> Zaloguj się
                        </KangurButton>
                      </div>
                    </div>
                  </KangurPanel>
                )}

                <KangurPanel
                  className='w-full border-white/78 bg-white/58 shadow-[0_24px_60px_rgba(168,175,216,0.18)]'
                  padding='lg'
                  variant='elevated'
                >
                  <div className='space-y-3'>
                    {homeActions.map((action, index) => (
                      <KangurHomeActionCard key={action.id} action={action} index={index} />
                    ))}
                  </div>
                </KangurPanel>
              </section>

              {user ? (
                <div className='mx-auto w-full max-w-[900px]'>
                  <KangurPriorityAssignments
                    basePath={basePath}
                    enabled={Boolean(user)}
                    title='Priorytetowe zadania'
                    emptyLabel='Brak aktywnych zadan od rodzica.'
                  />
                </div>
              ) : null}

              <div className='grid w-full max-w-5xl gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]'>
                <div className='order-2 xl:order-1'>
                  <Leaderboard />
                </div>
                <div className='order-1 xl:order-2 flex justify-center xl:justify-stretch'>
                  <PlayerProgressCard progress={progress} />
                </div>
              </div>
            </motion.div>
          )}

          {screen === 'training' && (
            <motion.div
              key='training'
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className='w-full flex flex-col items-center'
            >
              {activePracticeAssignment ? (
                <div className='mb-4 w-full flex justify-center px-4'>
                  <KangurPracticeAssignmentBanner
                    assignment={activePracticeAssignment}
                    basePath={basePath}
                    mode='active'
                  />
                </div>
              ) : null}
              <TrainingSetup onStart={handleStartTraining} onBack={() => setScreen('home')} />
            </motion.div>
          )}

          {screen === 'kangur_setup' && (
            <motion.div
              key='kangur_setup'
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className='w-full flex flex-col items-center'
            >
              <KangurSetup onStart={handleStartKangur} onBack={() => setScreen('home')} />
            </motion.div>
          )}

          {screen === 'kangur' && (
            <motion.div
              key='kangur'
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className='w-full flex flex-col items-center max-w-lg'
            >
              <KangurGameProvider mode={kangurMode} onBack={() => setScreen('kangur_setup')}>
                <KangurGame />
              </KangurGameProvider>
            </motion.div>
          )}

          {screen === 'calendar_quiz' && (
            <motion.div
              key='calendar_quiz'
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className='w-full flex flex-col items-center max-w-lg gap-4'
            >
              <KangurPanel className='w-full flex flex-col items-center gap-4' padding='xl' variant='elevated'>
                <h2 className='text-xl font-extrabold text-green-700'>
                  📅 Ćwiczenia z Kalendarzem
                </h2>
                <CalendarTrainingGame onFinish={() => setScreen('home')} />
              </KangurPanel>
            </motion.div>
          )}

          {screen === 'geometry_quiz' && (
            <motion.div
              key='geometry_quiz'
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className='w-full flex flex-col items-center max-w-lg gap-4'
            >
              <KangurPanel className='w-full flex flex-col items-center gap-4' padding='xl' variant='elevated'>
                <h2 className='text-xl font-extrabold text-fuchsia-700'>🔷 Ćwiczenia z Figur</h2>
                <GeometryDrawingGame onFinish={() => setScreen('home')} />
              </KangurPanel>
            </motion.div>
          )}

          {screen === 'operation' && (
            <motion.div
              key='operation'
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className='w-full flex flex-col items-center'
            >
              <p className='text-gray-500 mb-4 text-lg'>
                Cześć, <span className='font-bold text-indigo-500'>{playerName}</span>! 👋
              </p>
              {activePracticeAssignment ? (
                <div className='mb-4 w-full flex justify-center px-4'>
                  <KangurPracticeAssignmentBanner
                    assignment={activePracticeAssignment}
                    basePath={basePath}
                    mode='queue'
                  />
                </div>
              ) : null}
              <OperationSelector
                onSelect={handleSelectOperation}
                priorityAssignmentsByOperation={practiceAssignmentsByOperation}
              />
              <KangurButton
                className='mt-4 w-full max-w-sm'
                onClick={() => setScreen('calendar_quiz')}
                size='lg'
                variant='surface'
              >
                📅 Ćwiczenia z Kalendarzem
              </KangurButton>
              <KangurButton
                className='mt-3 w-full max-w-sm'
                onClick={() => setScreen('geometry_quiz')}
                size='lg'
                variant='secondary'
              >
                🔷 Ćwiczenia z Figurami
              </KangurButton>
            </motion.div>
          )}

          {screen === 'playing' && activeQuestion && (
            <motion.div
              key='playing'
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className='flex flex-col items-center w-full'
            >
              {activePracticeAssignment ? (
                <div className='mb-4 w-full flex justify-center px-4'>
                  <KangurPracticeAssignmentBanner
                    assignment={activePracticeAssignment}
                    basePath={basePath}
                    mode='active'
                  />
                </div>
              ) : null}
              <div className='flex justify-between items-center w-full max-w-md mb-4 px-2'>
                <span className='text-gray-500 font-semibold'>
                  ⭐ Wynik: <span className='text-indigo-600 font-bold'>{score}</span>
                </span>
                <span className='text-gray-500 font-semibold'>
                  {DIFFICULTY_CONFIG[difficulty]?.emoji} {DIFFICULTY_CONFIG[difficulty]?.label}
                </span>
              </div>
              <QuestionCard
                question={activeQuestion}
                onAnswer={handleAnswer}
                questionNumber={current + 1}
                total={TOTAL_QUESTIONS}
                timeLimit={DIFFICULTY_CONFIG[difficulty]?.timeLimit ?? 15}
              />
            </motion.div>
          )}

          {screen === 'result' && (
            <motion.div
              key='result'
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className='flex flex-col items-center w-full gap-6'
            >
              {resultPracticeAssignment ? (
                <div className='w-full flex justify-center px-4'>
                  <KangurPracticeAssignmentBanner
                    assignment={resultPracticeAssignment}
                    basePath={basePath}
                    mode={
                      resultPracticeAssignment.progress.status === 'completed'
                        ? 'completed'
                        : 'active'
                    }
                  />
                </div>
              ) : null}
              <ResultScreen
                score={score}
                total={TOTAL_QUESTIONS}
                playerName={playerName}
                operation={operation}
                timeTaken={timeTaken}
                onRestart={handleRestart}
                onHome={handleHome}
              />
              <Leaderboard />
            </motion.div>
          )}
        </AnimatePresence>
      </KangurPageContainer>
    </KangurPageShell>
  );
}
