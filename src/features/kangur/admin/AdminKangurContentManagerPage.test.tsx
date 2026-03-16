/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { lessonsPageMock, testsPageMock, settingsStoreMock } = vi.hoisted(() => ({
  lessonsPageMock: vi.fn(),
  testsPageMock: vi.fn(),
  settingsStoreMock: {
    get: vi.fn(),
  },
}));

let lessonsData: Array<Record<string, unknown>> = [];
let lessonDocumentsData: Record<string, unknown> = {};

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('./AdminKangurLessonsManagerPage', () => ({
  AdminKangurLessonsManagerPage: (props: { standalone?: boolean }) => {
    lessonsPageMock(props);
    return <div>Lessons manager body</div>;
  },
}));

vi.mock('./AdminKangurTestSuitesManagerPage', () => ({
  AdminKangurTestSuitesManagerPage: (props: { standalone?: boolean }) => {
    testsPageMock(props);
    return <div>Tests manager body</div>;
  },
}));

vi.mock('@/features/kangur/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: () => settingsStoreMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurLessons', () => ({
  useKangurLessons: () => ({
    data: lessonsData,
  }),
  useKangurLessonDocuments: () => ({
    data: lessonDocumentsData,
  }),
}));

import { AdminKangurContentManagerPage } from './AdminKangurContentManagerPage';
import { KANGUR_TEST_QUESTIONS_SETTING_KEY } from '@/features/kangur/test-questions';
import { KANGUR_TEST_SUITES_SETTING_KEY } from '@/features/kangur/test-suites';

describe('AdminKangurContentManagerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    lessonsData = [
      {
        id: 'lesson-clock',
        componentId: 'clock',
        contentMode: 'document',
        title: 'Nauka zegara',
        description: 'Odczytuj godziny',
        emoji: '🕐',
        color: '#fff',
        activeBg: 'bg-indigo-500',
        sortOrder: 1000,
        enabled: true,
        subject: 'maths',
      },
      {
        id: 'lesson-calendar',
        componentId: 'calendar',
        contentMode: 'component',
        title: 'Kalendarz',
        description: 'Dni i miesiące',
        emoji: '📅',
        color: '#fff',
        activeBg: 'bg-violet-500',
        sortOrder: 2000,
        enabled: false,
        subject: 'maths',
      },
    ];
    lessonDocumentsData = {
      'lesson-clock': {
        version: 1,
        blocks: [
          {
            id: 'text-1',
            type: 'text',
            html: '<p>Intro</p>',
            align: 'left',
          },
        ],
      },
    };
    settingsStoreMock.get.mockImplementation((key: string) => {
      if (key === KANGUR_TEST_SUITES_SETTING_KEY) {
        return JSON.stringify([{ id: 'suite-1', title: 'Suite', description: '', year: 2024, gradeLevel: '', category: 'custom', enabled: true, sortOrder: 1000 }]);
      }
      if (key === KANGUR_TEST_QUESTIONS_SETTING_KEY) {
        return JSON.stringify({
          'question-1': {
            id: 'question-1',
            suiteId: 'suite-1',
            sortOrder: 1000,
            prompt: 'Ile to 2 + 2?',
            choices: [
              { label: 'A', text: '3' },
              { label: 'B', text: '4' },
            ],
            correctChoiceLabel: 'B',
            pointValue: 3,
            explanation: '',
            illustration: { type: 'none' },
          },
        });
      }
      return null;
    });
  });

  it('renders Kangur admin shell chrome and defaults to lessons tab', () => {
    render(<AdminKangurContentManagerPage />);

    const expectText = (text: string | RegExp) => {
      expect(screen.getAllByText(text).length).toBeGreaterThan(0);
    };

    expectText('Kangur Content Manager');
    expectText('Content workspace');
    expectText('Choose workspace');
    expectText('Lessons workspace');
    expectText('Shared surface');
    expectText('Authoring surface');
    expectText('Custom content');
    expectText('Needs import');
    expectText('Needs fixes');
    expectText('Missing narration');
    expectText('Hidden lessons');
    expect(screen.getAllByText('Tests').length).toBeGreaterThan(0);
    expectText('1 questions across all test suites');
    expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toHaveTextContent(
      'Admin/Kangur/Content Manager'
    );
    expectText('Lessons manager body');
    expect(lessonsPageMock).toHaveBeenCalledWith({ standalone: false });
    expect(testsPageMock).not.toHaveBeenCalled();
  });

  it('switches tabs and persists the selected content-manager view', () => {
    render(<AdminKangurContentManagerPage />);

    fireEvent.click(screen.getByRole('button', { name: /tests/i }));

    expect(screen.getByText('Tests manager body')).toBeInTheDocument();
    expect(screen.getByText('Tests workspace')).toBeInTheDocument();
    expect(screen.getByText('Assessment surface')).toBeInTheDocument();
    expect(testsPageMock).toHaveBeenCalledWith({ standalone: false });
    expect(window.localStorage.getItem('kangur_content_manager_tab_v1')).toBe('tests');
  });

  it('restores the persisted tests tab on first render', () => {
    window.localStorage.setItem('kangur_content_manager_tab_v1', 'tests');

    render(<AdminKangurContentManagerPage />);

    expect(screen.getByText('Tests manager body')).toBeInTheDocument();
    expect(testsPageMock).toHaveBeenCalledWith({ standalone: false });
    expect(lessonsPageMock).not.toHaveBeenCalled();
  });
});
