'use client';

import type { BlockDefinition } from '@/features/cms/types/page-builder';
import {
  DEFAULT_APP_EMBED_BASE_PATH,
  DEFAULT_APP_EMBED_ENTRY_PAGE,
  DEFAULT_APP_EMBED_HEIGHT,
  DEFAULT_APP_EMBED_ID,
  KANGUR_APP_EMBED_ENTRY_PAGE_OPTIONS,
} from '@/shared/lib/app-embeds';
import { KANGUR_WIDGET_OPTIONS } from '@/features/kangur/public';
import {
  KANGUR_WIDGET_DISPLAY_OPTIONS,
  KANGUR_WIDGET_GAME_SCREEN_OPTIONS,
} from './media-constants';

const resolvedKangurWidgetOptions = Array.isArray(KANGUR_WIDGET_OPTIONS)
  ? KANGUR_WIDGET_OPTIONS
  : [];

export const EMBEDDED_BLOCK_DEFINITIONS: Record<string, BlockDefinition> = {
  IframeElement: {
    type: 'IframeElement',
    label: 'Embed (iframe)',
    icon: 'CodeIcon',
    defaultSettings: { src: '', height: 400, width: 100, border: false },
    settingsSchema: [
      { key: 'src', label: 'Iframe source URL', type: 'text' },
      { key: 'height', label: 'Height (px)', type: 'number', defaultValue: 400 },
      { key: 'width', label: 'Width (%)', type: 'range', defaultValue: 100, min: 10, max: 100 },
      { key: 'border', label: 'Show border', type: 'checkbox', defaultValue: false },
    ],
  },
  AppEmbed: {
    type: 'AppEmbed',
    label: 'App embed',
    icon: 'LayoutGrid',
    defaultSettings: {
      embedId: DEFAULT_APP_EMBED_ID,
      entryPage: DEFAULT_APP_EMBED_ENTRY_PAGE,
      basePath: DEFAULT_APP_EMBED_BASE_PATH,
      height: DEFAULT_APP_EMBED_HEIGHT,
      width: 100,
      transparent: false,
    },
    settingsSchema: [
      { key: 'embedId', label: 'App ID', type: 'text', defaultValue: DEFAULT_APP_EMBED_ID },
      {
        key: 'entryPage',
        label: 'Entry page',
        type: 'select',
        options: KANGUR_APP_EMBED_ENTRY_PAGE_OPTIONS,
        defaultValue: DEFAULT_APP_EMBED_ENTRY_PAGE,
      },
      { key: 'basePath', label: 'Base path', type: 'text', defaultValue: DEFAULT_APP_EMBED_BASE_PATH },
      { key: 'height', label: 'Height (px)', type: 'number', defaultValue: DEFAULT_APP_EMBED_HEIGHT },
      { key: 'width', label: 'Width (%)', type: 'range', defaultValue: 100, min: 10, max: 100 },
      { key: 'transparent', label: 'Transparent background', type: 'checkbox', defaultValue: false },
    ],
  },
  KangurWidget: {
    type: 'KangurWidget',
    label: 'Kangur widget',
    icon: 'LayoutGrid',
    defaultSettings: {
      widgetId: 'learner-profile',
      displayMode: 'always',
      activeDashboardTab: 'progress',
      showIfGuest: true,
      gameScreen: 'always',
      height: 0,
    },
    settingsSchema: [
      {
        key: 'widgetId',
        label: 'Widget type',
        type: 'select',
        options: resolvedKangurWidgetOptions,
        defaultValue: 'learner-profile',
      },
      {
        key: 'displayMode',
        label: 'Display mode',
        type: 'select',
        options: KANGUR_WIDGET_DISPLAY_OPTIONS,
        defaultValue: 'always',
      },
      {
        key: 'gameScreen',
        label: 'Active game screen',
        type: 'select',
        options: KANGUR_WIDGET_GAME_SCREEN_OPTIONS,
        defaultValue: 'always',
      },
      { key: 'height', label: 'Custom min-height (px)', type: 'number', defaultValue: 0 },
      { key: 'showIfGuest', label: 'Show for guests', type: 'checkbox', defaultValue: true },
    ],
  },
};
