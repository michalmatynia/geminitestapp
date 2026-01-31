"use client";

import React from "react";
import { createPortal } from "react-dom";
import { Button, Input } from "@/shared/ui";
import { CanvasBoard } from "../canvas-board";
import { CanvasSidebar } from "../canvas-sidebar";
import { ClusterPresetsPanel } from "../cluster-presets-panel";
import { DocsTabPanel, PathsTabPanel } from "../ui-panels";
import { GraphModelDebugPanel } from "../graph-model-debug-panel";
import { JobQueuePanel } from "../job-queue-panel";
import { NodeConfigDialog } from "../node-config-dialog";
import { PresetsDialog } from "../presets-dialog";
import { RunDetailDialog } from "../run-detail-dialog";
import { RunHistoryPanel } from "../run-history-panel";
import { SimulationDialog } from "../simulation-dialog";
import type { AiNode } from "@/features/ai-paths/lib";
import type { AiPathsSettingsState } from "./useAiPathsSettingsState";

type AiPathsSettingsViewProps = {
  activeTab: "canvas" | "paths" | "docs" | "queue";
  renderActions?: (actions: React.ReactNode) => React.ReactNode;
  onTabChange?: (tab: "canvas" | "paths" | "docs" | "queue") => void;
  state: AiPathsSettingsState;
};

