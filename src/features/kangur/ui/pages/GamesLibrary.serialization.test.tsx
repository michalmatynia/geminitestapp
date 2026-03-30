/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createDefaultKangurGames,
  createKangurGameLibraryPageDataFromGames,
} from '@/features/kangur/games';

const {
  accessState,
  pageDataState,
  searchParamsState,
  replaceMock,
  useKangurGameLibraryPageMock,
} = vi.hoisted(() => ({
  accessState: {
    value: {
      canAccess: true,
      status: 'ready',
    } as {
      canAccess: boolean;
      status: 'loading' | 'ready';
    },
  },
  pageDataState: {
    value: null as ReturnType<typeof createKangurGameLibraryPageDataFromGames> | null,
  },
  searchParamsState: {
    value: new URLSearchParams(),
  },
  replaceMock: vi.fn(),
  useKangurGameLibraryPageMock: vi.fn(),
}));

const ALL_TEST_GAMES = createDefaultKangurGames();

const messageMap = {
  'KangurGamesLibraryPage.title': 'Games library',
  'KangurGamesLibraryPage.description': 'Shared games catalog.',
  'KangurGamesLibraryPage.introEyebrow': 'Shared games domain',
  'KangurGamesLibraryPage.filters.eyebrow': 'Classification controls',
  'KangurGamesLibraryPage.filters.title': 'Filter the catalog',
  'KangurGamesLibraryPage.filters.summaryAll': 'Showing {count} games from the shared catalog.',
  'KangurGamesLibraryPage.filters.summaryFiltered':
    'Showing {visible} of {total} games from the shared catalog.',
  'KangurGamesLibraryPage.filters.clear': 'Clear filters',
  'KangurGamesLibraryPage.filters.game.label': 'Game',
  'KangurGamesLibraryPage.filters.game.all': 'All games',
  'KangurGamesLibraryPage.tabs.eyebrow': 'Section layout',
  'KangurGamesLibraryPage.tabs.catalog': 'Catalog',
  'KangurGamesLibraryPage.tabs.structure': 'Structure',
  'KangurGamesLibraryPage.tabs.runtime': 'Runtime',
  'KangurGamesLibraryPage.tabs.description':
    'Switch between the game catalog, the shared structure view, and runtime serialization.',
  'KangurGamesLibraryPage.serializationAuditTitle': 'Runtime serialization',
  'KangurGamesLibraryPage.serializationAuditDescription':
    'Tracks runtime serialization coverage.',
} as const;

const translateMessage = (namespace: string | undefined, key: string): string =>
  messageMap[`${namespace}.${key}` as keyof typeof messageMap] ?? key;

vi.mock('next-intl', () => ({
  useLocale: () => 'en',
  useTranslations:
    (namespace?: string) =>
    (key: string, values?: Record<string, string | number>) => {
      const template = translateMessage(namespace, key);
      if (!values) {
        return template;
      }

      return Object.entries(values).reduce(
        (message, [token, value]) => message.replace(`{${token}}`, String(value)),
        template
      );
    },
}));

vi.mock('next/navigation', () => ({
  permanentRedirect: vi.fn(),
  redirect: vi.fn(),
  usePathname: () => '/games',
  useRouter: () => ({
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
    push: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
  }),
  useSearchParams: () => searchParamsState.value,
}));

vi.mock('@/features/kangur/config/routing', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/kangur/config/routing')>();

  return {
    ...actual,
    getKangurCanonicalPublicHref: () => '/games',
    getKangurPageSlug: () => 'games',
  };
});

vi.mock('@/features/kangur/ui/hooks/useKangurRouteNavigator', () => ({
  useKangurRouteNavigator: () => ({
    replace: replaceMock,
  }),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurRoutePageReady', () => ({
  useKangurRoutePageReady: () => undefined,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurPageAccess', () => ({
  useKangurPageAccess: () => accessState.value,
}));

vi.mock('@/features/kangur/ui/context/KangurRoutingContext', () => ({
  useKangurRouting: () => ({
    basePath: '/kangur',
    embedded: false,
    requestedHref: '/games',
  }),
  useOptionalKangurRouting: () => ({
    basePath: '/kangur',
    embedded: false,
    requestedHref: '/games',
  }),
}));

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useKangurAuth: () => ({
    user: {
      id: 'admin-1',
      role: 'super_admin',
      canManageLearners: true,
    },
    logout: vi.fn(),
  }),
  useOptionalKangurAuth: () => ({
    user: {
      id: 'admin-1',
      role: 'super_admin',
      canManageLearners: true,
    },
    logout: vi.fn(),
  }),
}));

