/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildKangurEmbeddedBasePath } from '@/shared/lib/kangur-bridge';

const { kangurAdapterTestDouble, sessionMock, usePathnameMock, useSearchParamsMock } = vi.hoisted(() => ({
  kangurAdapterTestDouble: {
    KANGUR_EMBED_QUERY_PARAM: 'kangur',
    KANGUR_MAIN_PAGE_KEY: 'Game',
    KANGUR_PAGE_TO_SLUG: Object.freeze({
      Game: 'game',
      GamesLibrary: 'games',
      LearnerProfile: 'profile',
      Lessons: 'lessons',
      Tests: 'tests',
      ParentDashboard: 'parent-dashboard',
    }),
    buildKangurEmbeddedBasePath: (hostPath: string, scopeKey?: string): string => {
      const normalizedHostPath = hostPath.startsWith('/') ? hostPath : `/${hostPath}`;
      return scopeKey
        ? `__kangur_embed__:${scopeKey}::${normalizedHostPath}`
        : `__kangur_embed__:${normalizedHostPath}`;
    },
    getKangurInternalQueryParamKeys: (basePath?: string): string[] => {
      const scopeMatch = basePath?.match(/^__kangur_embed__:([^:]+)::/);
      const scopedBaseKey = scopeMatch ? `kangur-${scopeMatch[1]}` : 'kangur';

      if (!scopeMatch) {
        return [
          scopedBaseKey,
          'focus',
          'quickStart',
          'operation',
          'difficulty',
          'categories',
          'count',
        ];
      }

      return [
        scopedBaseKey,
        `${scopedBaseKey}-focus`,
        `${scopedBaseKey}-quickStart`,
        `${scopedBaseKey}-operation`,
        `${scopedBaseKey}-difficulty`,
        `${scopedBaseKey}-categories`,
        `${scopedBaseKey}-count`,
      ];
    },
    getKangurPageSlug: (pageName: string): string => {
      return (
        {
          Game: 'game',
          GamesLibrary: 'games',
          LearnerProfile: 'profile',
          Lessons: 'lessons',
          Tests: 'tests',
          ParentDashboard: 'parent-dashboard',
        }[pageName] ?? pageName
      );
    },
    readKangurUrlParam: (
      searchParams: URLSearchParams,
      key: string,
      basePath?: string
    ): string | null => {
      const scopeMatch = basePath?.match(/^__kangur_embed__:([^:]+)::/);
      const scopedKey = scopeMatch
        ? `kangur-${scopeMatch[1]}${key === 'kangur' ? '' : `-${key}`}`
        : key;
      const scopedValue = searchParams.get(scopedKey);
      if (scopedValue !== null) {
        return scopedValue;
      }
      return scopeMatch ? searchParams.get(key) : null;
    },
  },
  sessionMock: vi.fn(),
  usePathnameMock: vi.fn(),
  useSearchParamsMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: usePathnameMock,
  useSearchParams: useSearchParamsMock,
}));

vi.mock('@/features/kangur/ui/hooks/useOptionalNextAuthSession', () => ({
  useOptionalNextAuthSession: () => sessionMock(),
}));

vi.mock('@/shared/lib/kangur-bridge', async () => {
  return {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    ...kangurAdapterTestDouble,
    KangurFeaturePage: ({
      slug,
      basePath,
      embedded,
    }: {
      slug?: string[];
      basePath?: string;
      embedded?: boolean;
    }) => (
      <div
        data-testid='kangur-feature-page'
        data-base-path={basePath ?? ''}
        data-embedded={String(Boolean(embedded))}
        data-slug={JSON.stringify(slug ?? [])}
      />
    ),
  };
});

import { AppEmbedBlock } from '@/features/cms/components/frontend/blocks/AppEmbedBlock';
import {
  BlockRenderContext,
  BlockSettingsContext,
} from '@/features/cms/components/frontend/blocks/BlockContext';

function renderAppEmbedBlock(settings: Record<string, unknown>, blockId = 'app-embed-a') {
  return render(
    <BlockRenderContext.Provider
      value={{
        block: { id: blockId, type: 'AppEmbed', settings },
        mediaStyles: null,
        stretch: false,
      }}
    >
      <BlockSettingsContext.Provider value={settings}>
        <AppEmbedBlock />
      </BlockSettingsContext.Provider>
    </BlockRenderContext.Provider>
  );
}

