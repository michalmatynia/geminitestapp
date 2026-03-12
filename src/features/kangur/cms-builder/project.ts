import { z } from 'zod';

import { KANGUR_THEME_SETTINGS_KEY } from '@/shared/contracts/kangur';
import type {
  BlockInstance,
  Page,
  PageBuilderState,
  PageComponentInput,
  PageSummary,
  SectionInstance,
} from '@/shared/contracts/cms';
import { cmsPageComponentInputSchema } from '@/shared/contracts/cms';
import { parseJsonSetting } from '@/shared/utils/settings-json';

export const KANGUR_CMS_PROJECT_SETTING_KEY = 'kangur_cms_project_v1';
export const KANGUR_CMS_THEME_SETTINGS_KEY = KANGUR_THEME_SETTINGS_KEY;

export const KANGUR_CMS_SCREEN_KEYS = [
  'Game',
  'Lessons',
  'LearnerProfile',
  'ParentDashboard',
] as const;

export type KangurCmsScreenKey = (typeof KANGUR_CMS_SCREEN_KEYS)[number];

export const KANGUR_CMS_SCREEN_LABELS: Record<KangurCmsScreenKey, string> = {
  Game: 'Game',
  Lessons: 'Lessons',
  LearnerProfile: 'Learner Profile',
  ParentDashboard: 'Parent Dashboard',
};

export const KANGUR_WIDGET_IDS = [
  'game-screen',
  'game-navigation',
  'game-xp-toast',
  'game-home-hero',
  'game-home-actions',
  'game-training-setup',
  'game-kangur-setup',
  'game-kangur-session',
  'game-calendar-training',
  'game-geometry-training',
  'game-operation-selector',
  'game-question-session',
  'game-result-summary',
  'lessons-screen',
  'learner-profile-screen',
  'parent-dashboard-screen',
  'lesson-catalog',
  'active-lesson-panel',
  'lesson-navigation',
  'learner-profile-hero',
  'learner-profile-level-progress',
  'learner-profile-overview',
  'learner-profile-recommendations',
  'learner-profile-assignments',
  'learner-profile-mastery',
  'learner-profile-performance',
  'learner-profile-sessions',
  'parent-dashboard-hero',
  'parent-dashboard-learner-management',
  'parent-dashboard-tabs',
  'parent-dashboard-progress',
  'parent-dashboard-scores',
  'parent-dashboard-assignments',
  'player-progress',
  'leaderboard',
  'priority-assignments',
  'assignment-spotlight',
] as const;

export type KangurWidgetId = (typeof KANGUR_WIDGET_IDS)[number];

export const KANGUR_WIDGET_OPTIONS: ReadonlyArray<{ label: string; value: KangurWidgetId }> = [
  { label: 'Game Screen', value: 'game-screen' },
  { label: 'Game Navigation', value: 'game-navigation' },
  { label: 'Game XP Toast', value: 'game-xp-toast' },
  { label: 'Game Home Hero', value: 'game-home-hero' },
  { label: 'Game Home Actions', value: 'game-home-actions' },
  { label: 'Game Training Setup', value: 'game-training-setup' },
  { label: 'Game Kangur Setup', value: 'game-kangur-setup' },
  { label: 'Game Kangur Session', value: 'game-kangur-session' },
  { label: 'Game Calendar Training', value: 'game-calendar-training' },
  { label: 'Game Geometry Training', value: 'game-geometry-training' },
  { label: 'Game Operation Selector', value: 'game-operation-selector' },
  { label: 'Game Question Session', value: 'game-question-session' },
  { label: 'Game Result Summary', value: 'game-result-summary' },
  { label: 'Lessons Screen', value: 'lessons-screen' },
  { label: 'Learner Profile Screen', value: 'learner-profile-screen' },
  { label: 'Parent Dashboard Screen', value: 'parent-dashboard-screen' },
  { label: 'Lesson Catalog', value: 'lesson-catalog' },
  { label: 'Active Lesson Panel', value: 'active-lesson-panel' },
  { label: 'Lesson Navigation', value: 'lesson-navigation' },
  { label: 'Learner Profile Hero', value: 'learner-profile-hero' },
  { label: 'Learner Profile Level Progress', value: 'learner-profile-level-progress' },
  { label: 'Learner Profile Overview', value: 'learner-profile-overview' },
  { label: 'Learner Profile Recommendations', value: 'learner-profile-recommendations' },
  { label: 'Learner Profile Assignments', value: 'learner-profile-assignments' },
  { label: 'Learner Profile Mastery', value: 'learner-profile-mastery' },
  { label: 'Learner Profile Performance', value: 'learner-profile-performance' },
  { label: 'Learner Profile Sessions', value: 'learner-profile-sessions' },
  { label: 'Parent Dashboard Hero', value: 'parent-dashboard-hero' },
  {
    label: 'Parent Dashboard Learner Management',
    value: 'parent-dashboard-learner-management',
  },
  { label: 'Parent Dashboard Tabs', value: 'parent-dashboard-tabs' },
  { label: 'Parent Dashboard Progress', value: 'parent-dashboard-progress' },
  { label: 'Parent Dashboard Scores', value: 'parent-dashboard-scores' },
  { label: 'Parent Dashboard Assignments', value: 'parent-dashboard-assignments' },
  { label: 'Player Progress', value: 'player-progress' },
  { label: 'Leaderboard', value: 'leaderboard' },
  { label: 'Priority Assignments', value: 'priority-assignments' },
  { label: 'Assignment Spotlight', value: 'assignment-spotlight' },
] as const;

const KANGUR_WIDGET_LABELS = new Map<KangurWidgetId, string>(
  KANGUR_WIDGET_OPTIONS.map((option) => [option.value, option.label])
);

export type KangurCmsScreen = {
  key: KangurCmsScreenKey;
  name: string;
  components: PageComponentInput[];
};

export type KangurCmsProject = {
  version: 1;
  screens: Record<KangurCmsScreenKey, KangurCmsScreen>;
};

const kangurCmsScreenKeySchema = z.enum(KANGUR_CMS_SCREEN_KEYS);
const kangurCmsScreenSchema = z.object({
  key: kangurCmsScreenKeySchema,
  name: z.string().trim().min(1).max(120),
  components: z.array(cmsPageComponentInputSchema).max(128),
});

const kangurCmsProjectSchema = z.object({
  version: z.literal(1).default(1),
  screens: z.object({
    Game: kangurCmsScreenSchema,
    Lessons: kangurCmsScreenSchema,
    LearnerProfile: kangurCmsScreenSchema,
    ParentDashboard: kangurCmsScreenSchema,
  }),
});

const now = (): string => new Date().toISOString();

const makeHeadingBlock = (
  id: string,
  headingText: string,
  fontSize = 40,
  settings: Record<string, unknown> = {}
): PageComponentInput['content']['blocks'][number] => ({
  id,
  type: 'Heading',
  settings: {
    headingText,
    fontSize,
    fontWeight: '700',
    textColor: '#f8fafc',
    ...settings,
  },
});

const makeTextBlock = (
  id: string,
  textContent: string,
  settings: Record<string, unknown> = {}
): PageComponentInput['content']['blocks'][number] => ({
  id,
  type: 'Text',
  settings: {
    textContent,
    fontSize: 16,
    lineHeight: 1.6,
    textColor: '#cbd5e1',
    ...settings,
  },
});

const makeButtonBlock = (
  id: string,
  buttonLabel: string,
  settings: Record<string, unknown> = {}
): BlockInstance => ({
  id,
  type: 'Button',
  settings: {
    buttonLabel,
    buttonLink: '',
    buttonStyle: 'solid',
    runtimeActionSource: '',
    runtimeActionPath: '',
    ...settings,
  },
});

const makeInputBlock = (id: string, settings: Record<string, unknown> = {}): BlockInstance => ({
  id,
  type: 'Input',
  settings: {
    inputValue: '',
    inputPlaceholder: '',
    inputType: 'text',
    inputAutoComplete: '',
    inputMaxLength: 0,
    inputDisabled: 'false',
    inputChangeActionSource: '',
    inputChangeActionPath: '',
    inputSubmitActionSource: '',
    inputSubmitActionPath: '',
    ...settings,
  },
});

const makeProgressBlock = (id: string, settings: Record<string, unknown> = {}): BlockInstance => ({
  id,
  type: 'Progress',
  settings: {
    progressValue: 0,
    progressMax: 100,
    progressHeight: 12,
    borderRadius: 999,
    fillColor: '#6366f1',
    trackColor: '#e2e8f0',
    showPercentage: 'false',
    ...settings,
  },
});

const makeRepeaterBlock = (
  id: string,
  blocks: BlockInstance[],
  settings: Record<string, unknown> = {}
): BlockInstance => ({
  id,
  type: 'Repeater',
  settings: {
    collectionSource: '',
    collectionPath: '',
    emptyMessage: 'No items to show yet.',
    itemLimit: 0,
    itemsGap: 16,
    listLayoutDirection: 'column',
    listWrap: 'wrap',
    listAlignItems: 'stretch',
    listJustifyContent: 'start',
    itemGap: 12,
    itemLayoutDirection: 'column',
    itemWrap: 'wrap',
    itemAlignItems: 'stretch',
    itemJustifyContent: 'start',
    ...settings,
  },
  blocks,
});

const makeContainerBlock = (input: {
  id: string;
  blocks: BlockInstance[];
  settings?: Record<string, unknown>;
}): BlockInstance => ({
  id: input.id,
  type: 'Block',
  settings: {
    colorScheme: 'none',
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    paddingRight: 0,
    blockGap: 12,
    marginTop: 0,
    marginBottom: 0,
    marginLeft: 0,
    marginRight: 0,
    contentAlignment: 'left',
    layoutDirection: 'column',
    wrap: 'wrap',
    alignItems: 'stretch',
    justifyContent: 'inherit',
    minHeight: 0,
    maxWidth: 0,
    overflow: 'visible',
    opacity: 100,
    zIndex: 0,
    background: { type: 'none' },
    sectionBorder: { width: 0, style: 'none', color: '#4b5563', radius: 0 },
    sectionShadow: { x: 0, y: 0, blur: 0, spread: 0, color: '#00000000' },
    customCss: '',
    ...(input.settings ?? {}),
  },
  blocks: input.blocks,
});

