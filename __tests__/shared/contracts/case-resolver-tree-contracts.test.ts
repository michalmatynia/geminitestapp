import { describe, expect, it } from 'vitest';

import {
  canvasSemanticDocumentSchema,
  semanticDocumentSchema,
  subgraphSemanticDocumentSchema,
} from '@/shared/contracts/ai-paths-semantic-grammar';
import { caseResolverDocumentDateProposalSchema } from '@/shared/contracts/case-resolver/file';
import { caseResolverGraphSchema } from '@/shared/contracts/case-resolver/graph';
import {
  caseResolverCanvasEdgeSchema,
  caseResolverEditorNodeContextSchema,
  caseResolverSettingsSchema,
  caseResolverWorkspaceSchema,
} from '@/shared/contracts/case-resolver/workspace';
import {
  FOLDER_TREE_PROFILE_V2_KEY_PREFIX,
  FOLDER_TREE_UI_STATE_V2_KEY_PREFIX,
  masterFolderTreeActionResultSchema,
  masterFolderTreeDragStateSchema,
  masterFolderTreeErrorSchema,
  masterFolderTreePersistContextSchema,
  masterFolderTreePersistOperationSchema,
  masterFolderTreeUndoEntrySchema,
  masterTreeBuildResultSchema,
  masterTreeCanDropResultSchema,
  masterTreeCycleGuardResultSchema,
  masterTreeMutationResultSchema,
  masterTreeNodeSchema,
  useMasterFolderTreeOptionsSchema,
} from '@/shared/contracts/master-folder-tree';

const iso = '2026-03-25T12:00:00.000Z';

const aiNode = {
  id: 'node-1',
  type: 'trigger' as const,
  title: 'Trigger',
  description: 'Starts the flow',
  position: { x: 0, y: 0 },
  inputs: [],
  outputs: ['result'],
  createdAt: iso,
  updatedAt: null,
};

