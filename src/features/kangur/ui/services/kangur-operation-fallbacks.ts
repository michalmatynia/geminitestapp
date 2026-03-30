import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';

type KangurOperationFallbackLocale = 'pl' | 'en' | 'de' | 'uk';

type KangurOperationFallbackInfo = {
  emoji: string;
  labels: Record<KangurOperationFallbackLocale, string>;
};

const KANGUR_OPERATION_FALLBACKS: Record<string, KangurOperationFallbackInfo> = {
  alphabet: {
    emoji: '🔤',
    labels: { pl: 'Alfabet', en: 'Alphabet', de: 'Alphabet', uk: 'Абетка' },
  },
  alphabet_basics: {
    emoji: '🔤',
    labels: { pl: 'Alfabet', en: 'Alphabet', de: 'Alphabet', uk: 'Абетка' },
  },
  alphabet_copy: {
    emoji: '📝',
    labels: {
      pl: 'Przepisz litery',
      en: 'Copy letters',
      de: 'Buchstaben abschreiben',
      uk: 'Перепиши літери',
    },
  },
  alphabet_syllables: {
    emoji: '🔤',
    labels: { pl: 'Sylaby', en: 'Syllables', de: 'Silben', uk: 'Склади' },
  },
  alphabet_words: {
    emoji: '📖',
    labels: {
      pl: 'Pierwsze słowa',
      en: 'First words',
      de: 'Erste Worte',
      uk: 'Перші слова',
    },
  },
  alphabet_matching: {
    emoji: '🔤',
    labels: {
      pl: 'Dopasuj litery',
      en: 'Match letters',
      de: 'Buchstaben zuordnen',
      uk: 'Зістав літери',
    },
  },
  alphabet_sequence: {
    emoji: '🔤',
    labels: {
      pl: 'Kolejność liter',
      en: 'Letter order',
      de: 'Buchstabenfolge',
      uk: 'Порядок літер',
    },
  },
  geometry_shape_recognition: {
    emoji: '🔷',
    labels: { pl: 'Geometria', en: 'Geometry', de: 'Geometrie', uk: 'Геометрія' },
  },
  addition: {
    emoji: '➕',
    labels: { pl: 'Dodawanie', en: 'Addition', de: 'Addieren', uk: 'Додавання' },
  },
  subtraction: {
    emoji: '➖',
    labels: {
      pl: 'Odejmowanie',
      en: 'Subtraction',
      de: 'Subtraktion',
      uk: 'Віднімання',
    },
  },
  multiplication: {
    emoji: '✖️',
    labels: {
      pl: 'Mnożenie',
      en: 'Multiplication',
      de: 'Multiplikation',
      uk: 'Множення',
    },
  },
  division: {
    emoji: '➗',
    labels: { pl: 'Dzielenie', en: 'Division', de: 'Dividieren', uk: 'Ділення' },
  },
  decimals: {
    emoji: '🔢',
    labels: { pl: 'Ułamki', en: 'Fractions', de: 'Brueche', uk: 'Дроби' },
  },
  powers: {
    emoji: '⚡',
    labels: { pl: 'Potęgi', en: 'Powers', de: 'Potenzen', uk: 'Степені' },
  },
  roots: {
    emoji: '√',
    labels: { pl: 'Pierwiastki', en: 'Roots', de: 'Wurzeln', uk: 'Корені' },
  },
  clock: {
    emoji: '🕐',
    labels: { pl: 'Zegar', en: 'Clock', de: 'Uhr', uk: 'Годинник' },
  },
  calendar: {
    emoji: '📅',
    labels: { pl: 'Kalendarz', en: 'Calendar', de: 'Kalender', uk: 'Календар' },
  },
  geometry: {
    emoji: '🔷',
    labels: { pl: 'Geometria', en: 'Geometry', de: 'Geometrie', uk: 'Геометрія' },
  },
  logical: {
    emoji: '🧩',
    labels: {
      pl: 'Logika',
      en: 'Logical thinking',
      de: 'Logik',
      uk: 'Логіка',
    },
  },
  mixed: {
    emoji: '🎲',
    labels: {
      pl: 'Mieszane',
      en: 'Mixed practice',
      de: 'Gemischt',
      uk: 'Змішане',
    },
  },
  english_basics: {
    emoji: '🗣️',
    labels: { pl: 'Podstawy', en: 'Basics', de: 'Grundlagen', uk: 'Основи' },
  },
  english_parts_of_speech: {
    emoji: '🔤',
    labels: {
      pl: 'Części mowy',
      en: 'Parts of speech',
      de: 'Wortarten',
      uk: 'Частини мови',
    },
  },
  english_sentence_structure: {
    emoji: '🧩',
    labels: {
      pl: 'Szyk zdania',
      en: 'Sentence structure',
      de: 'Satzbau',
      uk: 'Будова речення',
    },
  },
  english_subject_verb_agreement: {
    emoji: '🤝',
    labels: {
      pl: 'Zgoda podmiotu',
      en: 'Subject-verb agreement',
      de: 'Subjekt-Verb-Ubereinstimmung',
      uk: 'Узгодження підмета і присудка',
    },
  },
  english_going_to: {
    emoji: '🧳',
    labels: {
      pl: 'Going to',
      en: 'Going to',
      de: 'Going to',
      uk: 'Going to',
    },
  },
  english_articles: {
    emoji: '📰',
    labels: { pl: 'Przedimki', en: 'Articles', de: 'Artikel', uk: 'Артиклі' },
  },
  english_adjectives: {
    emoji: '🎨',
    labels: {
      pl: 'Przymiotniki',
      en: 'Adjectives',
      de: 'Adjektive',
      uk: 'Прикметники',
    },
  },
  english_comparatives_superlatives: {
    emoji: '👑',
    labels: {
      pl: 'Stopniowanie przymiotników',
      en: 'Comparatives & Superlatives',
      de: 'Komparativ und Superlativ',
      uk: 'Вищий і найвищий ступені',
    },
  },
  english_adverbs: {
    emoji: '🎭',
    labels: {
      pl: 'Przysłówki',
      en: 'Adverbs',
      de: 'Adverbien',
      uk: 'Прислівники',
    },
  },
  english_adverbs_frequency: {
    emoji: '🔁',
    labels: {
      pl: 'Przysłówki częstotliwości',
      en: 'Adverbs of frequency',
      de: 'Adverbien der Haufigkeit',
      uk: 'Прислівники частоти',
    },
  },
  english_prepositions_time_place: {
    emoji: '🧭',
    labels: {
      pl: 'Przyimki czasu i miejsca',
      en: 'Time and place prepositions',
      de: 'Praepositionen fuer Zeit und Ort',
      uk: 'Прийменники часу й місця',
    },
  },
};

export const resolveKangurOperationFallbackInfo = (
  operation: string,
  locale?: string | null
): { label: string; emoji: string } => {
  const normalizedLocale = normalizeSiteLocale(locale) as KangurOperationFallbackLocale;
  const fallback = KANGUR_OPERATION_FALLBACKS[operation];

  if (!fallback) {
    return {
      label: operation,
      emoji: '❓',
    };
  }

  return {
    emoji: fallback.emoji,
    label:
      fallback.labels[normalizedLocale] ??
      fallback.labels.en ??
      fallback.labels.pl ??
      fallback.labels.de ??
      fallback.labels.uk,
  };
};
