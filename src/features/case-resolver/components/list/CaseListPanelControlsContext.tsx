import type { CaseSortKey } from '@/features/case-resolver/context/admin-cases/types';
import type { CaseResolverFile } from '@/shared/contracts/case-resolver/file';
import type { CaseResolverWorkspace } from '@/shared/contracts/case-resolver/workspace';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

import type { Dispatch, SetStateAction } from 'react';

export type CaseListPanelControlsContextValue = {
  caseSortBy: CaseSortKey;
  setCaseSortBy: (value: CaseSortKey) => void;
  caseSortOrder: 'asc' | 'desc';
  setCaseSortOrder: (value: 'asc' | 'desc') => void;
  onCreateCase: () => void;
  totalCount: number;
  filteredCount: number;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  onPageSizeChange: (pageSize: number) => void;
  onSearchChange?: ((query: string) => void) | undefined;
  isHierarchyLocked: boolean;
  setIsHierarchyLocked: Dispatch<SetStateAction<boolean>>;
  caseShowNestedContent: boolean;
  setCaseShowNestedContent: (value: boolean) => void;
  handleSaveDefaults: () => Promise<void>;
  isSavingDefaults: boolean;
  heldCaseFile: CaseResolverFile | null;
  workspace: CaseResolverWorkspace;
  identifierLabelById: Map<string, string>;
  searchQuery: string;
  caseOrderById?: Map<string, number> | undefined;
  onPrefetchCase: (caseId: string) => void;
  onPrefetchFile: (file: CaseResolverFile) => void;
  onOpenCase: (caseId: string) => void;
  onOpenFile: (file: CaseResolverFile) => void;
  onClearHeldCase: () => void;
};

export const {
  Context: CaseListPanelControlsContext,
  useStrictContext: useCaseListPanelControlsContext,
  useOptionalContext: useOptionalCaseListPanelControlsContext,
} = createStrictContext<CaseListPanelControlsContextValue>({
  hookName: 'useCaseListPanelControlsContext',
  providerName: 'CaseListPanelControlsProvider',
  displayName: 'CaseListPanelControlsContext',
});
