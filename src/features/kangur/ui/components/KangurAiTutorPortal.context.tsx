'use client';

import {
  createContext,
  useContext,
  useMemo,
  type CSSProperties,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';

import { internalError } from '@/features/kangur/shared/errors/app-error';

import type { KangurAiTutorPanelBodyContextValue } from './KangurAiTutorPanelBody.context';
import type {
  TutorAvatarPointer,
  TutorEdgePlacement,
  TutorGuidedArrowhead,
  TutorHorizontalSide,
  TutorMotionPosition,
  TutorMotionProfile,
  TutorPanelChromeVariant,
  TutorPanelSnapState,
  TutorReducedMotionAvatarTransitions,
  TutorReducedMotionPanelTransitions,
  TutorReducedMotionStableTransitions,
} from './ai-tutor-widget/KangurAiTutorWidget.shared';
import type { TutorGuidedMode } from './ai-tutor-widget/KangurAiTutorWidget.types';
import type { Transition } from 'framer-motion';

type MergePortalSections<
  TState extends Record<string, unknown>,
  TActions extends Partial<Record<keyof TState, unknown>>,
> = {
  [K in keyof TState]: K extends keyof TActions ? TState[K] & TActions[K] : TState[K];
};

type KangurAiTutorPortalStateSections = {
  avatar: {
    ariaLabel: string;
    avatarAnchorKind: string;
    avatarButtonClassName: string;
    avatarButtonStyle: CSSProperties;
    avatarStyle: TutorMotionPosition;
    floatingAvatarPlacement: string;
    guidedArrowheadTransition?: string;
    guidedAvatarArrowhead: TutorGuidedArrowhead | null;
    guidedAvatarArrowheadDisplayAngle: number | null;
    guidedAvatarArrowheadDisplayAngleLabel?: string;
    guidedAvatarPlacement: string;
    guidedTargetKind: string;
    isAskModalMode: boolean;
    isGuidedTutorMode: boolean;
    isOpen: boolean;
    motionProfile: TutorMotionProfile;
    prefersReducedMotion: boolean;
    reducedMotionTransitions: TutorReducedMotionAvatarTransitions;
    rimColor: string;
    showFloatingAvatar: boolean;
    uiMode: string;
  };
  diagnostics: {
    canonicalTutorModalVisible: boolean;
    contextualTutorMode: string | null;
    guidedMode: TutorGuidedMode;
    guestIntroShouldRender: boolean;
    isMinimalPanelMode: boolean;
    isOpen: boolean;
    panelShellMode: string;
    suppressPanelSurface: boolean;
    tutorSurfaceMode: string;
  };
  drawingPanel: {
    shouldRender: boolean;
    style: CSSProperties | null;
    prefersReducedMotion: boolean;
    hint: string | undefined;
  };
  guestIntro: {
    guestIntroDescription: string;
    guestIntroHeadline: string;
    guestTutorLabel: string;
    isAnonymousVisitor: boolean;
    panelStyle: CSSProperties;
    prefersReducedMotion: boolean;
    shouldRender: boolean;
  };
  guidedCallout: {
    avatarPlacement: TutorEdgePlacement | null;
    calloutKey: string;
    calloutTestId: string;
    detail: string;
    entryDirection: TutorHorizontalSide;
    headerLabel: string;
    mode: TutorGuidedMode;
    placement: TutorEdgePlacement;
    prefersReducedMotion: boolean;
    reducedMotionTransitions: TutorReducedMotionStableTransitions;
    sectionGuidanceLabel: string | null;
    sectionResponsePendingKind: string | null;
    selectionPreview: string | null;
    shouldRender: boolean;
    showSectionGuidanceCallout: boolean;
    showSelectionGuidanceCallout: boolean;
    stepLabel: string | null;
    style: CSSProperties | null;
    title: string;
    transitionDuration: number;
    transitionEase: [number, number, number, number];
  };
  panel: {
    attachedAvatarStyle: CSSProperties;
    attachedLaunchOffset: {
      x: number;
      y: number;
    };
    avatarAnchorKind: string;
    avatarAttachmentSide: TutorHorizontalSide;
    avatarButtonClassName: string;
    avatarPointer: TutorAvatarPointer | null;
    bubbleEntryDirection: TutorHorizontalSide;
    bubbleLaunchOrigin: 'dock-bottom-right' | 'sheet';
    bubbleMode: 'bubble' | 'sheet';
    bubbleStrategy: string;
    bubbleStyle: Record<string, number | string | undefined>;
    bubbleTailPlacement: 'bottom' | 'dock' | 'top';
    bubbleWidth?: number;
    canDetachPanelFromContext: boolean;
    canMovePanelToContext: boolean;
    chromeVariant: TutorPanelChromeVariant;
    compactDockedTutorPanelWidth: number;
    isAskModalMode: boolean;
    isCompactDockedTutorPanel: boolean;
    isGuidedTutorMode: boolean;
    isMinimalPanelMode: boolean;
    isOpen: boolean;
    canResetPanelPosition: boolean;
    isPanelDraggable: boolean;
    isPanelDragging: boolean;
    isFollowingContext: boolean;
    isTutorHidden: boolean;
    minimalPanelStyle: CSSProperties;
    motionProfile: TutorMotionProfile;
    panelAvatarPlacement: string;
    panelBodyContextValue: KangurAiTutorPanelBodyContextValue;
    panelEmptyStateMessage: string;
    panelOpenAnimation: 'dock-launch' | 'fade' | 'sheet';
    panelSnapState: TutorPanelSnapState | 'none';
    panelTransition: Transition;
    pointerMarkerId: string;
    prefersReducedMotion: boolean;
    reducedMotionTransitions: TutorReducedMotionPanelTransitions;
    sessionSurfaceLabel: string | null;
    showAttachedAvatarShell: boolean;
    suppressPanelSurface: boolean;
    uiMode: string;
  };
  selectionAction: {
    placement: TutorEdgePlacement;
    prefersReducedMotion: boolean;
    shouldRender: boolean;
    style: CSSProperties | null;
  };
  spotlights: {
    guidedMode: TutorGuidedMode;
    prefersReducedMotion: boolean;
    reducedMotionTransitions: TutorReducedMotionStableTransitions;
    sectionContextSpotlightStyle: CSSProperties | null;
    sectionDropHighlightStyle: CSSProperties | null;
    selectionGlowStyles: CSSProperties[];
    selectionContextSpotlightStyle: CSSProperties | null;
    selectionSpotlightStyle: CSSProperties | null;
  };
};
export type KangurAiTutorPortalStateContextValue = KangurAiTutorPortalStateSections;

type KangurAiTutorPortalActionSections = {
  avatar: {
    onClick: () => void;
    onMouseDown: (event: MouseEvent<HTMLButtonElement>) => void;
    onMouseUp: (event: MouseEvent<HTMLButtonElement>) => void;
    onPointerCancel: (event: PointerEvent<HTMLButtonElement>) => void;
    onPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
    onPointerMove: (event: PointerEvent<HTMLButtonElement>) => void;
    onPointerUp: (event: PointerEvent<HTMLButtonElement>) => void;
  };
  drawingPanel: {
    onClose: () => void;
    onComplete: (dataUrl: string) => void;
  };
  guestIntro: {
    onAccept: () => void;
    onClose: () => void;
    onDismiss: () => void;
    onStartChat: () => void;
  };
  guidedCallout: {
    onAdvanceHomeOnboarding: () => void;
    onBackHomeOnboarding: () => void;
    onClose: () => void;
    onFinishHomeOnboarding: () => void;
  };
  panel: {
    onAttachedAvatarClick: () => void;
    onAttachedAvatarPointerCancel: (event: PointerEvent<HTMLButtonElement>) => void;
    onAttachedAvatarPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
    onAttachedAvatarPointerMove: (event: PointerEvent<HTMLButtonElement>) => void;
    onAttachedAvatarPointerUp: (event: PointerEvent<HTMLButtonElement>) => void;
    onBackdropClose: () => void;
    onClose: () => void;
    onDetachPanelFromContext: () => void;
    onDisableTutor: () => void;
    onMovePanelToContext: () => void;
    onResetPanelPosition: () => void;
    onHeaderPointerCancel: (event: PointerEvent<HTMLDivElement>) => void;
    onHeaderPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
    onHeaderPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
    onHeaderPointerUp: (event: PointerEvent<HTMLDivElement>) => void;
  };
  selectionAction: {
    onAskAbout: () => void;
    onSelectionActionMouseDown: (event: MouseEvent<HTMLButtonElement>) => void;
  };
};
export type KangurAiTutorPortalActionsContextValue = KangurAiTutorPortalActionSections;

export type KangurAiTutorPortalContextValue = MergePortalSections<
  KangurAiTutorPortalStateSections,
  KangurAiTutorPortalActionSections
>;

const KangurAiTutorPortalStateContext = createContext<KangurAiTutorPortalStateContextValue | null>(null);
const KangurAiTutorPortalActionsContext = createContext<KangurAiTutorPortalActionsContextValue | null>(null);

export function KangurAiTutorPortalProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: KangurAiTutorPortalContextValue;
}) {
  const state = useMemo<KangurAiTutorPortalStateContextValue>(() => {
    const { onClick: _avatar_onClick, onMouseDown: _avatar_onMouseDown, onMouseUp: _avatar_onMouseUp, onPointerCancel: _avatar_onPointerCancel, onPointerDown: _avatar_onPointerDown, onPointerMove: _avatar_onPointerMove, onPointerUp: _avatar_onPointerUp, ...avatarState } = value.avatar;
    const { onClose: _drawingPanel_onClose, onComplete: _drawingPanel_onComplete, ...drawingPanelState } = value.drawingPanel;
    const { onAccept: _guestIntro_onAccept, onClose: _guestIntro_onClose, onDismiss: _guestIntro_onDismiss, onStartChat: _guestIntro_onStartChat, ...guestIntroState } = value.guestIntro;
    const { onAdvanceHomeOnboarding: _guidedCallout_onAdvanceHomeOnboarding, onBackHomeOnboarding: _guidedCallout_onBackHomeOnboarding, onClose: _guidedCallout_onClose, onFinishHomeOnboarding: _guidedCallout_onFinishHomeOnboarding, ...guidedCalloutState } = value.guidedCallout;
    const { onAttachedAvatarClick: _panel_onAttachedAvatarClick, onAttachedAvatarPointerCancel: _panel_onAttachedAvatarPointerCancel, onAttachedAvatarPointerDown: _panel_onAttachedAvatarPointerDown, onAttachedAvatarPointerMove: _panel_onAttachedAvatarPointerMove, onAttachedAvatarPointerUp: _panel_onAttachedAvatarPointerUp, onBackdropClose: _panel_onBackdropClose, onClose: _panel_onClose, onDetachPanelFromContext: _panel_onDetachPanelFromContext, onDisableTutor: _panel_onDisableTutor, onMovePanelToContext: _panel_onMovePanelToContext, onResetPanelPosition: _panel_onResetPanelPosition, onHeaderPointerCancel: _panel_onHeaderPointerCancel, onHeaderPointerDown: _panel_onHeaderPointerDown, onHeaderPointerMove: _panel_onHeaderPointerMove, onHeaderPointerUp: _panel_onHeaderPointerUp, ...panelState } = value.panel;
    const { onAskAbout: _selectionAction_onAskAbout, onSelectionActionMouseDown: _selectionAction_onSelectionActionMouseDown, ...selectionActionState } = value.selectionAction;

    return {
      avatar: avatarState,
      diagnostics: value.diagnostics,
      drawingPanel: drawingPanelState,
      guestIntro: guestIntroState,
      guidedCallout: guidedCalloutState,
      panel: panelState,
      selectionAction: selectionActionState,
      spotlights: value.spotlights,
    };
  }, [value]);

  const actions = useMemo<KangurAiTutorPortalActionsContextValue>(() => ({
    avatar: {
      onClick: value.avatar.onClick,
      onMouseDown: value.avatar.onMouseDown,
      onMouseUp: value.avatar.onMouseUp,
      onPointerCancel: value.avatar.onPointerCancel,
      onPointerDown: value.avatar.onPointerDown,
      onPointerMove: value.avatar.onPointerMove,
      onPointerUp: value.avatar.onPointerUp,
    },
    drawingPanel: {
      onClose: value.drawingPanel.onClose,
      onComplete: value.drawingPanel.onComplete,
    },
    guestIntro: {
      onAccept: value.guestIntro.onAccept,
      onClose: value.guestIntro.onClose,
      onDismiss: value.guestIntro.onDismiss,
      onStartChat: value.guestIntro.onStartChat,
    },
    guidedCallout: {
      onAdvanceHomeOnboarding: value.guidedCallout.onAdvanceHomeOnboarding,
      onBackHomeOnboarding: value.guidedCallout.onBackHomeOnboarding,
      onClose: value.guidedCallout.onClose,
      onFinishHomeOnboarding: value.guidedCallout.onFinishHomeOnboarding,
    },
    panel: {
      onAttachedAvatarClick: value.panel.onAttachedAvatarClick,
      onAttachedAvatarPointerCancel: value.panel.onAttachedAvatarPointerCancel,
      onAttachedAvatarPointerDown: value.panel.onAttachedAvatarPointerDown,
      onAttachedAvatarPointerMove: value.panel.onAttachedAvatarPointerMove,
      onAttachedAvatarPointerUp: value.panel.onAttachedAvatarPointerUp,
      onBackdropClose: value.panel.onBackdropClose,
      onClose: value.panel.onClose,
      onDetachPanelFromContext: value.panel.onDetachPanelFromContext,
      onDisableTutor: value.panel.onDisableTutor,
      onMovePanelToContext: value.panel.onMovePanelToContext,
      onResetPanelPosition: value.panel.onResetPanelPosition,
      onHeaderPointerCancel: value.panel.onHeaderPointerCancel,
      onHeaderPointerDown: value.panel.onHeaderPointerDown,
      onHeaderPointerMove: value.panel.onHeaderPointerMove,
      onHeaderPointerUp: value.panel.onHeaderPointerUp,
    },
    selectionAction: {
      onAskAbout: value.selectionAction.onAskAbout,
      onSelectionActionMouseDown: value.selectionAction.onSelectionActionMouseDown,
    },
  }), [value]);

  return (
    <KangurAiTutorPortalActionsContext.Provider value={actions}>
      <KangurAiTutorPortalStateContext.Provider value={state}>
        {children}
      </KangurAiTutorPortalStateContext.Provider>
    </KangurAiTutorPortalActionsContext.Provider>
  );
}

