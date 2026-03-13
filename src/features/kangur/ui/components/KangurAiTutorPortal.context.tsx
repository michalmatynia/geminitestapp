'use client';

import {
  createContext,
  useContext,
  type CSSProperties,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';

import { internalError } from '@/shared/errors/app-error';

import type { KangurAiTutorPanelBodyContextValue } from './KangurAiTutorPanelBody.context';
import type {
  TutorAvatarPointer,
  TutorGuidedArrowhead,
  TutorHorizontalSide,
  TutorMotionPosition,
  TutorMotionProfile,
  TutorPanelSnapState,
} from './KangurAiTutorWidget.shared';
import type { Transition } from 'framer-motion';

type GuidedMode = 'home_onboarding' | 'selection' | 'section' | 'auth' | null;
type EdgePlacement = 'top' | 'bottom' | 'left' | 'right';

type ReducedMotionTransitions = {
  instant: {
    duration: number;
  };
  stableState: {
    opacity: number;
    scale: number;
    y: number;
  };
  staticSheetState: {
    opacity: number;
    y: number;
  };
};

type GuidedArrowhead = TutorGuidedArrowhead;
type AvatarPointer = TutorAvatarPointer;
type TutorPanelChromeVariant = 'default' | 'contextual_result';

export type KangurAiTutorPortalContextValue = {
  avatar: {
    ariaLabel: string;
    avatarAnchorKind: string;
    avatarButtonClassName: string;
    avatarButtonStyle: CSSProperties;
    avatarStyle: TutorMotionPosition;
    floatingAvatarPlacement: string;
    guidedArrowheadTransition?: string;
    guidedAvatarArrowhead: GuidedArrowhead | null;
    guidedAvatarArrowheadDisplayAngle: number | null;
    guidedAvatarArrowheadDisplayAngleLabel?: string;
    guidedAvatarPlacement: string;
    guidedTargetKind: string;
    isAskModalMode: boolean;
    isGuidedTutorMode: boolean;
    isOpen: boolean;
    motionProfile: TutorMotionProfile;
    prefersReducedMotion: boolean;
    reducedMotionTransitions: ReducedMotionTransitions;
    rimColor: string;
    showFloatingAvatar: boolean;
    uiMode: string;
    onClick: () => void;
    onMouseDown: (event: MouseEvent<HTMLButtonElement>) => void;
    onMouseUp: (event: MouseEvent<HTMLButtonElement>) => void;
    onPointerCancel: (event: PointerEvent<HTMLButtonElement>) => void;
    onPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
    onPointerMove: (event: PointerEvent<HTMLButtonElement>) => void;
    onPointerUp: (event: PointerEvent<HTMLButtonElement>) => void;
  };
  diagnostics: {
    canonicalTutorModalVisible: boolean;
    contextualTutorMode: string | null;
    guidedMode: GuidedMode;
    guestIntroShouldRender: boolean;
    isMinimalPanelMode: boolean;
    isOpen: boolean;
    panelShellMode: string;
    suppressPanelSurface: boolean;
    tutorSurfaceMode: string;
  };
  guestIntro: {
    guestIntroDescription: string;
    guestIntroHeadline: string;
    guestTutorLabel: string;
    isAnonymousVisitor: boolean;
    panelStyle: CSSProperties;
    prefersReducedMotion: boolean;
    shouldRender: boolean;
    onAccept: () => void;
    onClose: () => void;
    onStartChat: () => void;
  };
  guidedCallout: {
    avatarPlacement: 'top' | 'bottom' | 'left' | 'right' | null;
    calloutKey: string;
    calloutTestId: string;
    detail: string;
    entryDirection: TutorHorizontalSide;
    headerLabel: string;
    mode: GuidedMode;
    placement: EdgePlacement;
    prefersReducedMotion: boolean;
    reducedMotionTransitions: ReducedMotionTransitions;
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
    onAdvanceHomeOnboarding: () => void;
    onBackHomeOnboarding: () => void;
    onClose: () => void;
    onFinishHomeOnboarding: () => void;
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
    avatarPointer: AvatarPointer | null;
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
    reducedMotionTransitions: ReducedMotionTransitions;
    sessionSurfaceLabel: string | null;
    showAttachedAvatarShell: boolean;
    suppressPanelSurface: boolean;
    uiMode: string;
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
    placement: EdgePlacement;
    prefersReducedMotion: boolean;
    shouldRender: boolean;
    style: CSSProperties | null;
    onAskAbout: () => void;
    onSelectionActionMouseDown: (event: MouseEvent<HTMLButtonElement>) => void;
  };
  spotlights: {
    guidedMode: GuidedMode;
    prefersReducedMotion: boolean;
    reducedMotionTransitions: ReducedMotionTransitions;
    sectionContextSpotlightStyle: CSSProperties | null;
    sectionDropHighlightStyle: CSSProperties | null;
    selectionGlowStyles: CSSProperties[];
    selectionContextSpotlightStyle: CSSProperties | null;
    selectionSpotlightStyle: CSSProperties | null;
  };
};

const KangurAiTutorPortalContext = createContext<KangurAiTutorPortalContextValue | null>(null);

export function KangurAiTutorPortalProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: KangurAiTutorPortalContextValue;
}) {
  return (
    <KangurAiTutorPortalContext.Provider value={value}>
      {children}
    </KangurAiTutorPortalContext.Provider>
  );
}

export function useKangurAiTutorPortalContext(): KangurAiTutorPortalContextValue {
  const ctx = useContext(KangurAiTutorPortalContext);
  if (!ctx) {
    throw internalError(
      'useKangurAiTutorPortalContext must be used within a KangurAiTutorPortalProvider'
    );
  }

  return ctx;
}
