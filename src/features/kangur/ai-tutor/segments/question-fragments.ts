import type { KangurPageContentFragment } from '@/features/kangur/shared/contracts/kangur-page-content';

export const KANGUR_TEST_QUESTION_FRAGMENTS: KangurPageContentFragment[] = [
  {
    id: 'kangur-q1-squares',
    text: 'Który kwadrat został rozcięty wzdłuż pogrubionych linii na dwie części o różnych kształtach?',
    aliases: [
      'Pytanie 1 ⭐ 3 pkt (łatwe) Który kwadrat został rozcięty wzdłuż pogrubionych linii na dwie części o różnych kształtach?',
      'Pytanie 1 3 pkt (łatwe) Który kwadrat został rozcięty wzdłuż pogrubionych linii na dwie części o różnych kształtach?',
      'Który kwadrat został rozcięty wzdłuż pogrubionych linii na dwie części o różnych kształtach? (A–E)',
    ],
    explanation:
      'To zadanie sprawdza, czy po rozcięciu powstają dwie identyczne czy różne części. Skup się na porównaniu kształtów po obrocie lub odbiciu, zamiast liczyć długości.',
    nativeGuideIds: ['test-kangur-q1-squares'],
    triggerPhrases: [
      'pytanie 1 kangur',
      'rozcięty kwadrat',
      'pogrubione linie',
      'dwie części',
      'różne kształty',
    ],
    enabled: true,
    sortOrder: 10,
  },
];
