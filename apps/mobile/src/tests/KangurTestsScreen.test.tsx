/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { KangurMobileI18nProvider } from '../i18n/kangurMobileI18n';

const {
  replaceMock,
  useKangurMobileTestsMock,
  useLocalSearchParamsMock,
  useRouterMock,
} = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  useKangurMobileTestsMock: vi.fn(),
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
      editable: _editable,
      keyboardShouldPersistTaps: _keyboardShouldPersistTaps,
      multiline: _multiline,
      onPress,
      testID,
      ...props
    }: React.PropsWithChildren<
      Record<string, unknown> & {
        accessibilityHint?: string;
        accessibilityLabel?: string;
        accessibilityRole?: string;
        contentContainerStyle?: unknown;
        editable?: boolean;
        keyboardShouldPersistTaps?: string;
        multiline?: boolean;
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

vi.mock('./useKangurMobileTests', () => ({
  useKangurMobileTests: useKangurMobileTestsMock,
}));

vi.mock('../ai-tutor/KangurMobileAiTutorCard', () => ({
  KangurMobileAiTutorCard: () => React.createElement('div', {}, 'AI Tutor Card'),
}));

import { KangurTestsScreen } from './KangurTestsScreen';

const renderTestsScreen = (locale?: 'pl' | 'en' | 'de') =>
  render(
    locale ? (
      <KangurMobileI18nProvider locale={locale}>
        <KangurTestsScreen />
      </KangurMobileI18nProvider>
    ) : (
      <KangurTestsScreen />
    ),
  );

const mockSuiteItem = {
  questionCount: 2,
  questions: [
    {
      choices: [
        {
          description: 'Dwie pary po dwa.',
          label: 'A',
          svgContent: '',
          text: '4',
        },
        {
          description: 'Trzy pary po dwa.',
          label: 'B',
          svgContent: '',
          text: '6',
        },
      ],
      correctChoiceLabel: 'A',
      editorial: {
        auditFlags: [],
        reviewStatus: 'ready',
        source: 'manual',
        workflowStatus: 'published',
      },
      explanation: 'Dwa razy dwa daje cztery.',
      id: 'question-1',
      illustration: {
        type: 'none',
      },
      pointValue: 3,
      presentation: {
        choiceStyle: 'list',
        layout: 'classic',
      },
      prompt: 'Ile to 2 + 2?',
      sortOrder: 1,
      suiteId: 'suite-clock-2025',
    },
    {
      choices: [
        {
          description: 'Pięć palców u jednej dłoni.',
          label: 'A',
          svgContent: '',
          text: '5',
        },
        {
          description: 'Sześć byłoby za dużo.',
          label: 'B',
          svgContent: '',
          text: '6',
        },
      ],
      correctChoiceLabel: 'A',
      editorial: {
        auditFlags: [],
        reviewStatus: 'ready',
        source: 'manual',
        workflowStatus: 'published',
      },
      explanation: 'Jedna dłoń ma pięć palców.',
      id: 'question-2',
      illustration: {
        type: 'none',
      },
      pointValue: 2,
      presentation: {
        choiceStyle: 'grid',
        layout: 'classic',
      },
      prompt: 'Ile palców ma jedna dłoń?',
      sortOrder: 2,
      suiteId: 'suite-clock-2025',
    },
  ],
  suite: {
    category: 'Arytmetyka',
    description: 'Krótki test rozgrzewkowy przed treningiem.',
    enabled: true,
    gradeLevel: 'Klasa 2',
    id: 'suite-clock-2025',
    publicationStatus: 'live',
    sortOrder: 1,
    title: 'Test startowy',
    year: 2025,
  },
};

describe('KangurTestsScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLocalSearchParamsMock.mockReturnValue({});
    useRouterMock.mockReturnValue({
      replace: replaceMock,
    });
    useKangurMobileTestsMock.mockReturnValue({
      error: null,
      focusToken: null,
      focusedSuiteId: null,
      isLoading: false,
      refresh: vi.fn(),
      suites: [mockSuiteItem],
    });
  });

  it('shows the loading shell while tests are still loading', () => {
    useKangurMobileTestsMock.mockReturnValue({
      error: null,
      focusToken: null,
      focusedSuiteId: null,
      isLoading: true,
      refresh: vi.fn(),
      suites: [],
    });

    renderTestsScreen();

    expect(screen.getByText('Testy')).toBeTruthy();
    expect(screen.getByText('Ładujemy testy')).toBeTruthy();
    expect(
      screen.getByText('Pobieramy aktywne zestawy testów i ich opublikowane pytania.'),
    ).toBeTruthy();
  });

  it('returns to the full catalog when the focus shortcut is stale', () => {
    useLocalSearchParamsMock.mockReturnValue({
      focus: 'algebra',
    });
    useKangurMobileTestsMock.mockReturnValue({
      error: null,
      focusToken: 'algebra',
      focusedSuiteId: null,
      isLoading: false,
      refresh: vi.fn(),
      suites: [mockSuiteItem],
    });

    renderTestsScreen();

    expect(screen.getByText('Skrót testu')).toBeTruthy();
    expect(screen.getByText('Otwórz pełny katalog')).toBeTruthy();

    fireEvent.click(screen.getByText('Otwórz pełny katalog'));

    expect(replaceMock).toHaveBeenCalledWith('/tests');
  });

  it('renders the suite list and opens the selected suite player', () => {
    renderTestsScreen();

    expect(screen.getByText('AI Tutor Card')).toBeTruthy();
    expect(screen.getByText('Test startowy')).toBeTruthy();
    expect(screen.getByText('2 pytania')).toBeTruthy();
    expect(screen.getByText('Rok 2025')).toBeTruthy();
    expect(screen.getByText('Uruchom test')).toBeTruthy();

    fireEvent.click(screen.getByText('Uruchom test'));

    expect(screen.getByText('Pytanie 1 z 2')).toBeTruthy();
    expect(screen.getByText('Ile to 2 + 2?')).toBeTruthy();
    expect(screen.getByText('Sprawdź odpowiedź')).toBeTruthy();
  });

  it('completes the player flow and shows the test summary', () => {
    renderTestsScreen();

    fireEvent.click(screen.getByText('Uruchom test'));
    fireEvent.click(screen.getByText('4'));
    fireEvent.click(screen.getByText('Sprawdź odpowiedź'));

    expect(screen.getByText('Dobra odpowiedź')).toBeTruthy();
    expect(screen.getByText('Poprawnie: A. 4')).toBeTruthy();

    fireEvent.click(screen.getByText('Następne pytanie'));
    fireEvent.click(screen.getByText('5'));
    fireEvent.click(screen.getByText('Sprawdź odpowiedź'));
    fireEvent.click(screen.getByText('Zakończ test'));

    expect(screen.getByText('Wynik testu')).toBeTruthy();
    expect(screen.getByText('5/5 pkt · 100%')).toBeTruthy();
    expect(screen.getAllByText('Otwórz wyniki')).toHaveLength(2);
    expect(screen.getAllByText('Przejdź do planu dnia')).toHaveLength(2);
  });
});
