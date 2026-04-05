import type { KangurLessonComponentId } from '@kangur/contracts/kangur-lesson-constants';

import type { KangurCoreLocale } from './profile-i18n';

type LocalizedLessonDescriptionMap = Partial<
  Record<KangurLessonComponentId, Record<KangurCoreLocale, string>>
>;

export const KANGUR_PORTABLE_LESSON_DESCRIPTIONS: LocalizedLessonDescriptionMap = {
  "clock": {
    "de": "Stunden, Minuten und volle Uhrzeit auf einer analogen Uhr.",
    "en": "Hours, minutes, and full time on an analog clock.",
    "pl": "Odczytuj godziny z zegara analogowego"
  },
  "calendar": {
    "de": "Tage, Monate, Daten und Jahreszeiten.",
    "en": "Days, months, dates, and seasons.",
    "pl": "Dni, miesiące, daty i pory roku"
  },
  "adding": {
    "de": "Einstellige, zweistellige Addition und ein Ballspiel.",
    "en": "Single-digit, double-digit, and a ball game.",
    "pl": "Jednocyfrowe, dwucyfrowe i gra z pilkami!"
  },
  "subtracting": {
    "de": "Einstellige, zweistellige Subtraktion und Reste.",
    "en": "Single-digit, double-digit, and remainders.",
    "pl": "Jednocyfrowe, dwucyfrowe i reszta"
  },
  "multiplication": {
    "de": "Einmaleins und Strategien zur Multiplikation.",
    "en": "Times tables and multiplication strategies.",
    "pl": "Tabliczka mnozenia i algorytmy"
  },
  "division": {
    "de": "Grundlagen der Division und Reste.",
    "en": "Basic division and remainders.",
    "pl": "Proste dzielenie i reszta z dzielenia"
  },
  "geometry_basics": {
    "de": "Punkte, Strecken, Seiten und Winkel.",
    "en": "Points, segments, sides, and angles.",
    "pl": "Punkt, odcinek, bok i kat"
  },
  "geometry_shapes": {
    "de": "Lerne Formen und zeichne sie im Spiel.",
    "en": "Learn shapes and draw them in the game.",
    "pl": "Poznaj figury i narysuj je w grze"
  },
  "geometry_symmetry": {
    "de": "Symmetrieachsen und Spiegelungen.",
    "en": "Lines of symmetry and mirror reflections.",
    "pl": "Os symetrii i odbicia lustrzane"
  },
  "geometry_perimeter": {
    "de": "Berechne Seitenlaengen Schritt fuer Schritt.",
    "en": "Calculate side lengths step by step.",
    "pl": "Liczenie dlugosci bokow krok po kroku"
  },
  "logical_thinking": {
    "de": "Ordnung, Regeln und Beobachtung.",
    "en": "Order, rules, and observation.",
    "pl": "Wprowadzenie do wzorcow, klasyfikacji i analogii"
  },
  "logical_patterns": {
    "de": "Wiederkehrende Folgen und Rhythmen.",
    "en": "Recurring sequences and rhythms.",
    "pl": "Odkryj zasady kryjace sie w ciagach i wzorcach"
  },
  "logical_classification": {
    "de": "Gruppieren, sortieren und das unpassende Element finden.",
    "en": "Group, sort, and find the odd one out.",
    "pl": "Grupuj, sortuj i znajdz intruza"
  },
  "logical_reasoning": {
    "de": "Wenn... dann... Schritt fuer Schritt denken.",
    "en": "If... then... think step by step.",
    "pl": "Jesli... to... - mysl krok po kroku"
  },
  "logical_analogies": {
    "de": "Finde dieselbe Beziehung in einem neuen Kontext.",
    "en": "Find the same relationship in a new context.",
    "pl": "Znajdz te sama relacje w nowym kontekscie"
  }
};

