'use client';

import { Trophy, User, Ghost } from 'lucide-react';

import {
  KangurButton,
  KangurEmptyState,
  KangurIconBadge,
  KangurInfoCard,
  KangurPanel,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import {
  useKangurLeaderboardState,
  type KangurLeaderboardUserFilterIcon,
} from '@/features/kangur/ui/hooks/useKangurLeaderboardState';

const renderUserFilterIcon = (icon: KangurLeaderboardUserFilterIcon): React.ReactNode => {
  if (icon === 'user') {
    return <User className='w-3 h-3' />;
  }

  if (icon === 'ghost') {
    return <Ghost className='w-3 h-3' />;
  }

  return null;
};

export default function Leaderboard(): React.JSX.Element {
  const { emptyStateLabel, items, loading, operationFilters, userFilters } =
    useKangurLeaderboardState();

  return (
    <KangurPanel
      className='w-full max-w-lg'
      data-testid='leaderboard-shell'
      padding='lg'
      variant='elevated'
    >
      <div className='flex items-center gap-2 mb-4'>
        <Trophy className='text-yellow-400 w-6 h-6 flex-shrink-0' />
        <h3 className='text-xl font-extrabold text-gray-800'>Najlepsze wyniki</h3>
      </div>

      <div className='flex flex-col gap-2 mb-4'>
        <div className='flex flex-wrap gap-2'>
          {operationFilters.map((filter) => (
            <KangurButton
              key={filter.id}
              type='button'
              onClick={filter.select}
              aria-pressed={filter.selected}
              className='h-9 px-3 text-xs'
              data-testid={`leaderboard-operation-filter-${filter.id}`}
              size='sm'
              variant={filter.selected ? 'surface' : 'secondary'}
            >
              {filter.displayLabel}
            </KangurButton>
          ))}
        </div>

        <div className='flex flex-wrap gap-2'>
          {userFilters.map((filter) => (
            <KangurButton
              key={filter.id}
              type='button'
              onClick={filter.select}
              aria-pressed={filter.selected}
              className='h-9 px-3 text-xs'
              data-testid={`leaderboard-user-filter-${filter.id}`}
              size='sm'
              variant={filter.selected ? 'surface' : 'secondary'}
            >
              {renderUserFilterIcon(filter.icon)}
              {filter.label}
            </KangurButton>
          ))}
        </div>
      </div>

      {loading ? (
        <KangurEmptyState
          accent='slate'
          align='center'
          data-testid='leaderboard-loading'
          description='Pobieramy najnowsze wyniki uczniow.'
          title='Ladowanie...'
        />
      ) : items.length === 0 ? (
        <KangurEmptyState
          accent='slate'
          align='center'
          data-testid='leaderboard-empty'
          description='Zmien filtr albo wroc pozniej, gdy pojawia sie nowe podejscia.'
          title={emptyStateLabel}
        />
      ) : (
        <div className='flex flex-col gap-1'>
          {items.map((item) => {
            return (
              <KangurInfoCard
                accent={item.isCurrentUser ? 'indigo' : 'slate'}
                className='flex items-center gap-2 p-2 sm:gap-3'
                data-testid={`leaderboard-row-${item.id}`}
                key={item.id}
                padding='sm'
                tone={item.isCurrentUser ? 'accent' : 'neutral'}
              >
                <span className='text-xl w-7 text-center flex-shrink-0' data-testid={`leaderboard-rank-${item.id}`}>
                  {item.isMedal ? (
                    item.rankLabel
                  ) : (
                    <span className='text-sm font-bold text-gray-400'>{item.rankLabel}</span>
                  )}
                </span>

                <div className='flex-1 min-w-0'>
                  <div className='flex items-center gap-1 flex-wrap'>
                    <span className='font-bold text-gray-700 truncate max-w-[120px] sm:max-w-none'>
                      {item.playerName}
                    </span>
                    {item.isRegistered ? (
                      <KangurIconBadge
                        accent='indigo'
                        data-testid={`leaderboard-account-icon-${item.id}`}
                        size='sm'
                        title='Zalogowany'
                      >
                        <User className='w-3 h-3' />
                      </KangurIconBadge>
                    ) : (
                      <KangurIconBadge
                        accent='slate'
                        data-testid={`leaderboard-account-icon-${item.id}`}
                        size='sm'
                        title='Anonim'
                      >
                        <Ghost className='w-3 h-3' />
                      </KangurIconBadge>
                    )}
                    {item.isCurrentUser && (
                      <KangurStatusChip
                        accent='indigo'
                        data-testid={`leaderboard-current-user-badge-${item.id}`}
                        size='sm'
                      >
                        {item.currentUserBadgeLabel}
                      </KangurStatusChip>
                    )}
                  </div>
                  <div className='text-xs text-gray-400'>
                    {item.operationEmoji} {item.operationLabel}
                  </div>
                </div>

                <div className='text-right flex-shrink-0'>
                  <div className='font-extrabold text-indigo-600 text-sm sm:text-base'>
                    {item.scoreLabel}
                  </div>
                  <div className='text-xs text-gray-400'>{item.timeLabel}</div>
                </div>
              </KangurInfoCard>
            );
          })}
        </div>
      )}
    </KangurPanel>
  );
}
