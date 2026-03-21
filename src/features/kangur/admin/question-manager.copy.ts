import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { KangurTestQuestionWorkflowStatus } from '@/features/kangur/shared/contracts/kangur-tests';

import type { KangurAdminLocaleDto } from './kangur-admin-locale';
import { resolveKangurAdminLocale } from './kangur-admin-locale';
import type { QuestionListFilter, QuestionListSort } from './question-manager-view';

type QuestionManagerLocaleCopy = {
  intlLocale: string;
  header: {
    eyebrow: string;
    ready: string;
    richUi: string;
    needsReview: string;
    needsFix: string;
    illustrated: string;
    reviewQueue: string;
    draft: string;
    readyToPublish: string;
    published: string;
    notPublished: string;
    readyForLive: string;
    goLiveAfterPublish: string;
    live: string;
    liveNeedsAttention: string;
    addQuestion: string;
    backToSuites: string;
    publishAndGoLive: string;
    publishReadyQuestions: string;
    goLiveForLearners: string;
    takeSuiteOffline: string;
  };
  alerts: {
    liveNeedsAttention: string;
    live: string;
    readyForLive: string;
    publishAndGoLive: string;
  };
  filters: {
    panelTitle: string;
    searchPlaceholder: string;
    searchAriaLabel: string;
    sortLabel: string;
    filterLabel: string;
    reorderHint: string;
    filterLabels: Record<QuestionListFilter, string>;
    sortLabels: Record<QuestionListSort, string>;
  };
  emptyStates: {
    noMatches: (query: string) => string;
    noQuestionsYet: string;
    noFilterMatches: (filterLabel: string) => string;
  };
  modal: {
    addQuestionTitle: string;
    editQuestionTitle: string;
    addQuestionSave: string;
    saveQuestion: string;
    recoveredDraftTitle: string;
    recoveredDraftFrom: (timestamp: string) => string;
    dismissDraft: string;
    restoreDraft: string;
    deleteQuestionTitle: string;
    deleteQuestionMessage: (prompt: string) => string;
    deleteQuestionConfirm: string;
    discardChangesTitle: string;
    discardChangesSubtitle: string;
    discardChangesMessage: string;
    discardChangesConfirm: string;
    discardChangesCancel: string;
  };
  listItem: {
    order: (position: number) => string;
    queue: (position: number) => string;
    points: (value: number) => string;
    svg: string;
    choiceUi: string;
    layout: string;
    review: string;
    fix: string;
    emptyPrompt: string;
    moveUp: string;
    moveDown: string;
    editQuestion: string;
    edit: string;
    duplicateQuestion: string;
    deleteQuestion: string;
    workflowLabels: Record<KangurTestQuestionWorkflowStatus, string>;
  };
};

export type QuestionManagerCopy = QuestionManagerLocaleCopy & {
  formatQuestionCount: (count: number) => string;
  filterOptions: Array<LabeledOptionDto<QuestionListFilter>>;
  sortOptions: Array<LabeledOptionDto<QuestionListSort>>;
};

const QUESTION_WORDS = {
  en: { one: 'question', other: 'questions' },
  pl: { one: 'pytanie', few: 'pytania', many: 'pytań', other: 'pytań' },
  uk: { one: 'запитання', few: 'запитання', many: 'запитань', other: 'запитання' },
} as const;

