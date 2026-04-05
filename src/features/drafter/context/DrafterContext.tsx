'use client';

import React, { useMemo, useRef, useState } from 'react';

import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

interface DrafterStateContextType {
  isCreatorOpen: boolean;
  editingDraftId: string | null;
  formRef: React.RefObject<HTMLFormElement | null>;
}

interface DrafterActionsContextType {
  openCreator: (id?: string) => void;
  closeCreator: () => void;
  handleSaveSuccess: () => void;
}

export const {
  Context: DrafterStateContext,
  useStrictContext: useDrafterState,
  useOptionalContext: useOptionalDrafterState,
} = createStrictContext<DrafterStateContextType>({
  hookName: 'useDrafterState',
  providerName: 'a DrafterProvider',
  displayName: 'DrafterStateContext',
  errorFactory: internalError,
});

export const {
  Context: DrafterActionsContext,
  useStrictContext: useDrafterActions,
  useOptionalContext: useOptionalDrafterActions,
} = createStrictContext<DrafterActionsContextType>({
  hookName: 'useDrafterActions',
  providerName: 'a DrafterProvider',
  displayName: 'DrafterActionsContext',
  errorFactory: internalError,
});

export function DrafterProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const openCreator = (id?: string): void => {
    setEditingDraftId(id ?? null);
    setIsCreatorOpen(true);
  };

  const closeCreator = (): void => {
    setEditingDraftId(null);
    setIsCreatorOpen(false);
  };

  const handleSaveSuccess = (): void => {
    setEditingDraftId(null);
    setIsCreatorOpen(false);
  };

  const stateValue = useMemo<DrafterStateContextType>(
    () => ({
      isCreatorOpen,
      editingDraftId,
      formRef,
    }),
    [isCreatorOpen, editingDraftId]
  );

  const actionsValue = useMemo<DrafterActionsContextType>(
    () => ({
      openCreator,
      closeCreator,
      handleSaveSuccess,
    }),
    []
  );

  return (
    <DrafterActionsContext.Provider value={actionsValue}>
      <DrafterStateContext.Provider value={stateValue}>{children}</DrafterStateContext.Provider>
    </DrafterActionsContext.Provider>
  );
}
