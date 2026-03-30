import type { KangurAccent } from '@/features/kangur/ui/design/tokens';
import type {
  KangurLessonSubject,
} from '@/features/kangur/shared/contracts/kangur';
import type { KangurAssignmentCatalogItem } from './delegated-assignments.types';

export const ASSIGNMENT_PRIORITY_ORDER = {
  high: 0,
  medium: 1,
  low: 2,
} as const;

export const ASSIGNMENT_SUBJECT_ACCENTS: Record<KangurLessonSubject, KangurAccent> = {
  alphabet: 'amber',
  art: 'rose',
  music: 'sky',
  geometry: 'emerald',
  english: 'sky',
  maths: 'violet',
  web_development: 'teal',
  agentic_coding: 'indigo',
};

export const PRACTICE_ASSIGNMENT_RUNTIME_KEYS: Record<string, string> = {
  'practice-mixed': 'practiceMixed',
  'practice-addition': 'practiceAddition',
  'practice-subtraction': 'practiceSubtraction',
  'practice-multiplication': 'practiceMultiplication',
  'practice-division': 'practiceDivision',
  'practice-decimals': 'practiceDecimals',
  'practice-powers': 'practicePowers',
  'practice-roots': 'practiceRoots',
  'practice-clock': 'practiceClock',
};