const QUESTION_MANAGER_COPY_BY_LOCALE: Record<KangurAdminLocaleDto, QuestionManagerLocaleCopy> = {
  en: {
    intlLocale: 'en-US',
    header: {
      eyebrow: 'Suite question workspace',
      ready: 'Ready',
      richUi: 'Rich UI',
      needsReview: 'Needs review',
      needsFix: 'Needs fix',
      illustrated: 'SVG',
      reviewQueue: 'Review queue',
      draft: 'Draft',
      readyToPublish: 'Ready to publish',
      published: 'Published',
      notPublished: 'Not published',
      readyForLive: 'Ready for live',
      goLiveAfterPublish: 'Go live after publish',
      live: 'Live',
      liveNeedsAttention: 'Live needs attention',
      addQuestion: 'Add question',
      backToSuites: 'Back to suites',
      publishAndGoLive: 'Publish and go live',
      publishReadyQuestions: 'Publish ready questions',
      goLiveForLearners: 'Go live for learners',
      takeSuiteOffline: 'Take suite offline',
    },
    alerts: {
      liveNeedsAttention:
        'This suite is still marked live, but its published question set is incomplete or needs review. Learner runtime will keep it offline until you repair and republish it.',
      live:
        'This suite is live for learners. Draft edits, deletions, or unpublished duplicates will take it offline until the published set is complete again.',
      readyForLive: 'This suite is fully published and ready to go live for learners.',
      publishAndGoLive:
        'This suite can publish its ready queue and go live for learners in one step.',
    },
    filters: {
      panelTitle: 'Filter and triage',
      searchPlaceholder: 'Search prompts, answers, or audit flags...',
      searchAriaLabel: 'Search questions',
      sortLabel: 'Sort',
      filterLabel: 'Filter',
      reorderHint: 'Reorder questions in the Manual order / All view.',
      filterLabels: {
        all: 'All',
        'needs-review': 'Needs review',
        'needs-fix': 'Needs fix',
        draft: 'Draft',
        ready: 'Ready to publish',
        published: 'Published',
        'rich-ui': 'Rich UI',
        illustrated: 'SVG',
      },
      sortLabels: {
        manual: 'Manual order',
        'review-queue': 'Review queue',
      },
    },
    emptyStates: {
      noMatches: (query) => `No questions match "${query}".`,
      noQuestionsYet: 'No questions yet. Add the first question to start.',
      noFilterMatches: (filterLabel) => `No questions match the "${filterLabel}" filter.`,
    },
    modal: {
      addQuestionTitle: 'Add Question',
      editQuestionTitle: 'Edit Question',
      addQuestionSave: 'Add Question',
      saveQuestion: 'Save Question',
      recoveredDraftTitle: 'Recovered local draft',
      recoveredDraftFrom: (timestamp) => `A newer local draft is available from ${timestamp}.`,
      dismissDraft: 'Dismiss draft',
      restoreDraft: 'Restore draft',
      deleteQuestionTitle: 'Delete Question',
      deleteQuestionMessage: (prompt) =>
        `Delete question "${prompt}"? This cannot be undone.`,
      deleteQuestionConfirm: 'Delete',
      discardChangesTitle: 'Discard question changes?',
      discardChangesSubtitle: 'You have unsaved changes in this question draft.',
      discardChangesMessage:
        'Close the editor without saving? Your current question edits will be lost.',
      discardChangesConfirm: 'Discard changes',
      discardChangesCancel: 'Keep editing',
    },
    listItem: {
      order: (position) => `Order ${position}`,
      queue: (position) => `Queue ${position}`,
      points: (value) => `${value}pt`,
      svg: 'SVG',
      choiceUi: 'Choice UI',
      layout: 'Layout',
      review: 'Review',
      fix: 'Fix',
      emptyPrompt: '(empty prompt)',
      moveUp: 'Move up',
      moveDown: 'Move down',
      editQuestion: 'Edit question',
      edit: 'Edit',
      duplicateQuestion: 'Duplicate question',
      deleteQuestion: 'Delete question',
      workflowLabels: {
        draft: 'Draft',
        ready: 'Ready to publish',
        published: 'Published',
      },
    },
  },
  pl: {
    intlLocale: 'pl-PL',
    header: {
      eyebrow: 'Przestrzeń pytań zestawu',
      ready: 'Gotowe',
      richUi: 'Rozbudowane UI',
      needsReview: 'Do przeglądu',
      needsFix: 'Do poprawy',
      illustrated: 'SVG',
      reviewQueue: 'Kolejka przeglądu',
      draft: 'Szkic',
      readyToPublish: 'Gotowe do publikacji',
      published: 'Opublikowane',
      notPublished: 'Nieopublikowane',
      readyForLive: 'Gotowe do uruchomienia',
      goLiveAfterPublish: 'Uruchom po publikacji',
      live: 'Na żywo',
      liveNeedsAttention: 'Live wymaga uwagi',
      addQuestion: 'Dodaj pytanie',
      backToSuites: 'Powrót do zestawów',
      publishAndGoLive: 'Opublikuj i uruchom',
      publishReadyQuestions: 'Opublikuj gotowe pytania',
      goLiveForLearners: 'Uruchom dla uczniów',
      takeSuiteOffline: 'Wyłącz zestaw',
    },
    alerts: {
      liveNeedsAttention:
        'Ten zestaw nadal jest oznaczony jako live, ale jego opublikowany zestaw pytań jest niepełny albo wymaga przeglądu. Runtime ucznia utrzyma go offline, dopóki nie naprawisz i nie opublikujesz go ponownie.',
      live:
        'Ten zestaw jest live dla uczniów. Zmiany w szkicach, usunięcia albo nieopublikowane duplikaty zdejmą go offline, dopóki opublikowany zestaw nie będzie znowu kompletny.',
      readyForLive: 'Ten zestaw jest w pełni opublikowany i gotowy do uruchomienia dla uczniów.',
      publishAndGoLive:
        'Ten zestaw może opublikować kolejkę gotowych pytań i uruchomić się dla uczniów w jednym kroku.',
    },
    filters: {
      panelTitle: 'Filtrowanie i triage',
      searchPlaceholder: 'Szukaj promptów, odpowiedzi lub flag audytu...',
      searchAriaLabel: 'Szukaj pytań',
      sortLabel: 'Sortowanie',
      filterLabel: 'Filtr',
      reorderHint: 'Zmianę kolejności pytań włączysz w widoku "Ręczna kolejność / Wszystkie".',
      filterLabels: {
        all: 'Wszystkie',
        'needs-review': 'Do przeglądu',
        'needs-fix': 'Do poprawy',
        draft: 'Szkic',
        ready: 'Gotowe do publikacji',
        published: 'Opublikowane',
        'rich-ui': 'Rozbudowane UI',
        illustrated: 'SVG',
      },
      sortLabels: {
        manual: 'Ręczna kolejność',
        'review-queue': 'Kolejka przeglądu',
      },
    },
    emptyStates: {
      noMatches: (query) => `Żadne pytania nie pasują do "${query}".`,
      noQuestionsYet: 'Nie ma jeszcze pytań. Dodaj pierwsze pytanie, aby zacząć.',
      noFilterMatches: (filterLabel) =>
        `Żadne pytania nie pasują do filtra "${filterLabel}".`,
    },
    modal: {
      addQuestionTitle: 'Dodaj pytanie',
      editQuestionTitle: 'Edytuj pytanie',
      addQuestionSave: 'Dodaj pytanie',
      saveQuestion: 'Zapisz pytanie',
      recoveredDraftTitle: 'Odzyskany lokalny szkic',
      recoveredDraftFrom: (timestamp) => `Nowszy lokalny szkic jest dostępny z ${timestamp}.`,
      dismissDraft: 'Odrzuć szkic',
      restoreDraft: 'Przywróć szkic',
      deleteQuestionTitle: 'Usuń pytanie',
      deleteQuestionMessage: (prompt) =>
        `Usunąć pytanie "${prompt}"? Tej operacji nie można cofnąć.`,
      deleteQuestionConfirm: 'Usuń',
      discardChangesTitle: 'Odrzucić zmiany w pytaniu?',
      discardChangesSubtitle: 'Masz niezapisane zmiany w tym szkicu pytania.',
      discardChangesMessage:
        'Zamknąć edytor bez zapisu? Bieżące zmiany w pytaniu zostaną utracone.',
      discardChangesConfirm: 'Odrzuć zmiany',
      discardChangesCancel: 'Kontynuuj edycję',
    },
    listItem: {
      order: (position) => `Kolejność ${position}`,
      queue: (position) => `Kolejka ${position}`,
      points: (value) => `${value} pkt`,
      svg: 'SVG',
      choiceUi: 'UI odpowiedzi',
      layout: 'Układ',
      review: 'Przegląd',
      fix: 'Poprawki',
      emptyPrompt: '(pusty prompt)',
      moveUp: 'Przesuń wyżej',
      moveDown: 'Przesuń niżej',
      editQuestion: 'Edytuj pytanie',
      edit: 'Edytuj',
      duplicateQuestion: 'Duplikuj pytanie',
      deleteQuestion: 'Usuń pytanie',
      workflowLabels: {
        draft: 'Szkic',
        ready: 'Gotowe do publikacji',
        published: 'Opublikowane',
      },
    },
  },
  uk: {
    intlLocale: 'uk-UA',
    header: {
      eyebrow: 'Робоча зона запитань набору',
      ready: 'Готово',
      richUi: 'Розширений UI',
      needsReview: 'Потрібен перегляд',
      needsFix: 'Потрібне виправлення',
      illustrated: 'SVG',
      reviewQueue: 'Черга перегляду',
      draft: 'Чернетка',
      readyToPublish: 'Готово до публікації',
      published: 'Опубліковано',
      notPublished: 'Не опубліковано',
      readyForLive: 'Готово до запуску',
      goLiveAfterPublish: 'Запустити після публікації',
      live: 'Активний',
      liveNeedsAttention: 'Активний потребує уваги',
      addQuestion: 'Додати запитання',
      backToSuites: 'Назад до наборів',
      publishAndGoLive: 'Опублікувати і запустити',
      publishReadyQuestions: 'Опублікувати готові запитання',
      goLiveForLearners: 'Запустити для учнів',
      takeSuiteOffline: 'Зняти набір з публікації',
    },
    alerts: {
      liveNeedsAttention:
        'Цей набір досі позначений як активний, але опублікований набір запитань неповний або потребує перегляду. Учнівський runtime триматиме його офлайн, доки ви не виправите й не опублікуєте його знову.',
      live:
        'Цей набір активний для учнів. Чернеткові зміни, видалення або неопубліковані дублікати знімуть його з публікації, доки опублікований набір знову не стане повним.',
      readyForLive: 'Цей набір повністю опублікований і готовий до запуску для учнів.',
      publishAndGoLive:
        'Цей набір може опублікувати чергу готових запитань і запуститися для учнів за один крок.',
    },
    filters: {
      panelTitle: 'Фільтри й тріаж',
      searchPlaceholder: 'Шукати тексти, відповіді чи прапорці аудиту...',
      searchAriaLabel: 'Пошук запитань',
      sortLabel: 'Сортування',
      filterLabel: 'Фільтр',
      reorderHint: 'Перевпорядковувати запитання можна в режимі "Ручний порядок / Усі".',
      filterLabels: {
        all: 'Усі',
        'needs-review': 'Потрібен перегляд',
        'needs-fix': 'Потрібне виправлення',
        draft: 'Чернетка',
        ready: 'Готово до публікації',
        published: 'Опубліковано',
        'rich-ui': 'Розширений UI',
        illustrated: 'SVG',
      },
      sortLabels: {
        manual: 'Ручний порядок',
        'review-queue': 'Черга перегляду',
      },
    },
    emptyStates: {
      noMatches: (query) => `Жодне запитання не відповідає "${query}".`,
      noQuestionsYet: 'Ще немає запитань. Додайте перше, щоб почати.',
      noFilterMatches: (filterLabel) =>
        `Жодне запитання не відповідає фільтру "${filterLabel}".`,
    },
    modal: {
      addQuestionTitle: 'Додати запитання',
      editQuestionTitle: 'Редагувати запитання',
      addQuestionSave: 'Додати запитання',
      saveQuestion: 'Зберегти запитання',
      recoveredDraftTitle: 'Відновлена локальна чернетка',
      recoveredDraftFrom: (timestamp) => `Доступна новіша локальна чернетка від ${timestamp}.`,
      dismissDraft: 'Відхилити чернетку',
      restoreDraft: 'Відновити чернетку',
      deleteQuestionTitle: 'Видалити запитання',
      deleteQuestionMessage: (prompt) =>
        `Видалити запитання "${prompt}"? Цю дію неможливо скасувати.`,
      deleteQuestionConfirm: 'Видалити',
      discardChangesTitle: 'Скасувати зміни в запитанні?',
      discardChangesSubtitle: 'У цій чернетці запитання є незбережені зміни.',
      discardChangesMessage:
        'Закрити редактор без збереження? Поточні зміни в запитанні буде втрачено.',
      discardChangesConfirm: 'Скасувати зміни',
      discardChangesCancel: 'Продовжити редагування',
    },
    listItem: {
      order: (position) => `Порядок ${position}`,
      queue: (position) => `Черга ${position}`,
      points: (value) => `${value} б.`,
      svg: 'SVG',
      choiceUi: 'UI варіантів',
      layout: 'Макет',
      review: 'Перегляд',
      fix: 'Виправлення',
      emptyPrompt: '(порожній текст)',
      moveUp: 'Перемістити вище',
      moveDown: 'Перемістити нижче',
      editQuestion: 'Редагувати запитання',
      edit: 'Редагувати',
      duplicateQuestion: 'Дублювати запитання',
      deleteQuestion: 'Видалити запитання',
      workflowLabels: {
        draft: 'Чернетка',
        ready: 'Готово до публікації',
        published: 'Опубліковано',
      },
    },
  },
};

