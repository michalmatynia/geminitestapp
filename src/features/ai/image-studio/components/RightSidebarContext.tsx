'use client';

import React from 'react';

type RightSidebarContextValue = {
  switchToControls: () => void;
  canvasSizePresetOptions: Array<{ value: string; label: string; description?: string }>;
  canvasSizePresetValue: string;
  setCanvasSizePresetValue: (value: string) => void;
  canvasSizeLabel: string;
  canApplyCanvasSizePreset: boolean;
  canRecenterCanvasImage: boolean;
  onApplyCanvasSizePreset: () => void;
  onOpenResizeCanvasModal: () => void;
  quickActionsHostEl: HTMLElement | null;
  quickActionsPanelContent: React.ReactNode;
  resizeCanvasDisabled: boolean;
};

const RightSidebarContext = React.createContext<RightSidebarContextValue | null>(null);

export function RightSidebarProvider({
  value,
  children,
}: {
  value: RightSidebarContextValue;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <RightSidebarContext.Provider value={value}>
      {children}
    </RightSidebarContext.Provider>
  );
}

export function useRightSidebarContext(): RightSidebarContextValue {
  const context = React.useContext(RightSidebarContext);
  if (!context) {
    throw new Error('useRightSidebarContext must be used inside RightSidebarProvider');
  }
  return context;
}
