import type { KangurAccent } from '@/features/kangur/ui/design/tokens';

export type ClassificationItemSize = 'sm' | 'md' | 'lg';

export type ClassificationItem = {
  id: string;
  label: string;
  emoji: string;
  group: string;
  accent: KangurAccent;
  size?: ClassificationItemSize;
};

export type ClassificationBin = {
  id: string;
  label: string;
  emoji: string;
  acceptGroups: string[];
  accent: KangurAccent;
};

export type ClassificationSortRound = {
  type: 'sort';
  id: string;
  title: string;
  prompt: string;
  hint: string;
  bins: ClassificationBin[];
  items: ClassificationItem[];
};

export type ClassificationIntruderRound = {
  type: 'intruder';
  id: string;
  title: string;
  prompt: string;
  hint: string;
  items: ClassificationItem[];
  intruderId: string;
  explain: string;
};

export type ClassificationRound = ClassificationSortRound | ClassificationIntruderRound;

const SORT_COLOR_ROUND: ClassificationSortRound = {
  type: 'sort',
  id: 'kolory',
  title: 'Sortowanie: kolor',
  prompt: 'Przeciągnij elementy do koszyków według koloru.',
  hint: 'Skup się tylko na barwie, nie na kształcie.',
  bins: [
    {
      id: 'red',
      label: 'Czerwone',
      emoji: '🟥',
      acceptGroups: ['red'],
      accent: 'rose',
    },
    {
      id: 'blue',
      label: 'Niebieskie',
      emoji: '🟦',
      acceptGroups: ['blue'],
      accent: 'sky',
    },
  ],
  items: [
    { id: 'red-1', label: 'Czerwony', emoji: '🔴', group: 'red', accent: 'rose' },
    { id: 'red-2', label: 'Czerwony', emoji: '🍓', group: 'red', accent: 'rose' },
    { id: 'red-3', label: 'Czerwony', emoji: '🟥', group: 'red', accent: 'rose' },
    { id: 'blue-1', label: 'Niebieski', emoji: '🔵', group: 'blue', accent: 'sky' },
    { id: 'blue-2', label: 'Niebieski', emoji: '🟦', group: 'blue', accent: 'sky' },
    { id: 'blue-3', label: 'Niebieski', emoji: '🐳', group: 'blue', accent: 'sky' },
  ],
};

const SORT_CATEGORY_ROUND: ClassificationSortRound = {
  type: 'sort',
  id: 'owoce-warzywa',
  title: 'Sortowanie: kategorie',
  prompt: 'Oddziel owoce od warzyw.',
  hint: 'Pomyśl o tym, co rośnie na drzewach, a co w ziemi.',
  bins: [
    {
      id: 'fruits',
      label: 'Owoce',
      emoji: '🍎',
      acceptGroups: ['fruit'],
      accent: 'amber',
    },
    {
      id: 'vegetables',
      label: 'Warzywa',
      emoji: '🥕',
      acceptGroups: ['vegetable'],
      accent: 'emerald',
    },
  ],
  items: [
    { id: 'fruit-1', label: 'Owoc', emoji: '🍎', group: 'fruit', accent: 'amber' },
    { id: 'fruit-2', label: 'Owoc', emoji: '🍌', group: 'fruit', accent: 'amber' },
    { id: 'fruit-3', label: 'Owoc', emoji: '🍇', group: 'fruit', accent: 'amber' },
    { id: 'veg-1', label: 'Warzywo', emoji: '🥕', group: 'vegetable', accent: 'emerald' },
    { id: 'veg-2', label: 'Warzywo', emoji: '🥦', group: 'vegetable', accent: 'emerald' },
    { id: 'veg-3', label: 'Warzywo', emoji: '🥒', group: 'vegetable', accent: 'emerald' },
  ],
};

