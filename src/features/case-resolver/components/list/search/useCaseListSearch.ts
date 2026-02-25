import { useMemo } from 'react';

import type { CaseResolverFile } from '@/shared/contracts/case-resolver';

import {
  normalizeSearchText,
  resolveSearchableDocumentContent,
  resolveIdentifierSearchLabel,
} from '../../CaseResolverNodeFileUtils';

export type CaseListSearchMatchedFile = {
  file: CaseResolverFile;
  folderPath: string;
  signatureLabel: string;
};

export type CaseListSearchEntry = {
  caseFile: CaseResolverFile;
  signatureLabel: string;
  caseMatched: boolean;
  matchedFiles: CaseListSearchMatchedFile[];
};

export function useCaseListSearch(
  workspaceFiles: CaseResolverFile[],
  identifierLabelById: Map<string, string>,
  query: string,
): { entries: CaseListSearchEntry[]; isActive: boolean } {
  const trimmed = query.trim();
  const isActive = trimmed.length > 0;

  const entries = useMemo((): CaseListSearchEntry[] => {
    if (!isActive) return [];

    const normalized = normalizeSearchText(trimmed);

    const caseFiles: CaseResolverFile[] = [];
    const docFiles: CaseResolverFile[] = [];

    for (const file of workspaceFiles) {
      if (file.fileType === 'case') {
        caseFiles.push(file);
      } else {
        docFiles.push(file);
      }
    }

    // Determine which cases match by name or identifier
    const caseMatchedIds = new Set<string>();
    const caseSignatureLabelById = new Map<string, string>();

    for (const caseFile of caseFiles) {
      const signatureLabel = resolveIdentifierSearchLabel(
        caseFile.caseIdentifierId,
        identifierLabelById,
      );
      caseSignatureLabelById.set(caseFile.id, signatureLabel);
      const searchable = normalizeSearchText(
        `${caseFile.name} ${signatureLabel}`,
      );
      if (searchable.includes(normalized)) {
        caseMatchedIds.add(caseFile.id);
      }
    }

    // Match doc files and group by parentCaseId
    const matchedFilesByCaseId = new Map<string, CaseListSearchMatchedFile[]>();

    for (const file of docFiles) {
      const searchable = normalizeSearchText(
        `${file.name} ${file.folder} ${resolveSearchableDocumentContent(file)}`,
      );
      if (!searchable.includes(normalized)) continue;

      const parentCaseId = file.parentCaseId;
      if (!parentCaseId) continue;

      const signatureLabel = resolveIdentifierSearchLabel(
        file.caseIdentifierId,
        identifierLabelById,
      );

      const existing = matchedFilesByCaseId.get(parentCaseId) ?? [];
      existing.push({ file, folderPath: file.folder, signatureLabel });
      matchedFilesByCaseId.set(parentCaseId, existing);
    }

    // Build entries: include a case if it matched by name/id OR has matched files
    const result: CaseListSearchEntry[] = [];

    for (const caseFile of caseFiles) {
      const caseMatched = caseMatchedIds.has(caseFile.id);
      const matchedFiles = matchedFilesByCaseId.get(caseFile.id) ?? [];
      if (!caseMatched && matchedFiles.length === 0) continue;

      result.push({
        caseFile,
        signatureLabel: caseSignatureLabelById.get(caseFile.id) ?? '',
        caseMatched,
        matchedFiles,
      });
    }

    // Sort: caseMatched=true first, then alphabetically
    result.sort((a, b) => {
      if (a.caseMatched !== b.caseMatched) {
        return a.caseMatched ? -1 : 1;
      }
      return a.caseFile.name.localeCompare(b.caseFile.name);
    });

    return result;
  }, [isActive, trimmed, workspaceFiles, identifierLabelById]);

  return { entries, isActive };
}
