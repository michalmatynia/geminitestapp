'use client';

import { startTransition, useEffect, useMemo, useState } from 'react';

import { useStudioProjects } from '@/features/ai/public';
import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { SystemSetting } from '@/shared/contracts/settings';
import type { MutationResult } from '@/shared/contracts/ui/queries';
import { PRODUCT_STUDIO_DEFAULT_PROJECT_SETTING_KEY } from '@/shared/lib/products/constants';
import type { Toast } from '@/shared/ui/toast';

export const STUDIO_PROJECT_NONE = '__product_studio_not_connected__';

type UpdateSettingMutation = MutationResult<SystemSetting, { key: string; value: string }>;
type RouterLike = {
  push: (href: string) => void;
};

export type ProductImageStudioProjectState = {
  isStudioProjectDirty: boolean;
  normalizedSelectedStudioProject: string;
  selectedStudioProject: string;
  setSelectedStudioProject: (projectId: string) => void;
  studioProjectOptions: Array<LabeledOptionDto<string>>;
  studioProjectsLoading: boolean;
};

export type ProductImageStudioProjectActions = {
  handleSaveStudioProject: () => void;
  handleStartStudioConnection: () => void;
};

type ProductImageStudioProjectActionsArgs = ProductImageStudioProjectState & {
  refetchSettings: () => void;
  router: RouterLike;
  toast: Toast;
  updateStudioProjectSetting: UpdateSettingMutation;
};

const normalizeSelectedStudioProject = (selectedStudioProject: string): string =>
  selectedStudioProject === STUDIO_PROJECT_NONE ? '' : selectedStudioProject.trim();

const normalizePersistedStudioProject = (persistedStudioProject: string): string =>
  persistedStudioProject.length > 0 ? persistedStudioProject : STUDIO_PROJECT_NONE;

const createStudioUrl = (normalizedSelectedStudioProject: string): string => {
  const params = new URLSearchParams();
  if (normalizedSelectedStudioProject.length > 0) {
    params.set('tab', 'studio');
    params.set('projectId', normalizedSelectedStudioProject);
  } else {
    params.set('tab', 'projects');
  }
  return `/admin/image-studio?${params.toString()}`;
};

export function useProductImageStudioProjectState(
  persistedStudioProject: string
): ProductImageStudioProjectState {
  const studioProjectsQuery = useStudioProjects();
  const [selectedStudioProject, setSelectedStudioProject] = useState<string>(
    normalizePersistedStudioProject(persistedStudioProject)
  );
  const studioProjectOptions = useMemo<Array<LabeledOptionDto<string>>>(
    () => [
      { value: STUDIO_PROJECT_NONE, label: 'Not Connected' },
      ...(studioProjectsQuery.data ?? []).map((project) => ({
        value: project.id,
        label: project.id,
      })),
    ],
    [studioProjectsQuery.data]
  );
  const normalizedSelectedStudioProject =
    normalizeSelectedStudioProject(selectedStudioProject);

  useEffect(() => {
    setSelectedStudioProject(normalizePersistedStudioProject(persistedStudioProject));
  }, [persistedStudioProject]);

  return {
    isStudioProjectDirty: normalizedSelectedStudioProject !== persistedStudioProject,
    normalizedSelectedStudioProject,
    selectedStudioProject,
    setSelectedStudioProject,
    studioProjectOptions,
    studioProjectsLoading: studioProjectsQuery.isLoading,
  };
}

export function useProductImageStudioProjectActions({
  normalizedSelectedStudioProject,
  refetchSettings,
  router,
  toast,
  updateStudioProjectSetting,
}: ProductImageStudioProjectActionsArgs): ProductImageStudioProjectActions {
  const handleSaveStudioProject = (): void => {
    updateStudioProjectSetting.mutate(
      {
        key: PRODUCT_STUDIO_DEFAULT_PROJECT_SETTING_KEY,
        value: normalizedSelectedStudioProject,
      },
      {
        onSuccess: () => {
          refetchSettings();
          toast('Image Studio default project saved.', { variant: 'success' });
        },
        onError: () => {
          toast('Failed to save Image Studio default project.', { variant: 'error' });
        },
      }
    );
  };

  const handleStartStudioConnection = (): void => {
    startTransition(() => {
      router.push(createStudioUrl(normalizedSelectedStudioProject));
    });
  };

  return { handleSaveStudioProject, handleStartStudioConnection };
}
