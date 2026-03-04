import { describe, expect, it } from 'vitest';

import {
  parseColorSchemeFromText,
  parseColorSchemePayload,
} from '@/features/cms/components/page-builder/theme/theme-utils';

describe('theme-utils parseColorSchemePayload', () => {
  it('accepts canonical color-scheme payload shape', () => {
    const parsed = parseColorSchemePayload({
      name: 'Midnight',
      colors: {
        background: '#0b1020',
        surface: '#121b33',
        text: '#e5e7eb',
        accent: '#22d3ee',
        border: '#334155',
      },
    });

    expect(parsed).toEqual({
      name: 'Midnight',
      colors: {
        background: '#0b1020',
        surface: '#121b33',
        text: '#e5e7eb',
        accent: '#22d3ee',
        border: '#334155',
      },
    });
  });

  it('rejects legacy alias payload shape', () => {
    const parsed = parseColorSchemePayload({
      schemeName: 'Legacy Midnight',
      palette: {
        bg: '#000000',
        layer: '#111111',
        foreground: '#f8fafc',
        primary: '#38bdf8',
        outline: '#1e293b',
      },
    });

    expect(parsed).toBeNull();
  });

  it('parses canonical json payload from text', () => {
    const parsed = parseColorSchemeFromText(
      JSON.stringify({
        name: 'Ocean',
        colors: {
          background: '#020617',
          surface: '#0f172a',
          text: '#e2e8f0',
          accent: '#0ea5e9',
          border: '#1e293b',
        },
      })
    );

    expect(parsed).toEqual({
      name: 'Ocean',
      colors: {
        background: '#020617',
        surface: '#0f172a',
        text: '#e2e8f0',
        accent: '#0ea5e9',
        border: '#1e293b',
      },
    });
  });

  it('rejects non-json text fallback parsing', () => {
    const parsed = parseColorSchemeFromText(`
      name: Ocean
      background: #020617
      surface: #0f172a
      text: #e2e8f0
      accent: #0ea5e9
      border: #1e293b
    `);

    expect(parsed).toBeNull();
  });

  it('rejects markdown-fenced json compatibility payloads', () => {
    const parsed = parseColorSchemeFromText(`
      \`\`\`json
      {
        "name": "Ocean",
        "colors": {
          "background": "#020617",
          "surface": "#0f172a",
          "text": "#e2e8f0",
          "accent": "#0ea5e9",
          "border": "#1e293b"
        }
      }
      \`\`\`
    `);

    expect(parsed).toBeNull();
  });
});
