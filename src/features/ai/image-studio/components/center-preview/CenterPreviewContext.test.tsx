// @vitest-environment jsdom

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  CenterPreviewProvider,
  useCenterPreviewActions,
  useCenterPreviewContext,
  useCenterPreviewState,
} from './CenterPreviewContext';

describe('CenterPreviewContext', () => {
  it('throws outside the provider for strict hooks', () => {
    expect(() => renderHook(() => useCenterPreviewState())).toThrow(
      'useCenterPreviewState must be used within a CenterPreviewProvider'
    );
    expect(() => renderHook(() => useCenterPreviewActions())).toThrow(
      'useCenterPreviewActions must be used within a CenterPreviewProvider'
    );
  });

  it('provides combined state/actions and updates split zoom', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CenterPreviewProvider>{children}</CenterPreviewProvider>
    );

    const { result } = renderHook(
      () => ({
        actions: useCenterPreviewActions(),
        combined: useCenterPreviewContext(),
        state: useCenterPreviewState(),
      }),
      { wrapper }
    );

    expect(result.current.state.singleVariantView).toBe('variant');
    expect(result.current.state.leftSplitZoom).toBe(1);
    expect(result.current.combined.rightSplitZoom).toBe(1);

    act(() => {
      result.current.actions.adjustSplitZoom('left', 0.5);
      result.current.actions.setSplitVariantView(true);
      result.current.actions.setDetailsSlotId('slot-1');
    });

    expect(result.current.state.leftSplitZoom).toBe(1.5);
    expect(result.current.state.splitVariantView).toBe(true);
    expect(result.current.combined.detailsSlotId).toBe('slot-1');

    act(() => {
      result.current.actions.resetSplitZoom('left');
    });

    expect(result.current.state.leftSplitZoom).toBe(1);
  });
});
