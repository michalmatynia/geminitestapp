'use client';

import { useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  type CreateStudioProjectPayload,
  type ResizeStudioProjectCanvasPayload,
  type ResizeStudioProjectCanvasResult,
  useCreateStudioProject,
  useDeleteStudioProject,
  useRenameStudioProject,
  useResizeStudioProjectCanvas,
} from '@/features/ai/image-studio/hooks/useImageStudioMutations';
import { useStudioProjects } from '@/features/ai/image-studio/hooks/useImageStudioQueries';
import {
  useUpdateUserPreferencesMutation,
  useUserPreferences,
} from '@/features/auth/hooks/useUserPreferences';
import type { ImageStudioProjectRecord } from '@/shared/contracts/image-studio';
import type { CreateMutation, DeleteMutation, UpdateMutation } from '@/shared/contracts/ui';
import { useConfirm } from '@/shared/hooks/ui/useConfirm';
import { ApiError } from '@/shared/lib/api-client';
import {
  invalidateImageStudioProjects,
  invalidateImageStudioSlots,
} from '@/shared/lib/query-invalidation';
import { useToast } from '@/shared/ui';

import {
  loadImageStudioActiveProjectLocal,
  saveImageStudioActiveProjectLocal,
} from '@/shared/lib/ai/image-studio/utils/project-session';

// ── Types ────────────────────────────────────────────────────────────────────

export interface ProjectsState {
  projectId: string;
  projectsQuery: UseQueryResult<ImageStudioProjectRecord[]>;
  projectSearch: string;
}

export interface ProjectsActions {
  setProjectId: (id: string) => void;
  createProjectMutation: CreateMutation<string, CreateStudioProjectPayload>;
  renameProjectMutation: UpdateMutation<
    { projectId: string; fromProjectId: string; renamed: boolean },
    { projectId: string; nextProjectId: string }
  >;
  deleteProjectMutation: DeleteMutation<string, string>;
  resizeProjectCanvasMutation: UpdateMutation<
    ResizeStudioProjectCanvasResult,
    ResizeStudioProjectCanvasPayload
  >;
  handleRenameProject: (id: string, nextId: string) => Promise<string>;
  handleResizeProjectCanvas: (
    payload: ResizeStudioProjectCanvasPayload
  ) => Promise<ResizeStudioProjectCanvasResult>;
  handleDeleteProject: (id: string) => Promise<void>;
  handleConfirmDeleteProject: (id: string, onDeleted?: () => Promise<void>) => void;
  setProjectSearch: (s: string) => void;
  ConfirmationModal: React.ComponentType;
}

// ── Contexts ─────────────────────────────────────────────────────────────────

const ProjectsStateContext = createContext<ProjectsState | null>(null);
const ProjectsActionsContext = createContext<ProjectsActions | null>(null);

// ── Provider ─────────────────────────────────────────────────────────────────

