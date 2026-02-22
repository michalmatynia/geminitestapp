'use client';

import { ExternalLink, FileCode2, FileText, ScanLine, Sparkles } from 'lucide-react';
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
} from '@/features/ai/ai-paths/lib';
import { type AiNode, type AiEdge, type NodeDefinition } from '@/shared/contracts/case-resolver';
import {
  CASE_RESOLVER_DOCUMENT_NODE_OUTPUT_PORTS,
  DEFAULT_CASE_RESOLVER_NODE_META,
  type CaseResolverIdentifier,
  type CaseResolverFile,
  type CaseResolverSnapshotNodeMeta as CaseResolverNodeFileMeta,
  type CaseResolverNodeFileSnapshot,
  type CaseResolverScanSlot,
} from '@/shared/contracts/case-resolver';
import { Button, useToast, Badge, Hint, SelectSimple, EmptyState, Card, SearchInput } from '@/shared/ui';
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
import {
  buildNode,
  buildPromptTemplateFromDroppedDocumentFile,
  clampCanvasPosition,
  ensureDocumentPromptPorts,
  renderPromptNodeTextPreview,
  resolvePromptConfig,
  stripHtmlToPlainText,
} from './case-resolver-canvas-utils';

// ─── helpers ─────────────────────────────────────────────────────────────────

const PREVIEW_MAX_CHARS = 400;
const SEARCHABLE_CONTENT_MAX_CHARS = 6000;

type NodeFileDocumentSearchScope = 'case_scope' | 'all_cases';

type NodeFileDocumentSearchRow = {
  file: CaseResolverFile;
  signatureLabel: string;
  addresserLabel: string;
  addresseeLabel: string;
  searchable: string;
};

const normalizeSearchText = (value: string): string =>
  value
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const resolvePartyReferenceSearchLabel = (
  reference: CaseResolverFile['addresser'] | CaseResolverFile['addressee']
): string => {
  if (!reference) return '';
  const kind = typeof reference.kind === 'string' ? reference.kind.trim() : '';
  const id = typeof reference.id === 'string' ? reference.id.trim() : '';
  if (!kind && !id) return '';
  return [kind, id].filter(Boolean).join(':');
};

const resolveIdentifierSearchLabel = (
  identifierId: string | null | undefined,
  labelsById: Map<string, string>
): string => {
  const normalizedIdentifierId = typeof identifierId === 'string' ? identifierId.trim() : '';
  if (!normalizedIdentifierId) return '';
  return labelsById.get(normalizedIdentifierId) ?? normalizedIdentifierId;
};

const resolveContentPreview = (file: CaseResolverFile): string => {
  if (file.fileType === 'document') {
    const text = file.documentContentPlainText.trim() || file.documentContentMarkdown.trim();
    if (!text) return '';
    return text.length > PREVIEW_MAX_CHARS ? `${text.slice(0, PREVIEW_MAX_CHARS)}…` : text;
  }
  if (file.fileType === 'scanfile') {
    const combined = file.scanSlots
      .map((slot: CaseResolverScanSlot): string => (slot.ocrText ?? '').trim())
      .filter(Boolean)
      .join('\n\n');
    if (!combined) return '';
    return combined.length > PREVIEW_MAX_CHARS
      ? `${combined.slice(0, PREVIEW_MAX_CHARS)}…`
      : combined;
  }
  return '';
};

const resolveSearchableDocumentContent = (file: CaseResolverFile): string => {
  if (file.fileType === 'document') {
    const text =
      file.documentContentPlainText.trim() ||
      file.documentContentMarkdown.trim() ||
      file.documentContent.trim();
    return text.length > SEARCHABLE_CONTENT_MAX_CHARS
      ? text.slice(0, SEARCHABLE_CONTENT_MAX_CHARS)
      : text;
  }
  if (file.fileType === 'scanfile') {
    const combined = file.scanSlots
      .map((slot: CaseResolverScanSlot): string => (slot.ocrText ?? '').trim())
      .filter(Boolean)
      .join('\n');
    return combined.length > SEARCHABLE_CONTENT_MAX_CHARS
      ? combined.slice(0, SEARCHABLE_CONTENT_MAX_CHARS)
      : combined;
  }
  return '';
};