vi.mock('@/features/kangur/ui/context/KangurGuestPlayerContext', () => ({
  useKangurGuestPlayer: () => ({
    guestPlayerName: 'Guest',
    setGuestPlayerName: vi.fn(),
  }),
}));

vi.mock('@/features/kangur/ui/context/KangurLoginModalContext', () => ({
  useKangurLoginModal: () => ({
    openLoginModal: vi.fn(),
  }),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurGameLibraryPage', () => ({
  useKangurGameLibraryPage: (...args: unknown[]) => {
    useKangurGameLibraryPageMock(...args);
    return {
      data: pageDataState.value,
      isError: false,
    };
  },
}));

vi.mock('@/features/kangur/ui/components/PageNotFound', () => ({
  PageNotFound: () => <div data-testid='kangur-page-not-found' />,
}));

vi.mock('@/features/kangur/ui/design/primitives', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/features/kangur/ui/design/primitives')>();

  return {
    ...actual,
    KangurButton: ({
      children,
      ...props
    }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
    KangurGlassPanel: ({
      children,
      ...props
    }: React.HTMLAttributes<HTMLElement>) => <section {...props}>{children}</section>,
    KangurInfoCard: ({
      children,
      ...props
    }: React.HTMLAttributes<HTMLElement>) => <section {...props}>{children}</section>,
    KangurSelectField: ({
      children,
      ...props
    }: React.SelectHTMLAttributes<HTMLSelectElement>) => <select {...props}>{children}</select>,
    KangurStatusChip: ({
      children,
      ...props
    }: React.HTMLAttributes<HTMLSpanElement>) => <span {...props}>{children}</span>,
  };
});

vi.mock('@/features/kangur/ui/components/KangurTopNavigationController', () => ({
  KangurTopNavigationController: () => <div data-testid='games-library-top-nav' />,
}));

vi.mock('@/features/kangur/ui/components/lesson-library/KangurPageIntroCard', () => ({
  KangurPageIntroCard: ({
    children,
    title,
    description,
  }: {
    children?: React.ReactNode;
    title: string;
    description?: string;
  }) => (
    <section data-testid='games-library-intro'>
      {children}
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
    </section>
  ),
}));

vi.mock('@/features/kangur/ui/components/KangurStandardPageLayout', () => ({
  KangurStandardPageLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid='games-library-layout'>{children}</div>
  ),
}));

vi.mock('@/features/kangur/ui/pages/GamesLibrary.tabs', () => ({
  CatalogTab: ({
    groupedGames,
    setSelectedGame,
  }: {
    groupedGames: Array<{ entries: Array<{ game: { title: string } }> }>;
    setSelectedGame: (
      game: { title: string },
      trigger?: HTMLElement | null
    ) => void;
  }) => (
    <div data-testid='games-library-catalog-tab'>
      {groupedGames.flatMap((group) => group.entries).map((entry) => (
        <button
          key={entry.game.title}
          onClick={(event) =>
            setSelectedGame(
              entry.game as { title: string },
              event.currentTarget
            )
          }
          type='button'
        >
          {entry.game.title}
        </button>
      ))}
    </div>
  ),
  StructureTab: () => <div data-testid='games-library-structure-tab'>Structure content</div>,
  RuntimeTab: ({
    serializationAudit,
    serializationAuditVisible,
  }: {
    serializationAudit: { explicitRuntimeVariantCount: number };
    serializationAuditVisible: boolean;
  }) =>
    serializationAuditVisible ? (
      <div data-testid='games-library-runtime-tab'>
        {serializationAudit.explicitRuntimeVariantCount}
      </div>
    ) : null,
}));

vi.mock('@/features/kangur/ui/pages/GamesLibraryGameModal', () => ({
  GamesLibraryGameModal: ({
    open,
    game,
    onOpenChange,
  }: {
    open: boolean;
    game: { title: string } | null;
    onOpenChange: (open: boolean) => void;
  }) =>
    open ? (
      <div data-testid='games-library-modal'>
        <div>{game?.title ?? 'No game'}</div>
        <button onClick={() => onOpenChange(false)} type='button'>
          Close modal
        </button>
      </div>
    ) : null,
}));

import GamesLibrary from '@/features/kangur/ui/pages/GamesLibrary';

const buildPageData = (filter?: Parameters<typeof createKangurGameLibraryPageDataFromGames>[0]['filter']) =>
  createKangurGameLibraryPageDataFromGames({
    ...(filter ? { filter } : {}),
    games: structuredClone(ALL_TEST_GAMES),
  });