export const PRACTICE_ASSIGNMENT_ITEMS: KangurAssignmentCatalogItem[] = [
  {
    id: 'practice-mixed',
    title: 'Trening mieszany',
    description: 'Przypisz przekrojowy trening z różnymi typami pytań.',
    badge: 'Trening',
    group: 'practice',
    priorityLabel: 'Priorytet średni',
    createInput: {
      title: 'Trening mieszany',
      description: 'Wykonaj mieszany trening i utrzymaj regularność pracy.',
      priority: 'medium',
      target: {
        type: 'practice',
        operation: 'mixed',
        requiredAttempts: 1,
        minAccuracyPercent: 70,
      },
    },
    keywords: ['trening', 'mieszany', 'powtórka', 'priorytet'],
  },
  {
    id: 'practice-addition',
    title: 'Trening: Dodawanie',
    description: 'Jedna sesja dodawania z celem 80% poprawnych odpowiedzi.',
    badge: 'Praktyka',
    group: 'practice',
    priorityLabel: 'Priorytet wysoki',
    createInput: {
      title: 'Praktyka: Dodawanie',
      description: 'Rozwiąż sesję dodawania i osiągnij co najmniej 80% skuteczności.',
      priority: 'high',
      target: {
        type: 'practice',
        operation: 'addition',
        requiredAttempts: 1,
        minAccuracyPercent: 80,
      },
    },
    keywords: ['dodawanie', 'arytmetyka', 'trening', 'plus'],
  },
  {
    id: 'practice-subtraction',
    title: 'Trening: Odejmowanie',
    description: 'Jedna sesja odejmowania z celem 80% poprawnych odpowiedzi.',
    badge: 'Praktyka',
    group: 'practice',
    priorityLabel: 'Priorytet wysoki',
    createInput: {
      title: 'Praktyka: Odejmowanie',
      description: 'Rozwiąż sesję odejmowania i osiągnij co najmniej 80% skuteczności.',
      priority: 'high',
      target: {
        type: 'practice',
        operation: 'subtraction',
        requiredAttempts: 1,
        minAccuracyPercent: 80,
      },
    },
    keywords: ['odejmowanie', 'arytmetyka', 'trening', 'minus'],
  },
  {
    id: 'practice-multiplication',
    title: 'Trening: Mnożenie',
    description: 'Jedna sesja mnożenia z celem 80% poprawnych odpowiedzi.',
    badge: 'Praktyka',
    group: 'practice',
    priorityLabel: 'Priorytet wysoki',
    createInput: {
      title: 'Praktyka: Mnożenie',
      description: 'Rozwiąż sesję mnożenia i osiągnij co najmniej 80% skuteczności.',
      priority: 'high',
      target: {
        type: 'practice',
        operation: 'multiplication',
        requiredAttempts: 1,
        minAccuracyPercent: 80,
      },
    },
    keywords: ['mnożenie', 'tabliczka', 'arytmetyka', 'trening'],
  },
  {
    id: 'practice-division',
    title: 'Trening: Dzielenie',
    description: 'Jedna sesja dzielenia z celem 80% poprawnych odpowiedzi.',
    badge: 'Praktyka',
    group: 'practice',
    priorityLabel: 'Priorytet wysoki',
    createInput: {
      title: 'Praktyka: Dzielenie',
      description: 'Rozwiąż sesję dzielenia i osiągnij co najmniej 80% skuteczności.',
      priority: 'high',
      target: {
        type: 'practice',
        operation: 'division',
        requiredAttempts: 1,
        minAccuracyPercent: 80,
      },
    },
    keywords: ['dzielenie', 'arytmetyka', 'trening'],
  },
  {
    id: 'practice-decimals',
    title: 'Trening: Ułamki',
    description: 'Jedna sesja ułamków z celem 75% poprawnych odpowiedzi.',
    badge: 'Praktyka',
    group: 'practice',
    priorityLabel: 'Priorytet średni',
    createInput: {
      title: 'Praktyka: Ułamki',
      description: 'Rozwiąż sesję ułamków i osiągnij co najmniej 75% skuteczności.',
      priority: 'medium',
      target: {
        type: 'practice',
        operation: 'decimals',
        requiredAttempts: 1,
        minAccuracyPercent: 75,
      },
    },
    keywords: ['ułamki', 'dziesiętne', 'arytmetyka', 'trening'],
  },
  {
    id: 'practice-powers',
    title: 'Trening: Potęgi',
    description: 'Jedna sesja potęg z celem 75% poprawnych odpowiedzi.',
    badge: 'Praktyka',
    group: 'practice',
    priorityLabel: 'Priorytet średni',
    createInput: {
      title: 'Praktyka: Potęgi',
      description: 'Rozwiąż sesję potęg i osiągnij co najmniej 75% skuteczności.',
      priority: 'medium',
      target: {
        type: 'practice',
        operation: 'powers',
        requiredAttempts: 1,
        minAccuracyPercent: 75,
      },
    },
    keywords: ['potęgi', 'wykładniki', 'arytmetyka', 'trening'],
  },
  {
    id: 'practice-roots',
    title: 'Trening: Pierwiastki',
    description: 'Jedna sesja pierwiastków z celem 75% poprawnych odpowiedzi.',
    badge: 'Praktyka',
    group: 'practice',
    priorityLabel: 'Priorytet średni',
    createInput: {
      title: 'Praktyka: Pierwiastki',
      description: 'Rozwiąż sesję pierwiastków i osiągnij co najmniej 75% skuteczności.',
      priority: 'medium',
      target: {
        type: 'practice',
        operation: 'roots',
        requiredAttempts: 1,
        minAccuracyPercent: 75,
      },
    },
    keywords: ['pierwiastki', 'arytmetyka', 'trening'],
  },
  {
    id: 'practice-clock',
    title: 'Trening: Zegar',
    description: 'Sesja ćwiczeń z godzinami, minutami i pełnym czasem na zegarze.',
    badge: 'Praktyka',
    group: 'practice',
    priorityLabel: 'Priorytet średni',
    createInput: {
      title: 'Praktyka: Zegar',
      description:
        'Wykonaj zegarowy trening i sprawdź odczytywanie godzin, minut oraz pełnego czasu.',
      priority: 'medium',
      target: {
        type: 'practice',
        operation: 'clock',
        requiredAttempts: 1,
        minAccuracyPercent: 75,
      },
    },
    keywords: ['zegar', 'zegary', 'czas', 'godziny', 'minuty', 'pełny czas', 'trening'],
  },
];
