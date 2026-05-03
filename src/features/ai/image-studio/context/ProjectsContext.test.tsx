// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProjectsProvider, useProjectsActions, useProjectsState } from './ProjectsContext';

const mocks = vi.hoisted(() => ({
  createProject: vi.fn(),
  deleteProject: vi.fn(),
  projects: [] as Array<Record<string, unknown>>,
  renameProject: vi.fn(),
  resizeProjectCanvas: vi.fn(),
  toast: vi.fn(),
  confirm: vi.fn(),
  updateUserPreferences: vi.fn(),
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

vi.mock('@/shared/lib/api-client', () => ({
  ApiError: class ApiError extends Error {
    status: number;

    constructor(status: number, message = '') {
      super(message);
      this.status = status;
    }
  },
  api: {
    delete: (url: string) => mocks.deleteProject(url),
    patch: (url: string, payload: Record<string, unknown>) => {
      if (
        typeof payload['canvasWidthPx'] === 'number' ||
        typeof payload['canvasHeightPx'] === 'number'
      ) {
        return mocks.resizeProjectCanvas(url, payload);
      }
      return mocks.renameProject(url, payload);
    },
    post: (_url: string, payload: Record<string, unknown>) => mocks.createProject(payload),
  },
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

vi.mock('@/shared/ui/primitives.public', () => ({
  useToast: () => ({
    toast: mocks.toast,
  }),
}));

const createTestQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });

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
    mocks.renameProject.mockReset().mockImplementation(
      async (_url: string, payload?: Record<string, unknown>) => {
        const nextProjectId =
          typeof payload?.projectId === 'string' ? payload.projectId.trim() : 'project-b';
        mocks.projects = [
          {
            id: nextProjectId,
            createdAt: '2026-04-03T00:00:00.000Z',
            updatedAt: '2026-04-03T00:00:00.000Z',
          },
        ];
        return {
          projectId: nextProjectId,
          renamed: true,
        };
      }
    );
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
    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <ProjectsProvider>{children}</ProjectsProvider>
      </QueryClientProvider>
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
    expect(mocks.renameProject).toHaveBeenCalledWith(
      '/api/image-studio/projects/project-a',
      { projectId: 'project-b' }
    );
    expect(mocks.toast).toHaveBeenCalledWith('Project renamed to "project-b".', {
      variant: 'success',
    });
  });

  it(
    'prefers the resolved user preference over local project storage when seeding selection',
    async () => {
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

      const queryClient = createTestQueryClient();
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          <ProjectsProvider>{children}</ProjectsProvider>
        </QueryClientProvider>
      );

      const { result } = renderHook(() => useProjectsState(), { wrapper });

      await waitFor(() => {
        expect(result.current.projectId).toBe('project-a');
      });
    }
  );
});
