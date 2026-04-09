'use client';

import React from 'react';
import { createPortal } from 'react-dom';

import { UI_GRID_RELAXED_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';

import { AiPathsLiveLog } from './AiPathsLiveLog';
import { AiPathsCanvasPathTree } from './AiPathsCanvasPathTree';
import { AiPathsCanvasToolbar } from './AiPathsCanvasToolbar';
import { AiPathsCanvasName } from './AiPathsCanvasName';
import { CanvasBoard } from '../../canvas-board';
import { CanvasSidebar } from '../../canvas-sidebar';
import { ClusterPresetsPanel } from '../../cluster-presets-panel';
import { GraphModelDebugPanel } from '../../graph-model-debug-panel';
import { RunHistoryPanel } from '../../run-history-panel';
import { RuntimeEventLogPanel } from '../../runtime-event-log-panel';
import {
  useAiPathsSettingsPageCanvasInteractionsContext,
  useAiPathsSettingsPageDiagnosticsContext,
  useAiPathsSettingsPageWorkspaceContext,
} from '../AiPathsSettingsPageContext';
import { AiPathsRuntimeAnalysis } from '../panels/AiPathsRuntimeAnalysis';

export function AiPathsCanvasView(): React.JSX.Element | null {
  const {
    activeTab,
    isFocusMode,
    onFocusModeChange,
    renderActions,
    setPathSettingsModalOpen,
  } = useAiPathsSettingsPageWorkspaceContext();
  const {
    confirmNodeSwitch,
    isPathTreeVisible,
    setIsPathTreeVisible,
    palette,
  } = useAiPathsSettingsPageCanvasInteractionsContext();
  const {
    diagnosticsReady,
    dataContractReport,
    setDataContractInspectorNodeId,
  } = useAiPathsSettingsPageDiagnosticsContext();
  const canvasContainerRef = React.useRef<HTMLDivElement | null>(null);
  const setIsFocusMode = onFocusModeChange ?? (() => undefined);

  const openPathSettings = setPathSettingsModalOpen ?? (() => undefined);
  const confirmNodeSwitchSafe = confirmNodeSwitch ?? (async (): Promise<boolean> => true);
  const validationDiagnosticsReady = diagnosticsReady !== false;
  const nodeDiagnosticsById = validationDiagnosticsReady ? dataContractReport?.byNodeId ?? {} : {};
  const focusDataContractNode = setDataContractInspectorNodeId ?? (() => undefined);

  const [secondaryPanelsReady, setSecondaryPanelsReady] = React.useState(false);
  const [isInspectorVisible, setIsInspectorVisible] = React.useState(true);
  const pathTreeVisible = isPathTreeVisible !== false;
  const setPathTreeVisible =
    setIsPathTreeVisible ??
    ((_: React.SetStateAction<boolean>): void => undefined);

  React.useEffect(() => {
    if (activeTab !== 'canvas') {
      setSecondaryPanelsReady(false);
      return;
    }

    if (secondaryPanelsReady) return;

    const onReady = () => {
      setSecondaryPanelsReady(true);
    };

    if (typeof window === 'undefined') {
      onReady();
      return;
    }

    if (typeof window.requestIdleCallback === 'function') {
      const idleHandle = window.requestIdleCallback(onReady);
      return (): void => {
        window.cancelIdleCallback?.(idleHandle);
      };
    }

    const timeoutHandle = setTimeout(onReady, 1);
    return (): void => {
      clearTimeout(timeoutHandle);
    };
  }, [activeTab, secondaryPanelsReady]);

  if (activeTab !== 'canvas') return null;

  return (
    <div className={isFocusMode ? 'h-full space-y-0' : 'space-y-4'}>
      {!isFocusMode && typeof document !== 'undefined' && renderActions
        ? createPortal(
          renderActions(
            <div className='flex w-full items-start'>
              <AiPathsCanvasToolbar
                isInspectorVisible={isInspectorVisible}
                isPathTreeVisible={pathTreeVisible}
                onToggleInspector={() => {
                  setIsInspectorVisible((current) => !current);
                }}
                onTogglePathTree={() => {
                  setPathTreeVisible((current) => !current);
                }}
              />
            </div>
          ),
          document.getElementById('ai-paths-actions') ?? document.body
        )
        : null}

      {!isFocusMode && typeof document !== 'undefined'
        ? createPortal(
          <AiPathsCanvasName />,
          document.getElementById('ai-paths-name') ?? document.body
        )
        : null}

      <div
        className={`flex overflow-hidden rounded-2xl border border-border/60 bg-card/20 shadow-xl ${
          isFocusMode ? 'h-[calc(100vh-140px)]' : 'h-[800px]'
        }`}
      >
        {!isFocusMode && pathTreeVisible && (
          <div className='w-[280px] flex-shrink-0 border-r border-border/50 bg-card/35 xl:w-[312px]'>
            <AiPathsCanvasPathTree />
          </div>
        )}
        <div className='relative flex min-w-0 flex-1 flex-col overflow-hidden bg-background/10'>
          <div ref={canvasContainerRef} className='flex-1'>
            <CanvasBoard
              confirmNodeSwitch={confirmNodeSwitchSafe}
              nodeDiagnosticsById={nodeDiagnosticsById}
              onFocusNodeDiagnostics={(nodeId: string): void => {
                focusDataContractNode(nodeId);
                openPathSettings(true);
              }}
            />
          </div>
          {isFocusMode && (
            <div className='absolute bottom-4 right-4 flex items-center gap-2'>
              <button
                type='button'
                className='inline-flex items-center justify-center rounded-md bg-secondary px-3 py-2 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 h-8 bg-black/60 backdrop-blur-md'
                onClick={() => setIsFocusMode(false)}
              >
                Exit Focus Mode
              </button>
            </div>
          )}
        </div>

        {isInspectorVisible && (
          <div className='w-[340px] flex-shrink-0 border-l border-border/60 bg-card/30 xl:w-[376px]'>
            <div className='h-full space-y-4 overflow-y-auto p-4'>
              <CanvasSidebar palette={palette} />
              {secondaryPanelsReady ? (
                <>
                  <ClusterPresetsPanel />
                  <GraphModelDebugPanel />
                  <RunHistoryPanel />
                </>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {!isFocusMode && secondaryPanelsReady && <RuntimeEventLogPanel />}
      {!isFocusMode && secondaryPanelsReady && (
        <div className={`${UI_GRID_RELAXED_CLASSNAME} lg:grid-cols-2`}>
          <AiPathsRuntimeAnalysis />
          <AiPathsLiveLog />
        </div>
      )}
    </div>
  );
}
