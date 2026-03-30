import { describe, expect, it } from 'vitest';

import {
  repairKangurPolishCopy,
  repairKangurPolishText,
} from '@/shared/lib/i18n/kangur-polish-diacritics';

describe('repairKangurPolishText', () => {
  it('restores common missing diacritics in Kangur content copy', () => {
    expect(repairKangurPolishText('Powtórz plan strony i sprawdź postęp.')).toBe(
      'Powtórz plan strony i sprawdź postęp.'
    );
    expect(repairKangurPolishText('Wróć do zakładki i włącz AI Tutora.')).toBe(
      'Wróć do zakładki i włącz AI Tutora.'
    );
    expect(repairKangurPolishText('Cześć {displayName},')).toBe('Cześć {displayName},');
    expect(repairKangurPolishText('Cześć, Olu!')).toBe('Cześć, Olu!');
    expect(
      repairKangurPolishText('Jeśli to nie Ty tworzysz konto, zignoruj tę wiadomość.')
    ).toBe('Jeśli to nie Ty tworzysz konto, zignoruj tę wiadomość.');
    expect(
      repairKangurPolishText(
        'Szybkie akcje są po to, aby uczeń albo rodzic od razu przeszedł do najważniejszego następnego ruchu: lekcji, gry albo innego kroku zaproponowanego przez aplikację.'
      )
    ).toBe(
      'Szybkie akcje są po to, aby uczeń albo rodzic od razu przeszedł do najważniejszego następnego ruchu: lekcji, gry albo innego kroku zaproponowanego przez aplikację.'
    );
    expect(repairKangurPolishText('Nie udalo sie znalezc strony.')).toBe(
      'Nie udało się znaleźć strony.'
    );
    expect(repairKangurPolishText('Zaloguj sie, aby dolaczyc do pojedynku.')).toBe(
      'Zaloguj się, aby dołączyć do pojedynku.'
    );
    expect(repairKangurPolishText('Sekcje lekcji')).toBe('Sekcje lekcji');
  });

  it('repairs nested Mongo-style objects without touching non-string values', () => {
    const createdAt = new Date('2026-03-12T00:00:00.000Z');
    const repaired = repairKangurPolishCopy({
      title: 'Postęp ucznia',
      body: 'Jeśli chcesz, przejdź do lekcji i poproś o wskazówki.',
      items: ['Powtórz plan strony', 'Wróć do lekcji'],
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
