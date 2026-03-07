'use client';

import { BADGES } from '@/features/kangur/ui/services/progress';
import { KangurPanel } from '@/features/kangur/ui/design/primitives';
import {
  formatKangurProfileDateTime,
  formatKangurProfileDuration,
  useKangurLearnerProfileRuntime,
} from '@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext';

export function KangurLearnerProfileSessionsWidget(): React.JSX.Element {
  const { isLoadingScores, scoresError, snapshot } = useKangurLearnerProfileRuntime();

  return (
    <section className='grid grid-cols-1 gap-4 xl:grid-cols-5'>
      <KangurPanel className='xl:col-span-3' padding='lg' variant='soft'>
        <div className='mb-3 text-sm font-bold uppercase tracking-wide text-gray-500'>
          Ostatnie sesje
        </div>
        {isLoadingScores ? (
          <div className='py-6 text-center text-sm text-gray-400'>Ladowanie historii...</div>
        ) : scoresError ? (
          <div className='py-6 text-center text-sm text-red-500'>{scoresError}</div>
        ) : snapshot.recentSessions.length === 0 ? (
          <div className='py-6 text-center text-sm text-gray-400'>Brak rozegranych sesji.</div>
        ) : (
          <div className='flex flex-col gap-2'>
            {snapshot.recentSessions.map((session) => (
              <div
                key={session.id}
                className='flex items-center gap-3 rounded-xl border border-slate-100 bg-white/80 px-3 py-2'
              >
                <div className='text-xl'>{session.operationEmoji}</div>
                <div className='flex-1'>
                  <div className='text-sm font-semibold text-gray-700'>{session.operationLabel}</div>
                  <div className='text-xs text-gray-500'>
                    {formatKangurProfileDateTime(session.createdAt)}
                  </div>
                </div>
                <div className='text-right'>
                  <div className='text-sm font-extrabold text-indigo-600'>
                    {session.score}/{session.totalQuestions}
                  </div>
                  <div className='text-xs text-gray-500'>
                    {formatKangurProfileDuration(session.timeTakenSeconds)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </KangurPanel>

      <KangurPanel className='xl:col-span-2' padding='lg' variant='soft'>
        <div className='mb-3 text-sm font-bold uppercase tracking-wide text-gray-500'>Odznaki</div>
        <div className='flex flex-wrap gap-2'>
          {BADGES.map((badge) => {
            const unlocked = snapshot.unlockedBadgeIds.includes(badge.id);
            return (
              <div
                key={badge.id}
                title={`${badge.name}: ${badge.desc}`}
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                  unlocked ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-400'
                }`}
              >
                <span className={unlocked ? '' : 'grayscale'}>{badge.emoji}</span>
                <span>{badge.name}</span>
              </div>
            );
          })}
        </div>
      </KangurPanel>
    </section>
  );
}
