import { describe, expect, it } from 'vitest';

import {
  projectCaseOnlyRelationGraph,
  readRelationEdgeMetaMap,
  readRelationNodeMetaMap,
  readWorkspaceSnapshot,
  resolveFocusedCaseId,
  toRuntimeNodes,
  toStrictEdges,
} from './CaseResolverRelationsWorkspace.helpers';

describe('CaseResolverRelationsWorkspace helpers', () => {
  it('prefers the active file id when resolving focused case id', () => {
    expect(resolveFocusedCaseId(' file-1 ', 'case-2')).toBe('file-1');
    expect(resolveFocusedCaseId('   ', ' case-2 ')).toBe('case-2');
    expect(resolveFocusedCaseId(null, '   ')).toBeNull();
  });

  it('normalizes workspace snapshot records and drops invalid entries', () => {
    expect(
      readWorkspaceSnapshot({
        relationGraph: { nodes: [] },
        folders: ['a', 2, 'b'],
        files: [
          { id: 'file-1', name: 'Case', fileType: 'case', folder: '' },
          { id: 2 },
        ],
        assets: [
          { id: 'asset-1', name: 'Asset', folder: '', kind: 'image' },
          null,
        ],
      })
    ).toEqual({
      relationGraphSource: { nodes: [] },
      folders: ['a', 'b'],
      files: [{ id: 'file-1', name: 'Case', fileType: 'case', folder: '' }],
      assets: [{ id: 'asset-1', name: 'Asset', folder: '', kind: 'image' }],
    });
  });

  it('normalizes relation graph nodes with fallback types, ports, and coordinates', () => {
    expect(
      toRuntimeNodes([
        {
          id: ' node-1 ',
          title: 'Node',
          description: 'Description',
          type: 'unknown',
          position: { x: 12, y: Number.NaN },
          inputs: ['input-a', '', 2],
          outputs: [],
          data: { alpha: true },
          config: { beta: true },
          createdAt: '2025-01-01T00:00:00.000Z',
        },
        {
          id: '',
        },
      ] as never)
    ).toEqual([
      {
        id: 'node-1',
        title: 'Node',
        description: 'Description',
        type: 'template',
        position: { x: 12, y: 0 },
        inputs: ['input-a'],
        outputs: ['out'],
        data: { alpha: true },
        config: { beta: true },
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
      },
    ]);
  });

  it('canonicalizes strict edges and preserves canonical endpoint metadata', () => {
    expect(
      toStrictEdges([
        {
          id: 'edge-1',
          source: 'node-a',
          target: 'node-b',
          sourceHandle: 'out',
          targetHandle: 'in',
          label: 'rel',
        },
      ] as never)
    ).toEqual([
      {
        id: 'edge-1',
        source: 'node-a',
        target: 'node-b',
        sourceHandle: 'out',
        targetHandle: 'in',
        label: 'rel',
      },
    ]);
  });

  it('projects relation graphs down to case-only nodes, edges, and metadata', () => {
    const graph = projectCaseOnlyRelationGraph({
      nodes: [
        { id: 'case:1', title: 'Case 1' },
        { id: 'doc:1', title: 'Doc 1' },
        { id: 'case:2', title: 'Case 2' },
      ],
      edges: [
        { id: 'edge-case', source: 'case:1', target: 'case:2' },
        { id: 'edge-doc', source: 'case:1', target: 'doc:1' },
      ],
      nodeMeta: {
        'case:1': { entityType: 'case' },
        'doc:1': { entityType: 'document' },
        'case:2': { entityType: 'case' },
      },
      edgeMeta: {
        'edge-case': { relationType: 'linked' },
        'edge-doc': { relationType: 'attachment' },
      },
    } as never);

    expect(graph.nodes).toEqual([
      { id: 'case:1', title: 'Case 1' },
      { id: 'case:2', title: 'Case 2' },
    ]);
    expect(graph.edges).toEqual([{ id: 'edge-case', source: 'case:1', target: 'case:2' }]);
    expect(readRelationNodeMetaMap(graph)).toEqual({
      'case:1': { entityType: 'case' },
      'case:2': { entityType: 'case' },
    });
    expect(readRelationEdgeMetaMap(graph)).toEqual({
      'edge-case': { relationType: 'linked' },
    });
  });
});
