import { useCallback, useMemo } from 'react';
import type {
  CaseResolverCategory,
  CaseResolverFile,
  CaseResolverIdentifier,
  CaseResolverTag,
  CaseResolverWorkspace,
} from '@/shared/contracts/case-resolver';
import type { FilemakerDatabase } from '@/shared/contracts/filemaker';
import {
  buildFilemakerPartyOptions,
} from '@/features/filemaker/settings';
import { buildPathLabelMap } from '../pages/admin-case-resolver-page-helpers';

export function useAdminCaseResolverMetadataActions({
  workspace,
  updateWorkspace,
  caseResolverTags,
  caseResolverIdentifiers,
  caseResolverCategories,
  filemakerDatabase,
  activeCaseFile,
}: {
  workspace: CaseResolverWorkspace;
  updateWorkspace: (
    updater: (current: CaseResolverWorkspace) => CaseResolverWorkspace,
    options?: { persistToast?: string; persistNow?: boolean; mutationId?: string; source?: string; skipNormalization?: boolean }
  ) => void;
  caseResolverTags: CaseResolverTag[];
  caseResolverIdentifiers: CaseResolverIdentifier[];
  caseResolverCategories: CaseResolverCategory[];
  filemakerDatabase: FilemakerDatabase;
  activeCaseFile: CaseResolverFile | null;
}) {
  const caseTagPathById = useMemo(
    () => buildPathLabelMap(caseResolverTags),
    [caseResolverTags]
  );
  const caseIdentifierPathById = useMemo(
    () => buildPathLabelMap(caseResolverIdentifiers),
    [caseResolverIdentifiers]
  );
  const caseCategoryPathById = useMemo(
    () => buildPathLabelMap(caseResolverCategories),
    [caseResolverCategories]
  );
  
  const caseTagOptions = useMemo(
    () => [
      { value: '__none__', label: caseResolverTags.length > 0 ? 'No tag' : 'No tags' },
      ...caseResolverTags.map((tag: CaseResolverTag) => ({
        value: tag.id,
        label: caseTagPathById.get(tag.id) ?? tag.label,
      })),
    ],
    [caseResolverTags, caseTagPathById]
  );
  
  const caseIdentifierOptions = useMemo(
    () => [
      {
        value: '__none__',
        label: caseResolverIdentifiers.length > 0 ? 'No case identifier' : 'No case identifiers',
      },
      ...caseResolverIdentifiers.map((identifier: CaseResolverIdentifier) => ({
        value: identifier.id,
        label: caseIdentifierPathById.get(identifier.id) ?? identifier.label ?? identifier.name ?? '',
      })),
    ],
    [caseIdentifierPathById, caseResolverIdentifiers]
  );
  
  const caseCategoryOptions = useMemo(
    () => [
      { value: '__none__', label: caseResolverCategories.length > 0 ? 'No category' : 'No categories' },
      ...caseResolverCategories.map((category: CaseResolverCategory) => ({
        value: category.id,
        label: caseCategoryPathById.get(category.id) ?? category.name,
      })),
    ],
    [caseCategoryPathById, caseResolverCategories]
  );
  
  const caseReferenceOptions = useMemo(
    () =>
      workspace.files
        .filter((file) => file.fileType === 'case')
        .map((file) => ({
          value: file.id,
          label: file.folder ? `${file.name} (${file.folder})` : file.name,
        }))
        .sort((left, right) => left.label.localeCompare(right.label)),
    [workspace.files]
  );
  
  const parentCaseOptions = useMemo(
    () => [{ value: '__none__', label: 'No parent (root case)' }, ...caseReferenceOptions],
    [caseReferenceOptions]
  );
  
  const partyOptions = useMemo(
    () => buildFilemakerPartyOptions(filemakerDatabase),
    [filemakerDatabase]
  );

  const handleUpdateActiveCaseMetadata = useCallback(
    (
      patch: Partial<
        Pick<
          CaseResolverFile,
          | 'name'
          | 'parentCaseId'
          | 'referenceCaseIds'
          | 'tagId'
          | 'caseIdentifierId'
          | 'categoryId'
          | 'caseStatus'
          | 'happeningDate'
        >
      >,
    ): void => {
      if (!activeCaseFile) return;
      if (activeCaseFile.isLocked) return;

      updateWorkspace(
        (current: CaseResolverWorkspace) => {
          const currentCase = current.files.find(
            (file: CaseResolverFile): boolean =>
              file.id === activeCaseFile.id && file.fileType === 'case',
          );
          if (!currentCase || currentCase.isLocked) return current;

          const hasNamePatch = Object.prototype.hasOwnProperty.call(
            patch,
            'name',
          );
          const hasParentCasePatch = Object.prototype.hasOwnProperty.call(
            patch,
            'parentCaseId',
          );
          const hasReferencePatch = Object.prototype.hasOwnProperty.call(
            patch,
            'referenceCaseIds',
          );
          const hasTagPatch = Object.prototype.hasOwnProperty.call(
            patch,
            'tagId',
          );
          const hasCaseIdentifierPatch = Object.prototype.hasOwnProperty.call(
            patch,
            'caseIdentifierId',
          );
          const hasCategoryPatch = Object.prototype.hasOwnProperty.call(
            patch,
            'categoryId',
          );
          const hasCaseStatusPatch = Object.prototype.hasOwnProperty.call(
            patch,
            'caseStatus',
          );
          const hasHappeningDatePatch = Object.prototype.hasOwnProperty.call(
            patch,
            'happeningDate',
          );

          const nextName = hasNamePatch
            ? patch.name?.trim() || currentCase.name || 'Untitled Case'
            : currentCase.name;
          const rawParentCaseId = hasParentCasePatch
            ? (patch.parentCaseId ?? null)
            : currentCase.parentCaseId;
          const nextParentCaseId = rawParentCaseId?.trim()
            ? rawParentCaseId.trim()
            : null;
          const normalizedParentCaseId =
            nextParentCaseId === currentCase.id ? null : nextParentCaseId;
          const nextReferenceCaseIds = hasReferencePatch
            ? Array.from(
              new Set(
                (patch.referenceCaseIds ?? [])
                  .map((value: string): string => value.trim())
                  .filter(
                    (value: string): boolean =>
                      value.length > 0 && value !== currentCase.id,
                  ),
              ),
            )
            : currentCase.referenceCaseIds;

          const nextTagId = hasTagPatch
            ? patch.tagId?.trim() || null
            : currentCase.tagId;
          const nextCaseIdentifierId = hasCaseIdentifierPatch
            ? patch.caseIdentifierId?.trim() || null
            : currentCase.caseIdentifierId;
          const nextCategoryId = hasCategoryPatch
            ? patch.categoryId?.trim() || null
            : currentCase.categoryId;
          const nextCaseStatus = hasCaseStatusPatch
            ? patch.caseStatus
            : currentCase.caseStatus;
          const nextHappeningDate = hasHappeningDatePatch
            ? patch.happeningDate?.trim() || null
            : currentCase.happeningDate ?? null;

          const now = new Date().toISOString();
          const nextCase: CaseResolverFile = {
            ...currentCase,
            name: nextName,
            parentCaseId: normalizedParentCaseId,
            referenceCaseIds: nextReferenceCaseIds,
            tagId: nextTagId,
            caseIdentifierId: nextCaseIdentifierId,
            categoryId: nextCategoryId,
            caseStatus: nextCaseStatus,
            happeningDate: nextHappeningDate,
            updatedAt: now,
          };

          return {
            ...current,
            files: current.files.map((file) =>
              file.id === activeCaseFile.id ? nextCase : file,
            ),
            updatedAt: now,
          };
        },
        { persistToast: 'Case metadata updated.' },
      );
    },
    [activeCaseFile, updateWorkspace],
  );

  return {
    caseTagOptions,
    caseIdentifierOptions,
    caseCategoryOptions,
    caseReferenceOptions,
    parentCaseOptions,
    partyOptions,
    handleUpdateActiveCaseMetadata,
  };
}
