'use client';

import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import {
  useCreateStudioProject,
  useDeleteStudioProject,
} from '@/features/ai/image-studio/hooks/useImageStudioMutations';
import { useStudioProjects } from '@/features/ai/image-studio/hooks/useImageStudioQueries';

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
  const [projectId, setProjectId] = useState<string>('');
  const [projectSearch, setProjectSearch] = useState<string>('');

  const projectsQuery = useStudioProjects();
  const createProjectMutation = useCreateStudioProject();
  const deleteProjectMutation = useDeleteStudioProject();

  // Auto-select first project when none is selected and data is available
  useEffect(() => {
    const first = projectsQuery.data?.[0];
    if (!projectId && first) {
      setProjectId(first);
    }
  }, [projectId, projectsQuery.data]);

  const handleDeleteProject = async (id: string) => {
    if (!window.confirm(`Delete project "${id}" and all its slots?`)) return;
    await deleteProjectMutation.mutateAsync(id);
  };

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
    [createProjectMutation, deleteProjectMutation]
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
