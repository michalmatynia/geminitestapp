import { describe, expect, it } from 'vitest';

import { createDefaultKangurCmsProject } from './project-defaults';
import { resolveWorkspaceHydratedProject } from './workspace-hydration';

describe('resolveWorkspaceHydratedProject', () => {
  it('hydrates the persisted project when workspace state is empty', () => {
    const persistedProject = createDefaultKangurCmsProject('pl');

    expect(
      resolveWorkspaceHydratedProject({
        draftProject: null,
        persistedProject,
        savedProject: null,
      })
    ).toEqual(persistedProject);
  });

  it('rehydrates a clean workspace when persisted project changes later', () => {
    const placeholderProject = createDefaultKangurCmsProject('pl');
    const persistedProject = {
      ...createDefaultKangurCmsProject('pl'),
      screens: {
        ...createDefaultKangurCmsProject('pl').screens,
        Game: {
          ...createDefaultKangurCmsProject('pl').screens.Game,
          components: [],
        },
      },
    };

    expect(
      resolveWorkspaceHydratedProject({
        draftProject: placeholderProject,
        persistedProject,
        savedProject: placeholderProject,
      })
    ).toEqual(persistedProject);
  });

  it('does not overwrite local unsaved changes', () => {
    const savedProject = createDefaultKangurCmsProject('pl');
    const draftProject = {
      ...savedProject,
      screens: {
        ...savedProject.screens,
        Lessons: {
          ...savedProject.screens.Lessons,
          components: [],
        },
      },
    };
    const persistedProject = {
      ...savedProject,
      screens: {
        ...savedProject.screens,
        Game: {
          ...savedProject.screens.Game,
          components: [],
        },
      },
    };

    expect(
      resolveWorkspaceHydratedProject({
        draftProject,
        persistedProject,
        savedProject,
      })
    ).toBeNull();
  });

  it('does not rehydrate when workspace already matches persisted project', () => {
    const persistedProject = createDefaultKangurCmsProject('pl');

    expect(
      resolveWorkspaceHydratedProject({
        draftProject: persistedProject,
        persistedProject,
        savedProject: persistedProject,
      })
    ).toBeNull();
  });
});
