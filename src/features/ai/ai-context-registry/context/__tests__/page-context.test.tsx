import { renderHook } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import {
  ContextRegistryPageProvider,
  useContextRegistryPageActions,
  useContextRegistryPageEnvelope,
  useOptionalContextRegistryPageActions,
  useRegisterContextRegistryPageSource,
} from '../page-context';

function RuntimeSourceRegistrar(): null {
  useRegisterContextRegistryPageSource('runtime-source', {
    label: 'Runtime source',
    refs: [
      {
        id: 'runtime:ai-path-run:run-42',
        kind: 'runtime_document',
        providerId: 'ai-path-run',
        entityType: 'ai_path_run',
      },
    ],
  });
  return null;
}

describe('ContextRegistryPageProvider', () => {
  it('exposes optional actions as null outside the provider', () => {
    const { result } = renderHook(() => useOptionalContextRegistryPageActions());

    expect(result.current).toBeNull();
  });

  it('exposes split actions hooks inside the provider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ContextRegistryPageProvider pageId='kangur:Game'>{children}</ContextRegistryPageProvider>
    );

    const { result } = renderHook(() => useContextRegistryPageActions(), { wrapper });

    expect(typeof result.current.registerSource).toBe('function');
    expect(typeof result.current.unregisterSource).toBe('function');
  });

  it('merges base page roots with registered runtime refs', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ContextRegistryPageProvider pageId='kangur:Game' title='Kangur Game' rootNodeIds={['page:kangur-game']}>
        <RuntimeSourceRegistrar />
        {children}
      </ContextRegistryPageProvider>
    );

    const { result } = renderHook(() => useContextRegistryPageEnvelope(), { wrapper });

    expect(result.current).toEqual({
      refs: [
        { id: 'page:kangur-game', kind: 'static_node' },
        {
          id: 'runtime:ai-path-run:run-42',
          kind: 'runtime_document',
          providerId: 'ai-path-run',
          entityType: 'ai_path_run',
        },
      ],
      engineVersion: 'page-context:v1',
    });
  });
});
