'use client';

import React, { createContext, useContext, useState, useRef } from 'react';

interface DrafterContextType {
  isCreatorOpen: boolean;
  editingDraftId: string | null;
  openCreator: (id?: string) => void;
  closeCreator: () => void;
  handleSaveSuccess: () => void;
  formRef: React.RefObject<HTMLFormElement | null>;
}

const DrafterContext = createContext<DrafterContextType | undefined>(undefined);

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

  return (
    <DrafterContext.Provider
      value={{
        isCreatorOpen,
        editingDraftId,
        openCreator,
        closeCreator,
        handleSaveSuccess,
        formRef,
      }}
    >
      {children}
    </DrafterContext.Provider>
  );
}

export function useDrafterContext(): DrafterContextType {
  const context = useContext(DrafterContext);
  if (context === undefined) {
    throw new Error('useDrafterContext must be used within a DrafterProvider');
  }
  return context;
}