const SORT_TWO_CRITERIA_ROUND: ClassificationSortRound = {
  type: 'sort',
  id: 'kolor-rozmiar',
  title: 'Dwie cechy naraz',
  prompt: 'Ułóż kółka według koloru i rozmiaru.',
  hint: 'Spójrz na kolor i wielkość jednocześnie.',
  bins: [
    {
      id: 'big-red',
      label: 'Duże czerwone',
      emoji: '🔴',
      acceptGroups: ['big-red'],
      accent: 'rose',
    },
    {
      id: 'big-blue',
      label: 'Duże niebieskie',
      emoji: '🔵',
      acceptGroups: ['big-blue'],
      accent: 'sky',
    },
    {
      id: 'small-red',
      label: 'Małe czerwone',
      emoji: '🔴',
      acceptGroups: ['small-red'],
      accent: 'rose',
    },
    {
      id: 'small-blue',
      label: 'Małe niebieskie',
      emoji: '🔵',
      acceptGroups: ['small-blue'],
      accent: 'sky',
    },
  ],
  items: [
    { id: 'big-red', label: 'Duże czerwone', emoji: '🔴', group: 'big-red', accent: 'rose', size: 'lg' },
    { id: 'small-red', label: 'Małe czerwone', emoji: '🔴', group: 'small-red', accent: 'rose', size: 'sm' },
    { id: 'big-blue', label: 'Duże niebieskie', emoji: '🔵', group: 'big-blue', accent: 'sky', size: 'lg' },
    { id: 'small-blue', label: 'Małe niebieskie', emoji: '🔵', group: 'small-blue', accent: 'sky', size: 'sm' },
  ],
};

const INTRUDER_FLYING_ROUND: ClassificationIntruderRound = {
  type: 'intruder',
  id: 'intruz-lata',
  title: 'Znajdź intruza',
  prompt: 'Kliknij zwierzę, które NIE lata.',
  hint: 'Sprawdź, kto ma skrzydła.',
  intruderId: 'penguin',
  explain: 'Pingwin nie lata, reszta zwierząt ma skrzydła.',
  items: [
    { id: 'eagle', label: 'Orzeł', emoji: '🦅', group: 'fly', accent: 'amber' },
    { id: 'bee', label: 'Pszczoła', emoji: '🐝', group: 'fly', accent: 'amber' },
    { id: 'butterfly', label: 'Motyl', emoji: '🦋', group: 'fly', accent: 'amber' },
    { id: 'penguin', label: 'Pingwin', emoji: '🐧', group: 'no-fly', accent: 'slate' },
  ],
};

const SORT_SHAPES_ROUND: ClassificationSortRound = {
  type: 'sort',
  id: 'ksztalty',
  title: 'Sortowanie: kształt',
  prompt: 'Ułóż figury według kształtu.',
  hint: 'Zwróć uwagę na kąty i krawędzie.',
  bins: [
    {
      id: 'circle',
      label: 'Koła',
      emoji: '⚪',
      acceptGroups: ['circle'],
      accent: 'slate',
    },
    {
      id: 'triangle',
      label: 'Trójkąty',
      emoji: '🔺',
      acceptGroups: ['triangle'],
      accent: 'amber',
    },
    {
      id: 'square',
      label: 'Kwadraty',
      emoji: '⬜',
      acceptGroups: ['square'],
      accent: 'indigo',
    },
  ],
  items: [
    { id: 'circle-1', label: 'Koło', emoji: '⚪', group: 'circle', accent: 'slate' },
    { id: 'circle-2', label: 'Koło', emoji: '⚫', group: 'circle', accent: 'slate' },
    { id: 'triangle-1', label: 'Trójkąt', emoji: '🔺', group: 'triangle', accent: 'amber' },
    { id: 'triangle-2', label: 'Trójkąt', emoji: '🔻', group: 'triangle', accent: 'amber' },
    { id: 'square-1', label: 'Kwadrat', emoji: '🟦', group: 'square', accent: 'indigo' },
    { id: 'square-2', label: 'Kwadrat', emoji: '🟩', group: 'square', accent: 'indigo' },
  ],
};

const INTRUDER_EVEN_ROUND: ClassificationIntruderRound = {
  type: 'intruder',
  id: 'intruz-parzyste',
  title: 'Znajdź intruza',
  prompt: 'Kliknij liczbę, która jest NIEparzysta.',
  hint: 'Parzyste dzielą się przez 2.',
  intruderId: 'nine',
  explain: '9 jest nieparzysta, reszta to liczby parzyste.',
  items: [
    { id: 'two', label: '2', emoji: '2', group: 'even', accent: 'teal' },
    { id: 'four', label: '4', emoji: '4', group: 'even', accent: 'teal' },
    { id: 'six', label: '6', emoji: '6', group: 'even', accent: 'teal' },
    { id: 'eight', label: '8', emoji: '8', group: 'even', accent: 'teal' },
    { id: 'nine', label: '9', emoji: '9', group: 'odd', accent: 'rose' },
  ],
};

export const LOGICAL_CLASSIFICATION_ROUNDS: ClassificationRound[] = [
  SORT_COLOR_ROUND,
  SORT_CATEGORY_ROUND,
  SORT_TWO_CRITERIA_ROUND,
  INTRUDER_FLYING_ROUND,
  SORT_SHAPES_ROUND,
  INTRUDER_EVEN_ROUND,
];
