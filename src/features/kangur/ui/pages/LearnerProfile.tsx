import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, BarChart2, BookOpen, Flame, LayoutDashboard, LogIn, Target } from 'lucide-react';
import Link from 'next/link';

import { getKangurPageHref as createPageUrl } from '@/features/kangur/config/routing';
import { logKangurClientError } from '@/features/kangur/observability/client';
import { getKangurPlatform } from '@/features/kangur/services/kangur-platform';
import type { KangurScoreRecord } from '@/features/kangur/services/ports';
import { useKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import { useKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import { buildKangurLearnerProfileSnapshot } from '@/features/kangur/ui/services/profile';
import type { KangurDifficulty, KangurOperation } from '@/features/kangur/ui/types';
import { BADGES, loadProgress } from '@/features/kangur/ui/services/progress';

const DAILY_GOAL_GAMES = 3;
const SCORE_FETCH_LIMIT = 120;

const kangurPlatform = getKangurPlatform();

const isStatusError = (value: unknown): value is { status: number } =>
  typeof value === 'object' &&
  value !== null &&
  'status' in value &&
  typeof (value as { status?: unknown }).status === 'number';

const formatDateTime = (value: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Brak daty';
  }
  return parsed.toLocaleString('pl-PL', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

const formatDuration = (seconds: number): string => {
  const normalized = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(normalized / 60);
  const remainingSeconds = normalized % 60;
  if (minutes === 0) {
    return `${remainingSeconds}s`;
  }
  return `${minutes}m ${`${remainingSeconds}`.padStart(2, '0')}s`;
};

const RECOMMENDATION_STYLES = {
  high: 'border-rose-200 bg-rose-50/80 text-rose-800',
  medium: 'border-amber-200 bg-amber-50/80 text-amber-800',
  low: 'border-emerald-200 bg-emerald-50/80 text-emerald-800',
} as const;

const QUICK_START_OPERATIONS = new Set<KangurOperation>([
  'addition',
  'subtraction',
  'multiplication',
  'division',
  'decimals',
  'powers',
  'roots',
  'clock',
  'mixed',
]);

const resolvePracticeDifficulty = (averageAccuracy: number): KangurDifficulty => {
  if (averageAccuracy >= 85) {
    return 'hard';
  }
  if (averageAccuracy >= 70) {
    return 'medium';
  }
  return 'easy';
};

const buildOperationPracticeHref = (basePath: string, operation: string, averageAccuracy: number): string => {
  const baseHref = createPageUrl('Game', basePath);
  const params = new URLSearchParams({ quickStart: 'training' });

  if (QUICK_START_OPERATIONS.has(operation as KangurOperation)) {
    params.set('quickStart', 'operation');
    params.set('operation', operation);
    params.set('difficulty', resolvePracticeDifficulty(averageAccuracy));
  }

  return `${baseHref}?${params.toString()}`;
};

const buildRecommendationHref = (
  basePath: string,
  action: {
    page: 'Game' | 'Lessons' | 'ParentDashboard' | 'LearnerProfile';
    query?: Record<string, string>;
  }
): string => {
  const baseHref = createPageUrl(action.page, basePath);
  const query = action.query ? new URLSearchParams(action.query).toString() : '';
  return query.length > 0 ? `${baseHref}?${query}` : baseHref;
};

export default function LearnerProfile() {
  const { basePath } = useKangurRouting();
  const { user, navigateToLogin } = useKangurAuth();
  const [progress, setProgress] = useState(() => loadProgress());
  const [scores, setScores] = useState<KangurScoreRecord[]>([]);
  const [isLoadingScores, setIsLoadingScores] = useState(true);
  const [scoresError, setScoresError] = useState<string | null>(null);

  useEffect(() => {
    setProgress(loadProgress());
  }, []);

  useEffect(() => {
    let isActive = true;

    const loadScores = async (): Promise<void> => {
      const userName = user?.full_name?.trim() ?? '';
      const userEmail = user?.email?.trim() ?? '';
      if (!userName && !userEmail) {
        if (isActive) {
          setScores([]);
          setIsLoadingScores(false);
          setScoresError(null);
        }
        return;
      }

      setIsLoadingScores(true);
      setScoresError(null);

      try {
        const rowsByEmail =
          userEmail.length > 0
            ? await kangurPlatform.score.filter({ created_by: userEmail }, '-created_date', SCORE_FETCH_LIMIT)
            : [];
        const rowsByName =
          userName.length > 0
            ? await kangurPlatform.score.filter({ player_name: userName }, '-created_date', SCORE_FETCH_LIMIT)
            : [];

        if (!isActive) {
          return;
        }

        const uniqueRows = new Map<string, KangurScoreRecord>();
        [...rowsByEmail, ...rowsByName].forEach((row) => uniqueRows.set(row.id, row));
        setScores(Array.from(uniqueRows.values()));
      } catch (error: unknown) {
        if (!isActive) {
          return;
        }

        if (isStatusError(error) && (error.status === 401 || error.status === 403)) {
          setScores([]);
        } else {
          logKangurClientError(error, {
            source: 'KangurLearnerProfilePage',
            action: 'loadScores',
            hasUser: Boolean(user),
          });
          setScoresError('Nie udalo sie pobrac historii wynikow.');
        }
      } finally {
        if (isActive) {
          setIsLoadingScores(false);
        }
      }
    };

    void loadScores();

    return () => {
      isActive = false;
    };
  }, [user?.email, user?.full_name]);

  const snapshot = useMemo(
    () =>
      buildKangurLearnerProfileSnapshot({
        progress,
        scores,
        dailyGoalGames: DAILY_GOAL_GAMES,
      }),
    [progress, scores]
  );

  const maxWeeklyGames = Math.max(1, ...snapshot.weeklyActivity.map((point) => point.games));
  const xpToNextLevel = snapshot.nextLevel ? Math.max(0, snapshot.nextLevel.minXp - snapshot.totalXp) : 0;

  return (
    <div className='min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 flex flex-col items-center'>
      <div className='w-full bg-white/70 backdrop-blur border-b border-indigo-100 px-4 py-3 flex items-center justify-between gap-3'>
        <Link
          href={createPageUrl('Game', basePath)}
          className='inline-flex items-center gap-2 text-indigo-500 hover:text-indigo-700 font-semibold text-sm transition'
        >
          <ArrowLeft className='w-4 h-4' /> Strona glowna
        </Link>
        <div className='flex items-center gap-3'>
          <Link
            href={createPageUrl('Lessons', basePath)}
            className='inline-flex items-center gap-1.5 text-sm text-purple-500 hover:text-purple-700 font-semibold transition'
          >
            <BookOpen className='w-4 h-4' /> Lekcje
          </Link>
          <Link
            href={createPageUrl('ParentDashboard', basePath)}
            className='inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 font-semibold transition'
          >
            <LayoutDashboard className='w-4 h-4' /> Rodzic
          </Link>
        </div>
      </div>

      <div className='w-full max-w-6xl px-4 py-8 flex flex-col gap-6'>
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className='text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600 drop-shadow'>
            Profil ucznia
          </h1>
          <p className='text-gray-500 mt-1'>
            Statystyki ucznia: {user?.full_name?.trim() || 'Tryb lokalny'}.
          </p>
          {!user && (
            <button
              onClick={navigateToLogin}
              className='mt-4 inline-flex items-center gap-2 bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-50 px-4 py-2 rounded-2xl shadow font-semibold text-sm transition'
            >
              <LogIn className='w-4 h-4' /> Zaloguj sie, aby synchronizowac postep
            </button>
          )}
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className='bg-white/85 backdrop-blur rounded-3xl shadow-xl p-6 flex flex-col gap-4'
        >
          <div className='flex flex-col md:flex-row md:items-end md:justify-between gap-4'>
            <div>
              <div className={`text-2xl font-extrabold ${snapshot.level.color}`}>{snapshot.level.title}</div>
              <p className='text-sm text-gray-500'>
                Poziom {snapshot.level.level} · {snapshot.totalXp} XP lacznie
              </p>
            </div>
            <div className='text-sm text-gray-500'>
              {snapshot.nextLevel
                ? `Do poziomu ${snapshot.nextLevel.level}: ${xpToNextLevel} XP`
                : 'Maksymalny poziom osiagniety'}
            </div>
          </div>

          <div>
            <div className='w-full h-3 bg-indigo-100 rounded-full overflow-hidden'>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${snapshot.levelProgressPercent}%` }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
                className='h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500'
              />
            </div>
            <div className='mt-1 text-xs text-gray-500 text-right'>{snapshot.levelProgressPercent}%</div>
          </div>
        </motion.section>

        <section className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4'>
          <div className='bg-white/85 backdrop-blur rounded-2xl shadow p-4'>
            <div className='inline-flex items-center gap-2 text-indigo-600 text-sm font-semibold'>
              <BarChart2 className='w-4 h-4' /> Srednia skutecznosc
            </div>
            <p className='text-3xl font-extrabold text-indigo-700 mt-2'>{snapshot.averageAccuracy}%</p>
            <p className='text-xs text-gray-500 mt-1'>Najlepsza sesja: {snapshot.bestAccuracy}%</p>
          </div>

          <div className='bg-white/85 backdrop-blur rounded-2xl shadow p-4'>
            <div className='inline-flex items-center gap-2 text-orange-500 text-sm font-semibold'>
              <Flame className='w-4 h-4' /> Seria dni
            </div>
            <p className='text-3xl font-extrabold text-orange-600 mt-2'>{snapshot.currentStreakDays}</p>
            <p className='text-xs text-gray-500 mt-1'>Najdluzsza: {snapshot.longestStreakDays} dni</p>
          </div>

          <div className='bg-white/85 backdrop-blur rounded-2xl shadow p-4'>
            <div className='inline-flex items-center gap-2 text-teal-600 text-sm font-semibold'>
              <Target className='w-4 h-4' /> Cel dzienny
            </div>
            <p className='text-3xl font-extrabold text-teal-600 mt-2'>
              {snapshot.todayGames}/{snapshot.dailyGoalGames}
            </p>
            <p className='text-xs text-gray-500 mt-1'>Wypelnienie: {snapshot.dailyGoalPercent}%</p>
          </div>

          <div className='bg-white/85 backdrop-blur rounded-2xl shadow p-4'>
            <div className='inline-flex items-center gap-2 text-amber-600 text-sm font-semibold'>
              🏅 Odznaki
            </div>
            <p className='text-3xl font-extrabold text-amber-600 mt-2'>
              {snapshot.unlockedBadges}/{snapshot.totalBadges}
            </p>
            <p className='text-xs text-gray-500 mt-1'>Odblokowane osiagniecia</p>
          </div>
        </section>

        <section className='bg-white/85 backdrop-blur rounded-2xl shadow p-5'>
          <div className='text-sm font-bold text-gray-500 uppercase tracking-wide mb-3'>Plan na dzis</div>
          <div className='grid grid-cols-1 lg:grid-cols-3 gap-3'>
            {snapshot.recommendations.map((recommendation) => (
              <div
                key={recommendation.id}
                className={`rounded-xl border px-3 py-2 ${RECOMMENDATION_STYLES[recommendation.priority]}`}
              >
                <div className='text-xs font-bold uppercase tracking-wide'>
                  {recommendation.priority === 'high'
                    ? 'Priorytet wysoki'
                    : recommendation.priority === 'medium'
                      ? 'Priorytet sredni'
                      : 'Priorytet niski'}
                </div>
                <div className='mt-1 text-sm font-semibold'>{recommendation.title}</div>
                <div className='mt-1 text-xs opacity-80'>{recommendation.description}</div>
                <Link
                  href={buildRecommendationHref(basePath, recommendation.action)}
                  className='mt-2 inline-flex items-center rounded-lg border border-current/30 px-2 py-1 text-xs font-semibold hover:bg-white/50 transition'
                >
                  {recommendation.action.label}
                </Link>
              </div>
            ))}
          </div>
        </section>

        <section className='grid grid-cols-1 xl:grid-cols-5 gap-4'>
          <div className='xl:col-span-3 bg-white/85 backdrop-blur rounded-2xl shadow p-5'>
            <div className='text-sm font-bold text-gray-500 uppercase tracking-wide mb-3'>Aktywnosc 7 dni</div>
            <div className='h-32 flex items-end gap-2'>
              {snapshot.weeklyActivity.map((point) => {
                const heightPercent = point.games === 0 ? 6 : Math.max(14, Math.round((point.games / maxWeeklyGames) * 100));
                return (
                  <div key={point.dateKey} className='flex-1 min-w-[0] flex flex-col items-center gap-1'>
                    <div
                      className={`w-full rounded-lg bg-gradient-to-t ${
                        point.games > 0 ? 'from-indigo-500 to-purple-400' : 'from-slate-200 to-slate-100'
                      }`}
                      style={{ height: `${heightPercent}%` }}
                      title={`${point.games} gier, srednia ${point.averageAccuracy}%`}
                    />
                    <div className='text-[11px] text-gray-500'>{point.label}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className='xl:col-span-2 bg-white/85 backdrop-blur rounded-2xl shadow p-5'>
            <div className='text-sm font-bold text-gray-500 uppercase tracking-wide mb-3'>Wyniki wg operacji</div>
            <div className='flex flex-col gap-3'>
              {snapshot.operationPerformance.length === 0 && (
                <div className='text-sm text-gray-400 py-6 text-center'>Brak danych o operacjach.</div>
              )}
              {snapshot.operationPerformance.map((item) => (
                <div key={item.operation}>
                  <div className='flex items-center justify-between gap-2 text-sm text-gray-600 mb-1'>
                    <span className='font-semibold'>
                      {item.emoji} {item.label}
                    </span>
                    <div className='flex items-center gap-2'>
                      <span>{item.averageAccuracy}%</span>
                      <Link
                        href={buildOperationPracticeHref(basePath, item.operation, item.averageAccuracy)}
                        className='inline-flex items-center rounded-md border border-indigo-200 px-2 py-0.5 text-[11px] font-semibold text-indigo-600 hover:bg-indigo-50 transition'
                      >
                        Trenuj
                      </Link>
                    </div>
                  </div>
                  <div className='w-full h-2 bg-slate-100 rounded-full overflow-hidden'>
                    <div className='h-full bg-gradient-to-r from-indigo-400 to-purple-500' style={{ width: `${item.averageAccuracy}%` }} />
                  </div>
                  <div className='mt-1 text-[11px] text-gray-500'>
                    Proby: {item.attempts} · Najlepsza skutecznosc: {item.bestScore}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className='grid grid-cols-1 xl:grid-cols-5 gap-4'>
          <div className='xl:col-span-3 bg-white/85 backdrop-blur rounded-2xl shadow p-5'>
            <div className='text-sm font-bold text-gray-500 uppercase tracking-wide mb-3'>
              Ostatnie sesje
            </div>
            {isLoadingScores ? (
              <div className='text-sm text-gray-400 py-6 text-center'>Ladowanie historii...</div>
            ) : scoresError ? (
              <div className='text-sm text-red-500 py-6 text-center'>{scoresError}</div>
            ) : snapshot.recentSessions.length === 0 ? (
              <div className='text-sm text-gray-400 py-6 text-center'>Brak rozegranych sesji.</div>
            ) : (
              <div className='flex flex-col gap-2'>
                {snapshot.recentSessions.map((session) => (
                  <div
                    key={session.id}
                    className='flex items-center gap-3 border border-slate-100 rounded-xl px-3 py-2 bg-white/80'
                  >
                    <div className='text-xl'>{session.operationEmoji}</div>
                    <div className='flex-1'>
                      <div className='text-sm font-semibold text-gray-700'>{session.operationLabel}</div>
                      <div className='text-xs text-gray-500'>{formatDateTime(session.createdAt)}</div>
                    </div>
                    <div className='text-right'>
                      <div className='text-sm font-extrabold text-indigo-600'>
                        {session.score}/{session.totalQuestions}
                      </div>
                      <div className='text-xs text-gray-500'>{formatDuration(session.timeTakenSeconds)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className='xl:col-span-2 bg-white/85 backdrop-blur rounded-2xl shadow p-5'>
            <div className='text-sm font-bold text-gray-500 uppercase tracking-wide mb-3'>Odznaki</div>
            <div className='flex flex-wrap gap-2'>
              {BADGES.map((badge) => {
                const unlocked = snapshot.unlockedBadgeIds.includes(badge.id);
                return (
                  <div
                    key={badge.id}
                    title={`${badge.name}: ${badge.desc}`}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      unlocked ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    <span className={unlocked ? '' : 'grayscale'}>{badge.emoji}</span>
                    <span>{badge.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