const QUESTION_PLURAL_RULES = {
  en: new Intl.PluralRules('en-US'),
  pl: new Intl.PluralRules('pl-PL'),
  uk: new Intl.PluralRules('uk-UA'),
} as const;

export const resolveQuestionManagerLocale = (
  locale: string | null | undefined
): KangurAdminLocaleDto => resolveKangurAdminLocale(locale);

export const getQuestionManagerCopy = (locale: KangurAdminLocaleDto): QuestionManagerCopy => {
  const localizedCopy = QUESTION_MANAGER_COPY_BY_LOCALE[locale];
  const filterOptions: Array<LabeledOptionDto<QuestionListFilter>> = [
    { value: 'all', label: localizedCopy.filters.filterLabels.all },
    { value: 'needs-review', label: localizedCopy.filters.filterLabels['needs-review'] },
    { value: 'needs-fix', label: localizedCopy.filters.filterLabels['needs-fix'] },
    { value: 'draft', label: localizedCopy.filters.filterLabels.draft },
    { value: 'ready', label: localizedCopy.filters.filterLabels.ready },
    { value: 'published', label: localizedCopy.filters.filterLabels.published },
    { value: 'rich-ui', label: localizedCopy.filters.filterLabels['rich-ui'] },
    { value: 'illustrated', label: localizedCopy.filters.filterLabels.illustrated },
  ];
  const sortOptions: Array<LabeledOptionDto<QuestionListSort>> = [
    { value: 'manual', label: localizedCopy.filters.sortLabels.manual },
    { value: 'review-queue', label: localizedCopy.filters.sortLabels['review-queue'] },
  ];

  return {
    ...localizedCopy,
    formatQuestionCount: (count) => {
      const pluralCategory = QUESTION_PLURAL_RULES[locale].select(count);
      const word =
        QUESTION_WORDS[locale][pluralCategory as keyof (typeof QUESTION_WORDS)[typeof locale]] ??
        QUESTION_WORDS[locale].other;

      return `${count} ${word}`;
    },
    filterOptions,
    sortOptions,
  };
};
