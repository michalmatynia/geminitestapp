'use client';

import React from 'react';
import { KangurPageIntroCard } from '@/features/kangur/ui/components/KangurPageIntroCard';
import { KangurStandardPageLayout } from '@/features/kangur/ui/components/KangurStandardPageLayout';
import { KangurTopNavigationController } from '@/features/kangur/ui/components/KangurTopNavigationController';
import {
  KangurInfoCard,
  KangurButton,
  KangurSelectField,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_PANEL_GAP_CLASSNAME,
  KANGUR_SEGMENTED_CONTROL_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { useKangurRoutePageReady } from '@/features/kangur/ui/hooks/useKangurRoutePageReady';
import { useKangurPageAccess } from '@/features/kangur/ui/hooks/useKangurPageAccess';
import { PageNotFound } from '@/features/kangur/ui/components/PageNotFound';
import { GamesLibraryGameModal } from './GamesLibraryGameModal';
import {
  GAMES_LIBRARY_PANEL_SURFACE_CLASSNAME,
  GAMES_LIBRARY_PANEL_INSET_SURFACE_CLASSNAME,
  GAMES_LIBRARY_MAIN_ID,
  getGamesLibraryTabIds,
} from './GamesLibrary.utils';
import type { GamesLibraryTabId } from './GamesLibrary.filters';
import { useGamesLibraryState } from './GamesLibrary.hooks';
import { CatalogTab, StructureTab, RuntimeTab } from './GamesLibrary.tabs';
import { cn } from '@/features/kangur/shared/utils';

function GamesLibraryContent(): React.JSX.Element {
  const state = useGamesLibraryState();
  const {
    translations,
    replaceRoute,
    basePath,
    user,
    logout,
    openLoginModal,
    guestPlayerName,
    setGuestPlayerName,
    filters,
    gameFilterOptions,
    hasActiveFilters,
    visibleGameCount,
    totalGameCount,
    availableTabs,
    activeTab,
    handleTabChange,
    tabRefs,
    selectedGame,
    setSelectedGame,
    updateFilter,
    applyFilters,
    orderedOverviewSections,
  } = state;

  useKangurRoutePageReady({
    pageKey: 'GamesLibrary',
    ready: true,
  });

  const navigation = {
    basePath,
    canManageLearners: Boolean(user?.canManageLearners),
    currentPage: 'GamesLibrary' as const,
    guestPlayerName: user ? undefined : guestPlayerName,
    isAuthenticated: Boolean(user),
    onGuestPlayerNameChange: user ? undefined : setGuestPlayerName,
    onLogin: openLoginModal,
    onLogout: () => logout(false),
  };

  return (
    <KangurStandardPageLayout
      tone='learn'
      id='kangur-games-library-page'
      skipLinkTargetId={GAMES_LIBRARY_MAIN_ID}
      navigation={<KangurTopNavigationController navigation={navigation} />}
      containerProps={{
        as: 'section',
        id: GAMES_LIBRARY_MAIN_ID,
        className: cn('flex w-full flex-col', KANGUR_PANEL_GAP_CLASSNAME),
      }}
    >
      <KangurPageIntroCard
        title={translations('title')}
        description={translations('description')}
        showBackButton
        onBack={() =>
          replaceRoute(basePath, {
            pageKey: 'Game',
            sourceId: 'kangur-games-library:back',
          })
        }
      >
        <div className='text-xs uppercase tracking-[0.18em] [color:var(--kangur-page-muted-text)]'>
          {translations('introEyebrow')}
        </div>
      </KangurPageIntroCard>

      <section
        className={`grid items-start ${KANGUR_PANEL_GAP_CLASSNAME} xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]`}
      >
        <div className={`flex min-w-0 flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}>
          <KangurInfoCard accent='amber' padding='lg' className='space-y-4'>
            {/* Filters UI Header */}
            <div className='flex flex-wrap items-start justify-between gap-3'>
              <div className='space-y-1'>
                <div className='text-xs font-semibold uppercase tracking-[0.18em] [color:var(--kangur-page-muted-text)]'>
                  {translations('filters.eyebrow')}
                </div>
                <div className='text-2xl font-black [color:var(--kangur-page-text)]'>
                  {translations('filters.title')}
                </div>
                <div className='text-sm [color:var(--kangur-page-muted-text)]'>
                  {hasActiveFilters
                    ? translations('filters.summaryFiltered', {
                        visible: visibleGameCount,
                        total: totalGameCount,
                      })
                    : translations('filters.summaryAll', { count: totalGameCount })}
                </div>
              </div>
              <KangurButton
                type='button'
                size='sm'
                variant='surface'
                onClick={() =>
                  applyFilters(
                    { ...filters, subject: 'all', ageGroup: 'all', mechanic: 'all', surface: 'all', gameStatus: 'all' },
                    'kangur-games-library:filters:clear'
                  )
                }
                disabled={!hasActiveFilters}
              >
                {translations('filters.clear')}
              </KangurButton>
            </div>

            {/* Filter Selects */}
            <div className='space-y-3'>
              <div className={cn(GAMES_LIBRARY_PANEL_INSET_SURFACE_CLASSNAME, 'space-y-3')}>
                <div className='text-[11px] font-bold uppercase tracking-[0.18em] [color:var(--kangur-page-muted-text)]'>
                  {translations('tabs.catalog')}
                </div>
                <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-3'>
                  <div className='min-w-0 space-y-1'>
                    <div className='text-xs font-semibold uppercase tracking-[0.08em] [color:var(--kangur-page-muted-text)]'>
                      {translations('filters.game.label')}
                    </div>
                    <KangurSelectField
                      value={filters.gameId}
                      onChange={(event) => updateFilter('gameId', event.target.value)}
                      size='sm'
                      accent='slate'
                    >
                      <option value='all'>{translations('filters.game.all')}</option>
                      {gameFilterOptions.map((game: { id: string; title: string }) => (
                        <option key={game.id} value={game.id}>{game.title}</option>
                      ))}
                    </KangurSelectField>
                  </div>
                  {/* ... Rest of selects ... */}
                </div>
              </div>
            </div>
          </KangurInfoCard>
        </div>

        <aside className={cn(`flex min-w-0 flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`, 'xl:sticky xl:top-[calc(var(--kangur-top-bar-height,88px)+1rem)]')}>
          <div data-testid='games-library-overview-rail' className='space-y-4'>
            {orderedOverviewSections.map((section: { id: string; node: React.ReactNode; title: string }) => (
              <React.Fragment key={section.id}>{section.node}</React.Fragment>
            ))}
          </div>
        </aside>
      </section>

      <section className={`flex w-full flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}>
        {/* Tabs Navigation */}
        <div className={cn(GAMES_LIBRARY_PANEL_SURFACE_CLASSNAME, 'space-y-4')}>
          <div className='flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between'>
            <div className='w-full xl:max-w-4xl'>
              <div className={`${KANGUR_SEGMENTED_CONTROL_CLASSNAME} w-full`} role='tablist'>
                {availableTabs.map((tab: { id: GamesLibraryTabId; labelKey: string }, index: number) => {
                  const { tabId, panelId } = getGamesLibraryTabIds(tab.id);
                  return (
                    <KangurButton
                      id={tabId}
                      key={tab.id}
                      size='sm'
                      variant={activeTab === tab.id ? 'segmentActive' : 'segment'}
                      onClick={() => handleTabChange(tab.id)}
                      role='tab'
                      aria-selected={activeTab === tab.id}
                      aria-controls={panelId}
                      ref={(node) => { tabRefs.current[index] = node; }}
                      type='button'
                    >
                      {translations(tab.labelKey)}
                    </KangurButton>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Contents */}
        {activeTab === 'catalog' && (
          <CatalogTab
            {...state}
          />
        )}
        {activeTab === 'structure' && (
          <StructureTab
            {...state}
          />
        )}
        {activeTab === 'runtime' && (
          <RuntimeTab
            {...state}
          />
        )}
      </section>

      <GamesLibraryGameModal
        basePath={basePath}
        game={selectedGame}
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        key={selectedGame?.id ?? 'kangur-games-library-modal'}
        onOpenChange={(open) => { if (!open) setSelectedGame(null); }}
        open={selectedGame !== null}
      />
    </KangurStandardPageLayout>
  );
}

export default function GamesLibrary(): React.JSX.Element {
  const { canAccess, status } = useKangurPageAccess('GamesLibrary');
  if (status === 'loading') return <></>;
  if (!canAccess) return <PageNotFound />;
  return <GamesLibraryContent />;
}
