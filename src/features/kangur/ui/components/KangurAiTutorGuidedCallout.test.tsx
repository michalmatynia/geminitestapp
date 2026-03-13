/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_KANGUR_AI_TUTOR_CONTENT } from '@/shared/contracts/kangur-ai-tutor-content';

import { KangurAiTutorGuidedCallout } from './KangurAiTutorGuidedCallout';

import type { HTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';

const widgetStateContextMock = vi.hoisted(() => ({
  guidedTutorTarget: null,
  homeOnboardingStepIndex: 1,
  selectionConversationContext: null,
  selectionGuidanceHandoffText: null,
  selectionResponsePending: null,
}));

const panelBodyContextMock = vi.hoisted(() => ({
  activeSelectedText: null,
  activeFocus: {
    conversationFocus: {
      knowledgeReference: null,
      label: null,
    },
  },
  isLoading: false,
  isSelectionExplainPendingMode: false,
  messages: [],
  selectedTextPreview: null,
}));

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: ({
      animate: _animate,
      children,
      exit: _exit,
      initial: _initial,
      transition: _transition,
      ...props
    }: HTMLAttributes<HTMLDivElement> & {
      animate?: unknown;
      exit?: unknown;
      initial?: unknown;
      transition?: unknown;
    }) => <div {...props}>{children}</div>,
  },
}));

vi.mock('@/features/kangur/ui/context/KangurAiTutorContentContext', () => ({
  useKangurAiTutorContent: () => DEFAULT_KANGUR_AI_TUTOR_CONTENT,
}));

vi.mock('./KangurAiTutorWidget.state', () => ({
  useKangurAiTutorWidgetStateContext: () => widgetStateContextMock,
}));

vi.mock('./KangurAiTutorPanelBody.context', () => ({
  useKangurAiTutorPanelBodyContext: () => panelBodyContextMock,
}));

