"use client";

import { createPortal } from "react-dom";
import { useMemo, useState } from "react";
import { Button, Input, Label, UnifiedSelect, SharedModal } from "@/shared/ui";
import { CanvasBoardMigrated } from "../examples/CanvasBoardMigrated";
import { CanvasSidebarWrapper } from "../examples/CanvasSidebarWrapper";
import { ClusterPresetsPanelMigrated } from "../examples/ClusterPresetsPanelMigrated";
import { DocsTabPanel, PathsTabPanel } from "../ui-panels";
import { GraphModelDebugPanel } from "../graph-model-debug-panel";
import { NodeConfigDialogMigrated } from "../examples/NodeConfigDialogMigrated";
import { PresetsDialogWithContext } from "../presets-dialog";
import { RunDetailDialogWithContext } from "../run-detail-dialog";
import { RunHistoryPanelMigrated } from "../examples/RunHistoryPanelMigrated";
import { SimulationDialogMigrated } from "../examples/SimulationDialogMigrated";
import type {
  AiNode,
  ClusterPreset,
  NodeDefinition
} from "@/features/ai/ai-paths/lib";
import type { PathConfig, PathMeta } from "@/shared/types/ai-paths";
import type { AiPathsSettingsState } from "./useAiPathsSettingsState";

type AiPathsSettingsViewProps = {
  activeTab: "canvas" | "paths" | "docs";
  renderActions?: ((actions: React.ReactNode) => React.ReactNode) | undefined;
  onTabChange?: ((tab: "canvas" | "paths" | "docs") => void) | undefined;
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
    docsOverviewSnippet,
    docsWiringSnippet,
    docsDescriptionSnippet,
    docsJobsSnippet,
    handleCopyDocsWiring,
    handleCopyDocsDescription,
    handleCopyDocsJobs,
    autoSaveLabel,
    autoSaveClasses,
    saving,
    nodeConfigDirty,
    handleCreatePath,
    handleSave,
    handleReset,
    handleDeletePath,
    isPathLocked,
    isPathActive,
    handleTogglePathLock,
    handleTogglePathActive,
    activePathId,
    activeTrigger,
    executionMode,
    handleExecutionModeChange,
    triggers,
    lastError,
    setLastError,
    persistLastError,
    setLoadNonce,
    lastRunAt,
    pathName,
    setPathName,
    updateActivePathMeta,
    paths,
    pathConfigs,
    pathFlagsById,
    handleSwitchPath,
    savePathIndex,
    setNodes,
    runtimeState,
    palette,
    handleDragStart,
    handleFireTrigger,
    handleFireTriggerPersistent,
    updateSelectedNode,
    handleDeleteSelectedNode,
    handleRemoveEdge,
    handleClearWires,
    handleClearConnectorData,
    handleClearHistory,
    handleDisconnectPort,
    handleReconnectInput,
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
    handlePresetFromSelection,
    handleSavePreset,
    handleApplyPreset,
    handleDeletePreset,
    handleExportPresets,
    lastGraphModelPayload,
    runList,
    runsQuery,
    handleOpenRunDetail,
    handleResumeRun,
    handleCancelRun,
    handleRequeueDeadLetter,
    setNodeConfigDirty,
    modelOptions,
    updateSelectedNodeConfig,
    handleFetchParserSample,
    handleFetchUpdaterSample,
    handleRunSimulation,
    handleSendToAi,
    saveDbQueryPresets,
    saveDbNodePresets,
    handleImportPresets,
    reportAiPathsError,
    toast,
  } = state;

  const hasHistory = Object.keys(runtimeState.history ?? {}).length > 0;

  const [renameOpen, setRenameOpen] = useState(false);
  const [renameDraft, setRenameDraft] = useState("");

  const activePathConfig: PathConfig | undefined = activePathId ? pathConfigs?.[activePathId] : undefined;
  const groupKey: string | null =
    (activePathConfig?.trigger && activePathConfig.trigger.trim().length > 0
      ? activePathConfig.trigger
      : activeTrigger?.trim()
        ? activeTrigger
        : triggers?.[0]) ?? null;

  const groupPaths = useMemo(() => {
    if (!groupKey) return paths;
    const filtered = paths.filter((p: PathMeta) => {
      const cfg = pathConfigs?.[p.id];
      const trig = typeof cfg?.trigger === "string" ? cfg.trigger : "";
      return trig === groupKey;
    });
    return filtered.length > 0 ? filtered : paths;
  }, [groupKey, pathConfigs, paths]);

  const executionOptions = useMemo(
    () => [
      { value: "server", label: "Run on Server" },
      { value: "local", label: "Run Locally" },
    ],
    []
  );

  const setNodesFromUser: React.Dispatch<React.SetStateAction<AiNode[]>> = (
    next: React.SetStateAction<AiNode[]>
  ): void => {
    if (isPathLocked) {
      toast("This path is locked. Unlock it to edit nodes or connections.", { variant: "info" });
      return;
    }
    setNodes(next);
  };

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
                      type="button"
                      className="rounded-md border border-border text-sm text-gray-300 hover:bg-card/60"
                      onClick={handleTogglePathLock}
                      disabled={!activePathId}
                      title={isPathLocked ? "Unlock to edit nodes and connections" : "Lock to prevent edits"}
                    >
                      {isPathLocked ? "Unlock Path" : "Lock Path"}
                    </Button>
                    <Button
                      type="button"
                      className={`rounded-md border text-sm ${isPathActive ? "border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/10" : "border-rose-500/40 text-rose-200 hover:bg-rose-500/10"}`}
                      onClick={handleTogglePathActive}
                      disabled={!activePathId}
                      title={isPathActive ? "Deactivate to stop runs" : "Activate to allow runs"}
                    >
                      {isPathActive ? "Deactivate" : "Activate"}
                    </Button>
                    <Button
                      className="rounded-md border text-sm text-white hover:bg-muted/60"
                      onClick={() => {
                        if (nodeConfigDirty) {
                          toast(
                            "You have unsaved node changes. Click Update Node in the config dialog before saving the path.",
                            { variant: "info" }
                          );
                          return;
                        }
                        void handleSave();
                      }}
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
                      className="rounded-md border border-amber-500/40 text-sm text-amber-200 hover:bg-amber-500/10"
                      onClick={() => {
                        void handleClearConnectorData();
                      }}
                      type="button"
                      disabled={!activePathId}
                    >
                      Clear Connector Data
                    </Button>
                    <Button
                      className="rounded-md border border-sky-500/40 text-sm text-sky-200 hover:bg-sky-500/10"
                      onClick={() => {
                        void handleClearHistory();
                      }}
                      type="button"
                      disabled={!activePathId}
                      title={hasHistory ? "Clear history for all nodes in this path" : "No history recorded yet"}
                    >
                      Clear History
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
                          onClick={(): void =>
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
                <div className="flex items-center justify-end gap-2">
                  <div className={`rounded-md border px-2 py-1 text-[10px] ${autoSaveClasses}`}>
                    {autoSaveLabel}
                  </div>
                  {lastRunAt && (
                    <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-200">
                      Last run: {new Date(lastRunAt).toLocaleTimeString()}
                    </div>
                  )}
                  <div className="flex flex-col items-end gap-1">
                    <Label className="text-[10px] uppercase text-gray-500">Execution</Label>
                    <UnifiedSelect
                      value={executionMode}
                      onValueChange={(value: string): void => {
                        if (value !== executionMode) {
                          handleExecutionModeChange(value as "local" | "server");
                        }
                      }}
                      options={executionOptions}
                      className="w-[160px]"
                      triggerClassName="h-9 border-border bg-card/60 px-3 text-xs text-white"
                      disabled={isPathLocked}
                    />
                  </div>
                  <UnifiedSelect
                    value={activePathId}
                    onValueChange={(value: string): void => {
                      if (!value || value === activePathId) return;
                      handleSwitchPath(value);
                    }}
                    options={groupPaths.map((path: PathMeta) => ({
                      value: path.id,
                      label: path.name
                    }))}
                    placeholder="Switch path"
                    className="w-[320px]"
                    triggerClassName="h-9 border-border bg-card/60 px-3 text-sm text-white"
                  />
                  <Button
                    type="button"
                    className="h-9 rounded-md border border-border text-sm text-gray-200 hover:bg-card/60"
                    onClick={() => {
                      setRenameDraft(pathName);
                      setRenameOpen(true);
                    }}
                    disabled={!activePathId}
                    title="Rename this path"
                  >
                    Rename
                  </Button>
                </div>,
                document.getElementById("ai-paths-name") ?? document.body
              )
            : null}

          <SharedModal
            open={renameOpen}
            onClose={() => setRenameOpen(false)}
            title="Rename Path"
            size="sm"
            footer={
              <div className="flex w-full justify-end gap-2">
                <Button
                  type="button"
                  className="rounded-md border border-border text-sm text-gray-200 hover:bg-card/60"
                  onClick={() => setRenameOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="rounded-md border text-sm text-white hover:bg-muted/60"
                  onClick={() => {
                    const nextName = renameDraft.trim();
                    if (!nextName) {
                      toast("Path name is required.", { variant: "error" });
                      return;
                    }
                    setPathName(nextName);
                    updateActivePathMeta(nextName);
                    setRenameOpen(false);
                    void handleSave();
                  }}
                >
                  Save
                </Button>
              </div>
            }
          >
            <div className="space-y-2">
              <div className="space-y-1">
                <Label className="text-xs text-gray-400">Name</Label>
                <Input
                  className="h-9 w-full rounded-md border border-border bg-card/60 px-3 text-sm text-white"
                  value={renameDraft}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => setRenameDraft(event.target.value)}
                  placeholder="Path name"
                  autoFocus
                />
              </div>
            </div>
          </SharedModal>

          <div className="flex flex-wrap items-start gap-6">
            <div className="min-w-[240px] flex-1 space-y-4" />
            <div className="min-w-[220px] space-y-4" />
          </div>

          <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
            <div className="space-y-4">
              <CanvasSidebarWrapper
                palette={palette}
                onDragStart={(e: React.DragEvent<HTMLDivElement>, node: NodeDefinition) => { void handleDragStart(e, node); }}
                onFireTrigger={(node: AiNode) => void handleFireTrigger(node)}
                onFireTriggerPersistent={(node: AiNode) => void handleFireTriggerPersistent(node)}
                onUpdateSelectedNode={updateSelectedNode}
                onDeleteSelectedNode={handleDeleteSelectedNode}
                onRemoveEdge={handleRemoveEdge}
                onClearWires={() => void handleClearWires()}
              />
              <ClusterPresetsPanelMigrated
                onPresetFromSelection={handlePresetFromSelection}
                onSavePreset={() => void handleSavePreset()}
                onApplyPreset={(preset: ClusterPreset) => void handleApplyPreset(preset)}
                onDeletePreset={(presetId: string) => void handleDeletePreset(presetId)}
                onExportPresets={handleExportPresets}
              />
              <GraphModelDebugPanel payload={lastGraphModelPayload} />
              <RunHistoryPanelMigrated
                runs={runList}
                isRefreshing={runsQuery.isFetching}
                onRefresh={() => { void runsQuery.refetch(); }}
                onOpenRunDetail={(runId: string) => { void handleOpenRunDetail(runId); }}
                onResumeRun={(runId: string, mode: "resume" | "replay") => void handleResumeRun(runId, mode)}
                onCancelRun={(runId: string) => void handleCancelRun(runId)}
                onRequeueDeadLetter={(runId: string) => void handleRequeueDeadLetter(runId)}
              />
            </div>
            <CanvasBoardMigrated
              onRemoveEdge={handleRemoveEdge}
              onDisconnectPort={handleDisconnectPort}
              onReconnectInput={handleReconnectInput}
              onFireTrigger={(node) => void handleFireTrigger(node)}
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
          pathFlagsById={pathFlagsById}
          onCreatePath={() => { void handleCreatePath(); }}
                          onSaveList={() => { void savePathIndex(paths[0]?.id ?? ''); }}          onEditPath={(pathId: string): void => {
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
          docsOverviewSnippet={docsOverviewSnippet}
          docsWiringSnippet={docsWiringSnippet}
          docsDescriptionSnippet={docsDescriptionSnippet}
          docsJobsSnippet={docsJobsSnippet}
          onCopyDocsWiring={() => void handleCopyDocsWiring()}
          onCopyDocsDescription={() => void handleCopyDocsDescription()}
          onCopyDocsJobs={() => void handleCopyDocsJobs()}
        />
      )}

      <NodeConfigDialogMigrated
        modelOptions={modelOptions}
        updateSelectedNode={updateSelectedNode}
        updateSelectedNodeConfig={updateSelectedNodeConfig}
        handleFetchParserSample={handleFetchParserSample}
        handleFetchUpdaterSample={handleFetchUpdaterSample}
        handleRunSimulation={(node) => void handleRunSimulation(node.id)}
        onSendToAi={(id, prompt) => handleSendToAi(id, prompt)}
        saveDbQueryPresets={saveDbQueryPresets}
        saveDbNodePresets={saveDbNodePresets}
        toast={toast}
        onDirtyChange={setNodeConfigDirty}
        savePathConfig={handleSave}
      />
      <RunDetailDialogWithContext />
      <PresetsDialogWithContext
        onImportPresets={() => void handleImportPresets("merge")}
        toast={toast}
        reportAiPathsError={reportAiPathsError}
      />

      <SimulationDialogMigrated
        setNodes={setNodesFromUser}
        onRunSimulation={(node) => void handleRunSimulation(node.id)}
      />
    </div>
  );
}
