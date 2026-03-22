import { describe, expect, it } from 'vitest';

import {
  APP_EMBED_OPTIONS,
  APP_EMBED_SETTING_KEY,
  DEFAULT_APP_EMBED_ENTRY_PAGE,
  DEFAULT_APP_EMBED_HEIGHT,
  DEFAULT_APP_EMBED_ID,
  KANGUR_APP_EMBED_ENTRY_PAGE_OPTIONS,
  getAppEmbedOption,
} from './app-embeds';

describe('app-embeds', () => {
  it('exposes the expected defaults and Kangur entry-page options', () => {
    expect(APP_EMBED_SETTING_KEY).toBe('cms_app_embeds');
    expect(DEFAULT_APP_EMBED_ID).toBe('chatbot');
    expect(DEFAULT_APP_EMBED_HEIGHT).toBe(420);
    expect(DEFAULT_APP_EMBED_ENTRY_PAGE).toBe('Game');
    expect(KANGUR_APP_EMBED_ENTRY_PAGE_OPTIONS).toEqual([
      { label: 'Home / Game', value: 'Game' },
      { label: 'Lessons', value: 'Lessons' },
      { label: 'Tests', value: 'Tests' },
      { label: 'Learner Profile', value: 'LearnerProfile' },
      { label: 'Parent Dashboard', value: 'ParentDashboard' },
    ]);
  });

  it('returns known embed options and treats unknown ids as missing', () => {
    expect(getAppEmbedOption('chatbot')).toEqual(
      expect.objectContaining({
        label: 'Chatbot',
        renderMode: 'iframe',
      }),
    );
    expect(getAppEmbedOption('kangur')).toEqual(
      expect.objectContaining({
        label: 'StudiQ',
        settingsRoute: '/admin/kangur/settings',
        renderMode: 'internal-app',
      }),
    );
    expect(getAppEmbedOption(' chatbot ')).toBeNull();
    expect(getAppEmbedOption('missing-app')).toBeNull();
    expect(getAppEmbedOption(null)).toBeNull();
    expect(getAppEmbedOption(undefined)).toBeNull();
  });

  it('keeps the published app options in sync with the lookup map', () => {
    expect(APP_EMBED_OPTIONS.map((option) => option.id)).toEqual([
      'chatbot',
      'ai-paths',
      'notes',
      'products',
      'kangur',
    ]);
    expect(
      APP_EMBED_OPTIONS.every((option) => getAppEmbedOption(option.id)?.id === option.id),
    ).toBe(true);
  });
});
