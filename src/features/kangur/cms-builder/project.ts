import {
  type BlockInstance,
  type Page,
  type PageBuilderState,
  type PageComponentInput,
  type PageSummary,
  type SectionInstance,
} from '@/shared/contracts/cms';
import { parseJsonSetting } from '@/shared/utils/settings-json';

import {
  createDefaultKangurCmsProject,
  createDefaultGameScreenComponents,
  createDefaultLessonsScreenComponents,
  createDefaultLearnerProfileScreenComponents,
  createDefaultParentDashboardScreenComponents,
} from './project-defaults';
import {
  KANGUR_CMS_SCREEN_LABELS,
  KANGUR_CMS_SCREEN_KEYS,
  type KangurCmsScreenKey,
  type KangurCmsScreen,
  type KangurCmsProject,
  kangurCmsProjectSchema,
} from './project-contracts';
import { withOrders } from './project-factories';

// Re-export contracts and constants
export * from './project-contracts';
export * from './project-factories';
export * from './project-sections';
export * from './project-leaderboard';
export * from './project-defaults';

const now = (): string => new Date().toISOString();

const resolveSingleWidgetId = (screen: KangurCmsScreen): string | null => {
  if (screen.components.length !== 1) {
    return null;
  }

  const component = screen.components[0];
  if (component?.type !== 'Block' || component.content.blocks.length !== 1) {
    return null;
  }

  const block = component.content.blocks[0];
  if (block?.type !== 'KangurWidget') {
    return null;
  }

  return typeof block.settings['widgetId'] === 'string' ? block.settings['widgetId'] : null;
};

const HIDDEN_KANGUR_WIDGET_IDS = new Set(['game-home-hero']);

const sectionContainsHiddenWidget = (blocks: BlockInstance[]): boolean => {
  for (const block of blocks) {
    if (block.type === 'KangurWidget') {
      const widgetId = block.settings?.['widgetId'];
      if (typeof widgetId === 'string' && HIDDEN_KANGUR_WIDGET_IDS.has(widgetId)) {
        return true;
      }
    }
    if (block.blocks && sectionContainsHiddenWidget(block.blocks)) {
      return true;
    }
  }

  return false;
};

const pruneHiddenWidgetSections = (components: PageComponentInput[]): PageComponentInput[] =>
  components.filter((component) => !sectionContainsHiddenWidget(component.content.blocks));

const pruneHiddenWidgetsFromProject = (project: KangurCmsProject): KangurCmsProject => ({
  ...project,
  screens: {
    ...project.screens,
    Game: {
      ...project.screens.Game,
      components: pruneHiddenWidgetSections(project.screens.Game.components),
    },
    Lessons: {
      ...project.screens.Lessons,
      components: pruneHiddenWidgetSections(project.screens.Lessons.components),
    },
    LearnerProfile: {
      ...project.screens.LearnerProfile,
      components: pruneHiddenWidgetSections(project.screens.LearnerProfile.components),
    },
    ParentDashboard: {
      ...project.screens.ParentDashboard,
      components: pruneHiddenWidgetSections(project.screens.ParentDashboard.components),
    },
  },
});

const upgradeLegacyScreenComponents = (project: KangurCmsProject): KangurCmsProject => {
  const gameWidgetId = resolveSingleWidgetId(project.screens.Game);
  const lessonsWidgetId = resolveSingleWidgetId(project.screens.Lessons);
  const learnerProfileWidgetId = resolveSingleWidgetId(project.screens.LearnerProfile);
  const parentDashboardWidgetId = resolveSingleWidgetId(project.screens.ParentDashboard);
  if (
    gameWidgetId !== 'game-screen' &&
    lessonsWidgetId !== 'lessons-screen' &&
    learnerProfileWidgetId !== 'learner-profile-screen' &&
    parentDashboardWidgetId !== 'parent-dashboard-screen'
  ) {
    return project;
  }

  return {
    ...project,
    screens: {
      ...project.screens,
      Game:
        gameWidgetId === 'game-screen'
          ? {
            ...project.screens.Game,
            components: createDefaultGameScreenComponents(),
          }
          : project.screens.Game,
      Lessons:
        lessonsWidgetId === 'lessons-screen'
          ? {
            ...project.screens.Lessons,
            components: createDefaultLessonsScreenComponents(),
          }
          : project.screens.Lessons,
      LearnerProfile:
        learnerProfileWidgetId === 'learner-profile-screen'
          ? {
            ...project.screens.LearnerProfile,
            components: createDefaultLearnerProfileScreenComponents(),
          }
          : project.screens.LearnerProfile,
      ParentDashboard:
        parentDashboardWidgetId === 'parent-dashboard-screen'
          ? {
            ...project.screens.ParentDashboard,
            components: createDefaultParentDashboardScreenComponents(),
          }
          : project.screens.ParentDashboard,
    },
  };
};

