'use client';

import { Trophy, User, Ghost } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  KangurButton,
  KangurEmptyState,
  KangurGlassPanel,
  KangurIconBadge,
  KangurInfoCard,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_CENTER_ROW_CLASSNAME,
  KANGUR_PANEL_ROW_CLASSNAME,
  KANGUR_SEGMENTED_CONTROL_CLASSNAME,
  KANGUR_STACK_COMPACT_CLASSNAME,
  KANGUR_STACK_TIGHT_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import {
  useKangurLeaderboardState,
  type KangurLeaderboardUserFilterIcon,
} from '@/features/kangur/ui/hooks/useKangurLeaderboardState';
import { useKangurIdleReady } from '@/features/kangur/ui/hooks/useKangurIdleReady';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';
import {
  GAME_HOME_LEADERBOARD_SHELL_CLASSNAME,
  GAME_HOME_SECONDARY_DATA_IDLE_DELAY_MS,
} from '@/features/kangur/ui/pages/GameHome.constants';

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
  const translations = useTranslations('KangurGameWidgets.leaderboard');
  const isCoarsePointer = useKangurCoarsePointer();
  const isLeaderboardIdleReady = useKangurIdleReady({
    minimumDelayMs: GAME_HOME_SECONDARY_DATA_IDLE_DELAY_MS,
  });
  const { entry: leaderboardContent } = useKangurPageContentEntry(
    'game-home-leaderboard',
    undefined,
    {
      enabled: isLeaderboardIdleReady,
    }
  );
  const { emptyStateLabel, items, loading: isLeaderboardLoading, operationFilters, userFilters } =
    useKangurLeaderboardState({ enabled: isLeaderboardIdleReady });
  const loading = !isLeaderboardIdleReady || isLeaderboardLoading;
  const segmentedItemClassName = isCoarsePointer
    ? 'min-h-12 min-w-[4.75rem] flex-1 justify-center px-4 text-xs touch-manipulation select-none active:scale-[0.985] sm:flex-none'
    : 'h-10 flex-1 justify-center px-3 text-xs sm:flex-none';

  return (
    <KangurGlassPanel
      className={GAME_HOME_LEADERBOARD_SHELL_CLASSNAME}
      data-testid='leaderboard-shell'
      padding='lg'
      surface='solid'
      variant='soft'
    >
      <div className={`mb-4 ${KANGUR_CENTER_ROW_CLASSNAME}`}>
        <Trophy className='text-amber-400 w-6 h-6 flex-shrink-0' aria-hidden='true' />
        <h3 className='break-words text-lg font-extrabold [color:var(--kangur-page-text)] sm:text-xl'>
          {leaderboardContent?.title ?? translations('title')}
        </h3>
      </div>

      <div className={`mb-4 ${KANGUR_STACK_TIGHT_CLASSNAME}`}>
        <div
          className={`${KANGUR_SEGMENTED_CONTROL_CLASSNAME} w-full sm:w-auto sm:flex-wrap sm:justify-start`}
          data-testid='leaderboard-operation-filter-group'
        >
          {operationFilters.map((filter) => (
            <KangurButton
              key={filter.id}
              type='button'
              onClick={filter.select}
              aria-pressed={filter.selected}
              aria-label={filter.label}
              className={segmentedItemClassName}
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
          className={`${KANGUR_SEGMENTED_CONTROL_CLASSNAME} w-full sm:w-auto sm:flex-wrap sm:justify-start`}
          data-testid='leaderboard-user-filter-group'
        >
          {userFilters.map((filter) => (
            <KangurButton
              key={filter.id}
              type='button'
              onClick={filter.select}
              aria-pressed={filter.selected}
              className={segmentedItemClassName}
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
          description={translations('loadingDescription')}
          title={translations('loadingTitle')}
          role='status'
          aria-live='polite'
          aria-atomic='true'
        />
      ) : items.length === 0 ? (
        <KangurEmptyState
          accent='slate'
          align='center'
          data-testid='leaderboard-empty'
          description={translations('emptyDescription')}
          title={emptyStateLabel}
        />
      ) : (
        <div className={KANGUR_STACK_COMPACT_CLASSNAME}>
          {items.map((item) => {
            return (
              <KangurInfoCard
                accent={item.isCurrentUser ? 'indigo' : 'slate'}
                className={`${KANGUR_PANEL_ROW_CLASSNAME} items-start sm:items-center p-3`}
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
                        title={translations('account.registered')}
                      >
                        <User aria-hidden='true' className='w-3 h-3' />
                      </KangurIconBadge>
                    ) : (
                      <KangurIconBadge
                        accent='slate'
                        data-testid={`leaderboard-account-icon-${item.id}`}
                        size='sm'
                        title={translations('account.anonymous')}
                      >
                        <Ghost aria-hidden='true' className='w-3 h-3' />
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
