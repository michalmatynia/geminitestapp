import { describe, expect, it } from 'vitest';

import {
  buildCaseResolverNodeFileRelationIndexFromAssets,
  buildCaseResolverNodeFileRelationIndex,
  sanitizeCaseResolverNodeFileAssetSnapshots,
  sanitizeCaseResolverGraphNodeFileRelations,
} from '@/features/case-resolver/nodefile-relations';
import {
  createCaseResolverAssetFile,
  createCaseResolverFile,
} from '@/features/case-resolver/settings';
import {
  CASE_RESOLVER_DOCUMENT_NODE_INPUT_PORTS,
  CASE_RESOLVER_DOCUMENT_NODE_OUTPUT_PORTS,
  type AiNode,
  type CaseResolverGraph,
} from '@/shared/contracts/case-resolver';

const createPromptNode = (id: string): AiNode => ({
  id,
  type: 'prompt',
  title: id,
  description: '',
  inputs: [...CASE_RESOLVER_DOCUMENT_NODE_INPUT_PORTS],
  outputs: [...CASE_RESOLVER_DOCUMENT_NODE_OUTPUT_PORTS],
  position: { x: 0, y: 0 },
  config: { prompt: { template: '' } },
  data: {},
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
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
    ];
    const assets = [
      createCaseResolverAssetFile({
        id: 'node-asset-1',
        name: 'Node 1',
        folder: '',
        kind: 'node_file',
      }),
      createCaseResolverAssetFile({
        id: 'node-asset-2',
        name: 'Node 2',
        folder: '',
        kind: 'node_file',
      }),
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
      createCaseResolverFile({
        id: 'doc-1',
        fileType: 'document',
        name: 'Doc 1',
        folder: '',
        parentCaseId: 'case-a',
      }),
    ];
    const assets = [
      createCaseResolverAssetFile({
        id: 'node-asset-1',
        name: 'Node 1',
        folder: '',
        kind: 'node_file',
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
      createCaseResolverFile({
        id: 'doc-1',
        fileType: 'document',
        name: 'Doc 1',
        folder: '',
        parentCaseId: 'case-a',
      }),
    ];
    const assets = [
      createCaseResolverAssetFile({
        id: 'node-asset-1',
        name: 'Node 1',
        folder: '',
        kind: 'node_file',
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

  it('builds document relations from canonical graph mappings across files', () => {
    const files = [
      createCaseResolverFile({ id: 'case-a', fileType: 'case', name: 'Case A', folder: '' }),
      createCaseResolverFile({
        id: 'doc-1',
        fileType: 'document',
        name: 'Doc 1',
        folder: '',
        parentCaseId: 'case-a',
        graph: createGraph({
          nodeIds: ['node-1', 'node-2'],
          documentSourceFileIdByNode: {
            'node-1': 'doc-1',
            'node-2': 'scan-1',
          },
          nodeFileAssetIdByNode: {
            'node-1': 'node-asset-a',
            'node-2': 'node-asset-a',
          },
        }),
      }),
      createCaseResolverFile({
        id: 'scan-1',
        fileType: 'scanfile',
        name: 'Scan 1',
        folder: '',
        parentCaseId: 'case-a',
      }),
    ];
    const assets = [
      createCaseResolverAssetFile({
        id: 'node-asset-a',
        name: 'Node A',
        folder: '',
        kind: 'node_file',
      }),
    ];

    const index = buildCaseResolverNodeFileRelationIndexFromAssets({ assets, files });

    expect(index.nodeIdsByDocumentFileId).toEqual({
      'doc-1': ['node-1'],
      'scan-1': ['node-2'],
    });
    expect(index.nodeFileAssetIdsByDocumentFileId).toEqual({
      'doc-1': ['node-asset-a'],
      'scan-1': ['node-asset-a'],
    });
    expect(index.documentFileIdsByNodeFileAssetId).toEqual({
      'node-asset-a': ['doc-1', 'scan-1'],
    });
  });

  it('returns an empty relation index when no files are provided', () => {
    const assets = [
      createCaseResolverAssetFile({
        id: 'node-asset-a',
        name: 'Node A',
        folder: '',
        kind: 'node_file',
      }),
    ];
    const index = buildCaseResolverNodeFileRelationIndexFromAssets({ assets, files: null });
    expect(index).toEqual({
      nodeIdsByDocumentFileId: {},
      nodeFileAssetIdsByDocumentFileId: {},
      documentFileIdsByNodeFileAssetId: {},
      nodeIdsByNodeFileAssetId: {},
    });
  });

  it('rejects inline snapshot payloads in relation/sanitizer pipelines', () => {
    const files = [
      createCaseResolverFile({ id: 'case-a', fileType: 'case', name: 'Case A', folder: '' }),
      createCaseResolverFile({
        id: 'doc-1',
        fileType: 'document',
        name: 'Doc 1',
        folder: '',
        parentCaseId: 'case-a',
      }),
    ];
    const assets = [
      createCaseResolverAssetFile({
        id: 'node-asset-inline',
        name: 'Inline Node File',
        folder: '',
        kind: 'node_file',
        textContent: '{"kind":"case_resolver_node_file_snapshot_v1","nodes":[]}',
      }),
    ];
    const graph = createGraph({
      nodeIds: ['n1'],
      documentSourceFileIdByNode: { n1: 'doc-1' },
      nodeFileAssetIdByNode: { n1: 'node-asset-inline' },
    });

    const index = buildCaseResolverNodeFileRelationIndexFromAssets({ assets, files });
    const sanitizedGraph = sanitizeCaseResolverGraphNodeFileRelations({ graph, assets, files });

    expect(index).toEqual({
      nodeIdsByDocumentFileId: {},
      nodeFileAssetIdsByDocumentFileId: {},
      documentFileIdsByNodeFileAssetId: {},
      nodeIdsByNodeFileAssetId: {},
    });
    expect(() => sanitizeCaseResolverNodeFileAssetSnapshots({ assets, files })).toThrow(
      'Inline Case Resolver node-file snapshots are no longer supported.'
    );
    expect(sanitizedGraph).toBe(graph);
  });
});