vi.mock('@/features/kangur/ui/design/primitives', () => ({
  KangurButton: ({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock('./KangurAiTutorChrome', () => ({
  KangurAiTutorChromeBadge: ({ children, ...props }: HTMLAttributes<HTMLDivElement>) => (
    <div {...props}>{children}</div>
  ),
  KangurAiTutorChromeCloseButton: ({
    children,
    ...props
  }: ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
  KangurAiTutorChromeKicker: ({ children, ...props }: HTMLAttributes<HTMLDivElement>) => (
    <div {...props}>{children}</div>
  ),
  KangurAiTutorWarmInsetCard: ({ children, ...props }: HTMLAttributes<HTMLDivElement>) => (
    <div {...props}>{children}</div>
  ),
  KangurAiTutorWarmOverlayPanel: ({ children, ...props }: HTMLAttributes<HTMLDivElement>) => (
    <div {...props}>{children}</div>
  ),
}));

describe('KangurAiTutorGuidedCallout', () => {
  beforeEach(() => {
    widgetStateContextMock.guidedTutorTarget = null;
    widgetStateContextMock.homeOnboardingStepIndex = 1;
    widgetStateContextMock.selectionConversationContext = null;
    widgetStateContextMock.selectionGuidanceHandoffText = null;
    widgetStateContextMock.selectionResponsePending = null;
    panelBodyContextMock.activeFocus = {
      conversationFocus: {
        knowledgeReference: null,
        label: null,
      },
    };
    panelBodyContextMock.activeSelectedText = null;
    panelBodyContextMock.isLoading = false;
    panelBodyContextMock.isSelectionExplainPendingMode = false;
    panelBodyContextMock.messages = [];
    panelBodyContextMock.selectedTextPreview = null;
  });

  it('renders the mobile home onboarding sheet without hitting a temporal dead zone error', () => {
    render(
      <KangurAiTutorGuidedCallout
        avatarPlacement='bottom'
        calloutKey='home-onboarding'
        calloutTestId='kangur-ai-tutor-guided-callout'
        detail='Dowiedz się, jak korzystać z tutora na telefonie.'
        entryDirection='right'
        headerLabel='Asystent'
        mode='home_onboarding'
        onAction={vi.fn()}
        placement='bottom'
        prefersReducedMotion
        reducedMotionTransitions={{
          instant: { duration: 0 },
          stableState: { opacity: 1, scale: 1, y: 0 },
        }}
        sectionGuidanceLabel={null}
        sectionResponsePendingKind={null}
        selectionPreview={null}
        shouldRender
        showSectionGuidanceCallout={false}
        showSelectionGuidanceCallout={false}
        stepLabel='Krok 2 z 3'
        style={{ bottom: 8, left: 16, position: 'fixed', width: 288 }}
        title='Poznaj mobilny tryb Kangura'
        transitionDuration={0}
        transitionEase={[0.22, 1, 0.36, 1]}
      />
    );

    expect(screen.getByTestId('kangur-ai-tutor-guided-callout')).toHaveTextContent(
      'Poznaj mobilny tryb Kangura'
    );
    expect(screen.getByText('Krok 2 z 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Wstecz' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rozumiem' })).toBeInTheDocument();
  });

  it('keeps the guided selection shell and injects the saved source plus resolved answer inline', () => {
    widgetStateContextMock.guidedTutorTarget = {
      kind: 'selection_excerpt',
      mode: 'selection',
      selectedText: '🏗️ MISTRZOSTWO 67% 2/4 odznak',
    };
    widgetStateContextMock.selectionConversationContext = {
      focusLabel: 'Postęp gracza',
      knowledgeReference: {
        sourceCollection: 'kangur_page_content',
        sourceRecordId: 'game-home-progress',
        sourcePath: 'entry:game-home-progress#fragment:badge-track-mastery',
      },
      messageStartIndex: 2,
      selectedText: '🏗️ MISTRZOSTWO 67% 2/4 odznak',
    };
    panelBodyContextMock.activeFocus = {
      conversationFocus: {
        knowledgeReference: {
          sourceCollection: 'kangur_page_content',
          sourceRecordId: 'game-home-progress',
          sourcePath: 'entry:game-home-progress#fragment:badge-track-mastery',
        },
        label: 'Postęp gracza',
      },
    };
    panelBodyContextMock.activeSelectedText = '🏗️ MISTRZOSTWO 67% 2/4 odznak';
    panelBodyContextMock.messages = [
      {
        content: 'Wyjaśnij zaznaczony fragment krok po kroku.',
        role: 'user',
      },
      {
        answerResolutionMode: 'page_content',
        content: 'To ścieżka mistrzostwa pokazuje Twój postęp w odznakach i lekcjach.',
        role: 'assistant',
      },
    ];

    render(
      <KangurAiTutorGuidedCallout
        avatarPlacement='left'
        calloutKey='selection'
        calloutTestId='kangur-ai-tutor-selection-guided-callout'
        detail='Za chwilę otworzę wyjaśnienie dokładnie dla zaznaczonego tekstu.'
        entryDirection='left'
        headerLabel='Janek · wyjaśnienie'
        mode='selection'
        onAction={vi.fn()}
        placement='right'
        prefersReducedMotion
        reducedMotionTransitions={{
          instant: { duration: 0 },
          stableState: { opacity: 1, scale: 1, y: 0 },
        }}
        sectionGuidanceLabel={null}
        sectionResponsePendingKind={null}
        selectionPreview='🏗️ MISTRZOSTWO 67% 2/4 odznak'
        shouldRender
        showSectionGuidanceCallout={false}
        showSelectionGuidanceCallout
        stepLabel={null}
        style={{ left: 16, position: 'fixed', top: 24, width: 320 }}
        title='Wyjaśniam ten fragment.'
        transitionDuration={0}
        transitionEase={[0.22, 1, 0.36, 1]}
      />
    );

    expect(screen.getByTestId('kangur-ai-tutor-selection-guided-callout')).toHaveTextContent(
      'Wyjaśniam ten fragment.'
    );
    expect(screen.getByTestId('kangur-ai-tutor-selection-guided-source')).toHaveTextContent(
      'Postęp gracza'
    );
    expect(screen.getByTestId('kangur-ai-tutor-selection-guided-source')).toHaveTextContent(
      'entry:game-home-progress#fragment:badge-track-mastery'
    );
    expect(
      screen.getByTestId('kangur-ai-tutor-selection-guided-page-content-badge')
    ).toHaveTextContent('Zapisana tresc strony');
    expect(screen.getByTestId('kangur-ai-tutor-selection-guided-answer')).toHaveTextContent(
      'To ścieżka mistrzostwa pokazuje Twój postęp w odznakach i lekcjach.'
    );
    expect(screen.queryByText('Za chwilę otworzę wyjaśnienie dokładnie dla zaznaczonego tekstu.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rozumiem' })).toBeInTheDocument();
  });
});
