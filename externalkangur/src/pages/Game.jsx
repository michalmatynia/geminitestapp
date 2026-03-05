import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import OperationSelector from '../components/game/OperationSelector';
import QuestionCard from '../components/game/QuestionCard';
import ResultScreen from '../components/game/ResultScreen';
import Leaderboard from '../components/game/Leaderboard';
import {
  generateQuestions,
  generateTrainingQuestions,
  DIFFICULTY_CONFIG,
} from '../components/game/mathQuestions';
import TrainingSetup from '../components/game/TrainingSetup';
import KangurSetup from '../components/kangur/KangurSetup';
import KangurGame from '../components/kangur/KangurGame';
import CalendarTrainingGame from '../components/lessons/CalendarTrainingGame';
import { LogIn, LogOut, BookOpen, ArrowLeft, LayoutDashboard } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { loadProgress, addXp, XP_REWARDS } from '../components/progress/progressSystem';
import PlayerProgressCard from '../components/progress/PlayerProgressCard';
import XpToast from '../components/progress/XpToast';

const TOTAL_QUESTIONS = 10;

export default function Game() {
  const [screen, setScreen] = useState('home');
  const [user, setUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);
  const [playerName, setPlayerName] = useState('');
  const [operation, setOperation] = useState(null);
  const [difficulty, setDifficulty] = useState('medium');
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [timeTaken, setTimeTaken] = useState(0);
  const [progress, setProgress] = useState(() => loadProgress());
  const [xpToast, setXpToast] = useState({ visible: false, xpGained: 0, newBadges: [] });

  const showXpToast = (xpGained, newBadges) => {
    setXpToast({ visible: true, xpGained, newBadges });
    setTimeout(() => setXpToast((t) => ({ ...t, visible: false })), 2800);
  };

  useEffect(() => {
    base44.auth
      .me()
      .then((u) => {
        setUser(u);
        if (u?.full_name) setPlayerName(u.full_name);
      })
      .catch(() => {})
      .finally(() => setUserLoading(false));
  }, []);

  const handleLogin = () => base44.auth.redirectToLogin(window.location.href);
  const handleLogout = () => base44.auth.logout();
  const handleStartGame = () => setScreen('operation');

  const handleStartTraining = ({ categories, count, difficulty: diff }) => {
    const qs = generateTrainingQuestions(categories, diff, count);
    setOperation('mixed');
    setDifficulty(diff);
    setQuestions(qs);
    setCurrent(0);
    setScore(0);
    setStartTime(Date.now());
    setScreen('playing');
  };

  const handleSelectOperation = (op, diff) => {
    const qs = generateQuestions(op, diff, TOTAL_QUESTIONS);
    setOperation(op);
    setDifficulty(diff);
    setQuestions(qs);
    setCurrent(0);
    setScore(0);
    setStartTime(Date.now());
    setScreen('playing');
  };

  const handleAnswer = (correct) => {
    const newScore = correct ? score + 1 : score;
    if (correct) setScore(newScore);

    if (current + 1 >= TOTAL_QUESTIONS) {
      const taken = Math.round((Date.now() - startTime) / 1000);
      setTimeTaken(taken);
      setScore(newScore);
      base44.entities.Score.create({
        player_name: playerName,
        score: newScore,
        operation,
        total_questions: TOTAL_QUESTIONS,
        correct_answers: newScore,
        time_taken: taken,
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
      const ops = [...new Set([...(prog.operationsPlayed || []), operation])];
      const { updated, newBadges } = addXp(xp, {
        gamesPlayed: prog.gamesPlayed + 1,
        perfectGames: isPerfect ? prog.perfectGames + 1 : prog.perfectGames,
        operationsPlayed: ops,
      });
      setProgress(updated);
      showXpToast(xp, newBadges);

      setTimeout(() => setScreen('result'), 1000);
    } else {
      setTimeout(() => setCurrent((c) => c + 1), 1000);
    }
  };

  const [kangurMode, setKangurMode] = useState(null);

  const handleStartKangur = (mode) => {
    setKangurMode(mode);
    setScreen('kangur');
  };

  const handleRestart = () => setScreen('operation');

  const handleHome = () => {
    setScreen('home');
    if (!user) setPlayerName('');
  };

  return (
    <div className='min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 flex flex-col items-center'>
      <XpToast
        xpGained={xpToast.xpGained}
        newBadges={xpToast.newBadges}
        visible={xpToast.visible}
      />
      {/* Top nav bar */}
      <div className='w-full bg-white/70 backdrop-blur border-b border-indigo-100 px-6 py-3 flex items-center justify-between'>
        <div>
          {screen !== 'home' && (
            <button
              onClick={handleHome}
              className='inline-flex items-center gap-2 text-indigo-500 hover:text-indigo-700 font-semibold text-sm transition'
            >
              <ArrowLeft className='w-4 h-4' /> Strona główna
            </button>
          )}
        </div>
        <div className='flex items-center gap-3'>
          <Link
            to={createPageUrl('Lessons')}
            className='inline-flex items-center gap-1.5 text-sm text-purple-500 hover:text-purple-700 font-semibold transition'
          >
            <BookOpen className='w-4 h-4' /> Lekcje
          </Link>
          <Link
            to={createPageUrl('ParentDashboard')}
            className='inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 font-semibold transition'
          >
            <LayoutDashboard className='w-4 h-4' /> Rodzic
          </Link>
        </div>
      </div>

      <div className='flex flex-col items-center py-10 px-4 w-full'>
        {/* Header */}
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className='mb-8 text-center'
        >
          <h1 className='text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600 drop-shadow'>
            🧮 MathBlast!
          </h1>
          <p className='text-gray-500 mt-1 text-lg'>Fajny sposób na naukę matematyki!</p>
          {!userLoading && (
            <div className='mt-3 flex justify-center'>
              {user ? (
                <button
                  onClick={handleLogout}
                  className='flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition'
                >
                  <LogOut className='w-4 h-4' /> Wyloguj ({user.full_name})
                </button>
              ) : (
                <button
                  onClick={handleLogin}
                  className='flex items-center gap-2 text-sm bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-50 px-4 py-2 rounded-2xl shadow transition font-semibold'
                >
                  <LogIn className='w-4 h-4' /> Zaloguj się, aby wejść na tablicę wyników
                </button>
              )}
            </div>
          )}
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
                    <p className='text-gray-400 text-sm text-center'>
                      Jesteś zalogowany/a. Twoje wyniki będą zapisane na tablicy!
                    </p>
                    <Link to={createPageUrl('Lessons')} className='w-full'>
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
                    <Link to={createPageUrl('Lessons')} className='w-full'>
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
              <KangurGame mode={kangurMode} onBack={() => setScreen('kangur_setup')} />
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
              <OperationSelector onSelect={handleSelectOperation} />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setScreen('calendar_quiz')}
                className='mt-4 w-full max-w-sm bg-gradient-to-r from-teal-500 to-green-400 text-white font-extrabold text-lg py-3 rounded-2xl shadow transition'
              >
                📅 Ćwiczenia z Kalendarzem
              </motion.button>
            </motion.div>
          )}

          {screen === 'playing' && questions[current] && (
            <motion.div
              key='playing'
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className='flex flex-col items-center w-full'
            >
              <div className='flex justify-between items-center w-full max-w-md mb-4 px-2'>
                <span className='text-gray-500 font-semibold'>
                  ⭐ Wynik: <span className='text-indigo-600 font-bold'>{score}</span>
                </span>
                <span className='text-gray-500 font-semibold'>
                  {DIFFICULTY_CONFIG[difficulty]?.emoji} {DIFFICULTY_CONFIG[difficulty]?.label}
                </span>
              </div>
              <QuestionCard
                question={questions[current]}
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