const makeGameMetricCard = (input: {
  id: string;
  label: string;
  connectionPath: string;
  fillColor: string;
  fallback?: string;
  textColor?: string;
  valueFontSize?: number;
}): BlockInstance =>
  makeContainerBlock({
    id: input.id,
    settings: {
      paddingTop: 18,
      paddingBottom: 18,
      paddingLeft: 16,
      paddingRight: 16,
      blockGap: 6,
      contentAlignment: 'center',
      alignItems: 'center',
      background: { type: 'solid', color: input.fillColor },
      sectionBorder: {
        width: 1,
        style: 'solid',
        color: input.fillColor,
        radius: 22,
      },
    },
    blocks: [
      makeHeadingBlock(`${input.id}-value`, input.fallback ?? '0', input.valueFontSize ?? 28, {
        headingSize: 'small',
        textColor: input.textColor ?? '#0f172a',
        connection: {
          enabled: true,
          source: 'kangur',
          path: input.connectionPath,
          fallback: input.fallback ?? '0',
        },
      }),
      makeTextBlock(`${input.id}-label`, input.label, {
        fontSize: 13,
        fontWeight: '700',
        textAlign: 'center',
        textColor: '#64748b',
      }),
    ],
  });

const makeWidgetBlock = (
  id: string,
  widgetId: KangurWidgetId,
  settings: Record<string, unknown> = {}
): PageComponentInput['content']['blocks'][number] => ({
  id,
  type: 'KangurWidget',
  settings: {
    widgetId,
    title: '',
    emptyLabel: '',
    limit: 3,
    ...settings,
  },
});

const makeBlockSection = (input: {
  id: string;
  title?: string;
  description?: string;
  blocks: PageComponentInput['content']['blocks'];
  paddingTop?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingRight?: number;
  settings?: Record<string, unknown>;
}): PageComponentInput => ({
  type: 'Block',
  order: 0,
  content: {
    zone: 'template',
    sectionId: input.id,
    parentSectionId: null,
    settings: {
      colorScheme: 'none',
      paddingTop: input.paddingTop ?? 24,
      paddingBottom: input.paddingBottom ?? 24,
      paddingLeft: input.paddingLeft ?? 24,
      paddingRight: input.paddingRight ?? 24,
      blockGap: 16,
      marginTop: 0,
      marginBottom: 0,
      marginLeft: 0,
      marginRight: 0,
      contentAlignment: 'left',
      layoutDirection: 'column',
      wrap: 'wrap',
      alignItems: 'stretch',
      justifyContent: 'inherit',
      minHeight: 0,
      maxWidth: 0,
      overflow: 'visible',
      opacity: 100,
      zIndex: 0,
      customCss: '',
      ...(input.settings ?? {}),
    },
    blocks: [
      ...(input.title ? [makeHeadingBlock(`${input.id}-heading`, input.title)] : []),
      ...(input.description ? [makeTextBlock(`${input.id}-description`, input.description)] : []),
      ...input.blocks,
    ],
  },
});

const makeGridColumn = (input: {
  id: string;
  blocks: BlockInstance[];
}): BlockInstance => ({
  id: input.id,
  type: 'Column',
  settings: {
    gap: 'medium',
    gapPx: 0,
    textAlign: 'left',
    justifyContent: 'inherit',
    alignItems: 'stretch',
    heightMode: 'inherit',
    height: 0,
    customCss: '',
  },
  blocks: input.blocks,
});

const makeGridRow = (input: {
  id: string;
  columns: BlockInstance[];
}): BlockInstance => ({
  id: input.id,
  type: 'Row',
  settings: {
    gap: 'large',
    gapPx: 0,
    justifyContent: 'inherit',
    alignItems: 'stretch',
    direction: 'horizontal',
    wrap: 'wrap',
    heightMode: 'inherit',
    height: 0,
    customCss: '',
  },
  blocks: input.columns,
});

const makeGridSection = (input: {
  id: string;
  rows: BlockInstance[];
  paddingTop?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingRight?: number;
  settings?: Record<string, unknown>;
}): PageComponentInput => ({
  type: 'Grid',
  order: 0,
  content: {
    zone: 'template',
    sectionId: input.id,
    parentSectionId: null,
    settings: {
      colorScheme: 'none',
      paddingTop: input.paddingTop ?? 24,
      paddingBottom: input.paddingBottom ?? 24,
      paddingLeft: input.paddingLeft ?? 24,
      paddingRight: input.paddingRight ?? 24,
      gap: 'large',
      rowGap: 'large',
      columnGap: 'large',
      rowGapPx: 0,
      columnGapPx: 0,
      marginTop: 0,
      marginBottom: 0,
      marginLeft: 0,
      marginRight: 0,
      customCss: '',
      ...(input.settings ?? {}),
    },
    blocks: input.rows,
  },
});

const withOrders = (components: PageComponentInput[]): PageComponentInput[] =>
  components.map((component: PageComponentInput, index: number) => ({
    ...component,
    order: index,
  }));

const makeRuntimeVisibilitySettings = (input: {
  mode: 'always' | 'equals' | 'not-equals' | 'truthy' | 'falsy';
  path: string;
  source?: string;
  value?: string;
}): Record<string, unknown> => ({
  runtimeVisibilityMode: input.mode,
  runtimeVisibilitySource: input.source ?? 'kangur',
  runtimeVisibilityPath: input.path,
  ...(input.value !== undefined ? { runtimeVisibilityValue: input.value } : {}),
});

const makeGameScreenVisibilitySettings = (value: string): Record<string, unknown> =>
  makeRuntimeVisibilitySettings({
    mode: 'equals',
    path: 'game.screen',
    value,
  });

const makeGameUserVisibilitySettings = (mode: 'truthy' | 'falsy'): Record<string, unknown> =>
  makeRuntimeVisibilitySettings({
    mode,
    path: 'game.user',
  });

const makeSelectableButtonRepeater = (input: {
  collectionPath: string;
  fallbackLabel?: string;
  id: string;
  itemsGap?: number;
}): BlockInstance =>
  makeRepeaterBlock(
    input.id,
    [
      makeButtonBlock(`${input.id}-button-selected`, input.fallbackLabel ?? 'Filtr', {
        runtimeActionSource: 'item',
        runtimeActionPath: 'select',
        buttonStyle: 'solid',
        fontSize: 14,
        fontWeight: '700',
        textColor: '#ffffff',
        bgColor: '#4f46e5',
        borderColor: '#4f46e5',
        borderRadius: 18,
        borderWidth: 1,
        connection: {
          enabled: true,
          source: 'item',
          path: 'displayLabel',
          fallback: input.fallbackLabel ?? 'Filtr',
        },
        ...makeRuntimeVisibilitySettings({
          mode: 'truthy',
          path: 'selected',
          source: 'item',
        }),
      }),
      makeButtonBlock(`${input.id}-button-default`, input.fallbackLabel ?? 'Filtr', {
        runtimeActionSource: 'item',
        runtimeActionPath: 'select',
        buttonStyle: 'outline',
        fontSize: 14,
        fontWeight: '700',
        textColor: '#475569',
        bgColor: '#ffffff',
        borderColor: '#dbe4f3',
        borderRadius: 18,
        borderWidth: 1,
        connection: {
          enabled: true,
          source: 'item',
          path: 'displayLabel',
          fallback: input.fallbackLabel ?? 'Filtr',
        },
        ...makeRuntimeVisibilitySettings({
          mode: 'falsy',
          path: 'selected',
          source: 'item',
        }),
      }),
    ],
    {
      collectionSource: 'kangur',
      collectionPath: input.collectionPath,
      emptyMessage: '',
      itemLimit: 0,
      itemsGap: input.itemsGap ?? 8,
      listLayoutDirection: 'row',
      listWrap: 'wrap',
      listAlignItems: 'stretch',
      listJustifyContent: 'start',
      itemGap: 0,
      itemLayoutDirection: 'column',
      itemWrap: 'wrap',
      itemAlignItems: 'stretch',
      itemJustifyContent: 'start',
    }
  );

const makeLeaderboardFilterRepeater = (input: {
  collectionPath: string;
  id: string;
}): BlockInstance =>
  makeSelectableButtonRepeater({
    collectionPath: input.collectionPath,
    id: input.id,
  });

