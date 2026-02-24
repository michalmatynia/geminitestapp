'use client';

import React from 'react';

import { NodeConfigDialog } from '../../node-config-dialog';
import { PresetsDialog } from '../../presets-dialog';
import { RunDetailDialog } from '../../run-detail-dialog';
import { SimulationDialog } from '../../simulation-dialog';
import { useAiPathsSettingsOrchestrator } from '../AiPathsSettingsOrchestratorContext';

export function AiPathsDialogs(): React.JSX.Element {
  const state = useAiPathsSettingsOrchestrator();
  const ConfirmationModal = state.ConfirmationModal;

  return (
    <>
      <NodeConfigDialog />
      <RunDetailDialog />
      <PresetsDialog />
      <SimulationDialog />
      <ConfirmationModal />
    </>
  );
}