describe('shared contract runtime coverage for tree and case resolver bundles', () => {
  it('parses master folder tree payloads across action variants', () => {
    const rootNode = masterTreeNodeSchema.parse({
      id: 'root-1',
      type: 'folder',
      kind: 'workspace',
      parentId: null,
      name: 'Workspace',
      path: '/workspace',
      sortOrder: 0,
      metadata: { scope: 'root' },
    });
    const childNode = masterTreeNodeSchema.parse({
      id: 'file-1',
      type: 'file',
      kind: 'document',
      parentId: 'root-1',
      name: 'Brief',
      path: '/workspace/brief',
      sortOrder: 1,
      icon: 'file-text',
    });

    expect(FOLDER_TREE_UI_STATE_V2_KEY_PREFIX).toBe('folder_tree_ui_state::');
    expect(FOLDER_TREE_PROFILE_V2_KEY_PREFIX).toBe('folder_tree_profile::');

    expect(
      masterTreeBuildResultSchema.parse({
        roots: [{ ...rootNode, children: [{ ...childNode, children: [] }] }],
        issues: [
          {
            code: 'MISSING_PARENT',
            nodeId: 'file-1',
            message: 'Parent node is missing',
          },
        ],
      })
    ).toEqual(
      expect.objectContaining({
        roots: [
          expect.objectContaining({
            children: [expect.objectContaining({ id: 'file-1' })],
          }),
        ],
      })
    );

    expect(
      masterTreeCycleGuardResultSchema.parse({
        hasCycle: false,
        cycleNodeIds: [],
      })
    ).toEqual({
      hasCycle: false,
      cycleNodeIds: [],
    });

    expect(
      masterTreeCanDropResultSchema.parse({
        ok: true,
        resolvedParentId: 'root-1',
      })
    ).toEqual({
      ok: true,
      resolvedParentId: 'root-1',
    });

    expect(
      masterTreeMutationResultSchema.parse({
        ok: true,
        nodes: [rootNode, childNode],
      })
    ).toEqual(
      expect.objectContaining({
        ok: true,
      })
    );
    expect(
      masterTreeMutationResultSchema.parse({
        ok: false,
        code: 'TARGET_NOT_FOLDER',
        nodes: [rootNode, childNode],
      })
    ).toEqual(
      expect.objectContaining({
        ok: false,
        code: 'TARGET_NOT_FOLDER',
      })
    );

    expect(
      masterFolderTreePersistOperationSchema.parse({
        type: 'move',
        nodeId: 'file-1',
        targetParentId: 'root-1',
        targetIndex: 0,
      })
    ).toEqual(
      expect.objectContaining({
        type: 'move',
      })
    );
    expect(
      masterFolderTreePersistOperationSchema.parse({
        type: 'reorder',
        nodeId: 'file-1',
        targetId: 'root-1',
        position: 'before',
      })
    ).toEqual(
      expect.objectContaining({
        type: 'reorder',
      })
    );
    expect(
      masterFolderTreePersistOperationSchema.parse({
        type: 'rename',
        nodeId: 'file-1',
        name: 'Updated brief',
      })
    ).toEqual(
      expect.objectContaining({
        type: 'rename',
      })
    );
    expect(
      masterFolderTreePersistOperationSchema.parse({
        type: 'replace_nodes',
        nodes: [rootNode, childNode],
        reason: 'refresh',
      })
    ).toEqual(
      expect.objectContaining({
        type: 'replace_nodes',
      })
    );

    expect(
      masterFolderTreeDragStateSchema.parse({
        draggedNodeId: 'file-1',
        targetId: 'root-1',
        position: 'inside',
      })
    ).toEqual(
      expect.objectContaining({
        position: 'inside',
      })
    );

    expect(
      masterFolderTreeUndoEntrySchema.parse({
        label: 'Undo move',
        createdAt: 1,
        nodes: [rootNode, childNode],
        selectedNodeId: 'file-1',
        expandedNodeIds: ['root-1'],
      })
    ).toEqual(
      expect.objectContaining({
        label: 'Undo move',
      })
    );

    expect(
      masterFolderTreeErrorSchema.parse({
        code: 'TREE_CONFLICT',
        message: 'Conflict while moving node',
        operationType: 'move',
        at: iso,
        cause: { reason: 'stale_version' },
      })
    ).toEqual(
      expect.objectContaining({
        code: 'TREE_CONFLICT',
      })
    );

    expect(
      masterFolderTreePersistContextSchema.parse({
        previousNodes: [rootNode],
        nextNodes: [rootNode, childNode],
      })
    ).toEqual(
      expect.objectContaining({
        nextNodes: [rootNode, childNode],
      })
    );

    expect(masterFolderTreeActionResultSchema.parse({ ok: true })).toEqual({ ok: true });
    expect(masterFolderTreeActionResultSchema.parse({ ok: false, code: 'invalid' })).toEqual({
      ok: false,
      code: 'invalid',
    });

    expect(
      useMasterFolderTreeOptionsSchema.parse({
        instanceId: 'tree-1',
        initialNodes: [rootNode, childNode],
        initialSelectedNodeId: 'file-1',
        initiallyExpandedNodeIds: ['root-1'],
        maxUndoEntries: 20,
        externalRevision: 4,
      })
    ).toEqual(
      expect.objectContaining({
        instanceId: 'tree-1',
        maxUndoEntries: 20,
      })
    );
  });

  it('parses semantic grammar documents for both canvas and subgraph exports', () => {
    const semanticNode = {
      id: 'node-1',
      type: 'trigger',
      title: 'Trigger',
      description: 'Starts the path',
      position: { x: 10, y: 20 },
      inputs: [],
      outputs: ['result'],
      createdAt: iso,
      updatedAt: null,
    };
    const semanticEdge = {
      id: 'edge-1',
      fromNodeId: 'node-1',
      toNodeId: 'node-2',
      fromPort: 'result',
      toPort: 'input',
      label: 'next',
    };

    expect(
      canvasSemanticDocumentSchema.parse({
        specVersion: 'ai-paths.semantic-grammar.v1',
        kind: 'canvas',
        path: {
          id: 'path-1',
          version: 3,
          name: 'Semantic flow',
          description: 'Exported canvas',
          trigger: 'manual',
          updatedAt: iso,
          strictFlowMode: true,
          isActive: true,
        },
        nodes: [semanticNode, { ...semanticNode, id: 'node-2', type: 'function' }],
        edges: [semanticEdge],
        provenance: {
          source: 'ai-paths',
          exportedAt: iso,
          exporterVersion: '1.0.0',
        },
      })
    ).toEqual(
      expect.objectContaining({
        kind: 'canvas',
      })
    );

    expect(
      semanticDocumentSchema.parse({
        specVersion: 'ai-paths.semantic-grammar.v1',
        kind: 'subgraph',
        pathId: 'path-1',
        selectedNodeIds: ['node-1'],
        nodes: [semanticNode],
        edges: [],
        boundary: {
          incoming: [],
          outgoing: [
            {
              edgeId: 'edge-1',
              fromNodeId: 'node-1',
              fromPort: 'result',
              toNodeId: 'external',
              toPort: 'input',
            },
          ],
        },
        provenance: {
          source: 'ai-paths',
          exportedAt: iso,
          workspace: 'default',
        },
      })
    ).toEqual(
      expect.objectContaining({
        kind: 'subgraph',
      })
    );

    expect(
      subgraphSemanticDocumentSchema.parse({
        specVersion: 'ai-paths.semantic-grammar.v1',
        kind: 'subgraph',
        selectedNodeIds: ['node-1'],
        nodes: [semanticNode],
        edges: [],
        boundary: {
          incoming: [],
          outgoing: [],
        },
      })
    ).toEqual(
      expect.objectContaining({
        selectedNodeIds: ['node-1'],
      })
    );
  });

  it('parses case resolver workspace, graph, and settings contracts', () => {
    expect(
      caseResolverDocumentDateProposalSchema.parse({
        isoDate: '2026-03-20',
        source: 'metadata',
        sourceLine: null,
        cityHint: 'Warsaw',
        city: 'Warsaw',
        action: 'useDetectedDate',
      })
    ).toEqual(
      expect.objectContaining({
        city: 'Warsaw',
      })
    );

    expect(
      caseResolverGraphSchema.parse({
        nodes: [aiNode],
        edges: [
          {
            id: 'edge-1',
            source: 'node-1',
            target: 'node-2',
            label: 'context',
          },
        ],
        nodeMeta: {
          'node-1': {
            role: 'text_note',
            includeInOutput: true,
          },
        },
        edgeMeta: {
          'edge-1': {
            joinMode: 'newline',
          },
        },
        pdfExtractionPresetId: 'plain_text',
      })
    ).toEqual(
      expect.objectContaining({
        nodes: [expect.objectContaining({ id: 'node-1' })],
      })
    );

    expect(
      caseResolverWorkspaceSchema.parse({
        id: 'workspace-1',
        name: 'Case workspace',
        ownerId: 'user-1',
        isPublic: false,
        version: 2,
        activeFileId: 'file-1',
        files: [
          {
            id: 'file-1',
            workspaceId: 'workspace-1',
            name: 'Initial brief',
            fileType: 'document',
            documentContent: 'Brief content',
            version: 1,
            scanSlots: [],
            documentContentVersion: 1,
            documentContentPlainText: 'Brief content',
            documentContentHtml: '<p>Brief content</p>',
            documentContentMarkdown: 'Brief content',
            documentDate: {
              isoDate: '2026-03-20',
              source: 'text',
              sourceLine: '20.03.2026',
              cityHint: null,
              city: null,
              action: 'keepText',
            },
            createdAt: iso,
            updatedAt: iso,
          },
        ],
        assets: [
          {
            id: 'asset-1',
            workspaceId: 'workspace-1',
            folderId: null,
            name: 'Attachment',
            kind: 'document',
            size: 12,
            createdAt: iso,
            updatedAt: iso,
          },
        ],
        folders: ['Inbox'],
        folderRecords: [
          {
            id: 'folder-1',
            workspaceId: 'workspace-1',
            parentId: null,
            name: 'Inbox',
            path: '/Inbox',
            createdAt: iso,
            updatedAt: iso,
          },
        ],
        folderTimestamps: {
          Inbox: {
            createdAt: iso,
            updatedAt: iso,
          },
        },
        workspaceRevision: 7,
        lastMutationId: 'mutation-1',
        lastMutationAt: iso,
        settings: {
          sortBy: 'updated',
        },
      })
    ).toEqual(
      expect.objectContaining({
        ownerId: 'user-1',
        files: [expect.objectContaining({ id: 'file-1' })],
      })
    );

    expect(
      caseResolverEditorNodeContextSchema.parse({
        workspaceId: 'workspace-1',
        fileId: 'file-1',
        nodeId: 'node-1',
        mode: 'wysiwyg',
      })
    ).toEqual(
      expect.objectContaining({
        mode: 'wysiwyg',
      })
    );

    expect(
      caseResolverCanvasEdgeSchema.parse({
        id: 'edge-1',
        source: 'node-1',
        target: 'node-2',
        data: { joinMode: 'space' },
      })
    ).toEqual(
      expect.objectContaining({
        data: { joinMode: 'space' },
      })
    );

    expect(
      caseResolverSettingsSchema.parse({
        ocrModel: 'gpt-4.1-mini',
        ocrPrompt: 'Extract all text',
        defaultDocumentFormat: 'wysiwyg',
        confirmDeleteDocument: true,
        defaultAddresserPartyKind: 'organization',
        defaultAddresseePartyKind: 'person',
      })
    ).toEqual(
      expect.objectContaining({
        defaultDocumentFormat: 'wysiwyg',
      })
    );
  });
});
