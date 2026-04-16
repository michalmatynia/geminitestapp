'use client';

import React from 'react';
import { KangurPageIntroCard } from '@/features/kangur/ui/components/lesson-library/KangurPageIntroCard';
import { KangurStandardPageLayout } from '@/features/kangur/ui/components/KangurStandardPageLayout';
import { KangurTopNavigationController } from '@/features/kangur/ui/components/primary-navigation/KangurTopNavigationController';
import {
  KangurInfoCard,
  KangurButton,
  KangurSelectField,
  KangurStatusChip,
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
  DEFAULT_GAMES_LIBRARY_FILTERS,
  GAMES_LIBRARY_PANEL_SURFACE_CLASSNAME,
  GAMES_LIBRARY_PANEL_INSET_SURFACE_CLASSNAME,
  GAMES_LIBRARY_MAIN_ID,
  getGamesLibraryTabIds,
} from './GamesLibrary.utils';
import type { GamesLibraryTabId } from './GamesLibrary.filters';
import { useGamesLibraryState } from './GamesLibrary.hooks';
import { CatalogTab, StructureTab, RuntimeTab } from './GamesLibrary.tabs';
import { cn } from '@/features/kangur/shared/utils';
import {
  getLocalizedKangurAgeGroupLabel,
  getLocalizedKangurSubjectLabel,
} from '@/features/kangur/lessons/lesson-catalog-i18n';

import {
  GamesLibraryContext,
  useGamesLibraryContext,
  type GamesLibraryState,
} from './GamesLibrary.context';

function GamesLibraryProvider({ children }: { children: React.ReactNode }) {
  const state = useGamesLibraryState();
  return (
    <GamesLibraryContext.Provider value={state}>
      {children}
    </GamesLibraryContext.Provider>
  );
}

const createGamesLibraryNavigation = (
  state: GamesLibraryState
): React.ComponentProps<typeof KangurTopNavigationController>['navigation'] => ({
  basePath: state.basePath,
  canManageLearners: Boolean(state.user?.canManageLearners),
  currentPage: 'GamesLibrary',
  guestPlayerName: state.user ? undefined : state.guestPlayerName,
  isAuthenticated: Boolean(state.user),
  onGuestPlayerNameChange: state.user ? undefined : state.setGuestPlayerName,
  onLogin: state.openLoginModal,
  onLogout: () => state.logout(false),
});

const resolveGamesLibraryFilterSummary = (state: GamesLibraryState): string =>
  state.hasActiveFilters
    ? state.translations('filters.summaryFiltered', {
        visible: state.visibleGameCount,
        total: state.totalGameCount,
      })
    : state.translations('filters.summaryAll', { count: state.totalGameCount });

function GamesLibraryPageIntro(): React.JSX.Element {
  const { basePath, replaceRoute, translations } = useGamesLibraryContext();

  return (
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
  );
}

