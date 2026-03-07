/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildKangurEmbeddedBasePath } from '@/features/kangur/config/routing';

const { usePathnameMock, useSearchParamsMock } = vi.hoisted(() => ({
  usePathnameMock: vi.fn(),
  useSearchParamsMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: usePathnameMock,
  useSearchParams: useSearchParamsMock,
}));

vi.mock('@/features/kangur/public', () => ({
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
}));

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
});