const collectScopedCaseIds = (
  files: CaseResolverFile[],
  rootCaseId: string | null
): Set<string> | null => {
  if (!rootCaseId) return null;
  const caseById = new Map(
    files
      .filter((file: CaseResolverFile): boolean => file.fileType === 'case')
      .map((file: CaseResolverFile): [string, CaseResolverFile] => [file.id, file])
  );
  if (!caseById.has(rootCaseId)) return null;

  const childrenByParent = new Map<string, string[]>();
  caseById.forEach((file: CaseResolverFile): void => {
    const parentCaseId = typeof file.parentCaseId === 'string' ? file.parentCaseId.trim() : '';
    if (!parentCaseId || parentCaseId === file.id || !caseById.has(parentCaseId)) return;
    const currentChildren = childrenByParent.get(parentCaseId) ?? [];
    currentChildren.push(file.id);
    childrenByParent.set(parentCaseId, currentChildren);
  });

  const scoped = new Set<string>();
  const visit = (caseId: string): void => {
    if (!caseId || scoped.has(caseId)) return;
    if (!caseById.has(caseId)) return;
    scoped.add(caseId);
    const children = childrenByParent.get(caseId) ?? [];
    children.forEach((childCaseId: string): void => visit(childCaseId));
  };
  visit(rootCaseId);
  return scoped.size > 0 ? scoped : null;
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
    <Card
      variant='glass'
      padding='none'
      className='flex w-80 flex-shrink-0 flex-col gap-3 overflow-y-auto border-border/60 bg-card/20 p-4'
    >
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
            <Card
              variant='subtle-compact'
              padding='sm'
              className='max-h-52 overflow-y-auto border-border/60 bg-card/30 text-[11px] leading-relaxed text-gray-300 whitespace-pre-wrap'
            >
              {preview}
            </Card>
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
          variant='outline'
          size='sm'
          className='h-8 w-full'
        >
          <ExternalLink className='mr-1.5 size-3.5' />
          Open &ldquo;{meta.fileName}&rdquo;
        </Button>
      ) : null}
    </Card>
  );
}

// ─── inner canvas component ───────────────────────────────────────────────────

