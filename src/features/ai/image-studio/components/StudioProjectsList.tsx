'use client';

import { Plus, X } from 'lucide-react';
import React, { useMemo } from 'react';

import { Button, Input, SectionPanel, useToast } from '@/shared/ui';
import { cn } from '@/shared/utils';

import { useImageStudio } from '../context/ImageStudioContext';

export function StudioProjectsList(): React.JSX.Element {
  const { toast } = useToast();
  const {
    projectId,
    setProjectId,
    projectsQuery,
    createProjectMutation,
    handleDeleteProject,
    projectSearch,
    setProjectSearch,
  } = useImageStudio();

  const [newProjectId, setNewProjectId] = React.useState('');

  const filteredProjects = useMemo((): string[] => {
    const list = projectsQuery.data ?? [];
    const term = projectSearch.trim().toLowerCase();
    if (!term) return list;
    return list.filter((id: string) => id.toLowerCase().includes(term));
  }, [projectSearch, projectsQuery.data]);

  const handleCreate = async () => {
    const id = newProjectId.trim();
    if (!id) return;
    try {
      await createProjectMutation.mutateAsync(id);
      setNewProjectId('');
    } catch (error: unknown) {
      toast(error instanceof Error ? error.message : 'Failed to create project', { variant: 'error' });
    }
  };

  return (
    <div className='space-y-4'>
      <SectionPanel className='flex items-center gap-2 p-3'>
        <Input
          placeholder='New project ID...'
          value={newProjectId}
          onChange={(e) => setNewProjectId(e.target.value)}
          className='h-9'
        />
        <Button
          size='sm'
          onClick={() => void handleCreate()}
          disabled={!newProjectId.trim() || createProjectMutation.isPending}
        >
          <Plus className='mr-2 size-4' />
          Create
        </Button>
      </SectionPanel>

      <SectionPanel className='p-0 overflow-hidden'>
        <div className='border-b bg-muted/30 p-2'>
          <Input
            placeholder='Search projects...'
            value={projectSearch}
            onChange={(e) => setProjectSearch(e.target.value)}
            className='h-8 text-xs'
          />
        </div>
        <div className='max-h-[400px] overflow-auto'>
          {projectsQuery.isLoading ? (
            <div className='p-4 text-center text-xs text-gray-500'>Loading projects...</div>
          ) : filteredProjects.length === 0 ? (
            <div className='p-4 text-center text-xs text-gray-500'>No projects found.</div>
          ) : (
            <div className='divide-y divide-border/40'>
              {filteredProjects.map((id) => (
                <div
                  key={id}
                  className={cn(
                    'flex items-center justify-between p-2 px-3 text-xs transition-colors hover:bg-muted/50 cursor-pointer',
                    projectId === id ? 'bg-primary/10 font-medium text-primary' : 'text-gray-300'
                  )}
                  onClick={() => setProjectId(id)}
                >
                  <span className='truncate pr-2'>{id}</span>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='size-6 text-gray-500 hover:text-red-400'
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDeleteProject(id);
                    }}
                  >
                    <X className='size-3' />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </SectionPanel>
    </div>
  );
}
