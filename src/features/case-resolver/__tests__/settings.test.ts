import { describe, expect, it } from 'vitest';

import type { AiNode } from '@/features/ai/ai-paths/lib';
import {
  inferCaseResolverAssetKind,
  normalizeCaseResolverTags,
  parseCaseResolverSettings,
  parseCaseResolverWorkspace,
  resolveCaseResolverUploadFolder,
} from '@/features/case-resolver/settings';
import { DEFAULT_CASE_RESOLVER_NODE_META } from '@/features/case-resolver/types';

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
    expect(workspace.files[0]?.addresser).toEqual({ kind: 'person', id: 'p-1' });
    expect(workspace.files[0]?.addressee).toBeNull();
    expect(workspace.folders).toEqual(['Root_A', 'Root_A/Sub__']);
    expect(workspace.activeFileId).toBe('dup-file');
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
});
