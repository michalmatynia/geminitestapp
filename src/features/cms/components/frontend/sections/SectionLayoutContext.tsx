'use client';

import React, { createContext, useContext, useMemo } from 'react';

interface SectionLayoutData {
  rowHeightMode?: string | undefined;
  rowHeight?: number | undefined;
  stretch?: boolean | undefined;
}

const SectionLayoutContext = createContext<SectionLayoutData>({
  rowHeightMode: 'inherit',
  rowHeight: 0,
  stretch: false,
});

export function SectionLayoutProvider({
  rowHeightMode,
  rowHeight,
  stretch,
  children,
}: SectionLayoutData & { children: React.ReactNode }): React.ReactNode {
  const value = useMemo(
    () => ({ rowHeightMode, rowHeight, stretch }),
    [rowHeightMode, rowHeight, stretch]
  );

  return <SectionLayoutContext.Provider value={value}>{children}</SectionLayoutContext.Provider>;
}

export function useSectionLayout(): SectionLayoutData {
  return useContext(SectionLayoutContext);
}
