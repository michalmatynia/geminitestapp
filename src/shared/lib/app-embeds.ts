import type { AppEmbedId } from '@/shared/contracts/app-embeds';
import {
  APP_EMBED_SETTING_KEY as SETTING_KEY,
  DEFAULT_KANGUR_APP_EMBED_ENTRY_PAGE,
} from '@/shared/contracts/app-embeds';

export type { AppEmbedId };

export const APP_EMBED_SETTING_KEY = SETTING_KEY;

export type AppEmbedRenderMode = 'iframe' | 'internal-app';

export type AppEmbedOption = {
  id: AppEmbedId;
  label: string;
  description: string;
  settingsRoute: string;
  renderMode: AppEmbedRenderMode;
};

export const DEFAULT_APP_EMBED_HEIGHT = 420;
export const DEFAULT_APP_EMBED_ID: AppEmbedId = 'chatbot';
export const DEFAULT_APP_EMBED_BASE_PATH = '';
export const DEFAULT_APP_EMBED_ENTRY_PAGE = DEFAULT_KANGUR_APP_EMBED_ENTRY_PAGE;

export const KANGUR_APP_EMBED_ENTRY_PAGE_OPTIONS = [
  { label: 'Home / Game', value: 'Game' },
  { label: 'Lessons', value: 'Lessons' },
  { label: 'Tests', value: 'Tests' },
  { label: 'Learner Profile', value: 'LearnerProfile' },
  { label: 'Parent Dashboard', value: 'ParentDashboard' },
] as const;

export const APP_EMBED_OPTIONS: AppEmbedOption[] = [
  {
    id: 'chatbot',
    label: 'Chatbot',
    description: 'Embed the admin chatbot experience on CMS pages.',
    settingsRoute: '/admin/chatbot',
    renderMode: 'iframe',
  },
  {
    id: 'ai-paths',
    label: 'AI Paths',
    description: 'Surface AI Path runs and outputs inside CMS layouts.',
    settingsRoute: '/admin/ai-paths',
    renderMode: 'iframe',
  },
  {
    id: 'notes',
    label: 'Notes',
    description: 'Show notes lists or pinned notes in a page section.',
    settingsRoute: '/admin/notes',
    renderMode: 'iframe',
  },
  {
    id: 'products',
    label: 'Products',
    description: 'Embed product listings or featured product widgets.',
    settingsRoute: '/admin/products',
    renderMode: 'iframe',
  },
  {
    id: 'kangur',
    label: 'StudiQ',
    description: 'Mount the StudiQ learning app inside CMS pages with CMS zoning around it.',
    settingsRoute: '/admin/kangur/settings',
    renderMode: 'internal-app',
  },
];

const APP_EMBED_OPTIONS_BY_ID = new Map<string, AppEmbedOption>(
  APP_EMBED_OPTIONS.map((option) => [option.id, option])
);

export function getAppEmbedOption(appId: string | null | undefined): AppEmbedOption | null {
  if (typeof appId !== 'string' || appId.trim().length === 0) {
    return null;
  }

  return APP_EMBED_OPTIONS_BY_ID.get(appId) ?? null;
}
