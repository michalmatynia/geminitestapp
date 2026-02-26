import { describe, expect, it } from 'vitest';

import {
  buildCaseResolverCaseHref,
  sortCaseTreeNodes,
} from '@/features/case-resolver/components/list/case-list-utils';
import { toCaseResolverCaseNodeId } from '@/features/case-resolver/master-tree';
import type { CaseResolverFile } from '@/shared/contracts/case-resolver';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

const buildCaseFile = (
  id: string,
  name: string,
  happeningDate: string | null
): CaseResolverFile =>
  ({
    id,
    workspaceId: 'workspace-1',
    name,
    fileType: 'case',
    folder: '',
    referenceCaseIds: [],
    documentContent: '',
    version: 1,
    scanSlots: [],
    documentContentVersion: 1,
    documentContentFormatVersion: 1,
    activeDocumentVersion: 'original',
    editorType: 'plain-text',
    documentContentPlainText: '',
    documentContentHtml: '',
    documentContentMarkdown: '',
    documentHistory: [],
    documentConversionWarnings: [],
    scanOcrModel: 'gpt-4o-mini',
    scanOcrPrompt: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    happeningDate,
  }) as unknown as CaseResolverFile;

const buildCaseNode = (
  caseId: string,
  name: string,
  sortOrder: number
): MasterTreeNode => ({
  id: toCaseResolverCaseNodeId(caseId),
  type: 'folder',
  kind: 'case_entry',
  parentId: null,
  name,
  path: name.toLowerCase(),
  sortOrder,
});

describe('case list utilities', () => {
  it('builds case resolver href with encoded fileId', () => {
    expect(buildCaseResolverCaseHref('case-123')).toBe('/admin/case-resolver?fileId=case-123');
    expect(buildCaseResolverCaseHref('case/with space')).toBe(
      '/admin/case-resolver?fileId=case%2Fwith%20space',
    );
  });

  it('never returns template interpolation literal in href', () => {
    expect(buildCaseResolverCaseHref('case-123')).not.toContain('${encodeURIComponent(');
  });

  it('sorts case tree nodes by happening date ascending', () => {
    const filesById = new Map<string, CaseResolverFile>([
      ['case-1', buildCaseFile('case-1', 'Case 1', '2026-04-11')],
      ['case-2', buildCaseFile('case-2', 'Case 2', '2026-02-10')],
      ['case-3', buildCaseFile('case-3', 'Case 3', null)],
    ]);

    const sorted = sortCaseTreeNodes({
      nodes: [
        buildCaseNode('case-1', 'Case 1', 0),
        buildCaseNode('case-2', 'Case 2', 1),
        buildCaseNode('case-3', 'Case 3', 2),
      ],
      filesById,
      caseIdentifierPathById: new Map<string, string>(),
      sortBy: 'happeningDate',
      sortOrder: 'asc',
    });

    const sortOrderByNodeId = new Map<string, number>(
      sorted.map((node: MasterTreeNode): [string, number] => [node.id, node.sortOrder])
    );
    expect(sortOrderByNodeId.get(toCaseResolverCaseNodeId('case-2'))).toBe(0);
    expect(sortOrderByNodeId.get(toCaseResolverCaseNodeId('case-1'))).toBe(1);
    expect(sortOrderByNodeId.get(toCaseResolverCaseNodeId('case-3'))).toBe(2);
  });

  it('sorts case tree nodes by happening date descending', () => {
    const filesById = new Map<string, CaseResolverFile>([
      ['case-1', buildCaseFile('case-1', 'Case 1', '2026-04-11')],
      ['case-2', buildCaseFile('case-2', 'Case 2', '2026-02-10')],
      ['case-3', buildCaseFile('case-3', 'Case 3', null)],
    ]);

    const sorted = sortCaseTreeNodes({
      nodes: [
        buildCaseNode('case-1', 'Case 1', 0),
        buildCaseNode('case-2', 'Case 2', 1),
        buildCaseNode('case-3', 'Case 3', 2),
      ],
      filesById,
      caseIdentifierPathById: new Map<string, string>(),
      sortBy: 'happeningDate',
      sortOrder: 'desc',
    });

    const sortOrderByNodeId = new Map<string, number>(
      sorted.map((node: MasterTreeNode): [string, number] => [node.id, node.sortOrder])
    );
    expect(sortOrderByNodeId.get(toCaseResolverCaseNodeId('case-1'))).toBe(0);
    expect(sortOrderByNodeId.get(toCaseResolverCaseNodeId('case-2'))).toBe(1);
    expect(sortOrderByNodeId.get(toCaseResolverCaseNodeId('case-3'))).toBe(2);
  });
});
