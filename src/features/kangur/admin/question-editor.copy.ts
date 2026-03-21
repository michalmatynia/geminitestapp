import type { LabeledOptionDto } from '@/shared/contracts/base';

import type { KangurAdminLocaleDto } from './kangur-admin-locale';
import { resolveKangurAdminLocale } from './kangur-admin-locale';

export type QuestionEditorCopy = {
  intlLocale: string;
  selectOptionLabel: string;
  statusLabels: {
    ready: string;
    'needs-review': string;
    'needs-fix': string;
  };
  reviewStatusBadges: {
    'needs-review': string;
    'needs-fix': string;
  };
  dirtyStateLabels: {
    saved: string;
    unsaved: string;
  };
  pointValueOptions: Array<LabeledOptionDto<string>>;
  presentationLayoutOptions: Array<LabeledOptionDto<string>>;
  choiceStyleOptions: Array<LabeledOptionDto<string>>;
  workflowOptions: Array<LabeledOptionDto<string>>;
  shell: {
    eyebrow: string;
    title: string;
    description: string;
    pointValue: string;
    suiteTarget: string;
    workflow: string;
    authoringStatus: string;
    localDraft: string;
    adHocDraft: string;
    hasIllustration: string;
    questionReview: string;
    nextAction: string;
    requiredBeforeSave: string;
    reviewBeforePublish: string;
    noStructuralBlockers: string;
    noReviewWarnings: string;
    quickRepairs: string;
    presentationPresets: string;
    presentationPresetsHint: string;
    publishingState: string;
    publishingStateHint: string;
    lastPublished: (timestamp: string) => string;
    notPublishedYet: string;
    questionLayout: string;
    choiceStyle: string;
    legacyReviewNotes: string;
    questionPrompt: string;
    questionPromptPlaceholder: string;
    questionPromptHelper: string;
    illustration: string;
    explanation: string;
    explanationPlaceholder: string;
    explanationHelper: string;
    preview: string;
    previewModes: {
      learner: string;
      correct: string;
      incorrect: string;
      correctReview: string;
      incorrectReview: string;
    };
    previewFrames: {
      desktop: string;
      compact: string;
    };
  };
  choices: {
    sectionTitle: string;
    autoLabel: string;
    correctAnswer: string;
    markAsCorrect: (label: string) => string;
    choiceLabel: string;
    choiceText: (label: string) => string;
    moveUp: string;
    moveDown: string;
    deleteChoice: string;
    richChoiceDetails: string;
    choiceNote: string;
    choiceNotePlaceholder: string;
    choiceSvg: string;
    addChoice: string;
  };
  illustration: {
    typeOptions: Array<LabeledOptionDto<string>>;
    layoutOptions: Array<LabeledOptionDto<string>>;
    panelCount: string;
    panelLabel: string;
    panelName: (label: string) => string;
    startBlank: string;
    deletePanel: string;
    description: string;
    descriptionPlaceholder: string;
    combinedPreview: string;
    empty: string;
    syncLabelsToChoices: string;
    noIllustration: string;
    addPanel: string;
  };
};

type QuestionEditorLocaleCopy = Omit<
  QuestionEditorCopy,
  'pointValueOptions' | 'presentationLayoutOptions' | 'choiceStyleOptions' | 'workflowOptions'
>;

