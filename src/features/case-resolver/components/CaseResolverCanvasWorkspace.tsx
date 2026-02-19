'use client';

import {
  Copy,
  Save,
  Sparkles,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';

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
  EMPTY_RUNTIME_STATE,
} from '@/features/ai/ai-paths/lib';
import {
  Button,
  useToast,
  EmptyState,
} from '@/shared/ui';

import { compileCaseResolverPrompt } from '../composer';
import { useCaseResolverPageContext } from '../context/CaseResolverPageContext';
import {
  parseCaseResolverTreeDropPayload,
} from '../drag';
import {
  CASE_RESOLVER_DOCUMENT_NODE_OUTPUT_PORTS,
  CASE_RESOLVER_PDF_EXTRACTION_PRESETS,
  DEFAULT_CASE_RESOLVER_PDF_EXTRACTION_PRESET_ID,
  DEFAULT_CASE_RESOLVER_EDGE_META,
  DEFAULT_CASE_RESOLVER_NODE_META,
  type AiNode,
  type Edge,
  type CaseResolverEdgeMeta,
  type CaseResolverAssetFile,
  type CaseResolverFile,
  type CaseResolverGraph,
  type CaseResolverNodeMeta,
  type CaseResolverPdfExtractionPresetId,
  type NodeDefinition,
} from '../types';
import {
  createCaseResolverCanvasDropHandlers,
  type CaseResolverDroppedAsset,
} from './case-resolver-canvas-drop-handlers';
import {
  buildNode,
  clampCanvasPosition,
  ensureDocumentLinksByNode,
  ensureDocumentPromptPorts,
  ensureDocumentSourceFileByNode,
  ensureEdgeMeta,
  ensureNodeMeta,
  normalizeEdgesForTextNode,
  renderPromptNodeTextPreview,
  resolveDocumentDropNodeId,
  resolvePromptConfig,
  stripHtmlToPlainText,
} from './case-resolver-canvas-utils';
import { CaseResolverLinkedPreviewModal } from './CaseResolverLinkedPreviewModal';
import { CaseResolverNodeInspectorModal } from './CaseResolverNodeInspectorModal';