export function ProjectsProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [projectId, setProjectId] = useState<string>('');
  const [projectSearch, setProjectSearch] = useState<string>('');
  const [localActiveProjectId, setLocalActiveProjectId] = useState<string>(() =>
    loadImageStudioActiveProjectLocal()
  );

  const projectsQuery = useStudioProjects();
  const userPreferencesQuery = useUserPreferences();
  const updateUserPreferences = useUpdateUserPreferencesMutation();
  const createProjectMutation = useCreateStudioProject();
  const renameProjectMutation = useRenameStudioProject();
  const deleteProjectMutation = useDeleteStudioProject();
  const resizeProjectCanvasMutation = useResizeStudioProjectCanvas();
  const lastPersistedProjectRef = useRef<string | null>(null);

  const activeProjectIdFromPreferences = useMemo(() => {
    const raw = userPreferencesQuery.data?.imageStudioLastProjectId;
    return typeof raw === 'string' ? raw.trim() : '';
  }, [userPreferencesQuery.data?.imageStudioLastProjectId]);

  const activeProjectId = activeProjectIdFromPreferences || localActiveProjectId;
  const availableProjectIds: string[] = useMemo(
    () => (projectsQuery.data ?? []).map((project: ImageStudioProjectRecord) => project.id),
    [projectsQuery.data]
  );

  // Auto-select active project when available, otherwise fall back to first project.
  useEffect(() => {
    if (userPreferencesQuery.isLoading || projectsQuery.isLoading || projectsQuery.isFetching) {
      return;
    }

    if (availableProjectIds.length === 0) {
      if (projectId) setProjectId('');
      return;
    }
    if (projectId && availableProjectIds.includes(projectId)) return;

    const preferred =
      activeProjectId && availableProjectIds.includes(activeProjectId)
        ? activeProjectId
        : (availableProjectIds[0] ?? '');
    if (preferred && preferred !== projectId) {
      setProjectId(preferred);
    }
  }, [
    projectId,
    availableProjectIds,
    activeProjectId,
    projectsQuery.isLoading,
    projectsQuery.isFetching,
    userPreferencesQuery.isLoading,
  ]);

  // Persist the active project to user profile on selection change.
  useEffect(() => {
    if (projectsQuery.isLoading || userPreferencesQuery.isLoading) {
      return;
    }
    const normalizedProjectId = projectId.trim();
    if (!normalizedProjectId && availableProjectIds.length > 0) return;

    if (localActiveProjectId !== normalizedProjectId) {
      saveImageStudioActiveProjectLocal(normalizedProjectId);
      setLocalActiveProjectId(normalizedProjectId);
    }

    const nextPersistedValue = normalizedProjectId || null;
    if (lastPersistedProjectRef.current === nextPersistedValue) return;

    const profileValue = activeProjectIdFromPreferences || null;
    const shouldPersistProfile = profileValue !== nextPersistedValue;

    if (!shouldPersistProfile) {
      lastPersistedProjectRef.current = nextPersistedValue;
      return;
    }

    lastPersistedProjectRef.current = nextPersistedValue;
    void (async (): Promise<void> => {
      let profileWriteFailed = false;

      if (shouldPersistProfile) {
        try {
          await updateUserPreferences.mutateAsync({
            imageStudioLastProjectId: nextPersistedValue,
          });
        } catch {
          profileWriteFailed = true;
        }
      }

      // Allow retry on next render/change if user profile persistence fails.
      if (profileWriteFailed && lastPersistedProjectRef.current === nextPersistedValue) {
        lastPersistedProjectRef.current = null;
      }
    })();
  }, [
    activeProjectIdFromPreferences,
    availableProjectIds,
    localActiveProjectId,
    projectsQuery.isLoading,
    projectId,
    updateUserPreferences,
    userPreferencesQuery.isLoading,
  ]);

  const { confirm, ConfirmationModal } = useConfirm();

  const handleDeleteProject = useCallback(
    async (id: string): Promise<void> => {
      try {
        await deleteProjectMutation.mutateAsync(id);
        if (projectId === id) {
          setProjectId('');
        }
        toast(`Project "${id}" deleted.`, { variant: 'success' });
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          // Treat stale-project deletion as a successful no-op.
          if (projectId === id) {
            setProjectId('');
          }
          void invalidateImageStudioProjects(queryClient);
          void invalidateImageStudioSlots(queryClient, id);
          toast(`Project "${id}" no longer exists.`, { variant: 'info' });
          return;
        }
        toast(error instanceof Error ? error.message : 'Failed to delete project.', {
          variant: 'error',
        });
        throw error;
      }
    },
    [deleteProjectMutation, projectId, queryClient, toast]
  );

  const handleConfirmDeleteProject = useCallback(
    (id: string, onDeleted?: () => Promise<void>) => {
      confirm({
        title: 'Delete Project?',
        message: `Delete project "${id}" and all connected cards, runs, and assets? This action cannot be undone.`,
        confirmText: 'Delete Project',
        isDangerous: true,
        onConfirm: async () => {
          await handleDeleteProject(id);
          if (onDeleted) await onDeleted();
        },
      });
    },
    [confirm, handleDeleteProject]
  );

  const handleRenameProject = useCallback(
    async (id: string, nextId: string): Promise<string> => {
      const sourceId = id.trim();
      const targetId = nextId.trim();
      if (!sourceId) {
        throw new Error('Project id is required.');
      }
      if (!targetId) {
        throw new Error('New project id is required.');
      }

      try {
        const result = await renameProjectMutation.mutateAsync({
          projectId: sourceId,
          nextProjectId: targetId,
        });
        const resolvedProjectId = result.projectId?.trim() || targetId;
        if (projectId === sourceId) {
          setProjectId(resolvedProjectId);
        }
        if (result.renamed === false) {
          toast('Project id is unchanged.', { variant: 'info' });
        } else {
          toast(`Project renamed to "${resolvedProjectId}".`, { variant: 'success' });
        }
        return resolvedProjectId;
      } catch (error) {
        toast(error instanceof Error ? error.message : 'Failed to rename project.', {
          variant: 'error',
        });
        throw error;
      }
    },
    [projectId, renameProjectMutation, toast]
  );

  const handleResizeProjectCanvas = useCallback(
    async (payload: ResizeStudioProjectCanvasPayload): Promise<ResizeStudioProjectCanvasResult> => {
      const normalizedProjectId = payload.projectId.trim();
      if (!normalizedProjectId) {
        throw new Error('Project id is required.');
      }
      if (typeof payload.canvasWidthPx !== 'number' && typeof payload.canvasHeightPx !== 'number') {
        throw new Error('Enter at least one canvas dimension.');
      }

      try {
        const result = await resizeProjectCanvasMutation.mutateAsync({
          ...payload,
          projectId: normalizedProjectId,
        });
        const resolvedProjectId = result.projectId?.trim() || normalizedProjectId;
        if (projectId === normalizedProjectId && resolvedProjectId !== normalizedProjectId) {
          setProjectId(resolvedProjectId);
        }
        const canvasWidth =
          typeof result.project?.canvasWidthPx === 'number'
            ? result.project.canvasWidthPx
            : payload.canvasWidthPx;
        const canvasHeight =
          typeof result.project?.canvasHeightPx === 'number'
            ? result.project.canvasHeightPx
            : payload.canvasHeightPx;
        if (
          typeof canvasWidth === 'number' &&
          Number.isFinite(canvasWidth) &&
          typeof canvasHeight === 'number' &&
          Number.isFinite(canvasHeight)
        ) {
          toast(`Canvas resized to ${canvasWidth}x${canvasHeight}.`, {
            variant: 'success',
          });
        } else {
          toast('Project canvas updated.', { variant: 'success' });
        }
        return result;
      } catch (error) {
        toast(error instanceof Error ? error.message : 'Failed to resize canvas.', {
          variant: 'error',
        });
        throw error;
      }
    },
    [projectId, resizeProjectCanvasMutation, toast]
  );

  const state = useMemo<ProjectsState>(
    () => ({ projectId, projectsQuery, projectSearch }),
    [projectId, projectsQuery, projectSearch]
  );

  const actions = useMemo<ProjectsActions>(
    () => ({
      setProjectId,
      createProjectMutation,
      renameProjectMutation,
      deleteProjectMutation,
      resizeProjectCanvasMutation,
      handleRenameProject,
      handleResizeProjectCanvas,
      handleDeleteProject,
      handleConfirmDeleteProject,
      setProjectSearch,
      ConfirmationModal,
    }),
    [
      createProjectMutation,
      deleteProjectMutation,
      handleDeleteProject,
      handleConfirmDeleteProject,
      handleRenameProject,
      handleResizeProjectCanvas,
      renameProjectMutation,
      resizeProjectCanvasMutation,
      ConfirmationModal,
    ]
  );

  return (
    <ProjectsActionsContext.Provider value={actions}>
      <ProjectsStateContext.Provider value={state}>{children}</ProjectsStateContext.Provider>
    </ProjectsActionsContext.Provider>
  );
}

// ── Hooks ────────────────────────────────────────────────────────────────────

export function useProjectsState(): ProjectsState {
  const ctx = useContext(ProjectsStateContext);
  if (!ctx) throw new Error('useProjectsState must be used within a ProjectsProvider');
  return ctx;
}

export function useProjectsActions(): ProjectsActions {
  const ctx = useContext(ProjectsActionsContext);
  if (!ctx) throw new Error('useProjectsActions must be used within a ProjectsProvider');
  return ctx;
}

export function useProjects(): ProjectsState & ProjectsActions {
  return { ...useProjectsState(), ...useProjectsActions() };
}
