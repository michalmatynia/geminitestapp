/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { KangurContextRegistryPageBoundary } from './KangurContextRegistryPageBoundary';

const {
  contextRegistryPageProviderMock,
  deferredHomeTutorContextReadyMock,
  routingState,
} = vi.hoisted(() => ({
  contextRegistryPageProviderMock: vi.fn(),
  deferredHomeTutorContextReadyMock: vi.fn(() => true),
  routingState: {
    value: {
      pageKey: 'Game',
    },
  },
}));

vi.mock('@/features/kangur/ui/context/KangurRoutingContext', () => ({
  useKangurRouting: () => routingState.value,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurDeferredHomeTutorContextReady', () => ({
  useKangurDeferredHomeTutorContextReady: () => deferredHomeTutorContextReadyMock(),
}));

vi.mock('@/shared/lib/ai-context-registry/page-context', () => ({
  ContextRegistryPageProvider: ({
    children,
    ...props
  }: {
    children?: React.ReactNode;
    pageId: string;
    title?: string;
    rootNodeIds?: string[];
  }) => {
    contextRegistryPageProviderMock(props);
    return <div data-testid='context-registry-page-provider'>{children}</div>;
  },
}));

describe('KangurContextRegistryPageBoundary', () => {
  it('falls back to the main page context for unsupported route keys', () => {
    routingState.value = {
      pageKey: 'Duels',
    };

    render(
      <KangurContextRegistryPageBoundary>
        <div>child</div>
      </KangurContextRegistryPageBoundary>
    );

    expect(screen.getByTestId('context-registry-page-provider')).toHaveTextContent('child');
    expect(contextRegistryPageProviderMock).toHaveBeenCalledWith(
      expect.objectContaining({
        pageId: 'kangur:Game',
        title: 'Kangur Game',
        rootNodeIds: expect.arrayContaining(['page:kangur-game']),
      })
    );
  });

  it('keeps the GamesLibrary page context when routing state already resolved it', () => {
    routingState.value = {
      pageKey: 'GamesLibrary',
    };

    render(
      <KangurContextRegistryPageBoundary>
        <div>child</div>
      </KangurContextRegistryPageBoundary>
    );

    expect(contextRegistryPageProviderMock).toHaveBeenCalledWith(
      expect.objectContaining({
        pageId: 'kangur:GamesLibrary',
        title: 'Kangur Games Library',
        rootNodeIds: expect.arrayContaining(['page:kangur-games-library']),
      })
    );
  });

  it('keeps the page context provider dormant on the initial standalone home route until the idle gate opens', () => {
    deferredHomeTutorContextReadyMock.mockReturnValue(false);
    routingState.value = {
      pageKey: 'Game',
    };

    render(
      <KangurContextRegistryPageBoundary>
        <div>child</div>
      </KangurContextRegistryPageBoundary>
    );

    expect(contextRegistryPageProviderMock).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
        pageId: 'kangur:Game',
      })
    );
  });
});
