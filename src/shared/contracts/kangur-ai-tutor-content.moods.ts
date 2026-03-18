import type { KangurTutorMoodId } from '@/shared/contracts/kangur-ai-tutor-mood';

export const DEFAULT_TUTOR_MOOD_CONTENT: Record<
  KangurTutorMoodId,
  { label: string; description: string }
> = {
  neutral: {
    label: 'Neutralny',
    description: 'Stabilny punkt wyjscia, gdy nie potrzeba silniejszego tonu.',
  },
  thinking: {
    label: 'Zamyślony',
    description: 'Tutor rozważa kolejny krok i porządkuje wskazówki.',
  },
  focused: {
    label: 'Skupiony',
    description: 'Tutor pilnuje bieżącego zadania i prowadzi przez konkretny fragment.',
  },
  careful: {
    label: 'Ostrożny',
    description: 'Tutor zwalnia tempo i dba o precyzję kolejnych kroków.',
  },
  curious: {
    label: 'Ciekawy',
    description: 'Tutor zachęca do odkrywania i zadawania pytań.',
  },
  encouraging: {
    label: 'Dodający otuchy',
    description: 'Tutor wzmacnia wysiłek ucznia i pomaga ruszyć dalej.',
  },
  motivating: {
    label: 'Motywujący',
    description: 'Tutor podtrzymuje energię i chęć do dalszej pracy.',
  },
  playful: {
    label: 'Zabawowy',
    description: 'Tutor utrzymuje lekki, bardziej grywalny ton rozmowy.',
  },
  calm: {
    label: 'Spokojny',
    description: 'Tutor obniża napięcie i porządkuje sytuację krok po kroku.',
  },
  patient: {
    label: 'Cierpliwy',
    description: 'Tutor daje więcej czasu i wraca do podstaw bez presji.',
  },
  gentle: {
    label: 'Łagodny',
    description: 'Tutor prowadzi delikatnie i ogranicza nadmiar bodźców.',
  },
  reassuring: {
    label: 'Uspokajający',
    description: 'Tutor wzmacnia poczucie bezpieczeństwa i zmniejsza stres.',
  },
  empathetic: {
    label: 'Empatyczny',
    description: 'Tutor rozpoznaje trudność ucznia i dopasowuje ton wsparcia.',
  },
  supportive: {
    label: 'Wspierający',
    description: 'Tutor aktywnie podtrzymuje ucznia w bieżącej próbie.',
  },
  reflective: {
    label: 'Refleksyjny',
    description: 'Tutor pomaga przeanalizowac, co już się wydarzylo i czego uczy.',
  },
  determined: {
    label: 'Zdeterminowany',
    description: 'Tutor prowadzi do jednego konkretnego następnego kroku.',
  },
  confident: {
    label: 'Pewny siebie',
    description: 'Tutor daje krótsze wskazówki, bo uczeń radzi sobie coraz lepiej.',
  },
  proud: {
    label: 'Dumny',
    description: 'Tutor podkreśla postęp i realnie docenia osiągnięcia ucznia.',
  },
  happy: {
    label: 'Radosny',
    description: 'Tutor utrzymuje ciepły, pozytywny ton po udanej pracy.',
  },
  celebrating: {
    label: 'Świętujący',
    description: 'Tutor mocno zaznacza sukces lub ważny przełom ucznia.',
  },
};
