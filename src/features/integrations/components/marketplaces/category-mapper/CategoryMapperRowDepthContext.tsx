'use client';

import React, { createContext, useContext } from 'react';

const CategoryMapperRowDepthContext = createContext<number>(0);

type CategoryMapperRowDepthProviderProps = {
  depth: number;
  children: React.ReactNode;
};

export function CategoryMapperRowDepthProvider({
  depth,
  children,
}: CategoryMapperRowDepthProviderProps): React.JSX.Element {
  return (
    <CategoryMapperRowDepthContext.Provider value={depth}>
      {children}
    </CategoryMapperRowDepthContext.Provider>
  );
}

export function useCategoryMapperRowDepth(): number {
  return useContext(CategoryMapperRowDepthContext);
}
