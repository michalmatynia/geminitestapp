import {
  normalizeSearchText,
  normalizeFolderPathSegments,
  isFolderPathWithinScope,
  resolvePartyReferenceSearchLabel,
  resolveIdentifierSearchLabel,
  resolveContentPreview,
  resolveSearchableDocumentContent,
  isDocumentWysiwygTextPort,
  isDocumentPlaintextContentPort,
  isDocumentPlainTextPort,
  isDocumentWysiwygContentPort,
  resolveOutputValueByPort,
  appendWithJoinMode,
} from '@/features/case-resolver/services/tree';
import type {
  CaseResolverFile,
  NodeFileDocumentSearchScope,
  NodeFileDocumentSearchRow,
  NodeFileDocumentFolderNode,
  NodeFileDocumentFolderTree,
} from '@/shared/contracts/case-resolver';

export type {
  NodeFileDocumentSearchScope,
  NodeFileDocumentSearchRow,
  NodeFileDocumentFolderNode,
  NodeFileDocumentFolderTree,
};

export {
  appendWithJoinMode,
  isDocumentPlainTextPort,
  isDocumentPlaintextContentPort,
  isDocumentWysiwygContentPort,
  isDocumentWysiwygTextPort,
  isFolderPathWithinScope,
  normalizeFolderPathSegments,
  normalizeSearchText,
  resolveContentPreview,
  resolveIdentifierSearchLabel,
  resolveOutputValueByPort,
  resolvePartyReferenceSearchLabel,
  resolveSearchableDocumentContent,
};

export const collectScopedCaseIds = (
  files: CaseResolverFile[],
  rootCaseId: string | null
): Set<string> | null => {
  if (!rootCaseId) return null;
  const caseById = new Map(
    files
      .filter((file: CaseResolverFile): boolean => file.fileType === 'case')
      .map((file: CaseResolverFile): [string, CaseResolverFile] => [file.id, file])
  );
  if (!caseById.has(rootCaseId)) return null;

  const childrenByParent = new Map<string, string[]>();
  caseById.forEach((file: CaseResolverFile): void => {
    const parentCaseId = typeof file.parentCaseId === 'string' ? file.parentCaseId.trim() : '';
    if (!parentCaseId || parentCaseId === file.id || !caseById.has(parentCaseId)) return;
    const currentChildren = childrenByParent.get(parentCaseId) ?? [];
    currentChildren.push(file.id);
    childrenByParent.set(parentCaseId, currentChildren);
  });

  const scoped = new Set<string>();
  const visit = (caseId: string): void => {
    if (!caseId || scoped.has(caseId) || !caseById.has(caseId)) return;
    scoped.add(caseId);
    const children = childrenByParent.get(caseId) ?? [];
    children.forEach((childCaseId: string): void => visit(childCaseId));
  };

  visit(rootCaseId);
  return scoped.size > 0 ? scoped : null;
};
