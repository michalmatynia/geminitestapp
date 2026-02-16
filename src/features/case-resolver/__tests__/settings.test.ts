import { describe, expect, it } from 'vitest';

import type { AiNode } from '@/features/ai/ai-paths/lib';
import {
  extractCaseResolverDocumentDate,
  inferCaseResolverAssetKind,
  normalizeCaseResolverIdentifiers,
  normalizeCaseResolverTags,
  parseCaseResolverIdentifiers,
  parseCaseResolverSettings,
  parseCaseResolverWorkspace,
  resolveCaseResolverUploadFolder,
} from '@/features/case-resolver/settings';
import {
  CASE_RESOLVER_DOCUMENT_NODE_INPUT_PORTS,
  CASE_RESOLVER_DOCUMENT_NODE_OUTPUT_PORTS,
  DEFAULT_CASE_RESOLVER_NODE_META,
} from '@/features/case-resolver/types';

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

describe('case-resolver settings', () => {
  it('normalizes folders, deduplicates files, and sanitizes node metadata', () => {
    const raw = JSON.stringify({
      version: 1,
      folders: ['Root A/Sub *', 'Root A'],
      files: [
        {
          id: 'dup-file',
          name: 'Case One',
          folder: 'Root A/Sub *',
          createdAt: '',
          updatedAt: '',
          addresser: { kind: 'person', id: 'p-1' },
          addressee: { kind: 'invalid', id: 'x-1' },
          caseIdentifierId: '  identifier-1  ',
          graph: {
            nodes: [createPromptNode('n1'), createPromptNode('n2')],
            edges: [],
            nodeMeta: {
              n1: {
                role: 'text_note',
                includeInOutput: true,
                quoteMode: 'double',
                surroundPrefix: '«',
                surroundSuffix: '»',
              },
              n2: {
                role: 'invalid-role',
                includeInOutput: 'invalid',
                quoteMode: 'invalid',
                surroundPrefix: 123,
                surroundSuffix: null,
              },
            },
            edgeMeta: {},
          },
        },
        {
          id: 'dup-file',
          name: 'Case Duplicate',
          folder: '',
          graph: {
            nodes: [],
            edges: [],
            nodeMeta: {},
            edgeMeta: {},
          },
        },
      ],
      activeFileId: 'missing-id',
    });

    const workspace = parseCaseResolverWorkspace(raw);

    expect(workspace.files).toHaveLength(1);
    expect(workspace.assets).toEqual([]);
    expect(workspace.files[0]?.id).toBe('dup-file');
    expect(workspace.files[0]?.folder).toBe('Root_A/Sub__');
    expect(workspace.files[0]?.documentDate).toBe('');
    expect(workspace.files[0]?.addresser).toEqual({ kind: 'person', id: 'p-1' });
    expect(workspace.files[0]?.addressee).toBeNull();
    expect(workspace.files[0]?.caseIdentifierId).toBe('identifier-1');
    expect(workspace.folders).toEqual(['Root_A', 'Root_A/Sub__']);
    expect(workspace.activeFileId).toBe('dup-file');
    expect(workspace.files[0]?.editorType).toBe('markdown');
    expect(workspace.files[0]?.documentContentFormatVersion).toBe(1);
    expect(workspace.files[0]?.documentContentVersion).toBe(1);
    expect(workspace.files[0]?.documentContentMarkdown).toBe('');
    expect(workspace.files[0]?.documentContentPlainText).toBeTypeOf('string');
    expect(workspace.files[0]?.createdAt).not.toBe('');
    expect(workspace.files[0]?.updatedAt).not.toBe('');
    expect(Object.keys(workspace.folderTimestamps).sort()).toEqual(['Root_A', 'Root_A/Sub__']);
    expect(Number.isNaN(Date.parse(workspace.folderTimestamps['Root_A']?.createdAt ?? ''))).toBe(false);
    expect(Number.isNaN(Date.parse(workspace.folderTimestamps['Root_A']?.updatedAt ?? ''))).toBe(false);
    expect(Number.isNaN(Date.parse(workspace.folderTimestamps['Root_A/Sub__']?.createdAt ?? ''))).toBe(false);
    expect(Number.isNaN(Date.parse(workspace.folderTimestamps['Root_A/Sub__']?.updatedAt ?? ''))).toBe(false);

    expect(workspace.files[0]?.graph.nodeMeta['n1']).toEqual({
      role: 'text_note',
      includeInOutput: true,
      quoteMode: 'double',
      surroundPrefix: '«',
      surroundSuffix: '»',
    });
    expect(workspace.files[0]?.graph.nodeMeta['n2']).toEqual({
      role: DEFAULT_CASE_RESOLVER_NODE_META.role,
      includeInOutput: DEFAULT_CASE_RESOLVER_NODE_META.includeInOutput,
      quoteMode: DEFAULT_CASE_RESOLVER_NODE_META.quoteMode,
      surroundPrefix: DEFAULT_CASE_RESOLVER_NODE_META.surroundPrefix,
      surroundSuffix: DEFAULT_CASE_RESOLVER_NODE_META.surroundSuffix,
    });
    expect(workspace.files[0]?.graph.pdfExtractionPresetId).toBe('plain_text');
  });

  it('normalizes uploaded assets and infers asset kind', () => {
    const raw = JSON.stringify({
      version: 2,
      folders: ['Assets'],
      files: [
        {
          id: 'case-1',
          name: 'Case One',
          folder: '',
          graph: {
            nodes: [],
            edges: [],
            nodeMeta: {},
            edgeMeta: {},
            pdfExtractionPresetId: 'unknown_preset',
          },
        },
      ],
      assets: [
        {
          id: 'asset-1',
          name: ' Render 01.png ',
          folder: 'Assets',
          kind: 'invalid',
          filepath: '/uploads/case-resolver/assets/render-01.png',
          mimeType: 'image/png',
          size: 120.2,
          textContent: null,
          description: null,
        },
        {
          id: 'asset-1',
          name: 'Duplicate',
          folder: '',
          kind: 'file',
        },
      ],
      activeFileId: 'case-1',
    });

    const workspace = parseCaseResolverWorkspace(raw);
    expect(workspace.assets).toHaveLength(1);
    expect(workspace.assets[0]?.name).toBe('Render 01.png');
    expect(workspace.assets[0]?.kind).toBe('image');
    expect(workspace.assets[0]?.size).toBe(120);
    expect(workspace.files[0]?.graph.pdfExtractionPresetId).toBe('plain_text');
  });

  it('preserves editor metadata and sanitizes html content payloads', () => {
    const raw = JSON.stringify({
      version: 2,
      folders: [],
      files: [
        {
          id: 'case-editor',
          name: 'Editor Case',
          folder: '',
          editorType: 'wysiwyg',
          documentContentVersion: 5,
          documentContentFormatVersion: 1,
          documentContent: '<h1>Hello</h1><script>alert(1)</script><p>World</p>',
          graph: {
            nodes: [],
            edges: [],
            nodeMeta: {},
            edgeMeta: {},
          },
        },
      ],
      assets: [],
      activeFileId: 'case-editor',
    });

    const workspace = parseCaseResolverWorkspace(raw);
    const file = workspace.files[0];

    expect(file?.editorType).toBe('wysiwyg');
    expect(file?.documentContentVersion).toBe(5);
    expect(file?.documentContentHtml).not.toContain('<script');
    expect(file?.documentContentPlainText).toContain('Hello');
    expect(file?.documentContentPlainText).toContain('World');
  });

  it('synchronizes relation graph structure and preserves custom links', () => {
    const raw = JSON.stringify({
      version: 2,
      folders: ['Root/Sub'],
      files: [
        {
          id: 'case-a',
          name: 'Case A',
          folder: 'Root',
          parentCaseId: null,
          referenceCaseIds: ['case-b'],
          graph: { nodes: [], edges: [], nodeMeta: {}, edgeMeta: {} },
        },
        {
          id: 'case-b',
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
            from: 'case:case-a',
            to: 'custom-link',
            fromPort: 'out',
            toPort: 'in',
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

    expect(
      relationGraph.nodes.some((node: AiNode): boolean => node.id === 'case:case-a')
    ).toBe(true);
    expect(
      relationGraph.nodes.some((node: AiNode): boolean => node.id === 'case:case-b')
    ).toBe(true);
    expect(
      relationGraph.nodes.some((node: AiNode): boolean => node.id === 'file:case:case-a')
    ).toBe(true);
    expect(
      relationGraph.nodes.some((node: AiNode): boolean => node.id === 'file:asset:asset-1')
    ).toBe(true);
    expect(
      relationGraph.nodes.some((node: AiNode): boolean => node.id === 'custom-link')
    ).toBe(true);

    const preservedCaseNode = relationGraph.nodes.find(
      (node: AiNode): boolean => node.id === 'case:case-a'
    );
    expect(preservedCaseNode?.position).toEqual({ x: 2222, y: 1111 });

    expect(
      relationGraph.edges.some(
        (edge): boolean =>
          edge.from === 'case:case-a' &&
          edge.to === 'case:case-b' &&
          relationGraph.edgeMeta[edge.id]?.relationType === 'parent_case'
      )
    ).toBe(true);
    expect(
      relationGraph.edges.some(
        (edge): boolean =>
          edge.from === 'case:case-a' &&
          edge.to === 'case:case-b' &&
          relationGraph.edgeMeta[edge.id]?.relationType === 'references'
      )
    ).toBe(true);

    expect(
      relationGraph.edges.some((edge): boolean => edge.id === 'custom-edge')
    ).toBe(true);
    expect(relationGraph.edgeMeta['custom-edge']?.relationType).toBe('custom');
    expect(relationGraph.edgeMeta['custom-edge']?.isStructural).toBe(false);
    expect(relationGraph.edgeMeta['custom-edge']?.label).toBe('cross');
  });

  it('coerces unknown relation node types to a safe template type', () => {
    const raw = JSON.stringify({
      version: 2,
      folders: [],
      files: [
        {
          id: 'case-a',
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
            id: 'custom-legacy',
            type: 'legacy_unknown_type',
            title: 'Legacy Custom',
            description: '',
            inputs: ['in'],
            outputs: ['out'],
            position: { x: 1600, y: 160 },
          },
        ],
        edges: [],
        nodeMeta: {
          'custom-legacy': {
            entityType: 'custom',
            entityId: 'custom-legacy',
            label: 'Legacy Custom',
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
    const legacyNode = workspace.relationGraph.nodes.find((node): boolean => node.id === 'custom-legacy');

    expect(legacyNode).toBeDefined();
    expect(legacyNode?.type).toBe('template');
  });

  it('drops stale structural relation graph links and keeps valid custom ones', () => {
    const raw = JSON.stringify({
      version: 2,
      folders: [],
      files: [
        {
          id: 'case-x',
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
            from: 'missing-node',
            to: 'custom-a',
            fromPort: 'out',
            toPort: 'in',
          },
          {
            id: 'custom-edge-keep',
            from: 'custom-a',
            to: 'custom-b',
            fromPort: 'out',
            toPort: 'in',
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
    const edgeIds = relationGraph.edges.map((edge) => edge.id);

    expect(edgeIds.includes('stale-edge')).toBe(false);
    expect(edgeIds.includes('custom-edge-keep')).toBe(true);
  });

  it('categorizes upload folders by inferred file kind', () => {
    expect(
      resolveCaseResolverUploadFolder({
        baseFolder: 'Evidence',
        mimeType: 'image/png',
        name: 'render.png',
      })
    ).toBe('Evidence/images');
    expect(
      resolveCaseResolverUploadFolder({
        baseFolder: 'Evidence',
        mimeType: 'application/pdf',
        name: 'report.pdf',
      })
    ).toBe('Evidence/pdfs');
    expect(
      resolveCaseResolverUploadFolder({
        baseFolder: 'Evidence',
        mimeType: 'text/plain',
        name: 'notes.txt',
      })
    ).toBe('Evidence/files');
    expect(
      resolveCaseResolverUploadFolder({
        baseFolder: '',
        mimeType: 'application/pdf',
        name: 'root-report.pdf',
      })
    ).toBe('pdfs');
    expect(
      inferCaseResolverAssetKind({
        mimeType: 'image/jpeg',
        name: 'report.pdf',
      })
    ).toBe('image');
    expect(
      inferCaseResolverAssetKind({
        mimeType: '',
        name: 'scan-01.png',
      })
    ).toBe('image');
  });

  it('parses OCR settings safely', () => {
    expect(
      parseCaseResolverSettings(
        JSON.stringify({ ocrModel: '  llama3.2-vision  ' })
      ).ocrModel
    ).toBe('llama3.2-vision');

    expect(parseCaseResolverSettings(JSON.stringify({})).ocrModel).toBe('');
    expect(parseCaseResolverSettings(null).ocrModel).toBe('');
  });

  it('extracts document date from exploded text formats', () => {
    expect(extractCaseResolverDocumentDate('Document Date: 2024-11-05')).toBe('2024-11-05');
    expect(extractCaseResolverDocumentDate('Data dokumentu: 05.11.2024')).toBe('2024-11-05');
    expect(extractCaseResolverDocumentDate('Date: 11/05/2024')).toBe('2024-11-05');
    expect(extractCaseResolverDocumentDate('Date: 31.02.2024')).toBeNull();
    expect(extractCaseResolverDocumentDate('No date in this content')).toBeNull();
  });

  it('normalizes hierarchical tags and removes invalid parent references', () => {
    const tags = normalizeCaseResolverTags([
      { id: 'child', name: 'Child', parentId: 'parent' },
      { id: 'parent', name: 'Parent' },
      { id: 'orphan', name: 'Orphan', parentId: 'missing' },
      { id: 'self', name: 'Self', parentId: 'self' },
      { id: 'cycle-a', name: 'Cycle A', parentId: 'cycle-b' },
      { id: 'cycle-b', name: 'Cycle B', parentId: 'cycle-a' },
    ]);

    const byId = new Map(tags.map((tag) => [tag.id, tag]));
    expect(byId.get('child')?.parentId).toBe('parent');
    expect(byId.get('parent')?.parentId).toBeNull();
    expect(byId.get('orphan')?.parentId).toBeNull();
    expect(byId.get('self')?.parentId).toBeNull();
    expect(byId.get('cycle-a')?.parentId).toBeNull();
    expect(byId.get('cycle-b')?.parentId).toBeNull();
    expect(tags.map((tag) => tag.id)).toEqual(['cycle-a', 'cycle-b', 'orphan', 'parent', 'child', 'self']);
  });

  it('normalizes hierarchical case identifiers and parses safely', () => {
    const identifiers = normalizeCaseResolverIdentifiers([
      { id: 'child', name: 'Child', parentId: 'parent' },
      { id: 'parent', name: 'Parent' },
      { id: 'orphan', name: 'Orphan', parentId: 'missing' },
      { id: 'self', name: 'Self', parentId: 'self' },
      { id: 'cycle-a', name: 'Cycle A', parentId: 'cycle-b' },
      { id: 'cycle-b', name: 'Cycle B', parentId: 'cycle-a' },
    ]);

    const byId = new Map(identifiers.map((identifier) => [identifier.id, identifier]));
    expect(byId.get('child')?.parentId).toBe('parent');
    expect(byId.get('parent')?.parentId).toBeNull();
    expect(byId.get('orphan')?.parentId).toBeNull();
    expect(byId.get('self')?.parentId).toBeNull();
    expect(byId.get('cycle-a')?.parentId).toBeNull();
    expect(byId.get('cycle-b')?.parentId).toBeNull();
    expect(identifiers.map((identifier) => identifier.id)).toEqual([
      'cycle-a',
      'cycle-b',
      'orphan',
      'parent',
      'child',
      'self',
    ]);

    expect(parseCaseResolverIdentifiers('not-json')).toEqual([]);
  });

  it('adds document textfield/content ports for linked document nodes', () => {
    const workspace = parseCaseResolverWorkspace(
      JSON.stringify({
        version: 2,
        folders: [],
        files: [
          {
            id: 'case-ports',
            name: 'Case Ports',
            folder: '',
            graph: {
              nodes: [createPromptNode('doc-node'), createPromptNode('generic-node')],
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

  it('normalizes text node edge ports to textfield/content only', () => {
    const workspace = parseCaseResolverWorkspace(
      JSON.stringify({
        version: 2,
        folders: [],
        files: [
          {
            id: 'case-edge-ports',
            name: 'Case Edge Ports',
            folder: '',
            graph: {
              nodes: [
                createPromptNode('upstream'),
                createPromptNode('doc-node'),
                createPromptNode('downstream'),
              ],
              edges: [
                {
                  id: 'edge-in-prompt',
                  from: 'upstream',
                  to: 'doc-node',
                  fromPort: 'result',
                  toPort: 'prompt',
                },
                {
                  id: 'edge-in-unknown',
                  from: 'upstream',
                  to: 'doc-node',
                  fromPort: 'result',
                  toPort: 'custom',
                },
                {
                  id: 'edge-out-result',
                  from: 'doc-node',
                  to: 'downstream',
                  fromPort: 'result',
                  toPort: 'prompt',
                },
                {
                  id: 'edge-out-prompt',
                  from: 'doc-node',
                  to: 'downstream',
                  fromPort: 'prompt',
                  toPort: 'prompt',
                },
              ],
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
        activeFileId: 'case-edge-ports',
      })
    );

    const graph = workspace.files[0]?.graph;
    const edgeById = new Map((graph?.edges ?? []).map((edge) => [edge.id, edge]));

    expect(edgeById.get('edge-in-prompt')?.toPort).toBe('textfield');
    expect(edgeById.get('edge-in-unknown')?.toPort).toBe('content');
    expect(edgeById.get('edge-out-result')?.fromPort).toBe('content');
    expect(edgeById.get('edge-out-prompt')?.fromPort).toBe('textfield');
  });
});
