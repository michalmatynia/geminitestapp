'use client';

import { AnimatePresence } from 'framer-motion';

import { KangurAiTutorComposer } from './KangurAiTutorComposer';
import { KangurAiTutorDrawingSidePanel } from './KangurAiTutorDrawingSidePanel';
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

const resolveAccessibilityStatusText = (context: {
  avatar: ReturnType<typeof useKangurAiTutorPortalContext>['avatar'];
  guestIntro: ReturnType<typeof useKangurAiTutorPortalContext>['guestIntro'];
  guidedCallout: ReturnType<typeof useKangurAiTutorPortalContext>['guidedCallout'];
  panel: ReturnType<typeof useKangurAiTutorPortalContext>['panel'];
  selectionAction: ReturnType<typeof useKangurAiTutorPortalContext>['selectionAction'];
}): string => {
  const { avatar, guestIntro, guidedCallout, panel, selectionAction } = context;
  if (guestIntro.shouldRender) {
    return [guestIntro.guestIntroHeadline, guestIntro.guestIntroDescription]
      .filter(Boolean)
      .join(' ');
  }
  if (guidedCallout.shouldRender) {
    return [guidedCallout.stepLabel, guidedCallout.title, guidedCallout.detail]
      .filter(Boolean)
      .join(' ');
  }
  if (panel.isOpen && !panel.suppressPanelSurface) {
    return ['Czat AI Tutora otwarty.', panel.sessionSurfaceLabel].filter(Boolean).join(' ');
  }
  if (selectionAction.shouldRender) {
    return 'Zaznaczono fragment. Możesz użyć przycisku Zapytaj o to.';
  }
  if (avatar.showFloatingAvatar) {
    return avatar.ariaLabel;
  }
  return '';
};

export function KangurAiTutorPortalContent() {
  const {
    avatar,
    diagnostics,
    guestIntro,
    guidedCallout,
    panel,
    selectionAction,
  } = useKangurAiTutorPortalContext();
  const accessibilityStatusText = resolveAccessibilityStatusText({
    avatar,
    guestIntro,
    guidedCallout,
    panel,
    selectionAction,
  });

  return (
    <>
      <div
        role='status'
        aria-live='polite'
        aria-atomic='true'
        className='sr-only'
        data-testid='kangur-ai-tutor-accessibility-status'
      >
        {accessibilityStatusText}
      </div>

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
          <KangurAiTutorPanelBodyProvider value={panel.panelBodyContextValue}>
            <KangurAiTutorGuestIntroPanel
              isAnonymousVisitor={guestIntro.isAnonymousVisitor}
              guestTutorLabel={guestIntro.guestTutorLabel}
              guestIntroHeadline={guestIntro.guestIntroHeadline}
              guestIntroDescription={guestIntro.guestIntroDescription}
              prefersReducedMotion={guestIntro.prefersReducedMotion}
              panelStyle={guestIntro.panelStyle}
              onClose={guestIntro.onClose}
              onDismiss={guestIntro.onDismiss}
              onAccept={guestIntro.onAccept}
              onStartChat={guestIntro.onStartChat}
            />
          </KangurAiTutorPanelBodyProvider>
        ) : null}
      </AnimatePresence>

      <KangurAiTutorPanelBodyProvider value={panel.panelBodyContextValue}>
        <KangurAiTutorGuidedCallout />      </KangurAiTutorPanelBodyProvider>

      <KangurAiTutorSpotlightOverlays />

      <KangurAiTutorFloatingAvatar />

      <KangurAiTutorPanelChrome>
        <KangurAiTutorPanelBodyProvider value={panel.panelBodyContextValue}>
          <>
            <KangurAiTutorPanelContextSummary />
            <KangurAiTutorPanelAuxiliaryControls />
            <KangurAiTutorMessageList />
            <KangurAiTutorComposer />
          </>
        </KangurAiTutorPanelBodyProvider>
      </KangurAiTutorPanelChrome>

      <KangurAiTutorDrawingSidePanel />
    </>
  );
}
