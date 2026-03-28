/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { KangurMobileI18nProvider } from '../i18n/kangurMobileI18n';

const { sendQuickActionMock, useKangurMobileAiTutorMock } = vi.hoisted(() => ({
  sendQuickActionMock: vi.fn(),
  useKangurMobileAiTutorMock: vi.fn(),
}));

vi.mock('react-native', () => {
  const createPrimitive = (tagName: keyof React.JSX.IntrinsicElements) => {
    return ({
      accessibilityHint: _accessibilityHint,
      accessibilityLabel,
      accessibilityRole,
      children,
      disabled,
      onPress,
      style: _style,
      testID,
      ...props
    }: React.PropsWithChildren<
      Record<string, unknown> & {
        accessibilityHint?: string;
        accessibilityLabel?: string;
        accessibilityRole?: string;
        disabled?: boolean;
        onPress?: () => void;
        style?: unknown;
        testID?: string;
      }
    >) =>
      React.createElement(
        tagName,
        {
          ...props,
          ...(testID ? { 'data-testid': testID } : {}),
          ...(accessibilityLabel ? { 'aria-label': accessibilityLabel } : {}),
          ...(accessibilityRole ? { role: accessibilityRole } : {}),
          ...(disabled ? { disabled: true } : {}),
          ...(onPress ? { onClick: onPress } : {}),
        },
        children,
      );
  };

  return {
    Pressable: createPrimitive('button'),
    Text: createPrimitive('span'),
    View: createPrimitive('div'),
  };
});

vi.mock('expo-router', () => ({
  Link: ({ children }: React.PropsWithChildren) => children,
}));

vi.mock('./useKangurMobileAiTutor', () => ({
  useKangurMobileAiTutor: useKangurMobileAiTutorMock,
}));

import { KangurMobileAiTutorCard } from './KangurMobileAiTutorCard';

const context = {
  contentId: 'lesson:test',
  focusId: 'focus-id',
  focusKind: 'lesson',
  surface: 'lesson',
  title: 'Test lesson',
} as const;

const renderCard = () =>
  render(
    <KangurMobileI18nProvider locale='en'>
      <KangurMobileAiTutorCard context={context} />
    </KangurMobileI18nProvider>,
  );

describe('KangurMobileAiTutorCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendQuickActionMock.mockResolvedValue(undefined);
    useKangurMobileAiTutorMock.mockReturnValue({
      availabilityMessage: null,
      availabilityState: 'available',
      canSendMessages: true,
      guideEntry: {
        fullDescription: 'Long explanation for the current step.',
        hints: ['Check the operation.', 'Compare the two choices.'],
        id: 'guide-1',
        shortDescription: 'Short explanation.',
        title: 'Tutor guide',
      },
      interactionHint: 'You can ask for the next step.',
      isLoading: false,
      isSending: false,
      quickActions: [
        {
          id: 'hint',
          label: 'Hint',
          prompt: 'Give me a hint.',
        },
      ],
      responseActions: [
        {
          href: '/practice',
          id: 'open-practice',
          label: 'Open practice',
          reason: 'Continue with one more round.',
        },
      ],
      responseMessage: 'Try the shorter path first.',
      sendQuickAction: sendQuickActionMock,
      tutorName: 'Guide Fox',
      usage: {
        dailyMessageLimit: 5,
        messageCount: 2,
      },
      websiteHelpTarget: {
        href: '/lessons',
        label: 'Lessons library',
      },
    });
  });

  it('renders guide content, actions, and usage state', () => {
    renderCard();

    expect(screen.getByText('Guide Fox · AI Tutor')).toBeTruthy();
    expect(screen.getByText('Ready')).toBeTruthy();
    expect(screen.getByText('Today 2/5')).toBeTruthy();
    expect(screen.getByText('Tutor guide')).toBeTruthy();
    expect(screen.getByText('Try the shorter path first.')).toBeTruthy();
    expect(screen.getByText('Hint')).toBeTruthy();
    expect(screen.getByText('Open practice')).toBeTruthy();
    expect(screen.getByText('Open: Lessons library')).toBeTruthy();
  });

  it('sends a quick action when tapped', () => {
    renderCard();

    fireEvent.click(screen.getByText('Hint'));

    expect(sendQuickActionMock).toHaveBeenCalledWith('hint');
  });
});