function CaseResolverNodeFileWorkspaceInner({
  assetId,
  assetName,
  snapshot,
  onSnapshotChange,
}: NodeFileWorkspaceInnerProps): React.JSX.Element {
  const {
    workspace,
    activeCaseId,
    caseResolverIdentifiers,
    onSelectFile,
  } = useCaseResolverPageContext();
  const { viewportRef, canvasRef } = useCanvasRefs();
  const { view } = useCanvasState();
  const { setView } = useCanvasActions();
  const { nodes, edges } = useGraphState();
  const { addNode, setNodes } = useGraphActions();
  const { selectedNodeId } = useSelectionState();
  const { selectNode } = useSelectionActions();
  const { toast } = useToast();
  const [newNodeType, setNewNodeType] = useState<'prompt' | 'model' | 'template' | 'database' | 'viewer'>('prompt');
  const [isSidePanelVisible, setIsSidePanelVisible] = useState(true);
  const [showNodeSelectorUnderCanvas, setShowNodeSelectorUnderCanvas] = useState(
    () => nodes.length > 0
  );
  const [documentSearchScope, setDocumentSearchScope] =
    useState<NodeFileDocumentSearchScope>('case_scope');
  const [documentSearchQuery, setDocumentSearchQuery] = useState('');

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
  const caseIdentifierLabelById = useMemo((): Map<string, string> => {
    const labelsById = new Map<string, string>();
    caseResolverIdentifiers.forEach((identifier: CaseResolverIdentifier): void => {
      const identifierRecord = identifier as unknown as Record<string, unknown>;
      const id = typeof identifier.id === 'string' ? identifier.id.trim() : '';
      if (!id) return;
      const name =
        typeof identifierRecord['name'] === 'string' ? identifierRecord['name'].trim() : '';
      const label =
        typeof identifierRecord['label'] === 'string' ? identifierRecord['label'].trim() : '';
      const type =
        typeof identifierRecord['type'] === 'string' ? identifierRecord['type'].trim() : '';
      const value =
        typeof identifierRecord['value'] === 'string' ? identifierRecord['value'].trim() : '';
      const resolvedLabel =
        label ||
        name ||
        [type, value].filter((part: string): boolean => part.length > 0).join(': ') ||
        id;
      labelsById.set(id, resolvedLabel);
    });
    return labelsById;
  }, [caseResolverIdentifiers]);
  const scopedCaseIds = useMemo(
    (): Set<string> | null => collectScopedCaseIds(workspace.files, activeCaseId),
    [activeCaseId, workspace.files]
  );
  const allSearchableFiles = useMemo(
    (): CaseResolverFile[] =>
      workspace.files.filter((file: CaseResolverFile): boolean => file.fileType !== 'case'),
    [workspace.files]
  );
  const caseScopedSearchableFiles = useMemo(
    (): CaseResolverFile[] =>
      allSearchableFiles.filter((file: CaseResolverFile): boolean =>
        Boolean(file.parentCaseId && scopedCaseIds?.has(file.parentCaseId))
      ),
    [allSearchableFiles, scopedCaseIds]
  );
  const activeCaseScopeLabel = useMemo((): string => {
    if (!activeCaseId) return 'Current case only';
    const activeCase = workspace.files.find(
      (file: CaseResolverFile): boolean => file.id === activeCaseId && file.fileType === 'case'
    );
    return activeCase ? `Current case: ${activeCase.name}` : `Current case: ${activeCaseId}`;
  }, [activeCaseId, workspace.files]);
  const documentSearchRows = useMemo((): NodeFileDocumentSearchRow[] => {
    const sourceFiles =
      documentSearchScope === 'all_cases' ? allSearchableFiles : caseScopedSearchableFiles;
    return sourceFiles
      .map((file: CaseResolverFile): NodeFileDocumentSearchRow => {
        const signatureLabel = resolveIdentifierSearchLabel(
          file.caseIdentifierId,
          caseIdentifierLabelById
        );
        const addresserLabel = resolvePartyReferenceSearchLabel(file.addresser);
        const addresseeLabel = resolvePartyReferenceSearchLabel(file.addressee);
        const searchable = normalizeSearchText(
          [
            file.name,
            file.folder,
            signatureLabel,
            addresserLabel,
            addresseeLabel,
            resolveSearchableDocumentContent(file),
          ].join('\n')
        );
        return {
          file,
          signatureLabel,
          addresserLabel,
          addresseeLabel,
          searchable,
        };
      })
      .sort((left: NodeFileDocumentSearchRow, right: NodeFileDocumentSearchRow): number => {
        const leftUpdatedAt = new Date(
          left.file.updatedAt || left.file.createdAt || 0
        ).getTime();
        const rightUpdatedAt = new Date(
          right.file.updatedAt || right.file.createdAt || 0
        ).getTime();
        if (leftUpdatedAt !== rightUpdatedAt) return rightUpdatedAt - leftUpdatedAt;
        return left.file.name.localeCompare(right.file.name);
      });
  }, [
    allSearchableFiles,
    caseIdentifierLabelById,
    caseScopedSearchableFiles,
    documentSearchScope,
  ]);
  const filteredDocumentSearchRows = useMemo((): NodeFileDocumentSearchRow[] => {
    const normalizedQuery = normalizeSearchText(documentSearchQuery);
    if (!normalizedQuery) return documentSearchRows;
    return documentSearchRows.filter((row: NodeFileDocumentSearchRow): boolean =>
      row.searchable.includes(normalizedQuery)
    );
  }, [documentSearchQuery, documentSearchRows]);
  const activeNodeOptions = useMemo(
    () =>
      nodes.map((node: AiNode, index: number) => {
        const linkedMeta = nodeFileMetaRef.current[node.id] ?? null;
        const title = node.title?.trim() || `Node ${index + 1}`;
        return {
          value: node.id,
          label: linkedMeta ? `${title} (${linkedMeta.fileName})` : title,
          description: linkedMeta
            ? `Type: ${node.type} • Linked file: ${linkedMeta.fileName}`
            : `Type: ${node.type}`,
        };
      }),
    [nodes]
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
      if (!existingNodeIds.has(nodeId)) continue;
      const normalizedFileId = typeof meta.fileId === 'string' ? meta.fileId.trim() : '';
      if (!normalizedFileId || !filesById.has(normalizedFileId)) continue;
      prunedMeta[nodeId] = meta;
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
  }, [filesById, nodes, onSnapshotChange, strictEdges]);

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
  const focusNodeInCanvas = useCallback(
    (nodeId: string): void => {
      const normalizedNodeId = nodeId.trim();
      if (!normalizedNodeId) return;
      const node = nodes.find((entry: AiNode): boolean => entry.id === normalizedNodeId);
      if (!node) return;
      selectNode(normalizedNodeId);
      const viewport = viewportRef.current?.getBoundingClientRect() ?? null;
      if (!viewport) return;
      setView({
        x: viewport.width / 2 - (node.position.x + NODE_WIDTH / 2) * view.scale,
        y: viewport.height / 2 - (node.position.y + NODE_MIN_HEIGHT / 2) * view.scale,
        scale: view.scale,
      });
    },
    [nodes, selectNode, setView, view.scale, viewportRef]
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
      setShowNodeSelectorUnderCanvas(true);
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
    if (nodes.length > 0) return;
    setShowNodeSelectorUnderCanvas(false);
  }, [nodes.length]);

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
          focusNodeInCanvas(preferredNodeId);
          return;
        }
      }

      const nodeIds = Object.entries(nodeFileMetaRef.current)
        .filter(([, meta]): boolean => meta.fileId === fileId)
        .map(([nodeId]: [string, CaseResolverNodeFileMeta]): string => nodeId);
      if (nodeIds.length === 0) return;
      focusNodeInCanvas(nodeIds[nodeIds.length - 1] ?? nodeIds[0]!);
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
  }, [assetId, focusNodeInCanvas]);

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
    toast('Node file updated.', { variant: 'success' });
  }, [nodes, onSnapshotChange, strictEdges, toast]);

  // Derived values for the side panel
  const selectedNodeMeta = selectedNodeId
    ? (nodeFileMetaRef.current[selectedNodeId] ?? null)
    : null;
  const selectedFile = selectedNodeMeta
    ? (filesById.get(selectedNodeMeta.fileId) ?? null)
    : null;
  const resolveConnectorTooltip = useCallback(
    (input: {
      direction: 'input' | 'output';
      node: AiNode;
      port: string;
    }): { content: React.ReactNode; maxWidth?: string | undefined } | null => {
      if (input.direction !== 'output') return null;
      if (input.node.type !== 'prompt') return null;
      if (
        input.port !== CASE_RESOLVER_DOCUMENT_NODE_OUTPUT_PORTS[0] &&
        input.port !== CASE_RESOLVER_DOCUMENT_NODE_OUTPUT_PORTS[1] &&
        input.port !== CASE_RESOLVER_DOCUMENT_NODE_OUTPUT_PORTS[2]
      ) {
        return null;
      }

      const linkedMeta = nodeFileMetaRef.current[input.node.id] ?? null;
      const sourceFile = linkedMeta ? filesById.get(linkedMeta.fileId) ?? null : null;
      const template = resolvePromptConfig(input.node).template;
      const wysiwygOutput = stripHtmlToPlainText(template);
      const contentOutput =
        renderPromptNodeTextPreview(input.node, DEFAULT_CASE_RESOLVER_NODE_META) ||
        wysiwygOutput;
      const plainTextOutput = stripHtmlToPlainText(contentOutput || wysiwygOutput);
      const isContentPort = input.port === CASE_RESOLVER_DOCUMENT_NODE_OUTPUT_PORTS[1];
      const isPlainTextPort = input.port === CASE_RESOLVER_DOCUMENT_NODE_OUTPUT_PORTS[2];
      const outputLabel = isPlainTextPort
        ? 'Plain text output'
        : isContentPort
          ? 'Content output'
          : 'WYSIWYG text output';
      const renderedText = isPlainTextPort
        ? plainTextOutput
        : isContentPort
          ? contentOutput
          : wysiwygOutput;

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
    [filesById]
  );

  return (
    <div className='flex h-[calc(100vh-120px)] min-h-0 w-full gap-3'>
      {/* ── Main canvas panel ── */}
      <Card
        variant='glass'
        padding='none'
        className='flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden'
      >
        <div className='flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-4 py-3'>
          <div className='flex min-w-0 items-center gap-2'>
            <Button
              type='button'
              size='sm'
              onClick={handleManualSave}
              className='h-8 min-w-[100px] flex-shrink-0 rounded-md border border-emerald-500/40 text-xs text-emerald-200 transition-colors hover:bg-emerald-500/10'
            >
              Update
            </Button>
            <h2 className='truncate text-2xl font-bold tracking-tight text-white'>Edit Node File</h2>
            <Badge variant='outline' className='truncate px-1.5 py-0 text-[10px]'>
              {assetName}
            </Badge>
          </div>
          <div className='ml-auto flex items-center gap-2'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              className='h-8'
              onClick={(): void => {
                setIsSidePanelVisible((previous) => !previous);
              }}
            >
              {isSidePanelVisible ? 'Hide Sidebar' : 'Show Sidebar'}
            </Button>
            <Badge variant='outline' className='px-1.5 py-0 text-[10px]'>
              {nodes.length} node{nodes.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>

        {/* Toolbar */}
        <div className='flex flex-wrap items-center gap-2 border-b border-border/60 px-4 py-3'>
          <SelectSimple
            size='sm'
            value={selectedNodeId ?? ''}
            onValueChange={(value: string): void => {
              const normalized = value.trim();
              if (!normalized) return;
              focusNodeInCanvas(normalized);
            }}
            options={activeNodeOptions}
            placeholder='Active nodes on canvas'
            className='w-[280px]'
            triggerClassName='h-8 border-border bg-card/60 text-xs text-white'
            disabled={activeNodeOptions.length === 0}
          />

          <SelectSimple
            size='sm'
            value={documentSearchScope}
            onValueChange={(value: string): void => {
              setDocumentSearchScope(value === 'all_cases' ? 'all_cases' : 'case_scope');
            }}
            options={[
              {
                value: 'case_scope',
                label: activeCaseScopeLabel,
                description: `${caseScopedSearchableFiles.length} documents`,
              },
              {
                value: 'all_cases',
                label: 'All cases',
                description: `${allSearchableFiles.length} documents`,
              },
            ]}
            className='w-[220px]'
            triggerClassName='h-8 border-border bg-card/60 text-xs text-white'
          />

          <SearchInput
            value={documentSearchQuery}
            onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
              setDocumentSearchQuery(event.target.value);
            }}
            onClear={(): void => {
              setDocumentSearchQuery('');
            }}
            size='sm'
            placeholder='Search by name, signature, addresser/addressee, content'
            containerClassName='w-[320px]'
            className='h-8 border-border bg-card/60 text-xs text-white'
          />

          <Badge variant='outline' className='px-1.5 py-0 text-[10px]'>
            {filteredDocumentSearchRows.length} result
            {filteredDocumentSearchRows.length !== 1 ? 's' : ''}
          </Badge>

          <div className='mx-1 h-6 w-px bg-border/60' />

          <Button
            type='button'
            onClick={addExplanatoryNode}
            variant='success'
            size='sm'
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
            variant='outline'
            size='sm'
          >
            Add Node
          </Button>
        </div>

        {/* Canvas */}
        <div
          className='relative min-h-0 flex-1 overflow-hidden'
          onDragOverCapture={handleCanvasDragOverCapture}
          onDropCapture={handleCanvasDropCapture}
        >
          <CanvasBoard
            viewportClassName='h-full min-h-0'
            resolveConnectorTooltip={resolveConnectorTooltip}
          />
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

        {showNodeSelectorUnderCanvas && activeNodeOptions.length > 0 ? (
          <div className='shrink-0 border-t border-border/60 bg-card/40 px-4 py-3'>
            <div className='mb-2 flex items-center justify-between gap-2'>
              <div>
                <div className='text-xs font-medium text-gray-200'>Node Selector</div>
                <div className='text-[11px] text-gray-500'>
                  Click a node to focus it on canvas.
                </div>
              </div>
              <Button
                type='button'
                variant='ghost'
                size='sm'
                className='h-7 px-2 text-[11px] text-gray-400 hover:text-gray-200'
                onClick={(): void => {
                  setShowNodeSelectorUnderCanvas(false);
                }}
              >
                Hide
              </Button>
            </div>
            <div className='max-h-[35vh] overflow-x-hidden overflow-y-auto pr-1'>
              <div className='grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-2'>
                {activeNodeOptions.map((option) => {
                  const isSelected = selectedNodeId === option.value;
                  return (
                    <button
                      key={option.value}
                      type='button'
                      className={`w-full rounded border px-2 py-2 text-left transition-colors ${
                        isSelected
                          ? 'border-cyan-400/60 bg-cyan-500/10'
                          : 'border-border/60 bg-card/20 hover:border-cyan-500/40 hover:bg-card/40'
                      }`}
                      onClick={(): void => {
                        focusNodeInCanvas(option.value);
                      }}
                    >
                      <div className='truncate text-xs font-medium text-gray-200'>
                        {option.label}
                      </div>
                      <div className='mt-0.5 truncate text-[10px] text-gray-500'>
                        {option.description}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}
      </Card>

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
