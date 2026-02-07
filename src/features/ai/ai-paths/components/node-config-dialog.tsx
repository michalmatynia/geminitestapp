'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';


import type {
  AiNode,
  DbNodePreset,
  DbQueryPreset,
  Edge,
  NodeConfig,
  ParserSampleState,
  PathDebugSnapshot,
  RuntimeState,
  UpdaterSampleState,
} from '@/features/ai/ai-paths/lib';
import { stableStringify } from '@/features/ai/ai-paths/lib';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/ui';

import { NodeHistoryTab } from './node-config/dialog/NodeHistoryTab'; // Keep NodeHistoryTab import
import { NodeNotesTab } from './node-config/dialog/NodeNotesTab';
import { NodeConfigurationSections } from './NodeConfigurationSections'; // Import the new component
import { useSelectionActions } from '../context';

type NodeConfigDialogProps = {
  configOpen: boolean;
  setConfigOpen: (open: boolean) => void;
  selectedNode: AiNode | null;
  nodes: AiNode[];
  edges: Edge[];
  isPathLocked: boolean;
  modelOptions: string[];
  parserSamples: Record<string, ParserSampleState>;
  setParserSamples: React.Dispatch<React.SetStateAction<Record<string, ParserSampleState>>>;
  parserSampleLoading: boolean;
  updaterSamples: Record<string, UpdaterSampleState>;
  setUpdaterSamples: React.Dispatch<React.SetStateAction<Record<string, UpdaterSampleState>>>;
  updaterSampleLoading: boolean;
  runtimeState: RuntimeState;
  pathDebugSnapshot?: PathDebugSnapshot | null;
  updateSelectedNode: (patch: Partial<AiNode>, options?: { nodeId?: string }) => void;
  updateSelectedNodeConfig: (patch: Partial<NodeConfig>) => void;
  handleFetchParserSample: (nodeId: string, entityType: string, entityId: string) => Promise<void>;
  handleFetchUpdaterSample: (
    nodeId: string,
    entityType: string,
    entityId: string,
    options?: { notify?: boolean }
  ) => Promise<void>;
  handleRunSimulation: (node: AiNode) => void | Promise<void>;
  clearRuntimeForNode?: ((nodeId: string) => void) | undefined;
  clearNodeHistory?: ((nodeId: string) => void | Promise<void>) | undefined;
  onSendToAi?: ((databaseNodeId: string, prompt: string) => Promise<void>) | undefined;
  sendingToAi?: boolean | undefined;
  dbQueryPresets: DbQueryPreset[];
  setDbQueryPresets: React.Dispatch<React.SetStateAction<DbQueryPreset[]>>;
  saveDbQueryPresets: (nextPresets: DbQueryPreset[]) => Promise<void>;
  dbNodePresets: DbNodePreset[];
  setDbNodePresets: React.Dispatch<React.SetStateAction<DbNodePreset[]>>;
  saveDbNodePresets: (nextPresets: DbNodePreset[]) => Promise<void>;
  toast: (
    message: string,
    options?: { variant?: 'success' | 'error' | 'info' | 'warning' }
  ) => void;
  onDirtyChange?: (dirty: boolean) => void;
  savePathConfig?: (options?: {
    silent?: boolean | undefined;
    includeNodeConfig?: boolean | undefined;
    force?: boolean | undefined;
    nodesOverride?: AiNode[] | undefined;
    nodeOverride?: AiNode | undefined;
    edgesOverride?: Edge[] | undefined;
  }) => Promise<boolean>;
};

