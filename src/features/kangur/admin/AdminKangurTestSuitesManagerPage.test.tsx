/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FolderTreeViewportV2Props } from '@/features/foldertree/public';

const { settingsStoreMock, mutateAsyncMock, useMasterFolderTreeShellMock, toastMock, folderTreeViewportMock } =
  vi.hoisted(() => ({
    settingsStoreMock: {
      get: vi.fn(),
      isLoading: false,
    },
    mutateAsyncMock: vi.fn(),
    useMasterFolderTreeShellMock: vi.fn(),
    toastMock: vi.fn(),
    folderTreeViewportMock: vi.fn(),
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

vi.mock('@/features/foldertree/public', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/foldertree/public')>();
  return {
    ...actual,
    createMasterFolderTreeTransactionAdapter: vi.fn(() => ({ apply: vi.fn() })),
    FolderTreeSearchBar: ({ placeholder }: { placeholder?: string }) => (
      <div data-testid='folder-tree-search'>{placeholder}</div>
    ),
    FolderTreeViewportV2: (props: FolderTreeViewportV2Props) => {
      folderTreeViewportMock(props);
      return <div data-testid='folder-tree-viewport' />;
    },
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

vi.mock('@/features/kangur/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: () => settingsStoreMock,
}));

vi.mock('@/features/kangur/shared/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/kangur/shared/ui')>();
  return {
    ...actual,
    useToast: () => ({ toast: toastMock }),
  };
});

vi.mock('@/features/kangur/ui/hooks/useKangurPageContent', () => ({
  useKangurPageContentEntry: () => ({
    data: undefined,
    entry: null,
    error: null,
    isError: false,
    isFetched: true,
    isFetching: false,
    isLoading: false,
    isPending: false,
    isSuccess: true,
    refetch: vi.fn(),
    status: 'success',
  }),
}));

import { AdminKangurTestSuitesManagerPage } from './AdminKangurTestSuitesManagerPage';
import { toKangurTestSuiteNodeId } from './kangur-test-suites-master-tree';
import { KANGUR_TEST_QUESTIONS_SETTING_KEY } from '../test-questions';
import { KANGUR_TEST_GROUPS_SETTING_KEY, KANGUR_TEST_SUITES_SETTING_KEY } from '../test-suites';

const getLatestViewportProps = (): FolderTreeViewportV2Props => {
  const latestCall = folderTreeViewportMock.mock.calls.at(-1)?.[0] as
    | FolderTreeViewportV2Props
    | undefined;
  if (!latestCall) {
    throw new Error('Expected FolderTreeViewportV2 to be rendered.');
  }
  return latestCall;
};

const renderTreeNode = (node: React.ReactNode): void => {
  render(node);
};

describe('AdminKangurTestSuitesManagerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    folderTreeViewportMock.mockReset();
    settingsStoreMock.get.mockImplementation((key: string) => {
      if (key === KANGUR_TEST_SUITES_SETTING_KEY) {
        return JSON.stringify([
          {
            id: 'suite-1',
            title: 'Tabliczka mnożenia',
            description: 'Test podstawowy',
            durationMinutes: 15,
            publicationStatus: 'draft',
            sortOrder: 1000,
            enabled: true,
          },
          {
            id: 'suite-2',
            title: 'Gotowy zestaw live',
            description: 'W pełni opublikowany zestaw',
            durationMinutes: 10,
            publicationStatus: 'draft',
            sortOrder: 2000,
            enabled: true,
          },
          {
            id: 'suite-3',
            title: 'Aktualnie live',
            description: 'Zestaw widoczny dla uczniów',
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
              { label: 'A', text: 'A', description: 'Wizualna wskazówka' },
              { label: 'B', text: 'B' },
            ],
            correctChoiceLabel: 'A',
            pointValue: 4,
            explanation: 'Sprawdź wizual',
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
            explanation: 'Wyjaśnienie jest niespojne',
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
      if (key === KANGUR_TEST_GROUPS_SETTING_KEY) {
        return JSON.stringify([
          {
            id: 'group-1',
            title: 'Olympiad 2024',
            description: 'Competition suites',
            enabled: true,
            sortOrder: 1000,
          },
        ]);
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

    const expectText = (text: string | RegExp) => {
      expect(screen.getAllByText(text).length).toBeGreaterThan(0);
    };

    expectText('Kangur Tests');
    expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toHaveTextContent(
      'Admin/Kangur/Tests'
    );
    expectText('Question bank');
    expectText('Groups');
    expectText('Suites');
    expectText('Clean suites');
    expectText('Needs review');
    expectText('Question queue');
    expectText('Draft questions');
    expectText('Ready to publish');
    expectText('Live suites');
    expectText('Ready for live');
    expectText(/need attention/i);
    expect(screen.getByRole('button', { name: 'Go live ready suites' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Take live suites offline' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publish ready queue' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open review queue' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open first fix' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add group/i })).toBeInTheDocument();
    expectText('Test Suite Library');
    expectText('Search suites...');
    expect(screen.getByTestId('folder-tree-viewport')).toBeInTheDocument();
  });

  it('creates a persisted test group from the group modal', async () => {
    render(<AdminKangurTestSuitesManagerPage />);

    fireEvent.click(screen.getByRole('button', { name: /add group/i }));
    fireEvent.change(screen.getByPlaceholderText('e.g. Olympiad 2024'), {
      target: { value: 'Geometry drills' },
    });
    fireEvent.change(screen.getByPlaceholderText('Optional description for this group'), {
      target: { value: 'Practice suites for geometry.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create Group' }));

    await waitFor(() => {
      expect(
        mutateAsyncMock.mock.calls.some(
          ([input]) => input?.key === KANGUR_TEST_GROUPS_SETTING_KEY
        )
      ).toBe(true);
    });
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

  it('opens a dedicated group metadata panel from the suite tree', async () => {
    render(<AdminKangurTestSuitesManagerPage />);

    const viewportProps = getLatestViewportProps();
    renderTreeNode(
      viewportProps.renderNode?.({
        node: {
          id: 'kangur-test-suite-category-group:enabled:Olympiad%202024',
          kind: 'kangur-test-suite-category-group',
          name: 'Olympiad 2024',
          metadata: {
            kangurTestSuiteCategoryGroup: {
              suiteCount: 0,
            },
          },
        } as never,
        depth: 0,
        index: 0,
        siblingCount: 1,
        isSelected: false,
        isExpanded: true,
        isDragging: false,
        isSearchMatch: false,
        hasChildren: true,
        select: vi.fn(),
        toggleExpand: vi.fn(),
      })
    );

    fireEvent.click(screen.getByRole('button', { name: 'Edit test group Olympiad 2024' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save group' })).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Delete group' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });

  it('opens the suite move dialog from the suite tree', async () => {
    render(<AdminKangurTestSuitesManagerPage />);

    const viewportProps = getLatestViewportProps();
    renderTreeNode(
      viewportProps.renderNode?.({
        node: {
          id: toKangurTestSuiteNodeId('suite-1'),
          name: 'Tabliczka mnożenia',
          metadata: {},
        } as never,
        depth: 0,
        index: 0,
        siblingCount: 1,
        isSelected: false,
        isExpanded: false,
        isDragging: false,
        isSearchMatch: false,
        hasChildren: false,
        select: vi.fn(),
        toggleExpand: vi.fn(),
      })
    );

    fireEvent.click(screen.getByRole('button', { name: 'Move suite to group' }));

    await waitFor(() => {
      expect(screen.getAllByText('Move Suite To Another Group').length).toBeGreaterThan(0);
    });
  });

  it('opens the bulk question move dialog from suite operations', async () => {
    render(<AdminKangurTestSuitesManagerPage />);

    const viewportProps = getLatestViewportProps();
    renderTreeNode(
      viewportProps.renderNode?.({
        node: {
          id: toKangurTestSuiteNodeId('suite-1'),
          name: 'Tabliczka mnożenia',
          metadata: {},
        } as never,
        depth: 0,
        index: 0,
        siblingCount: 1,
        isSelected: false,
        isExpanded: false,
        isDragging: false,
        isSearchMatch: false,
        hasChildren: false,
        select: vi.fn(),
        toggleExpand: vi.fn(),
      })
    );

    fireEvent.click(screen.getByRole('button', { name: 'Manage questions' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Move all 4 questions' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Move all 4 questions' }));

    await waitFor(() => {
      expect(screen.getAllByText('Move Questions To Another Suite').length).toBeGreaterThan(0);
    });
  });
});
