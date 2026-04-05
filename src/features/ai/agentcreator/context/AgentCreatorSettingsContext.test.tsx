// @vitest-environment jsdom

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DEFAULT_AGENT_SETTINGS } from '@/features/ai/agentcreator/utils/constants';

import {
  AgentCreatorSettingsProvider,
  useAgentCreatorModes,
  useAgentCreatorOperations,
  useAgentCreatorPerformance,
} from './AgentCreatorSettingsContext';

describe('AgentCreatorSettingsContext', () => {
  it('throws outside the provider for all strict hooks', () => {
    expect(() => renderHook(() => useAgentCreatorModes())).toThrow(
      'useAgentCreatorModes must be used within AgentCreatorSettingsProvider'
    );
    expect(() => renderHook(() => useAgentCreatorPerformance())).toThrow(
      'useAgentCreatorPerformance must be used within AgentCreatorSettingsProvider'
    );
    expect(() => renderHook(() => useAgentCreatorOperations())).toThrow(
      'useAgentCreatorOperations must be used within AgentCreatorSettingsProvider'
    );
  });

  it('provides default settings and allows updates', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AgentCreatorSettingsProvider>{children}</AgentCreatorSettingsProvider>
    );

    const { result } = renderHook(
      () => ({
        modes: useAgentCreatorModes(),
        operations: useAgentCreatorOperations(),
        performance: useAgentCreatorPerformance(),
      }),
      { wrapper }
    );

    expect(result.current.modes.agentModeEnabled).toBe(false);
    expect(result.current.operations.agentBrowser).toBe(DEFAULT_AGENT_SETTINGS.agentBrowser);
    expect(result.current.operations.agentRunHeadless).toBe(DEFAULT_AGENT_SETTINGS.runHeadless);
    expect(result.current.performance.agentMaxSteps).toBe(DEFAULT_AGENT_SETTINGS.maxSteps);

    act(() => {
      result.current.modes.setAgentModeEnabled(true);
      result.current.operations.setAgentBrowser('firefox');
      result.current.performance.setAgentMaxSteps(42);
    });

    expect(result.current.modes.agentModeEnabled).toBe(true);
    expect(result.current.operations.agentBrowser).toBe('firefox');
    expect(result.current.performance.agentMaxSteps).toBe(42);
  });
});
