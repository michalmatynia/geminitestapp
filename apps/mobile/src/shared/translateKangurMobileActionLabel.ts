import {
  type KangurMobileLocale,
  type KangurMobileLocalizedValue,
} from '../i18n/kangurMobileI18n';

const KANGUR_MOBILE_ACTION_LABEL_MAP: Record<
  string,
  KangurMobileLocalizedValue<string>
> = {
  'All sessions': {
    de: 'Alle Ergebnisse',
    en: 'All results',
    pl: 'Wszystkie wyniki',
  },
  Arithmetic: {
    de: 'Arithmetik',
    en: 'Arithmetic',
    pl: 'Arytmetyka',
  },
  Assignments: {
    de: 'Aufgaben',
    en: 'Assignments',
    pl: 'Zadania',
  },
  Back: {
    de: 'Zurück',
    en: 'Back',
    pl: 'Wróć',
  },
  'Back to profile': {
    de: 'Zurück zum Profil',
    en: 'Back to profile',
    pl: 'Wróć do profilu',
  },
  'Daily plan': {
    de: 'Tagesplan',
    en: 'Daily plan',
    pl: 'Plan dnia',
  },
  Leaderboard: {
    de: 'Rangliste',
    en: 'Leaderboard',
    pl: 'Ranking',
  },
  Logic: {
    de: 'Logik',
    en: 'Logic',
    pl: 'Logika',
  },
  'Mode history': {
    de: 'Modusverlauf',
    en: 'Mode history',
    pl: 'Historia trybu',
  },
  'Open auth screen': {
    de: 'Zum Login',
    en: 'Go to sign in',
    pl: 'Przejdź do logowania',
  },
  'Open daily plan': {
    de: 'Tagesplan öffnen',
    en: 'Open daily plan',
    pl: 'Otwórz plan dnia',
  },
  'Open full history': {
    de: 'Vollständigen Verlauf öffnen',
    en: 'Open full history',
    pl: 'Otwórz pełną historię',
  },
  'Open history': {
    de: 'Vollständigen Verlauf öffnen',
    en: 'Open full history',
    pl: 'Otwórz pełną historię',
  },
  'Open lesson': {
    de: 'Lektion öffnen',
    en: 'Open lesson',
    pl: 'Otwórz lekcję',
  },
  'Open matching lesson': {
    de: 'Passende Lektion öffnen',
    en: 'Open matching lesson',
    pl: 'Otwórz pasującą lekcję',
  },
  'Practice now': {
    de: 'Jetzt trainieren',
    en: 'Practice now',
    pl: 'Trenuj teraz',
  },
  'Practice weakest': {
    de: 'Schwächsten Modus trainieren',
    en: 'Practice weakest',
    pl: 'Trenuj najsłabszy tryb',
  },
  'Recent results': {
    de: 'Ergebniszentrale',
    en: 'Results hub',
    pl: 'Centrum wyników',
  },
  Refresh: {
    de: 'Aktualisieren',
    en: 'Refresh',
    pl: 'Odśwież',
  },
  'Refresh plan': {
    de: 'Plan aktualisieren',
    en: 'Refresh plan',
    pl: 'Odśwież plan',
  },
  'Refresh proof': {
    de: 'Vorschau aktualisieren',
    en: 'Refresh proof',
    pl: 'Odśwież podgląd',
  },
  'Sign in demo session': {
    de: 'Demo starten',
    en: 'Start demo',
    pl: 'Uruchom demo',
  },
  'Start mixed practice': {
    de: 'Gemischtes Training starten',
    en: 'Start mixed practice',
    pl: 'Uruchom trening mieszany',
  },
  'Strongest mode': {
    de: 'Stärkster Modus',
    en: 'Strongest mode',
    pl: 'Najmocniejszy tryb',
  },
  'Train again': {
    de: 'Erneut trainieren',
    en: 'Train again',
    pl: 'Trenuj ponownie',
  },
  'Train this mode': {
    de: 'Diesen Modus trainieren',
    en: 'Train this mode',
    pl: 'Trenuj ten tryb',
  },
  'Training focus': {
    de: 'Trainingsfokus',
    en: 'Training focus',
    pl: 'Fokus treningowy',
  },
  Time: {
    de: 'Zeit',
    en: 'Time',
    pl: 'Czas',
  },
  'View mode history': {
    de: 'Modusverlauf ansehen',
    en: 'View mode history',
    pl: 'Zobacz historię trybu',
  },
  'Weakest mode': {
    de: 'Zum Wiederholen',
    en: 'Weakest mode',
    pl: 'Do powtórki',
  },
};

export const translateKangurMobileActionLabel = (
  label: string,
  locale: KangurMobileLocale = 'pl',
): string => KANGUR_MOBILE_ACTION_LABEL_MAP[label]?.[locale] ?? label;
