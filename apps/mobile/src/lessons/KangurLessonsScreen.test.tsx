/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  useLessonsScreenBootStateMock,
  useKangurMobileLessonsMock,
  useLocalSearchParamsMock,
} = vi.hoisted(() => ({
  useLessonsScreenBootStateMock: vi.fn(),
  useKangurMobileLessonsMock: vi.fn(),
  useLocalSearchParamsMock: vi.fn(),
}));

vi.mock('react-native', () => {
  const createPrimitive = (tagName: keyof React.JSX.IntrinsicElements) => {
    return ({
      children,
      onPress,
      ...props
    }: React.PropsWithChildren<Record<string, unknown> & { onPress?: () => void }>) =>
      React.createElement(
        tagName,
        {
          ...props,
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
    return ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement(tagName, props, children);
  };

  return {
    SafeAreaView: createPrimitive('div'),
  };
});

vi.mock('expo-router', () => ({
  Link: ({ children }: React.PropsWithChildren) => children,
  useLocalSearchParams: useLocalSearchParamsMock,
}));

vi.mock('@kangur/core', () => ({
  getKangurPortableLessonBody: vi.fn(() => ({
    introduction: 'Najpierw zobacz, jak przesuwaja sie wskazowki.',
    practiceNote: 'Po lekcji przejdz od razu do krotszego treningu zegara.',
    sections: [
      {
        description: 'Zacznij od pelnych godzin.',
        id: 'sec-1',
        reminders: ['Najpierw patrz na krotsza wskazowke.'],
        title: 'Pelne godziny',
      },
    ],
  })),
  getKangurPracticeOperationForLessonComponent: vi.fn(() => 'clock'),
}));

vi.mock('./useLessonsScreenBootState', () => ({
  useLessonsScreenBootState: useLessonsScreenBootStateMock,
}));

vi.mock('./useKangurMobileLessons', () => ({
  useKangurMobileLessons: useKangurMobileLessonsMock,
}));

import { KangurLessonsScreen } from './KangurLessonsScreen';

const mockLessonItem = {
  isFocused: true,
  lesson: {
    componentId: 'clock',
    description: 'Naucz sie odczytywac godziny na zegarze.',
    emoji: '🕒',
    id: 'lesson-clock',
    title: 'Nauka zegara',
  },
  mastery: {
    badgeAccent: 'emerald',
    statusLabel: 'Opanowane 100%',
    summaryLabel: 'Swietnie radzisz sobie z odczytywaniem godzin.',
  },
};

describe('KangurLessonsScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLocalSearchParamsMock.mockReturnValue({});
    useKangurMobileLessonsMock.mockReturnValue({
      focusToken: 'clock',
      lessons: [mockLessonItem],
      selectedLesson: mockLessonItem,
    });
  });

  it('keeps the hero visible while lesson skeletons are loading', () => {
    useLessonsScreenBootStateMock.mockReturnValue(true);

    render(<KangurLessonsScreen />);

    expect(screen.getByText('Lekcje')).toBeTruthy();
    expect(screen.getByText('Nauka i powtórki')).toBeTruthy();
    expect(screen.getByText('Ładowanie lekcji')).toBeTruthy();
    expect(
      screen.getByText('Przygotowujemy wybraną lekcję i sekcje do czytania.'),
    ).toBeTruthy();
    expect(screen.getByText('Wczytujemy listę tematów i stan opanowania.')).toBeTruthy();
    expect(screen.queryByText('Wybrana lekcja')).toBeNull();
  });

  it('replaces the loading cards with the focused lesson content after boot', () => {
    useLessonsScreenBootStateMock.mockReturnValue(false);

    render(<KangurLessonsScreen />);

    expect(screen.getByText('Lekcje')).toBeTruthy();
    expect(screen.getByText('Wybrana lekcja')).toBeTruthy();
    expect(screen.getAllByText('🕒 Nauka zegara').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Sekcje lekcji')).toBeTruthy();
    expect(
      screen.getByText(
        'Zacznij od nowych tematów albo wróć do obszarów wymagających powtórki.',
      ),
    ).toBeTruthy();
    expect(screen.queryByText('Ładowanie lekcji')).toBeNull();
    expect(screen.queryByText('Wczytujemy listę tematów i stan opanowania.')).toBeNull();
  });
});
