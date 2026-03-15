import { describe, expect, it } from 'vitest';

import {
  buildKangurLessonDocumentNarrationScript,
  buildKangurLessonNarrationScriptFromText,
  hasKangurLessonNarrationContent,
  normalizeKangurLessonNarrationText,
} from './script';

describe('kangur tts script builder', () => {
  it('builds ordered narration from lesson documents', () => {
    const script = buildKangurLessonDocumentNarrationScript({
      lessonId: 'geometry-shapes',
      title: 'Figury geometryczne',
      description: 'Poznaj figury krok po kroku.',
      document: {
        version: 1,
        pages: [
          {
            id: 'page-1',
            sectionKey: 'shapes',
            sectionTitle: 'Figury podstawowe',
            sectionDescription: 'Najpierw poznaj podstawowe figury.',
            title: 'Wprowadzenie',
            description: 'Pierwsza strona lekcji.',
            blocks: [
              {
                id: 'text-1',
                type: 'text',
                html: '<h2>Kwadrat</h2><p>Kwadrat ma cztery równe boki.</p>',
                align: 'left',
              },
              {
                id: 'image-1',
                type: 'image',
                title: 'Zdjecie kwadratu',
                caption: 'Fotografia placu w ksztalcie kwadratu.',
                src: '/uploads/kangur/square.png',
                align: 'center',
                fit: 'contain',
                maxWidth: 420,
              },
              {
                id: 'svg-1',
                type: 'svg',
                title: 'Przykład kwadratu',
                markup: '<svg viewBox="0 0 100 100"></svg>',
                viewBox: '0 0 100 100',
                align: 'center',
                fit: 'contain',
                maxWidth: 420,
              },
              {
                id: 'grid-1',
                type: 'grid',
                columns: 2,
                gap: 16,
                rowHeight: 220,
                denseFill: false,
                stackOnMobile: true,
                items: [
                  {
                    id: 'grid-item-1',
                    colSpan: 1,
                    rowSpan: 1,
                    columnStart: null,
                    rowStart: null,
                    block: {
                      id: 'text-2',
                      type: 'text',
                      html: '<p>Trojkat ma trzy boki.</p>',
                      align: 'left',
                    },
                  },
                ],
              },
              {
                id: 'activity-1',
                type: 'activity',
                activityId: 'clock-training',
                title: 'Ćwiczenie z zegarem',
                description: 'Przećwicz odczytywanie godzin i minut.',
              },
            ],
          },
        ],
        blocks: [
          {
            id: 'text-1',
            type: 'text',
            html: '<h2>Kwadrat</h2><p>Kwadrat ma cztery równe boki.</p>',
            align: 'left',
          },
          {
            id: 'image-1',
            type: 'image',
            title: 'Zdjecie kwadratu',
            caption: 'Fotografia placu w ksztalcie kwadratu.',
            src: '/uploads/kangur/square.png',
            align: 'center',
            fit: 'contain',
            maxWidth: 420,
          },
          {
            id: 'svg-1',
            type: 'svg',
            title: 'Przykład kwadratu',
            markup: '<svg viewBox="0 0 100 100"></svg>',
            viewBox: '0 0 100 100',
            align: 'center',
            fit: 'contain',
            maxWidth: 420,
          },
          {
            id: 'grid-1',
            type: 'grid',
            columns: 2,
            gap: 16,
            rowHeight: 220,
            denseFill: false,
            stackOnMobile: true,
            items: [
              {
                id: 'grid-item-1',
                colSpan: 1,
                rowSpan: 1,
                columnStart: null,
                rowStart: null,
                block: {
                  id: 'text-2',
                  type: 'text',
                  html: '<p>Trojkat ma trzy boki.</p>',
                  align: 'left',
                },
              },
            ],
          },
          {
            id: 'activity-1',
            type: 'activity',
            activityId: 'clock-training',
            title: 'Ćwiczenie z zegarem',
            description: 'Przećwicz odczytywanie godzin i minut.',
          },
        ],
      },
    });

    expect(script.lessonId).toBe('geometry-shapes');
    expect(script.locale).toBe('pl-PL');
    expect(script.segments[0]?.text).toContain('Figury geometryczne');
    expect(script.segments.map((segment) => segment.text).join(' ')).toContain('Wprowadzenie');
    expect(script.segments.map((segment) => segment.text).join(' ')).toContain('Figury podstawowe');
    expect(script.segments.map((segment) => segment.text).join(' ')).toContain(
      'Kwadrat ma cztery równe boki.'
    );
    expect(script.segments.map((segment) => segment.text).join(' ')).toContain(
      'Fotografia placu w ksztalcie kwadratu.'
    );
    expect(script.segments.map((segment) => segment.text).join(' ')).toContain(
      'Ilustracja. Przykład kwadratu.'
    );
    expect(script.segments.map((segment) => segment.text).join(' ')).toContain(
      'Trojkat ma trzy boki.'
    );
    expect(script.segments.map((segment) => segment.text).join(' ')).toContain(
      'Przećwicz odczytywanie godzin i minut.'
    );
  });

  it('prefers explicit narration overrides over rendered block content', () => {
    const script = buildKangurLessonDocumentNarrationScript({
      lessonId: 'geometry-advanced',
      title: 'Figury z opisem lektora',
      document: {
        version: 1,
        narration: {
          voice: 'sage',
          locale: 'en-US',
        },
        blocks: [
          {
            id: 'text-1',
            type: 'text',
            html: '<p>Widoczny tekst dla ucznia.</p>',
            ttsText: 'Czytaj ten tekst inaczej.',
            align: 'left',
          },
          {
            id: 'svg-1',
            type: 'svg',
            title: 'Widoczny tytuł ilustracji',
            ttsDescription: 'To jest opis narracyjny ilustracji.',
            markup: '<svg viewBox="0 0 100 100"></svg>',
            viewBox: '0 0 100 100',
            align: 'center',
            fit: 'contain',
            maxWidth: 420,
          },
        ],
      },
    });

    const spokenText = script.segments.map((segment) => segment.text).join(' ');
    expect(script.locale).toBe('en-US');
    expect(spokenText).toContain('Czytaj ten tekst inaczej.');
    expect(spokenText).toContain('To jest opis narracyjny ilustracji.');
    expect(spokenText).not.toContain('Widoczny tekst dla ucznia.');
    expect(spokenText).not.toContain('Ilustracja. Widoczny tytuł ilustracji.');
  });

  it('chunks long raw text into multiple narration segments', () => {
    const longText = Array.from(
      { length: 120 },
      (_, index) =>
        `Zdanie numer ${index + 1}. To jest dłuższe wyjaśnienie pomagające dziecku zrozumieć temat.`
    ).join(' ');
    const script = buildKangurLessonNarrationScriptFromText({
      lessonId: 'clock',
      title: 'Nauka zegara',
      description: 'Czytamy godziny i minuty.',
      text: longText,
    });

    expect(script.segments.length).toBeGreaterThan(1);
    expect(hasKangurLessonNarrationContent(script)).toBe(true);
    expect(script.segments.every((segment) => segment.text.length <= 900)).toBe(true);
  });

  it('normalizes whitespace without losing paragraph boundaries', () => {
    expect(normalizeKangurLessonNarrationText('  Pierwsza linia \n\n\n  Druga   linia  ')).toBe(
      'Pierwsza linia\n\nDruga linia'
    );
  });
});
