'use client';

import React from 'react';
import { NodeConfigDialog } from '../../node-config-dialog';
import { PresetsDialog } from '../../presets-dialog';
import { RunDetailDialog } from '../../run-detail-dialog';
import { SimulationDialog } from '../../simulation-dialog';
import { useAiPathsSettingsPageContext } from '../AiPathsSettingsPageContext';
import { useAiPathsSettingsOrchestrator } from '../AiPathsSettingsOrchestratorContext';
import { SettingsPanelBuilder, type SettingsField } from '@/shared/ui/templates/SettingsPanelBuilder';
import {
  Button,
  SelectSimple,
  StatusBadge,
  Card,
  EmptyState,
} from '@/shared/ui';
import {
  EXECUTION_OPTIONS,
  FLOW_OPTIONS,
  RUN_MODE_OPTIONS,
  buildHistoryRetentionOptions,
} from '../ai-paths-settings-view-utils';

export function AiPathsDialogs(): React.JSX.Element {
  const {
    state,
    activePathId,
    pathSettingsModalOpen,
    setPathSettingsModalOpen,
    presetsModalOpen,
    setPresetsModalOpen,
    activeRunId,
    setActiveRunId,
    simulationModalOpen,
    setSimulationModalOpen,
    handleSavePathSettings,
    pathSettingsDraft,
    setPathSettingsDraft,
    pathSettingsDirty,
    maintenanceReport,
    handleApplyMaintenanceAction,
    applyingMaintenanceAction,
    normalizedAiPathsValidation,
    updateAiPathsValidation,
    validationPreflightReport,
    countries,
  } = useAiPathsSettingsPageContext();

  const {
    ConfirmationModal,
  } = state;

  const pathSettingsFields: SettingsField[] = [
    {
      key: 'runMode',
      label: 'Run Mode',
      type: 'select',
      value: pathSettingsDraft.runMode,
      options: RUN_MODE_OPTIONS,
      description: 'How this path is executed',
    },
    {
      key: 'executionMode',
      label: 'Execution Mode',
      type: 'select',
      value: pathSettingsDraft.executionMode,
      options: EXECUTION_OPTIONS,
      description: 'Serial vs Parallel execution strategy',
    },
    {
      key: 'flowIntensity',
      label: 'Flow Intensity',
      type: 'select',
      value: pathSettingsDraft.flowIntensity,
      options: FLOW_OPTIONS,
      description: 'Visual feedback intensity',
    },
    {
      key: 'historyRetentionSeconds',
      label: 'History Retention',
      type: 'select',
      value: String(pathSettingsDraft.historyRetentionSeconds),
      options: buildHistoryRetentionOptions(),
      description: 'How long to keep run history',
    },
  ];

  return (
    <>
      <NodeConfigDialog />
      
      <RunDetailDialog
        runId={activeRunId}
        onClose={() => setActiveRunId(null)}
      />

      <PresetsDialog
        isOpen={presetsModalOpen}
        onClose={() => setPresetsModalOpen(false)}
      />

      <SimulationDialog
        isOpen={simulationModalOpen}
        onClose={() => setSimulationModalOpen(false)}
      />

      {/* Path Settings Modal */}
      {pathSettingsModalOpen && (
        <SettingsPanelBuilder
          title='Path Settings'
          description='Configure behavior and retention for this path'
          fields={pathSettingsFields}
          onChange={(key, value) => {
            setPathSettingsDraft((prev) => ({
              ...prev,
              [key]: key === 'historyRetentionSeconds' ? Number(value) : value,
            }));
          }}
          onSave={handleSavePathSettings}
          dirty={pathSettingsDirty}
          open={pathSettingsModalOpen}
          onClose={() => setPathSettingsModalOpen(false)}
        >
           {/* Additional settings content could go here */}
        </SettingsPanelBuilder>
      )}

      <ConfirmationModal />
    </>
  );
}