function GamesLibraryFilterSelects(): React.JSX.Element {
  const {
    catalogFacets,
    engineCatalogFilterOptions,
    filters,
    gameFilterOptions,
    locale,
    translations,
    updateFilter,
  } = useGamesLibraryContext();

  return (
    <div className='space-y-3'>
      <div className={cn(GAMES_LIBRARY_PANEL_INSET_SURFACE_CLASSNAME, 'space-y-4')}>
        <div className='text-[11px] font-bold uppercase tracking-[0.18em] [color:var(--kangur-page-muted-text)]'>
          {translations('tabs.catalog')}
        </div>
        <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-3'>
          <div className='min-w-0 space-y-1'>
            <div className='text-xs font-semibold uppercase tracking-[0.08em] [color:var(--kangur-page-muted-text)]'>
              {translations('filters.game.label')}
            </div>
            <KangurSelectField
              aria-label={translations('filters.game.aria')}
              value={filters.gameId}
              onChange={(event) => updateFilter('gameId', event.target.value)}
              size='sm'
              accent='slate'
            >
              <option value='all'>{translations('filters.game.all')}</option>
              {gameFilterOptions.map((game: { id: string; title: string }) => (
                <option key={game.id} value={game.id}>
                  {game.title}
                </option>
              ))}
            </KangurSelectField>
          </div>

          <div className='min-w-0 space-y-1'>
            <div className='text-xs font-semibold uppercase tracking-[0.08em] [color:var(--kangur-page-muted-text)]'>
              {translations('filters.subject.label')}
            </div>
            <KangurSelectField
              aria-label={translations('filters.subject.aria')}
              value={filters.subject}
              onChange={(event) =>
                updateFilter('subject', event.target.value as typeof filters.subject)
              }
              size='sm'
              accent='slate'
            >
              <option value='all'>{translations('filters.subject.all')}</option>
              {catalogFacets.subjects.map((subject) => (
                <option key={subject} value={subject}>
                  {getLocalizedKangurSubjectLabel(subject, locale, subject)}
                </option>
              ))}
            </KangurSelectField>
          </div>

          <div className='min-w-0 space-y-1'>
            <div className='text-xs font-semibold uppercase tracking-[0.08em] [color:var(--kangur-page-muted-text)]'>
              {translations('filters.ageGroup.label')}
            </div>
            <KangurSelectField
              aria-label={translations('filters.ageGroup.aria')}
              value={filters.ageGroup}
              onChange={(event) =>
                updateFilter('ageGroup', event.target.value as typeof filters.ageGroup)
              }
              size='sm'
              accent='slate'
            >
              <option value='all'>{translations('filters.ageGroup.all')}</option>
              {catalogFacets.ageGroups.map((ageGroup) => (
                <option key={ageGroup} value={ageGroup}>
                  {getLocalizedKangurAgeGroupLabel(ageGroup, locale, ageGroup)}
                </option>
              ))}
            </KangurSelectField>
          </div>

          <div className='min-w-0 space-y-1'>
            <div className='text-xs font-semibold uppercase tracking-[0.08em] [color:var(--kangur-page-muted-text)]'>
              {translations('filters.mechanic.label')}
            </div>
            <KangurSelectField
              aria-label={translations('filters.mechanic.aria')}
              value={filters.mechanic}
              onChange={(event) =>
                updateFilter('mechanic', event.target.value as typeof filters.mechanic)
              }
              size='sm'
              accent='slate'
            >
              <option value='all'>{translations('filters.mechanic.all')}</option>
              {catalogFacets.mechanics.map((mechanic) => (
                <option key={mechanic} value={mechanic}>
                  {translations(`mechanics.${mechanic}`)}
                </option>
              ))}
            </KangurSelectField>
          </div>

          <div className='min-w-0 space-y-1'>
            <div className='text-xs font-semibold uppercase tracking-[0.08em] [color:var(--kangur-page-muted-text)]'>
              {translations('filters.surface.label')}
            </div>
            <KangurSelectField
              aria-label={translations('filters.surface.aria')}
              value={filters.surface}
              onChange={(event) =>
                updateFilter('surface', event.target.value as typeof filters.surface)
              }
              size='sm'
              accent='slate'
            >
              <option value='all'>{translations('filters.surface.all')}</option>
              {catalogFacets.surfaces.map((surface) => (
                <option key={surface} value={surface}>
                  {translations(`surfaces.${surface}`)}
                </option>
              ))}
            </KangurSelectField>
          </div>

          <div className='min-w-0 space-y-1'>
            <div className='text-xs font-semibold uppercase tracking-[0.08em] [color:var(--kangur-page-muted-text)]'>
              {translations('filters.engine.label')}
            </div>
            <KangurSelectField
              aria-label={translations('filters.engine.aria')}
              value={filters.engineId}
              onChange={(event) => updateFilter('engineId', event.target.value)}
              size='sm'
              accent='slate'
            >
              <option value='all'>{translations('filters.engine.all')}</option>
              {engineCatalogFilterOptions.engines.map((engine) => (
                <option key={engine.id} value={engine.id}>
                  {engine.title}
                </option>
              ))}
            </KangurSelectField>
          </div>

          <div className='min-w-0 space-y-1'>
            <div className='text-xs font-semibold uppercase tracking-[0.08em] [color:var(--kangur-page-muted-text)]'>
              {translations('filters.launchability.label')}
            </div>
            <KangurSelectField
              aria-label={translations('filters.launchability.aria')}
              value={filters.launchability}
              onChange={(event) => updateFilter('launchability', event.target.value as 'all' | 'launchable')}
              size='sm'
              accent='slate'
            >
              <option value='all'>{translations('filters.launchability.all')}</option>
              <option value='launchable'>{translations('filters.launchability.launchable')}</option>
            </KangurSelectField>
          </div>
        </div>
      </div>
    </div>
  );
}

