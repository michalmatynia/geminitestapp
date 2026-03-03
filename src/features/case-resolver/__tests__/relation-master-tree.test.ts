import { describe, expect, it } from 'vitest';

import type { NodeFileDocumentSearchRow } from '@/features/case-resolver/components/CaseResolverNodeFileUtils';
import { buildRelationMasterTree } from '@/features/case-resolver/relation-search/tree/relation-master-tree';

const createRow = (input: {
  fileId: string;
  name: string;
  fileType?: 'document' | 'scanfile';
  caseId?: string | null;
  signature?: string;
  folderPath?: string;
  folderSegments?: string[];
}): NodeFileDocumentSearchRow =>
  ({
    file: {
      id: input.fileId,
      name: input.name,
      fileType: input.fileType ?? 'document',
      parentCaseId: input.caseId ?? null,
      folder: input.folderPath ?? '',
      isLocked: false,
      documentDate: null,
    },
    signatureLabel: input.signature ?? '',
    addresserLabel: '',
    addresseeLabel: '',
    folderPath: input.folderPath ?? '',
    folderSegments: input.folderSegments ?? [],
    searchable: input.name.toLowerCase(),
  }) as unknown as NodeFileDocumentSearchRow;

describe('buildRelationMasterTree', () => {
  it('builds deterministic case/folder/file hierarchy', () => {
    const rows: NodeFileDocumentSearchRow[] = [
      createRow({
        fileId: 'f-1',
        name: 'Doc 1',
        caseId: 'case-1',
        signature: 'SIG/1',
        folderPath: 'A/B',
        folderSegments: ['A', 'B'],
      }),
      createRow({
        fileId: 'f-2',
        name: 'Doc 2',
        caseId: 'case-1',
        signature: 'SIG/1',
      }),
      createRow({
        fileId: 'f-3',
        name: 'Scan 1',
        fileType: 'scanfile',
        caseId: 'case-2',
        signature: 'SIG/2',
        folderPath: 'Inbound',
        folderSegments: ['Inbound'],
      }),
    ];

    const result = buildRelationMasterTree({ rows });
    const caseNodes = result.nodes.filter((node) => node.kind === 'relation_case');
    const folderNodes = result.nodes.filter((node) => node.kind === 'relation_folder');
    const fileNodes = result.nodes.filter((node) => node.kind === 'relation_file');

    expect(caseNodes).toHaveLength(2);
    expect(folderNodes.some((node) => node.name === 'A')).toBe(true);
    expect(folderNodes.some((node) => node.name === 'B')).toBe(true);
    expect(fileNodes).toHaveLength(3);
    expect(result.lookup.fileNodeIdByFileId.has('f-1')).toBe(true);
    expect(result.lookup.fileNodeIdByFileId.has('f-2')).toBe(true);
    expect(result.lookup.fileNodeIdByFileId.has('f-3')).toBe(true);
  });

  it('keeps matching-file ancestors visible when input rows are prefiltered', () => {
    const rows: NodeFileDocumentSearchRow[] = [
      createRow({
        fileId: 'f-target',
        name: 'Target',
        caseId: 'case-99',
        signature: 'SIG/99',
        folderPath: 'Deep/Nested',
        folderSegments: ['Deep', 'Nested'],
      }),
    ];

    const result = buildRelationMasterTree({ rows });

    expect(result.nodes.some((node) => node.kind === 'relation_case' && node.name === 'SIG/99')).toBe(
      true
    );
    expect(result.nodes.some((node) => node.kind === 'relation_folder' && node.name === 'Deep')).toBe(
      true
    );
    expect(
      result.nodes.some((node) => node.kind === 'relation_folder' && node.name === 'Nested')
    ).toBe(true);
    expect(
      result.nodes.some(
        (node) => node.kind === 'relation_file' && result.lookup.fileRowByNodeId.get(node.id)?.file.id === 'f-target'
      )
    ).toBe(true);
  });
});
