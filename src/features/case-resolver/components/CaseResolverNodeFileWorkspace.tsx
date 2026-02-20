'use client';

import { ExternalLink, FileCode2, FileText, Save, ScanLine, Sparkles } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { CanvasBoard } from '@/features/ai/ai-paths/components/canvas-board';
import {
  AiPathsProvider,
  useCanvasRefs,
  useCanvasState,
  useGraphActions,
  useGraphState,
  useSelectionActions,
  useSelectionState,
} from '@/features/ai/ai-paths/context';
import {
  NODE_MIN_HEIGHT,
  NODE_WIDTH,
  palette,
  stableStringify,
} from '@/features/ai/ai-paths/lib';
import { Button, useToast, Badge, Hint, SelectSimple, EmptyState } from '@/shared/ui';
import { PanelHeader } from '@/shared/ui/templates/panels';

import { useCaseResolverPageContext } from '../context/CaseResolverPageContext';
import {
  CASE_RESOLVER_DROP_DOCUMENT_TO_CANVAS_EVENT,
  CASE_RESOLVER_SHOW_DOCUMENT_IN_CANVAS_EVENT,
  parseCaseResolverTreeDropPayload,
  type CaseResolverDropDocumentToCanvasDetail,
  type CaseResolverShowDocumentInCanvasDetail,
} from '../drag';
import { parseNodeFileSnapshot, serializeNodeFileSnapshot } from '../settings';
import { type AiNode, type AiEdge, type NodeDefinition } from '@/shared/contracts/case-resolver';
import {
  type CaseResolverFile,
  type CaseResolverNodeFileMeta,
  type CaseResolverNodeFileSnapshot,
  type CaseResolverScanSlot,
} from '@/shared/contracts/case-resolver';
import {
  buildNode,
  buildPromptTemplateFromDroppedDocumentFile,
  clampCanvasPosition,
  ensureDocumentPromptPorts,
  resolvePromptConfig,
} from './case-resolver-canvas-utils';

// ─── helpers ─────────────────────────────────────────────────────────────────

const PREVIEW_MAX_CHARS = 400;

const resolveContentPreview = (file: CaseResolverFile): string => {
  if (file.fileType === 'document') {
    const text = file.documentContentPlainText.trim() || file.documentContentMarkdown.trim();
    if (!text) return '';
    return text.length > PREVIEW_MAX_CHARS ? `${text.slice(0, PREVIEW_MAX_CHARS)}…` : text;
  }
  if (file.fileType === 'scanfile') {
    const combined = file.scanSlots
      .map((slot: CaseResolverScanSlot) => slot.ocrText.trim())
      .filter(Boolean)
      .join('\n\n');
    if (!combined) return '';
    return combined.length > PREVIEW_MAX_CHARS
      ? `${combined.slice(0, PREVIEW_MAX_CHARS)}…`
      : combined;
  }
  return '';
};

// ─── inner component props ────────────────────────────────────────────────────

type NodeFileWorkspaceInnerProps = {
  assetId: string;
  assetName: string;
  snapshot: CaseResolverNodeFileSnapshot;
  onSnapshotChange: (updated: CaseResolverNodeFileSnapshot) => void;
};

// ─── selected-node side panel ─────────────────────────────────────────────────

type NodeFilePanelProps = {
  meta: CaseResolverNodeFileMeta;
  file: CaseResolverFile | null;
  onOpen: () => void;
};

