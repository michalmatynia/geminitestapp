/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

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

  it('renders Kangur as an internal app mount', () => {
    render(
      <BlockSettingsContext.Provider
        value={{
          appId: 'kangur',
          title: 'Kangur Home',
          entryPage: 'Lessons',
          basePath: '/home/kangur',
          height: 640,
        }}
      >
        <AppEmbedBlock />
      </BlockSettingsContext.Provider>
    );

    const mount = screen.getByTestId('kangur-feature-page');
    expect(mount).toHaveAttribute('data-base-path', '/home/kangur');
    expect(mount).toHaveAttribute('data-embedded', 'true');
    expect(mount).toHaveAttribute('data-slug', '["lessons"]');
  });
});
