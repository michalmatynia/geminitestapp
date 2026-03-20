import { describe, expect, it } from 'vitest';

import {
  buildKangurCmsBuilderState,
  parseKangurCmsProject,
} from './project';

describe('Kangur CMS project i18n defaults', () => {
  it('builds English default CMS blocks for English locale fallbacks', () => {
    const project = parseKangurCmsProject(null, {
      fallbackToDefault: true,
      locale: 'en',
    });

    expect(project).not.toBeNull();

    const serialized = JSON.stringify(project);
    expect(serialized).toContain('Player name');
    expect(serialized).toContain('Priority assignments');
    expect(serialized).toContain('Great job, Player!');
    expect(serialized).toContain('Training setup');
  });

  it('keeps Polish defaults and page locale for Polish builder state', () => {
    const project = parseKangurCmsProject(null, {
      fallbackToDefault: true,
      locale: 'pl',
    });

    if (!project) {
      throw new Error('Expected default Kangur CMS project');
    }

    const serialized = JSON.stringify(project);
    expect(serialized).toContain('Imie gracza');
    expect(serialized).toContain('Priorytetowe zadania');

    const state = buildKangurCmsBuilderState(project, 'Game', 'pl');
    expect(state.currentPage.locale).toBe('pl');
  });

  it('uses the requested locale for synthetic builder pages', () => {
    const project = parseKangurCmsProject(null, {
      fallbackToDefault: true,
      locale: 'en',
    });

    if (!project) {
      throw new Error('Expected default Kangur CMS project');
    }

    const state = buildKangurCmsBuilderState(project, 'Game', 'en');
    expect(state.currentPage.locale).toBe('en');
  });
});
