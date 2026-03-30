import { describe, expect, it } from 'vitest';

import {
  buildAppearanceThemeSections,
  buildAppearanceThemeSelectorOptions,
  localizeAppearanceField,
  resolveAppearanceAdminLocale,
} from './appearance.copy';

describe('appearance.copy', () => {
  it('normalizes the appearance admin locale to English, Polish, or Ukrainian', () => {
    expect(resolveAppearanceAdminLocale('pl')).toBe('pl');
    expect(resolveAppearanceAdminLocale('en')).toBe('en');
    expect(resolveAppearanceAdminLocale('uk')).toBe('uk');
    expect(resolveAppearanceAdminLocale('uk-UA')).toBe('uk');
    expect(resolveAppearanceAdminLocale('de')).toBe('en');
  });

  it('builds localized theme sections for the Polish appearance editor', () => {
    const sections = buildAppearanceThemeSections('pl');

    expect(sections[0]).toMatchObject({
      id: 'corePalette',
      title: 'Paleta główna',
      subtitle: 'Kolory marki, tony tekstu i stany informacji zwrotnej w Kangur.',
    });
    expect(sections[0]?.fields[0]).toMatchObject({ label: 'Glowny akcent' });

    const homeActionsSection = sections.find(
      (section) => section.title === 'Przyciski akcji strony głównej'
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

  it('builds Ukrainian section and selector copy for the appearance editor', () => {
    const sections = buildAppearanceThemeSections('uk');

    expect(sections[0]).toMatchObject({
      id: 'corePalette',
      title: 'Основна палітра',
      subtitle: 'Кольори бренду, тони тексту та стани зворотного звʼязку в Kangur.',
    });

    const homeActionsSection = sections.find(
      (section) => section.title === 'Кнопки дій головної сторінки'
    );
    expect(homeActionsSection?.fields[0]).toMatchObject({
      label: 'Уроки Колір тексту',
    });

    const options = buildAppearanceThemeSelectorOptions('uk', []);
    expect(options[0]).toEqual({
      value: 'factory_daily',
      label: 'Денна тема (фабрична)',
    });
    expect(options[8]).toEqual({
      value: 'preset_daily_crystal',
      label: 'Daily Crystal (пресет)',
    });
  });

  it('localizes low-level appearance field labels and helper text for Ukrainian', () => {
    const localizedField = localizeAppearanceField('uk', {
      key: 'pageTextColor',
      label: 'Page Text Override',
      type: 'background',
      placeholder: 'Auto',
      helperText: 'Leave empty to use the Primary Text color.',
    });

    expect(localizedField.label).toBe('Перевизначення тексту сторінки');
    expect(localizedField.placeholder).toBe('Авто');
    expect(localizedField.helperText).toBe(
      'Залиште порожнім, щоб використати колір основного тексту.'
    );
  });
});
