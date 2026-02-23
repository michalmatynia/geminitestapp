'use client';

import {
  Copy,
  Save,
  Sparkles,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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
  type Edge,
} from '@/features/ai/ai-paths/lib';
import {
  CASE_RESOLVER_DOCUMENT_NODE_OUTPUT_PORTS,
  CASE_RESOLVER_EXPLANATORY_NODE_OUTPUT_PORTS,
  CASE_RESOLVER_PDF_EXTRACTION_PRESETS,
  DEFAULT_CASE_RESOLVER_PDF_EXTRACTION_PRESET_ID,
  DEFAULT_CASE_RESOLVER_EDGE_META,
  DEFAULT_CASE_RESOLVER_NODE_META,
  type AiNode,
  type AiEdge,
  type CaseResolverEdgeMeta,
  type CaseResolverAssetFile,  type CaseResolverFile,
  type CaseResolverGraph,
  type CaseResolverNodeMeta,
  type CaseResolverPdfExtractionPresetId,
  type NodeDefinition,
} from '@/shared/contracts/case-resolver';
import { useSettingsMap } from '@/shared/hooks/use-settings';
import {
  Button,
  useToast,
  EmptyState,
  Card,
  SelectSimple,
} from '@/shared/ui';

import { compileCaseResolverPrompt } from '../composer';
import {
  VALIDATOR_PATTERN_LISTS_KEY,
  parseValidatorPatternLists,
} from '@/features/admin/pages/validator-scope';
import {
  PROMPT_ENGINE_SETTINGS_KEY,
  parsePromptEngineSettings,
} from '@/features/prompt-engine/settings';
import {
  applyCaseResolverPlainTextValidation,
} from '../plain-text-validation';
import {
  CaseResolverPageContextValue,
  useCaseResolverPageContext,
} from '../context/CaseResolverPageContext';
import {
  parseCaseResolverTreeDropPayload,
} from '../drag';
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

interface CompatEdge {
  id: string;
  from?: string | null | undefined;
  to?: string | null | undefined;
  source?: string | null | undefined;
  target?: string | null | undefined;
  label?: string | null | undefined;
  fromPort?: string | null | undefined;
  toPort?: string | null | undefined;
  sourceHandle?: string | null | undefined;
  targetHandle?: string | null | undefined;
}

