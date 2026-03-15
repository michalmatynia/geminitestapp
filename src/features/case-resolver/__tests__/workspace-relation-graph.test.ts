import { describe, expect, it } from 'vitest';

import { parseCaseResolverWorkspace } from '@/features/case-resolver/settings';
import { type AiNode, type CaseResolverEdge } from '@/shared/contracts/case-resolver';

describe('case-resolver workspace relation graph normalization', () => {
  it('drops legacy relation graph edge keys during workspace parse', () => {
    const raw = JSON.stringify({
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
          parentCaseId: null,
          referenceCaseIds: [],
          graph: { nodes: [], edges: [], nodeMeta: {}, edgeMeta: {} },
        },
      ],
      assets: [],
      relationGraph: {
        nodes: [
          {
            id: 'case:case-a',
            type: 'template',
            title: 'Case: Case A',
            description: '',
            inputs: ['in'],
            outputs: ['out'],
            position: { x: 120, y: 120 },
          },
          {
            id: 'custom-link',
            type: 'template',
            title: 'Custom Link',
            description: '',
            inputs: ['in'],
            outputs: ['out'],
            position: { x: 420, y: 120 },
          },
        ],
        edges: [
          {
            id: 'legacy-edge',
            from: 'case:case-a',
            to: 'custom-link',
            fromPort: 'out',
            toPort: 'in',
          },
        ],
        nodeMeta: {},
        edgeMeta: {},
      },
      activeFileId: 'case-a',
    });

    const workspace = parseCaseResolverWorkspace(raw);
    expect(
      workspace.relationGraph.edges.some((edge: CaseResolverEdge): boolean => edge.id === 'legacy-edge')
    ).toBe(false);
  });

  it('synchronizes relation graph structure and preserves custom links', () => {
    const raw = JSON.stringify({
      version: 2,
      workspaceRevision: 0,
      lastMutationId: null,
      lastMutationAt: null,
      folders: ['Root/Sub'],
      files: [
        {
          id: 'case-a',
          fileType: 'case',
          name: 'Case A',
          folder: 'Root',
          parentCaseId: null,
          referenceCaseIds: ['case-b'],
          graph: { nodes: [], edges: [], nodeMeta: {}, edgeMeta: {} },
        },
        {
          id: 'case-b',
          fileType: 'case',
          name: 'Case B',
          folder: 'Root/Sub',
          parentCaseId: 'case-a',
          referenceCaseIds: [],
          graph: { nodes: [], edges: [], nodeMeta: {}, edgeMeta: {} },
        },
      ],
      assets: [
        {
          id: 'asset-1',
          name: 'Attachment.txt',
          folder: 'Root/Sub',
          kind: 'file',
        },
      ],
      relationGraph: {
        nodes: [
          {
            id: 'case:case-a',
            type: 'template',
            title: 'Case: Case A',
            description: '',
            inputs: ['in'],
            outputs: ['out'],
            position: { x: 2222, y: 1111 },
          },
          {
            id: 'custom-link',
            type: 'template',
            title: 'Custom Link',
            description: '',
            inputs: ['in'],
            outputs: ['out'],
            position: { x: 1600, y: 380 },
          },
        ],
        edges: [
          {
            id: 'custom-edge',
            source: 'case:case-a',
            target: 'custom-link',
            sourceHandle: 'out',
            targetHandle: 'in',
            label: 'cross',
          },
        ],
        nodeMeta: {
          'custom-link': {
            entityType: 'custom',
            entityId: 'custom-link',
            label: 'Custom Link',
            fileKind: null,
            folderPath: null,
            sourceFileId: null,
            isStructural: false,
            createdAt: '2025-01-01T10:00:00.000Z',
            updatedAt: '2025-01-01T10:00:00.000Z',
          },
        },
        edgeMeta: {
          'custom-edge': {
            relationType: 'custom',
            label: 'cross',
            isStructural: false,
            createdAt: '2025-01-01T10:00:00.000Z',
            updatedAt: '2025-01-01T10:00:00.000Z',
          },
        },
      },
      activeFileId: 'case-a',
    });

    const workspace = parseCaseResolverWorkspace(raw);
    const relationGraph = workspace.relationGraph;

    expect(relationGraph.nodes.some((node: AiNode): boolean => node.id === 'case:case-a')).toBe(
      true
    );
    expect(relationGraph.nodes.some((node: AiNode): boolean => node.id === 'case:case-b')).toBe(
      true
    );
    expect(
      relationGraph.nodes.some((node: AiNode): boolean => node.id === 'file:case:case-a')
    ).toBe(false);
    expect(
      relationGraph.nodes.some((node: AiNode): boolean => node.id === 'file:asset:asset-1')
    ).toBe(true);
    expect(relationGraph.nodes.some((node: AiNode): boolean => node.id === 'custom-link')).toBe(
      true
    );

    const preservedCaseNode = relationGraph.nodes.find(
      (node: AiNode): boolean => node.id === 'case:case-a'
    );
    expect(preservedCaseNode?.position).toEqual({ x: 2222, y: 1111 });

    expect(
      relationGraph.edges.some(
        (edge: CaseResolverEdge): boolean =>
          edge.source === 'case:case-a' &&
          edge.target === 'case:case-b' &&
          relationGraph.edgeMeta?.[edge.id]?.relationType === 'parent_case'
      )
    ).toBe(true);
    expect(
      relationGraph.edges.some(
        (edge: CaseResolverEdge): boolean =>
          edge.source === 'case:case-a' &&
          edge.target === 'case:case-b' &&
          relationGraph.edgeMeta?.[edge.id]?.relationType === 'references'
      )
    ).toBe(true);

    expect(relationGraph.edges.some((edge: CaseResolverEdge): boolean => edge.id === 'custom-edge')).toBe(true);
    expect(relationGraph.edgeMeta?.['custom-edge']?.relationType).toBe('custom');

    expect(relationGraph.edgeMeta!['custom-edge']?.isStructural).toBe(false);
    expect(relationGraph.edgeMeta!['custom-edge']?.label).toBe('cross');
  });
  it('drops invalid relation graph payloads instead of blocking workspace parse', () => {
    const raw = JSON.stringify({
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
          parentCaseId: null,
          referenceCaseIds: [],
          graph: { nodes: [], edges: [], nodeMeta: {}, edgeMeta: {} },
        },
      ],
      assets: [],
      relationGraph: {
        nodes: [
          {
            id: 'custom-unknown',
            type: 'unknown_custom_type',
            title: 'Custom Node',
            description: '',
            inputs: ['in'],
            outputs: ['out'],
            position: { x: 1600, y: 160 },
          },
        ],
        edges: [],
        nodeMeta: {
          'custom-unknown': {
            entityType: 'custom',
            entityId: 'custom-unknown',
            label: 'Custom Node',
            fileKind: null,
            folderPath: null,
            sourceFileId: null,
            isStructural: false,
            createdAt: '2025-01-01T10:00:00.000Z',
            updatedAt: '2025-01-01T10:00:00.000Z',
          },
        },
        edgeMeta: {},
      },
      activeFileId: 'case-a',
    });

    const workspace = parseCaseResolverWorkspace(raw);
    expect(
      workspace.relationGraph.nodes.some((node: AiNode): boolean => node.id === 'custom-unknown')
    ).toBe(false);
  });

  it('drops stale structural relation graph links and keeps valid custom ones', () => {
    const raw = JSON.stringify({
      version: 2,
      workspaceRevision: 0,
      lastMutationId: null,
      lastMutationAt: null,
      folders: [],
      files: [
        {
          id: 'case-x',
          fileType: 'case',
          name: 'Case X',
          folder: '',
          parentCaseId: null,
          referenceCaseIds: [],
          graph: { nodes: [], edges: [], nodeMeta: {}, edgeMeta: {} },
        },
      ],
      assets: [],
      relationGraph: {
        nodes: [
          {
            id: 'custom-a',
            type: 'template',
            title: 'Custom A',
            description: '',
            inputs: ['in'],
            outputs: ['out'],
            position: { x: 1500, y: 100 },
          },
          {
            id: 'custom-b',
            type: 'template',
            title: 'Custom B',
            description: '',
            inputs: ['in'],
            outputs: ['out'],
            position: { x: 1700, y: 100 },
          },
        ],
        edges: [
          {
            id: 'stale-edge',
            source: 'missing-node',
            target: 'custom-a',
            sourceHandle: 'out',
            targetHandle: 'in',
          },
          {
            id: 'custom-edge-keep',
            source: 'custom-a',
            target: 'custom-b',
            sourceHandle: 'out',
            targetHandle: 'in',
          },
        ],
        nodeMeta: {
          'custom-a': {
            entityType: 'custom',
            entityId: 'custom-a',
            label: 'Custom A',
            fileKind: null,
            folderPath: null,
            sourceFileId: null,
            isStructural: false,
            createdAt: '2025-01-01T10:00:00.000Z',
            updatedAt: '2025-01-01T10:00:00.000Z',
          },
          'custom-b': {
            entityType: 'custom',
            entityId: 'custom-b',
            label: 'Custom B',
            fileKind: null,
            folderPath: null,
            sourceFileId: null,
            isStructural: false,
            createdAt: '2025-01-01T10:00:00.000Z',
            updatedAt: '2025-01-01T10:00:00.000Z',
          },
        },
        edgeMeta: {
          'custom-edge-keep': {
            relationType: 'custom',
            label: 'custom relation',
            isStructural: false,
            createdAt: '2025-01-01T10:00:00.000Z',
            updatedAt: '2025-01-01T10:00:00.000Z',
          },
        },
      },
      activeFileId: 'case-x',
    });

    const workspace = parseCaseResolverWorkspace(raw);
    const relationGraph = workspace.relationGraph;
    const edgeIds = relationGraph.edges.map((edge: CaseResolverEdge) => edge.id);

    expect(edgeIds.includes('stale-edge')).toBe(false);
    expect(edgeIds.includes('custom-edge-keep')).toBe(true);
  });
});
