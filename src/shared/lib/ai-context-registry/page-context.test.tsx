import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import React, { useState } from 'react';
import { describe, expect, it } from 'vitest';

import {
  ContextRegistryPageProvider,
  useContextRegistryPageState,
  useOptionalContextRegistryPageActions,
  useOptionalContextRegistryPageEnvelope,
  useOptionalContextRegistryPageState,
  useRegisterContextRegistryPageSource,
} from '@/shared/lib/ai-context-registry/page-context';

function StateProbe(): React.JSX.Element {
  const state = useContextRegistryPageState();
  return (
    <div>
      <div data-testid='page-id'>{state.pageId}</div>
      <div data-testid='source-count'>{String(state.sources.length)}</div>
      <div data-testid='ref-ids'>
        {JSON.stringify((state.envelope?.refs ?? []).map((ref) => ref.id).sort())}
      </div>
    </div>
  );
}

function RegisteredSource(): React.JSX.Element {
  useRegisterContextRegistryPageSource('dynamic-source', {
    label: 'Dynamic source',
    rootNodeIds: ['child-root'],
    refs: [{ id: 'child-ref', kind: 'static_node' }],
    resolved: {
      refs: [{ id: 'resolved-ref', kind: 'static_node' }],
      nodes: [],
      documents: [],
      truncated: false,
      engineVersion: 'dynamic-engine',
    },
  });

  return <div>registered-source</div>;
}

function ToggleWrapper(): React.JSX.Element {
  const [visible, setVisible] = useState(true);

  return (
    <ContextRegistryPageProvider
      pageId='admin:brain'
      title='AI Brain'
      rootNodeIds={['page-root']}
      resolved={{
        refs: [{ id: 'page-ref', kind: 'static_node' }],
        nodes: [],
        documents: [],
        truncated: false,
        engineVersion: 'page-engine',
      }}
    >
      <button type='button' onClick={() => setVisible(false)}>
        hide-source
      </button>
      <StateProbe />
      {visible ? <RegisteredSource /> : null}
    </ContextRegistryPageProvider>
  );
}

describe('page-context', () => {
  it('registers dynamic page sources into the page envelope and unregisters them on unmount', async () => {
    render(<ToggleWrapper />);

    expect(screen.getByTestId('page-id')).toHaveTextContent('admin:brain');
    await waitFor(() => {
      expect(screen.getByTestId('source-count')).toHaveTextContent('2');
    });
    await waitFor(() => {
      expect(screen.getByTestId('ref-ids')).toHaveTextContent(
        JSON.stringify(['child-ref', 'child-root', 'page-ref', 'page-root', 'resolved-ref'])
      );
    });

    act(() => {
      screen.getByRole('button', { name: 'hide-source' }).click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('source-count')).toHaveTextContent('1');
    });
    await waitFor(() => {
      expect(screen.getByTestId('ref-ids')).toHaveTextContent(
        JSON.stringify(['page-ref', 'page-root'])
      );
    });
  });

  it('returns null from the optional hooks outside a provider', () => {
    const stateView = renderHook(() => useOptionalContextRegistryPageState());
    const envelopeView = renderHook(() => useOptionalContextRegistryPageEnvelope());
    const actionsView = renderHook(() => useOptionalContextRegistryPageActions());

    expect(stateView.result.current).toBeNull();
    expect(envelopeView.result.current).toBeNull();
    expect(actionsView.result.current).toBeNull();
  });

  it('throws from the strict state hook outside a provider', () => {
    expect(() => renderHook(() => useContextRegistryPageState())).toThrow(
      'useContextRegistryPageState must be used within ContextRegistryPageProvider'
    );
  });
});
