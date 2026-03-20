import { describe, expect, it } from 'vitest';

import {
  buildAppearanceThemeSections,
  buildAppearanceThemeSelectorOptions,
  resolveAppearanceAdminLocale,
} from './appearance.copy';

describe('appearance.copy', () => {
  it('normalizes the appearance admin locale to English or Polish', () => {
    expect(resolveAppearanceAdminLocale('pl')).toBe('pl');
    expect(resolveAppearanceAdminLocale('en')).toBe('en');
    expect(resolveAppearanceAdminLocale('de')).toBe('en');
  });

  it('builds localized theme sections for the Polish appearance editor', () => {
    const sections = buildAppearanceThemeSections('pl');

    expect(sections[0]).toMatchObject({
      id: 'corePalette',
      title: 'Paleta glowna',
      subtitle: 'Kolory marki, tony tekstu i stany informacji zwrotnej w Kangur.',
    });
    expect(sections[0]?.fields[0]).toMatchObject({ label: 'Glowny akcent' });

    const homeActionsSection = sections.find(
      (section) => section.title === 'Przyciski akcji strony glownej'
    );
    expect(homeActionsSection?.fields[0]).toMatchObject({
      label: 'Lekcje Kolor tekstu',
    });
  });

  it('builds English selector options for built-in and factory themes', () => {
    const options = buildAppearanceThemeSelectorOptions('en', []);

    expect(options[0]).toEqual({
      value: 'factory_daily',
      label: 'Day theme (factory)',
    });
    expect(options[4]).toEqual({
      value: 'builtin_daily',
      label: 'Day theme (built-in)',
    });
  });
});
