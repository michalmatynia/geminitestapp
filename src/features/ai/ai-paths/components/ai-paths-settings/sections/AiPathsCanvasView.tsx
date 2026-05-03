'use client';

import React from 'react';
import { createPortal } from 'react-dom';

import { UI_GRID_RELAXED_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';
import { AppErrorBoundary } from '@/shared/ui/AppErrorBoundary';
import type { NodeDefinition } from '@/shared/contracts/ai-paths-core/nodes';

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

function AiPathsCanvasSectionBoundary({
  source,
  children,
}: {
  source: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return <AppErrorBoundary source={source}>{children}</AppErrorBoundary>;
}

function useSecondaryPanelsReady(activeTab: string, ready: boolean, setReady: (val: boolean) => void): void {
  React.useEffect(() => {
    let idleHandle: number | undefined;
    let timeoutHandle: NodeJS.Timeout | undefined;

    if (activeTab !== 'canvas') {
      setReady(false);
      return (): void => {};
    }

    if (ready) return (): void => {};

    const onReady = (): void => {
      setReady(true);
    };

    if (typeof window === 'undefined') {
      onReady();
      return (): void => {};
    }

    if (typeof window.requestIdleCallback === 'function') {
      idleHandle = window.requestIdleCallback(onReady);
    } else {
      timeoutHandle = setTimeout(onReady, 1);
    }

    return (): void => {
      if (idleHandle !== undefined) window.cancelIdleCallback(idleHandle);
      if (timeoutHandle !== undefined) clearTimeout(timeoutHandle);
    };
  }, [activeTab, ready, setReady]);
}

interface PortalsProps {
  isFocusMode: boolean | undefined;
  renderActions: ((actions: React.ReactNode) => React.ReactNode) | undefined;
}

function AiPathsCanvasPortals({ isFocusMode, renderActions }: PortalsProps): React.JSX.Element | null {
  if (isFocusMode === true || typeof document === 'undefined') return null;

  const actionsPortal = renderActions
    ? createPortal(
      renderActions(
        <div className='flex w-full items-start'>
          <AiPathsCanvasToolbar />
        </div>
      ),
      document.getElementById('ai-paths-actions') ?? document.body
    )
    : null;

  const namePortal = createPortal(
    <AiPathsCanvasName />,
    document.getElementById('ai-paths-name') ?? document.body
  );

  return (
    <>
      {actionsPortal}
      {namePortal}
    </>
  );
}

interface CanvasInspectorProps {
  isInspectorVisible: boolean | undefined;
  palette: NodeDefinition[];
  secondaryPanelsReady: boolean;
}

function AiPathsCanvasInspector({
  isInspectorVisible,
  palette,
  secondaryPanelsReady,
}: CanvasInspectorProps): React.JSX.Element | null {
  if (isInspectorVisible !== true) return null;

  return (
    <div className='w-[340px] flex-shrink-0 border-l border-border/60 bg-card/30 xl:w-[376px]'>
      <div className='h-full space-y-4 overflow-y-auto p-4'>
        <AiPathsCanvasSectionBoundary source='AiPathsCanvasView.CanvasSidebar'>
          <CanvasSidebar palette={palette} />
        </AiPathsCanvasSectionBoundary>
        {secondaryPanelsReady ? (
          <>
            <ClusterPresetsPanel />
            <GraphModelDebugPanel />
            <AiPathsCanvasSectionBoundary source='AiPathsCanvasView.RunHistoryPanel'>
              <RunHistoryPanel />
            </AiPathsCanvasSectionBoundary>
          </>
        ) : null}
      </div>
    </div>
  );
}

interface CanvasMainProps {
  isFocusMode: boolean | undefined;
  pathTreeVisible: boolean;
  canvasContainerRef: React.RefObject<HTMLDivElement | null>;
  confirmNodeSwitchSafe: (nextNodeId: string) => boolean | Promise<boolean>;
  nodeDiagnosticsById: Record<string, unknown>;
  focusDataContractNode: (nodeId: string) => void;
  openPathSettings: (open: boolean) => void;
  setIsFocusMode: (next: boolean) => void;
  isInspectorVisible: boolean | undefined;
  palette: NodeDefinition[];
  secondaryPanelsReady: boolean;
}

function AiPathsCanvasMain({
  isFocusMode,
  pathTreeVisible,
  canvasContainerRef,
  confirmNodeSwitchSafe,
  nodeDiagnosticsById,
  focusDataContractNode,
  openPathSettings,
  setIsFocusMode,
  isInspectorVisible,
  palette,
  secondaryPanelsReady,
}: CanvasMainProps): React.JSX.Element {
  return (
    <div
      className={`flex overflow-hidden rounded-2xl border border-border/60 bg-card/20 shadow-xl ${
        isFocusMode === true ? 'h-[calc(100vh-140px)]' : 'h-[800px]'
      }`}
    >
      {isFocusMode !== true && pathTreeVisible && (
        <div className='w-[280px] flex-shrink-0 border-r border-border/50 bg-card/35 xl:w-[312px]'>
          <AiPathsCanvasPathTree />
        </div>
      )}
      <div className='relative flex min-w-0 flex-1 flex-col overflow-hidden bg-background/10'>
        <div ref={canvasContainerRef} className='flex-1'>
          <AiPathsCanvasSectionBoundary source='AiPathsCanvasView.CanvasBoard'>
            <CanvasBoard
              confirmNodeSwitch={confirmNodeSwitchSafe}
              nodeDiagnosticsById={nodeDiagnosticsById}
              onFocusNodeDiagnostics={(nodeId: string): void => {
                focusDataContractNode(nodeId);
                openPathSettings(true);
              }}
            />
          </AiPathsCanvasSectionBoundary>
        </div>
        {isFocusMode === true && (
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

      <AiPathsCanvasInspector
        isInspectorVisible={isInspectorVisible}
        palette={palette}
        secondaryPanelsReady={secondaryPanelsReady}
      />
    </div>
  );
}

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
    isInspectorVisible,
    palette,
  } = useAiPathsSettingsPageCanvasInteractionsContext();
  const {
    diagnosticsReady,
    dataContractReport,
    setDataContractInspectorNodeId,
  } = useAiPathsSettingsPageDiagnosticsContext();
  const canvasContainerRef = React.useRef<HTMLDivElement | null>(null);
  const setIsFocusMode = onFocusModeChange ?? (() => undefined);

  const [secondaryPanelsReady, setSecondaryPanelsReady] = React.useState(false);
  const pathTreeVisible = isPathTreeVisible !== false;

  useSecondaryPanelsReady(activeTab, secondaryPanelsReady, setSecondaryPanelsReady);

  if (activeTab !== 'canvas') return null;

  return (
    <div className={isFocusMode === true ? 'h-full space-y-0' : 'space-y-4'}>
      <AiPathsCanvasPortals isFocusMode={isFocusMode} renderActions={renderActions} />

      <AiPathsCanvasMain
        isFocusMode={isFocusMode}
        pathTreeVisible={pathTreeVisible}
        canvasContainerRef={canvasContainerRef}
        confirmNodeSwitchSafe={confirmNodeSwitch}
        nodeDiagnosticsById={diagnosticsReady ? dataContractReport.byNodeId : {}}
        focusDataContractNode={setDataContractInspectorNodeId}
        openPathSettings={setPathSettingsModalOpen}
        setIsFocusMode={setIsFocusMode}
        isInspectorVisible={isInspectorVisible}
        palette={palette}
        secondaryPanelsReady={secondaryPanelsReady}
      />

      {isFocusMode !== true && secondaryPanelsReady && (
        <>
          <AiPathsCanvasSectionBoundary source='AiPathsCanvasView.RuntimeEventLogPanel'>
            <RuntimeEventLogPanel />
          </AiPathsCanvasSectionBoundary>
          <div className={`${UI_GRID_RELAXED_CLASSNAME} lg:grid-cols-2`}>
            <AiPathsRuntimeAnalysis />
            <AiPathsCanvasSectionBoundary source='AiPathsCanvasView.AiPathsLiveLog'>
              <AiPathsLiveLog />
            </AiPathsCanvasSectionBoundary>
          </div>
        </>
      )}
    </div>
  );
}
