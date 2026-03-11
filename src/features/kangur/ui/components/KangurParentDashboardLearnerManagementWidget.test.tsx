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
    handleSaveLearner: vi.fn(),
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
    updateCreateField: vi.fn(),
    updateEditField: vi.fn(),
  },
}));

vi.mock('@/features/kangur/ui/context/KangurParentDashboardRuntimeContext', () => ({
  useKangurParentDashboardRuntime: () => runtimeState.value,
}));

import { KangurParentDashboardLearnerManagementWidget } from './KangurParentDashboardLearnerManagementWidget';

describe('KangurParentDashboardLearnerManagementWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      handleSaveLearner: vi.fn(),
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
      updateCreateField: vi.fn(),
      updateEditField: vi.fn(),
    };
  });

  it('uses storefront text tokens across learner management cards and actions', () => {
    render(<KangurParentDashboardLearnerManagementWidget />);

    expect(screen.getByText('Zarzadzaj profilami bez opuszczania panelu')).toHaveClass(
      '[color:var(--kangur-page-text)]'
    );
    expect(
      screen.getByText(
        'Rodzic loguje sie emailem, a uczniowie dostaja osobne nazwy logowania i hasla.'
      )
    ).toHaveClass('[color:var(--kangur-page-muted-text)]');
    expect(screen.getByText('Login: olek02')).toHaveClass('[color:var(--kangur-page-muted-text)]');
    expect(screen.getByText('Kliknij, aby przelaczyc profil')).toHaveClass(
      '[color:var(--kangur-page-muted-text)]'
    );
    expect(screen.getByText('Zapisano dane ucznia.')).toHaveClass(
      '[color:var(--kangur-page-muted-text)]'
    );
    expect(screen.getByText('Ada', { selector: 'span' })).toHaveClass(
      '[color:var(--kangur-page-text)]'
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
});