function NodeFilePanel({ meta, file, onOpen }: NodeFilePanelProps): React.JSX.Element {
  const preview = file ? resolveContentPreview(file) : '';
  const typeLabel = meta.fileType === 'scanfile' ? 'Scan File' : 'Document';
  const TypeIcon = meta.fileType === 'scanfile' ? ScanLine : FileText;

  return (
    <div className='flex w-72 flex-shrink-0 flex-col gap-3 overflow-y-auto rounded-lg border border-border/60 bg-card/40 p-4'>
      <PanelHeader
        title={meta.fileName}
        subtitle={typeLabel}
        icon={<TypeIcon className='size-4 text-gray-400' />}
        refreshable={false}
        compact
      />

      {/* Content preview */}
      {file ? (
        <div className='flex flex-col gap-1'>
          <p className='text-[10px] uppercase tracking-wide text-gray-500'>Content preview</p>
          {preview ? (
            <div className='max-h-52 overflow-y-auto rounded border border-border/40 bg-background/60 p-2 text-[11px] leading-relaxed text-gray-300 whitespace-pre-wrap'>
              {preview}
            </div>
          ) : (
            <Hint size='xs' italic className='text-[11px]'>No text content yet.</Hint>
          )}
        </div>
      ) : (
        <p className='text-[11px] text-amber-400'>
          File no longer exists in this workspace.
        </p>
      )}

      {/* Open button */}
      {file ? (
        <Button
          type='button'
          onClick={onOpen}
          className='h-8 w-full rounded-md border border-blue-500/40 text-xs text-blue-100 hover:bg-blue-500/15'
        >
          <ExternalLink className='mr-1.5 size-3.5' />
          Open &ldquo;{meta.fileName}&rdquo;
        </Button>
      ) : null}
    </div>
  );
}

// ─── inner canvas component ───────────────────────────────────────────────────

