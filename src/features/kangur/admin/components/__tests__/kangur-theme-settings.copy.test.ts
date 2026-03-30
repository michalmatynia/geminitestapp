import { describe, expect, it } from 'vitest';

import {
  buildKangurThemeFontWeightOptions,
  buildKangurThemeHomeActionFields,
  getKangurThemeModeCopy,
  getKangurThemePanelCopy,
  getKangurThemeSectionCopy,
  localizeKangurThemeField,
  mapKangurThemeSectionToPreviewSection,
  resolveKangurThemeSettingsLocale,
} from '../kangur-theme-settings.copy';

describe('kangur theme settings copy', () => {
  it('resolves Polish and Ukrainian locales explicitly and falls back to English otherwise', () => {
    expect(resolveKangurThemeSettingsLocale('pl')).toBe('pl');
    expect(resolveKangurThemeSettingsLocale('en')).toBe('en');
    expect(resolveKangurThemeSettingsLocale('uk')).toBe('uk');
    expect(resolveKangurThemeSettingsLocale('uk-UA')).toBe('uk');
    expect(resolveKangurThemeSettingsLocale('de')).toBe('en');
  });

  it('returns localized section, mode, and panel chrome copy', () => {
    expect(getKangurThemeSectionCopy('en', 'corePalette').title).toBe('Core Palette');
    expect(getKangurThemeSectionCopy('pl', 'corePalette').title).toBe('Paleta główna');
    expect(getKangurThemeModeCopy('en', 'daily').label).toBe('Daily theme');
    expect(getKangurThemeModeCopy('pl', 'daily').label).toBe('Motyw dzienny');
    expect(getKangurThemePanelCopy('pl').autosaveTitle).toBe('Automatyczny zapis');
  });

  it('maps non-preview editor sections onto the buttons preview and localizes generated controls', () => {
    expect(mapKangurThemeSectionToPreviewSection('buttonShadows')).toBe('buttons');
    expect(mapKangurThemeSectionToPreviewSection('gelEffects')).toBe('buttons');

    const enWeights = buildKangurThemeFontWeightOptions('en');
    const plWeights = buildKangurThemeFontWeightOptions('pl');
    expect(enWeights[0]?.label).toBe('Light (300)');
    expect(plWeights[0]?.label).toBe('Lekki (300)');

    const plHomeActionFields = buildKangurThemeHomeActionFields('pl');
    expect(plHomeActionFields[0]?.label).toBe('Lekcje Kolor tekstu');
  });

  it('localizes low-level field labels and helper text for Polish', () => {
    const localizedField = localizeKangurThemeField('pl', {
      key: 'pageTextColor',
      label: 'Page Text Override',
      type: 'background',
      placeholder: 'Auto',
      helperText: 'Leave empty to use the Primary Text color.',
    });

    expect(localizedField.label).toBe('Nadpisanie tekstu strony');
    expect(localizedField.placeholder).toBe('Auto');
    expect(localizedField.helperText).toBe(
      'Zostaw puste, aby uzyc koloru glownego tekstu.'
    );
  });

  it('returns Ukrainian section, mode, panel, and home-action copy', () => {
    expect(getKangurThemeSectionCopy('uk', 'corePalette').title).toBe('Основна палітра');
    expect(getKangurThemeModeCopy('uk', 'daily').label).toBe('Денна тема');
    expect(getKangurThemePanelCopy('uk').autosaveTitle).toBe('Автозбереження');

    const ukWeights = buildKangurThemeFontWeightOptions('uk');
    expect(ukWeights[0]?.label).toBe('Легка (300)');

    const ukHomeActionFields = buildKangurThemeHomeActionFields('uk');
    expect(ukHomeActionFields[0]?.label).toBe('Уроки Колір тексту');
  });

  it('localizes low-level field labels and helper text for Ukrainian', () => {
    const localizedField = localizeKangurThemeField('uk', {
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
