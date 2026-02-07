'use client';

import React, { createContext, useContext } from 'react';

import type { PageZone } from '../../../../types/page-builder';

export interface BlockContextValue {
  sectionId?: string;
  sectionType?: string;
  sectionZone?: PageZone;
  columnId?: string;
  parentBlockId?: string;
  mediaStyles?: React.CSSProperties | null | undefined;
}

const BlockContext = createContext<BlockContextValue>({});

export function BlockContextProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: BlockContextValue;
}): React.JSX.Element {
  // Merge with parent context if exists
  const parentValue = useContext(BlockContext);
  const mergedValue = { ...parentValue, ...value };
  
  return (
    <BlockContext.Provider value={mergedValue}>
      {children}
    </BlockContext.Provider>
  );
}

export function useBlockContext(): BlockContextValue {
  return useContext(BlockContext);
}
