/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { KangurMobileI18nProvider } from '../i18n/kangurMobileI18n';

const {
  replaceMock,
  useKangurMobileCompetitionMock,
  useLocalSearchParamsMock,
  useRouterMock,
} = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  useKangurMobileCompetitionMock: vi.fn(),
  useLocalSearchParamsMock: vi.fn(),
  useRouterMock: vi.fn(),
}));

vi.mock('react-native', () => {
  const createPrimitive = (tagName: keyof React.JSX.IntrinsicElements) => {
    return ({
      accessibilityHint: _accessibilityHint,
      accessibilityLabel,
      accessibilityRole,
      children,
      contentContainerStyle: _contentContainerStyle,
      keyboardShouldPersistTaps: _keyboardShouldPersistTaps,
      onPress,
      testID,
      ...props
    }: React.PropsWithChildren<
      Record<string, unknown> & {
        accessibilityHint?: string;
        accessibilityLabel?: string;
        accessibilityRole?: string;
        contentContainerStyle?: unknown;
        keyboardShouldPersistTaps?: string;
        onPress?: () => void;
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
          ...(onPress ? { onClick: onPress } : {}),
        },
        children,
      );
  };

  return {
    Pressable: createPrimitive('button'),
    ScrollView: createPrimitive('div'),
    Text: createPrimitive('span'),
    View: createPrimitive('div'),
  };
});

vi.mock('react-native-safe-area-context', () => {
  const createPrimitive = (tagName: keyof React.JSX.IntrinsicElements) => {
    return ({
      accessibilityLabel,
      accessibilityRole,
      children,
      testID,
      ...props
    }: React.PropsWithChildren<
      Record<string, unknown> & {
        accessibilityLabel?: string;
        accessibilityRole?: string;
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
        },
        children,
      );
  };

  return {
    SafeAreaView: createPrimitive('div'),
  };
});

vi.mock('expo-router', () => ({
  Link: ({ children }: React.PropsWithChildren) => children,
  useLocalSearchParams: useLocalSearchParamsMock,
  useRouter: useRouterMock,
}));

vi.mock('./useKangurMobileCompetition', () => ({
  useKangurMobileCompetition: useKangurMobileCompetitionMock,
}));

vi.mock('../ai-tutor/KangurMobileAiTutorCard', () => ({
  KangurMobileAiTutorCard: () => React.createElement('div', {}, 'AI Tutor Card'),
}));

import { KangurCompetitionScreen } from './KangurCompetitionScreen';

const renderCompetitionScreen = (locale?: 'pl' | 'en' | 'de') =>
  render(
    locale ? (
      <KangurMobileI18nProvider locale={locale}>
        <KangurCompetitionScreen />
      </KangurMobileI18nProvider>
    ) : (
      <KangurCompetitionScreen />
    ),
  );

const mockCompetitionMode = {
  mode: 'original_2024',
  pointTier: '3',
  questionCount: 2,
  questions: [
    {
      answer: '4',
      choices: ['3', '4', '5', '6'],
      explanation: '2 + 2 daje 4.',
      id: '2024_1',
      question: 'Ile to jest 2 + 2?',
    },
    {
      answer: '8',
      choices: ['6', '7', '8', '9'],
      explanation: 'Dwa razy cztery to osiem.',
      id: '2024_2',
      question: 'Ile to jest 2 × 4?',
    },
  ],
};

describe('KangurCompetitionScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLocalSearchParamsMock.mockReturnValue({});
    useRouterMock.mockReturnValue({
      replace: replaceMock,
    });
    useKangurMobileCompetitionMock.mockReturnValue({
      focusedMode: null,
      modeToken: null,
      modes: [mockCompetitionMode],
    });
  });

  it('returns to the competition catalog when the mode shortcut is stale', () => {
    useLocalSearchParamsMock.mockReturnValue({
      mode: 'final-2025',
    });
    useKangurMobileCompetitionMock.mockReturnValue({
      focusedMode: null,
      modeToken: 'final-2025',
      modes: [mockCompetitionMode],
    });

    renderCompetitionScreen();

    expect(screen.getByText('Skrót konkursu')).toBeTruthy();

    fireEvent.click(screen.getByText('Otwórz pełny konkurs'));

    expect(replaceMock).toHaveBeenCalledWith('/competition');
  });

  it('renders the competition mode list and opens the round player', () => {
    renderCompetitionScreen();

    expect(screen.getByText('AI Tutor Card')).toBeTruthy();
    expect(screen.getByText('Kangur 2024 · Część za 3 pkt')).toBeTruthy();
    expect(screen.getByText('2 pytania')).toBeTruthy();
    expect(screen.getByText('3 punkty')).toBeTruthy();

    fireEvent.click(screen.getByText('Uruchom rundę'));

    expect(screen.getByText('Pytanie 1 z 2')).toBeTruthy();
    expect(screen.getByText('Ile to jest 2 + 2?')).toBeTruthy();
    expect(
      screen.getByText('Możesz pominąć to pytanie i wrócić do niego później.'),
    ).toBeTruthy();
  });

  it('completes the competition round and shows the summary', () => {
    renderCompetitionScreen();

    fireEvent.click(screen.getByText('Uruchom rundę'));
    fireEvent.click(screen.getByText('4'));
    fireEvent.click(screen.getByText('Następne pytanie'));
    fireEvent.click(screen.getByText('8'));
    fireEvent.click(screen.getByText('Zakończ rundę'));

    expect(screen.getByText('Podsumowanie konkursu')).toBeTruthy();
    expect(screen.getByText('2/2 poprawnych · 100%')).toBeTruthy();
    expect(screen.getByText('6/6 punktów')).toBeTruthy();
    expect(screen.getAllByText('Otwórz wyniki')).toHaveLength(2);
    expect(screen.getAllByText('Przejdź do planu dnia')).toHaveLength(2);
  });
});
