import { describe, expect, it } from 'vitest';

import {
  buildCaseResolverNodeFileRelationIndexFromAssets,
  buildCaseResolverNodeFileRelationIndex,
  sanitizeCaseResolverNodeFileAssetSnapshots,
  sanitizeCaseResolverGraphNodeFileRelations,
} from '@/features/case-resolver/nodefile-relations';
import { createCaseResolverAssetFile, createCaseResolverFile } from '@/features/case-resolver/settings';
import type { AiNode, CaseResolverGraph } from '@/shared/contracts/case-resolver';

const createPromptNode = (id: string): AiNode => ({
  id,
  type: 'prompt',
  title: id,
  description: '',
  inputs: ['input'],
  outputs: ['output'],
  position: { x: 0, y: 0 },
  config: { prompt: { template: '' } },
});

const createGraph = (input: {
  nodeIds: string[];
  documentSourceFileIdByNode?: Record<string, string>;
  nodeFileAssetIdByNode?: Record<string, string>;
}): CaseResolverGraph => ({
  nodes: input.nodeIds.map((nodeId: string): AiNode => createPromptNode(nodeId)),
  edges: [],
  nodeMeta: {},
  edgeMeta: {},
  pdfExtractionPresetId: 'plain_text',
  documentFileLinksByNode: {},
  documentDropNodeId: null,
  documentSourceFileIdByNode: input.documentSourceFileIdByNode ?? {},
  nodeFileAssetIdByNode: input.nodeFileAssetIdByNode ?? {},
});

