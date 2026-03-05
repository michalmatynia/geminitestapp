'use client';

import { useMemo } from 'react';

import {
  useAgentCreatorModes,
  useAgentCreatorOperations,
  useAgentCreatorPerformance,
  type AgentCreatorModes,
  type AgentCreatorOperations,
  type AgentCreatorPerformance,
} from '../context/AgentCreatorSettingsContext';

export type AgentCreatorSettings = AgentCreatorModes &
  AgentCreatorPerformance &
  AgentCreatorOperations;

export const useAgentCreatorSettings = (): AgentCreatorSettings => {
  const modes = useAgentCreatorModes();
  const performance = useAgentCreatorPerformance();
  const operations = useAgentCreatorOperations();

  return useMemo<AgentCreatorSettings>(
    () => ({
      ...modes,
      ...performance,
      ...operations,
    }),
    [modes, performance, operations]
  );
};
