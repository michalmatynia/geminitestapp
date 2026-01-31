"use client";

import React, { createContext, useContext } from "react";

const MediaStylesContext = createContext<React.CSSProperties | null>(null);

export function MediaStylesProvider({
  value,
  children,
}: {
  value: React.CSSProperties | null;
  children: React.ReactNode;
}): React.ReactNode {
  return (
    <MediaStylesContext.Provider value={value ?? null}>
      {children}
    </MediaStylesContext.Provider>
  );
}

export function useMediaStyles(): React.CSSProperties | null {
  return useContext(MediaStylesContext);
}
