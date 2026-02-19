import { describe, expect, it } from 'vitest';

import type { AiNode } from '@/features/ai/ai-paths/lib';
import {
  CASE_RESOLVER_NORMALIZATION_FALLBACK_TIMESTAMP,
  DEFAULT_CASE_RESOLVER_OCR_PROMPT,
  DEFAULT_CASE_RESOLVER_SCANFILE_OCR_PROMPT,
  extractCaseResolverDocumentDate,
  getCaseResolverWorkspaceLatestTimestampMs,
  hasCaseResolverWorkspaceFilesArray,
  inferCaseResolverAssetKind,
  normalizeCaseResolverIdentifiers,
  normalizeCaseResolverTags,
  parseCaseResolverDefaultDocumentFormat,
  parseCaseResolverIdentifiers,
  parseCaseResolverSettings,
  parseNodeFileSnapshot,
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

const createTemplateNode = (id: string, template: string): AiNode => ({
  id,
  type: 'template',
  title: id,
  description: '',
  inputs: ['input'],
  outputs: ['output'],
  position: { x: 0, y: 0 },
  config: { template: { template } },
});

describe('case-resolver settings', () => {
  it('starts with an empty workspace and no placeholder files', () => {
    const workspace = parseCaseResolverWorkspace(null);
    expect(workspace.files).toEqual([]);
    expect(workspace.activeFileId).toBeNull();
    expect(workspace.workspaceRevision).toBe(0);
    expect(workspace.lastMutationId).toBeNull();
  });

  it('preserves workspace revision metadata when present', () => {
    const workspace = parseCaseResolverWorkspace(
      JSON.stringify({
        version: 2,
        workspaceRevision: 8,
        lastMutationId: 'mutation-abc',
        lastMutationAt: '2026-02-17T17:00:00.000Z',
        folders: [],
        files: [],
        assets: [],
        activeFileId: null,
      })
    );

    expect(workspace.workspaceRevision).toBe(8);
    expect(workspace.lastMutationId).toBe('mutation-abc');
    expect(workspace.lastMutationAt).toBe('2026-02-17T17:00:00.000Z');
  });

  it('removes detached non-case files that are outside a case container', () => {
    const workspace = parseCaseResolverWorkspace(
      JSON.stringify({
        version: 2,
        workspaceRevision: 2,
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
          {
            id: 'detached-doc-root',
            fileType: 'document',
            name: 'Detached Root Doc',
            folder: '',
            parentCaseId: null,
            referenceCaseIds: [],
            graph: { nodes: [], edges: [], nodeMeta: {}, edgeMeta: {} },
          },
        ],
        assets: [],
        activeFileId: 'detached-doc-root',
      })
    );

    expect(workspace.files.map((file) => file.id)).toEqual(['case-a']);
    expect(workspace.activeFileId).toBe('case-a');
  });

  it('detects whether raw workspace payload includes a files array', () => {
    expect(hasCaseResolverWorkspaceFilesArray(null)).toBe(false);
    expect(hasCaseResolverWorkspaceFilesArray('')).toBe(false);
    expect(hasCaseResolverWorkspaceFilesArray('not-json')).toBe(false);
    expect(hasCaseResolverWorkspaceFilesArray(JSON.stringify({}))).toBe(false);
    expect(hasCaseResolverWorkspaceFilesArray(JSON.stringify({ files: {} }))).toBe(false);
    expect(hasCaseResolverWorkspaceFilesArray(JSON.stringify({ files: [] }))).toBe(true);
  });

  it('returns the newest timestamp across workspace files and assets', () => {
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
            name: 'Case A',
            folder: '',
            createdAt: '2026-01-01T10:00:00.000Z',
            updatedAt: '2026-01-02T10:00:00.000Z',
            graph: { nodes: [], edges: [], nodeMeta: {}, edgeMeta: {} },
          },
        ],
        assets: [
          {
            id: 'asset-a',
            name: 'Asset A',
            folder: '',
            kind: 'file',
            createdAt: '2026-01-03T10:00:00.000Z',
            updatedAt: '2026-01-04T10:00:00.000Z',
          },
        ],
        activeFileId: 'case-a',
      })
    );

    expect(getCaseResolverWorkspaceLatestTimestampMs(workspace)).toBe(
      Date.parse('2026-01-04T10:00:00.000Z')
    );
  });

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
    expect(workspace.files[0]?.editorType).toBe('wysiwyg');
    expect(workspace.files[0]?.documentContentFormatVersion).toBe(1);
    expect(workspace.files[0]?.documentContentVersion).toBe(1);
    expect(workspace.files[0]?.documentContentMarkdown).toBe('');
    expect(workspace.files[0]?.documentContentPlainText).toBeTypeOf('string');
    expect(workspace.files[0]?.createdAt).toBe(CASE_RESOLVER_NORMALIZATION_FALLBACK_TIMESTAMP);
    expect(workspace.files[0]?.updatedAt).toBe(CASE_RESOLVER_NORMALIZATION_FALLBACK_TIMESTAMP);
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

  it('retains owner-scoped folder records for case-isolated empty folders', () => {
    const workspace = parseCaseResolverWorkspace(
      JSON.stringify({
        version: 2,
        workspaceRevision: 1,
        lastMutationId: null,
        lastMutationAt: null,
        folders: ['Shared'],
        folderRecords: [
          { path: 'Shared', ownerCaseId: 'case-a' },
          { path: 'Shared', ownerCaseId: 'case-b' },
          { path: 'Shared', ownerCaseId: 'missing-case' },
        ],
        files: [
          {
            id: 'case-a',
            fileType: 'case',
            name: 'Case A',
            folder: '',
            graph: { nodes: [], edges: [], nodeMeta: {}, edgeMeta: {} },
          },
          {
            id: 'case-b',
            fileType: 'case',
            name: 'Case B',
            folder: '',
            graph: { nodes: [], edges: [], nodeMeta: {}, edgeMeta: {} },
          },
        ],
        assets: [],
        activeFileId: 'case-a',
      })
    );

    expect(workspace.folders).toEqual(['Shared']);
    expect(workspace.folderRecords).toEqual([
      { path: 'Shared', ownerCaseId: 'case-a' },
      { path: 'Shared', ownerCaseId: 'case-b' },
    ]);
  });

  it('ignores folder list without explicit folder records', () => {
    const workspace = parseCaseResolverWorkspace(
      JSON.stringify({
        version: 2,
        workspaceRevision: 1,
        lastMutationId: null,
        lastMutationAt: null,
        folders: ['Legacy Folder'],
        files: [
          {
            id: 'case-only',
            fileType: 'case',
            name: 'Case Only',
            folder: '',
            graph: { nodes: [], edges: [], nodeMeta: {}, edgeMeta: {} },
          },
        ],
        assets: [],
        activeFileId: 'case-only',
      })
    );

    expect(workspace.folderRecords).toEqual([]);
    expect(workspace.folders).toEqual([]);
  });

  it('normalizes uploaded assets and infers asset kind', () => {
    const raw = JSON.stringify({
      version: 2,
      workspaceRevision: 0,
      lastMutationId: null,
      lastMutationAt: null,
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
      workspaceRevision: 0,
      lastMutationId: null,
      lastMutationAt: null,
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

  it('normalizes and preserves document history snapshots', () => {
    const raw = JSON.stringify({
      version: 2,
      workspaceRevision: 0,
      lastMutationId: null,
      lastMutationAt: null,
      folders: [],
      files: [
        {
          id: 'case-history',
          name: 'History Case',
          folder: '',
          documentHistory: [
            {
              id: 'entry-1',
              savedAt: '2026-02-16T10:00:00.000Z',
              documentContentVersion: 2,
              activeDocumentVersion: 'original',
              editorType: 'markdown',
              documentContentMarkdown: '# First version',
            },
            {
              id: 'entry-2',
              savedAt: '2026-02-17T10:00:00.000Z',
              documentContentVersion: 3,
              activeDocumentVersion: 'exploded',
              editorType: 'wysiwyg',
              documentContentHtml: '<p>Second version</p>',
            },
          ],
          graph: {
            nodes: [],
            edges: [],
            nodeMeta: {},
            edgeMeta: {},
          },
        },
      ],
      assets: [],
      activeFileId: 'case-history',
    });

    const workspace = parseCaseResolverWorkspace(raw);
    const file = workspace.files[0];

    expect(file?.documentHistory).toHaveLength(2);
    expect(file?.documentHistory[0]?.id).toBe('entry-2');
    expect(file?.documentHistory[0]?.documentContentVersion).toBe(3);
    expect(file?.documentHistory[0]?.editorType).toBe('wysiwyg');
    expect(file?.documentHistory[0]?.documentContentPlainText).toContain('Second version');
    expect(file?.documentHistory[1]?.id).toBe('entry-1');
    expect(file?.documentHistory[1]?.editorType).toBe('wysiwyg');
    expect(file?.documentHistory[1]?.documentContentMarkdown).toContain('# First version');
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
    ).toBe(false);
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
    const unknownNode = workspace.relationGraph.nodes.find((node): boolean => node.id === 'custom-unknown');

    expect(unknownNode).toBeDefined();
    expect(unknownNode?.type).toBe('template');
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
    const parsedWithValues = parseCaseResolverSettings(
      JSON.stringify({
        ocrModel: '  llama3.2-vision  ',
        ocrPrompt: '  Extract everything exactly as plain text.  ',
        defaultDocumentFormat: 'wysiwyg',
        confirmDeleteDocument: false,
        defaultAddresserPartyKind: 'organization',
        defaultAddresseePartyKind: 'person',
      })
    );
    expect(parsedWithValues.ocrModel).toBe('llama3.2-vision');
    expect(parsedWithValues.ocrPrompt).toBe('Extract everything exactly as plain text.');
    expect(parsedWithValues.defaultDocumentFormat).toBe('wysiwyg');
    expect(parsedWithValues.confirmDeleteDocument).toBe(false);
    expect(parsedWithValues.defaultAddresserPartyKind).toBe('organization');
    expect(parsedWithValues.defaultAddresseePartyKind).toBe('person');

    const parsedDefaults = parseCaseResolverSettings(JSON.stringify({}));
    expect(parsedDefaults.ocrModel).toBe('');
    expect(parsedDefaults.ocrPrompt).toBe(DEFAULT_CASE_RESOLVER_OCR_PROMPT);
    expect(parsedDefaults.defaultDocumentFormat).toBe('wysiwyg');
    expect(parsedDefaults.confirmDeleteDocument).toBe(true);
    expect(parsedDefaults.defaultAddresserPartyKind).toBe('person');
    expect(parsedDefaults.defaultAddresseePartyKind).toBe('organization');

    const parsedNull = parseCaseResolverSettings(null);
    expect(parsedNull.ocrModel).toBe('');
    expect(parsedNull.ocrPrompt).toBe(DEFAULT_CASE_RESOLVER_OCR_PROMPT);
    expect(parsedNull.defaultDocumentFormat).toBe('wysiwyg');
    expect(parsedNull.confirmDeleteDocument).toBe(true);
    expect(parsedNull.defaultAddresserPartyKind).toBe('person');
    expect(parsedNull.defaultAddresseePartyKind).toBe('organization');

    const parsedLegacyPlainValue = parseCaseResolverSettings('wysiwyg');
    expect(parsedLegacyPlainValue.defaultDocumentFormat).toBe('wysiwyg');

    const parsedLegacyJsonString = parseCaseResolverSettings(JSON.stringify('wysiwyg'));
    expect(parsedLegacyJsonString.defaultDocumentFormat).toBe('wysiwyg');

    const parsedLegacyObjectKey = parseCaseResolverSettings(
      JSON.stringify({ editorType: 'wysiwyg' })
    );
    expect(parsedLegacyObjectKey.defaultDocumentFormat).toBe('wysiwyg');

    expect(parseCaseResolverDefaultDocumentFormat('wysiwyg')).toBe('wysiwyg');
    expect(parseCaseResolverDefaultDocumentFormat(JSON.stringify('wysiwyg'))).toBe('wysiwyg');
    expect(
      parseCaseResolverDefaultDocumentFormat(JSON.stringify({ defaultDocumentFormat: 'wysiwyg' }))
    ).toBe('wysiwyg');
    expect(
      parseCaseResolverDefaultDocumentFormat(JSON.stringify({ editorType: 'wysiwyg' }))
    ).toBe('wysiwyg');
    expect(parseCaseResolverDefaultDocumentFormat('invalid-value')).toBe('wysiwyg');
    expect(parseCaseResolverDefaultDocumentFormat('invalid-value', 'wysiwyg')).toBe('wysiwyg');
  });

  it('defaults scanfile OCR fields and preserves custom overrides', () => {
    const workspace = parseCaseResolverWorkspace(
      JSON.stringify({
        version: 2,
        files: [
          {
            id: 'scan-default',
            fileType: 'scanfile',
            name: 'Scan Default',
            folder: '',
            parentCaseId: 'case-a',
          },
          {
            id: 'scan-custom',
            fileType: 'scanfile',
            name: 'Scan Custom',
            folder: '',
            parentCaseId: 'case-a',
            scanOcrModel: 'llama3.2-vision',
            scanOcrPrompt: 'Use this custom OCR prompt.',
          },
          {
            id: 'case-a',
            fileType: 'case',
            name: 'Case A',
            folder: '',
            parentCaseId: null,
          },
        ],
      })
    );

    const defaultScan = workspace.files.find((file) => file.id === 'scan-default');
    expect(defaultScan?.scanOcrModel).toBe('');
    expect(defaultScan?.scanOcrPrompt).toBe(DEFAULT_CASE_RESOLVER_SCANFILE_OCR_PROMPT);

    const customScan = workspace.files.find((file) => file.id === 'scan-custom');
    expect(customScan?.scanOcrModel).toBe('llama3.2-vision');
    expect(customScan?.scanOcrPrompt).toBe('Use this custom OCR prompt.');
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

  it('migrates legacy template document nodes to prompt nodes', () => {
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

    const graph = workspace.files[0]?.graph;
    const legacyNode = graph?.nodes.find((node: AiNode): boolean => node.id === 'legacy-doc-node');

    expect(legacyNode?.type).toBe('prompt');
    expect(legacyNode?.config?.prompt?.template).toBe('<p>Legacy template text</p>');
    expect(legacyNode?.inputs).toEqual(CASE_RESOLVER_DOCUMENT_NODE_INPUT_PORTS);
    expect(legacyNode?.outputs).toEqual(CASE_RESOLVER_DOCUMENT_NODE_OUTPUT_PORTS);
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
              nodes: [createPromptNode('node-valid'), createPromptNode('node-stale')],
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

    const graph = workspace.files.find((file) => file.id === 'doc-valid')?.graph;
    expect(graph?.documentSourceFileIdByNode).toEqual({
      'node-valid': 'doc-valid',
    });
    expect(graph?.nodeFileAssetIdByNode).toEqual({
      'node-valid': 'node-file-valid',
    });
  });

  it('parses legacy node-file snapshots with single-node payload shape', () => {
    const snapshot = parseNodeFileSnapshot(
      JSON.stringify({
        kind: 'case_resolver_node_file_snapshot_v1',
        source: 'manual',
        nodeId: 'legacy-node',
        sourceFileId: 'doc-legacy',
        sourceFileName: 'Legacy Document',
        sourceFileType: 'scanfile',
        node: createPromptNode('legacy-node'),
        connectedEdges: [
          {
            id: 'edge-legacy',
            from: 'legacy-node',
            to: 'legacy-node',
            fromPort: 'output',
            toPort: 'input',
          },
        ],
      })
    );

    expect(snapshot.nodes.map((node) => node.id)).toEqual(['legacy-node']);
    expect(snapshot.edges.map((edge) => edge.id)).toEqual(['edge-legacy']);
    expect(snapshot.nodeFileMeta).toEqual({
      'legacy-node': {
        fileId: 'doc-legacy',
        fileType: 'scanfile',
        fileName: 'Legacy Document',
      },
    });
  });

  it('normalizes text node edge ports to textfield/content only', () => {
    const workspace = parseCaseResolverWorkspace(
      JSON.stringify({
        version: 2,
        workspaceRevision: 0,
        lastMutationId: null,
        lastMutationAt: null,
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

    expect(edgeById.get('edge-in-prompt')?.toPort).toBe('content');
    expect(edgeById.get('edge-in-unknown')?.toPort).toBe('content');
    expect(edgeById.get('edge-out-result')?.fromPort).toBe('content');
    expect(edgeById.get('edge-out-prompt')?.fromPort).toBe('content');
  });
});
