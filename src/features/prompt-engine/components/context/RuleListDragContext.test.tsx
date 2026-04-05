import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  RuleListDragProvider,
  useRuleItemDragState,
} from './RuleListDragContext';

function DragStateProbe({ uid }: { uid: string }): React.JSX.Element {
  const state = useRuleItemDragState(uid);

  return (
    <div>
      <span data-testid='is-dragging'>{String(state.isDragging)}</span>
      <span data-testid='is-target'>{String(state.isDragTarget)}</span>
      <button onClick={state.onDragStart} type='button'>
        start
      </button>
      <button onClick={state.onDragEnd} type='button'>
        end
      </button>
    </div>
  );
}

describe('RuleListDragContext', () => {
  it('throws outside provider', () => {
    expect(() => render(<DragStateProbe uid='rule-1' />)).toThrow(
      'useRuleListDragContext must be used within a RuleListDragProvider'
    );
  });

  it('exposes drag state and handlers through the provider', () => {
    const setDraggedUid = vi.fn();
    const setDragOverKey = vi.fn();
    const result = render(
      <RuleListDragProvider
        value={{
          draggableEnabled: true,
          draggedUid: 'rule-1',
          dragOverKey: 'rule-2',
          setDraggedUid,
          setDragOverKey,
        }}
      >
        <DragStateProbe uid='rule-1' />
      </RuleListDragProvider>
    );

    expect(result.getByTestId('is-dragging').textContent).toBe('true');
    expect(result.getByTestId('is-target').textContent).toBe('false');

    fireEvent.click(result.getByText('start'));
    expect(setDraggedUid).toHaveBeenCalledWith('rule-1');
    expect(setDragOverKey).toHaveBeenCalledWith(null);

    fireEvent.click(result.getByText('end'));
    expect(setDraggedUid).toHaveBeenCalledWith(null);
    expect(setDragOverKey).toHaveBeenCalledWith(null);
  });
});
