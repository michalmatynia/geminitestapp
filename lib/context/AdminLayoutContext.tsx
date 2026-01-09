"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface AdminLayoutContextType {
  isMenuCollapsed: boolean;
  setIsMenuCollapsed: (isCollapsed: boolean) => void;
  isProgrammaticallyCollapsed: boolean;
  setIsProgrammaticallyCollapsed: (isProgrammaticallyCollapsed: boolean) => void;
}

const AdminLayoutContext = createContext<AdminLayoutContextType | undefined>(
  undefined
);

export function AdminLayoutProvider({ children }: { children: ReactNode }) {
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
  const [isProgrammaticallyCollapsed, setIsProgrammaticallyCollapsed] = useState(false);

  return (
    <AdminLayoutContext.Provider
      value={{ isMenuCollapsed, setIsMenuCollapsed, isProgrammaticallyCollapsed, setIsProgrammaticallyCollapsed }}
    >
      {children}
    </AdminLayoutContext.Provider>
  );
}

export function useAdminLayout() {
  const context = useContext(AdminLayoutContext);
  if (context === undefined) {
    throw new Error("useAdminLayout must be used within an AdminLayoutProvider");
  }
  return context;
}
