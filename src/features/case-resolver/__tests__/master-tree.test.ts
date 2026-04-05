import { describe, expect, it } from 'vitest';

import {
  buildMasterCaseContentNodesFromCaseResolverWorkspace,
  buildMasterCaseNodesFromCaseResolverWorkspace,
  buildMasterNodesFromCaseResolverWorkspace,
  toCaseResolverCaseNodeId,
  toCaseResolverCaseContentFileNodeId,
  toCaseResolverCaseContentFolderNodeId,
} from '@/features/case-resolver/master-tree';
import {
  createCaseResolverAssetFile,
  createCaseResolverFile,
  createEmptyCaseResolverRelationGraph,
} from '@/features/case-resolver/settings';
import type { CaseResolverWorkspace } from '@/shared/contracts/case-resolver/workspace';
import { buildMasterTree } from '@/shared/utils/master-folder-tree-engine';

describe('case-resolver master tree', () => {
  it('orders siblings by type first (folders first) then alphabetically', () => {
    const workspace: CaseResolverWorkspace = {
      id: 'test-workspace',
      name: 'Test Workspace',
      ownerId: 'owner-1',
      isPublic: false,
      version: 2,
      workspaceRevision: 0,
      lastMutationId: null,
      lastMutationAt: null,
      folders: ['beta', 'alpha', 'alpha/sub'],
      folderRecords: [],
      folderTimestamps: {},
      files: [
        createCaseResolverFile({
          id: 'case-root-hidden',
          name: 'Case Root',
          fileType: 'case',
          folder: '',
        }),
        createCaseResolverFile({ id: 'file-root-z', name: 'zeta', folder: '' }),
        createCaseResolverFile({ id: 'file-root-a', name: 'apple', folder: '' }),
        createCaseResolverFile({ id: 'file-alpha-z', name: 'zulu', folder: 'alpha' }),
      ],
      assets: [
        createCaseResolverAssetFile({
          id: 'asset-root-m',
          name: 'middle.png',
          folder: '',
          kind: 'image',
          filepath: '/uploads/case-resolver/assets/middle.png',
        }),
        createCaseResolverAssetFile({
          id: 'asset-alpha-a',
          name: 'able.pdf',
          folder: 'alpha',
          kind: 'pdf',
        }),
      ],
      relationGraph: createEmptyCaseResolverRelationGraph(),
      activeFileId: 'file-root-a',
    };

    const nodes = buildMasterNodesFromCaseResolverWorkspace(workspace);
    const tree = buildMasterTree(nodes);

    expect(tree.roots.map((node) => node.name)).toEqual([
      'alpha',
      'beta',
      'apple',
      'middle.png',
      'zeta',
    ]);

    const alphaNode = tree.roots.find((node) => node.name === 'alpha');
    expect(alphaNode?.children.map((node) => node.name)).toEqual(['sub', 'able.pdf', 'zulu']);
  });

  it('hides image placeholders without uploaded file paths', () => {
    const workspace: CaseResolverWorkspace = {
      id: 'test-workspace-2',
      name: 'Test Workspace 2',
      ownerId: 'owner-1',
      isPublic: false,
      version: 2,
      workspaceRevision: 0,
      lastMutationId: null,
      lastMutationAt: null,
      folders: ['alpha'],
      folderRecords: [],
      folderTimestamps: {},
      files: [
        createCaseResolverFile({
          id: 'case-root-hidden',
          name: 'Case Root',
          fileType: 'case',
          folder: '',
        }),
      ],
      assets: [
        createCaseResolverAssetFile({
          id: 'asset-placeholder',
          name: 'placeholder.png',
          folder: 'alpha',
          kind: 'image',
        }),
        createCaseResolverAssetFile({
          id: 'asset-uploaded',
          name: 'uploaded.png',
          folder: 'alpha',
          kind: 'image',
          filepath: '/uploads/case-resolver/assets/uploaded.png',
        }),
      ],
      relationGraph: createEmptyCaseResolverRelationGraph(),
      activeFileId: null,
    };

    const nodes = buildMasterNodesFromCaseResolverWorkspace(workspace);
    const tree = buildMasterTree(nodes);
    const alphaNode = tree.roots.find((node) => node.name === 'alpha');

    expect(alphaNode?.children.map((node) => node.name)).toEqual(['uploaded.png']);
  });

  it('builds case hierarchy nodes with persistent sibling order', () => {
    const workspace: CaseResolverWorkspace = {
      id: 'case-tree-workspace',
      name: 'Case Tree Workspace',
      ownerId: 'owner-1',
      isPublic: false,
      version: 2,
      workspaceRevision: 0,
      lastMutationId: null,
      lastMutationAt: null,
      folders: [],
      folderRecords: [],
      folderTimestamps: {},
      files: [
        createCaseResolverFile({
          id: 'case-root-b',
          name: 'Root B',
          fileType: 'case',
          folder: '',
          caseTreeOrder: 1,
        }),
        createCaseResolverFile({
          id: 'case-root-a',
          name: 'Root A',
          fileType: 'case',
          folder: '',
          caseTreeOrder: 0,
        }),
        createCaseResolverFile({
          id: 'case-child-a1',
          name: 'Child A1',
          fileType: 'case',
          folder: '',
          parentCaseId: 'case-root-a',
          caseTreeOrder: 0,
        }),
        createCaseResolverFile({
          id: 'doc-hidden',
          name: 'Hidden document',
          fileType: 'document',
          folder: '',
          parentCaseId: 'case-root-a',
        }),
      ],
      assets: [],
      relationGraph: createEmptyCaseResolverRelationGraph(),
      activeFileId: 'case-root-a',
    };

    const caseNodes = buildMasterCaseNodesFromCaseResolverWorkspace(workspace);
    const tree = buildMasterTree(caseNodes);

    expect(tree.roots.map((node) => node.id)).toEqual([
      toCaseResolverCaseNodeId('case-root-a'),
      toCaseResolverCaseNodeId('case-root-b'),
    ]);
    expect(tree.roots[0]?.children.map((node) => node.id)).toEqual([
      toCaseResolverCaseNodeId('case-child-a1'),
    ]);
    expect(caseNodes.every((node) => node.kind === 'case_entry')).toBe(true);
    expect(caseNodes.every((node) => node.type === 'folder')).toBe(true);
  });

  it('builds nested case content nodes only for the requested case scope', () => {
    const workspace: CaseResolverWorkspace = {
      id: 'case-content-workspace',
      name: 'Case Content Workspace',
      ownerId: 'owner-1',
      isPublic: false,
      version: 2,
      workspaceRevision: 0,
      lastMutationId: null,
      lastMutationAt: null,
      folders: [],
      folderRecords: [
        { path: 'root-folder', ownerCaseId: 'case-root' },
        { path: 'child-folder', ownerCaseId: 'case-child' },
      ],
      folderTimestamps: {},
      files: [
        createCaseResolverFile({
          id: 'case-root',
          name: 'Root Case',
          fileType: 'case',
          folder: '',
        }),
        createCaseResolverFile({
          id: 'case-child',
          name: 'Child Case',
          fileType: 'case',
          folder: '',
          parentCaseId: 'case-root',
        }),
        createCaseResolverFile({
          id: 'doc-root',
          name: 'Root Doc',
          fileType: 'document',
          folder: 'root-folder/evidence',
          parentCaseId: 'case-root',
        }),
        createCaseResolverFile({
          id: 'scan-child',
          name: 'Child Scan',
          fileType: 'scanfile',
          folder: 'child-folder',
          parentCaseId: 'case-child',
        }),
      ],
      assets: [],
      relationGraph: createEmptyCaseResolverRelationGraph(),
      activeFileId: null,
    };

    const scopedNodes = buildMasterCaseContentNodesFromCaseResolverWorkspace({
      workspace,
      includeCaseIds: new Set<string>(['case-root']),
    });

    expect(
      scopedNodes.some(
        (node) => node.id === toCaseResolverCaseContentFileNodeId('case-root', 'doc-root')
      )
    ).toBe(true);
    expect(
      scopedNodes.some(
        (node) => node.id === toCaseResolverCaseContentFileNodeId('case-child', 'scan-child')
      )
    ).toBe(false);
    expect(
      scopedNodes.some(
        (node) =>
          node.id === toCaseResolverCaseContentFolderNodeId('case-root', 'root-folder/evidence')
      )
    ).toBe(true);
    expect(
      scopedNodes.some(
        (node) => node.id === toCaseResolverCaseContentFolderNodeId('case-child', 'child-folder')
      )
    ).toBe(false);
  });
});
