import React from 'react';

import { NodeConfigDialog } from '../../node-config-dialog';
import { PresetsDialog } from '../../presets-dialog';
import { RunDetailDialog } from '../../run-detail-dialog';
import { SimulationDialog } from '../../simulation-dialog';

export function AiPathsDialogs(): React.JSX.Element {
  return (
    <>
      <NodeConfigDialog />
      <RunDetailDialog />
      <PresetsDialog />
      <SimulationDialog />
    </>
  );
}
