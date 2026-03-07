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
import { BlockSettingsContext } from '@/features/cms/components/frontend/blocks/BlockContext';

describe('AppEmbedBlock', () => {
  beforeEach(() => {
    usePathnameMock.mockReturnValue('/home');
    useSearchParamsMock.mockReturnValue(new URLSearchParams('preview=1'));
  });

  it('renders iframe embeds for iframe-based app embeds', () => {
    render(
      <BlockSettingsContext.Provider
        value={{
          appId: 'chatbot',
          title: 'Chatbot',
          embedUrl: 'https://example.com/chatbot',
          height: 480,
        }}
      >
        <AppEmbedBlock />
      </BlockSettingsContext.Provider>
    );

    expect(screen.getByTitle('Chatbot')).toHaveAttribute('src', 'https://example.com/chatbot');
  });

  it('renders Kangur as an internal app mount on the current cms page', () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams('preview=1&kangur=parent-dashboard'));

    render(
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
    );

    const mount = screen.getByTestId('kangur-feature-page');
    expect(mount).toHaveAttribute(
      'data-base-path',
      buildKangurEmbeddedBasePath('/home?preview=1')
    );
    expect(mount).toHaveAttribute('data-embedded', 'true');
    expect(mount).toHaveAttribute('data-slug', '["parent-dashboard"]');
  });

  it('keeps a custom host-page override for internal app mounts', () => {
    render(
      <BlockSettingsContext.Provider
        value={{
          appId: 'kangur',
          title: 'Kangur Home',
          entryPage: 'Lessons',
          basePath: '/landing?preview=1',
          height: 640,
        }}
      >
        <AppEmbedBlock />
      </BlockSettingsContext.Provider>
    );

    expect(screen.getByTestId('kangur-feature-page')).toHaveAttribute(
      'data-base-path',
      buildKangurEmbeddedBasePath('/landing?preview=1')
    );
  });
});