export function useKangurAiTutorPortalState(): KangurAiTutorPortalStateContextValue {
  const ctx = useContext(KangurAiTutorPortalStateContext);
  if (!ctx) {
    throw internalError(
      'useKangurAiTutorPortalState must be used within a KangurAiTutorPortalProvider'
    );
  }
  return ctx;
}

export function useKangurAiTutorPortalActions(): KangurAiTutorPortalActionsContextValue {
  const ctx = useContext(KangurAiTutorPortalActionsContext);
  if (!ctx) {
    throw internalError(
      'useKangurAiTutorPortalActions must be used within a KangurAiTutorPortalProvider'
    );
  }
  return ctx;
}

export function useKangurAiTutorPortalContext(): KangurAiTutorPortalContextValue {
  const state = useKangurAiTutorPortalState();
  const actions = useKangurAiTutorPortalActions();
  return useMemo(() => ({
    avatar: { ...state.avatar, ...actions.avatar },
    diagnostics: state.diagnostics,
    drawingPanel: { ...state.drawingPanel, ...actions.drawingPanel },
    guestIntro: { ...state.guestIntro, ...actions.guestIntro },
    guidedCallout: { ...state.guidedCallout, ...actions.guidedCallout },
    panel: { ...state.panel, ...actions.panel },
    selectionAction: { ...state.selectionAction, ...actions.selectionAction },
    spotlights: state.spotlights,
  }), [state, actions]);
}
