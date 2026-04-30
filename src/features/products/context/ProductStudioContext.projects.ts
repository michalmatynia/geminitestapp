'use client';

import { useEffect, useMemo } from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';

import { STUDIO_PROJECT_NOT_CONNECTED } from './ProductStudioContext.constants';

type StudioProjectSummary = {
  id: string;
};

export type ProductStudioProjectOptions = {
  studioProjectIds: string[];
  studioProjectOptions: Array<LabeledOptionDto<string>>;
};

export const useProductStudioProjectOptions = (
  projects: StudioProjectSummary[] | undefined
): ProductStudioProjectOptions => {
  const studioProjectIds = useMemo(
    () => (projects ?? []).map((project) => project.id.trim()).filter((id) => id.length > 0),
    [projects]
  );

  const studioProjectOptions = useMemo(
    () => [
      { value: STUDIO_PROJECT_NOT_CONNECTED, label: 'Not Connected' },
      ...studioProjectIds.map((id) => ({ value: id, label: id })),
    ],
    [studioProjectIds]
  );

  return { studioProjectIds, studioProjectOptions };
};

const resolveDefaultStudioProjectId = ({
  configuredDefaultStudioProjectId,
  studioProjectIds,
}: {
  configuredDefaultStudioProjectId: string;
  studioProjectIds: readonly string[];
}): string => {
  const hasConfiguredDefault =
    configuredDefaultStudioProjectId.length > 0 &&
    studioProjectIds.includes(configuredDefaultStudioProjectId);
  return hasConfiguredDefault ? configuredDefaultStudioProjectId : '';
};

const shouldDeferStudioProjectHydration = ({
  studioConfigLoading,
  studioConfigSaving,
  studioProjectsLoading,
}: {
  studioConfigLoading: boolean;
  studioConfigSaving: boolean;
  studioProjectsLoading: boolean;
}): boolean => studioProjectsLoading || studioConfigLoading || studioConfigSaving;

const resolveHydratedStudioProjectId = ({
  configuredDefaultStudioProjectId,
  studioProjectId,
  studioProjectIds,
}: {
  configuredDefaultStudioProjectId: string;
  studioProjectId: string | null;
  studioProjectIds: readonly string[];
}): string | null | undefined => {
  const current = studioProjectId?.trim() ?? '';
  if (current.length > 0 && studioProjectIds.includes(current)) return undefined;

  const fallback = resolveDefaultStudioProjectId({
    configuredDefaultStudioProjectId,
    studioProjectIds,
  });
  if (fallback === current) return undefined;

  return fallback.length > 0 ? fallback : null;
};

export const useHydrateProductStudioProjectId = ({
  configuredDefaultStudioProjectId,
  setStudioProjectId,
  studioConfigLoading,
  studioConfigSaving,
  studioProjectId,
  studioProjectIds,
  studioProjectsLoading,
}: {
  configuredDefaultStudioProjectId: string;
  setStudioProjectId: (id: string | null) => void;
  studioConfigLoading: boolean;
  studioConfigSaving: boolean;
  studioProjectId: string | null;
  studioProjectIds: readonly string[];
  studioProjectsLoading: boolean;
}): void => {
  useEffect(() => {
    const deferHydration = shouldDeferStudioProjectHydration({
      studioConfigLoading,
      studioConfigSaving,
      studioProjectsLoading,
    });
    if (deferHydration) return;

    const nextStudioProjectId = resolveHydratedStudioProjectId({
      configuredDefaultStudioProjectId,
      studioProjectId,
      studioProjectIds,
    });
    if (nextStudioProjectId !== undefined) setStudioProjectId(nextStudioProjectId);
  }, [
    configuredDefaultStudioProjectId,
    setStudioProjectId,
    studioConfigLoading,
    studioConfigSaving,
    studioProjectId,
    studioProjectIds,
    studioProjectsLoading,
  ]);
};