const makeGamePracticeAssignmentPanel = (input: { id: string }): BlockInstance =>
  makeContainerBlock({
    id: input.id,
    settings: {
      maxWidth: 760,
      paddingTop: 24,
      paddingBottom: 24,
      paddingLeft: 24,
      paddingRight: 24,
      blockGap: 12,
      background: { type: 'solid', color: '#fff7ed' },
      sectionBorder: {
        width: 1,
        style: 'solid',
        color: '#fed7aa',
        radius: 28,
      },
      sectionShadow: {
        x: 0,
        y: 20,
        blur: 50,
        spread: 0,
        color: '#fdba741f',
      },
      ...makeRuntimeVisibilitySettings({
        mode: 'truthy',
        path: 'game.activePracticeAssignmentBanner.hasAssignment',
      }),
    },
    blocks: [
      makeTextBlock(`${input.id}-helper`, 'Najblizszy priorytet w praktyce.', {
        fontSize: 14,
        fontWeight: '700',
        textColor: '#9a3412',
        connection: {
          enabled: true,
          source: 'kangur',
          path: 'game.activePracticeAssignmentBanner.helperLabel',
          fallback: 'Najblizszy priorytet w praktyce.',
        },
      }),
      makeTextBlock(`${input.id}-priority`, 'Priorytet wysoki', {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1.2,
        textColor: '#ea580c',
        connection: {
          enabled: true,
          source: 'kangur',
          path: 'game.activePracticeAssignmentBanner.priorityLabel',
          fallback: 'Priorytet wysoki',
        },
      }),
      makeHeadingBlock(`${input.id}-title`, 'Zadanie od rodzica', 26, {
        textColor: '#7c2d12',
        connection: {
          enabled: true,
          source: 'kangur',
          path: 'game.activePracticeAssignmentBanner.title',
          fallback: 'Zadanie od rodzica',
        },
      }),
      makeTextBlock(`${input.id}-description`, 'Wroc do zadania i kontynuuj wyzwanie.', {
        fontSize: 15,
        textColor: '#9a3412',
        connection: {
          enabled: true,
          source: 'kangur',
          path: 'game.activePracticeAssignmentBanner.description',
          fallback: 'Wroc do zadania i kontynuuj wyzwanie.',
        },
      }),
      makeProgressBlock(`${input.id}-progress`, {
        progressMax: 100,
        progressHeight: 12,
        borderRadius: 999,
        fillColor: '#f97316',
        trackColor: '#ffedd5',
        showPercentage: 'true',
        connection: {
          enabled: true,
          source: 'kangur',
          path: 'game.activePracticeAssignmentBanner.progressPercent',
          fallback: '0',
        },
      }),
      makeTextBlock(`${input.id}-progress-label`, '0% ukonczono', {
        fontSize: 14,
        textColor: '#9a3412',
        connection: {
          enabled: true,
          source: 'kangur',
          path: 'game.activePracticeAssignmentBanner.progressLabel',
          fallback: '0% ukonczono',
        },
      }),
      makeButtonBlock(`${input.id}-button`, 'Kontynuuj zadanie', {
        runtimeActionSource: 'kangur',
        runtimeActionPath: 'game.activePracticeAssignmentBanner.openAssignment',
        buttonStyle: 'solid',
        fontSize: 15,
        fontWeight: '700',
        textColor: '#ffffff',
        bgColor: '#ea580c',
        borderColor: '#ea580c',
        borderRadius: 18,
        borderWidth: 1,
        connection: {
          enabled: true,
          source: 'kangur',
          path: 'game.activePracticeAssignmentBanner.actionLabel',
          fallback: 'Kontynuuj zadanie',
        },
      }),
    ],
  });

const makeGameTrainingSetupPanel = (input: { id: string }): BlockInstance =>
  makeContainerBlock({
    id: input.id,
    settings: {
      alignItems: 'center',
      blockGap: 16,
    },
    blocks: [
      makeGamePracticeAssignmentPanel({ id: `${input.id}-assignment` }),
      makeContainerBlock({
        id: `${input.id}-main`,
        settings: {
          maxWidth: 960,
          paddingTop: 28,
          paddingBottom: 28,
          paddingLeft: 28,
          paddingRight: 28,
          blockGap: 16,
          background: { type: 'solid', color: '#ffffff' },
          sectionBorder: {
            width: 1,
            style: 'solid',
            color: '#eceff7',
            radius: 28,
          },
          sectionShadow: {
            x: 0,
            y: 24,
            blur: 60,
            spread: 0,
            color: '#a8afd82e',
          },
        },
        blocks: [
          makeHeadingBlock(`${input.id}-title`, 'Tryb treningowy', 28, {
            textColor: '#1e293b',
          }),
          makeTextBlock(
            `${input.id}-description`,
            'Ten ekran jest juz skladany w CMS builderze. Zmieniaj etykiety, kolejnosc i akcje bez wracania do komponentu treningowego.',
            {
              fontSize: 15,
              textColor: '#7a86b0',
            }
          ),
          makeTextBlock(`${input.id}-summary`, 'Wybrano 7 kategorii, 10 pytan, poziom sredni.', {
            fontSize: 14,
            fontWeight: '700',
            textColor: '#4f46e5',
            connection: {
              enabled: true,
              source: 'kangur',
              path: 'game.trainingSetup.summaryLabel',
              fallback: 'Wybrano 7 kategorii, 10 pytan, poziom sredni.',
            },
          }),
          makeTextBlock(`${input.id}-difficulty-label`, 'Poziom trudnosci', {
            fontSize: 13,
            fontWeight: '700',
            letterSpacing: 1.2,
            textColor: '#94a3b8',
          }),
          makeSelectableButtonRepeater({
            id: `${input.id}-difficulty-options`,
            collectionPath: 'game.trainingSetup.difficultyOptions.items',
            fallbackLabel: 'Poziom',
          }),
          makeContainerBlock({
            id: `${input.id}-category-header`,
            settings: {
              layoutDirection: 'row',
              wrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              blockGap: 12,
            },
            blocks: [
              makeTextBlock(`${input.id}-category-label`, 'Kategorie pytan', {
                fontSize: 13,
                fontWeight: '700',
                letterSpacing: 1.2,
                textColor: '#94a3b8',
              }),
              makeButtonBlock(`${input.id}-toggle-all`, 'Zaznacz wszystkie', {
                runtimeActionSource: 'kangur',
                runtimeActionPath: 'game.trainingSetup.toggleAllCategories',
                buttonStyle: 'outline',
                fontSize: 13,
                fontWeight: '700',
                textColor: '#475569',
                bgColor: '#ffffff',
                borderColor: '#dbe4f3',
                borderRadius: 16,
                borderWidth: 1,
                connection: {
                  enabled: true,
                  source: 'kangur',
                  path: 'game.trainingSetup.toggleAllLabel',
                  fallback: 'Zaznacz wszystkie',
                },
              }),
            ],
          }),
          makeSelectableButtonRepeater({
            id: `${input.id}-category-options`,
            collectionPath: 'game.trainingSetup.categoryOptions.items',
            fallbackLabel: 'Kategoria',
            itemsGap: 10,
          }),
          makeTextBlock(`${input.id}-count-label`, 'Liczba pytan', {
            fontSize: 13,
            fontWeight: '700',
            letterSpacing: 1.2,
            textColor: '#94a3b8',
          }),
          makeSelectableButtonRepeater({
            id: `${input.id}-count-options`,
            collectionPath: 'game.trainingSetup.countOptions.items',
            fallbackLabel: '10',
          }),
          makeContainerBlock({
            id: `${input.id}-actions`,
            settings: {
              layoutDirection: 'row',
              wrap: 'wrap',
              alignItems: 'stretch',
              justifyContent: 'space-between',
              blockGap: 12,
            },
            blocks: [
              makeButtonBlock(`${input.id}-back`, '← Wroc', {
                runtimeActionSource: 'kangur',
                runtimeActionPath: 'game.handleHome',
                buttonStyle: 'outline',
                fontSize: 15,
                fontWeight: '700',
                textColor: '#334155',
                bgColor: '#ffffff',
                borderColor: '#dbe4f3',
                borderRadius: 18,
                borderWidth: 1,
              }),
              makeButtonBlock(`${input.id}-start`, 'Start! 🚀', {
                runtimeActionSource: 'kangur',
                runtimeActionPath: 'game.trainingSetup.start',
                buttonStyle: 'solid',
                fontSize: 15,
                fontWeight: '700',
                textColor: '#ffffff',
                bgColor: '#4f46e5',
                borderColor: '#4f46e5',
                borderRadius: 18,
                borderWidth: 1,
              }),
            ],
          }),
        ],
      }),
    ],
  });

