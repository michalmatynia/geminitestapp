import { describe, expect, it } from 'vitest';

import { buildDefaultKangurPageContentStore } from '@/features/kangur/page-content-catalog';

const getEntry = (locale: string, id: string) => {
  const entry = buildDefaultKangurPageContentStore(locale).entries.find((candidate) => candidate.id === id);
  expect(entry).toBeTruthy();
  return entry!;
};

describe('page-content-catalog', () => {
  it('returns English UI-facing page content copy for the English locale', () => {
    const entry = getEntry('en', 'learner-profile-overview');

    expect(entry.title).toBe('Results overview');
    expect(entry.summary).toBe(
      'The key signals of the day: accuracy, quest, goal, and badges in one view.'
    );
  });

  it('returns German UI-facing page content copy for the German locale', () => {
    const entry = getEntry('de', 'learner-profile-overview');

    expect(entry.title).toBe('Ergebnisuebersicht');
    expect(entry.summary).toBe(
      'Die wichtigsten Signale des Tages: Genauigkeit, Mission, Ziel und Abzeichen in einer Ansicht.'
    );
  });

  it('keeps Polish page content copy for the Polish locale', () => {
    const entry = getEntry('pl', 'learner-profile-overview');

    expect(entry.title).toBe('Przegląd wyników');
    expect(entry.summary).toBe(
      'Najważniejsze wskaźniki dnia: skuteczność, misja, cel i odznaki w jednym widoku.'
    );
  });

  it('returns the started Ukrainian page-content translation while keeping catalog fallbacks', () => {
    const entry = getEntry('uk', 'learner-profile-overview');

    expect(entry.title).toBe('Огляд результатів');
    expect(entry.summary).toBe('Головні сигнали дня: точність, місія, ціль і значки в одному місці.');
  });

  it('builds English lesson-library fragments from localized lesson catalog defaults', () => {
    const entry = getEntry('en', 'lessons-library');
    const additionFragment = entry.fragments.find((fragment) => fragment.id === 'lesson:adding');

    expect(additionFragment).toBeTruthy();
    expect(additionFragment?.text).toBe('Addition');
    expect(additionFragment?.explanation).toBe('Single-digit, double-digit, and a ball game.');
    expect(additionFragment?.triggerPhrases).toContain('Addition');
    expect(additionFragment?.triggerPhrases).not.toContain('Dodawanie');
  });

  it('builds German lesson-library fragments from localized lesson catalog defaults', () => {
    const entry = getEntry('de', 'lessons-library');
    const clockFragment = entry.fragments.find((fragment) => fragment.id === 'lesson:clock');

    expect(clockFragment).toBeTruthy();
    expect(clockFragment?.text).toBe('Uhr');
    expect(clockFragment?.explanation).toBe('Stunden, Minuten und volle Uhrzeit auf einer analogen Uhr.');
    expect(clockFragment?.triggerPhrases).toContain('Uhr');
    expect(clockFragment?.triggerPhrases).not.toContain('Nauka zegara');
  });
});