const QUESTION_EDITOR_COPY_BY_LOCALE: Record<KangurAdminLocaleDto, QuestionEditorLocaleCopy> = {
  en: {
    intlLocale: 'en-US',
    selectOptionLabel: 'Select option',
    statusLabels: {
      ready: 'Ready',
      'needs-review': 'Needs review',
      'needs-fix': 'Needs fixes',
    },
    reviewStatusBadges: {
      'needs-review': 'Needs review',
      'needs-fix': 'Needs fix',
    },
    dirtyStateLabels: {
      saved: 'Saved',
      unsaved: 'Unsaved changes',
    },
    shell: {
      eyebrow: 'Question workspace',
      title:
        'Shape the learner-facing question, keep the review rail visible, and publish from a cleaner workspace.',
      description:
        'The editor now keeps the suite target, workflow, authoring health, and autosave signal in one control surface so you do not have to scan across the form.',
      pointValue: 'Point value',
      suiteTarget: 'Suite target',
      workflow: 'Workflow',
      authoringStatus: 'Authoring status',
      localDraft: 'Local draft',
      adHocDraft: 'Ad hoc draft',
      hasIllustration: 'Has illustration',
      questionReview: 'Question review',
      nextAction: 'Next action',
      requiredBeforeSave: 'Required before save',
      reviewBeforePublish: 'Review before publish',
      noStructuralBlockers: 'No structural blockers. This draft can be saved.',
      noReviewWarnings: 'No review warnings. The question is editorially clean.',
      quickRepairs: 'Quick repairs',
      presentationPresets: 'Presentation presets',
      presentationPresetsHint:
        'Start from a learner-facing question layout, then adjust the details below.',
      publishingState: 'Publishing state',
      publishingStateHint:
        'Draft questions stay in authoring. Ready questions are cleared for publish. Published marks the question as live-approved in the bank.',
      lastPublished: (timestamp) => `Last published: ${timestamp}`,
      notPublishedYet: 'This question has not been published yet.',
      questionLayout: 'Question layout',
      choiceStyle: 'Choice style',
      legacyReviewNotes: 'Legacy review notes',
      questionPrompt: 'Question prompt',
      questionPromptPlaceholder:
        'Enter the question text. You can use $$formula$$ markers for math expressions.',
      questionPromptHelper:
        'This prompt is also mirrored into the structured question-content engine so richer layouts can evolve without migrating the data again.',
      illustration: 'Illustration',
      explanation: 'Explanation (shown after answer)',
      explanationPlaceholder: 'Step-by-step explanation of why the correct answer is correct.',
      explanationHelper:
        'Add the learner-facing explanation here. Imported legacy questions keep any review flags above until they are repaired.',
      preview: 'Preview',
      previewModes: {
        learner: 'Learner view',
        correct: 'Correct answer',
        incorrect: 'Wrong answer',
        correctReview: 'Correct answer review',
        incorrectReview: 'Wrong answer review',
      },
      previewFrames: {
        desktop: 'Desktop',
        compact: 'Compact',
      },
    },
    choices: {
      sectionTitle: 'Choices',
      autoLabel: 'Auto-label A-E',
      correctAnswer: 'Correct answer',
      markAsCorrect: (label) => `Mark ${label} as correct`,
      choiceLabel: 'Choice label',
      choiceText: (label) => `Choice ${label} text`,
      moveUp: 'Move up',
      moveDown: 'Move down',
      deleteChoice: 'Delete choice',
      richChoiceDetails: 'Rich choice details',
      choiceNote: 'Choice note / visual description',
      choiceNotePlaceholder: 'Optional learner-facing note or visual description',
      choiceSvg: 'Choice SVG',
      addChoice: 'Add choice',
    },
    illustration: {
      typeOptions: [
        { value: 'none', label: 'No illustration' },
        { value: 'single', label: 'Single SVG' },
        { value: 'panels', label: 'Panels (A/B/C/D/E)' },
      ],
      layoutOptions: [
        { value: 'row', label: 'Row' },
        { value: 'grid-2x2', label: '2x2 grid' },
        { value: 'grid-3x2', label: '3x2 grid' },
      ],
      panelCount: 'Panels:',
      panelLabel: 'Panel label',
      panelName: (label) => `Panel ${label}`,
      startBlank: 'Start blank',
      deletePanel: 'Delete panel',
      description: 'Description (screen reader / tooltip)',
      descriptionPlaceholder: 'Optional text description',
      combinedPreview: 'Combined preview',
      empty: 'empty',
      syncLabelsToChoices: 'Sync labels to choices',
      noIllustration: 'No illustration. Select Single SVG or Panels to add visual content.',
      addPanel: 'Add panel',
    },
  },
  pl: {
    intlLocale: 'pl-PL',
    selectOptionLabel: 'Wybierz opcję',
    statusLabels: {
      ready: 'Gotowe',
      'needs-review': 'Wymaga przeglądu',
      'needs-fix': 'Wymaga poprawek',
    },
    reviewStatusBadges: {
      'needs-review': 'Wymaga przeglądu',
      'needs-fix': 'Wymaga poprawy',
    },
    dirtyStateLabels: {
      saved: 'Zapisane',
      unsaved: 'Niezapisane zmiany',
    },
    shell: {
      eyebrow: 'Przestrzeń pytania',
      title:
        'Ułóż pytanie widoczne dla ucznia, trzymaj tor przeglądu pod ręką i publikuj z czytelniejszego workspace\'u.',
      description:
        'Edytor zbiera teraz cel zestawu, workflow, stan authoringu i sygnał autosave w jednym miejscu, żeby nie trzeba było skanować całego formularza.',
      pointValue: 'Liczba punktów',
      suiteTarget: 'Docelowy zestaw',
      workflow: 'Workflow',
      authoringStatus: 'Stan authoringu',
      localDraft: 'Lokalny szkic',
      adHocDraft: 'Szkic ad hoc',
      hasIllustration: 'Ma ilustrację',
      questionReview: 'Przegląd pytania',
      nextAction: 'Następny krok',
      requiredBeforeSave: 'Wymagane przed zapisem',
      reviewBeforePublish: 'Sprawdź przed publikacją',
      noStructuralBlockers: 'Brak blokad strukturalnych. Ten szkic można zapisać.',
      noReviewWarnings: 'Brak uwag do przeglądu. Pytanie jest redakcyjnie czyste.',
      quickRepairs: 'Szybkie naprawy',
      presentationPresets: 'Presety prezentacji',
      presentationPresetsHint:
        'Zacznij od układu pytania widocznego dla ucznia, a potem dopracuj szczegóły poniżej.',
      publishingState: 'Stan publikacji',
      publishingStateHint:
        'Pytania w szkicu zostają w authoringu. Pytania gotowe są wyczyszczone do publikacji. Opublikowane oznacza, że pytanie jest zatwierdzone jako live w banku.',
      lastPublished: (timestamp) => `Ostatnia publikacja: ${timestamp}`,
      notPublishedYet: 'To pytanie nie zostało jeszcze opublikowane.',
      questionLayout: 'Układ pytania',
      choiceStyle: 'Styl odpowiedzi',
      legacyReviewNotes: 'Uwagi z legacy review',
      questionPrompt: 'Treść pytania',
      questionPromptPlaceholder:
        'Wpisz treść pytania. Możesz używać znaczników $$formula$$ dla wyrażeń matematycznych.',
      questionPromptHelper:
        'Ten prompt jest też kopiowany do strukturalnego silnika treści pytania, żeby bogatsze układy mogły ewoluować bez kolejnej migracji danych.',
      illustration: 'Ilustracja',
      explanation: 'Wyjaśnienie (pokazywane po odpowiedzi)',
      explanationPlaceholder: 'Krok po kroku wyjaśnij, dlaczego poprawna odpowiedź jest poprawna.',
      explanationHelper:
        'Dodaj tutaj wyjaśnienie widoczne dla ucznia. Importowane pytania legacy zachowują flagi review powyżej, dopóki nie zostaną naprawione.',
      preview: 'Podgląd',
      previewModes: {
        learner: 'Widok ucznia',
        correct: 'Poprawna odpowiedź',
        incorrect: 'Błędna odpowiedź',
        correctReview: 'Przegląd poprawnej odpowiedzi',
        incorrectReview: 'Przegląd błędnej odpowiedzi',
      },
      previewFrames: {
        desktop: 'Desktop',
        compact: 'Kompakt',
      },
    },
    choices: {
      sectionTitle: 'Odpowiedzi',
      autoLabel: 'Auto-etykiety A-E',
      correctAnswer: 'Poprawna odpowiedź',
      markAsCorrect: (label) => `Oznacz ${label} jako poprawną`,
      choiceLabel: 'Etykieta odpowiedzi',
      choiceText: (label) => `Treść odpowiedzi ${label}`,
      moveUp: 'Przesuń wyżej',
      moveDown: 'Przesuń niżej',
      deleteChoice: 'Usuń odpowiedź',
      richChoiceDetails: 'Rozszerzone detale odpowiedzi',
      choiceNote: 'Notatka odpowiedzi / opis wizualny',
      choiceNotePlaceholder: 'Opcjonalna notatka widoczna dla ucznia lub opis wizualny',
      choiceSvg: 'SVG odpowiedzi',
      addChoice: 'Dodaj odpowiedź',
    },
    illustration: {
      typeOptions: [
        { value: 'none', label: 'Brak ilustracji' },
        { value: 'single', label: 'Pojedyncze SVG' },
        { value: 'panels', label: 'Panele (A/B/C/D/E)' },
      ],
      layoutOptions: [
        { value: 'row', label: 'Rząd' },
        { value: 'grid-2x2', label: 'Siatka 2x2' },
        { value: 'grid-3x2', label: 'Siatka 3x2' },
      ],
      panelCount: 'Panele:',
      panelLabel: 'Etykieta panelu',
      panelName: (label) => `Panel ${label}`,
      startBlank: 'Zacznij od pustego',
      deletePanel: 'Usuń panel',
      description: 'Opis (screen reader / tooltip)',
      descriptionPlaceholder: 'Opcjonalny opis tekstowy',
      combinedPreview: 'Podgląd łączony',
      empty: 'puste',
      syncLabelsToChoices: 'Synchronizuj etykiety z odpowiedziami',
      noIllustration: 'Brak ilustracji. Wybierz Pojedyncze SVG albo Panele, aby dodać treść wizualną.',
      addPanel: 'Dodaj panel',
    },
  },
  uk: {
    intlLocale: 'uk-UA',
    selectOptionLabel: 'Вибрати опцію',
    statusLabels: {
      ready: 'Готово',
      'needs-review': 'Потрібен перегляд',
      'needs-fix': 'Потрібні виправлення',
    },
    reviewStatusBadges: {
      'needs-review': 'Потрібен перегляд',
      'needs-fix': 'Потрібне виправлення',
    },
    dirtyStateLabels: {
      saved: 'Збережено',
      unsaved: 'Незбережені зміни',
    },
    shell: {
      eyebrow: 'Робоча зона запитання',
      title:
        'Сформуйте запитання для учня, тримайте поруч панель перевірки й публікуйте з чистішого робочого простору.',
      description:
        'Тепер редактор тримає цільовий набір, workflow, стан авторингу й сигнал автозбереження в одній зоні керування, щоб вам не доводилося сканувати всю форму.',
      pointValue: 'Кількість балів',
      suiteTarget: 'Цільовий набір',
      workflow: 'Workflow',
      authoringStatus: 'Стан авторингу',
      localDraft: 'Локальна чернетка',
      adHocDraft: 'Чернетка ad hoc',
      hasIllustration: 'Є ілюстрація',
      questionReview: 'Перевірка запитання',
      nextAction: 'Наступна дія',
      requiredBeforeSave: 'Потрібно перед збереженням',
      reviewBeforePublish: 'Перевірити перед публікацією',
      noStructuralBlockers: 'Структурних блокерів немає. Цю чернетку можна зберегти.',
      noReviewWarnings: 'Попереджень для перевірки немає. Запитання редакційно чисте.',
      quickRepairs: 'Швидкі виправлення',
      presentationPresets: 'Пресети презентації',
      presentationPresetsHint:
        'Почніть із макета запитання для учня, а потім налаштуйте деталі нижче.',
      publishingState: 'Стан публікації',
      publishingStateHint:
        'Чернеткові запитання лишаються в авторингу. Готові запитання очищені для публікації. Опубліковано означає, що запитання підтверджене як live у банку.',
      lastPublished: (timestamp) => `Остання публікація: ${timestamp}`,
      notPublishedYet: 'Це запитання ще не було опубліковане.',
      questionLayout: 'Макет запитання',
      choiceStyle: 'Стиль варіантів',
      legacyReviewNotes: 'Нотатки legacy review',
      questionPrompt: 'Текст запитання',
      questionPromptPlaceholder:
        'Введіть текст запитання. Можна використовувати маркери $$formula$$ для математичних виразів.',
      questionPromptHelper:
        'Цей prompt також дублюється в структурований рушій контенту запитання, щоб багатші макети могли розвиватися без нової міграції даних.',
      illustration: 'Ілюстрація',
      explanation: 'Пояснення (показується після відповіді)',
      explanationPlaceholder:
        'Покроково поясніть, чому правильна відповідь є правильною.',
      explanationHelper:
        'Додайте тут пояснення для учня. Імпортовані legacy-запитання зберігають прапорці review вище, доки їх не буде виправлено.',
      preview: 'Попередній перегляд',
      previewModes: {
        learner: 'Режим учня',
        correct: 'Правильна відповідь',
        incorrect: 'Неправильна відповідь',
        correctReview: 'Перегляд правильної відповіді',
        incorrectReview: 'Перегляд неправильної відповіді',
      },
      previewFrames: {
        desktop: 'Десктоп',
        compact: 'Компактний',
      },
    },
    choices: {
      sectionTitle: 'Варіанти',
      autoLabel: 'Автонумерація A-E',
      correctAnswer: 'Правильна відповідь',
      markAsCorrect: (label) => `Позначити ${label} як правильну`,
      choiceLabel: 'Позначка варіанта',
      choiceText: (label) => `Текст варіанта ${label}`,
      moveUp: 'Перемістити вище',
      moveDown: 'Перемістити нижче',
      deleteChoice: 'Видалити варіант',
      richChoiceDetails: 'Розширені деталі варіанта',
      choiceNote: 'Нотатка варіанта / візуальний опис',
      choiceNotePlaceholder: 'Необовʼязкова нотатка для учня або візуальний опис',
      choiceSvg: 'SVG варіанта',
      addChoice: 'Додати варіант',
    },
    illustration: {
      typeOptions: [
        { value: 'none', label: 'Без ілюстрації' },
        { value: 'single', label: 'Один SVG' },
        { value: 'panels', label: 'Панелі (A/B/C/D/E)' },
      ],
      layoutOptions: [
        { value: 'row', label: 'Ряд' },
        { value: 'grid-2x2', label: 'Сітка 2x2' },
        { value: 'grid-3x2', label: 'Сітка 3x2' },
      ],
      panelCount: 'Панелі:',
      panelLabel: 'Позначка панелі',
      panelName: (label) => `Панель ${label}`,
      startBlank: 'Почати з пустого',
      deletePanel: 'Видалити панель',
      description: 'Опис (screen reader / tooltip)',
      descriptionPlaceholder: 'Необовʼязковий текстовий опис',
      combinedPreview: 'Спільний перегляд',
      empty: 'порожньо',
      syncLabelsToChoices: 'Синхронізувати позначки з варіантами',
      noIllustration: 'Ілюстрації немає. Виберіть Один SVG або Панелі, щоб додати візуальний контент.',
      addPanel: 'Додати панель',
    },
  },
};

