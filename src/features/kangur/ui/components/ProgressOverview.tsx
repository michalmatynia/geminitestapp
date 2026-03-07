import {
  KangurDisplayEmoji,
  KangurGlassPanel,
  KangurMetricCard,
  KangurProgressBar,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import type { KangurAccent } from '@/features/kangur/ui/design/tokens';
import LessonMasteryInsights from '@/features/kangur/ui/components/LessonMasteryInsights';
import { BADGES, getCurrentLevel, getNextLevel } from '@/features/kangur/ui/services/progress';
import type { KangurProgressState } from '@/features/kangur/ui/types';

type ProgressOverviewProps = {
  progress: KangurProgressState;
};

type ProgressStat = {
  accent: KangurAccent;
  label: string;
  value: number;
};

export default function ProgressOverview({ progress }: ProgressOverviewProps): React.JSX.Element {
  const {
    totalXp,
    badges = [],
    gamesPlayed,
    lessonsCompleted,
    perfectGames,
    operationsPlayed = [],
  } = progress;
  const currentLevel = getCurrentLevel(totalXp);
  const nextLevel = getNextLevel(totalXp);
  const xpIntoLevel = totalXp - currentLevel.minXp;
  const xpNeeded = nextLevel ? nextLevel.minXp - currentLevel.minXp : 1;
  const percent = nextLevel ? Math.min(100, Math.round((xpIntoLevel / xpNeeded) * 100)) : 100;

  const stats: ProgressStat[] = [
    { accent: 'indigo', label: 'Laczne XP', value: totalXp },
    { accent: 'violet', label: 'Poziom', value: currentLevel.level },
    { accent: 'sky', label: 'Rozegrane gry', value: gamesPlayed },
    {
      accent: 'amber',
      label: 'Idealne wyniki',
      value: perfectGames || 0,
    },
    {
      accent: 'emerald',
      label: 'Ukonczone lekcje',
      value: lessonsCompleted,
    },
    { accent: 'rose', label: 'Zdobyte odznaki', value: badges.length },
  ];

  return (
    <div className='flex flex-col gap-5'>
      <KangurGlassPanel
        className='flex flex-col gap-4 sm:flex-row sm:items-center'
        padding='lg'
        surface='mistStrong'
        variant='soft'
      >
        <KangurDisplayEmoji size='md'>🎖️</KangurDisplayEmoji>
        <div className='flex-1'>
          <div className='text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500'>
            Poziom i doswiadczenie
          </div>
          <p className={`mt-1 text-xl font-extrabold ${currentLevel.color}`}>{currentLevel.title}</p>
          <p className='mb-2 text-sm text-slate-500'>
            Poziom {currentLevel.level} · {totalXp} XP lacznie
          </p>
          <KangurProgressBar
            accent='indigo'
            animated
            data-testid='progress-overview-level-bar'
            size='md'
            value={percent}
          />
          <p className='mt-1 text-xs text-slate-500'>
            {nextLevel
              ? `Do poziomu ${nextLevel.level}: ${xpNeeded - xpIntoLevel} XP`
              : 'Osiagnieto maksymalny poziom!'}
          </p>
        </div>
      </KangurGlassPanel>

      <div className='grid grid-cols-2 sm:grid-cols-3 gap-3'>
        {stats.map((stat) => (
          <KangurMetricCard
            key={stat.label}
            accent={stat.accent}
            align='center'
            label={stat.label}
            value={stat.value}
          />
        ))}
      </div>

      <LessonMasteryInsights progress={progress} />

      {operationsPlayed.length > 0 && (
        <KangurGlassPanel padding='md' surface='solid' variant='subtle'>
          <p className='mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500'>
            Cwiczone operacje
          </p>
          <div className='flex flex-wrap gap-2'>
            {operationsPlayed.map((operation) => (
              <KangurStatusChip
                accent='indigo'
                key={operation}
                className='capitalize'
                data-testid={`progress-overview-operation-${operation}`}
              >
                {operation}
              </KangurStatusChip>
            ))}
          </div>
        </KangurGlassPanel>
      )}

      <KangurGlassPanel padding='md' surface='solid' variant='subtle'>
        <p className='mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500'>
          Odznaki
        </p>
        <div className='flex flex-wrap gap-2'>
          {BADGES.map((badge) => {
            const unlocked = badges.includes(badge.id);
            return (
              <KangurStatusChip
                accent={unlocked ? 'amber' : 'slate'}
                key={badge.id}
                className={unlocked ? 'gap-1.5' : 'gap-1.5 opacity-70'}
                title={badge.desc}
                data-testid={`progress-overview-badge-${badge.id}`}
              >
                <span className={unlocked ? '' : 'grayscale'}>{badge.emoji}</span>
                <span>{badge.name}</span>
              </KangurStatusChip>
            );
          })}
        </div>
      </KangurGlassPanel>
    </div>
  );
}
