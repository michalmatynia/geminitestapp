/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { KangurContextRegistryPageBoundary } from './KangurContextRegistryPageBoundary';

const {
  contextRegistryPageProviderMock,
  routingState,
  sessionState,
} = vi.hoisted(() => ({
  contextRegistryPageProviderMock: vi.fn(),
  routingState: {
    value: {
      pageKey: 'Game',
    },
  },
  sessionState: {
    value: {
      data: null,
      status: 'unauthenticated' as const,
    },
  },
}));

vi.mock('next-auth/react', () => ({
  useSession: () => sessionState.value,
}));

vi.mock('@/features/kangur/ui/context/KangurRoutingContext', () => ({
  useKangurRouting: () => routingState.value,
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
  it('downgrades unauthorized GamesLibrary routes to the fallback page context', () => {
    routingState.value = {
      pageKey: 'GamesLibrary',
    };
    sessionState.value = {
      data: {
        expires: '2026-12-31T23:59:59.000Z',
        user: {
          id: 'user-1',
          name: 'Parent User',
          email: 'parent@example.com',
          role: 'user',
        },
      },
      status: 'authenticated',
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
    expect(contextRegistryPageProviderMock).not.toHaveBeenCalledWith(
      expect.objectContaining({
        pageId: 'kangur:GamesLibrary',
      })
    );
  });

  it('keeps the GamesLibrary page context for super admins', () => {
    routingState.value = {
      pageKey: 'GamesLibrary',
    };
    sessionState.value = {
      data: {
        expires: '2026-12-31T23:59:59.000Z',
        user: {
          id: 'user-2',
          name: 'Super Admin',
          email: 'super-admin@example.com',
          role: 'super_admin',
        },
      },
      status: 'authenticated',
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
});
