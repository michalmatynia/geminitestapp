import { describe, expect, it } from 'vitest';

import {
  DEFAULT_CASE_RESOLVER_OCR_PROMPT,
  extractCaseResolverDocumentDate,
  inferCaseResolverAssetKind,
  normalizeCaseResolverIdentifiers,
  normalizeCaseResolverTags,
  parseCaseResolverDefaultDocumentFormat,
  parseCaseResolverIdentifiers,
  parseCaseResolverSettings,
  resolveCaseResolverUploadFolder,
} from '@/features/case-resolver/settings';

describe('case-resolver settings', () => {
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
    expect(parseCaseResolverDefaultDocumentFormat(JSON.stringify({ editorType: 'wysiwyg' }))).toBe(
      'wysiwyg'
    );
    expect(parseCaseResolverDefaultDocumentFormat(JSON.stringify({ editorType: 'markdown' }))).toBe(
      'markdown'
    );
    expect(parseCaseResolverDefaultDocumentFormat('invalid-value')).toBe('wysiwyg');
    expect(parseCaseResolverDefaultDocumentFormat('invalid-value', 'wysiwyg')).toBe('wysiwyg');
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

    const byId = new Map<string, (typeof tags)[number]>(tags.map((tag) => [tag.id, tag]));
    expect(byId.get('child')?.parentId).toBe('parent');
    expect(byId.get('parent')?.parentId).toBeNull();
    expect(byId.get('orphan')?.parentId).toBeNull();
    expect(byId.get('self')?.parentId).toBeNull();
    expect(byId.get('cycle-a')?.parentId).toBeNull();
    expect(byId.get('cycle-b')?.parentId).toBeNull();
    expect(tags.map((tag) => tag.id)).toEqual([
      'cycle-a',
      'cycle-b',
      'orphan',
      'parent',
      'child',
      'self',
    ]);
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

    const byId = new Map<string, (typeof identifiers)[number]>(
      identifiers.map((identifier) => [identifier.id, identifier])
    );
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
});
