import { describe, expect, it } from 'vitest';

import {
  CASE_RESOLVER_NORMALIZATION_FALLBACK_TIMESTAMP,
  DEFAULT_CASE_RESOLVER_SCANFILE_OCR_PROMPT,
  getCaseResolverWorkspaceLatestTimestampMs,
  hasCaseResolverWorkspaceFilesArray,
  parseCaseResolverWorkspace,
} from '@/features/case-resolver/settings';
import { DEFAULT_CASE_RESOLVER_NODE_META } from '@/shared/contracts/case-resolver/constants';
import { type CaseResolverFile } from '@/shared/contracts/case-resolver';
import {
  createCanonicalTextPromptNode,
  createCaseFilePayload,
  createDocumentFilePayload,
  createEmptyGraphPayload,
  createScanFilePayload,
  createWorkspaceAssetPayload,
  createWorkspaceFilePayload,
  createWorkspaceJson,
} from './workspace.test-helpers';

describe('case-resolver workspace', () => {
  it('starts with an empty workspace and no placeholder files', () => {
    const workspace = parseCaseResolverWorkspace(null);
    expect(workspace.files).toEqual([]);
    expect(workspace.activeFileId).toBeNull();
    expect(workspace.workspaceRevision).toBe(0);
    expect(workspace.lastMutationId).toBeNull();
  });

  it('rejects non-empty invalid workspace JSON payloads', () => {
    expect(() => parseCaseResolverWorkspace('{not-json')).toThrowError(
      /Case Resolver workspace payload is not valid JSON\./
    );
  });

  it('rejects non-empty non-object workspace payloads', () => {
    expect(() => parseCaseResolverWorkspace('[]')).toThrowError(
      /Case Resolver workspace payload must be a JSON object\./
    );
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

  it('keeps detached non-case files even when ownership is unresolved', () => {
    const workspace = parseCaseResolverWorkspace(
      createWorkspaceJson({
        workspaceRevision: 2,
        files: [
          createCaseFilePayload({ id: 'case-a', name: 'Case A' }),
          createDocumentFilePayload({ id: 'detached-doc-root', name: 'Detached Root Doc' }),
        ],
        activeFileId: 'detached-doc-root',
      })
    );

    expect(workspace.files.map((file: CaseResolverFile) => file.id)).toEqual([
      'case-a',
      'detached-doc-root',
    ]);
    expect(
      workspace.files.find((file: CaseResolverFile): boolean => file.id === 'detached-doc-root')
        ?.parentCaseId
    ).toBeNull();
    expect(workspace.activeFileId).toBe('detached-doc-root');
  });

  it('does not infer missing document ownership from folder records', () => {
    const workspace = parseCaseResolverWorkspace(
      createWorkspaceJson({
        workspaceRevision: 3,
        folders: ['Case_A/Incoming'],
        folderRecords: [
          { path: 'Case_A', ownerCaseId: 'case-a' },
          { path: 'Case_A/Incoming', ownerCaseId: 'case-a' },
        ],
        files: [
          createCaseFilePayload({ id: 'case-a', name: 'Case A' }),
          createDocumentFilePayload({
            id: 'doc-a',
            name: 'Doc A',
            folder: 'Case_A/Incoming',
          }),
        ],
        activeFileId: 'doc-a',
      })
    );

    const doc = workspace.files.find((file: CaseResolverFile): boolean => file.id === 'doc-a');
    expect(doc?.parentCaseId).toBeNull();
  });

  it('keeps case-owned documents when unrelated case metadata changes', () => {
    const workspace = parseCaseResolverWorkspace(
      createWorkspaceJson({
        workspaceRevision: 4,
        files: [
          createCaseFilePayload({
            id: 'case-a',
            name: 'Case A',
            caseStatus: 'completed',
            caseTreeOrder: 10,
          }),
          createDocumentFilePayload({
            id: 'doc-owned',
            name: 'Owned Doc',
            parentCaseId: 'case-a',
          }),
        ],
        activeFileId: 'case-a',
      })
    );

    expect(workspace.files.map((file: CaseResolverFile): string => file.id).sort()).toEqual([
      'case-a',
      'doc-owned',
    ]);
    expect(
      workspace.files.find((file: CaseResolverFile): boolean => file.id === 'doc-owned')
        ?.parentCaseId
    ).toBe('case-a');
  });

  it('normalizes and preserves happening date for case files', () => {
    const workspace = parseCaseResolverWorkspace(
      createWorkspaceJson({
        workspaceRevision: 1,
        files: [
          createCaseFilePayload({
            id: 'case-happening-date',
            name: 'Case Date',
            happeningDate: ' 2026-03-11T16:20:00.000Z ',
          }),
        ],
        activeFileId: 'case-happening-date',
      })
    );

    expect(workspace.files[0]?.happeningDate).toBe('2026-03-11');
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
      createWorkspaceJson({
        files: [
          createWorkspaceFilePayload({
            id: 'case-a',
            name: 'Case A',
            createdAt: '2026-01-01T10:00:00.000Z',
            updatedAt: '2026-01-02T10:00:00.000Z',
          }),
        ],
        assets: [
          createWorkspaceAssetPayload({
            id: 'asset-a',
            name: 'Asset A',
            createdAt: '2026-01-03T10:00:00.000Z',
            updatedAt: '2026-01-04T10:00:00.000Z',
          }),
        ],
        activeFileId: 'case-a',
      })
    );

    expect(getCaseResolverWorkspaceLatestTimestampMs(workspace)).toBe(
      Date.parse('2026-01-04T10:00:00.000Z')
    );
  });

  it('normalizes folders, deduplicates files, and sanitizes node metadata', () => {
    const raw = createWorkspaceJson({
      version: 1,
      folders: ['Root A/Sub *', 'Root A'],
      files: [
        createWorkspaceFilePayload({
          id: 'dup-file',
          name: 'Case One',
          folder: 'Root A/Sub *',
          createdAt: '',
          updatedAt: '',
          isSent: true,
          addresser: { kind: 'person', id: 'p-1' },
          addressee: { kind: 'invalid', id: 'x-1' },
          caseIdentifierId: '  identifier-1  ',
          graph: createEmptyGraphPayload({
            nodes: [createCanonicalTextPromptNode('n1'), createCanonicalTextPromptNode('n2')],
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
          }),
        }),
        createWorkspaceFilePayload({
          id: 'dup-file',
          name: 'Case Duplicate',
        }),
      ],
      activeFileId: 'missing-id',
    });

    const workspace = parseCaseResolverWorkspace(raw);

    expect(workspace.files).toHaveLength(1);
    expect(workspace.assets).toEqual([]);
    expect(workspace.files[0]?.id).toBe('dup-file');
    expect(workspace.files[0]?.folder).toBe('Root_A/Sub__');
    expect(workspace.files[0]?.documentDate).toBeNull();
    expect(workspace.files[0]?.isSent).toBe(true);
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
    expect(Number.isNaN(Date.parse(workspace.folderTimestamps['Root_A']?.createdAt ?? ''))).toBe(
      false
    );
    expect(Number.isNaN(Date.parse(workspace.folderTimestamps['Root_A']?.updatedAt ?? ''))).toBe(
      false
    );
    expect(
      Number.isNaN(Date.parse(workspace.folderTimestamps['Root_A/Sub__']?.createdAt ?? ''))
    ).toBe(false);
    expect(
      Number.isNaN(Date.parse(workspace.folderTimestamps['Root_A/Sub__']?.updatedAt ?? ''))
    ).toBe(false);

    expect(workspace.files[0]!.graph!.nodeMeta!['n1']).toEqual({
      role: 'text_note',
      includeInOutput: true,
      quoteMode: 'double',
      surroundPrefix: '«',
      surroundSuffix: '»',
      plainTextValidationEnabled: true,
      plainTextFormatterEnabled: true,
      plainTextValidationStackId: '',
    });
    expect(workspace.files[0]!.graph!.nodeMeta!['n2']).toEqual({
      role: DEFAULT_CASE_RESOLVER_NODE_META.role,
      includeInOutput: DEFAULT_CASE_RESOLVER_NODE_META.includeInOutput,
      quoteMode: DEFAULT_CASE_RESOLVER_NODE_META.quoteMode,
      surroundPrefix: DEFAULT_CASE_RESOLVER_NODE_META.surroundPrefix,
      surroundSuffix: DEFAULT_CASE_RESOLVER_NODE_META.surroundSuffix,
      plainTextValidationEnabled: DEFAULT_CASE_RESOLVER_NODE_META.plainTextValidationEnabled,
      plainTextFormatterEnabled: DEFAULT_CASE_RESOLVER_NODE_META.plainTextFormatterEnabled,
      plainTextValidationStackId: DEFAULT_CASE_RESOLVER_NODE_META.plainTextValidationStackId,
    });
    expect(workspace.files[0]!.graph!.pdfExtractionPresetId).toBe('plain_text');
  });

  it('retains owner-scoped folder records for case-isolated empty folders', () => {
    const workspace = parseCaseResolverWorkspace(
      createWorkspaceJson({
        workspaceRevision: 1,
        folders: ['Shared'],
        folderRecords: [
          { path: 'Shared', ownerCaseId: 'case-a' },
          { path: 'Shared', ownerCaseId: 'case-b' },
          { path: 'Shared', ownerCaseId: 'missing-case' },
        ],
        files: [
          createCaseFilePayload({ id: 'case-a', name: 'Case A' }),
          createCaseFilePayload({ id: 'case-b', name: 'Case B' }),
        ],
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
      createWorkspaceJson({
        workspaceRevision: 1,
        folders: ['Legacy Folder'],
        files: [
          createCaseFilePayload({ id: 'case-only', name: 'Case Only' }),
        ],
        activeFileId: 'case-only',
      })
    );

    expect(workspace.folderRecords).toEqual([]);
    expect(workspace.folders).toEqual([]);
  });

  it('normalizes uploaded assets and infers asset kind', () => {
    const raw = createWorkspaceJson({
      folders: ['Assets'],
      files: [
        createWorkspaceFilePayload({
          id: 'case-1',
          name: 'Case One',
          graph: createEmptyGraphPayload({
            pdfExtractionPresetId: 'unknown_preset',
          }),
        }),
      ],
      assets: [
        createWorkspaceAssetPayload({
          id: 'asset-1',
          name: ' Render 01.png ',
          folder: 'Assets',
          kind: 'invalid',
          filepath: '/uploads/case-resolver/assets/render-01.png',
          mimeType: 'image/png',
          size: 120.2,
          textContent: null,
          description: null,
        }),
        createWorkspaceAssetPayload({ id: 'asset-1', name: 'Duplicate' }),
      ],
      activeFileId: 'case-1',
    });

    const workspace = parseCaseResolverWorkspace(raw);
    expect(workspace.assets).toHaveLength(1);
    expect(workspace.assets[0]?.name).toBe('Render 01.png');
    expect(workspace.assets[0]?.kind).toBe('image');
    expect(workspace.assets[0]?.size).toBe(120);
    expect(workspace.files[0]!.graph!.pdfExtractionPresetId).toBe('plain_text');
  });
  it('preserves editor metadata and sanitizes html content payloads', () => {
    const raw = createWorkspaceJson({
      files: [
        createWorkspaceFilePayload({
          id: 'case-editor',
          name: 'Editor Case',
          editorType: 'wysiwyg',
          documentContentVersion: 5,
          documentContentFormatVersion: 1,
          documentContent: '<h1>Hello</h1><script>alert(1)</script><p>World</p>',
        }),
      ],
      activeFileId: 'case-editor',
    });

    const workspace = parseCaseResolverWorkspace(raw);
    const file = workspace.files[0];

    expect(file?.editorType).toBe('wysiwyg');
    expect(file?.documentContentVersion).toBe(5);
    expect(file?.isSent).toBe(false);
    expect(file?.documentContentHtml).not.toContain('<script');
    expect(file?.documentContentPlainText).toContain('Hello');
    expect(file?.documentContentPlainText).toContain('World');
  });

  it('keeps scan markdown authoritative when both markdown and html are present', () => {
    const raw = createWorkspaceJson({
      files: [
        createScanFilePayload({
          id: 'scan-markdown',
          name: 'Scan Markdown',
          documentContentMarkdown: `## Heading

- one
- two`,
          documentContentHtml: '<p>Legacy HTML should not override markdown.</p>',
        }),
      ],
      activeFileId: 'scan-markdown',
    });

    const workspace = parseCaseResolverWorkspace(raw);
    const file = workspace.files[0];

    expect(file?.editorType).toBe('markdown');
    expect(file?.documentContentMarkdown).toContain('## Heading');
    expect(file?.documentContentMarkdown).not.toContain('<p>');
    expect(file?.documentContent).toContain('## Heading');
  });

  it('strips legacy scan html-only content into plain markdown text', () => {
    const raw = createWorkspaceJson({
      files: [
        createScanFilePayload({
          id: 'scan-legacy-html',
          name: 'Legacy Scan',
          documentContent: '<p>Hello <strong>world</strong></p><p>Second line</p>',
          documentContentHtml: '<p>Hello <strong>world</strong></p><p>Second line</p>',
        }),
      ],
      activeFileId: 'scan-legacy-html',
    });

    const workspace = parseCaseResolverWorkspace(raw);
    const file = workspace.files[0];

    expect(file?.editorType).toBe('markdown');
    expect(file?.documentContentMarkdown).toContain('Hello world');
    expect(file?.documentContentMarkdown).toContain('Second line');
    expect(file?.documentContentMarkdown).not.toContain('<strong>');
    expect(file?.documentContentPlainText).toContain('Hello world');
  });

  it('normalizes and preserves document history snapshots', () => {
    const raw = createWorkspaceJson({
      files: [
        createWorkspaceFilePayload({
          id: 'case-history',
          name: 'History Case',
          documentContentVersion: 3,
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
        }),
      ],
      activeFileId: 'case-history',
    });

    const workspace = parseCaseResolverWorkspace(raw);
    const file = workspace.files[0];

    expect(file?.documentHistory).toHaveLength(2);
    expect(file?.documentHistory[0]?.id).toBe('entry-2');
    expect(file?.documentContentVersion).toBe(3);
    expect(file?.documentHistory[0]?.editorType).toBe('wysiwyg');
    expect(file?.documentHistory[0]?.documentContentPlainText).toContain('Second version');
    expect(file?.documentHistory[1]?.id).toBe('entry-1');
    expect(file?.documentHistory[1]?.editorType).toBe('wysiwyg');
    expect(file?.documentHistory[1]?.documentContentMarkdown).toContain('# First version');
  });

  it('normalizes related file links and enforces bidirectional relations', () => {
    const raw = createWorkspaceJson({
      files: [
        createCaseFilePayload({
          id: 'case-a',
          name: 'Case A',
          relatedFileIds: ['doc-a'],
        }),
        createDocumentFilePayload({
          id: 'doc-a',
          name: 'Doc A',
          parentCaseId: 'case-a',
          relatedFileIds: ['doc-b', 'doc-b', 'missing-doc', 'doc-a', 'case-a'],
        }),
        createScanFilePayload({
          id: 'doc-b',
          name: 'Doc B',
          parentCaseId: 'case-a',
          relatedFileIds: [],
        }),
        createDocumentFilePayload({
          id: 'doc-c',
          name: 'Doc C',
          parentCaseId: 'case-a',
          relatedFileIds: ['doc-b'],
        }),
      ],
      activeFileId: 'doc-a',
    });

    const workspace = parseCaseResolverWorkspace(raw);
    const caseFile = workspace.files.find(
      (file: CaseResolverFile): boolean => file.id === 'case-a'
    );
    const docA = workspace.files.find((file: CaseResolverFile): boolean => file.id === 'doc-a');
    const docB = workspace.files.find((file: CaseResolverFile): boolean => file.id === 'doc-b');
    const docC = workspace.files.find((file: CaseResolverFile): boolean => file.id === 'doc-c');

    expect(caseFile?.relatedFileIds).toBeUndefined();
    expect(docA?.relatedFileIds).toEqual(['doc-b']);
    expect(docB?.relatedFileIds).toEqual(['doc-a', 'doc-c']);
    expect(docC?.relatedFileIds).toEqual(['doc-b']);
  });

  it('removes stale related links while keeping unresolved documents', () => {
    const raw = createWorkspaceJson({
      files: [
        createCaseFilePayload({
          id: 'case-a',
          name: 'Case A',
        }),
        createDocumentFilePayload({
          id: 'doc-kept',
          name: 'Doc Kept',
          parentCaseId: 'case-a',
          relatedFileIds: ['doc-missing'],
        }),
        createDocumentFilePayload({
          id: 'doc-orphan',
          name: 'Doc Orphan',
        }),
      ],
      activeFileId: 'doc-kept',
    });

    const workspace = parseCaseResolverWorkspace(raw);
    const keptDoc = workspace.files.find(
      (file: CaseResolverFile): boolean => file.id === 'doc-kept'
    );

    expect(
      workspace.files.some((file: CaseResolverFile): boolean => file.id === 'doc-orphan')
    ).toBe(true);
    expect(keptDoc?.relatedFileIds).toBeUndefined();
  });

  it('defaults scanfile OCR fields and preserves custom overrides', () => {
    const workspace = parseCaseResolverWorkspace(
      createWorkspaceJson({
        version: 2,
        files: [
          createScanFilePayload({
            id: 'scan-default',
            name: 'Scan Default',
            parentCaseId: 'case-a',
          }),
          createScanFilePayload({
            id: 'scan-custom',
            name: 'Scan Custom',
            parentCaseId: 'case-a',
            scanOcrModel: 'llama3.2-vision',
            scanOcrPrompt: 'Use this custom OCR prompt.',
          }),
          createCaseFilePayload({ id: 'case-a', name: 'Case A' }),
        ],
      })
    );

    const defaultScan = workspace.files.find(
      (file: CaseResolverFile) => file.id === 'scan-default'
    );
    expect(defaultScan?.scanOcrModel).toBe('');
    expect(defaultScan?.scanOcrPrompt).toBe(DEFAULT_CASE_RESOLVER_SCANFILE_OCR_PROMPT);

    const customScan = workspace.files.find((file: CaseResolverFile) => file.id === 'scan-custom');
    expect(customScan?.scanOcrModel).toBe('llama3.2-vision');
    expect(customScan?.scanOcrPrompt).toBe('Use this custom OCR prompt.');
  });
});