export function isKangurCmsScreenKey(
  value: string | null | undefined
): value is KangurCmsScreenKey {
  return typeof value === 'string' && (KANGUR_CMS_SCREEN_KEYS as readonly string[]).includes(value);
}

export function resolveKangurCmsScreenKey(
  value: string | null | undefined
): KangurCmsScreenKey | null {
  if (!value) {
    return null;
  }

  return isKangurCmsScreenKey(value) ? value : null;
}

export function parseKangurCmsProject(
  raw: string | null | undefined,
  options?: { fallbackToDefault?: boolean }
): KangurCmsProject | null {
  const fallbackToDefault = options?.fallbackToDefault ?? true;
  const parsed = parseJsonSetting<unknown>(raw, null);

  if (!parsed) {
    return fallbackToDefault ? createDefaultKangurCmsProject() : null;
  }

  const result = kangurCmsProjectSchema.safeParse(parsed);
  if (!result.success) {
    return fallbackToDefault ? createDefaultKangurCmsProject() : null;
  }

  return pruneHiddenWidgetsFromProject(upgradeLegacyScreenComponents(result.data));
}

export function buildKangurCmsSyntheticPage(screen: KangurCmsScreen): Page {
  const timestamp = now();

  return {
    id: `kangur-cms-${screen.key.toLowerCase()}`,
    createdAt: timestamp,
    updatedAt: timestamp,
    name: `Kangur ${screen.name}`,
    status: 'draft',
    publishedAt: undefined,
    themeId: null,
    showMenu: false,
    components: withOrders(screen.components),
    slugs: [],
    seoTitle: `Kangur ${screen.name}`,
    seoDescription: '',
    seoOgImage: '',
    seoCanonical: '',
    robotsMeta: '',
  };
}

export function buildKangurCmsPageSummary(screen: KangurCmsScreen): PageSummary {
  return {
    id: `kangur-cms-${screen.key.toLowerCase()}`,
    name: `Kangur ${screen.name}`,
    status: 'draft',
    slugs: [],
  };
}

export function buildKangurCmsBuilderState(
  project: KangurCmsProject,
  screenKey: KangurCmsScreenKey
): PageBuilderState {
  const screen = project.screens[screenKey];
  const currentPage = buildKangurCmsSyntheticPage(screen);
  const sections: SectionInstance[] = currentPage.components.map(
    (component: PageComponentInput) => ({
      id: component.content.sectionId,
      type: component.type,
      zone: component.content.zone,
      parentSectionId: component.content.parentSectionId,
      settings: component.content.settings,
      blocks: component.content.blocks,
    })
  );

  return {
    pages: KANGUR_CMS_SCREEN_KEYS.map((key: KangurCmsScreenKey) =>
      buildKangurCmsPageSummary(project.screens[key])
    ),
    currentPage,
    sections,
    selectedNodeId: sections[0]?.id ?? null,
    inspectorEnabled: false,
    inspectorSettings: {
      showTooltip: true,
      showStyleSettings: true,
      showStructureInfo: true,
      showIdentifiers: false,
      showVisibilityInfo: true,
      showConnectionInfo: true,
      showEditorChrome: true,
      showLayoutGuides: true,
      pauseAnimations: false,
    },
    previewMode: 'desktop',
    leftPanelCollapsed: false,
    rightPanelCollapsed: false,
    clipboard: null,
    history: { past: [], future: [] },
  };
}

export function serializeKangurCmsSections(sections: SectionInstance[]): PageComponentInput[] {
  return sections.map(
    (section: SectionInstance, index: number): PageComponentInput => ({
      type: section.type,
      order: index,
      content: {
        zone: section.zone,
        settings: section.settings,
        blocks: section.blocks,
        sectionId: section.id,
        parentSectionId: section.parentSectionId ?? null,
      },
    })
  );
}
