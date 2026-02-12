'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

import { internalError } from '@/shared/errors/app-error';

interface AdminLayoutContextType {
  isMenuCollapsed: boolean;
  setIsMenuCollapsed: (isCollapsed: boolean) => void;
  isProgrammaticallyCollapsed: boolean;
  setIsProgrammaticallyCollapsed: (isProgrammaticallyCollapsed: boolean) => void;
  aiDrawerOpen: boolean;
  setAiDrawerOpen: (isOpen: boolean) => void;
}

const AdminLayoutContext = createContext<AdminLayoutContextType | undefined>(
  undefined
);

export function AdminLayoutProvider({
  children,
  initialMenuCollapsed = false,
}: {
  children: ReactNode;
  initialMenuCollapsed?: boolean;
}): React.ReactNode {
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(initialMenuCollapsed);
  const [isProgrammaticallyCollapsed, setIsProgrammaticallyCollapsed] = useState(false);
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);

  return (
    <AdminLayoutContext.Provider
      value={{
        isMenuCollapsed,
        setIsMenuCollapsed,
        isProgrammaticallyCollapsed,
        setIsProgrammaticallyCollapsed,
        aiDrawerOpen,
        setAiDrawerOpen,
      }}
    >
      {children}
    </AdminLayoutContext.Provider>
  );
}

export function useAdminLayout(): AdminLayoutContextType {
  const context = useContext(AdminLayoutContext);
  if (context === undefined) {
    throw internalError('useAdminLayout must be used within an AdminLayoutProvider');
  }
  return context;
}
