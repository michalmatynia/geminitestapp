/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import {
  createRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { describe, expect, it, vi } from 'vitest';

import { buildKangurLessonNarrationScriptFromText } from '@/features/kangur/tts/script';
import { KANGUR_TTS_DEFAULT_VOICE } from '@/features/kangur/tts/contracts';
import { DEFAULT_KANGUR_AI_TUTOR_CONTENT } from '@/features/kangur/shared/contracts/kangur-ai-tutor-content';

import { KangurAiTutorPanelChrome } from './KangurAiTutorPanelChrome';
import { KangurAiTutorWidgetStateProvider } from './KangurAiTutorWidget.state';

import type { KangurAiTutorPanelBodyContextValue } from './KangurAiTutorPanelBody.context';
import type { KangurAiTutorWidgetState } from './KangurAiTutorWidget.state';
import type { TutorMotionProfile } from './KangurAiTutorWidget.shared';

const { useKangurAiTutorMock } = vi.hoisted(() => ({
  useKangurAiTutorMock: vi.fn(),
}));

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
    button: ({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) => (
      <button {...props}>{children}</button>
    ),
  },
}));

vi.mock('@/features/kangur/ui/context/KangurAiTutorContentContext', () => ({
  useKangurAiTutorContent: () => DEFAULT_KANGUR_AI_TUTOR_CONTENT,
}));

vi.mock('@/features/kangur/ui/context/KangurAiTutorContext', () => ({
  useKangurAiTutor: useKangurAiTutorMock,
  useOptionalKangurAiTutor: useKangurAiTutorMock,
  useKangurAiTutorDeferredActivationBridge: vi.fn(),
}));

const motionProfile: TutorMotionProfile = {
  kind: 'default',
  sheetBreakpoint: 768,
  avatarTransition: { type: 'spring', stiffness: 340, damping: 26 },
  guidedAvatarTransition: {
    type: 'tween',
    duration: 0.42,
    ease: [0.22, 1, 0.36, 1],
  },
  bubbleTransition: { type: 'spring', stiffness: 340, damping: 26 },
  hoverScale: 1.02,
  tapScale: 0.98,
  motionCompletedDelayMs: 180,
  desktopBubbleWidth: 420,
  mobileBubbleWidth: 360,
};

const reducedMotionTransitions = {
  instant: { duration: 0 },
  stableState: { opacity: 1, scale: 1, y: 0 },
  staticSheetState: { opacity: 1, y: 0 },
};

const createWidgetState = (): KangurAiTutorWidgetState =>
  ({
    panelMotionState: 'settled',
    panelRef: createRef<HTMLDivElement>(),
    tutorNarrationRootRef: createRef<HTMLDivElement>(),
  }) as unknown as KangurAiTutorWidgetState;

const createPanelBodyContextValue = (): KangurAiTutorPanelBodyContextValue =>
  ({
    narratorSettings: {
      engine: 'client',
      voice: KANGUR_TTS_DEFAULT_VOICE,
    },
    tutorNarrationScript: buildKangurLessonNarrationScriptFromText({
      lessonId: 'kangur-ai-tutor',
      title: '',
      description: null,
      text: 'Test narracji panelu.',
      locale: 'pl-PL',
    }),
    tutorNarratorContextRegistry: null,
    isLoading: false,
  }) as KangurAiTutorPanelBodyContextValue;

describe('KangurAiTutorPanelChrome', () => {
  it('renders the narrator icon in minimal panel mode', () => {
    useKangurAiTutorMock.mockReturnValue({
      enabled: true,
      tutorName: 'Pomocnik',
      tutorMoodId: 'neutral',
      tutorBehaviorMoodId: 'neutral',
      tutorBehaviorMoodLabel: 'Neutralny',
      tutorBehaviorMoodDescription: 'Tutor czeka na kolejne pytanie.',
      tutorAvatarSvg: null,
      tutorAvatarImageUrl: null,
      sessionContext: {
        surface: 'lesson',
        contentId: 'lesson-1',
        title: 'Dodawanie',
      },
    });

    render(
      <KangurAiTutorWidgetStateProvider value={createWidgetState()}>
        <KangurAiTutorPanelChrome
          attachedAvatarStyle={{}}
          attachedLaunchOffset={{ x: 0, y: 0 }}
          avatarAnchorKind='dock'
          avatarAttachmentSide='left'
          avatarButtonClassName=''
          avatarPointer={null}
          bubbleEntryDirection='left'
          bubbleMode='bubble'
          bubbleLaunchOrigin='dock-bottom-right'
          bubbleStrategy='left'
          bubbleStyle={{ left: 0, top: 0 }}
          bubbleTailPlacement='bottom'
          canDetachPanelFromContext={false}
          canMovePanelToContext={false}
          chromeVariant='default'
          compactDockedTutorPanelWidth={320}
          canResetPanelPosition={false}
          isAskModalMode={false}
          isCompactDockedTutorPanel={false}
          isFollowingContext={false}
          isGuidedTutorMode={false}
          isMinimalPanelMode
          isOpen
          isPanelDraggable={false}
          isPanelDragging={false}
          isTutorHidden={false}
          minimalPanelStyle={{ left: 0, top: 0 }}
          motionProfile={motionProfile}
          panelAvatarPlacement='independent'
          panelBodyContextValue={createPanelBodyContextValue()}
          panelEmptyStateMessage='Zapytaj tutora'
          panelOpenAnimation='fade'
          panelSnapState='none'
          panelTransition={motionProfile.bubbleTransition}
          pointerMarkerId='kangur-test-marker'
          prefersReducedMotion
          reducedMotionTransitions={reducedMotionTransitions}
          sessionSurfaceLabel={null}
          showAttachedAvatarShell={false}
          suppressPanelSurface={false}
          uiMode='anchored'
          onAttachedAvatarClick={vi.fn()}
          onAttachedAvatarPointerCancel={vi.fn()}
          onAttachedAvatarPointerDown={vi.fn()}
          onAttachedAvatarPointerMove={vi.fn()}
          onAttachedAvatarPointerUp={vi.fn()}
          onBackdropClose={vi.fn()}
          onClose={vi.fn()}
          onDetachPanelFromContext={vi.fn()}
          onDisableTutor={vi.fn()}
          onMovePanelToContext={vi.fn()}
          onResetPanelPosition={vi.fn()}
          onHeaderPointerCancel={vi.fn()}
          onHeaderPointerDown={vi.fn()}
          onHeaderPointerMove={vi.fn()}
          onHeaderPointerUp={vi.fn()}
        >
          <div>Panel content</div>
        </KangurAiTutorPanelChrome>
      </KangurAiTutorWidgetStateProvider>
    );

    expect(screen.getByTestId('kangur-ai-tutor-narrator-header')).toBeInTheDocument();
  });
});
