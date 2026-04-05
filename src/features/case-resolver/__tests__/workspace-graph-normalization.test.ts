import { describe, expect, it } from 'vitest';

import {
  parseCaseResolverWorkspace,
  parseNodeFileSnapshot,
} from '@/features/case-resolver/settings';
import { CASE_RESOLVER_DOCUMENT_NODE_INPUT_PORTS, CASE_RESOLVER_DOCUMENT_NODE_OUTPUT_PORTS, CASE_RESOLVER_EXPLANATORY_NODE_INPUT_PORTS, CASE_RESOLVER_EXPLANATORY_NODE_OUTPUT_PORTS, DEFAULT_CASE_RESOLVER_NODE_META } from '@/shared/contracts/case-resolver/constants';
import { type AiNode, type CaseResolverFile } from '@/shared/contracts/case-resolver';

const createPromptNode = (id: string): AiNode => ({
  id,
  type: 'prompt',
  title: id,
  description: '',
  inputs: ['input'],
  outputs: ['output'],
  position: { x: 0, y: 0 },
  config: { prompt: { template: '' } },
  data: {},
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

const createTemplateNode = (id: string, template: string): AiNode => ({
  ...createPromptNode(id),
  type: 'template',
  config: { template: { template } },
});

const createCanonicalTextPromptNode = (
  id: string,
  role: 'text_note' | 'explanatory' = 'text_note'
): AiNode => ({
  ...createPromptNode(id),
  inputs:
    role === 'explanatory'
      ? [...CASE_RESOLVER_EXPLANATORY_NODE_INPUT_PORTS]
      : [...CASE_RESOLVER_DOCUMENT_NODE_INPUT_PORTS],
  outputs:
    role === 'explanatory'
      ? [...CASE_RESOLVER_EXPLANATORY_NODE_OUTPUT_PORTS]
      : [...CASE_RESOLVER_DOCUMENT_NODE_OUTPUT_PORTS],
});

describe('case-resolver workspace graph normalization', () => {
  it('keeps canonical document ports for linked document prompt nodes', () => {
    const workspace = parseCaseResolverWorkspace(
      JSON.stringify({
        version: 2,
        workspaceRevision: 0,
        lastMutationId: null,
        lastMutationAt: null,
        folders: [],
        files: [
          {
            id: 'case-ports',
            name: 'Case Ports',
            folder: '',
            graph: {
              nodes: [createCanonicalTextPromptNode('doc-node'), createPromptNode('generic-node')],
              edges: [],
              nodeMeta: {},
              edgeMeta: {},
              documentSourceFileIdByNode: {
                'doc-node': 'file-1',
              },
            },
          },
        ],
        assets: [],
        activeFileId: 'case-ports',
      })
    );

    const graph = workspace.files[0]?.graph;
    const docNode = graph?.nodes.find((node: AiNode): boolean => node.id === 'doc-node');
    const genericNode = graph?.nodes.find((node: AiNode): boolean => node.id === 'generic-node');

    expect(docNode?.inputs).toEqual(CASE_RESOLVER_DOCUMENT_NODE_INPUT_PORTS);
    expect(docNode?.outputs).toEqual(CASE_RESOLVER_DOCUMENT_NODE_OUTPUT_PORTS);
    expect(genericNode?.inputs).not.toEqual(
      expect.arrayContaining(CASE_RESOLVER_DOCUMENT_NODE_INPUT_PORTS)
    );
    expect(genericNode?.outputs).not.toEqual(
      expect.arrayContaining(CASE_RESOLVER_DOCUMENT_NODE_OUTPUT_PORTS)
    );
  });

  it('keeps canonical explanatory prompt ports with wysiwygContent lane', () => {
    const workspace = parseCaseResolverWorkspace(
      JSON.stringify({
        version: 2,
        workspaceRevision: 0,
        lastMutationId: null,
        lastMutationAt: null,
        folders: [],
        files: [
          {
            id: 'case-explanatory-ports',
            name: 'Case Explanatory Ports',
            folder: '',
            graph: {
              nodes: [createCanonicalTextPromptNode('explanatory-node', 'explanatory')],
              edges: [],
              nodeMeta: {
                'explanatory-node': {
                  role: 'explanatory',
                  includeInOutput: true,
                  quoteMode: 'none',
                  surroundPrefix: '',
                  surroundSuffix: '',
                },
              },
              edgeMeta: {},
            },
          },
        ],
        assets: [],
        activeFileId: 'case-explanatory-ports',
      })
    );

    const graph = workspace.files[0]?.graph;
    const explanatoryNode = graph?.nodes.find(
      (node: AiNode): boolean => node.id === 'explanatory-node'
    );

    expect(explanatoryNode?.inputs).toEqual(CASE_RESOLVER_EXPLANATORY_NODE_INPUT_PORTS);
    expect(explanatoryNode?.outputs).toEqual(CASE_RESOLVER_EXPLANATORY_NODE_OUTPUT_PORTS);
  });

  it('drops invalid file graphs with non-canonical text node prompt ports', () => {
    const workspace = parseCaseResolverWorkspace(
      JSON.stringify({
        version: 2,
        workspaceRevision: 0,
        lastMutationId: null,
        lastMutationAt: null,
        folders: [],
        files: [
          {
            id: 'case-invalid-text-ports',
            name: 'Case Invalid Text Ports',
            folder: '',
            graph: {
              nodes: [createPromptNode('doc-node')],
              edges: [],
              nodeMeta: {
                'doc-node': {
                  role: 'text_note',
                  includeInOutput: true,
                  quoteMode: 'none',
                  surroundPrefix: '',
                  surroundSuffix: '',
                },
              },
              edgeMeta: {},
            },
          },
        ],
        assets: [],
        activeFileId: 'case-invalid-text-ports',
      })
    );
    expect(workspace.files).toEqual([]);
    expect(workspace.activeFileId).toBeNull();
  });

  it('drops invalid file graphs with template text nodes', () => {
    const workspace = parseCaseResolverWorkspace(
      JSON.stringify({
        version: 2,
        workspaceRevision: 0,
        lastMutationId: null,
        lastMutationAt: null,
        folders: [],
        files: [
          {
            id: 'case-legacy-template',
            name: 'Case Legacy Template',
            folder: '',
            graph: {
              nodes: [createTemplateNode('legacy-doc-node', '<p>Legacy template text</p>')],
              edges: [],
              nodeMeta: {
                'legacy-doc-node': {
                  ...DEFAULT_CASE_RESOLVER_NODE_META,
                  role: 'text_note',
                  includeInOutput: true,
                },
              },
              edgeMeta: {},
            },
          },
        ],
        assets: [],
        activeFileId: 'case-legacy-template',
      })
    );
    expect(workspace.files).toEqual([]);
    expect(workspace.activeFileId).toBeNull();
  });

  it('drops invalid file graphs with template document-drop nodes', () => {
    const workspace = parseCaseResolverWorkspace(
      JSON.stringify({
        version: 2,
        workspaceRevision: 0,
        lastMutationId: null,
        lastMutationAt: null,
        folders: [],
        files: [
          {
            id: 'case-template-drop',
            name: 'Case Template Drop',
            folder: '',
            graph: {
              nodes: [createTemplateNode('legacy-drop-node', 'Legacy Canvas Node File')],
              edges: [],
              nodeMeta: {},
              edgeMeta: {},
              documentDropNodeId: 'legacy-drop-node',
            },
          },
        ],
        assets: [],
        activeFileId: 'case-template-drop',
      })
    );
    expect(workspace.files).toEqual([]);
    expect(workspace.activeFileId).toBeNull();
  });

  it('drops invalid file graphs with template document-link nodes', () => {
    const workspace = parseCaseResolverWorkspace(
      JSON.stringify({
        version: 2,
        workspaceRevision: 0,
        lastMutationId: null,
        lastMutationAt: null,
        folders: [],
        files: [
          {
            id: 'case-template-links',
            name: 'Case Template Links',
            folder: '',
            graph: {
              nodes: [createTemplateNode('legacy-link-node', 'Legacy linked docs node')],
              edges: [],
              nodeMeta: {},
              edgeMeta: {},
              documentFileLinksByNode: {
                'legacy-link-node': ['doc-a'],
              },
            },
          },
          {
            id: 'doc-a',
            fileType: 'document',
            name: 'Doc A',
            folder: '',
            parentCaseId: 'case-template-links',
            graph: {
              nodes: [],
              edges: [],
              nodeMeta: {},
              edgeMeta: {},
            },
          },
        ],
        assets: [],
        activeFileId: 'case-template-links',
      })
    );
    expect(workspace.files[0]?.graph.nodes).toEqual([]);
    expect(workspace.files[0]?.graph.edges).toEqual([]);
  });

  it('drops stale document/nodefile graph mappings that reference missing files or assets', () => {
    const workspace = parseCaseResolverWorkspace(
      JSON.stringify({
        version: 2,
        workspaceRevision: 0,
        lastMutationId: null,
        lastMutationAt: null,
        folders: [],
        files: [
          {
            id: 'case-node-map',
            fileType: 'case',
            name: 'Case Node Map',
            folder: '',
            graph: {
              nodes: [],
              edges: [],
              nodeMeta: {},
              edgeMeta: {},
            },
          },
          {
            id: 'doc-valid',
            fileType: 'document',
            name: 'Valid Document',
            folder: '',
            parentCaseId: 'case-node-map',
            graph: {
              nodes: [
                createCanonicalTextPromptNode('node-valid'),
                createCanonicalTextPromptNode('node-stale'),
              ],
              edges: [],
              nodeMeta: {},
              edgeMeta: {},
              documentSourceFileIdByNode: {
                'node-valid': 'doc-valid',
                'node-stale': 'doc-missing',
              },
              nodeFileAssetIdByNode: {
                'node-valid': 'node-file-valid',
                'node-stale': 'node-file-missing',
              },
            },
          },
        ],
        assets: [
          {
            id: 'node-file-valid',
            name: 'Node File',
            folder: '',
            kind: 'node_file',
          },
        ],
        activeFileId: 'doc-valid',
      })
    );

    const graph = workspace.files.find((file: CaseResolverFile) => file.id === 'doc-valid')?.graph;
    expect(graph?.documentSourceFileIdByNode).toEqual({
      'node-valid': 'doc-valid',
    });
    expect(graph?.nodeFileAssetIdByNode).toEqual({
      'node-valid': 'node-file-valid',
    });
  });

  it('parses node-file snapshots with node and edge metadata', () => {
    const snapshot = parseNodeFileSnapshot(
      JSON.stringify({
        kind: 'case_resolver_node_file_snapshot_v2',
        source: 'manual',
        nodes: [createPromptNode('meta-node')],
        edges: [
          {
            id: 'meta-edge',
            source: 'meta-node',
            target: 'meta-node',
            sourceHandle: 'plaintextContent',
            targetHandle: 'plaintextContent',
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
            fileId: 'doc-meta',
            fileType: 'document',
            fileName: 'Doc Meta',
          },
        },
      })
    );

    expect(snapshot.nodeMeta).toEqual({
      'meta-node': {
        role: 'explanatory',
        includeInOutput: true,
        quoteMode: 'none',
        surroundPrefix: '',
        surroundSuffix: '',
      },
    });
    expect(snapshot.edgeMeta).toEqual({
      'meta-edge': {
        joinMode: 'tab',
      },
    });
  });

  it('returns isolated empty node-file snapshots per parse call', () => {
    const first = parseNodeFileSnapshot('');
    const second = parseNodeFileSnapshot('');

    first.nodes.push(createPromptNode('mutated-node'));
    first.nodeFileMeta['mutated-node'] = {
      fileId: 'doc-mutated',
      fileType: 'document',
      fileName: 'Mutated',
    };
    first.nodeMeta!['mutated-node'] = {
      role: 'text_note',
      includeInOutput: true,
      quoteMode: 'none',
      surroundPrefix: '',
      surroundSuffix: '',
    };
    first.edgeMeta!['mutated-edge'] = { joinMode: 'space' };

    expect(second.nodes).toEqual([]);
    expect(second.edges).toEqual([]);
    expect(second.nodeFileMeta).toEqual({});
    expect(second.nodeMeta).toEqual({});
    expect(second.edgeMeta).toEqual({});
  });

  it('rejects legacy node-file snapshots with single-node payload shape', () => {
    expect(() =>
      parseNodeFileSnapshot(
        JSON.stringify({
          kind: 'case_resolver_node_file_snapshot_v2',
          source: 'manual',
          nodeId: 'legacy-node',
          sourceFileId: 'doc-legacy',
          sourceFileName: 'Legacy Document',
          sourceFileType: 'scanfile',
          node: createPromptNode('legacy-node'),
          connectedEdges: [
            {
              id: 'edge-legacy',
              source: 'legacy-node',
              target: 'legacy-node',
              sourceHandle: 'output',
              targetHandle: 'input',
            },
          ],
        })
      )
    ).toThrowError(/Case Resolver node-file snapshot payload includes unsupported fields\./i);
  });

  it('rejects legacy node-file edge keys and ports', () => {
    expect(() =>
      parseNodeFileSnapshot(
        JSON.stringify({
          kind: 'case_resolver_node_file_snapshot_v2',
          source: 'manual',
          nodes: [createPromptNode('legacy-node-a'), createPromptNode('legacy-node-b')],
          edges: [
            {
              id: 'legacy-edge',
              from: 'legacy-node-a',
              to: 'legacy-node-b',
              fromPort: 'textfield',
              toPort: 'content',
            },
          ],
          nodeMeta: {},
          edgeMeta: {},
          nodeFileMeta: {},
        })
      )
    ).toThrowError(/Case Resolver edge payload includes unsupported fields\./i);
  });

  it('does not coerce inline node-file snapshots when loading the workspace', () => {
    const workspace = parseCaseResolverWorkspace(
      JSON.stringify({
        version: 2,
        workspaceRevision: 0,
        lastMutationId: null,
        lastMutationAt: null,
        folders: [],
        files: [
          {
            id: 'case-a',
            fileType: 'case',
            name: 'Case A',
            folder: '',
            graph: {
              nodes: [],
              edges: [],
              nodeMeta: {},
              edgeMeta: {},
            },
          },
          {
            id: 'doc-legacy',
            fileType: 'document',
            name: 'Legacy Document',
            folder: '',
            parentCaseId: 'case-a',
            graph: {
              nodes: [createPromptNode('legacy-node')],
              edges: [],
              nodeMeta: {},
              edgeMeta: {},
              documentSourceFileIdByNode: {
                'legacy-node': 'doc-legacy',
              },
              nodeFileAssetIdByNode: {
                'legacy-node': 'node-file-legacy',
              },
            },
          },
        ],
        assets: [
          {
            id: 'node-file-legacy',
            name: 'Legacy Node File',
            folder: '',
            kind: 'node_file',
            sourceFileId: 'doc-legacy',
            textContent: JSON.stringify({
              kind: 'case_resolver_node_file_snapshot_v2',
              source: 'manual',
              nodeId: 'legacy-node',
              sourceFileId: 'doc-legacy',
              sourceFileType: 'document',
              sourceFileName: 'Legacy Document',
            }),
          },
        ],
        activeFileId: 'doc-legacy',
      })
    );
    expect(workspace.assets[0]?.textContent).toContain('case_resolver_node_file_snapshot_v2');
    expect(workspace.assets[0]?.metadata?.nodeFileSnapshotStorage).toBeUndefined();
    const legacyDocumentGraph = workspace.files.find((file) => file.id === 'doc-legacy')?.graph;
    expect(legacyDocumentGraph?.nodeFileAssetIdByNode ?? {}).toEqual({});
  });

  it('drops legacy graph edges during workspace normalization', () => {
    const workspace = parseCaseResolverWorkspace(
      JSON.stringify({
        version: 2,
        workspaceRevision: 0,
        folders: [],
        files: [
          {
            id: 'case-legacy-edge',
            fileType: 'case',
            name: 'Case Legacy Edge',
            folder: '',
            graph: {
              nodes: [createPromptNode('node-a'), createPromptNode('node-b')],
              edges: [
                {
                  id: 'edge-legacy',
                  from: 'node-a',
                  to: 'node-b',
                  fromPort: 'textfield',
                  toPort: 'content',
                },
              ],
              nodeMeta: {},
              edgeMeta: {},
            },
          },
        ],
        assets: [],
        activeFileId: 'case-legacy-edge',
      })
    );
    expect(workspace.files[0]?.graph.edges).toHaveLength(0);
  });

  it('drops legacy edge port names during workspace normalization', () => {
    const workspace = parseCaseResolverWorkspace(
      JSON.stringify({
        version: 2,
        workspaceRevision: 0,
        folders: [],
        files: [
          {
            id: 'case-edge-ports',
            fileType: 'case',
            name: 'Case Edge Ports',
            folder: '',
            graph: {
              nodes: [
                createCanonicalTextPromptNode('node-a', 'text_note'),
                createCanonicalTextPromptNode('node-b', 'text_note'),
              ],
              edges: [
                {
                  id: 'edge-legacy',
                  source: 'node-a',
                  target: 'node-b',
                  sourceHandle: 'output',
                  targetHandle: 'textfield',
                },
              ],
              nodeMeta: {
                'node-a': {
                  ...DEFAULT_CASE_RESOLVER_NODE_META,
                  role: 'text_note',
                },
                'node-b': {
                  ...DEFAULT_CASE_RESOLVER_NODE_META,
                  role: 'text_note',
                },
              },
              edgeMeta: {},
            },
          },
        ],
        assets: [],
        activeFileId: 'case-edge-ports',
      })
    );
    expect(workspace.files[0]?.graph.edges).toHaveLength(0);
  });
});
