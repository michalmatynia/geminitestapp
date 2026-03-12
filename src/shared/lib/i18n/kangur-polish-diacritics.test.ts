import { describe, expect, it } from 'vitest';

import {
  repairKangurPolishCopy,
  repairKangurPolishText,
} from '@/shared/lib/i18n/kangur-polish-diacritics';

describe('repairKangurPolishText', () => {
  it('restores common missing diacritics in Kangur content copy', () => {
    expect(repairKangurPolishText('Powtorz plan strony i sprawdz postep.')).toBe(
      'Powtórz plan strony i sprawdź postęp.'
    );
    expect(repairKangurPolishText('Wroc do zakladki i wlacz AI Tutora.')).toBe(
      'Wróć do zakładki i włącz AI Tutora.'
    );
    expect(repairKangurPolishText('Czesc {displayName},')).toBe('Cześć {displayName},');
    expect(repairKangurPolishText('Czesc, Olu!')).toBe('Cześć, Olu!');
    expect(
      repairKangurPolishText('Jesli to nie Ty tworzysz konto, zignoruj ta wiadomość.')
    ).toBe('Jeśli to nie Ty tworzysz konto, zignoruj tę wiadomość.');
    expect(
      repairKangurPolishText(
        'Szybkie akcje sa po to, aby uczen albo rodzic od razu przeszedl do najwazniejszego nastepnego ruchu: lekcji, gry albo innego kroku zaproponowanego przez aplikacje.'
      )
    ).toBe(
      'Szybkie akcje są po to, aby uczeń albo rodzic od razu przeszedł do najważniejszego następnego ruchu: lekcji, gry albo innego kroku zaproponowanego przez aplikację.'
    );
  });

  it('repairs nested Mongo-style objects without touching non-string values', () => {
    const createdAt = new Date('2026-03-12T00:00:00.000Z');
    const repaired = repairKangurPolishCopy({
      title: 'Postep ucznia',
      body: 'Jesli chcesz, przejdz do lekcji i popros o wskazowki.',
      items: ['Powtorz plan strony', 'Wroc do lekcji'],
      createdAt,
      count: 3,
    });

    expect(repaired).toEqual({
      title: 'Postęp ucznia',
      body: 'Jeśli chcesz, przejdź do lekcji i poproś o wskazówki.',
      items: ['Powtórz plan strony', 'Wróć do lekcji'],
      createdAt,
      count: 3,
    });
  });
});
