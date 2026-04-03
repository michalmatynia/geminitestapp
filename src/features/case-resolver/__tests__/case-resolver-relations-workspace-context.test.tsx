// @vitest-environment jsdom

import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  CaseResolverRelationsWorkspaceProvider,
  useCaseResolverRelationsWorkspaceContext,
} from '@/features/case-resolver/components/CaseResolverRelationsWorkspaceContext';

describe('CaseResolverRelationsWorkspaceContext', () => {
  it('throws outside the provider', () => {
    expect(() => renderHook(() => useCaseResolverRelationsWorkspaceContext())).toThrow(
      'useCaseResolverRelationsWorkspaceContext must be used within CaseResolverRelationsWorkspaceProvider'
    );
  });

  it('returns the workspace context inside the provider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CaseResolverRelationsWorkspaceProvider
        value={{
          relationGraph: {} as never,
          workspaceSnapshot: {
            assets: [],
            files: [],
            folders: [],
            relationGraphSource: null,
          },
        }}
      >
        {children}
      </CaseResolverRelationsWorkspaceProvider>
    );

    const { result } = renderHook(() => useCaseResolverRelationsWorkspaceContext(), { wrapper });

    expect(result.current.workspaceSnapshot).toMatchObject({
      assets: [],
      files: [],
      folders: [],
      relationGraphSource: null,
    });
  });
});
