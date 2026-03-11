'use client';

import { AnimatePresence } from 'framer-motion';

import { KangurAiTutorComposer } from './KangurAiTutorComposer';
import { KangurAiTutorFloatingAvatar } from './KangurAiTutorFloatingAvatar';
import { KangurAiTutorGuestIntroPanel } from './KangurAiTutorGuestIntroPanel';
import { KangurAiTutorGuidedCallout } from './KangurAiTutorGuidedCallout';
import { KangurAiTutorMessageList } from './KangurAiTutorMessageList';
import { KangurAiTutorPanelAuxiliaryControls } from './KangurAiTutorPanelAuxiliaryControls';
import { KangurAiTutorPanelBodyProvider } from './KangurAiTutorPanelBody.context';
import { KangurAiTutorPanelChrome } from './KangurAiTutorPanelChrome';
import { KangurAiTutorPanelContextSummary } from './KangurAiTutorPanelContextSummary';
import {
  KangurAiTutorPortalProvider,
  useKangurAiTutorPortalContext,
} from './KangurAiTutorPortal.context';
import { KangurAiTutorSelectionAction } from './KangurAiTutorSelectionAction';
import { KangurAiTutorSpotlightOverlays } from './KangurAiTutorSpotlightOverlays';

export { KangurAiTutorPortalProvider };

