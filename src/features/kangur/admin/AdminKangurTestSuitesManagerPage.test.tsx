/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { settingsStoreMock, mutateAsyncMock, useMasterFolderTreeShellMock, toastMock } =
  vi.hoisted(() => ({
    settingsStoreMock: {
      get: vi.fn(),
      isLoading: false,
    },
    mutateAsyncMock: vi.fn(),
    useMasterFolderTreeShellMock: vi.fn(),
    toastMock: vi.fn(),
  }));

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

vi.mock('@/features/foldertree', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/foldertree')>();
  return {
    ...actual,
    createMasterFolderTreeTransactionAdapter: vi.fn(() => ({ apply: vi.fn() })),
    FolderTreeSearchBar: ({ placeholder }: { placeholder?: string }) => (
      <div data-testid='folder-tree-search'>{placeholder}</div>
    ),
    FolderTreeViewportV2: () => <div data-testid='folder-tree-viewport' />,
    useMasterFolderTreeShell: (...args: unknown[]) => useMasterFolderTreeShellMock(...args),
    useMasterFolderTreeSearch: () => ({
      isActive: false,
      results: [],
    }),
  };
});

vi.mock('@/shared/hooks/use-settings', () => ({
  useUpdateSetting: () => ({
    mutateAsync: mutateAsyncMock,
    isPending: false,
  }),
}));

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: () => settingsStoreMock,
}));

vi.mock('@/shared/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/ui')>();
  return {
    ...actual,
    useToast: () => ({ toast: toastMock }),
  };
});

import { AdminKangurTestSuitesManagerPage } from './AdminKangurTestSuitesManagerPage';
import { KANGUR_TEST_QUESTIONS_SETTING_KEY } from '../test-questions';
import { KANGUR_TEST_SUITES_SETTING_KEY } from '../test-suites';

describe('AdminKangurTestSuitesManagerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    settingsStoreMock.get.mockImplementation((key: string) => {
      if (key === KANGUR_TEST_SUITES_SETTING_KEY) {
        return JSON.stringify([
          {
            id: 'suite-1',
            title: 'Tabliczka mnozenia',
            description: 'Test podstawowy',
            durationMinutes: 15,
            publicationStatus: 'draft',
            sortOrder: 1000,
            enabled: true,
          },
          {
            id: 'suite-2',
            title: 'Gotowy zestaw live',
            description: 'W pelni opublikowany zestaw',
            durationMinutes: 10,
            publicationStatus: 'draft',
            sortOrder: 2000,
            enabled: true,
          },
          {
            id: 'suite-3',
            title: 'Aktualnie live',
            description: 'Zestaw widoczny dla uczniow',
            durationMinutes: 12,
            publicationStatus: 'live',
            publishedAt: '2026-03-09T09:00:00.000Z',
            sortOrder: 3000,
            enabled: true,
          },
        ]);
      }
      if (key === KANGUR_TEST_QUESTIONS_SETTING_KEY) {
        return JSON.stringify({
          'question-ready': {
            id: 'question-ready',
            suiteId: 'suite-1',
            sortOrder: 1000,
            prompt: 'Gotowe pytanie',
            choices: [
              { label: 'A', text: '3' },
              { label: 'B', text: '4' },
            ],
            correctChoiceLabel: 'B',
            pointValue: 3,
            explanation: 'Bo 2+2=4',
            illustration: { type: 'none' },
            editorial: {
              source: 'manual',
              reviewStatus: 'ready',
              workflowStatus: 'published',
              auditFlags: [],
            },
          },
          'question-review': {
            id: 'question-review',
            suiteId: 'suite-1',
            sortOrder: 2000,
            prompt: 'Pytanie do review',
            choices: [
              { label: 'A', text: 'A', description: 'Wizualna wskazowka' },
              { label: 'B', text: 'B' },
            ],
            correctChoiceLabel: 'A',
            pointValue: 4,
            explanation: 'Sprawdz wizual',
            illustration: { type: 'none' },
            editorial: {
              source: 'legacy-import',
              reviewStatus: 'needs-review',
              workflowStatus: 'ready',
              auditFlags: ['legacy_choice_descriptions'],
            },
          },
          'question-publishable': {
            id: 'question-publishable',
            suiteId: 'suite-1',
            sortOrder: 2500,
            prompt: 'Pytanie gotowe do publikacji',
            choices: [
              { label: 'A', text: '2' },
              { label: 'B', text: '5' },
            ],
            correctChoiceLabel: 'B',
            pointValue: 4,
            explanation: 'Bo 2+3=5',
            illustration: { type: 'none' },
            editorial: {
              source: 'manual',
              reviewStatus: 'ready',
              workflowStatus: 'ready',
              auditFlags: [],
            },
          },
          'question-fix': {
            id: 'question-fix',
            suiteId: 'suite-1',
            sortOrder: 3000,
            prompt: 'Pytanie do naprawy',
            choices: [
              { label: 'A', text: '14' },
              { label: 'B', text: '12' },
            ],
            correctChoiceLabel: 'A',
            pointValue: 5,
            explanation: 'Wyjasnienie jest niespojne',
            illustration: { type: 'none' },
            editorial: {
              source: 'legacy-import',
              reviewStatus: 'needs-fix',
              workflowStatus: 'draft',
              auditFlags: ['explanation_answer_mismatch'],
            },
          },
          'suite-2-question-published': {
            id: 'suite-2-question-published',
            suiteId: 'suite-2',
            sortOrder: 1000,
            prompt: 'Pytanie live',
            choices: [
              { label: 'A', text: '6' },
              { label: 'B', text: '8' },
            ],
            correctChoiceLabel: 'B',
            pointValue: 3,
            explanation: 'Bo 4+4=8',
            illustration: { type: 'none' },
            editorial: {
              source: 'manual',
              reviewStatus: 'ready',
              workflowStatus: 'published',
              auditFlags: [],
              publishedAt: '2026-03-09T10:00:00.000Z',
            },
          },
          'suite-3-question-published': {
            id: 'suite-3-question-published',
            suiteId: 'suite-3',
            sortOrder: 1000,
            prompt: 'Pytanie z live zestawu',
            choices: [
              { label: 'A', text: '7' },
              { label: 'B', text: '9' },
            ],
            correctChoiceLabel: 'B',
            pointValue: 3,
            explanation: 'Bo 4+5=9',
            illustration: { type: 'none' },
            editorial: {
              source: 'manual',
              reviewStatus: 'ready',
              workflowStatus: 'published',
              auditFlags: [],
              publishedAt: '2026-03-09T09:00:00.000Z',
            },
          },
        });
      }
      return undefined;
    });
    useMasterFolderTreeShellMock.mockReturnValue({
      capabilities: {
        search: {
          enabled: true,
          placeholder: 'Search suites...',
        },
      },
      appearance: {
        rootDropUi: null,
      },
      controller: {},
      viewport: {
        scrollToNodeRef: { current: null },
      },
    });
  });

  it('renders standalone Kangur tests page with shared shell chrome', () => {
    render(<AdminKangurTestSuitesManagerPage />);

    expect(screen.getByText('Kangur Tests')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toHaveTextContent(
      'Admin/Kangur/Tests'
    );
    expect(screen.getByText('Question bank')).toBeInTheDocument();
    expect(screen.getByText('Suites')).toBeInTheDocument();
    expect(screen.getByText('Clean suites')).toBeInTheDocument();
    expect(screen.getByText('Needs review')).toBeInTheDocument();
    expect(screen.getByText('Question queue')).toBeInTheDocument();
    expect(screen.getByText('Draft questions')).toBeInTheDocument();
    expect(screen.getByText('Ready to publish')).toBeInTheDocument();
    expect(screen.getByText('Live suites')).toBeInTheDocument();
    expect(screen.getByText('Ready for live')).toBeInTheDocument();
    expect(screen.getByText(/need attention/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go live ready suites' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Take live suites offline' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publish ready queue' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open review queue' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open first fix' })).toBeInTheDocument();
    expect(screen.getByText('Test Suite Library')).toBeInTheDocument();
    expect(screen.getByText('Search suites...')).toBeInTheDocument();
    expect(screen.getByTestId('folder-tree-viewport')).toBeInTheDocument();
  });

  it('can launch directly into the first fix-needed question', () => {
    render(<AdminKangurTestSuitesManagerPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Open first fix' }));

    expect(screen.getByText('Kangur Questions')).toBeInTheDocument();
    expect(screen.getByText('Question review')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save Question' })).toBeDisabled();
  });

  it('publishes only structurally ready questions from the ready queue', async () => {
    render(<AdminKangurTestSuitesManagerPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Publish ready queue' }));

    await waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalledWith(
        expect.objectContaining({
          key: KANGUR_TEST_QUESTIONS_SETTING_KEY,
        })
      );
    });

    const questionsUpdate = mutateAsyncMock.mock.calls.find(
      ([input]) => input?.key === KANGUR_TEST_QUESTIONS_SETTING_KEY
    )?.[0];
    const nextStore = JSON.parse(String(questionsUpdate?.value));

    expect(nextStore['question-publishable'].editorial.workflowStatus).toBe('published');
    expect(nextStore['question-publishable'].editorial.publishedAt).toEqual(expect.any(String));
    expect(nextStore['question-review'].editorial.workflowStatus).toBe('ready');
    expect(nextStore['question-fix'].editorial.workflowStatus).toBe('draft');
  });

  it('can mark fully published clean suites live for learners', async () => {
    render(<AdminKangurTestSuitesManagerPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Go live ready suites' }));

    await waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalledWith(
        expect.objectContaining({
          key: KANGUR_TEST_SUITES_SETTING_KEY,
        })
      );
    });

    const suitesUpdate = mutateAsyncMock.mock.calls.find(
      ([input]) => input?.key === KANGUR_TEST_SUITES_SETTING_KEY
    )?.[0];
    const nextSuites = JSON.parse(String(suitesUpdate?.value));
    const liveSuite = nextSuites.find((suite: { id: string }) => suite.id === 'suite-2');
    const unchangedSuite = nextSuites.find((suite: { id: string }) => suite.id === 'suite-1');

    expect(liveSuite.publicationStatus).toBe('live');
    expect(liveSuite.publishedAt).toEqual(expect.any(String));
    expect(unchangedSuite.publicationStatus).toBe('draft');
  });

  it('can take currently live suites offline for learners', async () => {
    render(<AdminKangurTestSuitesManagerPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Take live suites offline' }));

    await waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalledWith(
        expect.objectContaining({
          key: KANGUR_TEST_SUITES_SETTING_KEY,
        })
      );
    });

    const suitesUpdates = mutateAsyncMock.mock.calls
      .filter(([input]) => input?.key === KANGUR_TEST_SUITES_SETTING_KEY)
      .map(([input]) => input);
    const latestSuitesUpdate = suitesUpdates.at(-1);
    const nextSuites = JSON.parse(String(latestSuitesUpdate?.value));
    const nowOfflineSuite = nextSuites.find((suite: { id: string }) => suite.id === 'suite-3');
    const stillDraftSuite = nextSuites.find((suite: { id: string }) => suite.id === 'suite-2');

    expect(nowOfflineSuite.publicationStatus).toBe('draft');
    expect(nowOfflineSuite.publishedAt).toBeUndefined();
    expect(stillDraftSuite.publicationStatus).toBe('draft');
  });
});