function CaseResolverNodeFileWorkspaceInner({
  assetId,
  assetName,
  snapshot,
  onSnapshotChange,
}: NodeFileWorkspaceInnerProps): React.JSX.Element {
  const { workspace, onSelectFile, onSelectAsset } = useCaseResolverPageContext();
  const { viewportRef, canvasRef } = useCanvasRefs();
  const { view } = useCanvasState();
  const { nodes, edges } = useGraphState();
  const { addNode, setNodes } = useGraphActions();
  const { selectedNodeId } = useSelectionState();
  const { selectNode } = useSelectionActions();
  const { toast } = useToast();
  const [newNodeType, setNewNodeType] = useState<'prompt' | 'model' | 'template' | 'database' | 'viewer'>('prompt');
  const [isSidePanelVisible, setIsSidePanelVisible] = useState(false);

  // nodeFileMeta lives in a ref so changes don't trigger re-renders but are
  // always available synchronously when the save effect fires.
  const nodeFileMetaRef = useRef<Record<string, CaseResolverNodeFileMeta>>(
    snapshot.nodeFileMeta
  );

  const filesById = useMemo(
    () =>
      new Map<string, CaseResolverFile>(
        workspace.files.map((f: CaseResolverFile): [string, CaseResolverFile] => [f.id, f])
      ),
    [workspace.files]
  );
  const nodeFileOptions = useMemo(
    () =>
      workspace.assets
        .filter((asset): boolean => asset.kind === 'node_file')
        .sort((left, right): number => {
          const folderDelta = left.folder.localeCompare(right.folder);
          if (folderDelta !== 0) return folderDelta;
          return left.name.localeCompare(right.name);
        })
        .map((asset) => ({
          value: asset.id,
          label: asset.folder ? `${asset.name} (${asset.folder})` : asset.name,
        })),
    [workspace.assets]
  );
  const promptDefinition = useMemo(
    (): NodeDefinition | null => palette.find((entry: NodeDefinition) => entry.type === 'prompt') ?? null,
    []
  );
  const strictEdges = useMemo((): CaseResolverNodeFileSnapshot['edges'] => {
    return (edges)
      .map((edge: AiEdge): CaseResolverNodeFileSnapshot['edges'][number] | null => {
        const from = edge.from ?? edge.source;
        const to = edge.to ?? edge.target;
        if (!from || !to) return null;
        return {
          id: edge.id,
          from,
          to,
          ...(edge.label ? { label: edge.label } : {}),
          ...(edge.fromPort ?? edge.sourceHandle
            ? { fromPort: edge.fromPort ?? edge.sourceHandle ?? undefined }
            : {}),
          ...(edge.toPort ?? edge.targetHandle
            ? { toPort: edge.toPort ?? edge.targetHandle ?? undefined }
            : {}),
        };
      })
      .filter((edge): edge is CaseResolverNodeFileSnapshot['edges'][number] => edge !== null);
  }, [edges]);

  const lastEmittedHashRef = useRef<string>(
    stableStringify({
      kind: 'case_resolver_node_file_snapshot_v1',
      source: 'manual',
      nodes: snapshot.nodes,
      edges: snapshot.edges,
      nodeFileMeta: snapshot.nodeFileMeta,
    })
  );

  // Persist snapshot on every graph change, pruning orphaned nodeFileMeta entries.
  useEffect(() => {
    const existingNodeIds = new Set(nodes.map((n: AiNode) => n.id));
    const prunedMeta: Record<string, CaseResolverNodeFileMeta> = {};
    for (const [nodeId, meta] of Object.entries(nodeFileMetaRef.current)) {
      if (existingNodeIds.has(nodeId)) {
        prunedMeta[nodeId] = meta;
      }
    }
    nodeFileMetaRef.current = prunedMeta;

    const updated: CaseResolverNodeFileSnapshot = {
      kind: 'case_resolver_node_file_snapshot_v1',
      source: 'manual',
      nodes,
      edges: strictEdges,
      nodeFileMeta: prunedMeta,
    };
    const hash = stableStringify(updated);
    if (hash === lastEmittedHashRef.current) return;
    lastEmittedHashRef.current = hash;
    onSnapshotChange(updated);
  }, [nodes, onSnapshotChange, strictEdges]);

  // Migrate legacy template-based linked-file nodes to prompt nodes so they expose
  // Case Resolver document ports (wysiwygText/content/plainText).
  useEffect(() => {
    if (!promptDefinition) return;
    setNodes((previousNodes: AiNode[]): AiNode[] => {
      let changed = false;
      const nextNodes = previousNodes.map((node: AiNode): AiNode => {
        const linkedMeta = nodeFileMetaRef.current[node.id];
        if (!linkedMeta) {
          return node;
        }

        const linkedFile = filesById.get(linkedMeta.fileId) ?? null;
        const fallbackTemplate = linkedFile
          ? buildPromptTemplateFromDroppedDocumentFile(linkedFile)
          : `<p>Document: ${linkedMeta.fileName}</p>`;
        const promptTemplate =
          typeof node.config?.prompt?.template === 'string'
            ? node.config.prompt.template
            : typeof node.config?.template?.template === 'string'
              ? node.config.template.template
              : fallbackTemplate;

        const promptBase: AiNode =
          node.type === 'prompt'
            ? node
            : {
              ...node,
              type: 'prompt',
            };
        const normalizedPromptNode = ensureDocumentPromptPorts({
          ...promptBase,
          config: {
            ...(promptBase.config ?? {}),
            prompt: {
              template: promptTemplate,
            },
          },
        });
        if (normalizedPromptNode === node) return node;
        changed = true;
        return normalizedPromptNode;
      });
      return changed ? nextNodes : previousNodes;
    });
  }, [filesById, promptDefinition, setNodes]);

  const placePosition = useMemo(() => {
    const index = nodes.length;
    return {
      x: 180 + (index % 3) * 320,
      y: 120 + Math.floor(index / 3) * 200,
    };
  }, [nodes.length]);

  const resolveDropPosition = useCallback(
    (event: React.DragEvent<HTMLDivElement>): { x: number; y: number } => {
      const viewport = viewportRef.current?.getBoundingClientRect();
      if (!viewport) return clampCanvasPosition(placePosition);
      const canvasRect = canvasRef.current?.getBoundingClientRect() ?? null;
      const localX = canvasRect
        ? (event.clientX - canvasRect.left) / view.scale
        : (event.clientX - viewport.left - view.x) / view.scale;
      const localY = canvasRect
        ? (event.clientY - canvasRect.top) / view.scale
        : (event.clientY - viewport.top - view.y) / view.scale;
      return clampCanvasPosition({ x: localX - NODE_WIDTH / 2, y: localY - NODE_MIN_HEIGHT / 2 });
    },
    [canvasRef, placePosition, view, viewportRef]
  );

  const addFileReferenceNode = useCallback(
    (fileId: string, fileName: string, position: { x: number; y: number }): void => {
      const file = filesById.get(fileId);
      if (!file || file.fileType === 'case') {
        toast('Cannot add this file type to the canvas.', { variant: 'warning' });
        return;
      }

      if (!promptDefinition) {
        toast('Prompt node definition is missing.', { variant: 'error' });
        return;
      }

      const nodeId = `node-${Math.random().toString(36).slice(2, 10)}`;
      const promptBase = buildNode(promptDefinition, position, nodeId, `Document: ${fileName}`);
      const promptConfig = resolvePromptConfig(promptBase);
      const node = ensureDocumentPromptPorts({
        ...promptBase,
        config: {
          ...(promptBase.config ?? {}),
          prompt: {
            ...promptConfig,
            template: buildPromptTemplateFromDroppedDocumentFile(file),
          },
        },
      });

      nodeFileMetaRef.current = {
        ...nodeFileMetaRef.current,
        [nodeId]: {
          fileId,
          fileType: file.fileType,
          fileName,
        },
      };

      addNode(node);
      selectNode(nodeId);
      toast(`Added "${fileName}" to canvas.`, { variant: 'success' });
    },
    [addNode, filesById, promptDefinition, selectNode, toast]
  );

  const addExplanatoryNode = useCallback((): void => {
    const promptDefinition = palette.find((entry: NodeDefinition) => entry.type === 'prompt');
    if (!promptDefinition) return;

    const nodeId = `node-${Math.random().toString(36).slice(2, 10)}`;
    const promptNode = buildNode(promptDefinition, placePosition, nodeId, 'Explanatory Note');
    const promptConfig = resolvePromptConfig(promptNode);
    const node = ensureDocumentPromptPorts({
      ...promptNode,
      config: {
        ...(promptNode.config ?? {}),
        prompt: {
          ...promptConfig,
          template: '',
        },
      },
    });
    addNode(node);
    selectNode(nodeId);
    toast('Explanatory node added.', { variant: 'success' });
  }, [addNode, placePosition, selectNode, toast]);

  const addGenericNode = useCallback((): void => {
    const definition = palette.find((entry: NodeDefinition) => entry.type === newNodeType);
    if (!definition) return;
    const nodeId = `node-${Math.random().toString(36).slice(2, 10)}`;
    const node = buildNode(definition, placePosition, nodeId, definition.title);
    addNode(node);
    selectNode(nodeId);
  }, [addNode, newNodeType, placePosition, selectNode]);

  // Listen for file drops emitted via the window event (from the folder tree button).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const listener = (event: Event): void => {
      const customEvent = event as CustomEvent<CaseResolverDropDocumentToCanvasDetail>;
      const detail = customEvent.detail;
      if (!detail || typeof detail !== 'object') return;
      const fileId = typeof detail.fileId === 'string' ? detail.fileId.trim() : '';
      if (!fileId) return;
      const fileName = typeof detail.name === 'string' ? detail.name : 'File';
      addFileReferenceNode(fileId, fileName, placePosition);
    };
    window.addEventListener(
      CASE_RESOLVER_DROP_DOCUMENT_TO_CANVAS_EVENT,
      listener as EventListener
    );
    return (): void => {
      window.removeEventListener(
        CASE_RESOLVER_DROP_DOCUMENT_TO_CANVAS_EVENT,
        listener as EventListener
      );
    };
  }, [addFileReferenceNode, placePosition]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const listener = (event: Event): void => {
      const customEvent = event as CustomEvent<CaseResolverShowDocumentInCanvasDetail>;
      const detail = customEvent.detail;
      if (!detail || typeof detail !== 'object') return;
      const fileId = typeof detail.fileId === 'string' ? detail.fileId.trim() : '';
      if (!fileId) return;

      const relatedNodeFileAssetIds = Array.isArray(detail.relatedNodeFileAssetIds)
        ? detail.relatedNodeFileAssetIds
          .filter((entry: unknown): entry is string => typeof entry === 'string')
          .map((entry: string): string => entry.trim())
          .filter(Boolean)
        : [];
      if (relatedNodeFileAssetIds.length > 0 && !relatedNodeFileAssetIds.includes(assetId)) {
        return;
      }

      const preferredNodeId =
        typeof detail.nodeId === 'string' && detail.nodeId.trim().length > 0
          ? detail.nodeId.trim()
          : null;
      if (preferredNodeId) {
        const preferredMeta = nodeFileMetaRef.current[preferredNodeId] ?? null;
        if (preferredMeta?.fileId === fileId) {
          selectNode(preferredNodeId);
          return;
        }
      }

      const nodeIds = Object.entries(nodeFileMetaRef.current)
        .filter(([, meta]): boolean => meta.fileId === fileId)
        .map(([nodeId]: [string, CaseResolverNodeFileMeta]): string => nodeId);
      if (nodeIds.length === 0) return;
      selectNode(nodeIds[nodeIds.length - 1] ?? nodeIds[0]!);
    };

    window.addEventListener(
      CASE_RESOLVER_SHOW_DOCUMENT_IN_CANVAS_EVENT,
      listener as EventListener
    );
    return (): void => {
      window.removeEventListener(
        CASE_RESOLVER_SHOW_DOCUMENT_IN_CANVAS_EVENT,
        listener as EventListener
      );
    };
  }, [assetId, selectNode]);

  const handleCanvasDragOverCapture = (event: React.DragEvent<HTMLDivElement>): void => {
    const payload = parseCaseResolverTreeDropPayload(event.dataTransfer);
    if (payload?.entity !== 'file') return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleCanvasDropCapture = (event: React.DragEvent<HTMLDivElement>): void => {
    const payload = parseCaseResolverTreeDropPayload(event.dataTransfer);
    if (payload?.entity !== 'file') return;
    event.preventDefault();
    event.stopPropagation();
    const position = resolveDropPosition(event);
    addFileReferenceNode(payload.fileId, payload.name, position);
  };

  const openSelectedFile = useCallback((): void => {
    if (!selectedNodeId) return;
    const meta = nodeFileMetaRef.current[selectedNodeId];
    if (!meta) {
      toast('Selected node has no linked file.', { variant: 'warning' });
      return;
    }
    onSelectFile(meta.fileId);
  }, [onSelectFile, selectedNodeId, toast]);

  const handleManualSave = useCallback((): void => {
    const updated: CaseResolverNodeFileSnapshot = {
      kind: 'case_resolver_node_file_snapshot_v1',
      source: 'manual',
      nodes,
      edges: strictEdges,
      nodeFileMeta: nodeFileMetaRef.current,
    };
    onSnapshotChange(updated);
    toast('Canvas saved.', { variant: 'success' });
  }, [nodes, onSnapshotChange, strictEdges, toast]);

  // Derived values for the side panel
  const selectedNodeMeta = selectedNodeId
    ? (nodeFileMetaRef.current[selectedNodeId] ?? null)
    : null;
  const selectedFile = selectedNodeMeta
    ? (filesById.get(selectedNodeMeta.fileId) ?? null)
    : null;

  return (
    <div className='flex h-[calc(100vh-120px)] w-full gap-3'>
      {/* ── Main canvas panel ── */}
      <div className='flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border/60 bg-card/40 p-0'>
        {/* Toolbar */}
        <div className='flex flex-wrap items-center gap-2 border-b border-border/60 px-4 py-3'>
          <FileCode2 className='size-4 flex-shrink-0 text-violet-400' />
          <span className='truncate text-sm font-medium text-gray-200'>{assetName}</span>
          {nodes.length > 0 ? (
            <Badge variant='outline' className='px-1.5 py-0 text-[10px]'>
              {nodes.length} node{nodes.length !== 1 ? 's' : ''}
            </Badge>
          ) : null}

          <SelectSimple
            size='sm'
            value={assetId}
            onValueChange={(value: string): void => {
              const normalized = value.trim();
              if (!normalized || normalized === assetId) return;
              onSelectAsset(normalized);
            }}
            options={nodeFileOptions}
            className='w-[260px]'
            triggerClassName='h-8 border-border bg-card/60 text-xs text-white'
          />

          <div className='mx-1 h-6 w-px bg-border/60' />

          <Button
            type='button'
            onClick={addExplanatoryNode}
            className='h-8 rounded-md border border-emerald-500/40 text-xs text-emerald-100 hover:bg-emerald-500/15'
          >
            <Sparkles className='mr-1 size-3.5' />
            Explanatory Node
          </Button>

          <SelectSimple
            size='sm'
            value={newNodeType}
            onValueChange={(value: string): void => {
              if (
                value === 'prompt' ||
                value === 'model' ||
                value === 'template' ||
                value === 'database' ||
                value === 'viewer'
              ) {
                setNewNodeType(value);
              }
            }}
            options={[
              { value: 'prompt', label: 'Prompt Node' },
              { value: 'model', label: 'Model Node' },
              { value: 'template', label: 'Template Node' },
              { value: 'database', label: 'Database Node' },
              { value: 'viewer', label: 'Result Viewer Node' },
            ]}
            className='w-[170px]'
            triggerClassName='h-8 border-border bg-card/60 text-xs text-white'
          />

          <Button
            type='button'
            onClick={addGenericNode}
            className='h-8 rounded-md border border-border text-xs text-gray-100 hover:bg-muted/60'
          >
            Add Node
          </Button>

          <div className='ml-auto'>
            <Button
              type='button'
              onClick={(): void => {
                setIsSidePanelVisible((previous) => !previous);
              }}
              className='mr-2 h-8 rounded-md border border-border text-xs text-gray-200 hover:bg-muted/60'
            >
              {isSidePanelVisible ? 'Hide Sidebar' : 'Show Sidebar'}
            </Button>
            <Button
              type='button'
              onClick={handleManualSave}
              className='h-8 rounded-md border border-border text-xs text-gray-200 hover:bg-muted/60'
            >
              <Save className='mr-1 size-3.5' />
              Save Canvas
            </Button>
          </div>
        </div>

        {/* Canvas */}
        <div
          className='relative min-h-0 flex-1'
          onDragOverCapture={handleCanvasDragOverCapture}
          onDropCapture={handleCanvasDropCapture}
        >
          <CanvasBoard />
          {nodes.length === 0 ? (
            <div className='pointer-events-none absolute inset-0 flex items-center justify-center'>
              <EmptyState
                title='Empty canvas'
                description='Use the ✦ button next to a file in the tree, or drag a file directly onto this canvas.'
                icon={<FileCode2 className='size-12' />}
                className='border-none bg-card/60 backdrop-blur-sm px-8 py-6'
              />
            </div>
          ) : null}
        </div>
      </div>

      {/* ── File reference side panel ── */}
      {isSidePanelVisible && selectedNodeMeta ? (
        <NodeFilePanel
          meta={selectedNodeMeta}
          file={selectedFile}
          onOpen={openSelectedFile}
        />
      ) : null}
    </div>
  );
}

