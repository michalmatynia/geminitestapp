import {
  KangurMetricCard,
  KangurPanel,
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
      <KangurPanel className='flex items-center gap-4' padding='lg' variant='soft'>
        <div className='text-5xl'>🎖️</div>
        <div className='flex-1'>
          <p className={`font-extrabold text-xl ${currentLevel.color}`}>{currentLevel.title}</p>
          <p className='text-sm text-gray-400 mb-2'>
            Poziom {currentLevel.level} · {totalXp} XP lacznie
          </p>
          <KangurProgressBar
            accent='indigo'
            animated
            data-testid='progress-overview-level-bar'
            size='md'
            value={percent}
          />
          <p className='text-xs text-gray-400 mt-1'>
            {nextLevel
              ? `Do poziomu ${nextLevel.level}: ${xpNeeded - xpIntoLevel} XP`
              : 'Osiagnieto maksymalny poziom!'}
          </p>
        </div>
      </KangurPanel>

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
        <KangurPanel padding='md' variant='soft'>
          <p className='text-sm font-bold text-gray-500 uppercase tracking-wide mb-3'>
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
        </KangurPanel>
      )}

      <KangurPanel padding='md' variant='soft'>
        <p className='text-sm font-bold text-gray-500 uppercase tracking-wide mb-3'>Odznaki</p>
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
      </KangurPanel>
    </div>
  );
}
