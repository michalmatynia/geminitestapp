'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

import type { VariantTooltipState } from './VariantTooltipPortal';
import { internalError } from '@/shared/errors/app-error';

type Pane = 'left' | 'right';

export interface CenterPreviewContextValue {
  screenshotBusy: boolean;
  singleVariantView: 'variant' | 'source';
  splitVariantView: boolean;
  leftSplitZoom: number;
  rightSplitZoom: number;
  variantLoadingId: string | null;
  variantTooltip: VariantTooltipState | null;
  detailsSlotId: string | null;
}

export interface CenterPreviewActionsContextValue {
  setScreenshotBusy: React.Dispatch<React.SetStateAction<boolean>>;
  setSingleVariantView: React.Dispatch<React.SetStateAction<'variant' | 'source'>>;
  setSplitVariantView: React.Dispatch<React.SetStateAction<boolean>>;
  setLeftSplitZoom: React.Dispatch<React.SetStateAction<number>>;
  setRightSplitZoom: React.Dispatch<React.SetStateAction<number>>;
  setVariantLoadingId: React.Dispatch<React.SetStateAction<string | null>>;
  setVariantTooltip: React.Dispatch<React.SetStateAction<VariantTooltipState | null>>;
  setDetailsSlotId: React.Dispatch<React.SetStateAction<string | null>>;
  adjustSplitZoom: (pane: Pane, delta: number) => void;
  resetSplitZoom: (pane: Pane) => void;
}

type CenterPreviewCombinedContextValue = CenterPreviewContextValue & CenterPreviewActionsContextValue;

const CenterPreviewStateContext = createContext<CenterPreviewContextValue | null>(null);
const CenterPreviewActionsContext = createContext<CenterPreviewActionsContextValue | null>(null);

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

  const stateValue = useMemo(
    (): CenterPreviewContextValue => ({
      screenshotBusy,
      singleVariantView,
      splitVariantView,
      leftSplitZoom,
      rightSplitZoom,
      variantLoadingId,
      variantTooltip,
      detailsSlotId,
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
    ]
  );
  const actionsValue = useMemo(
    (): CenterPreviewActionsContextValue => ({
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
      adjustSplitZoom,
      resetSplitZoom,
    ]
  );

  return (
    <CenterPreviewActionsContext.Provider value={actionsValue}>
      <CenterPreviewStateContext.Provider value={stateValue}>
        {children}
      </CenterPreviewStateContext.Provider>
    </CenterPreviewActionsContext.Provider>
  );
}

export function useCenterPreviewState(): CenterPreviewContextValue {
  const context = useContext(CenterPreviewStateContext);
  if (!context) {
    throw internalError('useCenterPreviewState must be used within a CenterPreviewProvider');
  }
  return context;
}

export function useCenterPreviewActions(): CenterPreviewActionsContextValue {
  const context = useContext(CenterPreviewActionsContext);
  if (!context) {
    throw internalError('useCenterPreviewActions must be used within a CenterPreviewProvider');
  }
  return context;
}

export function useCenterPreviewContext(): CenterPreviewCombinedContextValue {
  const state = useCenterPreviewState();
  const actions = useCenterPreviewActions();
  return useMemo(() => ({ ...state, ...actions }), [state, actions]);
}
