'use client';

import {
  Copy,
  Save,
  Split,
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
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  NODE_MIN_HEIGHT,
  NODE_WIDTH,
  getDefaultConfigForType,
  palette,
  stableStringify,
  type AiNode,
  type Edge,
  type NodeDefinition,
} from '@/features/ai/ai-paths/lib';
import {
  AppModal,
  Button,
  Checkbox,
  Input,
  Label,
  SelectSimple,
  useToast,
} from '@/shared/ui';

import { compileCaseResolverPrompt } from '../composer';
import { useCaseResolverPageContext } from '../context/CaseResolverPageContext';
import {
  CASE_RESOLVER_DROP_DOCUMENT_TO_CANVAS_EVENT,
  CASE_RESOLVER_SHOW_DOCUMENT_IN_CANVAS_EVENT,
  parseCaseResolverTreeDropPayload,
  type CaseResolverDropDocumentToCanvasDetail,
  type CaseResolverShowDocumentInCanvasDetail,
} from '../drag';
import {
  CASE_RESOLVER_DOCUMENT_NODE_INPUT_PORTS,
  CASE_RESOLVER_DOCUMENT_NODE_OUTPUT_PORTS,
  CASE_RESOLVER_JOIN_MODE_OPTIONS,
  CASE_RESOLVER_NODE_ROLE_OPTIONS,
  CASE_RESOLVER_PDF_EXTRACTION_PRESETS,
  CASE_RESOLVER_QUOTE_MODE_OPTIONS,
  DEFAULT_CASE_RESOLVER_PDF_EXTRACTION_PRESET_ID,
  DEFAULT_CASE_RESOLVER_EDGE_META,
  DEFAULT_CASE_RESOLVER_NODE_META,
  resolveCaseResolverPdfExtractionTemplate,
  type CaseResolverEdgeMeta,
  type CaseResolverAssetFile,
  type CaseResolverFile,
  type CaseResolverGraph,
  type CaseResolverNodeMeta,
  type CaseResolverPdfExtractionPresetId,
} from '../types';

const buildNode = (
  definition: NodeDefinition,
  position: { x: number; y: number },
  id: string,
  title: string
): AiNode => {
  const defaultConfig = getDefaultConfigForType(
    definition.type,
    definition.outputs,
    definition.inputs
  );
  const mergedConfig = definition.config
    ? {
      ...(defaultConfig ?? {}),
      ...definition.config,
    }
    : defaultConfig;

  return {
    ...definition,
    id,
    title,
    position,
    ...(mergedConfig ? { config: mergedConfig } : {}),
  };
};

const ensureDocumentPromptPorts = (node: AiNode): AiNode => {
  if (node.type !== 'prompt') return node;
  const nextInputs = [...CASE_RESOLVER_DOCUMENT_NODE_INPUT_PORTS];
  const nextOutputs = [...CASE_RESOLVER_DOCUMENT_NODE_OUTPUT_PORTS];
  const currentInputs = Array.isArray(node.inputs) ? node.inputs : [];
  const currentOutputs = Array.isArray(node.outputs) ? node.outputs : [];
  const sameInputs =
    nextInputs.length === currentInputs.length &&
    nextInputs.every((port: string, index: number): boolean => port === currentInputs[index]);
  const sameOutputs =
    nextOutputs.length === currentOutputs.length &&
    nextOutputs.every((port: string, index: number): boolean => port === currentOutputs[index]);
  if (sameInputs && sameOutputs) return node;
  return {
    ...node,
    inputs: nextInputs,
    outputs: nextOutputs,
  };
};

const DOCUMENT_TEXTFIELD_PORT = CASE_RESOLVER_DOCUMENT_NODE_INPUT_PORTS[0] ?? 'textfield';
const DOCUMENT_CONTENT_PORT = CASE_RESOLVER_DOCUMENT_NODE_INPUT_PORTS[1] ?? 'content';
const DOCUMENT_PLAIN_TEXT_PORT = CASE_RESOLVER_DOCUMENT_NODE_INPUT_PORTS[2] ?? 'plainText';

const normalizeTextNodeInputPort = (value: string | undefined): string => {
  if (
    value === DOCUMENT_TEXTFIELD_PORT ||
    value === DOCUMENT_CONTENT_PORT ||
    value === DOCUMENT_PLAIN_TEXT_PORT
  ) {
    return value;
  }
  if (value === 'prompt') return DOCUMENT_TEXTFIELD_PORT;
  if (value === 'result') return DOCUMENT_CONTENT_PORT;
  return DOCUMENT_CONTENT_PORT;
};

const normalizeTextNodeOutputPort = (value: string | undefined): string => {
  if (
    value === DOCUMENT_TEXTFIELD_PORT ||
    value === DOCUMENT_CONTENT_PORT ||
    value === DOCUMENT_PLAIN_TEXT_PORT
  ) {
    return value;
  }
  if (value === 'prompt') return DOCUMENT_TEXTFIELD_PORT;
  if (value === 'result') return DOCUMENT_CONTENT_PORT;
  return DOCUMENT_CONTENT_PORT;
};

