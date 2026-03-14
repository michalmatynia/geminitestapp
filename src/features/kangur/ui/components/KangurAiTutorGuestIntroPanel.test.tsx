/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { KangurAiTutorGuestIntroPanel } from './KangurAiTutorGuestIntroPanel';

describe('KangurAiTutorGuestIntroPanel', () => {
  it('renders a simple onboarding prompt with Tak and Nie buttons', () => {
    const onAccept = vi.fn();
    const onClose = vi.fn();

    render(
      <KangurAiTutorGuestIntroPanel
        guestIntroDescription='Desc'
        guestIntroHeadline='Headline'
        guestTutorLabel='Janek'
        isAnonymousVisitor={false}
        onAccept={onAccept}
        onClose={onClose}
        onStartChat={vi.fn()}
        panelStyle={{}}
        prefersReducedMotion
      />
    );

    expect(screen.getByText('Janek')).toBeInTheDocument();
    expect(screen.getByText('Czy chcesz rozpocząć onboarding?')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-ai-tutor-onboarding-accept')).toHaveTextContent('Tak');
    expect(screen.getByTestId('kangur-ai-tutor-onboarding-dismiss')).toHaveTextContent('Nie');
  });

  it('calls onAccept when Tak is clicked for authenticated users', () => {
    const onAccept = vi.fn();

    render(
      <KangurAiTutorGuestIntroPanel
        guestIntroDescription=''
        guestIntroHeadline=''
        guestTutorLabel='Tutor'
        isAnonymousVisitor={false}
        onAccept={onAccept}
        onClose={vi.fn()}
        onStartChat={vi.fn()}
        panelStyle={{}}
        prefersReducedMotion
      />
    );

    fireEvent.click(screen.getByTestId('kangur-ai-tutor-onboarding-accept'));
    expect(onAccept).toHaveBeenCalledTimes(1);
  });

  it('calls onStartChat when Tak is clicked for anonymous users', () => {
    const onStartChat = vi.fn();

    render(
      <KangurAiTutorGuestIntroPanel
        guestIntroDescription=''
        guestIntroHeadline=''
        guestTutorLabel='Tutor'
        isAnonymousVisitor
        onAccept={vi.fn()}
        onClose={vi.fn()}
        onStartChat={onStartChat}
        panelStyle={{}}
        prefersReducedMotion
      />
    );

    fireEvent.click(screen.getByTestId('kangur-ai-tutor-onboarding-accept'));
    expect(onStartChat).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Nie is clicked', () => {
    const onClose = vi.fn();

    render(
      <KangurAiTutorGuestIntroPanel
        guestIntroDescription=''
        guestIntroHeadline=''
        guestTutorLabel='Tutor'
        isAnonymousVisitor
        onAccept={vi.fn()}
        onClose={onClose}
        onStartChat={vi.fn()}
        panelStyle={{}}
        prefersReducedMotion
      />
    );

    fireEvent.click(screen.getByTestId('kangur-ai-tutor-onboarding-dismiss'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on backdrop click', () => {
    const onClose = vi.fn();

    render(
      <KangurAiTutorGuestIntroPanel
        guestIntroDescription=''
        guestIntroHeadline=''
        guestTutorLabel='Tutor'
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

    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
