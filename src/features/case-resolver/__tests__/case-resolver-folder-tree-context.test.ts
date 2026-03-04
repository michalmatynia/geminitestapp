import { describe, expect, it } from 'vitest';

import { resolveCaseResolverRootTreeNodes } from '@/features/case-resolver/context/CaseResolverFolderTreeContext';
import {
  createCaseResolverAssetFile,
  createCaseResolverFile,
  createEmptyCaseResolverRelationGraph,
  parseCaseResolverWorkspace,
} from '@/features/case-resolver/settings';
import {
  toCaseResolverCaseNodeId,
  toCaseResolverFileNodeId,
} from '@/features/case-resolver/master-tree';
import type { CaseResolverWorkspace } from '@/shared/contracts/case-resolver';

describe('case resolver folder tree root nodes', () => {
  const workspace: CaseResolverWorkspace = {
    ...parseCaseResolverWorkspace(null),
    id: 'workspace-1',
    files: [
      createCaseResolverFile({
        id: 'case-1',
        name: 'Case One',
        fileType: 'case',
        folder: '',
      }),
      createCaseResolverFile({
        id: 'doc-1',
        name: 'Document One',
        fileType: 'document',
        parentCaseId: 'case-1',
        folder: 'evidence',
      }),
    ],
    folders: ['evidence'],
    assets: [
      createCaseResolverAssetFile({
        id: 'asset-1',
        name: 'Image One',
        folder: 'evidence',
        kind: 'image',
        filepath: '/uploads/case-resolver/assets/image-one.png',
        sourceFileId: 'doc-1',
      }),
    ],
    relationGraph: createEmptyCaseResolverRelationGraph(),
  };

  it('shows case nodes when no active case context exists', () => {
    const nodes = resolveCaseResolverRootTreeNodes({
      workspace,
      activeCaseId: null,
    });

    expect(nodes.some((node) => node.id === toCaseResolverCaseNodeId('case-1'))).toBe(true);
    expect(nodes.every((node) => node.kind === 'case_entry')).toBe(true);
  });

  it('shows case content nodes when a case is active', () => {
    const nodes = resolveCaseResolverRootTreeNodes({
      workspace,
      activeCaseId: 'case-1',
    });

    expect(nodes.some((node) => node.id === toCaseResolverFileNodeId('doc-1'))).toBe(true);
    expect(nodes.some((node) => node.id === toCaseResolverCaseNodeId('case-1'))).toBe(false);
  });
});
