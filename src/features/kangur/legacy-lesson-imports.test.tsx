/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const loadImporter = async () =>
  (await import('@/features/kangur/legacy-lesson-imports')).importLegacyKangurLessonDocument;

describe('importLegacyKangurLessonDocument', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('imports sectioned lessons into modular pages and preserves game sections as activity blocks', async () => {
    const importLegacyKangurLessonDocument = await loadImporter();
    const result = importLegacyKangurLessonDocument('adding');

    expect(result).not.toBeNull();
    expect(result?.importedPageCount).toBe(result?.document.pages?.length);
    expect(result?.importedPageCount).toBeGreaterThan(0);
    expect(result?.warnings).toEqual([]);
    expect(result?.document.pages?.[0]?.title).toBe('Overview');
    expect(result?.document.pages?.some((page) => page.title === 'Co to znaczy dodawać?')).toBe(
      true
    );
    expect(result?.document.pages?.some((page) => page.title === 'Gra z piłkami')).toBe(true);
    expect(result?.document.pages?.some((page) => page.title === 'Synteza dodawania')).toBe(true);
    expect(
      result?.document.pages?.find((page) => page.title === 'Co to znaczy dodawać?')?.sectionTitle
    ).toBe('Podstawy dodawania');
    expect(
      result?.document.pages?.find((page) => page.title === 'Co to znaczy dodawać?')
        ?.sectionDescription
    ).toBe('Co to dodawanie? Jednocyfrowe + animacja');
    expect(
      result?.document.pages?.find((page) => page.title === 'Gra z piłkami')?.blocks[0]
    ).toMatchObject({
      type: 'activity',
      activityId: 'adding-ball',
    });
    expect(
      result?.document.pages?.find((page) => page.title === 'Synteza dodawania')?.blocks[0]
    ).toMatchObject({
      type: 'activity',
      activityId: 'adding-synthesis',
    });
    expect(result?.document.pages?.[0]?.blocks[0]).toMatchObject({
      type: 'text',
      align: 'center',
    });
  });

  it('imports flat-slide lessons with an overview page and no warnings', async () => {
    const importLegacyKangurLessonDocument = await loadImporter();
    const result = importLegacyKangurLessonDocument('logical_thinking');

    expect(result).not.toBeNull();
    expect(result?.warnings).toEqual([]);
    expect(result?.document.pages?.[0]?.title).toBe('Overview');
    expect(result?.document.pages?.[1]?.title).toBe('Co to jest myślenie logiczne? 🧠');
    expect(result?.document.pages?.[1]?.blocks[0]).toMatchObject({
      type: 'text',
    });
  });

  it('preserves narration settings when importing the clock lesson', async () => {
    const importLegacyKangurLessonDocument = await loadImporter();
    const result = importLegacyKangurLessonDocument('clock', {
      narration: {
        voice: 'echo',
        locale: 'pl-PL',
      },
    });

    expect(result).not.toBeNull();
    expect(result?.warnings).toEqual([]);
    expect(result?.document.narration).toEqual({
      voice: 'echo',
      locale: 'pl-PL',
    });
    expect(result?.document.pages?.some((page) => page.title === 'Ćwiczenie z zegarem')).toBe(true);
    expect(
      result?.document.pages?.find((page) => page.title === 'Ćwiczenie z zegarem')?.blocks[0]
    ).toMatchObject({
      type: 'activity',
      activityId: 'clock-training',
    });
    expect(
      result?.document.pages?.some((page) => page.title === 'Co pokazuje krótka wskazówka?')
    ).toBe(true);
  });
});
