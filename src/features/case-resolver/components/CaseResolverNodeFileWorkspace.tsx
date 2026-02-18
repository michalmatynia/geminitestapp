'use client';

import { ExternalLink, FileCode2, FileText, Save, ScanLine } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import { CanvasBoard } from '@/features/ai/ai-paths/components/canvas-board';
import {
  AiPathsProvider,
  useCanvasActions,
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
  type AiNode,
  type NodeDefinition,
} from '@/features/ai/ai-paths/lib';
import { Button, useToast, Badge } from '@/shared/ui';

import { useCaseResolverPageContext } from '../context/CaseResolverPageContext';
import {
  CASE_RESOLVER_DROP_DOCUMENT_TO_CANVAS_EVENT,
  parseCaseResolverTreeDropPayload,
  type CaseResolverDropDocumentToCanvasDetail,
} from '../drag';
import { parseNodeFileSnapshot, serializeNodeFileSnapshot } from '../settings';
import {
  type CaseResolverFile,
  type CaseResolverNodeFileMeta,
  type CaseResolverNodeFileSnapshot,
  type CaseResolverScanSlot,
} from '../types';
import { buildNode, clampCanvasPosition } from './case-resolver-canvas-utils';

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
      {/* Header */}
      <div className='flex items-start gap-2'>
        <TypeIcon className='mt-0.5 size-4 flex-shrink-0 text-gray-400' />
        <div className='min-w-0 flex-1'>
          <p className='truncate text-sm font-semibold text-white'>{meta.fileName}</p>
          <Badge variant='outline' className='mt-0.5 px-1.5 py-0 text-[10px]'>
            {typeLabel}
          </Badge>
        </div>
      </div>

      {/* Content preview */}
      {file ? (
        <div className='flex flex-col gap-1'>
          <p className='text-[10px] uppercase tracking-wide text-gray-500'>Content preview</p>
          {preview ? (
            <div className='max-h-52 overflow-y-auto rounded border border-border/40 bg-background/60 p-2 text-[11px] leading-relaxed text-gray-300 whitespace-pre-wrap'>
              {preview}
            </div>
          ) : (
            <p className='text-[11px] text-gray-500 italic'>No text content yet.</p>
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
  snapshot,
  onSnapshotChange,
}: NodeFileWorkspaceInnerProps): React.JSX.Element {
  const { workspace, onSelectFile } = useCaseResolverPageContext();
  const { viewportRef, canvasRef } = useCanvasRefs();
  const { view } = useCanvasState();
  const { setView: _setView } = useCanvasActions();
  const { nodes, edges } = useGraphState();
  const { addNode } = useGraphActions();
  const { selectedNodeId } = useSelectionState();
  const { selectNode } = useSelectionActions();
  const { toast } = useToast();

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

  const lastEmittedHashRef = useRef<string>('');

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
      edges,
      nodeFileMeta: prunedMeta,
    };
    const hash = stableStringify(updated);
    if (hash === lastEmittedHashRef.current) return;
    lastEmittedHashRef.current = hash;
    onSnapshotChange(updated);
  }, [edges, nodes, onSnapshotChange]);

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

      const templateDef = palette.find((entry: NodeDefinition) => entry.type === 'template');
      if (!templateDef) return;

      const nodeId = `node-${Math.random().toString(36).slice(2, 10)}`;
      const node = buildNode(templateDef, position, nodeId, fileName);

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
    [addNode, filesById, selectNode, toast]
  );

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
      edges,
      nodeFileMeta: nodeFileMetaRef.current,
    };
    onSnapshotChange(updated);
    toast('Canvas saved.', { variant: 'success' });
  }, [edges, nodes, onSnapshotChange, toast]);

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
          <FileCode2 className='size-4 flex-shrink-0 text-gray-500' />
          <span className='text-xs text-gray-400'>
            Drag documents or scan files from the tree onto the canvas to connect them.
          </span>
          {nodes.length > 0 ? (
            <Badge variant='outline' className='px-1.5 py-0 text-[10px]'>
              {nodes.length} node{nodes.length !== 1 ? 's' : ''}
            </Badge>
          ) : null}
          <div className='ml-auto'>
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
          className='min-h-0 flex-1'
          onDragOverCapture={handleCanvasDragOverCapture}
          onDropCapture={handleCanvasDropCapture}
        >
          <CanvasBoard />
        </div>
      </div>

      {/* ── File reference side panel ── */}
      {selectedNodeMeta ? (
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
      <div className='flex h-[420px] items-center justify-center rounded-lg border border-dashed border-border/60 bg-card/20 text-sm text-gray-400'>
        Select a node file to open the canvas.
      </div>
    );
  }

  return (
    <AiPathsProvider
      key={selectedAsset.id}
      initialNodes={snapshot.nodes}
      initialEdges={snapshot.edges}
      initialLoading={false}
      initialRuntimeState={{ inputs: {}, outputs: {}, history: {} }}
    >
      <CaseResolverNodeFileWorkspaceInner
        snapshot={snapshot}
        onSnapshotChange={handleSnapshotChange}
      />
    </AiPathsProvider>
  );
}
