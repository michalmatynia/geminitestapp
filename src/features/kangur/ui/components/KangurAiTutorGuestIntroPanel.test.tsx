/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { KangurAiTutorGuestIntroPanel } from './KangurAiTutorGuestIntroPanel';

vi.mock('@/features/kangur/ui/context/KangurAiTutorContentContext', () => ({
  useKangurAiTutorContent: () => ({
    guestIntro: {
      closeAria: 'Zamknij modal tutora',
      acceptLabel: 'Tak',
    },
  }),
}));

describe('KangurAiTutorGuestIntroPanel', () => {
  it('uses a transparent backdrop without page blur and still closes on outside click', () => {
    const onClose = vi.fn();

    render(
      <KangurAiTutorGuestIntroPanel
        guestIntroDescription='Minimal tutor modal'
        guestIntroHeadline='Janek'
        guestTutorLabel='Janek'
        isAnonymousVisitor={false}
        onAccept={vi.fn()}
        onClose={onClose}
        panelStyle={{}}
        prefersReducedMotion
      />
    );

    const backdrop = screen.getByTestId('kangur-ai-tutor-guest-intro-backdrop');

    expect(backdrop.className).toContain('bg-transparent');
    expect(backdrop.className).not.toContain('backdrop-blur');
    const janekLabels = screen.getAllByText('Janek');

    expect(janekLabels.at(-1)).toHaveClass(
      '[color:var(--kangur-chat-panel-text,var(--kangur-page-text))]'
    );
    expect(screen.getByText('Minimal tutor modal')).toHaveClass(
      '[color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))]'
    );
    expect(screen.getByTestId('kangur-ai-tutor-guest-intro-close')).toHaveClass(
      '[color:var(--kangur-chat-control-text,var(--kangur-chat-panel-text,var(--kangur-page-text)))]'
    );

    fireEvent.click(backdrop);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