const makeGameOperationSelectorPanel = (input: { id: string }): BlockInstance =>
  makeContainerBlock({
    id: input.id,
    settings: {
      alignItems: 'center',
      blockGap: 16,
    },
    blocks: [
      makeGamePracticeAssignmentPanel({ id: `${input.id}-assignment` }),
      makeContainerBlock({
        id: `${input.id}-main`,
        settings: {
          maxWidth: 1120,
          paddingTop: 28,
          paddingBottom: 28,
          paddingLeft: 28,
          paddingRight: 28,
          blockGap: 16,
          background: { type: 'solid', color: '#ffffff' },
          sectionBorder: {
            width: 1,
            style: 'solid',
            color: '#eceff7',
            radius: 28,
          },
          sectionShadow: {
            x: 0,
            y: 24,
            blur: 60,
            spread: 0,
            color: '#a8afd82e',
          },
        },
        blocks: [
          makeTextBlock(`${input.id}-greeting`, 'Czesc, Graczu! 👋', {
            fontSize: 18,
            fontWeight: '700',
            textColor: '#4f46e5',
            connection: {
              enabled: true,
              source: 'kangur',
              path: 'game.operationSelector.greetingLabel',
              fallback: 'Czesc, Graczu! 👋',
            },
          }),
          makeHeadingBlock(`${input.id}-title`, 'Wybierz swoje wyzwanie', 28, {
            textColor: '#1e293b',
          }),
          makeTextBlock(
            `${input.id}-description`,
            'Ten ekran jest juz skladany w CMS builderze. Zmieniaj karty kategorii, kolejki zadan i szybkie akcje bez wracania do komponentu wyboru.',
            {
              fontSize: 15,
              textColor: '#7a86b0',
            }
          ),
          makeTextBlock(`${input.id}-difficulty-label`, 'Poziom trudnosci', {
            fontSize: 13,
            fontWeight: '700',
            letterSpacing: 1.2,
            textColor: '#94a3b8',
          }),
          makeSelectableButtonRepeater({
            id: `${input.id}-difficulty-options`,
            collectionPath: 'game.operationSelector.difficultyOptions.items',
            fallbackLabel: 'Poziom',
          }),
          makeRepeaterBlock(
            `${input.id}-operation-cards`,
            [
              makeContainerBlock({
                id: `${input.id}-operation-card`,
                settings: {
                  maxWidth: 320,
                  customCss: 'width: min(100%, 320px);',
                  paddingTop: 20,
                  paddingBottom: 20,
                  paddingLeft: 20,
                  paddingRight: 20,
                  blockGap: 10,
                  background: { type: 'solid', color: '#f8fafc' },
                  sectionBorder: {
                    width: 1,
                    style: 'solid',
                    color: '#e2e8f0',
                    radius: 24,
                  },
                },
                blocks: [
                  makeTextBlock(`${input.id}-operation-priority`, 'Priorytet wysoki', {
                    fontSize: 12,
                    fontWeight: '700',
                    letterSpacing: 1.2,
                    textColor: '#f59e0b',
                    connection: {
                      enabled: true,
                      source: 'item',
                      path: 'priorityLabel',
                      fallback: 'Priorytet wysoki',
                    },
                    ...makeRuntimeVisibilitySettings({
                      mode: 'truthy',
                      path: 'hasPriorityAssignment',
                      source: 'item',
                    }),
                  }),
                  makeTextBlock(`${input.id}-operation-status`, 'Trening swobodny', {
                    fontSize: 12,
                    fontWeight: '700',
                    letterSpacing: 1.2,
                    textColor: '#94a3b8',
                    connection: {
                      enabled: true,
                      source: 'item',
                      path: 'statusLabel',
                      fallback: 'Trening swobodny',
                    },
                  }),
                  makeHeadingBlock(`${input.id}-operation-title`, '➕ Dodawanie', 24, {
                    headingSize: 'small',
                    textColor: '#1e293b',
                    connection: {
                      enabled: true,
                      source: 'item',
                      path: 'displayLabel',
                      fallback: '➕ Dodawanie',
                    },
                  }),
                  makeTextBlock(
                    `${input.id}-operation-description`,
                    'Wejdz do serii pytan i cwicz we wlasnym tempie.',
                    {
                      fontSize: 14,
                      textColor: '#64748b',
                      connection: {
                        enabled: true,
                        source: 'item',
                        path: 'description',
                        fallback: 'Wejdz do serii pytan i cwicz we wlasnym tempie.',
                      },
                    }
                  ),
                  makeButtonBlock(`${input.id}-operation-button`, 'Zacznij lekcje', {
                    runtimeActionSource: 'item',
                    runtimeActionPath: 'select',
                    buttonStyle: 'solid',
                    fontSize: 14,
                    fontWeight: '700',
                    textColor: '#ffffff',
                    bgColor: '#4f46e5',
                    borderColor: '#4f46e5',
                    borderRadius: 18,
                    borderWidth: 1,
                    connection: {
                      enabled: true,
                      source: 'item',
                      path: 'actionLabel',
                      fallback: 'Zacznij lekcje',
                    },
                  }),
                ],
              }),
            ],
            {
              collectionSource: 'kangur',
              collectionPath: 'game.operationSelector.operations.items',
              emptyMessage: '',
              itemLimit: 0,
              itemsGap: 16,
              listLayoutDirection: 'row',
              listWrap: 'wrap',
              listAlignItems: 'stretch',
              listJustifyContent: 'start',
              itemGap: 0,
              itemLayoutDirection: 'column',
              itemWrap: 'wrap',
              itemAlignItems: 'stretch',
              itemJustifyContent: 'start',
            }
          ),
          makeContainerBlock({
            id: `${input.id}-quick-actions`,
            settings: {
              layoutDirection: 'row',
              wrap: 'wrap',
              alignItems: 'stretch',
              justifyContent: 'space-between',
              blockGap: 12,
            },
            blocks: [
              makeButtonBlock(`${input.id}-calendar`, '📅 Cwiczenia z Kalendarzem', {
                runtimeActionSource: 'kangur',
                runtimeActionPath: 'game.setScreen',
                runtimeActionArgs: 'calendar_quiz',
                buttonStyle: 'outline',
                fontSize: 14,
                fontWeight: '700',
                textColor: '#334155',
                bgColor: '#ffffff',
                borderColor: '#dbe4f3',
                borderRadius: 18,
                borderWidth: 1,
              }),
              makeButtonBlock(`${input.id}-geometry`, '🔷 Cwiczenia z Figurami', {
                runtimeActionSource: 'kangur',
                runtimeActionPath: 'game.setScreen',
                runtimeActionArgs: 'geometry_quiz',
                buttonStyle: 'solid',
                fontSize: 14,
                fontWeight: '700',
                textColor: '#ffffff',
                bgColor: '#0f766e',
                borderColor: '#0f766e',
                borderRadius: 18,
                borderWidth: 1,
              }),
            ],
          }),
        ],
      }),
    ],
  });