// ─── public wrapper ───────────────────────────────────────────────────────────

export function CaseResolverNodeFileWorkspace(): React.JSX.Element {
  const { selectedAsset, onUpdateSelectedAsset } = useCaseResolverPageContext();

  // Re-parse only when the asset identity changes, not on every textContent save.
   
  const snapshot = useMemo(
    () => parseNodeFileSnapshot(selectedAsset?.textContent ?? ''),
    [selectedAsset?.id]
  );

  const handleSnapshotChange = useCallback(
    (updated: CaseResolverNodeFileSnapshot): void => {
      onUpdateSelectedAsset({ textContent: serializeNodeFileSnapshot(updated) });
    },
    [onUpdateSelectedAsset]
  );

  if (selectedAsset?.kind !== 'node_file') {
    return (
      <EmptyState
        title='No canvas selected'
        description='Select a node file to open the canvas and start mapping.'
        className='h-[420px] bg-card/20'
      />
    );
  }

  const initialNodes: AiNode[] = snapshot.nodes.map((node: CaseResolverNodeFileSnapshot['nodes'][number]): AiNode => {
    const nodeRecord = node as Record<string, unknown>;
    const createdAt =
      (typeof nodeRecord['createdAt'] === 'string' ? nodeRecord['createdAt'] : undefined) ??
      new Date().toISOString();
    const updatedAt =
      (typeof nodeRecord['updatedAt'] === 'string' ? nodeRecord['updatedAt'] : undefined) ??
      createdAt;
    const data = (
      nodeRecord['data'] && typeof nodeRecord['data'] === 'object'
        ? nodeRecord['data']
        : {}
    ) as Record<string, unknown>;
    return {
      ...node,
      createdAt,
      updatedAt,
      data,
    };
  });

  return (
    <AiPathsProvider
      key={selectedAsset.id}
      initialNodes={initialNodes}
      initialEdges={snapshot.edges}
      initialLoading={false}
      initialRuntimeState={{
        status: 'idle',
        nodeStatuses: {},
        nodeOutputs: {},
        variables: {},
        events: [],
        inputs: {},
        outputs: {},
        history: {},
      }}
    >
      <CaseResolverNodeFileWorkspaceInner
        assetId={selectedAsset.id}
        assetName={selectedAsset.name}
        snapshot={snapshot}
        onSnapshotChange={handleSnapshotChange}
      />
    </AiPathsProvider>
  );
}
