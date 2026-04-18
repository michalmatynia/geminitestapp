import { serializeSetting } from '@/features/kangur/shared/utils/settings-json';

import type { KangurCmsProject } from './project';

const serializeProject = (project: KangurCmsProject | null): string | null =>
  project ? serializeSetting(project) : null;

const hasUnsavedProjectChanges = ({
  draftProject,
  savedProject,
}: {
  draftProject: KangurCmsProject | null;
  savedProject: KangurCmsProject | null;
}): boolean => {
  const draftSnapshot = serializeProject(draftProject);
  const savedSnapshot = serializeProject(savedProject);

  return draftSnapshot !== null && savedSnapshot !== null && draftSnapshot !== savedSnapshot;
};

export const resolveWorkspaceHydratedProject = ({
  draftProject,
  persistedProject,
  savedProject,
}: {
  draftProject: KangurCmsProject | null;
  persistedProject: KangurCmsProject | null;
  savedProject: KangurCmsProject | null;
}): KangurCmsProject | null => {
  if (!persistedProject) {
    return null;
  }

  if (!savedProject || !draftProject) {
    return persistedProject;
  }

  if (hasUnsavedProjectChanges({ draftProject, savedProject })) {
    return null;
  }

  const persistedSnapshot = serializeProject(persistedProject);
  const savedSnapshot = serializeProject(savedProject);
  const draftSnapshot = serializeProject(draftProject);

  return persistedSnapshot !== savedSnapshot || persistedSnapshot !== draftSnapshot
    ? persistedProject
    : null;
};