function CaseResolverCanvasWorkspaceInner(): React.JSX.Element {
  const {
    activeFile,
    workspace,
    onUploadAssets,
    onGraphChange,
    onEditFile,
  } = useCaseResolverPageContext();
  const graph = activeFile!.graph;
  const defaultDropFolder = activeFile!.folder;
  const availableFiles = useMemo(
    () => workspace.files.filter((file: CaseResolverFile): boolean => file.fileType !== 'case'),
    [workspace.files]
  );
  const { toast } = useToast();
  const { viewportRef, canvasRef } = useCanvasRefs();
  const { view } = useCanvasState();
  const { setView } = useCanvasActions();
  const { nodes, edges } = useGraphState();
  const { addNode, addEdge, updateNode, setEdges } = useGraphActions();
  const { selectedNodeId, selectedEdgeId, configOpen } = useSelectionState();
  const { selectNode, setConfigOpen } = useSelectionActions();

  const [newNodeType, setNewNodeType] = useState<'prompt' | 'model' | 'template' | 'database'>('prompt');
  const [pdfExtractionPresetId, setPdfExtractionPresetId] = useState<CaseResolverPdfExtractionPresetId>(
    graph.pdfExtractionPresetId ?? DEFAULT_CASE_RESOLVER_PDF_EXTRACTION_PRESET_ID
  );
  const [isDropImporting, setIsDropImporting] = useState(false);
  const [isNodeInspectorOpen, setIsNodeInspectorOpen] = useState(false);
  const [isLinkedPreviewOpen, setIsLinkedPreviewOpen] = useState(false);

  const normalizedNodeMeta = useMemo(
    () => ensureNodeMeta(nodes, graph.nodeMeta),
    [graph.nodeMeta, nodes]
  );
  const normalizedEdgeMeta = useMemo(
    () => ensureEdgeMeta(edges, graph.edgeMeta),
    [edges, graph.edgeMeta]
  );
  const toStrictEdges = React.useCallback((inputEdges: Edge[]): CaseResolverGraph['edges'] => {
    return inputEdges
      .map((edge: Edge): CaseResolverGraph['edges'][number] | null => {
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
      .filter((edge): edge is CaseResolverGraph['edges'][number] => edge !== null);
  }, []);
  const strictEdges = useMemo((): CaseResolverGraph['edges'] => toStrictEdges(edges), [edges, toStrictEdges]);
  const availableFilesById = useMemo(
    () =>
      new Map<string, CaseResolverFile>(
        availableFiles.map((file: CaseResolverFile): [string, CaseResolverFile] => [file.id, file])
      ),
    [availableFiles]
  );
  const availableFileIds = useMemo(
    () => new Set<string>(availableFiles.map((file: CaseResolverFile) => file.id)),
    [availableFiles]
  );
  const normalizedDocumentFileLinksByNode = useMemo(
    () =>
      ensureDocumentLinksByNode(
        nodes,
        graph.documentFileLinksByNode ?? {},
        availableFileIds
      ),
    [availableFileIds, graph.documentFileLinksByNode, nodes]
  );
  const normalizedDocumentSourceFileIdByNode = useMemo(
    () =>
      ensureDocumentSourceFileByNode(
        nodes,
        graph.documentSourceFileIdByNode ?? {},
        availableFileIds
      ),
    [availableFileIds, graph.documentSourceFileIdByNode, nodes]
  );
  const normalizedDocumentDropNodeId = useMemo(
    () => resolveDocumentDropNodeId(graph.documentDropNodeId ?? null, nodes),
    [graph.documentDropNodeId, nodes]
  );

  const selectedNode = useMemo(
    () =>
      selectedNodeId
        ? nodes.find((node: AiNode) => node.id === selectedNodeId) ?? null
        : null,
    [nodes, selectedNodeId]
  );

  const selectedEdge = useMemo(
    () =>
      selectedEdgeId
        ? edges.find((edge: Edge) => edge.id === selectedEdgeId) ?? null
        : null,
    [edges, selectedEdgeId]
  );

  const nodeTypeOptions = useMemo(
    () => [
      { value: 'prompt', label: 'Prompt Node' },
      { value: 'model', label: 'Model Node' },
      { value: 'template', label: 'Template Node' },
      { value: 'database', label: 'Database Node' },
    ] as const,
    []
  );

  const compiled = useMemo(
    () =>
      compileCaseResolverPrompt(
        {
          nodes,
          edges: strictEdges,
          nodeMeta: normalizedNodeMeta,
          edgeMeta: normalizedEdgeMeta,
          pdfExtractionPresetId,
          documentFileLinksByNode: normalizedDocumentFileLinksByNode,
          documentDropNodeId: normalizedDocumentDropNodeId,
          documentSourceFileIdByNode: normalizedDocumentSourceFileIdByNode,
        },
        selectedNodeId
      ),
    [
      strictEdges,
      nodes,
      normalizedDocumentDropNodeId,
      normalizedDocumentFileLinksByNode,
      normalizedDocumentSourceFileIdByNode,
      normalizedEdgeMeta,
      normalizedNodeMeta,
      selectedNodeId,
      pdfExtractionPresetId,
    ]
  );

  const lastEmittedHashRef = useRef<string>('');

  useEffect(() => {
    const incomingPreset = graph.pdfExtractionPresetId ?? DEFAULT_CASE_RESOLVER_PDF_EXTRACTION_PRESET_ID;
    if (incomingPreset !== pdfExtractionPresetId) {
      setPdfExtractionPresetId(incomingPreset);
    }
  }, [graph.pdfExtractionPresetId]);

  useEffect(() => {
    const nextGraph: CaseResolverGraph = {
      nodes,
      edges: strictEdges,
      nodeMeta: normalizedNodeMeta,
      edgeMeta: normalizedEdgeMeta,
      pdfExtractionPresetId,
      documentFileLinksByNode: normalizedDocumentFileLinksByNode,
      documentDropNodeId: normalizedDocumentDropNodeId,
      documentSourceFileIdByNode: normalizedDocumentSourceFileIdByNode,
    };
    const nextHash = stableStringify(nextGraph);
    if (nextHash === lastEmittedHashRef.current) return;
    lastEmittedHashRef.current = nextHash;
    onGraphChange(nextGraph);
  }, [
    strictEdges,
    nodes,
    normalizedDocumentDropNodeId,
    normalizedDocumentFileLinksByNode,
    normalizedDocumentSourceFileIdByNode,
    normalizedEdgeMeta,
    normalizedNodeMeta,
    onGraphChange,
    pdfExtractionPresetId,
  ]);

  const placePosition = useMemo(() => {
    const index = nodes.length;
    return {
      x: 180 + (index % 3) * 320,
      y: 120 + Math.floor(index / 3) * 180,
    };
  }, [nodes.length]);

  const resolveDropPosition = (event: React.DragEvent<HTMLDivElement>): { x: number; y: number } => {
    const viewport = viewportRef.current?.getBoundingClientRect();
    if (!viewport) {
      return clampCanvasPosition(placePosition);
    }
    const canvasRect = canvasRef.current?.getBoundingClientRect() ?? null;
    const localX = canvasRect
      ? (event.clientX - canvasRect.left) / view.scale
      : (event.clientX - viewport.left - view.x) / view.scale;
    const localY = canvasRect
      ? (event.clientY - canvasRect.top) / view.scale
      : (event.clientY - viewport.top - view.y) / view.scale;
    return clampCanvasPosition({
      x: localX - NODE_WIDTH / 2,
      y: localY - NODE_MIN_HEIGHT / 2,
    });
  };

  const focusNodeInCanvas = React.useCallback(
    (nodeId: string, position: { x: number; y: number }): void => {
      selectNode(nodeId);
      const viewport = viewportRef.current?.getBoundingClientRect() ?? null;
      if (!viewport) return;
      setView({
        x: viewport.width / 2 - (position.x + NODE_WIDTH / 2) * view.scale,
        y: viewport.height / 2 - (position.y + NODE_MIN_HEIGHT / 2) * view.scale,
        scale: view.scale,
      });
    },
    [selectNode, setView, view.scale, viewportRef]
  );

  const {
    addDroppedAssetNode,
  } = useMemo(() => createCaseResolverCanvasDropHandlers({
    addNode,
    addEdge,
    updateNode,
    selectNode,
    focusNodeInCanvas,
    onGraphChange,
    nodes,
    edges,
    normalizedNodeMeta,
    normalizedEdgeMeta,
    normalizedDocumentFileLinksByNode,
    normalizedDocumentDropNodeId,
    normalizedDocumentSourceFileIdByNode,
    pdfExtractionPresetId,
    availableFileIds,
    availableFilesById,
    toast,
  }), [
    addNode,
    addEdge,
    updateNode,
    selectNode,
    focusNodeInCanvas,
    onGraphChange,
    nodes,
    edges,
    normalizedNodeMeta,
    normalizedEdgeMeta,
    normalizedDocumentFileLinksByNode,
    normalizedDocumentDropNodeId,
    normalizedDocumentSourceFileIdByNode,
    pdfExtractionPresetId,
    availableFileIds,
    availableFilesById,
    toast,
  ]);

  const addPromptNode = (): void => {
    const promptDefinition = palette.find((entry: NodeDefinition) => entry.type === 'prompt');
    if (!promptDefinition) return;

    const id = `node-${Math.random().toString(36).slice(2, 10)}`;
    const title = 'Explanatory Note';
    const node = buildNode(promptDefinition, placePosition, id, title);
    const promptConfig = resolvePromptConfig(node);
    addNode({
      ...node,
      config: {
        ...(node.config ?? {}),
        prompt: {
          ...promptConfig,
          template: '',
        },
      },
    });
    selectNode(id);

    const meta: CaseResolverNodeMeta = {
      role: 'explanatory',
      includeInOutput: true,
      quoteMode: 'none',
      surroundPrefix: '',
      surroundSuffix: '',
    };

    const nextNodeMeta = {
      ...normalizedNodeMeta,
      [id]: meta,
    };

    onGraphChange({
      nodes: [...nodes, node],
      edges: strictEdges,
      nodeMeta: nextNodeMeta,
      edgeMeta: normalizedEdgeMeta,
      pdfExtractionPresetId,
      documentFileLinksByNode: normalizedDocumentFileLinksByNode,
      documentDropNodeId: normalizedDocumentDropNodeId,
      documentSourceFileIdByNode: normalizedDocumentSourceFileIdByNode,
    });
  };

  const addGenericNode = (): void => {
    const definition = palette.find((entry: NodeDefinition) => entry.type === newNodeType);
    if (!definition) return;
    const id = `node-${Math.random().toString(36).slice(2, 10)}`;
    const node = buildNode(definition, placePosition, id, definition.title);
    addNode(node);
    selectNode(id);
  };

  const updateSelectedNodeMeta = (patch: Partial<CaseResolverNodeMeta>): void => {
    if (!selectedNode) return;
    const current = normalizedNodeMeta[selectedNode.id] ?? DEFAULT_CASE_RESOLVER_NODE_META;
    const nextRole = patch.role ?? current.role;
    const shouldNormalizeTextPorts =
      selectedNode.type === 'prompt' &&
      nextRole === 'text_note';
    const nextNodes = shouldNormalizeTextPorts
      ? nodes.map((node: AiNode): AiNode => {
        return node.id === selectedNode.id ? ensureDocumentPromptPorts(node) : node;
      })
      : nodes;
    const nextEdges = shouldNormalizeTextPorts
      ? normalizeEdgesForTextNode(edges, selectedNode.id)
      : edges;
    if (shouldNormalizeTextPorts) {
      const normalizedSelectedNode = nextNodes.find(
        (node: AiNode): boolean => node.id === selectedNode.id
      );
      if (normalizedSelectedNode) {
        updateNode(selectedNode.id, {
          inputs: normalizedSelectedNode.inputs,
          outputs: normalizedSelectedNode.outputs,
        });
      }
      setEdges(nextEdges);
    }
    const nextNodeMeta = {
      ...normalizedNodeMeta,
      [selectedNode.id]: {
        ...current,
        ...patch,
      },
    };
    onGraphChange({
      nodes: nextNodes,
      edges: toStrictEdges(nextEdges),
      nodeMeta: nextNodeMeta,
      edgeMeta: normalizedEdgeMeta,
      pdfExtractionPresetId,
      documentFileLinksByNode: normalizedDocumentFileLinksByNode,
      documentDropNodeId: normalizedDocumentDropNodeId,
      documentSourceFileIdByNode: normalizedDocumentSourceFileIdByNode,
    });
  };

  const updateSelectedEdgeMeta = (patch: Partial<CaseResolverEdgeMeta>): void => {
    if (!selectedEdge) return;
    const current = normalizedEdgeMeta[selectedEdge.id] ?? DEFAULT_CASE_RESOLVER_EDGE_META;
    const nextEdgeMeta = {
      ...normalizedEdgeMeta,
      [selectedEdge.id]: {
        ...current,
        ...patch,
      },
    };
    onGraphChange({
      nodes,
      edges: strictEdges,
      nodeMeta: normalizedNodeMeta,
      edgeMeta: nextEdgeMeta,
      pdfExtractionPresetId,
      documentFileLinksByNode: normalizedDocumentFileLinksByNode,
      documentDropNodeId: normalizedDocumentDropNodeId,
      documentSourceFileIdByNode: normalizedDocumentSourceFileIdByNode,
    });
  };

  const copyCompiledPrompt = async (): Promise<void> => {
    if (!compiled.prompt.trim()) {
      toast('No compiled prompt content yet.', { variant: 'warning' });
      return;
    }
    try {
      await navigator.clipboard.writeText(compiled.prompt);
      toast('Compiled prompt copied.', { variant: 'success' });
    } catch (error) {
      toast('Failed to copy compiled prompt.', { variant: 'error' });
      console.error('Failed to copy compiled prompt:', error);
    }
  };

  const handleCanvasDragOverCapture = (event: React.DragEvent<HTMLDivElement>): void => {
    const treePayload = parseCaseResolverTreeDropPayload(event.dataTransfer);
    const hasTreeAssetPayload = treePayload?.entity === 'asset';
    const hasNativeFiles = Array.from(event.dataTransfer.types ?? []).includes('Files');
    if (!hasTreeAssetPayload && !hasNativeFiles) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleCanvasDropCapture = async (event: React.DragEvent<HTMLDivElement>): Promise<void> => {
    const payload = parseCaseResolverTreeDropPayload(event.dataTransfer);
    const hasNativeFiles = event.dataTransfer.files.length > 0;
    if (!payload && !hasNativeFiles) return;

    event.preventDefault();
    event.stopPropagation();

    const dropPosition = resolveDropPosition(event);

    if (payload?.entity === 'file') {
      toast('Documents can only be added inside a node file canvas.', {
        variant: 'warning',
      });
      return;
    }

    if (payload?.entity === 'asset') {
      const droppedAsset: CaseResolverDroppedAsset = {
        id: payload.assetId,
        name: payload.name,
        kind: payload.assetKind,
        filepath: payload.filepath,
        mimeType: payload.mimeType,
        size: payload.size,
        textContent: payload.textContent,
        description: payload.description,
      };
      const requiresPdfPipeline = droppedAsset.kind === 'pdf';
      if (requiresPdfPipeline) {
        setIsDropImporting(true);
      }
      try {
        await addDroppedAssetNode(droppedAsset, dropPosition);
        toast(
          droppedAsset.kind === 'pdf'
            ? `Created PDF extraction flow for ${payload.name}.`
            : `Created file node from ${payload.name}.`,
          { variant: 'success' }
        );
      } finally {
        if (requiresPdfPipeline) {
          setIsDropImporting(false);
        }
      }
      return;
    }

    const files = Array.from(event.dataTransfer.files ?? []);
    if (files.length === 0) return;

    setIsDropImporting(true);
    try {
      const uploadedAssets = await onUploadAssets(files, defaultDropFolder);
      for (let index = 0; index < uploadedAssets.length; index += 1) {
        const asset = uploadedAssets[index];
        if (!asset) continue;
        const mappedKind =
          asset.kind === 'node_file' || asset.kind === 'image' || asset.kind === 'pdf'
            ? asset.kind
            : 'file';
        await addDroppedAssetNode(
          {
            id: asset.id,
            name: asset.name,
            kind: mappedKind,
            filepath: asset.filepath,
            mimeType: asset.mimeType,
            size: asset.size,
            textContent: asset.textContent,
            description: asset.description,
          },
          dropPosition,
          index
        );
      }
      toast(
        uploadedAssets.some((asset: CaseResolverAssetFile) => asset.kind === 'pdf')
          ? `Imported ${uploadedAssets.length} file(s), including PDF extraction flows.`
          : `Imported ${uploadedAssets.length} file(s) as file nodes.`,
        { variant: 'success' }
      );
    } catch (error: unknown) {
      toast(
        error instanceof Error ? error.message : 'Failed to import dropped files.',
        { variant: 'error' }
      );
    } finally {
      setIsDropImporting(false);
    }
  };

  const selectedPromptMeta =
    selectedNode?.type === 'prompt'
      ? normalizedNodeMeta[selectedNode.id] ?? DEFAULT_CASE_RESOLVER_NODE_META
      : null;

  const selectedPromptSourceFileId =
    selectedNode?.type === 'prompt'
      ? normalizedDocumentSourceFileIdByNode[selectedNode.id] ?? null
      : null;
  const selectedPromptSourceFile = selectedPromptSourceFileId
    ? availableFilesById.get(selectedPromptSourceFileId) ?? null
    : null;

  useEffect(() => {
    if (!configOpen) return;
    if (
      selectedNode?.type === 'prompt' &&
      selectedPromptSourceFile &&
      activeFile
    ) {
      onEditFile(selectedPromptSourceFile.id, {
        nodeContext: {
          nodeId: selectedNode.id,
          canvasFileId: activeFile.id,
        },
      });
      setConfigOpen(false);
      return;
    }
    setIsNodeInspectorOpen(true);
    setConfigOpen(false);
  }, [
    activeFile,
    configOpen,
    onEditFile,
    selectedNode,
    selectedPromptSourceFile,
    setConfigOpen,
  ]);

  const selectedEdgeJoinMode = selectedEdge
    ? (normalizedEdgeMeta[selectedEdge.id] ?? DEFAULT_CASE_RESOLVER_EDGE_META).joinMode
    : DEFAULT_CASE_RESOLVER_EDGE_META.joinMode;

  const resolveConnectorTooltip = React.useCallback(
    (input: {
      direction: 'input' | 'output';
      node: AiNode;
      port: string;
    }): {
      content: React.ReactNode;
      maxWidth?: string | undefined;
    } | null => {
      if (input.direction !== 'output') return null;
      if (input.node.type !== 'prompt') return null;
      if (
        input.port !== 'prompt' &&
        input.port !== CASE_RESOLVER_DOCUMENT_NODE_OUTPUT_PORTS[0] &&
        input.port !== CASE_RESOLVER_DOCUMENT_NODE_OUTPUT_PORTS[1] &&
        input.port !== CASE_RESOLVER_DOCUMENT_NODE_OUTPUT_PORTS[2]
      ) {
        return null;
      }

      const sourceFileId = normalizedDocumentSourceFileIdByNode[input.node.id] ?? null;
      const sourceFile = sourceFileId ? availableFilesById.get(sourceFileId) ?? null : null;
      const nodeMeta = normalizedNodeMeta[input.node.id] ?? DEFAULT_CASE_RESOLVER_NODE_META;
      const computedOutputs = compiled.outputsByNode[input.node.id];
      const textfieldOutput = computedOutputs?.textfield ?? renderPromptNodeTextPreview(input.node, nodeMeta);
      const contentOutput = computedOutputs?.content ?? '';
      const plainTextOutput = computedOutputs?.plainText ?? stripHtmlToPlainText(textfieldOutput);
      const isContentPort = input.port === CASE_RESOLVER_DOCUMENT_NODE_OUTPUT_PORTS[1];
      const isPlainTextPort = input.port === CASE_RESOLVER_DOCUMENT_NODE_OUTPUT_PORTS[2];
      const renderedText = isPlainTextPort
        ? plainTextOutput
        : isContentPort
          ? contentOutput
          : textfieldOutput;
      const outputLabel = isPlainTextPort
        ? 'Plain text output'
        : isContentPort
          ? 'Content output'
          : 'Text field output';

      return {
        maxWidth: '720px',
        content: (
          <div className='space-y-2'>
            <div className='text-[11px] text-gray-400'>{outputLabel}</div>
            {sourceFile ? (
              <div className='text-[10px] text-gray-500'>
                Source: {sourceFile.name}
              </div>
            ) : null}
            <div className='max-h-80 overflow-auto rounded border border-gray-700 bg-white p-3 text-[11px] leading-relaxed text-slate-900 whitespace-pre-wrap'>
              {renderedText || '(empty)'}
            </div>
          </div>
        ),
      };
    },
    [availableFilesById, compiled.outputsByNode, normalizedDocumentSourceFileIdByNode, normalizedNodeMeta]
  );

  return (
    <div className='h-[calc(100vh-120px)] w-full'>
      <div className='flex min-h-0 flex-col overflow-hidden rounded-lg border border-border/60 bg-card/40 p-0'>
        <div className='flex flex-wrap items-center gap-2 border-b border-border/60 px-4 py-3'>
          <Button
            type='button'
            onClick={addPromptNode}
            className='h-8 rounded-md border border-emerald-500/40 text-xs text-emerald-100 hover:bg-emerald-500/15'
          >
            <Sparkles className='mr-1 size-3.5' />
            Explanatory Node
          </Button>

          <div className='mx-1 h-6 w-px bg-border/60' />

          <div className='w-[170px]'>
            <select
              value={newNodeType}
              onChange={(event): void => {
                const value = event.target.value;
                if (
                  value === 'prompt' ||
                  value === 'model' ||
                  value === 'template' ||
                  value === 'database'
                ) {
                  setNewNodeType(value);
                }
              }}
              className='h-8 w-full rounded-md border border-border bg-card/60 px-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-ring/40'
              aria-label='Node type'
            >
              {nodeTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <Button
            type='button'
            onClick={addGenericNode}
            className='h-8 rounded-md border border-border text-xs text-gray-100 hover:bg-muted/60'
          >
            Add Node
          </Button>

          <div className='mx-1 h-6 w-px bg-border/60' />

          <div className='w-[220px]'>
            <select
              value={pdfExtractionPresetId}
              onChange={(event): void => {
                const value = event.target.value;
                if (
                  value === 'plain_text' ||
                  value === 'structured_sections' ||
                  value === 'facts_entities'
                ) {
                  setPdfExtractionPresetId(value);
                }
              }}
              className='h-8 w-full rounded-md border border-border bg-card/60 px-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-ring/40'
              aria-label='PDF extraction preset'
            >
              {CASE_RESOLVER_PDF_EXTRACTION_PRESETS.map((preset) => (
                <option key={preset.value} value={preset.value}>
                  {preset.label}
                </option>
              ))}
            </select>
          </div>
          {isDropImporting ? (
            <span className='text-[11px] text-gray-400'>Importing dropped files...</span>
          ) : null}

          <div className='ml-auto flex items-center gap-2'>
            <Button
              type='button'
              onClick={(): void => {
                setIsNodeInspectorOpen(true);
              }}
              className='h-8 rounded-md border border-border text-xs text-gray-200 hover:bg-muted/60'
            >
              Node Inspector
            </Button>
            <Button
              type='button'
              onClick={(): void => {
                setIsLinkedPreviewOpen(true);
              }}
              className='h-8 rounded-md border border-border text-xs text-gray-200 hover:bg-muted/60'
            >
              Linked Preview
            </Button>
            <Button
              type='button'
              onClick={(): void => {
                void copyCompiledPrompt();
              }}
              className='h-8 rounded-md border border-cyan-500/40 text-xs text-cyan-100 hover:bg-cyan-500/15'
            >
              <Copy className='mr-1 size-3.5' />
              Copy Prompt
            </Button>
            <Button
              type='button'
              onClick={() =>
                onGraphChange({
                  nodes,
                  edges: strictEdges,
                  nodeMeta: normalizedNodeMeta,
                  edgeMeta: normalizedEdgeMeta,
                  pdfExtractionPresetId,
                  documentFileLinksByNode: normalizedDocumentFileLinksByNode,
                  documentDropNodeId: normalizedDocumentDropNodeId,
                  documentSourceFileIdByNode: normalizedDocumentSourceFileIdByNode,
                })
              }
              className='h-8 rounded-md border border-border text-xs text-gray-200 hover:bg-muted/60'
            >
              <Save className='mr-1 size-3.5' />
              Save Graph
            </Button>
          </div>
        </div>

        <div
          className='min-h-0 flex-1'
          onDragOverCapture={handleCanvasDragOverCapture}
          onDropCapture={(event): void => {
            void handleCanvasDropCapture(event);
          }}
        >
          <CanvasBoard resolveConnectorTooltip={resolveConnectorTooltip} />
        </div>
      </div>

      <CaseResolverNodeInspectorModal
        open={isNodeInspectorOpen}
        onOpenChange={setIsNodeInspectorOpen}
        selectedNode={selectedNode}
        selectedPromptMeta={selectedPromptMeta}
        selectedPromptSourceFile={selectedPromptSourceFile}
        selectedCanvasFileId={activeFile?.id ?? null}
        onEditFile={onEditFile}
        onUpdateSelectedNodeMeta={updateSelectedNodeMeta}
        selectedEdge={selectedEdge}
        selectedEdgeJoinMode={selectedEdgeJoinMode}
        onUpdateSelectedEdgeMeta={updateSelectedEdgeMeta}
      />

      <CaseResolverLinkedPreviewModal
        open={isLinkedPreviewOpen}
        onOpenChange={setIsLinkedPreviewOpen}
        compiled={compiled}
      />
    </div>
  );
}

export function CaseResolverCanvasWorkspace(): React.JSX.Element {
  const { activeFile } = useCaseResolverPageContext();

  if (!activeFile) {
    return (
      <EmptyState
        title='Canvas Empty'
        description='Create a case file to start mapping nodes.'
        className='h-[420px]'
      />
    );
  }

  const initialNodes: AiNode[] = activeFile.graph.nodes.map((node: CaseResolverGraph['nodes'][number]): AiNode => {
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
      key={activeFile.id}
      initialNodes={initialNodes}
      initialEdges={activeFile.graph.edges}
      initialLoading={false}
      initialRuntimeState={EMPTY_RUNTIME_STATE}
    >
      <CaseResolverCanvasWorkspaceInner />
    </AiPathsProvider>
  );
}