const normalizeEdgesForTextNode = (edges: Edge[], nodeId: string): Edge[] =>
  edges.map((edge: Edge): Edge => {
    let nextFromPort = edge.fromPort;
    let nextToPort = edge.toPort;
    if (edge.from === nodeId) {
      nextFromPort = normalizeTextNodeOutputPort(edge.fromPort);
    }
    if (edge.to === nodeId) {
      nextToPort = normalizeTextNodeInputPort(edge.toPort);
    }
    if (nextFromPort === edge.fromPort && nextToPort === edge.toPort) return edge;
    return {
      ...edge,
      fromPort: nextFromPort,
      toPort: nextToPort,
    };
  });

const ensureNodeMeta = (
  nodes: AiNode[],
  existing: Record<string, CaseResolverNodeMeta>
): Record<string, CaseResolverNodeMeta> => {
  const nodeIds = new Set(nodes.map((node: AiNode) => node.id));
  const next: Record<string, CaseResolverNodeMeta> = {};

  Object.entries(existing).forEach(([nodeId, meta]: [string, CaseResolverNodeMeta]) => {
    if (!nodeIds.has(nodeId)) return;
    next[nodeId] = meta;
  });

  nodes.forEach((node: AiNode) => {
    if (node.type !== 'prompt') return;
    if (!next[node.id]) {
      next[node.id] = {
        ...DEFAULT_CASE_RESOLVER_NODE_META,
        role: 'ai_prompt',
        includeInOutput: false,
      };
    }
  });

  return next;
};

const ensureEdgeMeta = (
  edges: Edge[],
  existing: Record<string, CaseResolverEdgeMeta>
): Record<string, CaseResolverEdgeMeta> => {
  const edgeIds = new Set(edges.map((edge: Edge) => edge.id));
  const next: Record<string, CaseResolverEdgeMeta> = {};

  Object.entries(existing).forEach(([edgeId, meta]: [string, CaseResolverEdgeMeta]) => {
    if (!edgeIds.has(edgeId)) return;
    next[edgeId] = meta;
  });

  edges.forEach((edge: Edge) => {
    if (!next[edge.id]) {
      next[edge.id] = { ...DEFAULT_CASE_RESOLVER_EDGE_META };
    }
  });

  return next;
};

const ensureDocumentLinksByNode = (
  nodes: AiNode[],
  existing: Record<string, string[]>,
  validFileIds: Set<string>
): Record<string, string[]> => {
  const nodeIds = new Set(nodes.map((node: AiNode) => node.id));
  const next: Record<string, string[]> = {};

  Object.entries(existing).forEach(([nodeId, links]: [string, string[]]) => {
    if (!nodeIds.has(nodeId)) return;
    if (!Array.isArray(links)) return;
    const unique = new Set<string>();
    links.forEach((fileId: string) => {
      if (typeof fileId !== 'string') return;
      const normalized = fileId.trim();
      if (!normalized) return;
      if (!validFileIds.has(normalized)) return;
      unique.add(normalized);
    });
    next[nodeId] = Array.from(unique);
  });

  return next;
};

const ensureDocumentSourceFileByNode = (
  nodes: AiNode[],
  existing: Record<string, string>,
  validFileIds: Set<string>
): Record<string, string> => {
  const nodeIds = new Set(nodes.map((node: AiNode) => node.id));
  const next: Record<string, string> = {};

  Object.entries(existing).forEach(([nodeId, fileId]: [string, string]) => {
    if (!nodeIds.has(nodeId)) return;
    if (typeof fileId !== 'string') return;
    const normalizedFileId = fileId.trim();
    if (!normalizedFileId || !validFileIds.has(normalizedFileId)) return;
    next[nodeId] = normalizedFileId;
  });

  return next;
};

const resolveDocumentDropNodeId = (
  candidate: string | null,
  nodes: AiNode[]
): string | null => {
  if (!candidate) return null;
  return nodes.some((node: AiNode) => node.id === candidate) ? candidate : null;
};

const buildCanvasNodeFileTemplate = (
  linkedFileIds: string[],
  availableFilesById: Map<string, CaseResolverFile>
): string => {
  const lines = ['Canvas Node File', 'Linked Documents:'];
  if (linkedFileIds.length === 0) {
    lines.push('- (none)');
    return lines.join('\n');
  }

  linkedFileIds.forEach((fileId: string, index: number) => {
    const file = availableFilesById.get(fileId);
    const label = file ? file.name : fileId;
    const folderLabel = file ? (file.folder || '(root)') : '(unknown)';
    lines.push(`${index + 1}. ${label} [${folderLabel}]`);
  });

  return lines.join('\n');
};

const resolvePromptConfig = (node: AiNode): { template: string } => {
  const template = node.config?.prompt?.template;
  return {
    template: typeof template === 'string' ? template : '',
  };
};

const resolveTemplateConfig = (node: AiNode): { template: string } => {
  const template = node.config?.template?.template;
  return {
    template: typeof template === 'string' ? template : '',
  };
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const toHtmlParagraph = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return `<p>${escapeHtml(trimmed).replace(/\n/g, '<br/>')}</p>`;
};

const hasHtmlMarkup = (value: string): boolean => /<\/?[a-z][^>]*>/i.test(value);

const decodeHtmlEntity = (value: string): string => {
  try {
    if (typeof window === 'undefined') return value;
    const textarea = document.createElement('textarea');
    textarea.innerHTML = value;
    return textarea.value;
  } catch {
    return value;
  }
};

