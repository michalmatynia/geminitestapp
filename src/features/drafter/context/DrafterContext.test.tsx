import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  DrafterProvider,
  useDrafterActions,
  useDrafterState,
  useOptionalDrafterActions,
  useOptionalDrafterState,
} from './DrafterContext';

function StrictConsumer(): React.JSX.Element {
  const state = useDrafterState();
  const actions = useDrafterActions();

  return (
    <div>
      <span data-testid='state'>{`${state.isCreatorOpen}:${state.editingDraftId ?? 'none'}`}</span>
      <button onClick={() => actions.openCreator('draft-1')} type='button'>
        open
      </button>
      <button onClick={actions.closeCreator} type='button'>
        close
      </button>
    </div>
  );
}

function OptionalConsumer(): React.JSX.Element {
  const state = useOptionalDrafterState();
  const actions = useOptionalDrafterActions();

  return <div>{state && actions ? 'present' : 'none'}</div>;
}

describe('DrafterContext', () => {
  it('throws outside provider for strict hooks', () => {
    expect(() => render(<StrictConsumer />)).toThrow(
      'useDrafterState must be used within a DrafterProvider'
    );
  });

  it('returns null from optional hooks outside provider', () => {
    render(<OptionalConsumer />);
    expect(screen.getByText('none')).toBeInTheDocument();
  });

  it('exposes state and actions inside provider', () => {
    render(
      <DrafterProvider>
        <StrictConsumer />
      </DrafterProvider>
    );

    expect(screen.getByTestId('state').textContent).toBe('false:none');

    fireEvent.click(screen.getByText('open'));
    expect(screen.getByTestId('state').textContent).toBe('true:draft-1');

    fireEvent.click(screen.getByText('close'));
    expect(screen.getByTestId('state').textContent).toBe('false:none');
  });
});