export function NodeConfigDialog({
  configOpen,
  setConfigOpen,
  selectedNode,
  nodes,
  edges,
  isPathLocked,
  modelOptions,
  parserSamples,
  setParserSamples,
  parserSampleLoading,
  updaterSamples,
  setUpdaterSamples,
  updaterSampleLoading,
  runtimeState,
  pathDebugSnapshot,
  updateSelectedNode,
  handleFetchParserSample,
  handleFetchUpdaterSample,
  handleRunSimulation,
  clearRuntimeForNode,
  clearNodeHistory,
  onSendToAi,
  sendingToAi,
  dbQueryPresets,
  setDbQueryPresets,
  saveDbQueryPresets,
  dbNodePresets,
  setDbNodePresets,
  saveDbNodePresets,
  toast,
  onDirtyChange,
  savePathConfig,
}: NodeConfigDialogProps): React.JSX.Element | null {
  if (!selectedNode) return null;
  const { setNodeConfigDraft } = useSelectionActions();
  const isScheduledTrigger =
    selectedNode.type === 'trigger' &&
    selectedNode.config?.trigger?.event === 'scheduled_run';
  const cloneNode = useCallback((node: AiNode): AiNode => {
    if (typeof structuredClone === 'function') {
      return structuredClone(node);
    }
    return JSON.parse(JSON.stringify(node)) as AiNode;
  }, []);
  const mergeConfigPatch = useCallback(
    (current: NodeConfig | undefined, patch: Partial<NodeConfig>): NodeConfig => {
      const base = current ?? {};
      const merged = { ...base } as Record<string, unknown>;
      for (const key of Object.keys(patch) as Array<keyof NodeConfig>) {
        const patchValue = patch[key];
        const currentValue = base[key];
        if (
          patchValue &&
          typeof patchValue === 'object' &&
          !Array.isArray(patchValue) &&
          currentValue &&
          typeof currentValue === 'object' &&
          !Array.isArray(currentValue)
        ) {
          merged[key as string] = { ...(currentValue as object), ...(patchValue as object) };
        } else {
          merged[key as string] = patchValue as unknown;
        }
      }
      return merged as NodeConfig;
    },
    []
  );
  const [draftNode, setDraftNode] = useState<AiNode | null>(null);
  const [closePromptOpen, setClosePromptOpen] = useState(false);

  useEffect((): void => {
    if (!configOpen || !selectedNode) {
      setDraftNode(null);
      setNodeConfigDraft(null);
      return;
    }
    setDraftNode((prev: AiNode | null) => {
      if (!prev || prev.id !== selectedNode.id) {
        return cloneNode(selectedNode);
      }
      return prev;
    });
  }, [configOpen, selectedNode?.id, cloneNode, setNodeConfigDraft]);

  useEffect((): void => {
    if (!configOpen) return;
    setNodeConfigDraft(draftNode);
  }, [configOpen, draftNode, setNodeConfigDraft]);

  const draftSelectedNode = draftNode ?? selectedNode;
  const nodesForConfig = useMemo((): AiNode[] => {
    if (!draftNode) return nodes;
    return nodes.map((node: AiNode): AiNode =>
      node.id === draftNode.id ? draftNode : node
    );
  }, [nodes, draftNode]);

  const updateDraftNode = useCallback(
    (patch: Partial<AiNode>): void => {
      setDraftNode((prev: AiNode | null) => {
        const base = prev ?? (selectedNode ? cloneNode(selectedNode) : null);
        if (!base) return prev;
        const next: AiNode = { ...base, ...patch };
        if (patch.config) {
          next.config = mergeConfigPatch(base.config, patch.config);
        }
        return next;
      });
    },
    [cloneNode, mergeConfigPatch, selectedNode]
  );

  const updateDraftConfig = useCallback(
    (patch: Partial<NodeConfig>): void => {
      updateDraftNode({ config: patch });
    },
    [updateDraftNode]
  );

  const hasUnsavedChanges = useMemo((): boolean => {
    if (!draftNode || !selectedNode) return false;
    return stableStringify(draftNode) !== stableStringify(selectedNode);
  }, [draftNode, selectedNode]);

  useEffect((): (() => void) | void => {
    if (!onDirtyChange) return;
    onDirtyChange(hasUnsavedChanges);
    return (): void => onDirtyChange(false);
  }, [hasUnsavedChanges, onDirtyChange]);

  const handleUpdateNode = useCallback((): void => {
    if (!draftNode) return;
    if (isPathLocked) {
      toast('This path is locked. Unlock it to save node settings.', { variant: 'info' });
      return;
    }
    updateSelectedNode(draftNode, { nodeId: draftNode.id });
    setDraftNode(null);
    if (savePathConfig) {
      void savePathConfig({
        silent: true,
        includeNodeConfig: true,
        force: true,
        nodeOverride: draftNode,
      }).then((saved: boolean): void => {
        toast(saved ? 'Node settings saved.' : 'Failed to save node settings.', {
          variant: saved ? 'success' : 'error',
        });
      });
    } else {
      toast('Node settings updated in canvas. Click "Save Path" to persist.', { variant: 'success' });
    }
  }, [draftNode, isPathLocked, toast, updateSelectedNode, savePathConfig]);

  const handleDiscardChanges = useCallback((): void => {
    if (!hasUnsavedChanges) return;
    setDraftNode(null);
    toast('Changes discarded.', { variant: 'success' });
  }, [hasUnsavedChanges, toast]);

  const requestClose = useCallback((): void => {
    if (!hasUnsavedChanges) {
      setConfigOpen(false);
      return;
    }
    setClosePromptOpen(true);
  }, [hasUnsavedChanges, setConfigOpen]);

  const handleSaveAndClose = useCallback((): void => {
    handleUpdateNode();
    setClosePromptOpen(false);
    setConfigOpen(false);
  }, [handleUpdateNode, setConfigOpen]);

  const handleDiscardAndClose = useCallback((): void => {
    handleDiscardChanges();
    setClosePromptOpen(false);
    setConfigOpen(false);
  }, [handleDiscardChanges, setConfigOpen]);

  return (
    <>
      <Dialog
        open={configOpen}
        onOpenChange={(open: boolean): void => {
          if (open) {
            setConfigOpen(true);
            return;
          }
          requestClose();
        }}
      >
        <DialogContent className="max-h-[85vh] w-[95vw] max-w-4xl overflow-y-auto border border-border bg-card text-white">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-lg">
                <span>Configure {selectedNode.title}</span>
                {isScheduledTrigger ? (
                  <span className="rounded-full border border-amber-400/60 bg-amber-500/15 px-2 py-[1px] text-[10px] uppercase text-amber-200">
                  Scheduled
                  </span>
                ) : null}
              </DialogTitle>
              <Button
                type="button"
                size="sm"
                className="rounded border px-3 py-1 text-xs text-gray-300 hover:bg-muted/50"
                onClick={requestClose}
              >
              Close
              </Button>
            </div>
          </DialogHeader>
          <Tabs defaultValue="settings" className="mt-2">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            <TabsContent value="settings">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-card/60 px-3 py-2">
                <div className="text-[11px] text-gray-400">
                  {hasUnsavedChanges
                    ? 'Unsaved changes (manual update required).'
                    : 'Node settings are applied in canvas. Click "Save Path" to persist.'}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    className="rounded-md border border-muted-foreground/40 text-xs text-gray-300 hover:bg-muted/50 disabled:opacity-50"
                    disabled={!hasUnsavedChanges}
                    onClick={handleDiscardChanges}
                  >
                  Discard Changes
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="rounded-md border border-emerald-500/40 text-xs text-emerald-200 hover:bg-emerald-500/10 disabled:opacity-50"
                    disabled={!hasUnsavedChanges || isPathLocked}
                    onClick={handleUpdateNode}
                  >
                  Update Node
                  </Button>
                </div>
              </div>
              {/* Render the new consolidated component here */}
              <NodeConfigurationSections
                selectedNode={draftSelectedNode}
                nodes={nodesForConfig}
                edges={edges}
                modelOptions={modelOptions}
                parserSamples={parserSamples}
                setParserSamples={setParserSamples}
                parserSampleLoading={parserSampleLoading}
                updaterSamples={updaterSamples}
                setUpdaterSamples={setUpdaterSamples}
                updaterSampleLoading={updaterSampleLoading}
                runtimeState={runtimeState}
                pathDebugSnapshot={pathDebugSnapshot}
                updateSelectedNode={updateDraftNode}
                updateSelectedNodeConfig={updateDraftConfig}
                handleFetchParserSample={handleFetchParserSample}
                handleFetchUpdaterSample={handleFetchUpdaterSample}
                handleRunSimulation={handleRunSimulation}
                clearRuntimeForNode={clearRuntimeForNode}
                onSendToAi={onSendToAi}
                sendingToAi={sendingToAi}
                dbQueryPresets={dbQueryPresets}
                setDbQueryPresets={setDbQueryPresets}
                saveDbQueryPresets={saveDbQueryPresets}
                dbNodePresets={dbNodePresets}
                setDbNodePresets={setDbNodePresets}
                saveDbNodePresets={saveDbNodePresets}
                toast={toast}
              />
            </TabsContent>
            <TabsContent value="notes">
              <NodeNotesTab
                selectedNode={draftSelectedNode}
                updateSelectedNodeConfig={updateDraftConfig}
              />
            </TabsContent>
            <TabsContent value="history">
              <NodeHistoryTab
                selectedNode={selectedNode}
                runtimeState={runtimeState}
                {...(clearNodeHistory && { onClearNodeHistory: clearNodeHistory })}
              />
            </TabsContent>
          </Tabs>
          <div className="mt-4 flex items-center justify-end gap-2 text-xs text-gray-400">
            <span className="text-[11px] uppercase tracking-wide text-gray-500">Node ID</span>
            <span className="max-w-[260px] truncate font-mono text-xs text-gray-300">
              {selectedNode.id}
            </span>
            <Button
              type="button"
              size="sm"
              className="rounded border border-border px-2 py-1 text-[11px] text-gray-200 hover:bg-muted/50"
              onClick={() => {
                void navigator.clipboard.writeText(selectedNode.id).then(
                  () => toast('Node ID copied.', { variant: 'success' }),
                  () => toast('Failed to copy Node ID.', { variant: 'error' })
                );
              }}
            >
              Copy
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog open={closePromptOpen} onOpenChange={setClosePromptOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes for this node. Save before closing?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setClosePromptOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event): void => {
                event.preventDefault();
                handleDiscardAndClose();
              }}
              className="bg-muted text-gray-200 hover:bg-muted/80"
            >
              Discard
            </AlertDialogAction>
            <AlertDialogAction
              onClick={(event): void => {
                event.preventDefault();
                handleSaveAndClose();
              }}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              Save & Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
