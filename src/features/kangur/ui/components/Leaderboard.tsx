import { Trophy, User, Ghost } from 'lucide-react';

import {
  KangurButton,
  KangurEmptyState,
  KangurGlassPanel,
  KangurIconBadge,
  KangurInfoCard,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import { KANGUR_SEGMENTED_CONTROL_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import {
  useKangurLeaderboardState,
  type KangurLeaderboardUserFilterIcon,
} from '@/features/kangur/ui/hooks/useKangurLeaderboardState';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';

const renderUserFilterIcon = (icon: KangurLeaderboardUserFilterIcon): React.ReactNode => {
  if (icon === 'user') {
    return <User className='w-3 h-3' aria-hidden='true' />;
  }

  if (icon === 'ghost') {
    return <Ghost className='w-3 h-3' aria-hidden='true' />;
  }

  return null;
};

export default function Leaderboard(): React.JSX.Element {
  const { entry: leaderboardContent } = useKangurPageContentEntry('game-home-leaderboard');
  const { emptyStateLabel, items, loading, operationFilters, userFilters } =
    useKangurLeaderboardState();

  return (
    <KangurGlassPanel
      className='w-full max-w-lg shadow-[0_18px_40px_-30px_rgba(168,175,216,0.2)]'
      data-testid='leaderboard-shell'
      padding='lg'
      surface='solid'
      variant='soft'
    >
      <div className='mb-4 flex items-center gap-2'>
        <Trophy className='text-amber-400 w-6 h-6 flex-shrink-0' aria-hidden='true' />
        <h3 className='break-words text-lg font-extrabold [color:var(--kangur-page-text)] sm:text-xl'>
          {leaderboardContent?.title ?? 'Najlepsze wyniki'}
        </h3>
      </div>

      <div className='mb-4 flex flex-col gap-2'>
        <div
          className={`${KANGUR_SEGMENTED_CONTROL_CLASSNAME} flex-wrap justify-start sm:w-auto`}
          data-testid='leaderboard-operation-filter-group'
        >
          {operationFilters.map((filter) => (
            <KangurButton
              key={filter.id}
              type='button'
              onClick={filter.select}
              aria-pressed={filter.selected}
              aria-label={filter.label}
              className='h-10 flex-1 justify-center px-3 text-xs sm:flex-none'
              data-testid={`leaderboard-operation-filter-${filter.id}`}
              size='sm'
              variant={filter.selected ? 'segmentActive' : 'segment'}
            >
              <span aria-hidden='true' className='text-base'>
                {filter.displayLabel.split(' ')[0]}
              </span>
              <span className='hidden sm:inline'>{filter.label}</span>
            </KangurButton>
          ))}
        </div>

        <div
          className={`${KANGUR_SEGMENTED_CONTROL_CLASSNAME} flex-wrap justify-start sm:w-auto`}
          data-testid='leaderboard-user-filter-group'
        >
          {userFilters.map((filter) => (
            <KangurButton
              key={filter.id}
              type='button'
              onClick={filter.select}
              aria-pressed={filter.selected}
              className='h-10 flex-1 justify-center px-3 text-xs sm:flex-none'
              data-testid={`leaderboard-user-filter-${filter.id}`}
              size='sm'
              variant={filter.selected ? 'segmentActive' : 'segment'}
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
          description='Pobieramy najnowsze wyniki uczniów.'
          title='Ładowanie...'
          role='status'
          aria-live='polite'
          aria-atomic='true'
        />
      ) : items.length === 0 ? (
        <KangurEmptyState
          accent='slate'
          align='center'
          data-testid='leaderboard-empty'
          description='Zmień filtr albo wróć później, gdy pojawia się nowe podejścia.'
          title={emptyStateLabel}
        />
      ) : (
        <div className='flex flex-col gap-1'>
          {items.map((item) => {
            return (
              <KangurInfoCard
                accent={item.isCurrentUser ? 'indigo' : 'slate'}
                className='flex flex-col items-start gap-3 p-3 sm:flex-row sm:items-center sm:gap-3'
                data-testid={`leaderboard-row-${item.id}`}
                key={item.id}
                padding='sm'
                tone={item.isCurrentUser ? 'accent' : 'neutral'}
              >
                <span className='text-xl w-7 text-center flex-shrink-0' data-testid={`leaderboard-rank-${item.id}`}>
                  {item.isMedal ? (
                    item.rankLabel
                  ) : (
                    <span className='break-words text-sm font-bold [color:var(--kangur-page-muted-text)]'>
                      {item.rankLabel}
                    </span>
                  )}
                </span>

                <div className='flex-1 min-w-0'>
                  <div className='flex items-center gap-1 flex-wrap'>
                    <span className='max-w-[120px] truncate font-bold [color:var(--kangur-page-text)] sm:max-w-none'>
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
                  <div className='break-words text-xs [color:var(--kangur-page-muted-text)]'>
                    {item.operationEmoji} {item.operationLabel}
                  </div>
                </div>

                <div className='w-full flex-shrink-0 text-left sm:w-auto sm:text-right'>
                  <div className='break-words text-sm font-extrabold text-indigo-700 sm:text-base'>
                    {item.scoreLabel}
                  </div>
                  <div className='break-words text-xs [color:var(--kangur-page-muted-text)]'>
                    {item.timeLabel}
                  </div>
                  {item.xpLabel ? (
                    <div
                      className='break-words text-[11px] font-semibold text-violet-600'
                      data-testid={`leaderboard-xp-${item.id}`}
                    >
                      {item.xpLabel}
                    </div>
                  ) : null}
                </div>
              </KangurInfoCard>
            );
          })}
        </div>
      )}
    </KangurGlassPanel>
  );
}