function GamesLibraryFiltersCard(): React.JSX.Element {
  const state = useGamesLibraryContext();

  return (
    <KangurInfoCard
      accent='amber'
      padding='lg'
      className='space-y-5 border-[color:var(--kangur-soft-card-border)] bg-[var(--kangur-soft-card-background,#ffffff)] [background:linear-gradient(145deg,color-mix(in_srgb,var(--kangur-soft-card-background)_98%,white)_0%,color-mix(in_srgb,var(--kangur-soft-card-background)_92%,var(--kangur-accent-amber-start,#fb923c))_100%)] shadow-[0_34px_90px_-56px_rgba(15,23,42,0.4)]'
    >
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div className='space-y-1'>
          <div className='text-xs font-semibold uppercase tracking-[0.18em] [color:var(--kangur-page-muted-text)]'>
            {state.translations('filters.eyebrow')}
          </div>
          <div className='text-2xl font-black [color:var(--kangur-page-text)]'>
            {state.translations('filters.title')}
          </div>
          <div className='text-sm [color:var(--kangur-page-muted-text)]'>
            {resolveGamesLibraryFilterSummary(state)}
          </div>
        </div>
        <KangurButton
          className='w-full sm:w-auto'
          type='button'
          size='sm'
          variant='surface'
          onClick={() =>
            state.applyFilters(
              DEFAULT_GAMES_LIBRARY_FILTERS,
              'kangur-games-library:filters:clear'
            )
          }
          disabled={!state.hasActiveFilters}
        >
          {state.translations('filters.clear')}
        </KangurButton>
      </div>

      {state.activeFilterBadges.length > 0 ? (
        <div className='flex flex-wrap gap-2'>
          {state.activeFilterBadges.map((badge) => (
            <KangurStatusChip key={badge.id} accent={badge.accent} size='sm'>
              {badge.label}: {badge.value}
            </KangurStatusChip>
          ))}
        </div>
      ) : null}

      <GamesLibraryFilterSelects />
    </KangurInfoCard>
  );
}

function GamesLibraryOverviewRail(): React.JSX.Element {
  const { orderedOverviewSections } = useGamesLibraryContext();

  return (
    <aside
      className={cn(
        `flex min-w-0 flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`,
        'xl:sticky xl:top-[calc(var(--kangur-top-bar-height,88px)+1rem)]'
      )}
    >
      <div data-testid='games-library-overview-rail' className='space-y-4'>
        {orderedOverviewSections.map((section) => (
          <React.Fragment key={section.id}>{section.node}</React.Fragment>
        ))}
      </div>
    </aside>
  );
}

