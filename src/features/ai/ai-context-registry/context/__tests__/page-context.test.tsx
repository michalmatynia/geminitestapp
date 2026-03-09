import { renderHook } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import {
  ContextRegistryPageProvider,
  useContextRegistryPageEnvelope,
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