describe('AppEmbedBlock', () => {
  beforeEach(() => {
    usePathnameMock.mockReturnValue('/home');
    useSearchParamsMock.mockReturnValue(new URLSearchParams('preview=1'));
    sessionMock.mockReturnValue({
      data: null,
      status: 'unauthenticated',
    });
  });

  it('renders iframe embeds for iframe-based app embeds', () => {
    renderAppEmbedBlock({
      appId: 'chatbot',
      title: 'Chatbot',
      embedUrl: 'https://example.com/chatbot',
      height: 480,
    });

    expect(screen.getByTitle('Chatbot')).toHaveAttribute('src', 'https://example.com/chatbot');
  });

  it('renders Kangur as an internal app mount on the current cms page', () => {
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams('preview=1&kangur-app-embed-a=parent-dashboard')
    );

    renderAppEmbedBlock({
      appId: 'kangur',
      title: 'Kangur Home',
      entryPage: 'Lessons',
      basePath: '',
      height: 640,
    });

    const mount = screen.getByTestId('kangur-feature-page');
    expect(mount).toHaveAttribute(
      'data-base-path',
      buildKangurEmbeddedBasePath('/home?preview=1', 'app-embed-a')
    );
    expect(mount).toHaveAttribute('data-embedded', 'true');
    expect(mount).toHaveAttribute('data-slug', '["parent-dashboard"]');
  });

  it('keeps a custom host-page override for internal app mounts', () => {
    renderAppEmbedBlock({
      appId: 'kangur',
      title: 'Kangur Home',
      entryPage: 'Lessons',
      basePath: '/landing?preview=1',
      height: 640,
    });

    expect(screen.getByTestId('kangur-feature-page')).toHaveAttribute(
      'data-base-path',
      buildKangurEmbeddedBasePath('/landing?preview=1', 'app-embed-a')
    );
  });

  it('supports Kangur tests as the embedded entry page when no query override is active', () => {
    renderAppEmbedBlock({
      appId: 'kangur',
      title: 'Kangur Tests',
      entryPage: 'Tests',
      basePath: '',
      height: 640,
    });

    expect(screen.getByTestId('kangur-feature-page')).toHaveAttribute('data-slug', '["tests"]');
    expect(screen.getByTestId('kangur-feature-page')).toHaveAttribute(
      'data-base-path',
      buildKangurEmbeddedBasePath('/home?preview=1', 'app-embed-a')
    );
  });

  it('downgrades blocked GamesLibrary embed entry pages for non-super-admin users', () => {
    renderAppEmbedBlock({
      appId: 'kangur',
      title: 'Kangur Games',
      entryPage: 'GamesLibrary',
      basePath: '',
      height: 640,
    });

    expect(screen.getByTestId('kangur-feature-page')).toHaveAttribute('data-slug', '[]');
  });

  it('keeps GamesLibrary embed routes for exact super-admin users', () => {
    sessionMock.mockReturnValue({
      data: {
        user: {
          email: 'owner@example.com',
          role: 'super_admin',
        },
      },
      status: 'authenticated',
    });

    useSearchParamsMock.mockReturnValue(
      new URLSearchParams('preview=1&kangur-app-embed-a=games')
    );

    renderAppEmbedBlock({
      appId: 'kangur',
      title: 'Kangur Games',
      entryPage: 'Lessons',
      basePath: '',
      height: 640,
    });

    expect(screen.getByTestId('kangur-feature-page')).toHaveAttribute('data-slug', '["games"]');
  });

  it('preserves other embedded Kangur instances when deriving the current host page', () => {
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams(
        'preview=1&kangur-app-embed-a=lessons&kangur-app-embed-b=parent-dashboard'
      )
    );

    renderAppEmbedBlock(
      {
        appId: 'kangur',
        title: 'Kangur Home',
        entryPage: 'Lessons',
        basePath: '',
        height: 640,
      },
      'app-embed-a'
    );

    expect(screen.getByTestId('kangur-feature-page')).toHaveAttribute(
      'data-base-path',
      buildKangurEmbeddedBasePath(
        '/home?preview=1&kangur-app-embed-b=parent-dashboard',
        'app-embed-a'
      )
    );
  });

  it('supports legacy unscoped Kangur query params while stripping them from the derived host page', () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams('preview=1&kangur=parent-dashboard'));

    renderAppEmbedBlock(
      {
        appId: 'kangur',
        title: 'Kangur Home',
        entryPage: 'Lessons',
        basePath: '',
        height: 640,
      },
      'app-embed-a'
    );

    const mount = screen.getByTestId('kangur-feature-page');
    expect(mount).toHaveAttribute('data-slug', '["parent-dashboard"]');
    expect(mount).toHaveAttribute(
      'data-base-path',
      buildKangurEmbeddedBasePath('/home?preview=1', 'app-embed-a')
    );
  });

  it('keeps the same Kangur embed mount while query-driven page changes update the slug', () => {
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams(
        'preview=1&kangur-app-embed-a=lessons&kangur-app-embed-b=parent-dashboard'
      )
    );

    const { rerender } = renderAppEmbedBlock(
      {
        appId: 'kangur',
        title: 'Kangur Home',
        entryPage: 'Lessons',
        basePath: '',
        height: 640,
      },
      'app-embed-a'
    );

    const mount = screen.getByTestId('kangur-feature-page');
    mount.setAttribute('data-e2e-shell-marker', 'persist');

    useSearchParamsMock.mockReturnValue(
      new URLSearchParams(
        'preview=1&kangur-app-embed-a=tests&kangur-app-embed-b=parent-dashboard'
      )
    );

    rerender(
      <BlockRenderContext.Provider
        value={{
          block: {
            id: 'app-embed-a',
            type: 'AppEmbed',
            settings: {
              appId: 'kangur',
              title: 'Kangur Home',
              entryPage: 'Lessons',
              basePath: '',
              height: 640,
            },
          },
          mediaStyles: null,
          stretch: false,
        }}
      >
        <BlockSettingsContext.Provider
          value={{
            appId: 'kangur',
            title: 'Kangur Home',
            entryPage: 'Lessons',
            basePath: '',
            height: 640,
          }}
        >
          <AppEmbedBlock />
        </BlockSettingsContext.Provider>
      </BlockRenderContext.Provider>
    );

    expect(screen.getByTestId('kangur-feature-page')).toHaveAttribute(
      'data-e2e-shell-marker',
      'persist'
    );
    expect(screen.getByTestId('kangur-feature-page')).toHaveAttribute('data-slug', '["tests"]');
    expect(screen.getByTestId('kangur-feature-page')).toHaveAttribute(
      'data-base-path',
      buildKangurEmbeddedBasePath(
        '/home?preview=1&kangur-app-embed-b=parent-dashboard',
        'app-embed-a'
      )
    );
  });
});