describe('case-resolver nodefile relations', () => {
  it('builds document-to-nodefile relation indexes from valid graph mappings', () => {
    const files = [
      createCaseResolverFile({ id: 'case-a', fileType: 'case', name: 'Case A', folder: '' }),
      createCaseResolverFile({ id: 'doc-1', fileType: 'document', name: 'Doc 1', folder: '', parentCaseId: 'case-a' }),
      createCaseResolverFile({ id: 'scan-1', fileType: 'scanfile', name: 'Scan 1', folder: '', parentCaseId: 'case-a' }),
    ];
    const assets = [
      createCaseResolverAssetFile({ id: 'node-asset-1', name: 'Node 1', folder: '', kind: 'node_file' }),
      createCaseResolverAssetFile({ id: 'node-asset-2', name: 'Node 2', folder: '', kind: 'node_file' }),
      createCaseResolverAssetFile({ id: 'img-asset', name: 'Image', folder: '', kind: 'image' }),
    ];
    const graph = createGraph({
      nodeIds: ['n1', 'n2', 'n3'],
      documentSourceFileIdByNode: {
        n1: 'doc-1',
        n2: 'scan-1',
        n3: 'missing-doc',
      },
      nodeFileAssetIdByNode: {
        n1: 'node-asset-1',
        n2: 'missing-node-asset',
        n3: 'node-asset-2',
      },
    });

    const index = buildCaseResolverNodeFileRelationIndex({ graph, assets, files });

    expect(index.nodeIdsByDocumentFileId).toEqual({
      'doc-1': ['n1'],
      'scan-1': ['n2'],
    });
    expect(index.nodeFileAssetIdsByDocumentFileId).toEqual({
      'doc-1': ['node-asset-1'],
    });
    expect(index.documentFileIdsByNodeFileAssetId).toEqual({
      'node-asset-1': ['doc-1'],
    });
    expect(index.nodeIdsByNodeFileAssetId).toEqual({
      'node-asset-1': ['n1'],
      'node-asset-2': ['n3'],
    });
  });

  it('prunes stale document/nodefile graph mappings against existing files/assets/nodes', () => {
    const files = [
      createCaseResolverFile({ id: 'case-a', fileType: 'case', name: 'Case A', folder: '' }),
      createCaseResolverFile({ id: 'doc-1', fileType: 'document', name: 'Doc 1', folder: '', parentCaseId: 'case-a' }),
    ];
    const assets = [
      createCaseResolverAssetFile({
        id: 'node-asset-1',
        name: 'Node 1',
        folder: '',
        kind: 'node_file',
        textContent: JSON.stringify({
          kind: 'case_resolver_node_file_snapshot_v1',
          source: 'manual',
          nodes: [],
          edges: [],
          nodeFileMeta: {
            n1: {
              fileId: 'doc-1',
              fileType: 'document',
              fileName: 'Doc 1',
            },
          },
        }),
      }),
    ];
    const graph = createGraph({
      nodeIds: ['n1'],
      documentSourceFileIdByNode: {
        n1: 'doc-1',
        n2: 'doc-missing',
      },
      nodeFileAssetIdByNode: {
        n1: 'node-asset-1',
        n2: 'node-asset-missing',
      },
    });

    const sanitized = sanitizeCaseResolverGraphNodeFileRelations({ graph, assets, files });

    expect(sanitized.documentSourceFileIdByNode).toEqual({ n1: 'doc-1' });
    expect(sanitized.nodeFileAssetIdByNode).toEqual({ n1: 'node-asset-1' });
  });

  it('returns original graph reference when mappings are already valid', () => {
    const files = [
      createCaseResolverFile({ id: 'case-a', fileType: 'case', name: 'Case A', folder: '' }),
      createCaseResolverFile({ id: 'doc-1', fileType: 'document', name: 'Doc 1', folder: '', parentCaseId: 'case-a' }),
    ];
    const assets = [
      createCaseResolverAssetFile({
        id: 'node-asset-1',
        name: 'Node 1',
        folder: '',
        kind: 'node_file',
        textContent: JSON.stringify({
          kind: 'case_resolver_node_file_snapshot_v1',
          source: 'manual',
          nodes: [],
          edges: [],
          nodeFileMeta: {
            n1: {
              fileId: 'doc-1',
              fileType: 'document',
              fileName: 'Doc 1',
            },
          },
        }),
      }),
    ];
    const graph = createGraph({
      nodeIds: ['n1'],
      documentSourceFileIdByNode: { n1: 'doc-1' },
      nodeFileAssetIdByNode: { n1: 'node-asset-1' },
    });

    const sanitized = sanitizeCaseResolverGraphNodeFileRelations({ graph, assets, files });

    expect(sanitized).toBe(graph);
  });

  it('drops node-file asset mapping when snapshot does not confirm source document relation', () => {
    const files = [
      createCaseResolverFile({ id: 'case-a', fileType: 'case', name: 'Case A', folder: '' }),
      createCaseResolverFile({ id: 'doc-1', fileType: 'document', name: 'Doc 1', folder: '', parentCaseId: 'case-a' }),
      createCaseResolverFile({ id: 'doc-2', fileType: 'document', name: 'Doc 2', folder: '', parentCaseId: 'case-a' }),
    ];
    const assets = [
      createCaseResolverAssetFile({
        id: 'node-asset-1',
        name: 'Node 1',
        folder: '',
        kind: 'node_file',
        textContent: JSON.stringify({
          kind: 'case_resolver_node_file_snapshot_v1',
          source: 'manual',
          nodes: [],
          edges: [],
          nodeFileMeta: {
            'other-node': {
              fileId: 'doc-2',
              fileType: 'document',
              fileName: 'Doc 2',
            },
          },
        }),
      }),
    ];
    const graph = createGraph({
      nodeIds: ['n1'],
      documentSourceFileIdByNode: { n1: 'doc-1' },
      nodeFileAssetIdByNode: { n1: 'node-asset-1' },
    });

    const sanitized = sanitizeCaseResolverGraphNodeFileRelations({ graph, assets, files });

    expect(sanitized.documentSourceFileIdByNode).toEqual({ n1: 'doc-1' });
    expect(sanitized.nodeFileAssetIdByNode).toEqual({});
  });

  it('builds document relations from node-file snapshot assets', () => {
    const files = [
      createCaseResolverFile({ id: 'case-a', fileType: 'case', name: 'Case A', folder: '' }),
      createCaseResolverFile({
        id: 'doc-1',
        fileType: 'document',
        name: 'Doc 1',
        folder: '',
        parentCaseId: 'case-a',
      }),
      createCaseResolverFile({
        id: 'scan-1',
        fileType: 'scanfile',
        name: 'Scan 1',
        folder: '',
        parentCaseId: 'case-a',
      }),
      createCaseResolverFile({
        id: 'doc-legacy',
        fileType: 'document',
        name: 'Legacy Doc',
        folder: '',
        parentCaseId: 'case-a',
      }),
      createCaseResolverFile({
        id: 'canvas-a',
        fileType: 'document',
        name: 'Canvas A',
        folder: '',
        parentCaseId: 'case-a',
        graph: createGraph({
          nodeIds: ['legacy-node'],
          documentSourceFileIdByNode: {
            'legacy-node': 'doc-legacy',
          },
          nodeFileAssetIdByNode: {
            'legacy-node': 'node-asset-legacy',
          },
        }),
      }),
    ];
    const assets = [
      createCaseResolverAssetFile({
        id: 'node-asset-a',
        name: 'Node A',
        folder: '',
        kind: 'node_file',
        textContent: JSON.stringify({
          kind: 'case_resolver_node_file_snapshot_v1',
          source: 'manual',
          nodes: [],
          edges: [],
          nodeFileMeta: {
            'node-1': {
              fileId: 'doc-1',
              fileType: 'document',
              fileName: 'Doc 1',
            },
            'node-2': {
              fileId: 'scan-1',
              fileType: 'scanfile',
              fileName: 'Scan 1',
            },
          },
        }),
      }),
      createCaseResolverAssetFile({
        id: 'node-asset-legacy',
        name: 'Legacy',
        folder: '',
        kind: 'node_file',
        textContent: JSON.stringify({
          kind: 'case_resolver_node_file_snapshot_v1',
          source: 'manual',
          nodeId: 'legacy-node',
          sourceFileId: 'doc-legacy',
          sourceFileType: 'document',
          sourceFileName: 'Legacy Doc',
        }),
      }),
    ];

    const index = buildCaseResolverNodeFileRelationIndexFromAssets({ assets, files });

    expect(index.nodeIdsByDocumentFileId).toEqual({
      'doc-1': ['node-1'],
      'scan-1': ['node-2'],
      'doc-legacy': ['legacy-node'],
    });
    expect(index.nodeFileAssetIdsByDocumentFileId).toEqual({
      'doc-1': ['node-asset-a'],
      'scan-1': ['node-asset-a'],
      'doc-legacy': ['node-asset-legacy'],
    });
    expect(index.documentFileIdsByNodeFileAssetId).toEqual({
      'node-asset-a': ['doc-1', 'scan-1'],
      'node-asset-legacy': ['doc-legacy'],
    });
  });

  it('drops stale legacy snapshot relations when no valid graph binding exists', () => {
    const files = [
      createCaseResolverFile({ id: 'case-a', fileType: 'case', name: 'Case A', folder: '' }),
      createCaseResolverFile({
        id: 'doc-legacy',
        fileType: 'document',
        name: 'Legacy Doc',
        folder: '',
        parentCaseId: 'case-a',
      }),
    ];
    const assets = [
      createCaseResolverAssetFile({
        id: 'node-asset-legacy',
        name: 'Legacy',
        folder: '',
        kind: 'node_file',
        textContent: JSON.stringify({
          kind: 'case_resolver_node_file_snapshot_v1',
          source: 'manual',
          nodeId: 'legacy-node',
          sourceFileId: 'doc-legacy',
          sourceFileType: 'document',
          sourceFileName: 'Legacy Doc',
        }),
      }),
    ];

    const index = buildCaseResolverNodeFileRelationIndexFromAssets({ assets, files });
    expect(index.nodeIdsByDocumentFileId).toEqual({});
    expect(index.nodeFileAssetIdsByDocumentFileId).toEqual({});
    expect(index.documentFileIdsByNodeFileAssetId).toEqual({});
    expect(index.nodeIdsByNodeFileAssetId).toEqual({});
  });

  it('sanitizes stale legacy snapshot bindings into canonical empty nodeFileMeta', () => {
    const files = [
      createCaseResolverFile({ id: 'case-a', fileType: 'case', name: 'Case A', folder: '' }),
      createCaseResolverFile({
        id: 'doc-legacy',
        fileType: 'document',
        name: 'Legacy Doc',
        folder: '',
        parentCaseId: 'case-a',
      }),
    ];
    const assets = [
      createCaseResolverAssetFile({
        id: 'node-asset-legacy',
        name: 'Legacy',
        folder: '',
        kind: 'node_file',
        sourceFileId: 'doc-legacy',
        textContent: JSON.stringify({
          kind: 'case_resolver_node_file_snapshot_v1',
          source: 'manual',
          nodeId: 'legacy-node',
          sourceFileId: 'doc-legacy',
          sourceFileType: 'document',
          sourceFileName: 'Legacy Doc',
        }),
      }),
    ];

    const sanitizedAssets = sanitizeCaseResolverNodeFileAssetSnapshots({ assets, files });
    expect(sanitizedAssets).toHaveLength(1);
    const asset = sanitizedAssets[0];
    expect(asset?.sourceFileId).toBeNull();
    const parsedSnapshot = JSON.parse(asset?.textContent ?? '{}') as {
      nodeFileMeta?: Record<string, unknown>;
    };
    expect(parsedSnapshot.nodeFileMeta ?? {}).toEqual({});
  });

  it('preserves case ownership for manual unbound node-file snapshots', () => {
    const files = [
      createCaseResolverFile({
        id: 'case-a',
        fileType: 'case',
        name: 'Case A',
        folder: '',
      }),
      createCaseResolverFile({
        id: 'doc-a',
        fileType: 'document',
        name: 'Doc A',
        folder: '',
        parentCaseId: 'case-a',
      }),
    ];
    const assets = [
      createCaseResolverAssetFile({
        id: 'node-asset-manual',
        name: 'Manual Node File',
        folder: '',
        kind: 'node_file',
        sourceFileId: 'case-a',
        textContent: JSON.stringify({
          kind: 'case_resolver_node_file_snapshot_v1',
          source: 'manual',
          nodes: [],
          edges: [],
          nodeFileMeta: {},
        }),
      }),
    ];

    const sanitizedAssets = sanitizeCaseResolverNodeFileAssetSnapshots({
      assets,
      files,
    });
    expect(sanitizedAssets).toHaveLength(1);
    const asset = sanitizedAssets[0];
    expect(asset?.sourceFileId).toBe('case-a');
  });

  it('preserves node and edge metadata when sanitizing canonical node-file snapshots', () => {
    const files = [
      createCaseResolverFile({ id: 'case-a', fileType: 'case', name: 'Case A', folder: '' }),
      createCaseResolverFile({
        id: 'doc-a',
        fileType: 'document',
        name: 'Doc A',
        folder: '',
        parentCaseId: 'case-a',
      }),
    ];
    const assets = [
      createCaseResolverAssetFile({
        id: 'node-asset-meta',
        name: 'Node Meta',
        folder: '',
        kind: 'node_file',
        textContent: JSON.stringify({
          kind: 'case_resolver_node_file_snapshot_v1',
          source: 'manual',
          nodes: [createPromptNode('meta-node')],
          edges: [
            {
              id: 'meta-edge',
              from: 'meta-node',
              to: 'meta-node',
              fromPort: 'content',
              toPort: 'content',
            },
          ],
          nodeMeta: {
            'meta-node': {
              role: 'explanatory',
              includeInOutput: true,
              quoteMode: 'none',
              surroundPrefix: '',
              surroundSuffix: '',
            },
          },
          edgeMeta: {
            'meta-edge': {
              joinMode: 'tab',
            },
          },
          nodeFileMeta: {
            'meta-node': {
              fileId: 'doc-a',
              fileType: 'document',
              fileName: 'Doc A',
            },
          },
        }),
      }),
    ];

    const sanitizedAssets = sanitizeCaseResolverNodeFileAssetSnapshots({ assets, files });
    expect(sanitizedAssets).toHaveLength(1);
    const parsedSnapshot = JSON.parse(sanitizedAssets[0]?.textContent ?? '{}') as {
      nodeMeta?: Record<string, unknown>;
      edgeMeta?: Record<string, unknown>;
    };
    expect(parsedSnapshot.nodeMeta).toEqual({
      'meta-node': {
        role: 'explanatory',
        includeInOutput: true,
        quoteMode: 'none',
        surroundPrefix: '',
        surroundSuffix: '',
      },
    });
    expect(parsedSnapshot.edgeMeta).toEqual({
      'meta-edge': {
        joinMode: 'tab',
      },
    });
  });
});
