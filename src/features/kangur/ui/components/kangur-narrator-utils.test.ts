/**
 * @vitest-environment jsdom
 */

import { describe, expect, it } from 'vitest';

import { extractNarrationTextFromElement } from './kangur-narrator-utils';

describe('extractNarrationTextFromElement', () => {
  it('keeps readable modal copy while ignoring controls and explicitly ignored regions', () => {
    const root = document.createElement('div');
    root.innerHTML = `
      <section>
        <h2>Pomocnik</h2>
        <p>To jest tekst, który narrator powinien przeczytać.</p>
        <div data-kangur-tts-ignore="true">
          <button type="button">Czytaj</button>
          <button type="button">Wyślij</button>
        </div>
        <div>
          <span>Powtorz lekcje: Dodawanie</span>
          <button type="button">Otworz lekcje</button>
        </div>
        <input value="Ukryte pole" />
        <svg><text>Ikona</text></svg>
      </section>
    `;

    const result = extractNarrationTextFromElement(root);

    expect(result).toContain('Pomocnik');
    expect(result).toContain('To jest tekst, który narrator powinien przeczytać.');
    expect(result).toContain('Powtorz lekcje: Dodawanie');
    expect(result).not.toContain('Czytaj');
    expect(result).not.toContain('Wyślij');
    expect(result).not.toContain('Otworz lekcje');
    expect(result).not.toContain('Ukryte pole');
    expect(result).not.toContain('Ikona');
  });
});
