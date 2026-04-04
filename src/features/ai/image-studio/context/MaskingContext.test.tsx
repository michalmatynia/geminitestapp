// @vitest-environment jsdom

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  MaskingProvider,
  useMaskingActions,
  useMaskingState,
} from './MaskingContext';

const mocks = vi.hoisted(() => ({
  toast: vi.fn(),
  apiPost: vi.fn(),
}));

vi.mock('@/features/ai/ai-context-registry/context/page-context', () => ({
  useOptionalContextRegistryPageEnvelope: () => null,
}));

vi.mock('./ProjectsContext', () => ({
  useProjectsState: () => ({
    projectId: 'project-1',
  }),
}));

vi.mock('./SlotsContext', () => ({
  useSlotsState: () => ({
    workingSlot: null,
    selectedSlot: null,
  }),
}));

vi.mock('@/shared/ui', () => ({
  useToast: () => ({
    toast: mocks.toast,
  }),
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    post: mocks.apiPost,
  },
}));

describe('MaskingContext', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mocks.toast.mockReset();
    mocks.apiPost.mockReset();
  });

  it('throws outside the provider for both strict hooks', () => {
    expect(() => renderHook(() => useMaskingState())).toThrow(
      'useMaskingState must be used within a MaskingProvider'
    );
    expect(() => renderHook(() => useMaskingActions())).toThrow(
      'useMaskingActions must be used within a MaskingProvider'
    );
  });

  it('updates masking state and guards AI generation without a working slot image', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MaskingProvider>{children}</MaskingProvider>
    );

    const { result } = renderHook(
      () => ({
        state: useMaskingState(),
        actions: useMaskingActions(),
      }),
      { wrapper }
    );

    act(() => {
      result.current.actions.setTool('brush');
      result.current.actions.setMaskInvert(true);
      result.current.actions.setMaskFeather(17);
      result.current.actions.setBrushRadius(13);
      result.current.actions.setMaskGenMode('edges');
      result.current.actions.setMaskThresholdSensitivity(120);
      result.current.actions.setMaskEdgeSensitivity(-5);
      result.current.actions.handleAiMaskGeneration();
    });

    expect(result.current.state.tool).toBe('brush');
    expect(result.current.state.maskInvert).toBe(true);
    expect(result.current.state.maskFeather).toBe(17);
    expect(result.current.state.brushRadius).toBe(13);
    expect(result.current.state.maskGenMode).toBe('edges');
    expect(result.current.state.maskThresholdSensitivity).toBe(100);
    expect(result.current.state.maskEdgeSensitivity).toBe(0);
    expect(mocks.toast).toHaveBeenCalledWith('Select a working slot with an image first.', {
      variant: 'info',
    });
    expect(mocks.apiPost).not.toHaveBeenCalled();
  });
});
