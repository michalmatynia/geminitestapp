'use client';

import React, { createContext, useContext, useMemo, useRef, useState } from 'react';

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

const DrafterStateContext = createContext<DrafterStateContextType | undefined>(undefined);
const DrafterActionsContext = createContext<DrafterActionsContextType | undefined>(undefined);

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

export function useDrafterState(): DrafterStateContextType {
  const context = useContext(DrafterStateContext);
  if (context === undefined) {
    throw new Error('useDrafterState must be used within a DrafterProvider');
  }
  return context;
}

export function useDrafterActions(): DrafterActionsContextType {
  const context = useContext(DrafterActionsContext);
  if (context === undefined) {
    throw new Error('useDrafterActions must be used within a DrafterProvider');
  }
  return context;
}

export function useOptionalDrafterState(): DrafterStateContextType | null {
  return useContext(DrafterStateContext) ?? null;
}

export function useOptionalDrafterActions(): DrafterActionsContextType | null {
  return useContext(DrafterActionsContext) ?? null;
}
