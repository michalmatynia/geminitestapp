/**
 * @vitest-environment jsdom
 */
import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { KangurAiTutorGuestIntroPanel } from './KangurAiTutorGuestIntroPanel';

vi.mock('@/features/kangur/ui/context/KangurAiTutorContentContext', () => ({
  useKangurAiTutorContent: () => ({
    guestIntro: {
      closeAria: 'Zamknij modal tutora',
      acceptLabel: 'Tak',
    },
    common: {
      defaultTutorName: 'Tutor',
      questionInputAria: 'Napisz pytanie',
      sendAria: 'Wyślij',
    },
    narrator: {
      pauseLabel: 'Pauza',
      readLabel: 'Czytaj',
      resumeLabel: 'Wznów',
    },
  }),
}));

vi.mock('@/features/kangur/ui/context/KangurAiTutorContext', () => ({
  useOptionalKangurAiTutor: () => null,
}));

vi.mock('./KangurAiTutorWidget.state', () => ({
  useKangurAiTutorWidgetStateContext: () => ({
    guestAuthFormVisible: false,
    inputValue: '',
    inputRef: createRef<HTMLInputElement>(),
    messageFeedbackByKey: {},
    messagesEndRef: createRef<HTMLDivElement>(),
    setInputValue: vi.fn(),
    setGuestAuthFormVisible: vi.fn(),
    setDrawingImageData: vi.fn(),
  }),
}));

vi.mock('./KangurAiTutorPanelBody.context', () => ({
  useKangurAiTutorPanelBodyContext: () => ({
    askModalHelperText: 'Zapytaj tutora.',
    basePath: '',
    canSendMessages: true,
    drawingImageData: null,
    emptyStateMessage: 'Brak wiadomości.',
    handleFollowUpClick: vi.fn(),
    handleMessageFeedback: vi.fn(),
    handleSend: vi.fn(),
    handleWebsiteHelpTargetClick: vi.fn(),
    inputPlaceholder: 'Zapytaj tutora...',
    isAskModalMode: false,
    isLoading: false,
    isSectionExplainPendingMode: false,
    isSelectionExplainPendingMode: false,
    messages: [],
    narratorSettings: {
      engine: 'client',
      voice: 'coral',
    },
    panelEmptyStateMessage: 'Brak wiadomości.',
    showSources: false,
    tutorNarrationScript: {
      lessonId: 'guest-intro',
      title: 'Guest intro',
      description: '',
      locale: 'pl-PL',
      segments: [{ id: 'segment-1', text: 'Witaj w Kangurze.' }],
    },
    tutorNarratorContextRegistry: null,
    tutorSessionKey: 'session-test',
  }),
}));

describe('KangurAiTutorGuestIntroPanel', () => {
  it('uses a transparent backdrop without page blur and still closes on outside click', () => {
    const onClose = vi.fn();

    render(
      <KangurAiTutorGuestIntroPanel
        guestIntroDescription='Minimal tutor modal'
        guestIntroHeadline='Pomoc logowania'
        guestTutorLabel='Janek'
        isAnonymousVisitor={false}
        onAccept={vi.fn()}
        onClose={onClose}
        onStartChat={vi.fn()}
        panelStyle={{}}
        prefersReducedMotion
      />
    );

    const backdrop = screen.getByTestId('kangur-ai-tutor-guest-intro-backdrop');

    expect(backdrop.className).toContain('bg-transparent');
    expect(backdrop.className).not.toContain('backdrop-blur');
    expect(screen.getByText('Janek')).toBeInTheDocument();
    expect(screen.getByText(/Pomoc logowania/)).toBeInTheDocument();
    expect(screen.getByTestId('kangur-ai-tutor-guest-intro-drawing')).toBeVisible();
    expect(screen.getByText(/Minimal tutor modal/)).toHaveClass(
      '[color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))]'
    );
    expect(screen.getByTestId('kangur-ai-tutor-guest-intro-close')).toHaveClass(
      '[color:var(--kangur-chat-control-text,var(--kangur-chat-panel-text,var(--kangur-page-text)))]'
    );

    fireEvent.click(backdrop);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