const stripHtmlToPlainText = (html: string): string => {
  const normalized = html
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/(p|div|h1|h2|h3|h4|h5|h6|li|blockquote)>/gi, '\n')
    .replace(/<li>/gi, '• ')
    .replace(/<[^>]+>/g, '');
  return decodeHtmlEntity(normalized)
    .split('\n')
    .map((line: string) => line.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const renderPromptNodeTextPreview = (
  node: AiNode,
  nodeMeta: CaseResolverNodeMeta
): string => {
  const promptTemplate = node.config?.prompt?.template;
  const raw = typeof promptTemplate === 'string' ? promptTemplate : '';
  const plainText = stripHtmlToPlainText(raw);
  if (!plainText) return '';
  const quoted =
    nodeMeta.quoteMode === 'double'
      ? `"${plainText}"`
      : nodeMeta.quoteMode === 'single'
        ? `'${plainText}'`
        : plainText;
  return `${nodeMeta.surroundPrefix}${quoted}${nodeMeta.surroundSuffix}`;
};

const buildPromptTemplateFromDroppedDocumentFile = (file: CaseResolverFile): string => {
  const source = file.documentContent.trim();
  if (source.length > 0) {
    return hasHtmlMarkup(source) ? source : toHtmlParagraph(source);
  }
  return toHtmlParagraph(`Document: ${file.name}`);
};

const clampCanvasPosition = (position: { x: number; y: number }): { x: number; y: number } => ({
  x: Math.min(Math.max(position.x, 16), CANVAS_WIDTH - NODE_WIDTH - 16),
  y: Math.min(Math.max(position.y, 16), CANVAS_HEIGHT - NODE_MIN_HEIGHT - 16),
});

const createNodeId = (): string => `node-${Math.random().toString(36).slice(2, 10)}`;
const createEdgeId = (): string => `edge-${Math.random().toString(36).slice(2, 10)}`;

const MAX_PDF_EXTRACT_CHARS = 24_000;

const normalizeExtractedPdfText = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.length <= MAX_PDF_EXTRACT_CHARS) return trimmed;
  return `${trimmed.slice(0, MAX_PDF_EXTRACT_CHARS)}\n\n[TRUNCATED ${trimmed.length - MAX_PDF_EXTRACT_CHARS} chars]`;
};

type CaseResolverDroppedAsset = {
  id: string;
  name: string;
  kind: 'node_file' | 'image' | 'pdf' | 'file';
  filepath: string | null;
  mimeType: string | null;
  size: number | null;
  textContent: string;
  description: string;
};

type CaseResolverDroppedDocument = {
  id: string;
  name: string;
  folder: string;
};

