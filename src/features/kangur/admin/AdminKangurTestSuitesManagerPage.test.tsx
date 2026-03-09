/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
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
            sortOrder: 1000,
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
              auditFlags: ['legacy_choice_descriptions'],
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
              auditFlags: ['explanation_answer_mismatch'],
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
    expect(screen.getByText('Ready suites')).toBeInTheDocument();
    expect(screen.getByText('Needs review')).toBeInTheDocument();
    expect(screen.getByText('Question queue')).toBeInTheDocument();
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
});
