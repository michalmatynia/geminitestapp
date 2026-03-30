export type AlphabetLiteracyMatchSetId = 'alphabet_first_words' | 'alphabet_letter_matching';

export type AlphabetLiteracyPrompt = {
  label: string;
  caption?: string;
  kind: 'emoji' | 'letter';
};

export type AlphabetLiteracyRound = {
  id: string;
  title: string;
  instruction: string;
  prompt: AlphabetLiteracyPrompt;
  options: Array<{
    id: string;
    label: string;
  }>;
  correctOptionId: string;
  correctFeedback: string;
};

export type AlphabetLiteracyDataset = {
  setId: AlphabetLiteracyMatchSetId;
  title: string;
  subtitle: string;
  rounds: AlphabetLiteracyRound[];
};

const ALPHABET_FIRST_WORDS_DATASET: AlphabetLiteracyDataset = {
  setId: 'alphabet_first_words',
  title: 'Pierwsze słowa',
  subtitle: 'Połącz obrazek z odpowiednim słowem.',
  rounds: [
    {
      id: 'apple',
      title: 'Znajdź słowo',
      instruction: 'Które słowo pasuje do obrazka?',
      prompt: {
        label: '🍎',
        caption: 'Owoc',
        kind: 'emoji',
      },
      options: [
        { id: 'apple', label: 'jabłko' },
        { id: 'ball', label: 'piłka' },
        { id: 'cat', label: 'kot' },
      ],
      correctOptionId: 'apple',
      correctFeedback: 'Brawo! To jabłko.',
    },
    {
      id: 'car',
      title: 'Dopasuj słowo',
      instruction: 'Wskaż właściwe słowo dla obrazka.',
      prompt: {
        label: '🚗',
        caption: 'Pojazd',
        kind: 'emoji',
      },
      options: [
        { id: 'moon', label: 'księżyc' },
        { id: 'car', label: 'auto' },
        { id: 'dog', label: 'pies' },
      ],
      correctOptionId: 'car',
      correctFeedback: 'Tak, to auto.',
    },
    {
      id: 'cat',
      title: 'Odczytaj obrazek',
      instruction: 'Jak nazywa się to zwierzę?',
      prompt: {
        label: '🐱',
        caption: 'Zwierzę domowe',
        kind: 'emoji',
      },
      options: [
        { id: 'cat', label: 'kot' },
        { id: 'sun', label: 'słońce' },
        { id: 'shoe', label: 'but' },
      ],
      correctOptionId: 'cat',
      correctFeedback: 'Świetnie, to kot.',
    },
  ],
};

const ALPHABET_LETTER_MATCHING_DATASET: AlphabetLiteracyDataset = {
  setId: 'alphabet_letter_matching',
  title: 'Dopasowanie liter',
  subtitle: 'Połącz wielką literę z małą.',
  rounds: [
    {
      id: 'a',
      title: 'Znajdź parę',
      instruction: 'Która mała litera pasuje do wielkiej?',
      prompt: {
        label: 'A',
        caption: 'Wielka litera',
        kind: 'letter',
      },
      options: [
        { id: 'a', label: 'a' },
        { id: 'e', label: 'e' },
        { id: 'o', label: 'o' },
      ],
      correctOptionId: 'a',
      correctFeedback: 'Tak, A pasuje do a.',
    },
    {
      id: 'b',
      title: 'Dopasuj literę',
      instruction: 'Wybierz małą literę dla wielkiego znaku.',
      prompt: {
        label: 'B',
        caption: 'Wielka litera',
        kind: 'letter',
      },
      options: [
        { id: 'p', label: 'p' },
        { id: 'b', label: 'b' },
        { id: 'd', label: 'd' },
      ],
      correctOptionId: 'b',
      correctFeedback: 'Brawo, B i b tworzą parę.',
    },
    {
      id: 'm',
      title: 'Jeszcze jedna para',
      instruction: 'Która mała litera pasuje do M?',
      prompt: {
        label: 'M',
        caption: 'Wielka litera',
        kind: 'letter',
      },
      options: [
        { id: 'n', label: 'n' },
        { id: 'w', label: 'w' },
        { id: 'm', label: 'm' },
      ],
      correctOptionId: 'm',
      correctFeedback: 'Zgadza się, M pasuje do m.',
    },
  ],
};

const ALPHABET_LITERACY_DATASETS: Record<AlphabetLiteracyMatchSetId, AlphabetLiteracyDataset> = {
  alphabet_first_words: ALPHABET_FIRST_WORDS_DATASET,
  alphabet_letter_matching: ALPHABET_LETTER_MATCHING_DATASET,
};

export const getAlphabetLiteracyDataset = (
  setId: AlphabetLiteracyMatchSetId = 'alphabet_letter_matching'
): AlphabetLiteracyDataset => ALPHABET_LITERACY_DATASETS[setId];