export const resolveQuestionEditorLocale = (
  locale: string | null | undefined
): KangurAdminLocaleDto => resolveKangurAdminLocale(locale);

export const getQuestionEditorCopy = (
  locale: KangurAdminLocaleDto
): QuestionEditorCopy => {
  const localizedCopy = QUESTION_EDITOR_COPY_BY_LOCALE[locale];
  const pointUnit = locale === 'uk' ? 'б.' : locale === 'pl' ? 'pkt' : 'pt';

  return {
    ...localizedCopy,
    pointValueOptions: [1, 2, 3, 4, 5].map((value) => ({
      value: String(value),
      label: `${value} ${pointUnit}${value === 1 && locale === 'en' ? '' : locale === 'en' ? 's' : ''}`,
    })),
    presentationLayoutOptions: [
      {
        value: 'classic',
        label:
          locale === 'uk' ? 'Класичний стек' : locale === 'pl' ? 'Klasyczny stos' : 'Classic stack',
      },
      {
        value: 'split-illustration-left',
        label:
          locale === 'uk'
            ? 'Ілюстрація ліворуч'
            : locale === 'pl'
              ? 'Ilustracja po lewej'
              : 'Illustration left',
      },
      {
        value: 'split-illustration-right',
        label:
          locale === 'uk'
            ? 'Ілюстрація праворуч'
            : locale === 'pl'
              ? 'Ilustracja po prawej'
              : 'Illustration right',
      },
    ],
    choiceStyleOptions: [
      {
        value: 'list',
        label:
          locale === 'uk' ? 'Список варіантів' : locale === 'pl' ? 'Lista odpowiedzi' : 'Choice list',
      },
      {
        value: 'grid',
        label:
          locale === 'uk' ? 'Сітка варіантів' : locale === 'pl' ? 'Siatka odpowiedzi' : 'Choice grid',
      },
    ],
    workflowOptions: [
      {
        value: 'draft',
        label: locale === 'uk' ? 'Чернетка' : locale === 'pl' ? 'Szkic' : 'Draft',
      },
      {
        value: 'ready',
        label:
          locale === 'uk'
            ? 'Готово до публікації'
            : locale === 'pl'
              ? 'Gotowe do publikacji'
              : 'Ready to publish',
      },
      {
        value: 'published',
        label: locale === 'uk' ? 'Опубліковано' : locale === 'pl' ? 'Opublikowane' : 'Published',
      },
    ],
  };
};
