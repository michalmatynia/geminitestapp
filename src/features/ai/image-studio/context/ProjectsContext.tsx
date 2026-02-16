'use client';

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
  useCreateStudioProject,
  useDeleteStudioProject,
  useRenameStudioProject,
} from '@/features/ai/image-studio/hooks/useImageStudioMutations';
import { useStudioProjects } from '@/features/ai/image-studio/hooks/useImageStudioQueries';
import {
  useUpdateUserPreferencesMutation,
  useUserPreferences,
} from '@/features/auth/hooks/useUserPreferences';
import { useSettingsMap, useUpdateSetting } from '@/shared/hooks/use-settings';
import { ApiError } from '@/shared/lib/api-client';
import type {
  CreateMutation,
  DeleteMutation,
  UpdateMutation,
} from '@/shared/types/query-result-types';
import { useToast } from '@/shared/ui';

import {
  IMAGE_STUDIO_ACTIVE_PROJECT_KEY,
  parseImageStudioActiveProject,
  serializeImageStudioActiveProject,
} from '../utils/project-session';

import type { UseQueryResult } from '@tanstack/react-query';

// ── Types ────────────────────────────────────────────────────────────────────

export interface ProjectsState {
  projectId: string;
  projectsQuery: UseQueryResult<string[]>;
  projectSearch: string;
}

export interface ProjectsActions {
  setProjectId: (id: string) => void;
  createProjectMutation: CreateMutation<string, string>;
  renameProjectMutation: UpdateMutation<
    { projectId: string; fromProjectId: string; renamed: boolean },
    { projectId: string; nextProjectId: string }
  >;
  deleteProjectMutation: DeleteMutation<string, string>;
  handleRenameProject: (id: string, nextId: string) => Promise<string>;
  handleDeleteProject: (id: string) => Promise<void>;
  setProjectSearch: (s: string) => void;
}

// ── Contexts ─────────────────────────────────────────────────────────────────

const ProjectsStateContext = createContext<ProjectsState | null>(null);
const ProjectsActionsContext = createContext<ProjectsActions | null>(null);

// ── Provider ─────────────────────────────────────────────────────────────────

export function ProjectsProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { toast } = useToast();
  const [projectId, setProjectId] = useState<string>('');
  const [projectSearch, setProjectSearch] = useState<string>('');

  const projectsQuery = useStudioProjects();
  const userPreferencesQuery = useUserPreferences();
  const updateUserPreferences = useUpdateUserPreferencesMutation();
  const heavySettings = useSettingsMap({ scope: 'heavy' });
  const updateSetting = useUpdateSetting();
  const createProjectMutation = useCreateStudioProject();
  const renameProjectMutation = useRenameStudioProject();
  const deleteProjectMutation = useDeleteStudioProject();
  const heavyMap = heavySettings.data ?? new Map<string, string>();
  const lastPersistedProjectRef = useRef<string | null>(null);

  const activeProjectIdFromPreferences = useMemo(() => {
    const raw = userPreferencesQuery.data?.imageStudioLastProjectId;
    return typeof raw === 'string' ? raw.trim() : '';
  }, [userPreferencesQuery.data?.imageStudioLastProjectId]);

  const legacyActiveProjectId = useMemo(
    () => parseImageStudioActiveProject(heavyMap.get(IMAGE_STUDIO_ACTIVE_PROJECT_KEY)),
    [heavyMap]
  );
  const activeProjectId = activeProjectIdFromPreferences || legacyActiveProjectId;

  // Auto-select active project when available, otherwise fall back to first project.
  useEffect(() => {
    const availableProjects = projectsQuery.data ?? [];
    if (availableProjects.length === 0) {
      if (projectId) setProjectId('');
      return;
    }
    if (projectId && availableProjects.includes(projectId)) return;
    if (heavySettings.isLoading || userPreferencesQuery.isLoading) return;

    const preferred = activeProjectId && availableProjects.includes(activeProjectId)
      ? activeProjectId
      : availableProjects[0] ?? '';
    if (preferred && preferred !== projectId) {
      setProjectId(preferred);
    }
  }, [
    projectId,
    projectsQuery.data,
    activeProjectId,
    heavySettings.isLoading,
    userPreferencesQuery.isLoading,
  ]);

  // Persist the active project to user profile on selection change.
  // Keep writing the legacy heavy setting as a best-effort compatibility fallback.
  useEffect(() => {
    if (heavySettings.isLoading || userPreferencesQuery.isLoading) return;
    const normalizedProjectId = projectId.trim();
    const availableProjects = projectsQuery.data ?? [];
    if (!normalizedProjectId && availableProjects.length > 0) return;
    const nextPersistedValue = normalizedProjectId || null;
    if (lastPersistedProjectRef.current === nextPersistedValue) return;

    const profileValue = activeProjectIdFromPreferences || null;
    const shouldPersistProfile = profileValue !== nextPersistedValue;
    // Keep legacy key in sync only when it already exists; avoid creating it implicitly,
    // because each write invalidates broad settings queries and triggers redundant refetches.
    const shouldPersistLegacy = Boolean(legacyActiveProjectId) &&
      normalizedProjectId !== legacyActiveProjectId;

    if (!shouldPersistProfile && !shouldPersistLegacy) {
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

      if (shouldPersistLegacy) {
        void updateSetting.mutateAsync({
          key: IMAGE_STUDIO_ACTIVE_PROJECT_KEY,
          value: serializeImageStudioActiveProject(normalizedProjectId),
        }).catch(() => {});
      }

      // Allow retry on next render/change if user profile persistence fails.
      if (profileWriteFailed && lastPersistedProjectRef.current === nextPersistedValue) {
        lastPersistedProjectRef.current = null;
      }
    })();
  }, [
    activeProjectIdFromPreferences,
    heavySettings.isLoading,
    legacyActiveProjectId,
    projectsQuery.data,
    projectId,
    updateSetting,
    updateUserPreferences,
    userPreferencesQuery.isLoading,
  ]);

  const handleDeleteProject = useCallback(async (id: string): Promise<void> => {
    if (!window.confirm(`Delete project "${id}" and all connected cards, runs, and assets?`)) return;
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
        toast(`Project "${id}" no longer exists.`, { variant: 'info' });
        return;
      }
      toast(error instanceof Error ? error.message : 'Failed to delete project.', { variant: 'error' });
      throw error;
    }
  }, [deleteProjectMutation, projectId, toast]);

  const handleRenameProject = useCallback(async (id: string, nextId: string): Promise<string> => {
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
      toast(error instanceof Error ? error.message : 'Failed to rename project.', { variant: 'error' });
      throw error;
    }
  }, [projectId, renameProjectMutation, toast]);

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
      handleRenameProject,
      handleDeleteProject,
      setProjectSearch,
    }),
    [
      createProjectMutation,
      deleteProjectMutation,
      handleDeleteProject,
      handleRenameProject,
      renameProjectMutation,
    ]
  );

  return (
    <ProjectsActionsContext.Provider value={actions}>
      <ProjectsStateContext.Provider value={state}>
        {children}
      </ProjectsStateContext.Provider>
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
