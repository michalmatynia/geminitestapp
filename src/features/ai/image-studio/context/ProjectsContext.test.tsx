// @vitest-environment jsdom

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProjectsProvider, useProjectsActions, useProjectsState } from './ProjectsContext';

const mocks = vi.hoisted(() => ({
  projects: [] as Array<Record<string, unknown>>,
  toast: vi.fn(),
  confirm: vi.fn(),
  updateUserPreferences: vi.fn(),
  renameProject: vi.fn(),
  deleteProject: vi.fn(),
  resizeProjectCanvas: vi.fn(),
  createProject: vi.fn(),
}));

vi.mock('@/features/ai/image-studio/hooks/useImageStudioQueries', () => ({
  useStudioProjects: () =>
    ({
      data: mocks.projects,
      isLoading: false,
      isFetching: false,
      error: null,
    }) as never,
}));

vi.mock('@/features/ai/image-studio/hooks/useImageStudioMutations', () => ({
  useCreateStudioProject: () =>
    ({
      mutateAsync: mocks.createProject,
    }) as never,
  useRenameStudioProject: () =>
    ({
      mutateAsync: mocks.renameProject,
    }) as never,
  useDeleteStudioProject: () =>
    ({
      mutateAsync: mocks.deleteProject,
    }) as never,
  useResizeStudioProjectCanvas: () =>
    ({
      mutateAsync: mocks.resizeProjectCanvas,
    }) as never,
}));

vi.mock('@/shared/hooks/useUserPreferences', () => ({
  useUserPreferences: () => ({
    isLoading: false,
    data: {
      imageStudioLastProjectId: 'project-a',
    },
  }),
  useUpdateUserPreferences: () => ({
    mutateAsync: mocks.updateUserPreferences,
  }),
}));

vi.mock('@/shared/hooks/ui/useConfirm', () => ({
  useConfirm: () => ({
    confirm: mocks.confirm,
    ConfirmationModal: () => null,
  }),
}));

vi.mock('@/shared/ui', () => ({
  useToast: () => ({
    toast: mocks.toast,
  }),
}));

describe('ProjectsContext', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mocks.projects = [
      {
        id: 'project-a',
        createdAt: '2026-04-03T00:00:00.000Z',
        updatedAt: '2026-04-03T00:00:00.000Z',
      },
    ];
    mocks.toast.mockReset();
    mocks.confirm.mockReset();
    mocks.updateUserPreferences.mockReset().mockResolvedValue(undefined);
    mocks.renameProject.mockReset().mockImplementation(async () => {
      mocks.projects = [
        {
          id: 'project-b',
          createdAt: '2026-04-03T00:00:00.000Z',
          updatedAt: '2026-04-03T00:00:00.000Z',
        },
      ];
      return {
        projectId: 'project-b',
        renamed: true,
      };
    });
    mocks.deleteProject.mockReset().mockResolvedValue(undefined);
    mocks.resizeProjectCanvas.mockReset().mockResolvedValue({
      projectId: 'project-a',
    });
    mocks.createProject.mockReset().mockResolvedValue({
      projectId: 'project-a',
    });
  });

  it('throws outside the provider for both strict hooks', () => {
    expect(() => renderHook(() => useProjectsState())).toThrow(
      'useProjectsState must be used within a ProjectsProvider'
    );
    expect(() => renderHook(() => useProjectsActions())).toThrow(
      'useProjectsActions must be used within a ProjectsProvider'
    );
  });

  it('auto-selects the preferred project and renames it through the mutation', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ProjectsProvider>{children}</ProjectsProvider>
    );

    const { result } = renderHook(
      () => ({
        actions: useProjectsActions(),
        state: useProjectsState(),
      }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.state.projectId).toBe('project-a');
    });

    let renamedProjectId = '';
    await act(async () => {
      renamedProjectId = await result.current.actions.handleRenameProject('project-a', 'project-b');
    });

    expect(renamedProjectId).toBe('project-b');
    await waitFor(() => {
      expect(result.current.state.projectId).toBe('project-b');
    });
    expect(mocks.renameProject).toHaveBeenCalledWith({
      projectId: 'project-a',
      nextProjectId: 'project-b',
    });
    expect(mocks.toast).toHaveBeenCalledWith('Project renamed to "project-b".', {
      variant: 'success',
    });
  });

  it('prefers the resolved user preference over local project storage when seeding selection', () => {
    mocks.projects = [
      {
        id: 'project-seeded',
        createdAt: '2026-04-03T00:00:00.000Z',
        updatedAt: '2026-04-03T00:00:00.000Z',
      },
      {
        id: 'project-a',
        createdAt: '2026-04-03T00:00:00.000Z',
        updatedAt: '2026-04-03T00:00:00.000Z',
      },
    ];
    window.localStorage.setItem('image_studio_active_project_local', 'project-seeded');

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ProjectsProvider>{children}</ProjectsProvider>
    );

    const { result } = renderHook(() => useProjectsState(), { wrapper });

    expect(result.current.projectId).toBe('project-a');
  });
});
