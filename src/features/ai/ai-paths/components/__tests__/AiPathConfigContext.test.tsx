// @vitest-environment jsdom

import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  useAiPathGraph,
  useAiPathOrchestrator,
  useAiPathPresets,
  useAiPathRuntime,
  useAiPathSelection,
} from '../AiPathConfigContext';

describe('AiPathConfigContext', () => {
  it('throws outside the provider for all strict hooks', () => {
    expect(() => renderHook(() => useAiPathSelection())).toThrow(
      'useAiPathSelection must be used within AiPathConfigProvider'
    );
    expect(() => renderHook(() => useAiPathGraph())).toThrow(
      'useAiPathGraph must be used within AiPathConfigProvider'
    );
    expect(() => renderHook(() => useAiPathRuntime())).toThrow(
      'useAiPathRuntime must be used within AiPathConfigProvider'
    );
    expect(() => renderHook(() => useAiPathPresets())).toThrow(
      'useAiPathPresets must be used within AiPathConfigProvider'
    );
    expect(() => renderHook(() => useAiPathOrchestrator())).toThrow(
      'useAiPathOrchestrator must be used within AiPathConfigProvider'
    );
  });
});
