'use client';

import React from 'react';

import { AiPathsMasterTreePanel } from '../AiPathsMasterTreePanel';
import {
  useAiPathsSettingsPagePathActionsContext,
  useAiPathsSettingsPageWorkspaceContext,
} from '../AiPathsSettingsPageContext';

export function AiPathsCanvasPathTree(): React.JSX.Element {
  return (
    <AiPathsMasterTreePanel />
  );
}
