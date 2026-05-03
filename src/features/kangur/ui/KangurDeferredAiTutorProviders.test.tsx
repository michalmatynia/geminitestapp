/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { KangurDeferredAiTutorProviders } from '@/features/kangur/ui/KangurDeferredAiTutorProviders';
import { useKangurAiTutor } from '@/features/kangur/ui/context/KangurAiTutorContext';
import { useKangurTutorAnchor } from '@/features/kangur/ui/hooks/useKangurTutorAnchor';
import { useKangurTutorAnchorState } from '@/features/kangur/ui/context/KangurTutorAnchorContext';

const { localeMock, authStateMock, deferredHomeTutorContextReadyMock } = vi.hoisted(() => ({
  localeMock: vi.fn(() => 'pl'),
  authStateMock: vi.fn(() => ({ isAuthenticated: false })),
  deferredHomeTutorContextReadyMock: vi.fn(() => true),
}));

vi.mock('next-intl', () => ({
  useLocale: () => localeMock(),
}));

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useKangurAuthState: () => authStateMock(),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurDeferredHomeTutorContextReady', () => ({
  useKangurDeferredHomeTutorContextReady: () => deferredHomeTutorContextReadyMock(),
}));

function TutorContextProbe(): React.JSX.Element {
  const tutor = useKangurAiTutor();

  return <div data-testid='kangur-ai-tutor-enabled'>{String(tutor.enabled)}</div>;
}

function TutorAnchorProbe(): React.JSX.Element {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const { anchors } = useKangurTutorAnchorState();

  useKangurTutorAnchor({
    id: 'kangur-home-login-action',
    kind: 'login_action',
    ref,
    surface: 'game',
    enabled: true,
    priority: 10,
    metadata: {
      contentId: 'home',
      label: 'Log in',
    },
  });

  return (
    <div ref={ref}>
      <div data-testid='kangur-tutor-anchor-count'>{anchors.length}</div>
    </div>
  );
}

describe('KangurDeferredAiTutorProviders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localeMock.mockReturnValue('pl');
    authStateMock.mockReturnValue({ isAuthenticated: false });
    deferredHomeTutorContextReadyMock.mockReturnValue(true);
  });

  it('provides the dormant tutor context on the first render', () => {
    render(
      <KangurDeferredAiTutorProviders>
        <TutorContextProbe />
      </KangurDeferredAiTutorProviders>
    );

    expect(screen.getByTestId('kangur-ai-tutor-enabled')).toHaveTextContent('false');
  });

  it('keeps tutor anchors dormant until the home tutor context gate opens', () => {
    deferredHomeTutorContextReadyMock.mockReturnValue(false);

    render(
      <KangurDeferredAiTutorProviders>
        <TutorAnchorProbe />
      </KangurDeferredAiTutorProviders>
    );

    expect(screen.getByTestId('kangur-tutor-anchor-count')).toHaveTextContent('0');
  });
});