const makeGameLeaderboardPanel = (input: {
  description: string;
  id: string;
  title: string;
}): BlockInstance =>
  makeContainerBlock({
    id: `${input.id}-panel`,
    settings: {
      paddingTop: 24,
      paddingBottom: 24,
      paddingLeft: 24,
      paddingRight: 24,
      blockGap: 16,
      background: { type: 'solid', color: '#ffffff' },
      sectionBorder: {
        width: 1,
        style: 'solid',
        color: '#eceff7',
        radius: 28,
      },
      sectionShadow: {
        x: 0,
        y: 24,
        blur: 60,
        spread: 0,
        color: '#a8afd82e',
      },
    },
    blocks: [
      makeHeadingBlock(`${input.id}-title`, input.title, 26, {
        textColor: '#1e293b',
      }),
      makeTextBlock(`${input.id}-description`, input.description, {
        fontSize: 15,
        textColor: '#7a86b0',
      }),
      makeContainerBlock({
        id: `${input.id}-filters`,
        settings: {
          blockGap: 10,
        },
        blocks: [
          makeTextBlock(`${input.id}-operation-filter-label`, 'Dzial', {
            fontSize: 13,
            fontWeight: '700',
            letterSpacing: 1.2,
            textColor: '#94a3b8',
          }),
          makeLeaderboardFilterRepeater({
            id: `${input.id}-operation-filters`,
            collectionPath: 'game.leaderboard.operationFilters.items',
          }),
          makeTextBlock(`${input.id}-user-filter-label`, 'Gracze', {
            fontSize: 13,
            fontWeight: '700',
            letterSpacing: 1.2,
            textColor: '#94a3b8',
          }),
          makeLeaderboardFilterRepeater({
            id: `${input.id}-user-filters`,
            collectionPath: 'game.leaderboard.userFilters.items',
          }),
        ],
      }),
      makeTextBlock(`${input.id}-loading`, 'Ladowanie...', {
        fontSize: 14,
        textColor: '#94a3b8',
        ...makeRuntimeVisibilitySettings({
          mode: 'truthy',
          path: 'game.leaderboard.isLoading',
        }),
      }),
      makeTextBlock(`${input.id}-empty`, 'Brak wynikow dla tych filtrow.', {
        fontSize: 14,
        textColor: '#94a3b8',
        connection: {
          enabled: true,
          source: 'kangur',
          path: 'game.leaderboard.emptyStateLabel',
          fallback: 'Brak wynikow dla tych filtrow.',
        },
        ...makeRuntimeVisibilitySettings({
          mode: 'truthy',
          path: 'game.leaderboard.showEmptyState',
        }),
      }),
      makeRepeaterBlock(
        `${input.id}-rows`,
        [
          makeContainerBlock({
            id: `${input.id}-row-card`,
            settings: {
              paddingTop: 18,
              paddingBottom: 18,
              paddingLeft: 18,
              paddingRight: 18,
              blockGap: 10,
              background: { type: 'solid', color: '#f8fafc' },
              sectionBorder: {
                width: 1,
                style: 'solid',
                color: '#e2e8f0',
                radius: 22,
              },
            },
            blocks: [
              makeContainerBlock({
                id: `${input.id}-row-shell`,
                settings: {
                  layoutDirection: 'row',
                  wrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  blockGap: 14,
                },
                blocks: [
                  makeContainerBlock({
                    id: `${input.id}-row-left`,
                    settings: {
                      layoutDirection: 'row',
                      wrap: 'wrap',
                      alignItems: 'center',
                      blockGap: 14,
                    },
                    blocks: [
                      makeHeadingBlock(`${input.id}-row-rank`, '1.', 28, {
                        headingSize: 'small',
                        textColor: '#4f46e5',
                        connection: {
                          enabled: true,
                          source: 'item',
                          path: 'rankLabel',
                          fallback: '1.',
                        },
                      }),
                      makeContainerBlock({
                        id: `${input.id}-row-copy`,
                        settings: {
                          blockGap: 4,
                        },
                        blocks: [
                          makeContainerBlock({
                            id: `${input.id}-row-name-shell`,
                            settings: {
                              layoutDirection: 'row',
                              wrap: 'wrap',
                              alignItems: 'center',
                              blockGap: 8,
                            },
                            blocks: [
                              makeHeadingBlock(`${input.id}-row-name`, 'Gracz', 22, {
                                headingSize: 'small',
                                textColor: '#1e293b',
                                connection: {
                                  enabled: true,
                                  source: 'item',
                                  path: 'playerName',
                                  fallback: 'Gracz',
                                },
                              }),
                              makeContainerBlock({
                                id: `${input.id}-row-badge`,
                                settings: {
                                  paddingTop: 4,
                                  paddingBottom: 4,
                                  paddingLeft: 10,
                                  paddingRight: 10,
                                  background: { type: 'solid', color: '#eef2ff' },
                                  sectionBorder: {
                                    width: 1,
                                    style: 'solid',
                                    color: '#c7d2fe',
                                    radius: 999,
                                  },
                                  ...makeRuntimeVisibilitySettings({
                                    mode: 'truthy',
                                    path: 'isCurrentUser',
                                    source: 'item',
                                  }),
                                },
                                blocks: [
                                  makeTextBlock(`${input.id}-row-badge-label`, 'Ty', {
                                    fontSize: 12,
                                    fontWeight: '700',
                                    textColor: '#4f46e5',
                                    connection: {
                                      enabled: true,
                                      source: 'item',
                                      path: 'currentUserBadgeLabel',
                                      fallback: 'Ty',
                                    },
                                  }),
                                ],
                              }),
                            ],
                          }),
                          makeTextBlock(`${input.id}-row-meta`, '🎲 Mieszane · Anonim', {
                            fontSize: 13,
                            textColor: '#64748b',
                            connection: {
                              enabled: true,
                              source: 'item',
                              path: 'metaLabel',
                              fallback: '🎲 Mieszane · Anonim',
                            },
                          }),
                        ],
                      }),
                    ],
                  }),
                  makeContainerBlock({
                    id: `${input.id}-row-right`,
                    settings: {
                      blockGap: 4,
                      alignItems: 'end',
                      contentAlignment: 'right',
                    },
                    blocks: [
                      makeHeadingBlock(`${input.id}-row-score`, '0/0', 24, {
                        headingSize: 'small',
                        textColor: '#4f46e5',
                        connection: {
                          enabled: true,
                          source: 'item',
                          path: 'scoreLabel',
                          fallback: '0/0',
                        },
                      }),
                      makeTextBlock(`${input.id}-row-time`, '0s', {
                        fontSize: 13,
                        textColor: '#94a3b8',
                        connection: {
                          enabled: true,
                          source: 'item',
                          path: 'timeLabel',
                          fallback: '0s',
                        },
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
        {
          collectionSource: 'kangur',
          collectionPath: 'game.leaderboard.items',
          emptyMessage: '',
          itemLimit: 10,
          itemsGap: 12,
          itemGap: 0,
          itemLayoutDirection: 'column',
          itemWrap: 'wrap',
          itemAlignItems: 'stretch',
          itemJustifyContent: 'start',
          ...makeRuntimeVisibilitySettings({
            mode: 'truthy',
            path: 'game.leaderboard.hasItems',
          }),
        }
      ),
    ],
  });

const createDefaultGameScreenComponents = (): PageComponentInput[] =>
  withOrders([
    makeBlockSection({
      id: 'kangur-game-navigation',
      blocks: [makeWidgetBlock('kangur-widget-game-navigation', 'game-navigation')],
      paddingTop: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      paddingRight: 0,
    }),
    makeBlockSection({
      id: 'kangur-game-xp-toast',
      blocks: [makeWidgetBlock('kangur-widget-game-xp-toast', 'game-xp-toast')],
      paddingTop: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      paddingRight: 0,
    }),
    makeGridSection({
      id: 'kangur-game-home-grid',
      rows: [
        makeGridRow({
          id: 'kangur-game-home-row',
          columns: [
            makeGridColumn({
              id: 'kangur-game-home-primary',
              blocks: [
                makeContainerBlock({
                  id: 'kangur-game-home-guest-panel',
                  settings: {
                    paddingTop: 28,
                    paddingBottom: 28,
                    paddingLeft: 28,
                    paddingRight: 28,
                    blockGap: 16,
                    background: { type: 'solid', color: '#ffffff' },
                    sectionBorder: {
                      width: 1,
                      style: 'solid',
                      color: '#eceff7',
                      radius: 28,
                    },
                    sectionShadow: {
                      x: 0,
                      y: 24,
                      blur: 60,
                      spread: 0,
                      color: '#a8afd82e',
                    },
                    ...makeGameUserVisibilitySettings('falsy'),
                  },
                  blocks: [
                    makeTextBlock('kangur-game-home-guest-label', 'Imie gracza', {
                      fontSize: 14,
                      fontWeight: '700',
                      letterSpacing: 1.8,
                      textColor: '#97a0c3',
                    }),
                    makeInputBlock('kangur-game-home-guest-name', {
                      inputPlaceholder: 'Wpisz swoje imie...',
                      inputAutoComplete: 'nickname',
                      inputMaxLength: 20,
                      fontSize: 18,
                      fontWeight: '500',
                      textColor: '#334155',
                      bgColor: '#ffffff',
                      borderColor: '#eceff7',
                      borderRadius: 22,
                      borderWidth: 1,
                      height: 58,
                      inputChangeActionSource: 'kangur',
                      inputChangeActionPath: 'game.setPlayerName',
                      inputSubmitActionSource: 'kangur',
                      inputSubmitActionPath: 'game.handleStartGame',
                      connection: {
                        enabled: true,
                        source: 'kangur',
                        path: 'game.playerName',
                        fallback: '',
                      },
                    }),
                    makeContainerBlock({
                      id: 'kangur-game-home-guest-login-row',
                      settings: {
                        layoutDirection: 'row',
                        wrap: 'wrap',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        blockGap: 12,
                      },
                      blocks: [
                        makeTextBlock(
                          'kangur-game-home-guest-login-copy',
                          'Zaloguj sie, aby Twoj wynik pojawil sie na tablicy.',
                          {
                            fontSize: 15,
                            textColor: '#8c97bb',
                          }
                        ),
                        makeButtonBlock('kangur-game-home-guest-login-button', 'Zaloguj sie', {
                          buttonStyle: 'solid',
                          runtimeActionSource: 'kangur',
                          runtimeActionPath: 'game.navigateToLogin',
                          fontSize: 14,
                          fontWeight: '600',
                          textColor: '#334155',
                          bgColor: '#eef2ff',
                          borderColor: '#dbeafe',
                          borderRadius: 18,
                          borderWidth: 1,
                        }),
                      ],
                    }),
                  ],
                }),
                makeContainerBlock({
                  id: 'kangur-game-home-assignment-spotlight',
                  settings: {
                    paddingTop: 24,
                    paddingBottom: 24,
                    paddingLeft: 24,
                    paddingRight: 24,
                    blockGap: 12,
                    background: { type: 'solid', color: '#ffffff' },
                    sectionBorder: {
                      width: 1,
                      style: 'solid',
                      color: '#eceff7',
                      radius: 28,
                    },
                    sectionShadow: {
                      x: 0,
                      y: 24,
                      blur: 60,
                      spread: 0,
                      color: '#a8afd82e',
                    },
                    ...makeRuntimeVisibilitySettings({
                      mode: 'truthy',
                      path: 'game.homeSpotlight.hasAssignment',
                    }),
                  },
                  blocks: [
                    makeTextBlock(
                      'kangur-game-home-assignment-spotlight-priority',
                      'Priorytet wysoki',
                      {
                        fontSize: 12,
                        fontWeight: '700',
                        letterSpacing: 1.4,
                        textColor: '#f59e0b',
                        connection: {
                          enabled: true,
                          source: 'kangur',
                          path: 'game.homeSpotlight.priorityLabel',
                          fallback: 'Priorytet wysoki',
                        },
                      }
                    ),
                    makeHeadingBlock(
                      'kangur-game-home-assignment-spotlight-title',
                      'Zadanie od rodzica',
                      28,
                      {
                        textColor: '#1e293b',
                        connection: {
                          enabled: true,
                          source: 'kangur',
                          path: 'game.homeSpotlight.title',
                          fallback: 'Zadanie od rodzica',
                        },
                      }
                    ),
                    makeTextBlock(
                      'kangur-game-home-assignment-spotlight-description',
                      'Wroc do zadania i kontynuuj wyzwanie.',
                      {
                        fontSize: 15,
                        textColor: '#64748b',
                        connection: {
                          enabled: true,
                          source: 'kangur',
                          path: 'game.homeSpotlight.description',
                          fallback: 'Wroc do zadania i kontynuuj wyzwanie.',
                        },
                      }
                    ),
                    makeProgressBlock('kangur-game-home-assignment-spotlight-progress', {
                      progressMax: 100,
                      progressHeight: 12,
                      borderRadius: 999,
                      fillColor: '#f59e0b',
                      trackColor: '#fef3c7',
                      showPercentage: 'true',
                      connection: {
                        enabled: true,
                        source: 'kangur',
                        path: 'game.homeSpotlight.progressPercent',
                        fallback: '0',
                      },
                    }),
                    makeTextBlock(
                      'kangur-game-home-assignment-spotlight-progress-label',
                      '0% ukonczono',
                      {
                        fontSize: 14,
                        textColor: '#7a86b0',
                        connection: {
                          enabled: true,
                          source: 'kangur',
                          path: 'game.homeSpotlight.progressLabel',
                          fallback: '0% ukonczono',
                        },
                      }
                    ),
                    makeButtonBlock(
                      'kangur-game-home-assignment-spotlight-button',
                      'Kontynuuj zadanie',
                      {
                        runtimeActionSource: 'kangur',
                        runtimeActionPath: 'game.homeSpotlight.openAssignment',
                        buttonStyle: 'solid',
                        fontSize: 15,
                        fontWeight: '700',
                        textColor: '#ffffff',
                        bgColor: '#f97316',
                        borderColor: '#f97316',
                        borderRadius: 20,
                        borderWidth: 1,
                        connection: {
                          enabled: true,
                          source: 'kangur',
                          path: 'game.homeSpotlight.actionLabel',
                          fallback: 'Kontynuuj zadanie',
                        },
                      }
                    ),
                  ],
                }),
                makeContainerBlock({
                  id: 'kangur-game-home-priority-panel',
                  settings: {
                    paddingTop: 24,
                    paddingBottom: 24,
                    paddingLeft: 24,
                    paddingRight: 24,
                    blockGap: 14,
                    background: { type: 'solid', color: '#ffffff' },
                    sectionBorder: {
                      width: 1,
                      style: 'solid',
                      color: '#eceff7',
                      radius: 28,
                    },
                    sectionShadow: {
                      x: 0,
                      y: 24,
                      blur: 60,
                      spread: 0,
                      color: '#a8afd82e',
                    },
                    ...makeGameUserVisibilitySettings('truthy'),
                  },
                  blocks: [
                    makeContainerBlock({
                      id: 'kangur-game-home-priority-header',
                      settings: {
                        layoutDirection: 'row',
                        wrap: 'wrap',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        blockGap: 10,
                      },
                      blocks: [
                        makeHeadingBlock(
                          'kangur-game-home-priority-title',
                          'Priorytetowe zadania',
                          26,
                          {
                            textColor: '#1e293b',
                          }
                        ),
                        makeTextBlock('kangur-game-home-priority-count', '0 zadan', {
                          fontSize: 14,
                          fontWeight: '700',
                          textColor: '#94a3b8',
                          connection: {
                            enabled: true,
                            source: 'kangur',
                            path: 'game.priorityAssignments.countLabel',
                            fallback: '0 zadan',
                          },
                        }),
                      ],
                    }),
                    makeRepeaterBlock(
                      'kangur-game-home-priority-list',
                      [
                        makeContainerBlock({
                          id: 'kangur-game-home-priority-item',
                          settings: {
                            paddingTop: 18,
                            paddingBottom: 18,
                            paddingLeft: 18,
                            paddingRight: 18,
                            blockGap: 10,
                            background: { type: 'solid', color: '#f8fafc' },
                            sectionBorder: {
                              width: 1,
                              style: 'solid',
                              color: '#e2e8f0',
                              radius: 22,
                            },
                          },
                          blocks: [
                            makeTextBlock(
                              'kangur-game-home-priority-item-priority',
                              'Priorytet wysoki',
                              {
                                fontSize: 12,
                                fontWeight: '700',
                                letterSpacing: 1.2,
                                textColor: '#f59e0b',
                                connection: {
                                  enabled: true,
                                  source: 'item',
                                  path: 'priorityLabel',
                                  fallback: 'Priorytet wysoki',
                                },
                              }
                            ),
                            makeHeadingBlock(
                              'kangur-game-home-priority-item-title',
                              'Zadanie',
                              22,
                              {
                                headingSize: 'small',
                                textColor: '#1e293b',
                                connection: {
                                  enabled: true,
                                  source: 'item',
                                  path: 'title',
                                  fallback: 'Zadanie',
                                },
                              }
                            ),
                            makeTextBlock(
                              'kangur-game-home-priority-item-description',
                              'Opis zadania.',
                              {
                                fontSize: 14,
                                textColor: '#64748b',
                                connection: {
                                  enabled: true,
                                  source: 'item',
                                  path: 'description',
                                  fallback: 'Opis zadania.',
                                },
                              }
                            ),
                            makeProgressBlock('kangur-game-home-priority-item-progress', {
                              progressMax: 100,
                              progressHeight: 10,
                              borderRadius: 999,
                              fillColor: '#6366f1',
                              trackColor: '#dbeafe',
                              showPercentage: 'true',
                              connection: {
                                enabled: true,
                                source: 'item',
                                path: 'progressPercent',
                                fallback: '0',
                              },
                            }),
                            makeTextBlock(
                              'kangur-game-home-priority-item-progress-label',
                              '0% ukonczono',
                              {
                                fontSize: 13,
                                textColor: '#7a86b0',
                                connection: {
                                  enabled: true,
                                  source: 'item',
                                  path: 'progressLabel',
                                  fallback: '0% ukonczono',
                                },
                              }
                            ),
                            makeButtonBlock(
                              'kangur-game-home-priority-item-button',
                              'Kontynuuj zadanie',
                              {
                                runtimeActionSource: 'item',
                                runtimeActionPath: 'openAssignment',
                                buttonStyle: 'solid',
                                fontSize: 14,
                                fontWeight: '700',
                                textColor: '#ffffff',
                                bgColor: '#4f46e5',
                                borderColor: '#4f46e5',
                                borderRadius: 18,
                                borderWidth: 1,
                                connection: {
                                  enabled: true,
                                  source: 'item',
                                  path: 'actionLabel',
                                  fallback: 'Kontynuuj zadanie',
                                },
                              }
                            ),
                          ],
                        }),
                      ],
                      {
                        collectionSource: 'kangur',
                        collectionPath: 'game.priorityAssignments.items',
                        emptyMessage: 'Brak aktywnych zadan od rodzica.',
                        itemLimit: 3,
                        itemsGap: 14,
                        itemGap: 0,
                        itemLayoutDirection: 'column',
                        itemWrap: 'wrap',
                        itemAlignItems: 'stretch',
                        itemJustifyContent: 'start',
                      }
                    ),
                  ],
                }),
              ],
            }),
            makeGridColumn({
              id: 'kangur-game-home-secondary',
              blocks: [
                makeContainerBlock({
                  id: 'kangur-game-home-actions-panel',
                  settings: {
                    paddingTop: 24,
                    paddingBottom: 24,
                    paddingLeft: 24,
                    paddingRight: 24,
                    blockGap: 12,
                    background: { type: 'solid', color: '#ffffff' },
                    sectionBorder: {
                      width: 1,
                      style: 'solid',
                      color: '#eceff7',
                      radius: 28,
                    },
                    sectionShadow: {
                      x: 0,
                      y: 24,
                      blur: 60,
                      spread: 0,
                      color: '#a8afd82e',
                    },
                  },
                  blocks: [
                    makeHeadingBlock('kangur-game-home-actions-heading', 'Co chcesz zrobic?', 26, {
                      textColor: '#1e293b',
                    }),
                    makeTextBlock(
                      'kangur-game-home-actions-copy',
                      'Ten panel jest juz zlozony z blokow CMS. Zmieniaj etykiety, kolejnosc i akcje bez wracania do kodu.',
                      {
                        fontSize: 15,
                        textColor: '#7a86b0',
                      }
                    ),
                    makeButtonBlock('kangur-game-home-lessons-button', 'Lekcje', {
                      runtimeActionSource: 'kangur',
                      runtimeActionPath: 'page.navigateToPage',
                      runtimeActionArgs: 'Lessons',
                      fontSize: 16,
                      fontWeight: '700',
                      textColor: '#334155',
                      bgColor: '#f8fafc',
                      borderColor: '#dbe4f3',
                      borderRadius: 20,
                      borderWidth: 1,
                    }),
                    makeButtonBlock('kangur-game-home-play-button', 'Grajmy!', {
                      runtimeActionSource: 'kangur',
                      runtimeActionPath: 'game.handleStartGame',
                      buttonDisabledSource: 'kangur',
                      buttonDisabledPath: 'game.canStartFromHome',
                      buttonDisabledWhen: 'falsy',
                      fontSize: 16,
                      fontWeight: '700',
                      textColor: '#ffffff',
                      bgColor: '#5b54f3',
                      borderColor: '#5b54f3',
                      borderRadius: 20,
                      borderWidth: 1,
                    }),
                    makeButtonBlock('kangur-game-home-training-button', 'Trening mieszany', {
                      runtimeActionSource: 'kangur',
                      runtimeActionPath: 'game.setScreen',
                      runtimeActionArgs: 'training',
                      buttonDisabledSource: 'kangur',
                      buttonDisabledPath: 'game.canStartFromHome',
                      buttonDisabledWhen: 'falsy',
                      fontSize: 16,
                      fontWeight: '700',
                      textColor: '#0f172a',
                      bgColor: '#dff0ff',
                      borderColor: '#c4dcff',
                      borderRadius: 20,
                      borderWidth: 1,
                    }),
                    makeButtonBlock('kangur-game-home-kangur-button', 'Kangur Matematyczny', {
                      runtimeActionSource: 'kangur',
                      runtimeActionPath: 'game.setScreen',
                      runtimeActionArgs: 'kangur_setup',
                      buttonDisabledSource: 'kangur',
                      buttonDisabledPath: 'game.canStartFromHome',
                      buttonDisabledWhen: 'falsy',
                      fontSize: 16,
                      fontWeight: '700',
                      textColor: '#0f172a',
                      bgColor: '#fff1e8',
                      borderColor: '#ffd8c2',
                      borderRadius: 20,
                      borderWidth: 1,
                    }),
                  ],
                }),
                makeContainerBlock({
                  id: 'kangur-game-home-progress-panel',
                  settings: {
                    paddingTop: 24,
                    paddingBottom: 24,
                    paddingLeft: 24,
                    paddingRight: 24,
                    blockGap: 14,
                    background: { type: 'solid', color: '#ffffff' },
                    sectionBorder: {
                      width: 1,
                      style: 'solid',
                      color: '#eceff7',
                      radius: 28,
                    },
                    sectionShadow: {
                      x: 0,
                      y: 24,
                      blur: 60,
                      spread: 0,
                      color: '#a8afd82e',
                    },
                  },
                  blocks: [
                    makeHeadingBlock('kangur-game-home-progress-title', 'Raczkujacy', 28, {
                      textColor: '#1e293b',
                      connection: {
                        enabled: true,
                        source: 'kangur',
                        path: 'progress.currentLevelTitle',
                        fallback: 'Raczkujacy',
                      },
                    }),
                    makeTextBlock(
                      'kangur-game-home-progress-summary',
                      'Poziom 1 · 0 XP lacznie',
                      {
                        fontSize: 14,
                        textColor: '#7a86b0',
                        connection: {
                          enabled: true,
                          source: 'kangur',
                          path: 'progress.levelSummary',
                          fallback: 'Poziom 1 · 0 XP lacznie',
                        },
                      }
                    ),
                    makeContainerBlock({
                      id: 'kangur-game-home-progress-label-row',
                      settings: {
                        layoutDirection: 'row',
                        wrap: 'wrap',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        blockGap: 12,
                      },
                      blocks: [
                        makeTextBlock('kangur-game-home-progress-current', '0 XP', {
                          fontSize: 12,
                          textColor: '#64748b',
                          connection: {
                            enabled: true,
                            source: 'kangur',
                            path: 'progress.xpIntoLevelLabel',
                            fallback: '0 XP',
                          },
                        }),
                        makeTextBlock(
                          'kangur-game-home-progress-remaining',
                          'Do poziomu 2: 100 XP',
                          {
                            fontSize: 12,
                            textAlign: 'right',
                            textColor: '#64748b',
                            connection: {
                              enabled: true,
                              source: 'kangur',
                              path: 'progress.xpToNextLevelLabel',
                              fallback: 'Do poziomu 2: 100 XP',
                            },
                          }
                        ),
                      ],
                    }),
                    makeProgressBlock('kangur-game-home-progress-bar', {
                      progressMax: 100,
                      progressHeight: 14,
                      borderRadius: 999,
                      fillColor: '#6366f1',
                      trackColor: '#e2e8f0',
                      connection: {
                        enabled: true,
                        source: 'kangur',
                        path: 'progress.levelProgressPercent',
                        fallback: '0',
                      },
                    }),
                    makeContainerBlock({
                      id: 'kangur-game-home-progress-metrics-row',
                      settings: {
                        layoutDirection: 'row',
                        wrap: 'wrap',
                        alignItems: 'stretch',
                        justifyContent: 'space-between',
                        blockGap: 10,
                      },
                      blocks: [
                        makeGameMetricCard({
                          id: 'kangur-game-home-progress-games',
                          label: 'Gier',
                          connectionPath: 'progress.gamesPlayedLabel',
                          fillColor: '#eef2ff',
                        }),
                        makeGameMetricCard({
                          id: 'kangur-game-home-progress-lessons',
                          label: 'Lekcji',
                          connectionPath: 'progress.lessonsCompletedLabel',
                          fillColor: '#f5f3ff',
                        }),
                        makeGameMetricCard({
                          id: 'kangur-game-home-progress-badges',
                          label: 'Odznak',
                          connectionPath: 'progress.badgesUnlockedCountLabel',
                          fillColor: '#fff7ed',
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
      paddingTop: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      paddingRight: 0,
      settings: makeGameScreenVisibilitySettings('home'),
    }),
    makeBlockSection({
      id: 'kangur-game-home-leaderboard',
      blocks: [
        makeGameLeaderboardPanel({
          id: 'kangur-game-home-leaderboard',
          title: 'Najlepsze wyniki',
          description:
            'Ta tablica wynikow jest teraz skladana z blokow CMS. Zmieniaj filtry, teksty i wyglad bez wracania do widgetu.',
        }),
      ],
      paddingTop: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      paddingRight: 0,
      settings: makeGameScreenVisibilitySettings('home'),
    }),
    makeBlockSection({
      id: 'kangur-game-training-setup',
      blocks: [makeGameTrainingSetupPanel({ id: 'kangur-game-training-setup' })],
      paddingTop: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      paddingRight: 0,
      settings: makeGameScreenVisibilitySettings('training'),
    }),
    makeBlockSection({
      id: 'kangur-game-kangur-setup',
      blocks: [makeWidgetBlock('kangur-widget-game-kangur-setup', 'game-kangur-setup')],
      paddingTop: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      paddingRight: 0,
      settings: makeGameScreenVisibilitySettings('kangur_setup'),
    }),
    makeBlockSection({
      id: 'kangur-game-kangur-session',
      blocks: [makeWidgetBlock('kangur-widget-game-kangur-session', 'game-kangur-session')],
      paddingTop: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      paddingRight: 0,
      settings: makeGameScreenVisibilitySettings('kangur'),
    }),
    makeBlockSection({
      id: 'kangur-game-calendar-training',
      blocks: [
        makeWidgetBlock('kangur-widget-game-calendar-training', 'game-calendar-training'),
      ],
      paddingTop: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      paddingRight: 0,
      settings: makeGameScreenVisibilitySettings('calendar_quiz'),
    }),
    makeBlockSection({
      id: 'kangur-game-geometry-training',
      blocks: [
        makeWidgetBlock('kangur-widget-game-geometry-training', 'game-geometry-training'),
      ],
      paddingTop: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      paddingRight: 0,
      settings: makeGameScreenVisibilitySettings('geometry_quiz'),
    }),
    makeBlockSection({
      id: 'kangur-game-operation-selector',
      blocks: [makeGameOperationSelectorPanel({ id: 'kangur-game-operation-selector' })],
      paddingTop: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      paddingRight: 0,
      settings: makeGameScreenVisibilitySettings('operation'),
    }),
    makeBlockSection({
      id: 'kangur-game-question-session',
      blocks: [makeWidgetBlock('kangur-widget-game-question-session', 'game-question-session')],
      paddingTop: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      paddingRight: 0,
      settings: makeGameScreenVisibilitySettings('playing'),
    }),
    makeBlockSection({
      id: 'kangur-game-result-summary',
      blocks: [
        makeContainerBlock({
          id: 'kangur-game-result-shell',
          settings: {
            blockGap: 20,
            alignItems: 'center',
            contentAlignment: 'center',
          },
          blocks: [
            makeContainerBlock({
              id: 'kangur-game-result-assignment-card',
              settings: {
                maxWidth: 720,
                paddingTop: 24,
                paddingBottom: 24,
                paddingLeft: 24,
                paddingRight: 24,
                blockGap: 12,
                background: { type: 'solid', color: '#ffffff' },
                sectionBorder: {
                  width: 1,
                  style: 'solid',
                  color: '#eceff7',
                  radius: 28,
                },
                sectionShadow: {
                  x: 0,
                  y: 22,
                  blur: 54,
                  spread: 0,
                  color: '#8f96c924',
                },
                ...makeRuntimeVisibilitySettings({
                  mode: 'truthy',
                  path: 'game.result.hasAssignment',
                }),
              },
              blocks: [
                makeTextBlock('kangur-game-result-assignment-eyebrow', 'Zadanie od rodzica', {
                  fontSize: 12,
                  fontWeight: '700',
                  letterSpacing: 1.4,
                  textColor: '#f59e0b',
                  connection: {
                    enabled: true,
                    source: 'kangur',
                    path: 'game.result.assignmentEyebrow',
                    fallback: 'Zadanie od rodzica',
                  },
                }),
                makeHeadingBlock(
                  'kangur-game-result-assignment-title',
                  'Priorytetowe zadanie',
                  28,
                  {
                    textColor: '#1e293b',
                    connection: {
                      enabled: true,
                      source: 'kangur',
                      path: 'game.result.assignmentTitle',
                      fallback: 'Priorytetowe zadanie',
                    },
                  }
                ),
                makeTextBlock(
                  'kangur-game-result-assignment-description',
                  'Wroc do zadania i kontynuuj wyzwanie.',
                  {
                    fontSize: 15,
                    textColor: '#64748b',
                    connection: {
                      enabled: true,
                      source: 'kangur',
                      path: 'game.result.assignmentDescription',
                      fallback: 'Wroc do zadania i kontynuuj wyzwanie.',
                    },
                  }
                ),
                makeProgressBlock('kangur-game-result-assignment-progress', {
                  progressMax: 100,
                  progressHeight: 12,
                  borderRadius: 999,
                  fillColor: '#f59e0b',
                  trackColor: '#fef3c7',
                  showPercentage: 'true',
                  connection: {
                    enabled: true,
                    source: 'kangur',
                    path: 'game.result.assignmentProgressPercent',
                    fallback: '0',
                  },
                }),
                makeTextBlock(
                  'kangur-game-result-assignment-progress-label',
                  '0% ukonczono',
                  {
                    fontSize: 14,
                    textColor: '#7a86b0',
                    connection: {
                      enabled: true,
                      source: 'kangur',
                      path: 'game.result.assignmentProgressLabel',
                      fallback: '0% ukonczono',
                    },
                  }
                ),
                makeButtonBlock('kangur-game-result-assignment-button', 'Kontynuuj zadanie', {
                  runtimeActionSource: 'kangur',
                  runtimeActionPath: 'game.result.openAssignment',
                  buttonStyle: 'solid',
                  fontSize: 15,
                  fontWeight: '700',
                  textColor: '#ffffff',
                  bgColor: '#f97316',
                  borderColor: '#f97316',
                  borderRadius: 20,
                  borderWidth: 1,
                  connection: {
                    enabled: true,
                    source: 'kangur',
                    path: 'game.result.assignmentActionLabel',
                    fallback: 'Kontynuuj zadanie',
                  },
                }),
              ],
            }),
            makeContainerBlock({
              id: 'kangur-game-result-card',
              settings: {
                maxWidth: 760,
                paddingTop: 32,
                paddingBottom: 32,
                paddingLeft: 28,
                paddingRight: 28,
                blockGap: 16,
                alignItems: 'center',
                contentAlignment: 'center',
                background: { type: 'solid', color: '#ffffff' },
                sectionBorder: {
                  width: 1,
                  style: 'solid',
                  color: '#eceff7',
                  radius: 32,
                },
                sectionShadow: {
                  x: 0,
                  y: 24,
                  blur: 60,
                  spread: 0,
                  color: '#8f96c929',
                },
              },
              blocks: [
                makeTextBlock('kangur-game-result-stars', '1 / 3 gwiazdki', {
                  fontSize: 14,
                  fontWeight: '700',
                  textAlign: 'center',
                  textColor: '#f59e0b',
                  connection: {
                    enabled: true,
                    source: 'kangur',
                    path: 'game.result.starsLabel',
                    fallback: '1 / 3 gwiazdki',
                  },
                }),
                makeHeadingBlock('kangur-game-result-title', 'Swietna robota, Graczu!', 34, {
                  textColor: '#1e293b',
                  connection: {
                    enabled: true,
                    source: 'kangur',
                    path: 'game.result.title',
                    fallback: 'Swietna robota, Graczu!',
                  },
                }),
                makeTextBlock(
                  'kangur-game-result-message',
                  'Dobra robota! Cwiczenie czyni mistrza.',
                  {
                    fontSize: 17,
                    textAlign: 'center',
                    textColor: '#64748b',
                    connection: {
                      enabled: true,
                      source: 'kangur',
                      path: 'game.result.message',
                      fallback: 'Dobra robota! Cwiczenie czyni mistrza.',
                    },
                  }
                ),
                makeContainerBlock({
                  id: 'kangur-game-result-metrics-row',
                  settings: {
                    layoutDirection: 'row',
                    wrap: 'wrap',
                    alignItems: 'stretch',
                    justifyContent: 'center',
                    blockGap: 10,
                  },
                  blocks: [
                    makeGameMetricCard({
                      id: 'kangur-game-result-score',
                      label: 'Wynik',
                      connectionPath: 'game.result.scoreLabel',
                      fillColor: '#eef2ff',
                    }),
                    makeGameMetricCard({
                      id: 'kangur-game-result-accuracy',
                      label: 'Dokladnosc',
                      connectionPath: 'game.result.accuracyLabel',
                      fillColor: '#ecfeff',
                      textColor: '#0f766e',
                    }),
                    makeGameMetricCard({
                      id: 'kangur-game-result-time',
                      label: 'Czas',
                      connectionPath: 'game.result.timeTakenLabel',
                      fillColor: '#fff7ed',
                      textColor: '#c2410c',
                    }),
                    makeGameMetricCard({
                      id: 'kangur-game-result-topic',
                      label: 'Temat',
                      connectionPath: 'game.result.operationLabel',
                      fillColor: '#f5f3ff',
                      fallback: 'Trening mieszany',
                      textColor: '#6d28d9',
                      valueFontSize: 22,
                    }),
                  ],
                }),
                makeProgressBlock('kangur-game-result-progress', {
                  progressMax: 100,
                  progressHeight: 16,
                  borderRadius: 999,
                  fillColor: '#6366f1',
                  trackColor: '#e2e8f0',
                  showPercentage: 'true',
                  connection: {
                    enabled: true,
                    source: 'kangur',
                    path: 'game.result.percent',
                    fallback: '0',
                  },
                }),
                makeContainerBlock({
                  id: 'kangur-game-result-actions',
                  settings: {
                    layoutDirection: 'row',
                    wrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'center',
                    blockGap: 12,
                  },
                  blocks: [
                    makeButtonBlock('kangur-game-result-restart', 'Zagraj ponownie', {
                      runtimeActionSource: 'kangur',
                      runtimeActionPath: 'game.handleRestart',
                      buttonStyle: 'solid',
                      fontSize: 16,
                      fontWeight: '700',
                      textColor: '#ffffff',
                      bgColor: '#4f46e5',
                      borderColor: '#4f46e5',
                      borderRadius: 22,
                      borderWidth: 1,
                    }),
                    makeButtonBlock('kangur-game-result-home', 'Strona glowna', {
                      runtimeActionSource: 'kangur',
                      runtimeActionPath: 'game.handleHome',
                      buttonStyle: 'outline',
                      fontSize: 16,
                      fontWeight: '700',
                      textColor: '#334155',
                      bgColor: '#ffffff',
                      borderColor: '#cbd5e1',
                      borderRadius: 22,
                      borderWidth: 1,
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
      paddingTop: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      paddingRight: 0,
      settings: makeGameScreenVisibilitySettings('result'),
    }),
    makeBlockSection({
      id: 'kangur-game-result-leaderboard',
      blocks: [
        makeGameLeaderboardPanel({
          id: 'kangur-game-result-leaderboard',
          title: 'Tablica wynikow',
          description:
            'Po zakonczeniu gry nadal mozesz przebudowac ten ranking z poziomu CMS buildera.',
        }),
      ],
      paddingTop: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      paddingRight: 0,
      settings: makeGameScreenVisibilitySettings('result'),
    }),
  ]);

const createDefaultLessonsScreenComponents = (): PageComponentInput[] =>
  withOrders([
    makeBlockSection({
      id: 'kangur-lessons-intro',
      title: 'Lekcje',
      description:
        'Ten ekran jest juz skladany w CMS builderze. Zmieniaj uklad, teksty i rozmieszczenie widgetow bez wracania do kodu strony.',
      blocks: [
        makeWidgetBlock('kangur-widget-lessons-progress', 'player-progress'),
        makeWidgetBlock('kangur-widget-lessons-assignments', 'priority-assignments', {
          title: 'Priorytetowe zadania',
          emptyLabel: 'Brak aktywnych priorytetow.',
          limit: 2,
        }),
      ],
    }),
    makeGridSection({
      id: 'kangur-lessons-workspace',
      rows: [
        makeGridRow({
          id: 'kangur-lessons-workspace-row',
          columns: [
            makeGridColumn({
              id: 'kangur-lessons-column-catalog',
              blocks: [makeWidgetBlock('kangur-widget-lesson-catalog', 'lesson-catalog')],
            }),
            makeGridColumn({
              id: 'kangur-lessons-column-active',
              blocks: [
                makeWidgetBlock('kangur-widget-active-lesson-panel', 'active-lesson-panel'),
              ],
            }),
          ],
        }),
      ],
      paddingTop: 0,
      paddingBottom: 0,
    }),
    makeBlockSection({
      id: 'kangur-lessons-navigation',
      blocks: [makeWidgetBlock('kangur-widget-lesson-navigation', 'lesson-navigation')],
      paddingTop: 0,
    }),
  ]);

const createDefaultLearnerProfileScreenComponents = (): PageComponentInput[] =>
  withOrders([
    makeBlockSection({
      id: 'kangur-profile-hero',
      blocks: [makeWidgetBlock('kangur-widget-profile-hero', 'learner-profile-hero')],
      paddingBottom: 0,
    }),
    makeGridSection({
      id: 'kangur-profile-summary-grid',
      rows: [
        makeGridRow({
          id: 'kangur-profile-summary-row',
          columns: [
            makeGridColumn({
              id: 'kangur-profile-summary-level',
              blocks: [
                makeWidgetBlock(
                  'kangur-widget-profile-level-progress',
                  'learner-profile-level-progress'
                ),
              ],
            }),
            makeGridColumn({
              id: 'kangur-profile-summary-recommendations',
              blocks: [
                makeWidgetBlock(
                  'kangur-widget-profile-recommendations',
                  'learner-profile-recommendations'
                ),
              ],
            }),
          ],
        }),
      ],
      paddingTop: 0,
      paddingBottom: 0,
    }),
    makeBlockSection({
      id: 'kangur-profile-overview',
      blocks: [makeWidgetBlock('kangur-widget-profile-overview', 'learner-profile-overview')],
      paddingTop: 0,
      paddingBottom: 0,
    }),
    makeGridSection({
      id: 'kangur-profile-learning-grid',
      rows: [
        makeGridRow({
          id: 'kangur-profile-learning-row',
          columns: [
            makeGridColumn({
              id: 'kangur-profile-learning-assignments',
              blocks: [
                makeWidgetBlock(
                  'kangur-widget-profile-assignments',
                  'learner-profile-assignments'
                ),
              ],
            }),
            makeGridColumn({
              id: 'kangur-profile-learning-mastery',
              blocks: [
                makeWidgetBlock('kangur-widget-profile-mastery', 'learner-profile-mastery'),
              ],
            }),
          ],
        }),
      ],
      paddingTop: 0,
      paddingBottom: 0,
    }),
    makeBlockSection({
      id: 'kangur-profile-performance',
      blocks: [
        makeWidgetBlock('kangur-widget-profile-performance', 'learner-profile-performance'),
      ],
      paddingTop: 0,
      paddingBottom: 0,
    }),
    makeBlockSection({
      id: 'kangur-profile-sessions',
      blocks: [makeWidgetBlock('kangur-widget-profile-sessions', 'learner-profile-sessions')],
      paddingTop: 0,
    }),
  ]);

const createDefaultParentDashboardScreenComponents = (): PageComponentInput[] =>
  withOrders([
    makeBlockSection({
      id: 'kangur-parent-dashboard-hero',
      blocks: [makeWidgetBlock('kangur-widget-parent-dashboard-hero', 'parent-dashboard-hero')],
      paddingBottom: 0,
    }),
    makeBlockSection({
      id: 'kangur-parent-dashboard-learners',
      blocks: [
        makeWidgetBlock(
          'kangur-widget-parent-dashboard-learners',
          'parent-dashboard-learner-management'
        ),
      ],
      paddingTop: 0,
      paddingBottom: 0,
    }),
    makeGridSection({
      id: 'kangur-parent-dashboard-analytics',
      rows: [
        makeGridRow({
          id: 'kangur-parent-dashboard-analytics-row',
          columns: [
            makeGridColumn({
              id: 'kangur-parent-dashboard-progress-column',
              blocks: [
                makeWidgetBlock(
                  'kangur-widget-parent-dashboard-progress',
                  'parent-dashboard-progress',
                  {
                    displayMode: 'always',
                  }
                ),
              ],
            }),
            makeGridColumn({
              id: 'kangur-parent-dashboard-scores-column',
              blocks: [
                makeWidgetBlock(
                  'kangur-widget-parent-dashboard-scores',
                  'parent-dashboard-scores',
                  {
                    displayMode: 'always',
                  }
                ),
              ],
            }),
          ],
        }),
      ],
      paddingTop: 0,
      paddingBottom: 0,
    }),
    makeBlockSection({
      id: 'kangur-parent-dashboard-assignments',
      blocks: [
        makeWidgetBlock(
          'kangur-widget-parent-dashboard-assignments',
          'parent-dashboard-assignments',
          {
            displayMode: 'always',
          }
        ),
      ],
      paddingTop: 0,
    }),
  ]);

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

export function createDefaultKangurCmsProject(): KangurCmsProject {
  return {
    version: 1,
    screens: {
      Game: {
        key: 'Game',
        name: KANGUR_CMS_SCREEN_LABELS.Game,
        components: createDefaultGameScreenComponents(),
      },
      Lessons: {
        key: 'Lessons',
        name: KANGUR_CMS_SCREEN_LABELS.Lessons,
        components: createDefaultLessonsScreenComponents(),
      },
      LearnerProfile: {
        key: 'LearnerProfile',
        name: KANGUR_CMS_SCREEN_LABELS.LearnerProfile,
        components: createDefaultLearnerProfileScreenComponents(),
      },
      ParentDashboard: {
        key: 'ParentDashboard',
        name: KANGUR_CMS_SCREEN_LABELS.ParentDashboard,
        components: createDefaultParentDashboardScreenComponents(),
      },
    },
  };
}

export function getKangurWidgetLabel(widgetId: string | null | undefined): string {
  if (!widgetId) {
    return 'Kangur Widget';
  }

  return KANGUR_WIDGET_LABELS.get(widgetId as KangurWidgetId) ?? 'Kangur Widget';
}

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

  return upgradeLegacyScreenComponents(result.data);
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