function CaseResolverCanvasWorkspaceInner(): React.JSX.Element {
  const {
    activeFile,
    workspace,
    onUploadAssets,
    onGraphChange,
  }: CaseResolverPageContextValue = useCaseResolverPageContext();
  const graph = activeFile?.graph || { nodes: [], edges: [], nodeMeta: {}, edgeMeta: {} };
  const defaultDropFolder = activeFile?.folder || 'root';
  const availableFiles = useMemo(
    () => workspace.files.filter((file: CaseResolverFile): boolean => file.fileType !== 'case'),
    [workspace.files]
  );
  const settingsQuery = useSettingsMap({ scope: 'light' });
  const rawPatternLists = settingsQuery.data?.get(VALIDATOR_PATTERN_LISTS_KEY) ?? null;
  const validatorPatternLists = useMemo(
    () => parseValidatorPatternLists(rawPatternLists),
    [rawPatternLists]
  );
  const rawPromptEngineSettings = settingsQuery.data?.get(PROMPT_ENGINE_SETTINGS_KEY) ?? null;
  const promptEngineSettings = useMemo(
    () => parsePromptEngineSettings(rawPromptEngineSettings),
    [rawPromptEngineSettings]
  );
  const { toast } = useToast();
  const { viewportRef, canvasRef } = useCanvasRefs();
  const { view } = useCanvasState();
  const { setView } = useCanvasActions();
  const { nodes, edges } = useGraphState();
  const { addNode, addEdge, updateNode, setEdges } = useGraphActions();
  const { selectedNodeId, selectedEdgeId, configOpen } = useSelectionState();
  const { selectNode, setConfigOpen } = useSelectionActions();

  const [newNodeType, setNewNodeType] = useState<'prompt' | 'model' | 'template' | 'database' | 'viewer'>('prompt');
  const [pdfExtractionPresetId, setPdfExtractionPresetId] = useState<CaseResolverPdfExtractionPresetId>(
    graph.pdfExtractionPresetId ?? DEFAULT_CASE_RESOLVER_PDF_EXTRACTION_PRESET_ID
  );
  const [isDropImporting, setIsDropImporting] = useState(false);
  const [isNodeInspectorOpen, setIsNodeInspectorOpen] = useState(false);
  const [isLinkedPreviewOpen, setIsLinkedPreviewOpen] = useState(false);

  const normalizedNodeMeta = useMemo(
    () => ensureNodeMeta(nodes, graph.nodeMeta || {}),
    [graph.nodeMeta, nodes]
  );
  const normalizedEdgeMeta = useMemo(
    () => ensureEdgeMeta(edges as unknown as { id: string }[], graph.edgeMeta || {}),
    [edges, graph.edgeMeta]
  );
  const toStrictEdges = React.useCallback((inputEdges: AiEdge[]): CaseResolverGraph['edges'] => {
    return (inputEdges as unknown as CompatEdge[])
      .map((edge: CompatEdge): CaseResolverGraph['edges'][number] | null => {
        const from = edge.from ?? edge.source;
        const to = edge.to ?? edge.target;
        if (!from || !to) return null;
        return {
          id: edge.id,
          from,
          to,
          ...(edge.label ? { label: edge.label } : {}),
          ...(edge.fromPort ?? edge.sourceHandle
            ? { fromPort: (edge.fromPort ?? edge.sourceHandle) || undefined }
            : {}),
          ...(edge.toPort ?? edge.targetHandle
            ? { toPort: (edge.toPort ?? edge.targetHandle) || undefined }
            : {}),
        };
      })
      .filter((edge): edge is CaseResolverGraph['edges'][number] => edge !== null);
  }, []);
  const strictEdges = useMemo((): CaseResolverGraph['edges'] => toStrictEdges(edges as unknown as AiEdge[]), [edges, toStrictEdges]);
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
      { value: 'viewer', label: 'Result Viewer Node' },
    ] as const,
    []
  );
  const transformPlainTextOutput = useCallback(
    (input: {
      nodeMeta: CaseResolverNodeMeta;
      output: 'plainText' | 'plaintextContent' | 'content';
      value: string;
    }): string => {
      const forceForExplanatoryOutput = input.nodeMeta.role === 'explanatory';
      return applyCaseResolverPlainTextValidation({
        input: input.value,
        nodeMeta: input.nodeMeta,
        promptEngineSettings,
        patternLists: validatorPatternLists,
        forceEnabled: forceForExplanatoryOutput,
        forceFormatterEnabled: forceForExplanatoryOutput,
      });
    },
    [promptEngineSettings, validatorPatternLists]
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
        selectedNodeId,
        { transformPlainTextOutput }
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
      transformPlainTextOutput,
    ]
  );

  const lastEmittedHashRef = useRef<string>('');
  const skipNextGraphEmitRef = useRef<boolean>(true);

  useEffect(() => {
    // Opening/switching a file should not immediately enqueue a workspace mutation.
    skipNextGraphEmitRef.current = true;
  }, [activeFile?.id]);

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
    if (skipNextGraphEmitRef.current) {
      lastEmittedHashRef.current = nextHash;
      skipNextGraphEmitRef.current = false;
      return;
    }
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
    const promptNode = buildNode(promptDefinition, placePosition, id, title);
    const promptConfig = resolvePromptConfig(promptNode);
    const explanatoryNode = ensureDocumentPromptPorts({
      ...promptNode,
      config: {
        ...(promptNode.config ?? {}),
        prompt: {
          ...promptConfig,
          template: '',
        },
      },
    }, 'explanatory');
    addNode(explanatoryNode);
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
      nodes: [...nodes, explanatoryNode],
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
      (nextRole === 'text_note' || nextRole === 'explanatory');
    const nextNodes = shouldNormalizeTextPorts
      ? nodes.map((node: AiNode): AiNode => {
        return node.id === selectedNode.id ? ensureDocumentPromptPorts(node, nextRole) : node;
      })
      : nodes;
    const nextEdges = shouldNormalizeTextPorts
      ? normalizeEdgesForTextNode(edges, selectedNode.id, nextRole === 'explanatory')
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

  const updateSelectedPromptTemplate = (template: string): void => {
    if (selectedNode?.type !== 'prompt') return;
    updateNode(selectedNode.id, {
      config: {
        ...(selectedNode.config ?? {}),
        prompt: {
          ...resolvePromptConfig(selectedNode),
          template,
        },
      },
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
    if (!compiled.combinedContent.trim()) {
      toast('No compiled prompt content yet.', { variant: 'warning' });
      return;
    }
    try {
      await navigator.clipboard.writeText(compiled.combinedContent);
      toast('Compiled prompt copied.', { variant: 'success' });
    } catch (error) {
      toast('Failed to copy compiled prompt.', { variant: 'error' });
      console.error('Failed to copy compiled prompt:', error);
    }
  };

  const handleManualGraphSave = React.useCallback((): void => {
    onGraphChange({
      nodes,
      edges: strictEdges,
      nodeMeta: normalizedNodeMeta,
      edgeMeta: normalizedEdgeMeta,
      pdfExtractionPresetId,
      documentFileLinksByNode: normalizedDocumentFileLinksByNode,
      documentDropNodeId: normalizedDocumentDropNodeId,
      documentSourceFileIdByNode: normalizedDocumentSourceFileIdByNode,
    });
  }, [
    nodes,
    strictEdges,
    normalizedNodeMeta,
    normalizedEdgeMeta,
    pdfExtractionPresetId,
    normalizedDocumentFileLinksByNode,
    normalizedDocumentDropNodeId,
    normalizedDocumentSourceFileIdByNode,
    onGraphChange,
  ]);

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
            filepath: asset.filepath ?? null,
            mimeType: asset.mimeType ?? null,
            size: asset.size,
            textContent: asset.textContent ?? '',
            description: asset.description ?? '',
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
  const selectedPromptInputText = useMemo((): string => {
    if (selectedNode?.type !== 'prompt') return '';
    const promptTemplate = resolvePromptConfig(selectedNode).template;
    const normalizedTemplate = stripHtmlToPlainText(promptTemplate);
    if (normalizedTemplate) return normalizedTemplate;
    if (!selectedPromptSourceFile) return '';
    if (selectedPromptSourceFile.documentContentHtml.trim()) {
      return stripHtmlToPlainText(selectedPromptSourceFile.documentContentHtml);
    }
    return stripHtmlToPlainText(selectedPromptSourceFile.documentContent);
  }, [selectedNode, selectedPromptSourceFile]);
  const selectedPromptTemplate = selectedNode?.type === 'prompt'
    ? resolvePromptConfig(selectedNode).template
    : '';
  const selectedPromptOutputPreview = useMemo(() => {
    if (selectedNode?.type !== 'prompt') return null;
    const computedOutputs = compiled.outputsByNode[selectedNode.id];
    const nodeMeta = selectedPromptMeta ?? DEFAULT_CASE_RESOLVER_NODE_META;
    const textfieldOutput =
      computedOutputs?.textfield ??
      stripHtmlToPlainText(resolvePromptConfig(selectedNode).template);
    return {
      textfield: textfieldOutput,
      plaintextContent:
        computedOutputs?.plaintextContent ?? renderPromptNodeTextPreview(selectedNode, nodeMeta),
      plainText: computedOutputs?.plainText ?? stripHtmlToPlainText(textfieldOutput),
      wysiwygContent: computedOutputs?.wysiwygContent ?? '',
    };
  }, [compiled.outputsByNode, selectedNode, selectedPromptMeta]);

  useEffect(() => {
    if (!configOpen) return;
    setIsNodeInspectorOpen(true);
    setConfigOpen(false);
  }, [
    configOpen,
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
        !CASE_RESOLVER_EXPLANATORY_NODE_OUTPUT_PORTS.includes(
          input.port as (typeof CASE_RESOLVER_EXPLANATORY_NODE_OUTPUT_PORTS)[number]
        )
      ) {
        return null;
      }

      const sourceFileId = normalizedDocumentSourceFileIdByNode[input.node.id] ?? null;
      const sourceFile = sourceFileId ? availableFilesById.get(sourceFileId) ?? null : null;
      const nodeMeta = normalizedNodeMeta[input.node.id] ?? DEFAULT_CASE_RESOLVER_NODE_META;
      const computedOutputs = compiled.outputsByNode[input.node.id];
      const textfieldOutput = computedOutputs?.textfield ?? renderPromptNodeTextPreview(input.node, nodeMeta);
      const plaintextContentOutput = computedOutputs?.plaintextContent ?? '';
      const plainTextOutput = computedOutputs?.plainText ?? stripHtmlToPlainText(textfieldOutput);
      const wysiwygContentOutput = computedOutputs?.wysiwygContent ?? '';
      const isPlaintextContentPort = input.port === CASE_RESOLVER_DOCUMENT_NODE_OUTPUT_PORTS[1];
      const isPlainTextPort = input.port === CASE_RESOLVER_DOCUMENT_NODE_OUTPUT_PORTS[2];
      const isWysiwygContentPort = input.port === CASE_RESOLVER_EXPLANATORY_NODE_OUTPUT_PORTS[3];
      const renderedText = isPlainTextPort
        ? plainTextOutput
        : isPlaintextContentPort
          ? plaintextContentOutput
          : isWysiwygContentPort
            ? wysiwygContentOutput
            : textfieldOutput;
      const outputLabel = isPlainTextPort
        ? 'Plain text output'
        : isPlaintextContentPort
          ? 'plaintextContent output'
          : isWysiwygContentPort
            ? 'WYSIWYGContent output'
            : 'WYSIWYG text output';

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
      <Card variant='glass' padding='none' className='flex min-h-0 flex-col overflow-hidden'>
        <div className='flex flex-wrap items-center gap-2 border-b border-border/60 px-4 py-3'>
          <Button
            type='button'
            onClick={addPromptNode}
            variant='success'
            size='sm'
          >
            <Sparkles className='mr-1 size-3.5' />
            Explanatory Node
          </Button>

          <div className='mx-1 h-6 w-px bg-border/60' />

          <div className='w-[170px]'>
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
              options={nodeTypeOptions.map(opt => ({ value: opt.value, label: opt.label }))}
              triggerClassName='h-8 border-border bg-card/60 text-xs text-white'
              ariaLabel='Node type'
            />
          </div>
          <Button
            type='button'
            onClick={addGenericNode}
            variant='outline'
            size='sm'
          >
            Add Node
          </Button>

          <div className='mx-1 h-6 w-px bg-border/60' />

          <div className='w-[220px]'>
            <SelectSimple
              size='sm'
              value={pdfExtractionPresetId}
              onValueChange={(value: string): void => {
                if (
                  value === 'plain_text' ||
                  value === 'structured_sections' ||
                  value === 'facts_entities'
                ) {
                  setPdfExtractionPresetId(value as CaseResolverPdfExtractionPresetId);
                }
              }}
              options={CASE_RESOLVER_PDF_EXTRACTION_PRESETS.map(opt => ({ value: opt.value, label: opt.label }))}
              triggerClassName='h-8 border-border bg-card/60 text-xs text-white'
              ariaLabel='PDF extraction preset'
            />
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
              variant='outline'
              size='sm'
            >
              Node Inspector
            </Button>
            <Button
              type='button'
              onClick={(): void => {
                setIsLinkedPreviewOpen(true);
              }}
              variant='outline'
              size='sm'
            >
              Linked Preview
            </Button>
            <Button
              type='button'
              onClick={(): void => {
                void copyCompiledPrompt();
              }}
              variant='info'
              size='sm'
            >
              <Copy className='mr-1 size-3.5' />
              Copy Prompt
            </Button>
            <Button
              type='button'
              onClick={handleManualGraphSave}
              variant='outline'
              size='sm'
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
      </Card>
          
      <CaseResolverNodeInspectorModal
        open={isNodeInspectorOpen}
        onOpenChange={setIsNodeInspectorOpen}
        onManualUpdate={handleManualGraphSave}
        selectedNode={selectedNode}
        selectedPromptMeta={selectedPromptMeta}
        selectedPromptSourceFile={selectedPromptSourceFile}
        selectedPromptTemplate={selectedPromptTemplate}
        selectedPromptInputText={selectedPromptInputText}
        selectedPromptOutputPreview={selectedPromptOutputPreview}
        onUpdateSelectedPromptTemplate={updateSelectedPromptTemplate}
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

  const initialNodes: AiNode[] = (activeFile.graph?.nodes || []).map((node: CaseResolverGraph['nodes'][number]): AiNode => {
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
      initialEdges={(activeFile.graph?.edges || []) as unknown as AiEdge[]}
      initialLoading={false}
      initialRuntimeState={EMPTY_RUNTIME_STATE}
    >
      <CaseResolverCanvasWorkspaceInner />
    </AiPathsProvider>
  );
}
