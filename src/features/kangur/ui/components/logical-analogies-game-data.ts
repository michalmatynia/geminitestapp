export type LogicalAnalogyRelationId =
  | 'part_whole'
  | 'opposite'
  | 'tool_action'
  | 'cause_effect'
  | 'category_example'
  | 'place_inhabitants'
  | 'material_object'
  | 'sequence'
  | 'creator_work';

export type LogicalAnalogyRelationToken = {
  id: LogicalAnalogyRelationId;
  label: string;
  emoji: string;
  hint: string;
};

export type LogicalAnalogyRelationTarget = {
  id: string;
  pair: string;
  relationId: LogicalAnalogyRelationId;
};

export type LogicalAnalogyRelationRound = {
  id: string;
  title: string;
  prompt: string;
  relationIds: LogicalAnalogyRelationId[];
  targets: LogicalAnalogyRelationTarget[];
};

export const LOGICAL_ANALOGY_RELATION_TOKENS: Record<
  LogicalAnalogyRelationId,
  LogicalAnalogyRelationToken
> = {
  part_whole: {
    id: 'part_whole',
    label: 'część → całość',
    emoji: '🧩',
    hint: 'element należy do większej całości',
  },
  opposite: {
    id: 'opposite',
    label: 'przeciwieństwo',
    emoji: '🔁',
    hint: 'słowa o przeciwnym znaczeniu',
  },
  tool_action: {
    id: 'tool_action',
    label: 'narzędzie → czynność',
    emoji: '🛠️',
    hint: 'narzędzie służy do działania',
  },
  cause_effect: {
    id: 'cause_effect',
    label: 'przyczyna → skutek',
    emoji: '⚡',
    hint: 'jedno zdarzenie wywołuje drugie',
  },
  category_example: {
    id: 'category_example',
    label: 'kategoria → przykład',
    emoji: '📚',
    hint: 'ogólna grupa i jej przykład',
  },
  place_inhabitants: {
    id: 'place_inhabitants',
    label: 'miejsce → mieszkańcy',
    emoji: '🏠',
    hint: 'kto lub co mieszka w danym miejscu',
  },
  material_object: {
    id: 'material_object',
    label: 'materiał → przedmiot',
    emoji: '🧵',
    hint: 'z czego coś jest zrobione',
  },
  sequence: {
    id: 'sequence',
    label: 'kolejność → następstwo',
    emoji: '⏳',
    hint: 'co jest kolejnym krokiem',
  },
  creator_work: {
    id: 'creator_work',
    label: 'twórca → dzieło',
    emoji: '🎨',
    hint: 'kto tworzy i co powstaje',
  },
};

export const LOGICAL_ANALOGIES_RELATION_ROUNDS: LogicalAnalogyRelationRound[] = [
  {
    id: 'rozgrzewka',
    title: 'Rozgrzewka: dwie proste relacje',
    prompt: 'Zacznij od przeciwieństw i kategorii.',
    relationIds: ['opposite', 'category_example'],
    targets: [
      {
        id: 'r1-1',
        pair: 'Gorący → zimny',
        relationId: 'opposite',
      },
      {
        id: 'r1-2',
        pair: 'Owoc → jabłko',
        relationId: 'category_example',
      },
    ],
  },
  {
    id: 'codzienne',
    title: 'Relacje z życia',
    prompt: 'Połącz część z całością, narzędzie z działaniem i miejsce z mieszkańcami.',
    relationIds: ['part_whole', 'tool_action', 'place_inhabitants'],
    targets: [
      {
        id: 'r2-1',
        pair: 'Płatek → kwiat',
        relationId: 'part_whole',
      },
      {
        id: 'r2-2',
        pair: 'Pędzel → malowanie',
        relationId: 'tool_action',
      },
      {
        id: 'r2-3',
        pair: 'Ul → pszczoły',
        relationId: 'place_inhabitants',
      },
    ],
  },
  {
    id: 'przyczyny',
    title: 'Przyczyna, materiał i następstwo',
    prompt: 'Trudniejszy zestaw: co wywołuje skutek i co z czego powstaje.',
    relationIds: ['cause_effect', 'material_object', 'sequence'],
    targets: [
      {
        id: 'r3-1',
        pair: 'Deszcz → kałuża',
        relationId: 'cause_effect',
      },
      {
        id: 'r3-2',
        pair: 'Wełna → sweter',
        relationId: 'material_object',
      },
      {
        id: 'r3-3',
        pair: 'Ziarno → roślina',
        relationId: 'sequence',
      },
    ],
  },
  {
    id: 'mieszanka',
    title: 'Most relacji: miks',
    prompt: 'Połącz cztery różne typy relacji w jednym układzie.',
    relationIds: ['creator_work', 'opposite', 'part_whole', 'category_example'],
    targets: [
      {
        id: 'r4-1',
        pair: 'Autor → książka',
        relationId: 'creator_work',
      },
      {
        id: 'r4-2',
        pair: 'Wysoki → niski',
        relationId: 'opposite',
      },
      {
        id: 'r4-3',
        pair: 'Koło → rower',
        relationId: 'part_whole',
      },
      {
        id: 'r4-4',
        pair: 'Instrument → gitara',
        relationId: 'category_example',
      },
    ],
  },
];
