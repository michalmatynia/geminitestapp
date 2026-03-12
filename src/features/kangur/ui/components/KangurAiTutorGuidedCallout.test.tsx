/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_KANGUR_AI_TUTOR_CONTENT } from '@/shared/contracts/kangur-ai-tutor-content';

import { KangurAiTutorGuidedCallout } from './KangurAiTutorGuidedCallout';

import type { HTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';

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
  useKangurAiTutorWidgetStateContext: () => ({
    guidedTutorTarget: null,
    homeOnboardingStepIndex: 1,
  }),
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
});
