/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const runtimeState = vi.hoisted(() => ({
  value: {
    activeLearner: {
      id: 'learner-1',
      displayName: 'Ada',
      loginName: 'ada01',
      status: 'active',
    },
    canAccessDashboard: true,
    createForm: {
      displayName: '',
      age: '',
      loginName: '',
      password: '',
    },
    editForm: {
      displayName: 'Ada',
      loginName: 'ada01',
      password: '',
      status: 'active',
    },
    feedback: 'Zapisano dane ucznia.',
    handleCreateLearner: vi.fn(),
    handleDeleteLearner: vi.fn(),
    handleSaveLearner: vi.fn(),
    isCreateLearnerModalOpen: false,
    isSubmitting: false,
    learners: [
      {
        id: 'learner-1',
        displayName: 'Ada',
        loginName: 'ada01',
        status: 'active',
      },
      {
        id: 'learner-2',
        displayName: 'Olek',
        loginName: 'olek02',
        status: 'disabled',
      },
    ],
    selectLearner: vi.fn(),
    setCreateLearnerModalOpen: vi.fn(),
    updateCreateField: vi.fn(),
    updateEditField: vi.fn(),
  },
}));
const useKangurPageContentEntryMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/kangur/ui/context/KangurParentDashboardRuntimeContext', () => ({
  useKangurParentDashboardRuntime: () => runtimeState.value,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurPageContent', () => ({
  useKangurPageContentEntry: useKangurPageContentEntryMock,
}));

import { KangurParentDashboardLearnerManagementWidget } from './KangurParentDashboardLearnerManagementWidget';

describe('KangurParentDashboardLearnerManagementWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useKangurPageContentEntryMock.mockReturnValue({
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
    });
    runtimeState.value = {
      activeLearner: {
        id: 'learner-1',
        displayName: 'Ada',
        loginName: 'ada01',
        status: 'active',
      },
      canAccessDashboard: true,
      createForm: {
        displayName: '',
        age: '',
        loginName: '',
        password: '',
      },
      editForm: {
        displayName: 'Ada',
        loginName: 'ada01',
        password: '',
        status: 'active',
      },
      feedback: 'Zapisano dane ucznia.',
      handleCreateLearner: vi.fn(),
      handleDeleteLearner: vi.fn(),
      handleSaveLearner: vi.fn(),
      isCreateLearnerModalOpen: false,
      isSubmitting: false,
      learners: [
        {
          id: 'learner-1',
          displayName: 'Ada',
          loginName: 'ada01',
          status: 'active',
        },
        {
          id: 'learner-2',
          displayName: 'Olek',
          loginName: 'olek02',
          status: 'disabled',
        },
      ],
      selectLearner: vi.fn(),
      setCreateLearnerModalOpen: vi.fn(),
      updateCreateField: vi.fn(),
      updateEditField: vi.fn(),
    };
  });

  it('uses storefront text tokens across learner management cards and actions', () => {
    const setCreateLearnerModalOpen = vi.fn();
    runtimeState.value = {
      ...runtimeState.value,
      isCreateLearnerModalOpen: true,
      setCreateLearnerModalOpen,
    };

    render(<KangurParentDashboardLearnerManagementWidget />);

    expect(screen.getByText('Zarządzaj profilami bez opuszczania panelu')).toHaveClass(
      '[color:var(--kangur-page-text)]'
    );
    expect(
      screen.getByText(
        'Rodzic loguje się emailem, a uczniowie dostają osobne nazwy logowania i hasła.'
      )
    ).toHaveClass('[color:var(--kangur-page-muted-text)]');
    expect(screen.getByText('Login: olek02')).toHaveClass('[color:var(--kangur-page-muted-text)]');
    expect(screen.getByText('Kliknij, aby przełączyć profil')).toHaveClass(
      '[color:var(--kangur-page-muted-text)]'
    );
    expect(screen.getByText('Ada', { selector: 'span' })).toHaveClass(
      '[color:var(--kangur-page-text)]'
    );
    expect(screen.getByTestId('parent-create-learner-modal')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Dodaj ucznia' }));

    expect(setCreateLearnerModalOpen).toHaveBeenCalledWith(true);
    expect(screen.getByText('Zapisano dane ucznia.')).toHaveClass(
      '[color:var(--kangur-page-muted-text)]'
    );

    fireEvent.click(screen.getByTestId('parent-dashboard-learner-card-learner-2'));

    expect(runtimeState.value.selectLearner).toHaveBeenCalledWith('learner-2');
  });

  it('stays hidden without dashboard access', () => {
    runtimeState.value = {
      ...runtimeState.value,
      canAccessDashboard: false,
    };

    const { container } = render(<KangurParentDashboardLearnerManagementWidget />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders Mongo-backed section intro copy when available', () => {
    useKangurPageContentEntryMock.mockReturnValue({
      data: undefined,
      entry: {
        id: 'parent-dashboard-learner-management',
        title: 'Zarządzaj profilami bez opuszczania panelu',
        summary: 'Wybierz ucznia i popraw jego dane bez wychodzenia z panelu.',
      },
      error: null,
      isError: false,
      isFetched: true,
      isFetching: false,
      isLoading: false,
      isPending: false,
      isSuccess: true,
      refetch: vi.fn(),
      status: 'success',
    });

    render(<KangurParentDashboardLearnerManagementWidget />);

    expect(screen.getByText('Wybierz ucznia i popraw jego dane bez wychodzenia z panelu.')).toHaveClass(
      '[color:var(--kangur-page-muted-text)]'
    );
  });
});
