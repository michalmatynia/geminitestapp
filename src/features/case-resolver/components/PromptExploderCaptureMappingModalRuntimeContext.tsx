'use client';

import React from 'react';

import type { LabeledOptionWithDescriptionDto } from '@/shared/contracts/base';
import type {
  CaseResolverCaptureDocumentDateAction,
  CaseResolverCaptureProposalState,
} from '@/features/case-resolver-capture';
import type { CaseResolverCaptureAction } from '@/features/case-resolver-capture';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

export type PromptExploderCaptureMappingDiagnostics = {
  status: 'idle' | 'success' | 'failed';
  stage: 'precheck' | 'mutation' | 'rebase' | null;
  message: string;
  targetFileId: string | null;
  resolvedTargetFileId: string | null;
  workspaceRevision: number;
  attempts: number;
  at: string;
  cleanupDurationMs?: number | null;
  mutationDurationMs?: number | null;
  totalDurationMs?: number | null;
};

export type PromptExploderCaptureMappingModalRuntimeValue = {
  open: boolean;
  draft: CaseResolverCaptureProposalState | null;
  applying: boolean;
  targetFileName: string | null;
  partyOptions: Array<LabeledOptionWithDescriptionDto<string>>;
  onClose: () => void;
  onApply: () => void;
  onUpdateAction: (role: 'addresser' | 'addressee', action: CaseResolverCaptureAction) => void;
  onUpdateReference: (role: 'addresser' | 'addressee', value: string) => void;
  onUpdateDateAction: (action: CaseResolverCaptureDocumentDateAction) => void;
  resolveMatchedPartyLabel: (
    reference:
      | {
          id: string;
          kind: 'person' | 'organization';
          name?: string | undefined;
          role?: string | undefined;
        }
      | null
      | undefined
  ) => string;
  diagnostics: PromptExploderCaptureMappingDiagnostics | null;
};

const {
  Context: PromptExploderCaptureMappingModalRuntimeContext,
  useStrictContext: usePromptExploderCaptureMappingModalRuntime,
  useOptionalContext: useOptionalPromptExploderCaptureMappingModalRuntime,
} = createStrictContext<PromptExploderCaptureMappingModalRuntimeValue>({
  hookName: 'usePromptExploderCaptureMappingModalRuntime',
  providerName: 'PromptExploderCaptureMappingModalRuntimeProvider',
  displayName: 'PromptExploderCaptureMappingModalRuntimeContext',
});

export {
  PromptExploderCaptureMappingModalRuntimeContext,
  usePromptExploderCaptureMappingModalRuntime,
  useOptionalPromptExploderCaptureMappingModalRuntime,
};

export function PromptExploderCaptureMappingModalRuntimeProvider({
  value,
  children,
}: {
  value: PromptExploderCaptureMappingModalRuntimeValue;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <PromptExploderCaptureMappingModalRuntimeContext.Provider value={value}>
      {children}
    </PromptExploderCaptureMappingModalRuntimeContext.Provider>
  );
}
