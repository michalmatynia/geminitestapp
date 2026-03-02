'use client';

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import type { AiNode, NodeConfig } from '@/shared/lib/ai-paths';
import { stableStringify } from '@/shared/lib/ai-paths';
import { Button, Tabs, TabsContent, TabsList, TabsTrigger, ConfirmModal } from '@/shared/ui';
import { DetailModal } from '@/shared/ui/templates/modals/DetailModal';

import { AiPathConfigProviderWithContext, useAiPathConfig } from './AiPathConfigContext';
import { NodeHistoryTab } from './node-config/dialog/NodeHistoryTab';
import { NodeNotesTab } from './node-config/dialog/NodeNotesTab';
import { NodeConfigurationSections } from './NodeConfigurationSections';
import { useSelectionActions } from '../context';

function NodeConfigDialogContent(): React.JSX.Element | null {
  const {
    configOpen,
    setConfigOpen,
    selectedNode,
    nodes,
    isPathLocked,
    updateSelectedNode,
    toast,
    savePathConfig,
  } = useAiPathConfig();

  const { setNodeConfigDraft, setNodeConfigDirty } = useSelectionActions();
  const hasSelectedNode = selectedNode !== null;
  const selectedNodeSafe = useMemo<AiNode>(
    () =>
      selectedNode ?? {
        id: '__missing-node__',
        createdAt: new Date(0).toISOString(),
        updatedAt: null,
        type: 'constant',
        title: 'Node',
        description: '',
        inputs: [],
        outputs: [],
        position: { x: 0, y: 0 },
        data: {},
        config: {},
      },
    [selectedNode]
  );
  const isScheduledTrigger =
    selectedNodeSafe.type === 'trigger' &&
    selectedNodeSafe.config?.trigger?.event === 'scheduled_run';
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
      if (prev?.id !== selectedNode.id) {
        return cloneNode(selectedNode);
      }
      return prev;
    });
  }, [configOpen, selectedNode?.id, cloneNode, setNodeConfigDraft]);

  useEffect((): void => {
    if (!configOpen) return;
    setNodeConfigDraft(draftNode);
  }, [configOpen, draftNode, setNodeConfigDraft]);

  const draftSelectedNode = draftNode ?? selectedNodeSafe;
  const resolvedNodeTypeId =
    typeof draftSelectedNode.nodeTypeId === 'string' &&
    draftSelectedNode.nodeTypeId.trim().length > 0
      ? draftSelectedNode.nodeTypeId
      : draftSelectedNode.type;
  const resolvedInstanceId =
    typeof draftSelectedNode.instanceId === 'string' &&
    draftSelectedNode.instanceId.trim().length > 0
      ? draftSelectedNode.instanceId
      : draftSelectedNode.id;
  const nodesForConfig = useMemo((): AiNode[] => {
    if (!draftNode) return nodes;
    return nodes.map((node: AiNode): AiNode => (node.id === draftNode.id ? draftNode : node));
  }, [nodes, draftNode]);

  const updateDraftNode = useCallback(
    (patch: Partial<AiNode>): void => {
      setDraftNode((prev: AiNode | null) => {
        const base = prev ?? (selectedNode ? cloneNode(selectedNode) : cloneNode(selectedNodeSafe));
        if (!base) return prev;
        const next: AiNode = { ...base, ...patch };
        if (patch.config) {
          next.config = mergeConfigPatch(base.config, patch.config);
        }
        return next;
      });
    },
    [cloneNode, mergeConfigPatch, selectedNode, selectedNodeSafe]
  );

  const updateDraftConfig = useCallback(
    (patch: Partial<NodeConfig>): void => {
      updateDraftNode({ config: patch });
    },
    [updateDraftNode]
  );
  const configContextOverrides = useMemo(
    () => ({
      selectedNode: draftSelectedNode,
      nodes: nodesForConfig,
      updateSelectedNode: updateDraftNode,
      updateSelectedNodeConfig: updateDraftConfig,
    }),
    [draftSelectedNode, nodesForConfig, updateDraftNode, updateDraftConfig]
  );

  const hasUnsavedChanges = useMemo((): boolean => {
    if (!draftNode || !selectedNode) return false;
    return stableStringify(draftNode) !== stableStringify(selectedNode);
  }, [draftNode, selectedNode]);

  useEffect((): (() => void) => {
    setNodeConfigDirty(hasUnsavedChanges);
    return (): void => setNodeConfigDirty(false);
  }, [hasUnsavedChanges, setNodeConfigDirty]);

  const handleUpdateNode = useCallback((): void => {
    if (!draftNode) return;
    if (isPathLocked) {
      toast('This path is locked. Unlock it to save node settings.', { variant: 'info' });
      return;
    }
    updateSelectedNode(draftNode, { nodeId: draftNode.id });
    setDraftNode(null);
    void (async (): Promise<void> => {
      const savedWithNodeOverride = await savePathConfig({
        silent: true,
        includeNodeConfig: true,
        force: true,
        nodeOverride: draftNode,
      });
      if (savedWithNodeOverride) {
        toast('Node settings saved.', { variant: 'success' });
        return;
      }
      const savedWithFallback = await savePathConfig({
        silent: true,
        includeNodeConfig: true,
        force: true,
      });
      toast(savedWithFallback ? 'Node settings saved.' : 'Failed to save node settings.', {
        variant: savedWithFallback ? 'success' : 'error',
      });
    })();
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

  if (!hasSelectedNode) return null;

  return (
    <>
      <DetailModal
        isOpen={configOpen}
        onClose={requestClose}
        title={`Configure ${selectedNodeSafe.title}`}
        size='lg'
        headerActions={
          <div className='flex items-center gap-2'>
            <Button
              data-doc-id='node_config_update'
              type='button'
              size='sm'
              className='rounded-md border border-emerald-500/40 text-xs text-emerald-200 hover:bg-emerald-500/10 disabled:opacity-50'
              disabled={!hasUnsavedChanges || isPathLocked}
              onClick={handleUpdateNode}
            >
              Update Node
            </Button>
            {isScheduledTrigger ? (
              <span className='rounded-full border border-amber-400/60 bg-amber-500/15 px-2 py-[1px] text-[10px] uppercase text-amber-200'>
                Scheduled
              </span>
            ) : null}
          </div>
        }
      >
        <AiPathConfigProviderWithContext overrides={configContextOverrides}>
          <Tabs defaultValue='settings' className='mt-2'>
            <TabsList className='w-full justify-start'>
              <TabsTrigger value='settings'>Settings</TabsTrigger>
              <TabsTrigger value='notes'>Notes</TabsTrigger>
              <TabsTrigger value='history'>History</TabsTrigger>
            </TabsList>
            <TabsContent value='settings'>
              <div className='mb-4 rounded-md border border-border bg-card/60 px-3 py-2'>
                <div className='text-[11px] text-gray-400'>
                  {hasUnsavedChanges
                    ? 'Unsaved changes (manual update required).'
                    : 'Node settings are applied in canvas. Click "Save Path" to persist.'}
                </div>
              </div>
              <NodeConfigurationSections />
            </TabsContent>
            <TabsContent value='notes'>
              <NodeNotesTab />
            </TabsContent>
            <TabsContent value='history'>
              <NodeHistoryTab />
            </TabsContent>
          </Tabs>
        </AiPathConfigProviderWithContext>
        <div className='mt-4 space-y-2 text-xs text-gray-400'>
          <div className='flex items-center justify-end gap-2'>
            <span className='text-[11px] uppercase tracking-wide text-gray-500'>Type ID</span>
            <span className='max-w-[260px] truncate font-mono text-xs text-gray-300'>
              {resolvedNodeTypeId}
            </span>
            <Button
              data-doc-id='node_config_copy_type_id'
              type='button'
              size='sm'
              className='rounded border border-border px-2 py-1 text-[11px] text-gray-200 hover:bg-muted/50'
              onClick={() => {
                void navigator.clipboard.writeText(resolvedNodeTypeId).then(
                  () => toast('Type ID copied.', { variant: 'success' }),
                  () => toast('Failed to copy Type ID.', { variant: 'error' })
                );
              }}
            >
              Copy
            </Button>
          </div>
          <div className='flex items-center justify-end gap-2'>
            <span className='text-[11px] uppercase tracking-wide text-gray-500'>Instance ID</span>
            <span className='max-w-[260px] truncate font-mono text-xs text-gray-300'>
              {resolvedInstanceId}
            </span>
            <Button
              data-doc-id='node_config_copy_instance_id'
              type='button'
              size='sm'
              className='rounded border border-border px-2 py-1 text-[11px] text-gray-200 hover:bg-muted/50'
              onClick={() => {
                void navigator.clipboard.writeText(resolvedInstanceId).then(
                  () => toast('Instance ID copied.', { variant: 'success' }),
                  () => toast('Failed to copy Instance ID.', { variant: 'error' })
                );
              }}
            >
              Copy
            </Button>
          </div>
        </div>
      </DetailModal>{' '}
      <ConfirmModal
        isOpen={closePromptOpen}
        onClose={() => setClosePromptOpen(false)}
        title='Unsaved Changes'
        message='You have unsaved changes for this node. Save before closing?'
        confirmText='Save & Close'
        cancelText='Keep Editing'
        onConfirm={handleSaveAndClose}
        extraAction={
          <Button
            variant='ghost'
            onClick={handleDiscardAndClose}
            className='bg-muted text-gray-200 hover:bg-muted/80'
          >
            Discard
          </Button>
        }
      />
    </>
  );
}

export function NodeConfigDialog(): React.JSX.Element {
  return (
    <AiPathConfigProviderWithContext>
      <NodeConfigDialogContent />
    </AiPathConfigProviderWithContext>
  );
}