function GamesLibraryFiltersSection(): React.JSX.Element {
  return (
    <section
      className={`grid items-start ${KANGUR_PANEL_GAP_CLASSNAME} xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]`}
    >
      <div className={`flex min-w-0 flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}>
        <GamesLibraryFiltersCard />
      </div>
      <GamesLibraryOverviewRail />
    </section>
  );
}

function GamesLibraryTabButtons(): React.JSX.Element {
  const {
    activeTab,
    availableTabs,
    handlePointerTabMouseDown,
    handleTabChange,
    handleTabKeyDown,
    tabRefs,
    translations,
  } = useGamesLibraryContext();

  return (
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
            onKeyDown={(event) => handleTabKeyDown(index, event)}
            onMouseDown={handlePointerTabMouseDown}
            role='tab'
            aria-selected={activeTab === tab.id}
            aria-controls={panelId}
            ref={(node) => {
              tabRefs.current[index] = node;
            }}
            type='button'
          >
            {translations(tab.labelKey)}
          </KangurButton>
        );
      })}
    </div>
  );
}

function GamesLibraryActiveTabContent(props: {
  onSelectGame: (
    game: NonNullable<GamesLibraryState['selectedGame']>,
    trigger?: HTMLElement | null
  ) => void;
}): React.JSX.Element | null {
  const { onSelectGame } = props;
  const state = useGamesLibraryContext();

  if (state.activeTab === 'catalog') {
    return (
      <CatalogTab
        setSelectedGame={onSelectGame}
      />
    );
  }

  if (state.activeTab === 'structure') {
    return (
      <StructureTab />
    );
  }

  return (
    <RuntimeTab />
  );
}

function GamesLibraryTabsSection(): React.JSX.Element {
  const state = useGamesLibraryContext();
  const selectedGameTriggerRef = React.useRef<HTMLElement | null>(null);

  const handleSelectGame = React.useCallback(
    (
      game: NonNullable<GamesLibraryState['selectedGame']>,
      trigger?: HTMLElement | null
    ) => {
      selectedGameTriggerRef.current = trigger ?? null;
      state.setSelectedGame(game);
    },
    [state]
  );

  const handleCloseSelectedGame = React.useCallback(() => {
    state.setSelectedGame(null);

    window.requestAnimationFrame(() => {
      selectedGameTriggerRef.current?.focus();
    });
  }, [state]);

  return (
    <section className={`flex w-full flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}>
      <div className={cn(GAMES_LIBRARY_PANEL_SURFACE_CLASSNAME, 'space-y-4')}>
        <div className='flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between'>
          <div className='w-full xl:max-w-4xl'>
            <GamesLibraryTabButtons />
          </div>
        </div>
      </div>

      <GamesLibraryActiveTabContent onSelectGame={handleSelectGame} />
      <GamesLibraryPreviewModal
        setSelectedGame={handleCloseSelectedGame}
      />
    </section>
  );
}

function GamesLibraryPreviewModal(props: {
  setSelectedGame: () => void;
}): React.JSX.Element {
  const { setSelectedGame } = props;
  const { basePath, selectedGame } = useGamesLibraryContext();

  return (
    <GamesLibraryGameModal
      basePath={basePath}
      game={selectedGame}
      onOpenChange={(open) => {
        if (!open) {
          setSelectedGame();
        }
      }}
      open={selectedGame !== null}
    />
  );
}

function GamesLibraryContent(): React.JSX.Element {
  const state = useGamesLibraryContext();

  useKangurRoutePageReady({
    pageKey: 'GamesLibrary',
    ready: true,
  });

  return (
    <KangurStandardPageLayout
      tone='learn'
      id='kangur-games-library-page'
      skipLinkTargetId={GAMES_LIBRARY_MAIN_ID}
      navigation={
        <KangurTopNavigationController
          navigation={createGamesLibraryNavigation(state)}
        />
      }
      containerProps={{
        as: 'section',
        id: GAMES_LIBRARY_MAIN_ID,
        className: cn('flex w-full flex-col', KANGUR_PANEL_GAP_CLASSNAME),
      }}
    >
      <GamesLibraryPageIntro />
      <GamesLibraryFiltersSection />
      <GamesLibraryTabsSection />
    </KangurStandardPageLayout>
  );
}

export default function GamesLibrary(): React.JSX.Element {
  const { canAccess, status } = useKangurPageAccess('GamesLibrary');
  if (status === 'loading') return <></>;
  if (!canAccess) return <PageNotFound />;
  return (
    <GamesLibraryProvider>
      <GamesLibraryContent />
    </GamesLibraryProvider>
  );
}