type PdfExtractResponse = {
  text?: unknown;
  pageCount?: unknown;
};

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
  const availableFiles = workspace.files;
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

  useEffect(() => {
    if (!configOpen) return;
    setIsNodeInspectorOpen(true);
    setConfigOpen(false);
  }, [configOpen, setConfigOpen]);

  const normalizedNodeMeta = useMemo(
    () => ensureNodeMeta(nodes, graph.nodeMeta),
    [graph.nodeMeta, nodes]
  );
  const normalizedEdgeMeta = useMemo(
    () => ensureEdgeMeta(edges, graph.edgeMeta),
    [edges, graph.edgeMeta]
  );
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

  const compiled = useMemo(
    () =>
      compileCaseResolverPrompt(
        {
          nodes,
          edges,
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
      edges,
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
  }, [graph.pdfExtractionPresetId, pdfExtractionPresetId]);

  useEffect(() => {
    const nextGraph: CaseResolverGraph = {
      nodes,
      edges,
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
    edges,
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

  const extractPdfText = async (filepath: string): Promise<string> => {
    try {
      const response = await fetch('/api/case-resolver/assets/extract-pdf', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ filepath }),
      });
      if (!response.ok) {
        const fallbackMessage = `Failed to extract PDF (${response.status})`;
        let detail = fallbackMessage;
        try {
          const payload = (await response.json()) as { error?: string | { message?: string } };
          if (typeof payload.error === 'string') {
            detail = payload.error;
          } else if (payload.error && typeof payload.error.message === 'string') {
            detail = payload.error.message;
          }
        } catch {
          detail = fallbackMessage;
        }
        throw new Error(detail);
      }
      const payload = (await response.json()) as PdfExtractResponse;
      return typeof payload.text === 'string' ? payload.text : '';
    } catch (error) {
      throw new Error(`PDF extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const addPdfExtractionPipeline = async (
    asset: CaseResolverDroppedAsset,
    dropPosition: { x: number; y: number },
    indexOffset = 0
  ): Promise<void> => {
    try {
      const templateDefinition = palette.find((entry: NodeDefinition) => entry.type === 'template');
      const promptDefinition = palette.find((entry: NodeDefinition) => entry.type === 'prompt');
      const modelDefinition = palette.find((entry: NodeDefinition) => entry.type === 'model');
      if (!templateDefinition || !promptDefinition || !modelDefinition) {
        toast('Missing Template/Prompt/Model node definitions for PDF flow.', { variant: 'error' });
        return;
      }

      let extractedText = normalizeExtractedPdfText(asset.textContent);
      if (!extractedText && asset.filepath) {
        try {
          extractedText = normalizeExtractedPdfText(await extractPdfText(asset.filepath));
        } catch (error: unknown) {
          toast(
            error instanceof Error
              ? `${error.message}. PDF node will use file path only.`
              : 'Failed to extract PDF text. PDF node will use file path only.',
            { variant: 'warning' }
          );
        }
      }

      const basePosition = clampCanvasPosition({
        x: dropPosition.x + indexOffset * 36,
        y: dropPosition.y + indexOffset * 36,
      });
      const extractionPromptPosition = clampCanvasPosition({
        x: basePosition.x + 380,
        y: basePosition.y,
      });
      const modelPosition = clampCanvasPosition({
        x: extractionPromptPosition.x + 380,
        y: extractionPromptPosition.y,
      });
      const outputPosition = clampCanvasPosition({
        x: modelPosition.x + 380,
        y: modelPosition.y,
      });

      const pdfNodeId = createNodeId();
      const extractionPromptId = createNodeId();
      const modelNodeId = createNodeId();
      const outputNodeId = createNodeId();

      const pdfSourceTemplate = [
        `PDF File: ${asset.name}`,
        ...(asset.filepath ? [`Path: ${asset.filepath}`] : []),
        ...(asset.mimeType ? [`MIME: ${asset.mimeType}`] : []),
        '',
        'PDF_TEXT_BEGIN',
        extractedText || '(No extracted PDF text available. Use the PDF path above as reference.)',
        'PDF_TEXT_END',
      ].join('\n');

      const pdfNodeBase = buildNode(templateDefinition, basePosition, pdfNodeId, `PDF Node: ${asset.name}`);
      const pdfNodeTemplateConfig = resolveTemplateConfig(pdfNodeBase);
      const pdfNode: AiNode = {
        ...pdfNodeBase,
        config: {
          ...(pdfNodeBase.config ?? {}),
          template: {
            ...pdfNodeTemplateConfig,
            template: pdfSourceTemplate,
          },
        },
      };

      const extractionPromptBase = buildNode(
        promptDefinition,
        extractionPromptPosition,
        extractionPromptId,
        `Prompt: Extract ${asset.name}`
      );
      const extractionPromptConfig = resolvePromptConfig(extractionPromptBase);
      const extractionPromptNode: AiNode = {
        ...extractionPromptBase,
        config: {
          ...(extractionPromptBase.config ?? {}),
          prompt: {
            ...extractionPromptConfig,
            template: resolveCaseResolverPdfExtractionTemplate(pdfExtractionPresetId),
          },
        },
      };

      const modelNode = buildNode(modelDefinition, modelPosition, modelNodeId, `AI Model: ${asset.name}`);

      const outputPromptBase = buildNode(promptDefinition, outputPosition, outputNodeId, `WYSIWYG Output: ${asset.name}`);
      const outputPromptConfig = resolvePromptConfig(outputPromptBase);
      const outputNode: AiNode = ensureDocumentPromptPorts({
        ...outputPromptBase,
        config: {
          ...(outputPromptBase.config ?? {}),
          prompt: {
            ...outputPromptConfig,
            template: '<p>{{result}}</p>',
          },
        },
      });

      const edgePdfToPrompt: Edge = {
        id: createEdgeId(),
        from: pdfNodeId,
        to: extractionPromptId,
        fromPort: 'prompt',
        toPort: 'result',
      };
      const edgePromptToModel: Edge = {
        id: createEdgeId(),
        from: extractionPromptId,
        to: modelNodeId,
        fromPort: 'prompt',
        toPort: 'prompt',
      };
      const edgeModelToOutput: Edge = {
        id: createEdgeId(),
        from: modelNodeId,
        to: outputNodeId,
        fromPort: 'result',
        toPort: DOCUMENT_CONTENT_PORT,
      };

      addNode(pdfNode);
      addNode(extractionPromptNode);
      addNode(modelNode);
      addNode(outputNode);
      addEdge(edgePdfToPrompt);
      addEdge(edgePromptToModel);
      addEdge(edgeModelToOutput);
      selectNode(outputNodeId);

      onGraphChange({
        nodes: [...nodes, pdfNode, extractionPromptNode, modelNode, outputNode],
        edges: [...edges, edgePdfToPrompt, edgePromptToModel, edgeModelToOutput],
        nodeMeta: {
          ...normalizedNodeMeta,
          [extractionPromptId]: {
            ...DEFAULT_CASE_RESOLVER_NODE_META,
            role: 'ai_prompt',
            includeInOutput: false,
            quoteMode: 'none',
            surroundPrefix: '',
            surroundSuffix: '',
          },
          [outputNodeId]: {
            ...DEFAULT_CASE_RESOLVER_NODE_META,
            role: 'text_note',
            includeInOutput: true,
            quoteMode: 'none',
            surroundPrefix: '',
            surroundSuffix: '',
          },
        },
        edgeMeta: {
          ...normalizedEdgeMeta,
          [edgePdfToPrompt.id]: { ...DEFAULT_CASE_RESOLVER_EDGE_META },
          [edgePromptToModel.id]: { ...DEFAULT_CASE_RESOLVER_EDGE_META },
          [edgeModelToOutput.id]: { ...DEFAULT_CASE_RESOLVER_EDGE_META },
        },
        pdfExtractionPresetId,
        documentFileLinksByNode: normalizedDocumentFileLinksByNode,
        documentDropNodeId: normalizedDocumentDropNodeId,
        documentSourceFileIdByNode: normalizedDocumentSourceFileIdByNode,
      });
    } catch (error) {
      toast(
        error instanceof Error
          ? `PDF pipeline creation failed: ${error.message}`
          : 'An unknown error occurred in the PDF pipeline.',
        { variant: 'error' }
      );
    }
  };

  const addDroppedAssetNode = async (
    asset: CaseResolverDroppedAsset,
    dropPosition: { x: number; y: number },
    indexOffset = 0
  ): Promise<void> => {
    if (asset.kind === 'pdf') {
      await addPdfExtractionPipeline(asset, dropPosition, indexOffset);
      return;
    }

    const position = clampCanvasPosition({
      x: dropPosition.x + indexOffset * 28,
      y: dropPosition.y + indexOffset * 28,
    });
    const templateDefinition = palette.find((entry: NodeDefinition) => entry.type === 'template');

    if (!templateDefinition) return;
    const id = createNodeId();
    const node = buildNode(templateDefinition, position, id, `File: ${asset.name}`);
    const templateConfig = resolveTemplateConfig(node);
    const summaryParts = [
      `Asset: ${asset.name}`,
      `Kind: ${asset.kind}`,
      ...(asset.filepath ? [`Path: ${asset.filepath}`] : []),
      ...(asset.mimeType ? [`MIME: ${asset.mimeType}`] : []),
      ...(asset.size !== null ? [`Size: ${asset.size} bytes`] : []),
      ...(asset.description.trim().length > 0 ? [`Description: ${asset.description}`] : []),
    ];
    addNode({
      ...node,
      config: {
        ...(node.config ?? {}),
        template: {
          ...templateConfig,
          template: summaryParts.join('\n'),
        },
      },
    });
    selectNode(id);
  };

  const handleDroppedDocuments = (
    droppedDocuments: CaseResolverDroppedDocument[],
    dropPosition: { x: number; y: number }
  ): void => {
    if (droppedDocuments.length === 0) return;

    const normalizedFileIds = Array.from(
      new Set(
        droppedDocuments
          .map((entry: CaseResolverDroppedDocument) => entry.id.trim())
          .filter((fileId: string) => fileId.length > 0 && availableFileIds.has(fileId))
      )
    );
    if (normalizedFileIds.length === 0) {
      toast('Dropped document is not available in this workspace.', { variant: 'warning' });
      return;
    }

    const droppedFiles = normalizedFileIds
      .map((fileId: string): CaseResolverFile | null => availableFilesById.get(fileId) ?? null)
      .filter((file: CaseResolverFile | null): file is CaseResolverFile => file !== null);

    const droppedDocumentFiles = droppedFiles.filter(
      (file: CaseResolverFile): boolean => file.fileType === 'document'
    );
    if (droppedDocumentFiles.length > 0) {
      const promptDefinition = palette.find((entry: NodeDefinition) => entry.type === 'prompt');
      if (!promptDefinition) {
        toast('Prompt node definition is missing.', { variant: 'error' });
        return;
      }

      let nextNodes = [...nodes];
      const nextNodeMeta = { ...normalizedNodeMeta };
      const nextDocumentSourceFileIdByNode = { ...normalizedDocumentSourceFileIdByNode };
      let lastCreatedNodeId: string | null = null;

      droppedDocumentFiles.forEach((file: CaseResolverFile, index: number): void => {
        const id = createNodeId();
        const position = clampCanvasPosition({
          x: dropPosition.x + index * 28,
          y: dropPosition.y + index * 28,
        });
        const node = buildNode(promptDefinition, position, id, `Document: ${file.name}`);
        const promptConfig = resolvePromptConfig(node);
        const promptNode = ensureDocumentPromptPorts({
          ...node,
          config: {
            ...(node.config ?? {}),
            prompt: {
              ...promptConfig,
              template: buildPromptTemplateFromDroppedDocumentFile(file),
            },
          },
        });
        addNode(promptNode);
        nextNodes = [...nextNodes, promptNode];
        nextNodeMeta[id] = {
          ...DEFAULT_CASE_RESOLVER_NODE_META,
          role: 'text_note',
          includeInOutput: true,
          quoteMode: 'none',
          surroundPrefix: '',
          surroundSuffix: '',
        };
        nextDocumentSourceFileIdByNode[id] = file.id;
        lastCreatedNodeId = id;
      });

      if (lastCreatedNodeId) {
        selectNode(lastCreatedNodeId);
      }

      onGraphChange({
        nodes: nextNodes,
        edges,
        nodeMeta: nextNodeMeta,
        edgeMeta: normalizedEdgeMeta,
        pdfExtractionPresetId,
        documentFileLinksByNode: normalizedDocumentFileLinksByNode,
        documentDropNodeId: normalizedDocumentDropNodeId,
        documentSourceFileIdByNode: nextDocumentSourceFileIdByNode,
      });

      toast(
        droppedDocumentFiles.length === 1
          ? 'Created document text node. Use Node Inspector for quote/surround options.'
          : `Created ${droppedDocumentFiles.length} document text nodes.`,
        { variant: 'success' }
      );
      return;
    }

    const templateDefinition = palette.find((entry: NodeDefinition) => entry.type === 'template');
    if (!templateDefinition) {
      toast('Template node definition is missing.', { variant: 'error' });
      return;
    }

    let nextNodes = nodes;
    let targetNodeId = normalizedDocumentDropNodeId;

    if (!targetNodeId) {
      const id = createNodeId();
      const node = buildNode(
        templateDefinition,
        clampCanvasPosition(dropPosition),
        id,
        'Canvas Node File'
      );
      targetNodeId = id;
      nextNodes = [...nextNodes, node];
      addNode(node);
      selectNode(id);
    }

    const existingLinkedFileIds = normalizedDocumentFileLinksByNode[targetNodeId] ?? [];
    const nextLinkedFileIds = Array.from(new Set([...existingLinkedFileIds, ...normalizedFileIds]));
    const nextDocumentFileLinksByNode = {
      ...normalizedDocumentFileLinksByNode,
      [targetNodeId]: nextLinkedFileIds,
    };

    const targetNode = nextNodes.find((node: AiNode) => node.id === targetNodeId);
    if (!targetNode) {
      toast('Failed to resolve Canvas Node File target.', { variant: 'error' });
      return;
    }
    const templateConfig = resolveTemplateConfig(targetNode);
    const nextTemplate = buildCanvasNodeFileTemplate(nextLinkedFileIds, availableFilesById);

    const nextTargetNode: AiNode = {
      ...targetNode,
      title: 'Canvas Node File',
      config: {
        ...(targetNode.config ?? {}),
        template: {
          ...templateConfig,
          template: nextTemplate,
        },
      },
    };
    nextNodes = nextNodes.map((node: AiNode) => (node.id === targetNodeId ? nextTargetNode : node));
    updateNode(targetNodeId, {
      title: 'Canvas Node File',
      config: nextTargetNode.config,
    });

    onGraphChange({
      nodes: nextNodes,
      edges,
      nodeMeta: normalizedNodeMeta,
      edgeMeta: normalizedEdgeMeta,
      pdfExtractionPresetId,
      documentFileLinksByNode: nextDocumentFileLinksByNode,
      documentDropNodeId: targetNodeId,
      documentSourceFileIdByNode: normalizedDocumentSourceFileIdByNode,
    });

    toast(
      normalizedFileIds.length === 1
        ? 'Document linked to Canvas Node File.'
        : `${normalizedFileIds.length} documents linked to Canvas Node File.`,
      { variant: 'success' }
    );
  };

  const showDocumentNodeInCanvas = React.useCallback((
    fileId: string,
    preferredNodeId?: string | null
  ): void => {
    const normalizedFileId = fileId.trim();
    if (!normalizedFileId) return;

    const isLinkedNode = (node: AiNode): boolean =>
      normalizedDocumentSourceFileIdByNode[node.id] === normalizedFileId;

    let targetNode: AiNode | null = null;
    if (preferredNodeId) {
      const preferred = nodes.find((node: AiNode): boolean => node.id === preferredNodeId) ?? null;
      if (preferred && isLinkedNode(preferred)) {
        targetNode = preferred;
      }
    }

    if (!targetNode) {
      const reverseNodes = [...nodes].reverse();
      targetNode = reverseNodes.find(isLinkedNode) ?? null;
    }

    if (!targetNode) {
      toast('Document node is no longer on canvas.', { variant: 'warning' });
      return;
    }

    selectNode(targetNode.id);

    const viewport = viewportRef.current?.getBoundingClientRect() ?? null;
    if (!viewport) return;
    setView({
      x: viewport.width / 2 - (targetNode.position.x + NODE_WIDTH / 2) * view.scale,
      y: viewport.height / 2 - (targetNode.position.y + NODE_MIN_HEIGHT / 2) * view.scale,
      scale: view.scale,
    });
  }, [nodes, normalizedDocumentSourceFileIdByNode, selectNode, setView, toast, view.scale, viewportRef]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const listener = (event: Event): void => {
      const customEvent = event as CustomEvent<CaseResolverDropDocumentToCanvasDetail>;
      const detail = customEvent.detail;
      if (!detail || typeof detail !== 'object') return;
      const fileId = typeof detail.fileId === 'string' ? detail.fileId.trim() : '';
      if (!fileId) return;
      handleDroppedDocuments(
        [
          {
            id: fileId,
            name: typeof detail.name === 'string' ? detail.name : 'Document',
            folder: typeof detail.folder === 'string' ? detail.folder : '',
          },
        ],
        placePosition
      );
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
  }, [handleDroppedDocuments, placePosition]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const listener = (event: Event): void => {
      const customEvent = event as CustomEvent<CaseResolverShowDocumentInCanvasDetail>;
      const detail = customEvent.detail;
      if (!detail || typeof detail !== 'object') return;
      const fileId = typeof detail.fileId === 'string' ? detail.fileId : '';
      const preferredNodeId =
        typeof detail.nodeId === 'string' && detail.nodeId.trim().length > 0
          ? detail.nodeId
          : undefined;
      showDocumentNodeInCanvas(fileId, preferredNodeId);
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
  }, [showDocumentNodeInCanvas]);

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
      edges,
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
      edges: nextEdges,
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
      edges,
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
    const hasTreeAssetPayload = parseCaseResolverTreeDropPayload(event.dataTransfer) !== null;
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
      handleDroppedDocuments(
        [
          {
            id: payload.fileId,
            name: payload.name,
            folder: payload.folder,
          },
        ],
        dropPosition
      );
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
    selectedNode && selectedNode.type === 'prompt'
      ? normalizedNodeMeta[selectedNode.id] ?? DEFAULT_CASE_RESOLVER_NODE_META
      : null;

  const selectedPromptSourceFileId =
    selectedNode && selectedNode.type === 'prompt'
      ? normalizedDocumentSourceFileIdByNode[selectedNode.id] ?? null
      : null;
  const selectedPromptSourceFile = selectedPromptSourceFileId
    ? availableFilesById.get(selectedPromptSourceFileId) ?? null
    : null;

  const selectedEdgeJoinMode = selectedEdge
    ? (normalizedEdgeMeta[selectedEdge.id] ?? DEFAULT_CASE_RESOLVER_EDGE_META).joinMode
    : DEFAULT_CASE_RESOLVER_EDGE_META.joinMode;

  const selectedPdfExtractionPreset = useMemo(
    () =>
      CASE_RESOLVER_PDF_EXTRACTION_PRESETS.find(
        (preset): boolean => preset.value === pdfExtractionPresetId
      ) ?? CASE_RESOLVER_PDF_EXTRACTION_PRESETS[0],
    [pdfExtractionPresetId]
  );

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

          <SelectSimple size='sm'
            value={newNodeType}
            onValueChange={(value: string): void => {
              if (
                value === 'prompt' ||
                value === 'model' ||
                value === 'template' ||
                value === 'database'
              ) {
                setNewNodeType(value);
              }
            }}
            options={[
              { value: 'prompt', label: 'Prompt Node' },
              { value: 'model', label: 'Model Node' },
              { value: 'template', label: 'Template Node' },
              { value: 'database', label: 'Database Node' },
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

          <div className='mx-1 h-6 w-px bg-border/60' />

          <SelectSimple size='sm'
            value={pdfExtractionPresetId}
            onValueChange={(value: string): void => {
              if (
                value === 'plain_text' ||
                value === 'structured_sections' ||
                value === 'facts_entities'
              ) {
                setPdfExtractionPresetId(value);
              }
            }}
            options={CASE_RESOLVER_PDF_EXTRACTION_PRESETS}
            className='w-[220px]'
            triggerClassName='h-8 border-border bg-card/60 text-xs text-white'
          />
          {isDropImporting ? (
            <span className='text-[11px] text-gray-400'>Importing dropped files...</span>
          ) : (
            <span className='text-[11px] text-gray-500'>
              PDF preset: {selectedPdfExtractionPreset?.description ?? 'Applies to dropped PDFs'}
            </span>
          )}

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
                  edges,
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

      <AppModal
        open={isNodeInspectorOpen}
        onOpenChange={(open: boolean): void => {
          setIsNodeInspectorOpen(open);
        }}
        title='Node Inspector'
        subtitle='Inspect and edit selected node/edge settings.'
        size='xl'
      >
        <div className='space-y-3'>
          {selectedNode ? (
            <>
              <div className='rounded border border-border/60 bg-card/40 p-3 text-xs text-gray-300'>
                <div className='flex items-center justify-between gap-2'>
                  <span className='text-gray-500'>Node</span>
                  <span className='font-medium text-gray-100'>{selectedNode.title}</span>
                </div>
                <div className='mt-1 flex items-center justify-between gap-2'>
                  <span className='text-gray-500'>Type</span>
                  <span className='uppercase text-[10px] text-gray-200'>{selectedNode.type}</span>
                </div>
              </div>

              {selectedNode.type === 'prompt' && selectedPromptMeta ? (
                <>
                  {selectedPromptSourceFile ? (
                    <div className='space-y-2 rounded border border-sky-500/30 bg-sky-500/10 p-3'>
                      <div className='flex items-center justify-between gap-2 text-xs'>
                        <span className='text-sky-100'>Source Document</span>
                        <span className='truncate text-[11px] text-sky-200'>{selectedPromptSourceFile.name}</span>
                      </div>
                      <Button
                        type='button'
                        className='h-8 rounded-md border border-sky-400/50 px-2 text-xs text-sky-100 hover:bg-sky-500/20'
                        onClick={(): void => {
                          onEditFile(selectedPromptSourceFile.id);
                        }}
                      >
                        Open Edit Document
                      </Button>
                    </div>
                  ) : null}

                  <div className='space-y-2'>
                    <Label className='text-xs text-gray-400'>Node Role</Label>
                    <SelectSimple size='sm'
                      value={selectedPromptMeta.role}
                      onValueChange={(value: string): void => {
                        if (value === 'text_note' || value === 'explanatory' || value === 'ai_prompt') {
                          updateSelectedNodeMeta({ role: value });
                        }
                      }}
                      options={CASE_RESOLVER_NODE_ROLE_OPTIONS}
                      triggerClassName='h-8 border-border bg-card/60 text-xs text-white'
                    />
                  </div>

                  <div className='space-y-2'>
                    <Label className='text-xs text-gray-400'>Quotation Wrapper</Label>
                    <SelectSimple size='sm'
                      value={selectedPromptMeta.quoteMode}
                      onValueChange={(value: string): void => {
                        if (value === 'none' || value === 'double' || value === 'single') {
                          updateSelectedNodeMeta({ quoteMode: value });
                        }
                      }}
                      options={CASE_RESOLVER_QUOTE_MODE_OPTIONS}
                      triggerClassName='h-8 border-border bg-card/60 text-xs text-white'
                    />
                  </div>

                  <div className='grid grid-cols-2 gap-2'>
                    <div className='space-y-2'>
                      <Label className='text-xs text-gray-400'>Surround Prefix</Label>
                      <Input
                        value={selectedPromptMeta.surroundPrefix}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                          updateSelectedNodeMeta({ surroundPrefix: event.target.value });
                        }}
                        className='h-8 border-border bg-card/60 text-xs text-white'
                        placeholder='e.g. <<'
                      />
                    </div>
                    <div className='space-y-2'>
                      <Label className='text-xs text-gray-400'>Surround Suffix</Label>
                      <Input
                        value={selectedPromptMeta.surroundSuffix}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                          updateSelectedNodeMeta({ surroundSuffix: event.target.value });
                        }}
                        className='h-8 border-border bg-card/60 text-xs text-white'
                        placeholder='e.g. >>'
                      />
                    </div>
                  </div>

                  <div className='flex items-center justify-between rounded border border-border/60 bg-card/30 px-3 py-2'>
                    <div className='text-xs text-gray-300'>Include node in compiled output</div>
                    <Checkbox
                      checked={selectedPromptMeta.includeInOutput}
                      onCheckedChange={(checked: boolean): void => {
                        updateSelectedNodeMeta({ includeInOutput: checked });
                      }}
                    />
                  </div>
                  {selectedPromptMeta.role === 'ai_prompt' ? (
                    <div className='text-[11px] text-gray-500'>
                      Runtime AI prompt nodes are excluded by default and can be opted in.
                    </div>
                  ) : null}

                  <div className='rounded border border-border/60 bg-card/30 px-3 py-2 text-xs text-gray-400'>
                    Document nodes support <span className='text-gray-200'>textfield</span>, <span className='text-gray-200'>content</span>, and <span className='text-gray-200'>plainText</span> I/O.
                    Use <span className='text-gray-200'>plainText</span> input to strip incoming HTML to clean text automatically.
                  </div>
                </>
              ) : (
                <div className='rounded border border-dashed border-border/60 px-3 py-2 text-xs text-gray-500'>
                  Select a Prompt node to configure metadata.
                </div>
              )}
            </>
          ) : (
            <div className='rounded border border-dashed border-border/60 px-3 py-2 text-xs text-gray-500'>
              Select a node on the map to edit it.
            </div>
          )}

          {selectedEdge ? (
            <div className='space-y-2 rounded border border-border/60 bg-card/30 p-3'>
              <div className='flex items-center gap-2 text-xs text-gray-300'>
                <Split className='size-3.5 text-gray-500' />
                Edge join operator
              </div>
              <div className='text-[11px] text-gray-500'>
                {selectedEdge.fromPort ?? 'output'} → {selectedEdge.toPort ?? 'input'}
              </div>
              <SelectSimple size='sm'
                value={selectedEdgeJoinMode}
                onValueChange={(value: string): void => {
                  if (value === 'newline' || value === 'tab' || value === 'space' || value === 'none') {
                    updateSelectedEdgeMeta({ joinMode: value });
                  }
                }}
                options={CASE_RESOLVER_JOIN_MODE_OPTIONS}
                triggerClassName='h-8 border-border bg-card/60 text-xs text-white'
              />
            </div>
          ) : (
            <div className='rounded border border-dashed border-border/60 px-3 py-2 text-xs text-gray-500'>
              Select a connection to choose how linked node text joins (new line, tab, space, none).
            </div>
          )}
        </div>
      </AppModal>

      <AppModal
        open={isLinkedPreviewOpen}
        onOpenChange={(open: boolean): void => {
          setIsLinkedPreviewOpen(open);
        }}
        title='Linked Nodes Preview'
        subtitle='Compilation starts from the selected node. If no node is selected, it starts from graph roots.'
        size='xl'
      >
        <div className='flex h-full min-h-0 flex-col'>
          <div className='mb-3 max-h-56 overflow-auto rounded border border-border/60 bg-card/30 p-2 text-xs text-gray-300'>
            {compiled.segments.length > 0 ? (
              compiled.segments.map((segment) => (
                <div key={segment.nodeId} className='mb-2 rounded border border-border/40 bg-card/30 p-2 last:mb-0'>
                  <div className='flex items-center justify-between gap-2 text-[11px]'>
                    <span className='font-medium text-gray-100'>{segment.title}</span>
                    <span className='uppercase text-[10px] text-gray-400'>{segment.role}</span>
                  </div>
                  <div className='mt-1 line-clamp-3 text-[11px] text-gray-400'>
                    {segment.text || '(empty)'}
                  </div>
                </div>
              ))
            ) : (
              <div className='text-gray-500'>No linked segments yet.</div>
            )}
          </div>

          <div className='min-h-0 flex-1 overflow-auto rounded border border-border/60 bg-black/20 p-3 font-mono text-[12px] text-gray-100 whitespace-pre-wrap'>
            {compiled.prompt || 'Compiled prompt output will appear here.'}
          </div>
        </div>
      </AppModal>
    </div>
  );
}

export function CaseResolverCanvasWorkspace(): React.JSX.Element {
  const { activeFile } = useCaseResolverPageContext();

  if (!activeFile) {
    return (
      <div className='flex h-[420px] items-center justify-center rounded-lg border border-dashed border-border/60 bg-card/20 text-sm text-gray-400'>
        Create a case file to start mapping nodes.
      </div>
    );
  }

  return (
    <AiPathsProvider
      key={activeFile.id}
      initialNodes={activeFile.graph.nodes}
      initialEdges={activeFile.graph.edges}
      initialLoading={false}
      initialRuntimeState={{
        inputs: {},
        outputs: {},
        history: {},
      }}
    >
      <CaseResolverCanvasWorkspaceInner />
    </AiPathsProvider>
  );
}
