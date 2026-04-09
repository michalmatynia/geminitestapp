'use client';

import React from 'react';

import { AiPathsMasterTreePanel } from '../AiPathsMasterTreePanel';
import { useAiPathsSettingsPageContext } from '../AiPathsSettingsPageContext';

export function AiPathsCanvasPathTree(): React.JSX.Element {
  const {
    activePathId,
    handleCreatePath,
    handleDeletePath,
    handleDuplicatePath,
    handleMoveFolder,
    handleMovePathToFolder,
    handleRenameFolder,
    handleSwitchPath,
    paths,
    toast,
  } = useAiPathsSettingsPageContext();

  return (
    <AiPathsMasterTreePanel
      activePathId={activePathId}
      handleCreatePath={handleCreatePath}
      handleDeletePath={handleDeletePath}
      handleDuplicatePath={handleDuplicatePath}
      handleMoveFolder={handleMoveFolder}
      handleMovePathToFolder={handleMovePathToFolder}
      handleRenameFolder={handleRenameFolder}
      handleSwitchPath={handleSwitchPath}
      headerDescription='Group and switch AI paths from the canvas.'
      headerTitle='Path Groups'
      paths={paths}
      toast={toast}
    />
  );
}
