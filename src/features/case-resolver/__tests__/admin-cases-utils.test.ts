import { describe, expect, it } from 'vitest';

import {
  shouldBootstrapCaseResolverCasesFromRecord,
  shouldAdoptIncomingCaseResolverCasesWorkspace,
} from '@/features/case-resolver/context/admin-cases/utils';
import {
  createCaseResolverFile,
  createEmptyCaseResolverRelationGraph,
  parseCaseResolverWorkspace,
} from '@/features/case-resolver/settings';
import type { CaseResolverWorkspace } from '@/shared/contracts/case-resolver/workspace';

describe('admin case resolver cases workspace adoption', () => {
  it('adopts equal-revision incoming workspace when current state is a placeholder', () => {
    const current = parseCaseResolverWorkspace(null);
    const incoming: CaseResolverWorkspace = {
      ...parseCaseResolverWorkspace(null),
      id: 'workspace-real',
      files: [
        createCaseResolverFile({
          id: 'case-1',
          name: 'Case One',
          fileType: 'case',
          folder: '',
        }),
      ],
      relationGraph: createEmptyCaseResolverRelationGraph(),
      workspaceRevision: 0,
      lastMutationId: null,
    };

    expect(
      shouldAdoptIncomingCaseResolverCasesWorkspace({
        current,
        incoming,
      })
    ).toBe(true);
  });

  it('does not replace a populated workspace with an equal-revision equivalent snapshot', () => {
    const current: CaseResolverWorkspace = {
      ...parseCaseResolverWorkspace(null),
      id: 'workspace-real',
      files: [
        createCaseResolverFile({
          id: 'case-1',
          name: 'Case One',
          fileType: 'case',
          folder: '',
        }),
      ],
      relationGraph: createEmptyCaseResolverRelationGraph(),
      workspaceRevision: 0,
      lastMutationId: null,
    };
    const incoming: CaseResolverWorkspace = {
      ...current,
    };

    expect(
      shouldAdoptIncomingCaseResolverCasesWorkspace({
        current,
        incoming,
      })
    ).toBe(false);
  });

  it('adopts equal-revision incoming workspace when current has no case files and incoming has cases', () => {
    const current: CaseResolverWorkspace = {
      ...parseCaseResolverWorkspace(null),
      id: 'workspace-current',
      files: [
        createCaseResolverFile({
          id: 'document-1',
          name: 'Document One',
          fileType: 'document',
          folder: '',
          parentCaseId: null,
        }),
      ],
      relationGraph: createEmptyCaseResolverRelationGraph(),
      workspaceRevision: 0,
      lastMutationId: null,
    };
    const incoming: CaseResolverWorkspace = {
      ...parseCaseResolverWorkspace(null),
      id: 'workspace-incoming',
      files: [
        createCaseResolverFile({
          id: 'case-1',
          name: 'Case One',
          fileType: 'case',
          folder: '',
        }),
      ],
      relationGraph: createEmptyCaseResolverRelationGraph(),
      workspaceRevision: 0,
      lastMutationId: null,
    };

    expect(
      shouldAdoptIncomingCaseResolverCasesWorkspace({
        current,
        incoming,
      })
    ).toBe(true);
  });

  it('adopts equal-revision incoming workspace when incoming has more case files', () => {
    const current: CaseResolverWorkspace = {
      ...parseCaseResolverWorkspace(null),
      id: 'workspace-current',
      files: [
        createCaseResolverFile({
          id: 'case-1',
          name: 'Case One',
          fileType: 'case',
          folder: '',
        }),
      ],
      relationGraph: createEmptyCaseResolverRelationGraph(),
      workspaceRevision: 0,
      lastMutationId: null,
    };
    const incoming: CaseResolverWorkspace = {
      ...parseCaseResolverWorkspace(null),
      id: 'workspace-incoming',
      files: [
        createCaseResolverFile({
          id: 'case-1',
          name: 'Case One',
          fileType: 'case',
          folder: '',
        }),
        createCaseResolverFile({
          id: 'case-2',
          name: 'Case Two',
          fileType: 'case',
          folder: '',
        }),
      ],
      relationGraph: createEmptyCaseResolverRelationGraph(),
      workspaceRevision: 0,
      lastMutationId: null,
    };

    expect(
      shouldAdoptIncomingCaseResolverCasesWorkspace({
        current,
        incoming,
      })
    ).toBe(true);
  });

  it('forces keyed record bootstrap for placeholder case-list workspaces', () => {
    expect(shouldBootstrapCaseResolverCasesFromRecord(parseCaseResolverWorkspace(null))).toBe(true);

    const populatedWorkspace: CaseResolverWorkspace = {
      ...parseCaseResolverWorkspace(null),
      id: 'workspace-real',
      files: [
        createCaseResolverFile({
          id: 'case-1',
          name: 'Case One',
          fileType: 'case',
          folder: '',
        }),
      ],
      relationGraph: createEmptyCaseResolverRelationGraph(),
    };

    expect(shouldBootstrapCaseResolverCasesFromRecord(populatedWorkspace)).toBe(false);
  });

  it('forces keyed record bootstrap when workspace has no case files yet', () => {
    const unresolvedWorkspace: CaseResolverWorkspace = {
      ...parseCaseResolverWorkspace(null),
      id: 'workspace-unresolved',
      files: [
        createCaseResolverFile({
          id: 'document-1',
          name: 'Document One',
          fileType: 'document',
          folder: '',
          parentCaseId: null,
        }),
      ],
      relationGraph: createEmptyCaseResolverRelationGraph(),
    };

    expect(shouldBootstrapCaseResolverCasesFromRecord(unresolvedWorkspace)).toBe(true);
  });
});
