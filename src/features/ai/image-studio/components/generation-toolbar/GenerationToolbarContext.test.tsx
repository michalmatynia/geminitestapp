// @vitest-environment jsdom

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  GenerationToolbarProvider,
  useGenerationToolbarContext,
} from './GenerationToolbarContext';

describe('GenerationToolbarContext', () => {
  it('throws outside the provider', () => {
    expect(() => renderHook(() => useGenerationToolbarContext())).toThrow(
      'useGenerationToolbarContext must be used within a GenerationToolbarProvider'
    );
  });

  it('provides toolbar state and allows updates', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <GenerationToolbarProvider>{children}</GenerationToolbarProvider>
    );

    const { result } = renderHook(() => useGenerationToolbarContext(), { wrapper });

    expect(result.current.maskAttachMode).toBe('client_canvas_polygon');
    expect(result.current.upscaleScale).toBe('2');
    expect(result.current.analysisBusy).toBe(false);

    act(() => {
      result.current.setMaskAttachMode('server_polygon');
      result.current.setUpscaleScale('4');
      result.current.setAnalysisBusy(true);
      result.current.setCenterLayoutSplitAxes(true);
    });

    expect(result.current.maskAttachMode).toBe('server_polygon');
    expect(result.current.upscaleScale).toBe('4');
    expect(result.current.analysisBusy).toBe(true);
    expect(result.current.centerLayoutSplitAxes).toBe(true);
  });
});
