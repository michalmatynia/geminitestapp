import { type Edge as AiEdge, type AiNode, type NodeDefinition } from '@/shared/contracts/ai-paths';
import { DEFAULT_CASE_RESOLVER_EDGE_META, DEFAULT_CASE_RESOLVER_NODE_META, resolveCaseResolverPdfExtractionTemplate } from '@/shared/contracts/case-resolver/constants';
import { type CaseResolverPdfExtractRequest, type CaseResolverPdfExtractResponse, type CaseResolverEdgeMeta, type CaseResolverFile, type CaseResolverGraph, type CaseResolverNodeMeta, type CaseResolverPdfExtractionPresetId, type CaseResolverDroppedAsset, type CaseResolverDroppedDocument } from '@/shared/contracts/case-resolver';
import type { Toast } from '@/shared/contracts/ui/base';
import { palette } from '@/shared/lib/ai-paths/core/definitions';

import {
  DOCUMENT_PLAINTEXT_CONTENT_PORT,
  buildCanvasNodeFileTemplate,
  buildNode,
  buildPromptTemplateFromDroppedDocumentFile,
  clampCanvasPosition,
  createEdgeId,
  createNodeId,
  ensureDocumentPromptPorts,
  normalizeExtractedPdfText,
  resolvePromptConfig,
} from './case-resolver-canvas-utils';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

type CreateCaseResolverCanvasDropHandlersInput = {
  addNode: (node: AiNode) => void;
  addEdge: (edge: AiEdge) => void;
  updateNode: (id: string, patch: Partial<AiNode>) => void;
  selectNode: (nodeId: string) => void;
  focusNodeInCanvas: (nodeId: string, position: { x: number; y: number }) => void;
  onGraphChange: (graph: CaseResolverGraph) => void;
  nodes: AiNode[];
  edges: AiEdge[];
  normalizedNodeMeta: Record<string, CaseResolverNodeMeta>;
  normalizedEdgeMeta: Record<string, CaseResolverEdgeMeta>;
  normalizedDocumentFileLinksByNode: Record<string, string[]>;
  normalizedDocumentDropNodeId: string | null;
  normalizedDocumentSourceFileIdByNode: Record<string, string>;
  pdfExtractionPresetId: CaseResolverPdfExtractionPresetId;
  availableFileIds: Set<string>;
  availableFilesById: Map<string, CaseResolverFile>;
  toast: Toast;
};