export function AiPathsSettingsView({
  activeTab,
  renderActions,
  onTabChange,
  state,
}: AiPathsSettingsViewProps): React.JSX.Element {
  const {
    loading,
    docsWiringSnippet,
    docsDescriptionSnippet,
    docsJobsSnippet,
    handleCopyDocsWiring,
    handleCopyDocsDescription,
    handleCopyDocsJobs,
    autoSaveLabel,
    autoSaveClasses,
    saving,
    handleCreatePath,
    handleCreateAiDescriptionPath,
    handleSave,
    handleReset,
    handleDeletePath,
    activePathId,
    lastError,
    setLastError,
    persistLastError,
    setLoadNonce,
    lastRunAt,
    pathName,
    setPathName,
    updateActivePathMeta,
    paths,
    handleSwitchPath,
    savePathIndex,
    nodes,
    setNodes,
    edges,
    runtimeState,
    edgePaths,
    view,
    panState,
    lastDrop,
    connecting,
    connectingPos,
    connectingFromNode,
    selectedNodeId,
    dragState,
    selectedEdgeId,
    palette,
    paletteCollapsed,
    setPaletteCollapsed,
    expandedPaletteGroups,
    togglePaletteGroup,
    handleDragStart,
    selectedNode,
    handleSelectEdge,
    handleFireTrigger,
    handleFireTriggerPersistent,
    setSimulationOpenNodeId,
    updateSelectedNode,
    setConfigOpen,
    handleDeleteSelectedNode,
    handleRemoveEdge,
    handleClearWires,
    handleDisconnectPort,
    handleReconnectInput,
    handleSelectNode,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleStartConnection,
    handleCompleteConnection,
    handleDrop,
    handleDragOver,
    handlePanStart,
    handlePanMove,
    handlePanEnd,
    zoomTo,
    fitToNodes,
    resetView,
    presetDraft,
    setPresetDraft,
    editingPresetId,
    handleResetPresetDraft,
    handlePresetFromSelection,
    handleSavePreset,
    clusterPresets,
    handleLoadPreset,
    handleApplyPreset,
    handleDeletePreset,
    handleExportPresets,
    lastGraphModelPayload,
    runList,
    runsQuery,
    runFilter,
    setRunFilter,
    expandedRunHistory,
    setExpandedRunHistory,
    runHistorySelection,
    setRunHistorySelection,
    handleOpenRunDetail,
    handleResumeRun,
    handleCancelRun,
    handleRequeueDeadLetter,
    viewportRef,
    canvasRef,
    configOpen,
    modelOptions,
    parserSamples,
    setParserSamples,
    parserSampleLoading,
    updaterSamples,
    setUpdaterSamples,
    updaterSampleLoading,
    pathDebugSnapshots,
    updateSelectedNodeConfig,
    handleFetchParserSample,
    handleFetchUpdaterSample,
    handleRunSimulation,
    clearRuntimeForNode,
    handleSendToAi,
    sendingToAi,
    dbQueryPresets,
    setDbQueryPresets,
    saveDbQueryPresets,
    dbNodePresets,
    setDbNodePresets,
    saveDbNodePresets,
    runDetailOpen,
    setRunDetailOpen,
    runDetailLoading,
    runDetail,
    runStreamStatus,
    runStreamPaused,
    setRunStreamPaused,
    runNodeSummary,
    runEventsOverflow,
    runEventsBatchLimit,
    runDetailHistoryOptions,
    runDetailSelectedHistoryNodeId,
    setRunHistoryNodeId,
    runDetailSelectedHistoryEntries,
    presetsModalOpen,
    setPresetsModalOpen,
    presetsJson,
    setPresetsJson,
    handleImportPresets,
    simulationOpenNodeId,
    reportAiPathsError,
    toast,
  } = state;

  if (loading) {
    return <div className="text-sm text-gray-400">Loading AI Paths...</div>;
  }

  return (
    <div className="space-y-6">
      {activeTab === "canvas" && (
        <div className="space-y-6">
          {typeof document !== "undefined" && renderActions
            ? createPortal(
                renderActions(
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      className="rounded-md border text-sm text-white hover:bg-muted/60"
                      type="button"
                      onClick={handleCreatePath}
                    >
                      New Path
                    </Button>
                    <Button
                      className="rounded-md border border-indigo-500/40 text-sm text-indigo-200 hover:bg-indigo-500/10"
                      type="button"
                      onClick={handleCreateAiDescriptionPath}
                    >
                      Create AI Description Path
                    </Button>
                    <Button
                      className="rounded-md border text-sm text-white hover:bg-muted/60"
                      onClick={() => { void handleSave(); }}
                      disabled={saving}
                    >
                      {saving ? "Saving..." : "Save Path"}
                    </Button>
                    <Button
                      className="rounded-md border border-border text-sm text-gray-300 hover:bg-card/60"
                      onClick={handleReset}
                      type="button"
                    >
                      Reset to Defaults
                    </Button>
                    <Button
                      className="rounded-md border border-border text-sm text-rose-200 hover:bg-rose-500/10"
                      onClick={() => void handleDeletePath()}
                      type="button"
                      disabled={!activePathId}
                    >
                      Delete Path
                    </Button>
                    {lastError && (
                      <div className="flex items-center gap-2 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-xs text-rose-200">
                        <span className="max-w-[220px] truncate">
                          Last error: {lastError.message}
                        </span>
                        <Button
                          type="button"
                          className="rounded-md border border-rose-400/50 px-2 py-1 text-[10px] text-rose-100 hover:bg-rose-500/20"
                          onClick={() => {
                            setLastError(null);
                            void persistLastError(null);
                          }}
                        >
                          Clear
                        </Button>
                        {lastError.message === "Failed to load AI Paths settings" && (
                          <Button
                            type="button"
                            className="rounded-md border border-rose-400/50 px-2 py-1 text-[10px] text-rose-100 hover:bg-rose-500/20"
                            onClick={() => {
                              setLastError(null);
                              void persistLastError(null);
                              setLoadNonce((prev: number) => prev + 1);
                            }}
                          >
                            Retry
                          </Button>
                        )}
                        <Button
                          type="button"
                          className="rounded-md border border-rose-400/50 px-2 py-1 text-[10px] text-rose-100 hover:bg-rose-500/20"
                          onClick={() =>
                            window.location.assign(
                              `/admin/system/logs?level=error&source=client&query=${encodeURIComponent(
                                "AI Paths"
                              )}`
                            )
                          }
                        >
                          View logs
                        </Button>
                      </div>
                    )}
                  </div>
                ),
                document.getElementById("ai-paths-actions") ?? document.body
              )
            : null}
          {typeof document !== "undefined" && activePathId
            ? createPortal(
                <div className="flex items-center gap-2">
                  <div
                    className={`rounded-md border px-2 py-1 text-[10px] ${autoSaveClasses}`}
                  >
                    {autoSaveLabel}
                  </div>
                  {lastRunAt && (
                    <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-200">
                      Last run: {new Date(lastRunAt).toLocaleTimeString()}
                    </div>
                  )}
                  <Input
                    className="h-9 w-[260px] rounded-md border border-border bg-card/60 px-3 text-sm text-white"
                    value={pathName}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                      const value = event.target.value;
                      setPathName(value);
                      updateActivePathMeta(value);
                    }}
                    placeholder="Path name"
                  />
                </div>,
                document.getElementById("ai-paths-name") ?? document.body
              )
            : null}

          <div className="flex flex-wrap items-start gap-6">
            <div className="min-w-[240px] flex-1 space-y-4" />
            <div className="min-w-[220px] space-y-4" />
          </div>

          <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
            <div className="space-y-4">
              <CanvasSidebar
                palette={palette}
                paletteCollapsed={paletteCollapsed}
                onTogglePaletteCollapsed={() => setPaletteCollapsed((prev: boolean) => !prev)}
                expandedPaletteGroups={expandedPaletteGroups}
                onTogglePaletteGroup={togglePaletteGroup}
                onDragStart={handleDragStart}
                selectedNode={selectedNode}
                nodes={nodes}
                edges={edges}
                selectedEdgeId={selectedEdgeId}
                onSelectEdge={handleSelectEdge}
                onFireTrigger={handleFireTrigger}
                onFireTriggerPersistent={(node: AiNode, event?: React.MouseEvent<HTMLButtonElement>): void => { void handleFireTriggerPersistent(node, event); }}
                onOpenSimulation={setSimulationOpenNodeId}
                onUpdateSelectedNode={updateSelectedNode}
                onOpenNodeConfig={() => setConfigOpen(true)}
                onDeleteSelectedNode={handleDeleteSelectedNode}
                onRemoveEdge={handleRemoveEdge}
                onClearWires={() => void handleClearWires()}
              />
              <ClusterPresetsPanel
                presetDraft={presetDraft}
                setPresetDraft={setPresetDraft}
                editingPresetId={editingPresetId}
                onResetPresetDraft={handleResetPresetDraft}
                onPresetFromSelection={handlePresetFromSelection}
                onSavePreset={() => void handleSavePreset()}
                clusterPresets={clusterPresets}
                onLoadPreset={handleLoadPreset}
                onApplyPreset={handleApplyPreset}
                onDeletePreset={(presetId: string) => void handleDeletePreset(presetId)}
                onExportPresets={handleExportPresets}
              />
              <GraphModelDebugPanel payload={lastGraphModelPayload} />
              <RunHistoryPanel
                runs={runList}
                isRefreshing={runsQuery.isFetching}
                onRefresh={() => { void runsQuery.refetch(); }}
                runFilter={runFilter}
                setRunFilter={setRunFilter}
                expandedRunHistory={expandedRunHistory}
                setExpandedRunHistory={setExpandedRunHistory}
                runHistorySelection={runHistorySelection}
                setRunHistorySelection={setRunHistorySelection}
                onOpenRunDetail={(runId: string) => { void handleOpenRunDetail(runId); }}
                onResumeRun={(runId: string, mode: "resume" | "replay") => void handleResumeRun(runId, mode)}
                onCancelRun={(runId: string) => void handleCancelRun(runId)}
                onRequeueDeadLetter={(runId: string) => void handleRequeueDeadLetter(runId)}
              />
            </div>
            <CanvasBoard
              viewportRef={viewportRef}
              canvasRef={canvasRef}
              nodes={nodes}
              edges={edges}
              runtimeState={runtimeState}
              edgePaths={edgePaths}
              view={view}
              panState={panState}
              lastDrop={lastDrop}
              connecting={connecting}
              connectingPos={connectingPos}
              connectingFromNode={connectingFromNode}
              selectedNodeId={selectedNodeId}
              draggingNodeId={dragState?.nodeId ?? null}
              selectedEdgeId={selectedEdgeId}
              onSelectEdgeId={handleSelectEdge}
              onRemoveEdge={handleRemoveEdge}
              onDisconnectPort={handleDisconnectPort}
              onReconnectInput={handleReconnectInput}
              onSelectNode={handleSelectNode}
              onOpenNodeConfig={() => setConfigOpen(true)}
              onFireTrigger={handleFireTrigger}
              onPointerDownNode={handlePointerDown}
              onPointerMoveNode={handlePointerMove}
              onPointerUpNode={handlePointerUp}
              onStartConnection={handleStartConnection}
              onCompleteConnection={handleCompleteConnection}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onPanStart={handlePanStart}
              onPanMove={handlePanMove}
              onPanEnd={handlePanEnd}
              onZoomTo={zoomTo}
              onFitToNodes={fitToNodes}
              onResetView={resetView}
            />
          </div>
        </div>
      )}

      {activeTab === "paths" && (
        <PathsTabPanel
          paths={paths}
          onCreatePath={() => { void handleCreatePath(); }}
          onCreateAiDescriptionPath={() => { void handleCreateAiDescriptionPath(); }}
          onSaveList={() => { void savePathIndex(paths); }}
          onEditPath={(pathId: string): void => {
            handleSwitchPath(pathId);
            onTabChange?.("canvas");
          }}
          onDeletePath={(pathId: string): void => {
            void handleDeletePath(pathId);
          }}
        />
      )}

      {activeTab === "docs" && (
        <DocsTabPanel
          docsWiringSnippet={docsWiringSnippet}
          docsDescriptionSnippet={docsDescriptionSnippet}
          docsJobsSnippet={docsJobsSnippet}
          onCopyDocsWiring={() => void handleCopyDocsWiring()}
          onCopyDocsDescription={() => void handleCopyDocsDescription()}
          onCopyDocsJobs={() => void handleCopyDocsJobs()}
        />
      )}

      {activeTab === "queue" && <JobQueuePanel activePathId={activePathId} />}

      <NodeConfigDialog
        configOpen={configOpen}
        setConfigOpen={setConfigOpen}
        selectedNode={selectedNode}
        nodes={nodes}
        edges={edges}
        modelOptions={modelOptions}
        parserSamples={parserSamples}
        setParserSamples={setParserSamples}
        parserSampleLoading={parserSampleLoading}
        updaterSamples={updaterSamples}
        setUpdaterSamples={setUpdaterSamples}
        updaterSampleLoading={updaterSampleLoading}
        runtimeState={runtimeState}
        pathDebugSnapshot={
          (activePathId ? pathDebugSnapshots[activePathId] : null) ?? null
        }
        updateSelectedNode={updateSelectedNode}
        updateSelectedNodeConfig={updateSelectedNodeConfig}
        handleFetchParserSample={handleFetchParserSample}
        handleFetchUpdaterSample={handleFetchUpdaterSample}
        handleRunSimulation={handleRunSimulation}
        clearRuntimeForNode={clearRuntimeForNode}
        onSendToAi={handleSendToAi}
        sendingToAi={sendingToAi}
        dbQueryPresets={dbQueryPresets}
        setDbQueryPresets={setDbQueryPresets}
        saveDbQueryPresets={saveDbQueryPresets}
        dbNodePresets={dbNodePresets}
        setDbNodePresets={setDbNodePresets}
        saveDbNodePresets={saveDbNodePresets}
        toast={toast}
      />
      <RunDetailDialog
        open={runDetailOpen}
        onOpenChange={(open: boolean): void => {
          setRunDetailOpen(open);
          if (open) setRunStreamPaused(false);
          if (!open) setRunDetail(null);
        }}
        runDetailLoading={runDetailLoading}
        runDetail={runDetail}
        runStreamStatus={runStreamStatus}
        runStreamPaused={runStreamPaused}
        onToggleStreamPause={() => setRunStreamPaused((prev: boolean) => !prev)}
        runNodeSummary={runNodeSummary}
        runEventsOverflow={runEventsOverflow}
        runEventsBatchLimit={runEventsBatchLimit}
        historyOptions={runDetailHistoryOptions}
        selectedHistoryNodeId={runDetailSelectedHistoryNodeId}
        onSelectHistoryNode={(value: string) => setRunHistoryNodeId(value)}
        historyEntries={runDetailSelectedHistoryEntries}
      />
      <PresetsDialog
        open={presetsModalOpen}
        onOpenChange={(open: boolean): void => setPresetsModalOpen(open)}
        presetsJson={presetsJson}
        setPresetsJson={setPresetsJson}
        clusterPresets={clusterPresets}
        onImportPresets={(mode: "merge" | "replace") => void handleImportPresets(mode)}
        toast={toast}
        reportAiPathsError={reportAiPathsError}
      />

      <SimulationDialog
        openNodeId={simulationOpenNodeId}
        onClose={() => setSimulationOpenNodeId(null)}
        nodes={nodes}
        setNodes={setNodes}
        onRunSimulation={handleRunSimulation}
      />
    </div>
  );
}