describe('GamesLibrary page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    accessState.value = {
      canAccess: true,
      status: 'ready',
    };
    searchParamsState.value = new URLSearchParams();
    pageDataState.value = buildPageData();
  });

  it('renders nothing while route access is still loading and skips page data hooks', () => {
    accessState.value = {
      canAccess: false,
      status: 'loading',
    };

    const { container } = render(<GamesLibrary />);

    expect(container).toBeEmptyDOMElement();
    expect(useKangurGameLibraryPageMock).not.toHaveBeenCalled();
  });

  it('renders not found when access is denied', () => {
    accessState.value = {
      canAccess: false,
      status: 'ready',
    };

    render(<GamesLibrary />);

    expect(screen.getByTestId('kangur-page-not-found')).toBeInTheDocument();
    expect(useKangurGameLibraryPageMock).not.toHaveBeenCalled();
  });

  it('renders the catalog tab by default and keeps the active overview card first', () => {
    render(<GamesLibrary />);

    expect(screen.getByTestId('games-library-layout')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Catalog' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('games-library-catalog-tab')).toBeInTheDocument();
    expect(screen.getByTestId('games-library-overview-catalog')).toHaveAttribute(
      'data-active',
      'true'
    );
    expect(screen.getByTestId('games-library-overview-runtime')).toHaveAttribute(
      'data-active',
      'false'
    );
    expect(screen.getByTestId('games-library-overview-rail').firstElementChild).toHaveAttribute(
      'data-testid',
      'games-library-overview-catalog'
    );
  });

  it('opens the runtime tab from the route query and reorders the overview rail', () => {
    searchParamsState.value = new URLSearchParams('tab=runtime');

    render(<GamesLibrary />);

    expect(screen.getByRole('tab', { name: 'Runtime' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('games-library-runtime-tab')).toBeInTheDocument();
    expect(screen.getByTestId('games-library-overview-runtime')).toHaveAttribute(
      'data-active',
      'true'
    );
    expect(screen.getByTestId('games-library-overview-rail').firstElementChild).toHaveAttribute(
      'data-testid',
      'games-library-overview-runtime'
    );
  });

  it('writes the runtime tab into the route when the user switches tabs manually', () => {
    render(<GamesLibrary />);

    fireEvent.click(screen.getByRole('tab', { name: 'Runtime' }));

    expect(screen.getByRole('tab', { name: 'Runtime' })).toHaveAttribute('aria-selected', 'true');
    expect(replaceMock).toHaveBeenCalledWith('/games?tab=runtime', {
      pageKey: 'GamesLibrary',
      scroll: false,
      sourceId: 'kangur-games-library:tab:runtime',
    });
  });

  it('forces the catalog tab when an exact game deep link also requests runtime', async () => {
    searchParamsState.value = new URLSearchParams('gameId=division_groups&tab=runtime');
    pageDataState.value = buildPageData({ gameId: 'division_groups' });

    render(<GamesLibrary />);

    expect(screen.getByRole('tab', { name: 'Catalog' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Runtime' })).toHaveAttribute('aria-selected', 'false');
    await waitFor(() => {
      expect(useKangurGameLibraryPageMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          gameId: 'division_groups',
        })
      );
    });
  });

  it('updates the exact game filter in the route and page data query', async () => {
    render(<GamesLibrary />);

    fireEvent.change(screen.getAllByRole('combobox')[0], {
      target: { value: 'division_groups' },
    });

    await waitFor(() => {
      expect(useKangurGameLibraryPageMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          gameId: 'division_groups',
        })
      );
    });
    expect(replaceMock).toHaveBeenCalledWith('/games?gameId=division_groups', {
      pageKey: 'GamesLibrary',
      scroll: false,
      sourceId: 'kangur-games-library:filters:gameId',
    });
  });

  it('restores focus to the trigger after closing the preview modal', async () => {
    render(<GamesLibrary />);

    const firstGameTitle = ALL_TEST_GAMES[0]?.title ?? '';
    const firstGameButton = screen.getByRole('button', { name: firstGameTitle });

    firstGameButton.focus();
    expect(firstGameButton).toHaveFocus();

    fireEvent.click(firstGameButton);

    expect(screen.getByTestId('games-library-modal')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close modal' }));

    await waitFor(() => {
      expect(screen.queryByTestId('games-library-modal')).not.toBeInTheDocument();
      expect(firstGameButton).toHaveFocus();
    });
  });
});