export const createCaseResolverCanvasDropHandlers = ({
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
}: CreateCaseResolverCanvasDropHandlersInput): {
  addDroppedAssetNode: (
    asset: CaseResolverDroppedAsset,
    dropPosition: { x: number; y: number },
    indexOffset?: number
  ) => Promise<void>;
  handleDroppedDocuments: (
    droppedDocuments: CaseResolverDroppedDocument[],
    dropPosition: { x: number; y: number }
  ) => void;
  showDocumentNodeInCanvas: (fileId: string, preferredNodeId?: string | null) => void;
} => {
  const toCaseResolverEdge = (edge: AiEdge): CaseResolverGraph['edges'][number] | null => {
    if (!edge.source || !edge.target) return null;
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      ...(edge.label ? { label: edge.label } : {}),
      ...(edge.sourceHandle ? { sourceHandle: edge.sourceHandle } : {}),
      ...(edge.targetHandle ? { targetHandle: edge.targetHandle } : {}),
    };
  };
  const toCanvasEdge = (edge: CaseResolverGraph['edges'][number]): AiEdge => ({
    id: edge.id,
    source: edge.source ?? '',
    target: edge.target ?? '',
    type: 'default',
    data: {},
    createdAt: new Date().toISOString(),
    updatedAt: null,
    ...(edge.sourceHandle ? { sourceHandle: edge.sourceHandle } : {}),
    ...(edge.targetHandle ? { targetHandle: edge.targetHandle } : {}),
  });
  const existingEdges: CaseResolverGraph['edges'] = edges
    .map(toCaseResolverEdge)
    .filter((edge): edge is CaseResolverGraph['edges'][number] => edge !== null);

  const extractPdfText = async (filepath: string): Promise<string> => {
    try {
      const request: CaseResolverPdfExtractRequest = { filepath };
      const response = await fetch('/api/case-resolver/assets/extract-pdf', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(request),
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
        } catch (error) {
          logClientError(error);
          detail = fallbackMessage;
        }
        throw new Error(detail);
      }
      const payload = (await response.json()) as CaseResolverPdfExtractResponse;
      return typeof payload.text === 'string' ? payload.text : '';
    } catch (error) {
      logClientError(error);
      throw new Error(
        `PDF extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { cause: error }
      );
    }
  };

  const addPdfExtractionPipeline = async (
    asset: CaseResolverDroppedAsset,
    dropPosition: { x: number; y: number },
    indexOffset = 0
  ): Promise<void> => {
    try {
      const promptDefinition = palette.find((entry: NodeDefinition) => entry.type === 'prompt');
      const modelDefinition = palette.find((entry: NodeDefinition) => entry.type === 'model');
      if (!promptDefinition || !modelDefinition) {
        toast('Missing Prompt/Model node definitions for PDF flow.', { variant: 'error' });
        return;
      }

      let extractedText = normalizeExtractedPdfText(asset.textContent);
      if (!extractedText && asset.filepath) {
        try {
          extractedText = normalizeExtractedPdfText(await extractPdfText(asset.filepath));
        } catch (error: unknown) {
          logClientError(error);
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

      const pdfNodeBase = buildNode(
        promptDefinition,
        basePosition,
        pdfNodeId,
        `PDF Source: ${asset.name}`
      );
      const pdfNodePromptConfig = resolvePromptConfig(pdfNodeBase);
      const pdfNode: AiNode = {
        ...pdfNodeBase,
        config: {
          ...(pdfNodeBase.config ?? {}),
          prompt: {
            ...pdfNodePromptConfig,
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

      const modelNode = buildNode(
        modelDefinition,
        modelPosition,
        modelNodeId,
        `AI Model: ${asset.name}`
      );

      const outputPromptBase = buildNode(
        promptDefinition,
        outputPosition,
        outputNodeId,
        `WYSIWYG Output: ${asset.name}`
      );
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

      const edgePdfToPrompt: CaseResolverGraph['edges'][number] = {
        id: createEdgeId(),
        source: pdfNodeId,
        target: extractionPromptId,
        sourceHandle: 'prompt',
        targetHandle: 'result',
      };
      const edgePromptToModel: CaseResolverGraph['edges'][number] = {
        id: createEdgeId(),
        source: extractionPromptId,
        target: modelNodeId,
        sourceHandle: 'prompt',
        targetHandle: 'prompt',
      };
      const edgeModelToOutput: CaseResolverGraph['edges'][number] = {
        id: createEdgeId(),
        source: modelNodeId,
        target: outputNodeId,
        sourceHandle: 'result',
        targetHandle: DOCUMENT_PLAINTEXT_CONTENT_PORT,
      };

      addNode(pdfNode);
      addNode(extractionPromptNode);
      addNode(modelNode);
      addNode(outputNode);
      addEdge(toCanvasEdge(edgePdfToPrompt));
      addEdge(toCanvasEdge(edgePromptToModel));
      addEdge(toCanvasEdge(edgeModelToOutput));
      selectNode(outputNodeId);

      onGraphChange({
        nodes: [...nodes, pdfNode, extractionPromptNode, modelNode, outputNode],
        edges: [...existingEdges, edgePdfToPrompt, edgePromptToModel, edgeModelToOutput],
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
      logClientError(error);
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
    const promptDefinition = palette.find((entry: NodeDefinition) => entry.type === 'prompt');

    if (!promptDefinition) return;
    const id = createNodeId();
    const node = buildNode(promptDefinition, position, id, `File: ${asset.name}`);
    const promptConfig = resolvePromptConfig(node);
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
        prompt: {
          ...promptConfig,
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
      (file: CaseResolverFile): boolean => file.fileType !== 'case'
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
      let lastCreatedNodePosition: { x: number; y: number } | null = null;

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
        lastCreatedNodePosition = position;
      });

      if (lastCreatedNodeId && lastCreatedNodePosition) {
        focusNodeInCanvas(lastCreatedNodeId, lastCreatedNodePosition);
      }

      onGraphChange({
        nodes: nextNodes,
        edges: existingEdges,
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

    const promptDefinition = palette.find((entry: NodeDefinition) => entry.type === 'prompt');
    if (!promptDefinition) {
      toast('Prompt node definition is missing.', { variant: 'error' });
      return;
    }

    let nextNodes = nodes;
    let targetNodeId = normalizedDocumentDropNodeId;

    if (!targetNodeId) {
      const id = createNodeId();
      const node = buildNode(
        promptDefinition,
        clampCanvasPosition(dropPosition),
        id,
        'Canvas Node File'
      );
      targetNodeId = id;
      nextNodes = [...nextNodes, node];
      addNode(node);
      focusNodeInCanvas(id, node.position);
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
    if (targetNode.type !== 'prompt') {
      toast('Canvas Node File must use prompt node type.', { variant: 'error' });
      return;
    }
    const promptConfig = resolvePromptConfig(targetNode);
    const nextTemplate = buildCanvasNodeFileTemplate(nextLinkedFileIds, availableFilesById);

    const nextTargetNode: AiNode = {
      ...targetNode,
      title: 'Canvas Node File',
      config: {
        ...(targetNode.config ?? {}),
        prompt: {
          ...promptConfig,
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
      edges: existingEdges,
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

  const showDocumentNodeInCanvas = (fileId: string, preferredNodeId?: string | null): void => {
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

    focusNodeInCanvas(targetNode.id, targetNode.position);
  };

  return {
    addDroppedAssetNode,
    handleDroppedDocuments,
    showDocumentNodeInCanvas,
  };
};
