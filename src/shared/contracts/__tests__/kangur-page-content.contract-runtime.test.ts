import { describe, expect, it } from 'vitest';

import {
  mergeKangurPageContentStore,
  parseKangurPageContentStore,
} from '@/shared/contracts/kangur-page-content';

describe('kangur page content contract', () => {
  it('merges existing Mongo entries with seeded defaults without dropping custom records', () => {
    const defaults = parseKangurPageContentStore({
      locale: 'pl',
      version: 1,
      entries: [
        {
          id: 'lesson-library',
          pageKey: 'Lessons',
          screenKey: 'list',
          surface: 'lesson',
          route: '/lessons',
          componentId: 'lesson-library',
          widget: 'KangurLessonsCatalogWidget',
          sourcePath: 'src/features/kangur/ui/pages/Lessons.tsx',
          title: 'Biblioteka lekcji',
          summary: 'Domyslny opis biblioteki lekcji.',
          body: 'Domyslna tresc biblioteki lekcji.',
          anchorIdPrefix: 'kangur-lessons-library',
          focusKind: 'library',
          contentIdPrefixes: ['lesson:list'],
          nativeGuideIds: ['lesson-library'],
          triggerPhrases: ['biblioteka lekcji'],
          tags: ['page-content', 'lessons'],
          enabled: true,
          sortOrder: 10,
        },
      ],
    });

    const merged = mergeKangurPageContentStore(defaults, {
      locale: 'pl',
      version: 1,
      entries: [
        {
          id: 'lesson-library',
          pageKey: 'Lessons',
          screenKey: 'list',
          surface: 'lesson',
          route: '/lessons',
          componentId: 'lesson-library',
          widget: 'KangurLessonsCatalogWidget',
          sourcePath: 'src/features/kangur/ui/pages/Lessons.tsx',
          title: 'Biblioteka lekcji',
          summary: 'Wlasny opis zapisany w Mongo.',
          body: 'Wlasna tresc zapisna w Mongo.',
          anchorIdPrefix: 'kangur-lessons-library',
          focusKind: 'library',
          contentIdPrefixes: ['lesson:list:custom'],
          nativeGuideIds: ['lesson-library-custom'],
          triggerPhrases: ['wlasna biblioteka'],
          fragments: [
            {
              id: 'lesson-library-priority',
              text: 'Najwyzszy priorytet',
              aliases: ['Priorytet'],
              explanation: 'To etykieta wskazujaca lekcje, od ktorej najlepiej zaczac.',
              nativeGuideIds: ['lesson-library-custom'],
              triggerPhrases: ['priorytet'],
              enabled: true,
              sortOrder: 10,
            },
          ],
          tags: ['custom-tag'],
          enabled: true,
          sortOrder: 10,
        },
        {
          id: 'custom-extra',
          pageKey: 'Game',
          screenKey: 'home',
          surface: 'game',
          route: '/game',
          componentId: 'custom-extra',
          widget: 'CustomWidget',
          sourcePath: 'src/features/kangur/ui/pages/Game.tsx',
          title: 'Dodatkowa sekcja',
          summary: 'Dodatkowa sekcja spoza seedu.',
          body: 'Pelna tresc dodatkowej sekcji.',
          anchorIdPrefix: 'custom-extra',
          focusKind: 'screen',
          contentIdPrefixes: [],
          nativeGuideIds: [],
          triggerPhrases: ['dodatkowa sekcja'],
          tags: ['custom'],
          enabled: true,
          sortOrder: 999,
        },
      ],
    });

    const lessonLibrary = merged.entries.find((entry) => entry.id === 'lesson-library');

    expect(merged.version).toBe(1);
    expect(lessonLibrary?.summary).toBe('Wlasny opis zapisany w Mongo.');
    expect(lessonLibrary?.body).toBe('Wlasna tresc zapisna w Mongo.');
    expect(lessonLibrary?.contentIdPrefixes).toEqual(['lesson:list', 'lesson:list:custom']);
    expect(lessonLibrary?.nativeGuideIds).toEqual(['lesson-library', 'lesson-library-custom']);
    expect(lessonLibrary?.fragments).toEqual([
      {
        id: 'lesson-library-priority',
        text: 'Najwyzszy priorytet',
        aliases: ['Priorytet'],
        explanation: 'To etykieta wskazujaca lekcje, od ktorej najlepiej zaczac.',
        nativeGuideIds: ['lesson-library-custom'],
        triggerPhrases: ['priorytet'],
        enabled: true,
        sortOrder: 10,
      },
    ]);
    expect(lessonLibrary?.tags).toEqual(['page-content', 'lessons', 'custom-tag']);
    expect(merged.entries.some((entry) => entry.id === 'custom-extra')).toBe(true);
  });

  it('rejects duplicate page-content ids', () => {
    expect(() =>
      parseKangurPageContentStore({
        locale: 'pl',
        version: 1,
        entries: [
          {
            id: 'game-home-actions',
            pageKey: 'Game',
            screenKey: 'home',
            surface: 'game',
            route: '/game',
            componentId: 'home-actions',
            widget: 'KangurGameHomeActionsWidget',
            sourcePath: 'src/features/kangur/ui/pages/Game.tsx',
            title: 'Szybkie akcje',
            summary: 'Sekcja szybkich akcji.',
            body: 'Pelny opis sekcji szybkich akcji.',
            anchorIdPrefix: 'kangur-game-home-actions',
            focusKind: 'home_actions',
            contentIdPrefixes: ['game:home'],
            nativeGuideIds: ['shared-home-actions'],
            triggerPhrases: ['szybkie akcje'],
            tags: ['page-content'],
            enabled: true,
            sortOrder: 10,
          },
          {
            id: 'game-home-actions',
            pageKey: 'Game',
            screenKey: 'home',
            surface: 'game',
            route: '/game',
            componentId: 'home-actions-copy',
            widget: 'KangurGameHomeActionsWidget',
            sourcePath: 'src/features/kangur/ui/pages/Game.tsx',
            title: 'Szybkie akcje kopia',
            summary: 'Duplikat sekcji szybkich akcji.',
            body: 'Pelny opis duplikatu sekcji szybkich akcji.',
            anchorIdPrefix: 'kangur-game-home-actions-copy',
            focusKind: 'home_actions',
            contentIdPrefixes: ['game:home'],
            nativeGuideIds: ['shared-home-actions'],
            triggerPhrases: ['akcje'],
            tags: ['page-content'],
            enabled: true,
            sortOrder: 20,
          },
        ],
      })
    ).toThrow('Duplicate page-content ids are not allowed');
  });
});
