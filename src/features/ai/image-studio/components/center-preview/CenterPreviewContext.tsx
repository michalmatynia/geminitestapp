'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

import type { VariantTooltipState } from './VariantTooltipPortal';

type Pane = 'left' | 'right';

export interface CenterPreviewContextValue {
  // State
  screenshotBusy: boolean;
  singleVariantView: 'variant' | 'source';
  splitVariantView: boolean;
  leftSplitZoom: number;
  rightSplitZoom: number;
  variantLoadingId: string | null;
  variantTooltip: VariantTooltipState | null;
  detailsSlotId: string | null;

  // Setters/Actions
  setScreenshotBusy: React.Dispatch<React.SetStateAction<boolean>>;
  setSingleVariantView: React.Dispatch<React.SetStateAction<'variant' | 'source'>>;
  setSplitVariantView: React.Dispatch<React.SetStateAction<boolean>>;
  setLeftSplitZoom: React.Dispatch<React.SetStateAction<number>>;
  setRightSplitZoom: React.Dispatch<React.SetStateAction<number>>;
  setVariantLoadingId: React.Dispatch<React.SetStateAction<string | null>>;
  setVariantTooltip: React.Dispatch<React.SetStateAction<VariantTooltipState | null>>;
  setDetailsSlotId: React.Dispatch<React.SetStateAction<string | null>>;

  // Combined handlers
  adjustSplitZoom: (pane: Pane, delta: number) => void;
  resetSplitZoom: (pane: Pane) => void;
}

const CenterPreviewContext = createContext<CenterPreviewContextValue | null>(null);

export function CenterPreviewProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const [screenshotBusy, setScreenshotBusy] = useState(false);
  const [singleVariantView, setSingleVariantView] = useState<'variant' | 'source'>('variant');
  const [splitVariantView, setSplitVariantView] = useState(false);
  const [leftSplitZoom, setLeftSplitZoom] = useState(1);
  const [rightSplitZoom, setRightSplitZoom] = useState(1);
  const [variantLoadingId, setVariantLoadingId] = useState<string | null>(null);
  const [variantTooltip, setVariantTooltip] = useState<VariantTooltipState | null>(null);
  const [detailsSlotId, setDetailsSlotId] = useState<string | null>(null);

  const adjustSplitZoom = useCallback((pane: Pane, delta: number): void => {
    const clamp = (val: number) => Math.max(0.1, Math.min(10, val));
    if (pane === 'left') {
      setLeftSplitZoom((current) => clamp(current + delta));
    } else {
      setRightSplitZoom((current) => clamp(current + delta));
    }
  }, []);

  const resetSplitZoom = useCallback((pane: Pane): void => {
    if (pane === 'left') setLeftSplitZoom(1);
    else setRightSplitZoom(1);
  }, []);

  const value = useMemo(
    (): CenterPreviewContextValue => ({
      screenshotBusy,
      singleVariantView,
      splitVariantView,
      leftSplitZoom,
      rightSplitZoom,
      variantLoadingId,
      variantTooltip,
      detailsSlotId,
      setScreenshotBusy,
      setSingleVariantView,
      setSplitVariantView,
      setLeftSplitZoom,
      setRightSplitZoom,
      setVariantLoadingId,
      setVariantTooltip,
      setDetailsSlotId,
      adjustSplitZoom,
      resetSplitZoom,
    }),
    [
      screenshotBusy,
      singleVariantView,
      splitVariantView,
      leftSplitZoom,
      rightSplitZoom,
      variantLoadingId,
      variantTooltip,
      detailsSlotId,
      adjustSplitZoom,
      resetSplitZoom,
    ]
  );

  return <CenterPreviewContext.Provider value={value}>{children}</CenterPreviewContext.Provider>;
}

export function useCenterPreviewContext(): CenterPreviewContextValue {
  const context = useContext(CenterPreviewContext);
  if (!context) {
    throw new Error('useCenterPreviewContext must be used within a CenterPreviewProvider');
  }
  return context;
}
