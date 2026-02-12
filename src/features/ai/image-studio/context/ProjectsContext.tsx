'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  useCreateStudioProject,
  useDeleteStudioProject,
} from '@/features/ai/image-studio/hooks/useImageStudioMutations';
import { useStudioProjects } from '@/features/ai/image-studio/hooks/useImageStudioQueries';
import { useSettingsMap } from '@/shared/hooks/use-settings';
import { ApiError } from '@/shared/lib/api-client';
import { useToast } from '@/shared/ui';

import { IMAGE_STUDIO_ACTIVE_PROJECT_KEY, parseImageStudioActiveProject } from '../utils/project-session';

import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';

// ── Types ────────────────────────────────────────────────────────────────────

export interface ProjectsState {
  projectId: string;
  projectsQuery: UseQueryResult<string[]>;
  projectSearch: string;
}

export interface ProjectsActions {
  setProjectId: (id: string) => void;
  createProjectMutation: UseMutationResult<string, Error, string>;
  deleteProjectMutation: UseMutationResult<string, Error, string>;
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
  const heavySettings = useSettingsMap({ scope: 'heavy' });
  const createProjectMutation = useCreateStudioProject();
  const deleteProjectMutation = useDeleteStudioProject();
  const heavyMap = heavySettings.data ?? new Map<string, string>();

  const activeProjectId = useMemo(
    () => parseImageStudioActiveProject(heavyMap.get(IMAGE_STUDIO_ACTIVE_PROJECT_KEY)),
    [heavyMap]
  );

  // Auto-select active project when available, otherwise fall back to first project.
  useEffect(() => {
    const availableProjects = projectsQuery.data ?? [];
    if (availableProjects.length === 0) {
      if (projectId) setProjectId('');
      return;
    }
    if (projectId && availableProjects.includes(projectId)) return;
    if (heavySettings.isLoading) return;

    const preferred = activeProjectId && availableProjects.includes(activeProjectId)
      ? activeProjectId
      : availableProjects[0] ?? '';
    if (preferred && preferred !== projectId) {
      setProjectId(preferred);
    }
  }, [projectId, projectsQuery.data, activeProjectId, heavySettings.isLoading]);

  const handleDeleteProject = useCallback(async (id: string): Promise<void> => {
    if (!window.confirm(`Delete project "${id}" and all its slots?`)) return;
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

  const state = useMemo<ProjectsState>(
    () => ({ projectId, projectsQuery, projectSearch }),
    [projectId, projectsQuery, projectSearch]
  );

  const actions = useMemo<ProjectsActions>(
    () => ({
      setProjectId,
      createProjectMutation,
      deleteProjectMutation,
      handleDeleteProject,
      setProjectSearch,
    }),
    [createProjectMutation, deleteProjectMutation, handleDeleteProject]
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
