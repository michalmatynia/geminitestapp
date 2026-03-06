import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, BookOpen, LayoutDashboard } from 'lucide-react';
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

  return (
    <div className='min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 flex flex-col items-center'>
      <XpToast
        xpGained={xpToast.xpGained}
        newBadges={xpToast.newBadges}
        visible={xpToast.visible}
      />
      {/* Top nav bar */}
      <div
        className='sticky top-0 z-20 w-full bg-white/70 backdrop-blur border-b border-indigo-100 px-6 py-3 flex items-center justify-between'
      >
        <div className='flex items-center gap-3'>
          {screen !== 'home' && (
            <button
              onClick={handleHome}
              className='inline-flex items-center text-indigo-500 hover:text-indigo-700 font-semibold text-sm transition'
            >
              Strona główna
            </button>
          )}
          <Link
            href={createPageUrl('Lessons', basePath)}
            className='inline-flex items-center gap-1.5 text-sm text-purple-500 hover:text-purple-700 font-semibold transition'
          >
            <BookOpen className='w-4 h-4' /> Lekcje
          </Link>
        </div>
        <div className='flex items-center gap-3'>
          <KangurProfileMenu
            basePath={basePath}
            isAuthenticated={Boolean(user)}
            onLogout={handleLogout}
            onLogin={handleLogin}
          />
          {user?.canManageLearners && (
            <Link
              href={createPageUrl('ParentDashboard', basePath)}
              className='inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 font-semibold transition'
            >
              <LayoutDashboard className='w-4 h-4' /> Rodzic
            </Link>
          )}
        </div>
      </div>

      <div className='flex flex-col items-center w-full'>
        {/* Header */}
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className='mb-8 pt-3 text-center'
        >
          <h1 className='text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600 drop-shadow'>
            <span aria-hidden='true'>🧮 </span>
            {GAME_BRAND_NAME}
          </h1>
          {!userLoading && !user ? (
            <div className='mt-3 flex justify-center'>
              <button
                onClick={handleLogin}
                className='flex items-center gap-2 text-sm bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-50 px-4 py-2 rounded-2xl shadow transition font-semibold'
              >
                <LogIn className='w-4 h-4' /> Zaloguj się, aby wejść na tablicę wyników
              </button>
            </div>
          ) : null}
        </motion.div>

        <AnimatePresence mode='wait'>
          {screen === 'home' && (
            <motion.div
              key='home'
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className='flex flex-col items-center gap-6 w-full'
            >
              <div className='bg-white rounded-3xl shadow-xl p-8 flex flex-col items-center gap-4 w-full max-w-sm'>
                <div className='text-4xl'>👋</div>
                {user ? (
                  <>
                    <h2 className='text-2xl font-bold text-gray-700'>
                      Cześć, {user.full_name}! 🎉
                    </h2>
                    <KangurAssignmentSpotlight basePath={basePath} />
                    <Link href={createPageUrl('Lessons', basePath)} className='w-full'>
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.97 }}
                        className='w-full bg-gradient-to-r from-purple-400 to-pink-400 text-white font-extrabold text-lg py-3 rounded-2xl shadow text-center transition'
                      >
                        📚 Lekcje
                      </motion.div>
                    </Link>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={handleStartGame}
                      className='w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-extrabold text-xl py-3 rounded-2xl shadow-lg transition'
                    >
                      Grajmy! 🚀
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setScreen('training')}
                      className='w-full bg-gradient-to-r from-teal-400 to-indigo-500 text-white font-extrabold text-lg py-3 rounded-2xl shadow transition'
                    >
                      🏋️ Trening mieszany
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setScreen('geometry_quiz')}
                      className='w-full bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white font-extrabold text-lg py-3 rounded-2xl shadow transition'
                    >
                      🔷 Trening figur
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setScreen('kangur_setup')}
                      className='w-full bg-gradient-to-r from-orange-400 to-yellow-400 text-white font-extrabold text-lg py-3 rounded-2xl shadow transition'
                    >
                      🦘 Kangur Matematyczny
                    </motion.button>
                  </>
                ) : (
                  <>
                    <h2 className='text-2xl font-bold text-gray-700'>Jak masz na imię?</h2>
                    <input
                      type='text'
                      placeholder='Wpisz swoje imię...'
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && playerName.trim() && handleStartGame()}
                      className='w-full border-2 border-indigo-200 rounded-2xl px-4 py-3 text-lg text-gray-700 focus:outline-none focus:border-indigo-400'
                      maxLength={20}
                    />
                    <p className='text-xs text-gray-400 text-center'>
                      Zaloguj się, aby Twój wynik pojawił się na tablicy!
                    </p>
                    <Link href={createPageUrl('Lessons', basePath)} className='w-full'>
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.97 }}
                        className='w-full bg-gradient-to-r from-purple-400 to-pink-400 text-white font-extrabold text-lg py-3 rounded-2xl shadow text-center transition'
                      >
                        📚 Lekcje
                      </motion.div>
                    </Link>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={handleStartGame}
                      disabled={!playerName.trim()}
                      className='w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-extrabold text-xl py-3 rounded-2xl shadow-lg disabled:opacity-40 transition'
                    >
                      Grajmy! 🚀
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => playerName.trim() && setScreen('training')}
                      disabled={!playerName.trim()}
                      className='w-full bg-gradient-to-r from-teal-400 to-indigo-500 text-white font-extrabold text-lg py-3 rounded-2xl shadow disabled:opacity-40 transition'
                    >
                      🏋️ Trening mieszany
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => playerName.trim() && setScreen('geometry_quiz')}
                      disabled={!playerName.trim()}
                      className='w-full bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white font-extrabold text-lg py-3 rounded-2xl shadow disabled:opacity-40 transition'
                    >
                      🔷 Trening figur
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => playerName.trim() && setScreen('kangur_setup')}
                      disabled={!playerName.trim()}
                      className='w-full bg-gradient-to-r from-orange-400 to-yellow-400 text-white font-extrabold text-lg py-3 rounded-2xl shadow disabled:opacity-40 transition'
                    >
                      🦘 Kangur Matematyczny
                    </motion.button>
                    <button
                      onClick={handleLogin}
                      className='flex items-center gap-2 text-indigo-500 hover:text-indigo-700 font-semibold text-sm transition'
                    >
                      <LogIn className='w-4 h-4' /> Zaloguj się
                    </button>
                  </>
                )}
              </div>
              <div className='w-full max-w-2xl'>
                <KangurPriorityAssignments
                  basePath={basePath}
                  enabled={Boolean(user)}
                  title='Priorytetowe zadania'
                  emptyLabel='Brak aktywnych zadan od rodzica.'
                />
              </div>
              <Leaderboard />
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
              <div className='bg-white rounded-3xl shadow-xl p-6 w-full flex flex-col items-center gap-4'>
                <h2 className='text-xl font-extrabold text-green-700'>
                  📅 Ćwiczenia z Kalendarzem
                </h2>
                <CalendarTrainingGame onFinish={() => setScreen('home')} />
              </div>
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
              <div className='bg-white rounded-3xl shadow-xl p-6 w-full flex flex-col items-center gap-4'>
                <h2 className='text-xl font-extrabold text-fuchsia-700'>🔷 Ćwiczenia z Figur</h2>
                <GeometryDrawingGame onFinish={() => setScreen('home')} />
              </div>
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
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setScreen('calendar_quiz')}
                className='mt-4 w-full max-w-sm bg-gradient-to-r from-teal-500 to-green-400 text-white font-extrabold text-lg py-3 rounded-2xl shadow transition'
              >
                📅 Ćwiczenia z Kalendarzem
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setScreen('geometry_quiz')}
                className='mt-3 w-full max-w-sm bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white font-extrabold text-lg py-3 rounded-2xl shadow transition'
              >
                🔷 Ćwiczenia z Figurami
              </motion.button>
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

        {screen === 'home' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className='w-full flex justify-center mt-2'
          >
            <PlayerProgressCard progress={progress} />
          </motion.div>
        )}
      </div>
    </div>
  );
}