export function KangurAiTutorPortalContent() {
  const {
    avatar,
    diagnostics,
    guestIntro,
    guidedCallout,
    panel,
    selectionAction,
    spotlights,
  } = useKangurAiTutorPortalContext();
  void guestIntro;
  void KangurAiTutorGuestIntroPanel;

  return (
    <>
      <div
        hidden
        data-testid='kangur-ai-tutor-surface-diagnostics'
        data-canonical-modal-visible={String(diagnostics.canonicalTutorModalVisible)}
        data-contextual-mode={diagnostics.contextualTutorMode ?? 'none'}
        data-guided-mode={diagnostics.guidedMode ?? 'none'}
        data-guest-intro-rendered={String(diagnostics.guestIntroShouldRender)}
        data-is-minimal-panel={String(diagnostics.isMinimalPanelMode)}
        data-is-open={String(diagnostics.isOpen)}
        data-panel-shell-mode={diagnostics.panelShellMode}
        data-suppress-panel-surface={String(diagnostics.suppressPanelSurface)}
        data-tutor-surface={diagnostics.tutorSurfaceMode}
      />

      <AnimatePresence>
        <KangurAiTutorSelectionAction
          shouldRender={selectionAction.shouldRender}
          placement={selectionAction.placement}
          prefersReducedMotion={selectionAction.prefersReducedMotion}
          style={selectionAction.style}
          onSelectionActionMouseDown={selectionAction.onSelectionActionMouseDown}
          onAskAbout={selectionAction.onAskAbout}
        />
      </AnimatePresence>

      <AnimatePresence>
        {guestIntro.shouldRender ? (
          <KangurAiTutorGuestIntroPanel
            isAnonymousVisitor={guestIntro.isAnonymousVisitor}
            guestTutorLabel={guestIntro.guestTutorLabel}
            guestIntroHeadline={guestIntro.guestIntroHeadline}
            guestIntroDescription={guestIntro.guestIntroDescription}
            prefersReducedMotion={guestIntro.prefersReducedMotion}
            panelStyle={guestIntro.panelStyle}
            onClose={guestIntro.onClose}
            onAccept={guestIntro.onAccept}
          />
        ) : null}
      </AnimatePresence>

      <KangurAiTutorGuidedCallout
        avatarPlacement={guidedCallout.avatarPlacement}
        calloutKey={guidedCallout.calloutKey}
        calloutTestId={guidedCallout.calloutTestId}
        detail={guidedCallout.detail}
        entryDirection={guidedCallout.entryDirection}
        headerLabel={guidedCallout.headerLabel}
        mode={guidedCallout.mode}
        onAction={(action) => {
          if (action === 'advance_home_onboarding') {
            guidedCallout.onAdvanceHomeOnboarding();
            return;
          }
          if (action === 'back_home_onboarding') {
            guidedCallout.onBackHomeOnboarding();
            return;
          }
          if (action === 'finish_home_onboarding') {
            guidedCallout.onFinishHomeOnboarding();
            return;
          }
          guidedCallout.onClose();
        }}
        placement={guidedCallout.placement}
        prefersReducedMotion={guidedCallout.prefersReducedMotion}
        reducedMotionTransitions={guidedCallout.reducedMotionTransitions}
        sectionGuidanceLabel={guidedCallout.sectionGuidanceLabel}
        sectionResponsePendingKind={guidedCallout.sectionResponsePendingKind}
        selectionPreview={guidedCallout.selectionPreview}
        shouldRender={guidedCallout.shouldRender}
        showSectionGuidanceCallout={guidedCallout.showSectionGuidanceCallout}
        showSelectionGuidanceCallout={guidedCallout.showSelectionGuidanceCallout}
        stepLabel={guidedCallout.stepLabel}
        style={guidedCallout.style}
        title={guidedCallout.title}
        transitionDuration={guidedCallout.transitionDuration}
        transitionEase={guidedCallout.transitionEase}
      />

      <KangurAiTutorSpotlightOverlays
        guidedMode={spotlights.guidedMode}
        prefersReducedMotion={spotlights.prefersReducedMotion}
        reducedMotionTransitions={spotlights.reducedMotionTransitions}
        sectionContextSpotlightStyle={spotlights.sectionContextSpotlightStyle}
        sectionDropHighlightStyle={spotlights.sectionDropHighlightStyle}
        selectionGlowStyles={spotlights.selectionGlowStyles}
        selectionContextSpotlightStyle={spotlights.selectionContextSpotlightStyle}
        selectionSpotlightStyle={spotlights.selectionSpotlightStyle}
      />

      <KangurAiTutorFloatingAvatar
        ariaLabel={avatar.ariaLabel}
        avatarAnchorKind={avatar.avatarAnchorKind}
        avatarButtonClassName={avatar.avatarButtonClassName}
        avatarButtonStyle={avatar.avatarButtonStyle}
        avatarStyle={avatar.avatarStyle}
        floatingAvatarPlacement={avatar.floatingAvatarPlacement}
        guidedArrowheadTransition={avatar.guidedArrowheadTransition}
        guidedAvatarArrowhead={avatar.guidedAvatarArrowhead}
        guidedAvatarArrowheadDisplayAngle={avatar.guidedAvatarArrowheadDisplayAngle}
        guidedAvatarArrowheadDisplayAngleLabel={avatar.guidedAvatarArrowheadDisplayAngleLabel}
        guidedAvatarPlacement={avatar.guidedAvatarPlacement}
        guidedTargetKind={avatar.guidedTargetKind}
        isAskModalMode={avatar.isAskModalMode}
        isGuidedTutorMode={avatar.isGuidedTutorMode}
        isOpen={avatar.isOpen}
        motionProfile={avatar.motionProfile}
        onClick={avatar.onClick}
        onMouseDown={avatar.onMouseDown}
        onMouseUp={avatar.onMouseUp}
        onPointerCancel={avatar.onPointerCancel}
        onPointerDown={avatar.onPointerDown}
        onPointerMove={avatar.onPointerMove}
        onPointerUp={avatar.onPointerUp}
        prefersReducedMotion={avatar.prefersReducedMotion}
        reducedMotionTransitions={avatar.reducedMotionTransitions}
        rimColor={avatar.rimColor}
        showFloatingAvatar={avatar.showFloatingAvatar}
        uiMode={avatar.uiMode}
      />

      <KangurAiTutorPanelChrome
        attachedAvatarStyle={panel.attachedAvatarStyle}
        attachedLaunchOffset={panel.attachedLaunchOffset}
        avatarAnchorKind={panel.avatarAnchorKind}
        avatarAttachmentSide={panel.avatarAttachmentSide}
        avatarButtonClassName={panel.avatarButtonClassName}
        avatarPointer={panel.avatarPointer}
        bubbleEntryDirection={panel.bubbleEntryDirection}
        bubbleLaunchOrigin={panel.bubbleLaunchOrigin}
        bubbleMode={panel.bubbleMode}
        bubbleStrategy={panel.bubbleStrategy}
        bubbleStyle={panel.bubbleStyle}
        bubbleTailPlacement={panel.bubbleTailPlacement}
        bubbleWidth={panel.bubbleWidth}
        canDetachPanelFromContext={panel.canDetachPanelFromContext}
        canMovePanelToContext={panel.canMovePanelToContext}
        canResetPanelPosition={panel.canResetPanelPosition}
        compactDockedTutorPanelWidth={panel.compactDockedTutorPanelWidth}
        isAskModalMode={panel.isAskModalMode}
        isCompactDockedTutorPanel={panel.isCompactDockedTutorPanel}
        isGuidedTutorMode={panel.isGuidedTutorMode}
        isMinimalPanelMode={panel.isMinimalPanelMode}
        isOpen={panel.isOpen}
        isPanelDraggable={panel.isPanelDraggable}
        isPanelDragging={panel.isPanelDragging}
        isFollowingContext={panel.isFollowingContext}
        isTutorHidden={panel.isTutorHidden}
        minimalPanelStyle={panel.minimalPanelStyle}
        motionProfile={panel.motionProfile}
        panelAvatarPlacement={panel.panelAvatarPlacement}
        panelEmptyStateMessage={panel.panelEmptyStateMessage}
        panelOpenAnimation={panel.panelOpenAnimation}
        panelSnapState={panel.panelSnapState}
        panelTransition={panel.panelTransition}
        pointerMarkerId={panel.pointerMarkerId}
        prefersReducedMotion={panel.prefersReducedMotion}
        reducedMotionTransitions={panel.reducedMotionTransitions}
        sessionSurfaceLabel={panel.sessionSurfaceLabel}
        showAttachedAvatarShell={panel.showAttachedAvatarShell}
        suppressPanelSurface={panel.suppressPanelSurface}
        uiMode={panel.uiMode}
        onAttachedAvatarClick={panel.onAttachedAvatarClick}
        onBackdropClose={panel.onBackdropClose}
        onClose={panel.onClose}
        onDetachPanelFromContext={panel.onDetachPanelFromContext}
        onDisableTutor={panel.onDisableTutor}
        onMovePanelToContext={panel.onMovePanelToContext}
        onResetPanelPosition={panel.onResetPanelPosition}
        onHeaderPointerCancel={panel.onHeaderPointerCancel}
        onHeaderPointerDown={panel.onHeaderPointerDown}
        onHeaderPointerMove={panel.onHeaderPointerMove}
        onHeaderPointerUp={panel.onHeaderPointerUp}
      >
        <KangurAiTutorPanelBodyProvider value={panel.panelBodyContextValue}>
          <>
            <KangurAiTutorPanelContextSummary />
            <KangurAiTutorPanelAuxiliaryControls />
            <KangurAiTutorMessageList />
            <KangurAiTutorComposer />
          </>
        </KangurAiTutorPanelBodyProvider>
      </KangurAiTutorPanelChrome>
    </>
  );
}
