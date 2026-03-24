'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef } from 'react';

import { getLocalizedKangurLessonTitle } from '@/features/kangur/lessons/lesson-catalog-i18n';
import {
  KANGUR_GEOMETRY_LESSON_COMPONENT_IDS,
  KANGUR_LESSON_COMPONENT_ORDER,
  KANGUR_LESSON_LIBRARY,
} from '@/features/kangur/settings';
import type { KangurLessonTemplate } from '@/features/kangur/lessons/lesson-types';
import KangurGameSetupMomentumCard from '@/features/kangur/ui/components/KangurGameSetupMomentumCard';
import { KangurGrajmyWordmark } from '@/features/kangur/ui/components/KangurGrajmyWordmark';
import { KangurIconSummaryOptionCard } from '@/features/kangur/ui/components/KangurIconSummaryOptionCard';
import { KangurIconSummaryCardContent } from '@/features/kangur/ui/components/KangurIconSummaryCardContent';
import { KangurPageIntroCard } from '@/features/kangur/ui/components/KangurPageIntroCard';
import KangurPracticeAssignmentBanner from '@/features/kangur/ui/components/KangurPracticeAssignmentBanner';
import KangurVisualCueContent from '@/features/kangur/ui/components/KangurVisualCueContent';
import { KangurTrainingSetupPanel } from '@/features/kangur/ui/components/KangurTrainingSetupPanel';
import OperationSelector from '@/features/kangur/ui/components/OperationSelector';
import { KangurSubjectGroupSection } from '@/features/kangur/ui/components/KangurSubjectGroupSection';
import { KangurTreningWordmark } from '@/features/kangur/ui/components/KangurTreningWordmark';
import { getKangurSixYearOldSubjectVisual } from '@/features/kangur/ui/constants/six-year-old-visuals';
import { getKangurSubjectGroups } from '@/features/kangur/ui/constants/subject-groups';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';
import { useKangurSubjectFocus } from '@/features/kangur/ui/context/KangurSubjectFocusContext';
import { useKangurAgeGroupFocus } from '@/features/kangur/ui/context/KangurAgeGroupFocusContext';
import {
  KangurButton,
  KangurInfoCard,
  KangurIconBadge,
  KangurPanelRow,
  KangurSectionHeading,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_PANEL_GAP_CLASSNAME,
  KANGUR_RELAXED_ROW_CLASSNAME,
  KANGUR_TIGHT_ROW_CLASSNAME,
  KANGUR_WRAP_START_ROW_CLASSNAME,
  type KangurAccent,
} from '@/features/kangur/ui/design/tokens';
import type { KangurDailyQuestState } from '@/features/kangur/shared/contracts/kangur-quests';
import { getCurrentKangurDailyQuest } from '@/features/kangur/ui/services/daily-quests';
import {
  getRecommendedTrainingSetup,
} from '@/features/kangur/ui/services/game-setup-recommendations';
import {
  type KangurRecommendationLocalizer,
  resolveLocalizedRecommendationActivityLabel,
  translateRecommendationWithFallback,
  type RecommendationTranslate,
} from '@/features/kangur/ui/services/recommendation-i18n';
import {
  getProgressAverageAccuracy,
  getProgressBadgeTrackSummaries,
  getProgressTopActivities,
  getRecommendedSessionMomentum,
} from '@/features/kangur/ui/services/progress';
import type { KangurProgressTranslate } from '@/features/kangur/ui/services/progress-i18n';
import { useKangurLessons } from '@/features/kangur/ui/hooks/useKangurLessons';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import type {
  KangurDifficulty,
  KangurGameScreen,
  KangurOperation,
  KangurProgressState,
} from '@/features/kangur/ui/types';
import type {
  KangurLessonComponentId,
  KangurLesson,
  KangurLessonSubject,
  KangurRouteAction,
} from '@/features/kangur/shared/contracts/kangur';
import { createDefaultKangurProgressState } from '@/shared/contracts/kangur';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';

type LessonQuizDefinition = {
  accent: KangurAccent;
  description: string;
  emoji: string;
  label: string;
  lessonComponentIds: readonly KangurLessonComponentId[];
  onSelectScreen: KangurGameScreen;
};

type LessonQuizOption = LessonQuizDefinition & {
  subject: KangurLessonSubject;
  sortOrder: number;
};

type OperationSelectorFallbackCopy = {
  operationSelectorTitle: string;
  trainingSetupTitle: string;
  trainingSetupWordmarkLabel: string;
  trainingSetupDescription: string;
  intro: {
    maths: string;
    alphabet: string;
    art: string;
    music: string;
    geometry: string;
    language: string;
  };
  quickPractice: {
    title: string;
    description: string;
    groupAria: (group: string) => string;
    cardAria: (label: string) => string;
    gameChip: string;
  };
  lessonQuizDefinitions: LessonQuizDefinition[];
  recommendation: {
    actions: {
      playAddition: string;
      playSubtraction: string;
      playMultiplication: string;
      playDivision: string;
      playClock: string;
      startMixedTraining: string;
      playFractions: string;
      playPowers: string;
      playRoots: string;
      practiceCalendar: string;
      practiceGeometry: string;
      practiceSubtraction: string;
      practiceDivision: string;
      practiceMultiplication: string;
      startTraining: string;
      playNow: string;
    };
    questLabel: string;
    weakestLesson: {
      description: (masteryPercent: number) => string;
      label: string;
      title: (title: string) => string;
    };
    track: {
      descriptionWithActivity: (track: string, activity: string) => string;
      descriptionDefault: (track: string) => string;
      label: string;
      title: (track: string) => string;
    };
    guided: {
      descriptionWithActivity: (summary: string, activity: string, nextBadgeName: string) => string;
      descriptionDefault: (summary: string, nextBadgeName: string) => string;
      label: string;
      title: (nextBadgeName: string) => string;
    };
    fallback: {
      description: (activity: string, averageXpPerSession: number) => string;
      label: string;
      title: (activity: string) => string;
    };
  };
};

const getOperationSelectorFallbackCopy = (
  locale: ReturnType<typeof normalizeSiteLocale>
): OperationSelectorFallbackCopy => {
  if (locale === 'uk') {
    return {
      operationSelectorTitle: 'Граймо!',
      trainingSetupTitle: 'Налаштування тренування',
      trainingSetupWordmarkLabel: 'Тренування',
      trainingSetupDescription: 'Налаштуйте змішане тренування й виберіть діапазон запитань.',
      intro: {
        maths: 'Виберіть тип гри й переходьте просто до математичної забави.',
        alphabet: 'Виберіть літерну забаву й тренуйте алфавіт.',
        art: 'Виберіть урок мистецтва й досліджуйте кольори та форми.',
        music: 'Виберіть музичний урок і співайте звуки діатонічної гами крок за кроком.',
        geometry: 'Виберіть забаву з формами й тренуйте геометрію.',
        language: 'Виберіть тип мовної гри й переходьте просто до вправ.',
      },
      quickPractice: {
        title: 'Швидкі вправи',
        description: 'Швидкі вікторини на основі тем з уроків.',
        groupAria: (group) => `${group} швидкі вправи`,
        cardAria: (label) => `Швидка вправа: ${label}`,
        gameChip: 'Гра',
      },
      lessonQuizDefinitions: [
        {
          accent: 'indigo',
          description: 'Тренуйте читання годин і хвилин у режимі вікторини.',
          emoji: '🕐',
          label: 'Вправи з годинником',
          lessonComponentIds: ['clock'],
          onSelectScreen: 'clock_quiz',
        },
        {
          accent: 'emerald',
          description: 'Перевіряйте дати, дні тижня і місяці в коротких завданнях.',
          emoji: '📅',
          label: 'Вправи з календарем',
          lessonComponentIds: ['calendar'],
          onSelectScreen: 'calendar_quiz',
        },
        {
          accent: 'amber',
          description: 'Швидка вікторина з додавання в ритмі гри з уроку.',
          emoji: '➕',
          label: 'Вікторина з додавання',
          lessonComponentIds: ['adding'],
          onSelectScreen: 'addition_quiz',
        },
        {
          accent: 'rose',
          description: 'Швидка серія віднімання з миттєвою відповіддю.',
          emoji: '➖',
          label: 'Вікторина з віднімання',
          lessonComponentIds: ['subtracting'],
          onSelectScreen: 'subtraction_quiz',
        },
        {
          accent: 'violet',
          description: 'Перевіряйте таблицю множення в короткій вікторині.',
          emoji: '✖️',
          label: 'Вікторина з множення',
          lessonComponentIds: ['multiplication'],
          onSelectScreen: 'multiplication_quiz',
        },
        {
          accent: 'emerald',
          description: 'Швидка вікторина з ділення на рівні групи.',
          emoji: '➗',
          label: 'Вікторина з ділення',
          lessonComponentIds: ['division'],
          onSelectScreen: 'division_quiz',
        },
        {
          accent: 'violet',
          description: 'Розпізнавайте фігури, симетрію та периметри в коротких викликах.',
          emoji: '🔷',
          label: 'Вправи з фігурами',
          lessonComponentIds: KANGUR_GEOMETRY_LESSON_COMPONENT_IDS,
          onSelectScreen: 'geometry_quiz',
        },
        {
          accent: 'violet',
          description: 'Доповнюйте послідовності й перевіряйте правила візерунків.',
          emoji: '🔢',
          label: 'Вікторина з візерунків',
          lessonComponentIds: ['logical_patterns'],
          onSelectScreen: 'logical_patterns_quiz',
        },
        {
          accent: 'teal',
          description: 'Групуйте елементи й знаходьте спільні ознаки.',
          emoji: '📦',
          label: 'Вікторина з класифікації',
          lessonComponentIds: ['logical_classification'],
          onSelectScreen: 'logical_classification_quiz',
        },
        {
          accent: 'rose',
          description: 'Добирайте зв’язки й знаходьте правильні аналогії.',
          emoji: '🔗',
          label: 'Вікторина з аналогій',
          lessonComponentIds: ['logical_analogies'],
          onSelectScreen: 'logical_analogies_quiz',
        },
        {
          accent: 'violet',
          description: 'Тренуйте порядок речення, питання і сполучники в коротких раундах.',
          emoji: '🧩',
          label: 'Вікторина з будови речення',
          lessonComponentIds: ['english_sentence_structure'],
          onSelectScreen: 'english_sentence_quiz',
        },
        {
          accent: 'sky',
          description: 'Сортуйте слова за частинами мови в коротких раундах.',
          emoji: '🎮',
          label: 'Вікторина з частин мови',
          lessonComponentIds: ['english_parts_of_speech'],
          onSelectScreen: 'english_parts_of_speech_quiz',
        },
      ],
      recommendation: {
        actions: {
          playAddition: 'Грати в додавання',
          playSubtraction: 'Грати у віднімання',
          playMultiplication: 'Грати в множення',
          playDivision: 'Грати в ділення',
          playClock: 'Грати з годинником',
          startMixedTraining: 'Запустити змішане тренування',
          playFractions: 'Грати в дроби',
          playPowers: 'Грати в степені',
          playRoots: 'Грати в корені',
          practiceCalendar: 'Тренувати календар',
          practiceGeometry: 'Тренувати фігури',
          practiceSubtraction: 'Тренувати віднімання',
          practiceDivision: 'Тренувати ділення',
          practiceMultiplication: 'Тренувати множення',
          startTraining: 'Запустити тренування',
          playNow: 'Грати зараз',
        },
        questLabel: 'Місія дня',
        weakestLesson: {
          description: (masteryPercent) =>
            `Опрацювання ${masteryPercent}%. Один вдалий раунд допоможе швидше закрити цю тему перед наступним уроком.`,
          label: 'Наздоганяємо уроки',
          title: (title) => `Спершу покращ: ${title}`,
        },
        track: {
          descriptionWithActivity: (track, activity) =>
            `Доріжка ${track} зараз найближча до нагороди. Найсильніше її просуває ${activity}.`,
          descriptionDefault: (track) => `Доріжка ${track} зараз найближча до наступного значка.`,
          label: 'Доріжка значків',
          title: (track) => `Розжени доріжку: ${track}`,
        },
        guided: {
          descriptionWithActivity: (summary, activity, nextBadgeName) =>
            `У тебе вже є ${summary} у рекомендованому ритмі. Ще один сильний раунд ${activity} допоможе закрити значок ${nextBadgeName}.`,
          descriptionDefault: (summary, nextBadgeName) =>
            `У тебе вже є ${summary} у рекомендованому ритмі. Ще один сильний раунд допоможе закрити значок ${nextBadgeName}.`,
          label: 'Рекомендований напрям',
          title: (nextBadgeName) => `Закрий: ${nextBadgeName}`,
        },
        fallback: {
          description: (activity, averageXpPerSession) =>
            `${activity} зараз дає в середньому ${averageXpPerSession} XP за гру. Це найкращий хід на наступний раунд.`,
          label: 'Сильна серія',
          title: (activity) => `Грай далі в: ${activity}`,
        },
      },
    };
  }

  if (locale === 'de') {
    return {
      operationSelectorTitle: 'Los geht\'s!',
      trainingSetupTitle: 'Gemischtes Training',
      trainingSetupWordmarkLabel: 'Training',
      trainingSetupDescription:
        'Wahle Niveau, Kategorien und die Anzahl der Fragen fur eine Sitzung.',
      intro: {
        maths: 'Wahle einen Spieltyp und starte direkt mit dem Mathematiktraining.',
        alphabet: 'Wahle ein Buchstabenspiel und ube das Alphabet.',
        art: 'Wahle eine Kunstlektion und entdecke Farben und Formen.',
        music: 'Wahle eine Musiklektion und singe die Toene der diatonischen Tonleiter Schritt fur Schritt.',
        geometry: 'Wahle ein Formenspiel und ube Geometrie.',
        language: 'Wahle einen Sprachspieltyp und starte direkt ins Uben.',
      },
      quickPractice: {
        title: 'Schnelles Uben',
        description: 'Kurze Quizrunden auf Basis von Lektionsthemen.',
        groupAria: (group) => `${group} schnelles Uben`,
        cardAria: (label) => `Schnelles Uben: ${label}`,
        gameChip: 'Spiel',
      },
      lessonQuizDefinitions: [
        {
          accent: 'indigo',
          description: 'Ube das Lesen von Stunden und Minuten im Quizmodus.',
          emoji: '🕐',
          label: 'Uhrzeitubung',
          lessonComponentIds: ['clock'],
          onSelectScreen: 'clock_quiz',
        },
        {
          accent: 'emerald',
          description: 'Prufe Daten, Wochentage und Monate in kurzen Aufgaben.',
          emoji: '📅',
          label: 'Kalenderubung',
          lessonComponentIds: ['calendar'],
          onSelectScreen: 'calendar_quiz',
        },
        {
          accent: 'amber',
          description: 'Ein schnelles Additionsquiz im Rhythmus des Lernspiels.',
          emoji: '➕',
          label: 'Additionsquiz',
          lessonComponentIds: ['adding'],
          onSelectScreen: 'addition_quiz',
        },
        {
          accent: 'rose',
          description: 'Eine schnelle Subtraktionsserie mit sofortiger Antwort.',
          emoji: '➖',
          label: 'Subtraktionsquiz',
          lessonComponentIds: ['subtracting'],
          onSelectScreen: 'subtraction_quiz',
        },
        {
          accent: 'violet',
          description: 'Prufe das Einmaleins in einem kurzen Quiz.',
          emoji: '✖️',
          label: 'Multiplikationsquiz',
          lessonComponentIds: ['multiplication'],
          onSelectScreen: 'multiplication_quiz',
        },
        {
          accent: 'emerald',
          description: 'Ein schnelles Divisionsquiz mit gleichen Gruppen.',
          emoji: '➗',
          label: 'Divisionsquiz',
          lessonComponentIds: ['division'],
          onSelectScreen: 'division_quiz',
        },
        {
          accent: 'violet',
          description: 'Erkenne Formen, Symmetrie und Umfang in kurzen Herausforderungen.',
          emoji: '🔷',
          label: 'Formenubung',
          lessonComponentIds: KANGUR_GEOMETRY_LESSON_COMPONENT_IDS,
          onSelectScreen: 'geometry_quiz',
        },
        {
          accent: 'violet',
          description: 'Erganze Reihen und prufe Musterregeln.',
          emoji: '🔢',
          label: 'Musterquiz',
          lessonComponentIds: ['logical_patterns'],
          onSelectScreen: 'logical_patterns_quiz',
        },
        {
          accent: 'teal',
          description: 'Ordne Elemente und finde gemeinsame Merkmale.',
          emoji: '📦',
          label: 'Klassifikationsquiz',
          lessonComponentIds: ['logical_classification'],
          onSelectScreen: 'logical_classification_quiz',
        },
        {
          accent: 'rose',
          description: 'Ordne Beziehungen zu und finde die passenden Analogien.',
          emoji: '🔗',
          label: 'Analogiequiz',
          lessonComponentIds: ['logical_analogies'],
          onSelectScreen: 'logical_analogies_quiz',
        },
        {
          accent: 'violet',
          description: 'Ube Satzbau, Fragen und Konjunktionen in kurzen Runden.',
          emoji: '🧩',
          label: 'Satzbauquiz',
          lessonComponentIds: ['english_sentence_structure'],
          onSelectScreen: 'english_sentence_quiz',
        },
        {
          accent: 'sky',
          description: 'Sortiere Worter nach Wortarten in kurzen Runden.',
          emoji: '🎮',
          label: 'Wortartenquiz',
          lessonComponentIds: ['english_parts_of_speech'],
          onSelectScreen: 'english_parts_of_speech_quiz',
        },
      ],
      recommendation: {
        actions: {
          playAddition: 'Addition spielen',
          playSubtraction: 'Subtraktion spielen',
          playMultiplication: 'Multiplikation spielen',
          playDivision: 'Division spielen',
          playClock: 'Uhr spielen',
          startMixedTraining: 'Gemischtes Training starten',
          playFractions: 'Bruche spielen',
          playPowers: 'Potenzen spielen',
          playRoots: 'Wurzeln spielen',
          practiceCalendar: 'Kalender uben',
          practiceGeometry: 'Formen uben',
          practiceSubtraction: 'Subtraktion uben',
          practiceDivision: 'Division uben',
          practiceMultiplication: 'Multiplikation uben',
          startTraining: 'Training starten',
          playNow: 'Jetzt spielen',
        },
        questLabel: 'Mission des Tages',
        weakestLesson: {
          description: (masteryPercent) =>
            `Beherrschung ${masteryPercent}%. Eine gute Runde schliesst dieses Thema vor der nachsten Lektion schneller.`,
          label: 'Lektionen nachholen',
          title: (title) => `Zuerst verbessern: ${title}`,
        },
        track: {
          descriptionWithActivity: (track, activity) =>
            `Der Pfad ${track} ist einer Belohnung am nachsten. Gerade schiebt ${activity} ihn am starksten.`,
          descriptionDefault: (track) =>
            `Der Pfad ${track} ist dem nachsten Abzeichen am nachsten.`,
          label: 'Abzeichenpfad',
          title: (track) => `Pfad anschieben: ${track}`,
        },
        guided: {
          descriptionWithActivity: (summary, activity, nextBadgeName) =>
            `Du hast bereits ${summary} im empfohlenen Rhythmus. Noch eine starke Runde ${activity} hilft, das Abzeichen ${nextBadgeName} abzuschliessen.`,
          descriptionDefault: (summary, nextBadgeName) =>
            `Du hast bereits ${summary} im empfohlenen Rhythmus. Noch eine starke Runde hilft, das Abzeichen ${nextBadgeName} abzuschliessen.`,
          label: 'Empfohlene Richtung',
          title: (nextBadgeName) => `Schliesse ab: ${nextBadgeName}`,
        },
        fallback: {
          description: (activity, averageXpPerSession) =>
            `${activity} bringt derzeit durchschnittlich ${averageXpPerSession} XP pro Spiel. Das ist der beste Zug fur die nachste Runde.`,
          label: 'Starke Serie',
          title: (activity) => `Spiel weiter in: ${activity}`,
        },
      },
    };
  }

  if (locale === 'en') {
    return {
      operationSelectorTitle: 'Let\'s play!',
      trainingSetupTitle: 'Mixed training',
      trainingSetupWordmarkLabel: 'Training',
      trainingSetupDescription: 'Choose the level, categories, and number of questions for one session.',
      intro: {
        maths: 'Choose a game type and jump straight into maths practice.',
        alphabet: 'Choose a letter game and practise the alphabet.',
        art: 'Choose an art lesson and explore colors and shapes.',
        music: 'Choose a music lesson and sing the notes of the diatonic scale step by step.',
        geometry: 'Choose a shapes game and practise geometry.',
        language: 'Choose a language game type and jump straight into practice.',
      },
      quickPractice: {
        title: 'Quick practice',
        description: 'Quick quizzes based on lesson topics.',
        groupAria: (group) => `${group} quick practice`,
        cardAria: (label) => `Quick practice: ${label}`,
        gameChip: 'Game',
      },
      lessonQuizDefinitions: [
        {
          accent: 'indigo',
          description: 'Practise reading hours and minutes in quiz mode.',
          emoji: '🕐',
          label: 'Clock practice',
          lessonComponentIds: ['clock'],
          onSelectScreen: 'clock_quiz',
        },
        {
          accent: 'emerald',
          description: 'Check dates, weekdays, and months in short tasks.',
          emoji: '📅',
          label: 'Calendar practice',
          lessonComponentIds: ['calendar'],
          onSelectScreen: 'calendar_quiz',
        },
        {
          accent: 'amber',
          description: 'A quick addition quiz in the rhythm of the lesson game.',
          emoji: '➕',
          label: 'Addition quiz',
          lessonComponentIds: ['adding'],
          onSelectScreen: 'addition_quiz',
        },
        {
          accent: 'rose',
          description: 'A quick subtraction streak with instant feedback.',
          emoji: '➖',
          label: 'Subtraction quiz',
          lessonComponentIds: ['subtracting'],
          onSelectScreen: 'subtraction_quiz',
        },
        {
          accent: 'violet',
          description: 'Check the times table in a short multiplication quiz.',
          emoji: '✖️',
          label: 'Multiplication quiz',
          lessonComponentIds: ['multiplication'],
          onSelectScreen: 'multiplication_quiz',
        },
        {
          accent: 'emerald',
          description: 'A quick division quiz based on equal groups.',
          emoji: '➗',
          label: 'Division quiz',
          lessonComponentIds: ['division'],
          onSelectScreen: 'division_quiz',
        },
        {
          accent: 'violet',
          description: 'Recognize shapes, symmetry, and perimeter in short challenges.',
          emoji: '🔷',
          label: 'Shapes practice',
          lessonComponentIds: KANGUR_GEOMETRY_LESSON_COMPONENT_IDS,
          onSelectScreen: 'geometry_quiz',
        },
        {
          accent: 'violet',
          description: 'Complete sequences and check the rules behind patterns.',
          emoji: '🔢',
          label: 'Patterns quiz',
          lessonComponentIds: ['logical_patterns'],
          onSelectScreen: 'logical_patterns_quiz',
        },
        {
          accent: 'teal',
          description: 'Group items and find shared traits.',
          emoji: '📦',
          label: 'Classification quiz',
          lessonComponentIds: ['logical_classification'],
          onSelectScreen: 'logical_classification_quiz',
        },
        {
          accent: 'rose',
          description: 'Match relationships and find the right analogies.',
          emoji: '🔗',
          label: 'Analogies quiz',
          lessonComponentIds: ['logical_analogies'],
          onSelectScreen: 'logical_analogies_quiz',
        },
        {
          accent: 'violet',
          description: 'Practise sentence order, questions, and conjunctions in short rounds.',
          emoji: '🧩',
          label: 'Sentence structure quiz',
          lessonComponentIds: ['english_sentence_structure'],
          onSelectScreen: 'english_sentence_quiz',
        },
        {
          accent: 'sky',
          description: 'Sort words by parts of speech in short rounds.',
          emoji: '🎮',
          label: 'Parts of speech quiz',
          lessonComponentIds: ['english_parts_of_speech'],
          onSelectScreen: 'english_parts_of_speech_quiz',
        },
      ],
      recommendation: {
        actions: {
          playAddition: 'Play addition',
          playSubtraction: 'Play subtraction',
          playMultiplication: 'Play multiplication',
          playDivision: 'Play division',
          playClock: 'Play the clock',
          startMixedTraining: 'Start mixed training',
          playFractions: 'Play fractions',
          playPowers: 'Play powers',
          playRoots: 'Play roots',
          practiceCalendar: 'Practise calendar',
          practiceGeometry: 'Practise shapes',
          practiceSubtraction: 'Practise subtraction',
          practiceDivision: 'Practise division',
          practiceMultiplication: 'Practise multiplication',
          startTraining: 'Start training',
          playNow: 'Play now',
        },
        questLabel: 'Mission of the day',
        weakestLesson: {
          description: (masteryPercent) =>
            `Mastery ${masteryPercent}%. One good round will close this topic faster before the next lesson.`,
          label: 'Recover lessons',
          title: (title) => `Fix first: ${title}`,
        },
        track: {
          descriptionWithActivity: (track, activity) =>
            `The ${track} track is closest to a reward. Right now ${activity} pushes it the most.`,
          descriptionDefault: (track) => `The ${track} track is closest to the next badge.`,
          label: 'Badge track',
          title: (track) => `Push the track: ${track}`,
        },
        guided: {
          descriptionWithActivity: (summary, activity, nextBadgeName) =>
            `You already have ${summary} in the recommended rhythm. One more strong round of ${activity} will help finish the ${nextBadgeName} badge.`,
          descriptionDefault: (summary, nextBadgeName) =>
            `You already have ${summary} in the recommended rhythm. One more strong round will help finish the ${nextBadgeName} badge.`,
          label: 'Recommended direction',
          title: (nextBadgeName) => `Finish: ${nextBadgeName}`,
        },
        fallback: {
          description: (activity, averageXpPerSession) =>
            `${activity} is currently worth about ${averageXpPerSession} XP per game. It is the best move for the next round.`,
          label: 'Strong streak',
          title: (activity) => `Keep playing: ${activity}`,
        },
      },
    };
  }

  return {
    operationSelectorTitle: 'Grajmy!',
    trainingSetupTitle: 'Trening mieszany',
    trainingSetupWordmarkLabel: 'Trening',
    trainingSetupDescription: 'Dobierz poziom, kategorie i liczbę pytań do jednej sesji.',
    intro: {
      maths: 'Wybierz rodzaj gry i przejdź od razu do matematycznej zabawy.',
      alphabet: 'Wybierz literową zabawę i ćwicz alfabet.',
      art: 'Wybierz lekcję plastyczną i odkrywaj kolory oraz kształty.',
      music: 'Wybierz lekcję muzyki i śpiewaj dźwięki skali diatonicznej krok po kroku.',
      geometry: 'Wybierz zabawę z kształtami i ćwicz geometrię.',
      language: 'Wybierz typ gry językowej i przejdź od razu do ćwiczeń.',
    },
    quickPractice: {
      title: 'Szybkie ćwiczenia',
      description: 'Szybkie quizy oparte na tematach z Lekcji.',
      groupAria: (group) => `${group} szybkie ćwiczenia`,
      cardAria: (label) => `Szybkie ćwiczenie: ${label}`,
      gameChip: 'Gra',
    },
    lessonQuizDefinitions: [
      {
        accent: 'indigo',
        description: 'Ćwicz odczytywanie godzin i minut w trybie quizu.',
        emoji: '🕐',
        label: 'Ćwiczenia z Zegarem',
        lessonComponentIds: ['clock'],
        onSelectScreen: 'clock_quiz',
      },
      {
        accent: 'emerald',
        description: 'Sprawdź daty, dni tygodnia i miesiące w krótkich zadaniach.',
        emoji: '📅',
        label: 'Ćwiczenia z Kalendarzem',
        lessonComponentIds: ['calendar'],
        onSelectScreen: 'calendar_quiz',
      },
      {
        accent: 'amber',
        description: 'Szybki quiz z dodawania w rytmie gry z lekcji.',
        emoji: '➕',
        label: 'Quiz dodawania',
        lessonComponentIds: ['adding'],
        onSelectScreen: 'addition_quiz',
      },
      {
        accent: 'rose',
        description: 'Szybka seria odejmowania z natychmiastową odpowiedzią.',
        emoji: '➖',
        label: 'Quiz odejmowania',
        lessonComponentIds: ['subtracting'],
        onSelectScreen: 'subtraction_quiz',
      },
      {
        accent: 'violet',
        description: 'Sprawdź tabliczkę w krótkim quizie z mnożenia.',
        emoji: '✖️',
        label: 'Quiz mnożenia',
        lessonComponentIds: ['multiplication'],
        onSelectScreen: 'multiplication_quiz',
      },
      {
        accent: 'emerald',
        description: 'Szybki quiz z dzielenia na równe grupy.',
        emoji: '➗',
        label: 'Quiz dzielenia',
        lessonComponentIds: ['division'],
        onSelectScreen: 'division_quiz',
      },
      {
        accent: 'violet',
        description: 'Rozpoznawaj figury, symetrię i obwody w krótkich wyzwaniach.',
        emoji: '🔷',
        label: 'Ćwiczenia z Figurami',
        lessonComponentIds: KANGUR_GEOMETRY_LESSON_COMPONENT_IDS,
        onSelectScreen: 'geometry_quiz',
      },
      {
        accent: 'violet',
        description: 'Uzupełniaj ciągi i sprawdzaj reguły wzorców.',
        emoji: '🔢',
        label: 'Quiz wzorców',
        lessonComponentIds: ['logical_patterns'],
        onSelectScreen: 'logical_patterns_quiz',
      },
      {
        accent: 'teal',
        description: 'Grupuj elementy i znajdź wspólne cechy.',
        emoji: '📦',
        label: 'Quiz klasyfikacji',
        lessonComponentIds: ['logical_classification'],
        onSelectScreen: 'logical_classification_quiz',
      },
      {
        accent: 'rose',
        description: 'Dopasuj relacje i znajdź właściwe analogie.',
        emoji: '🔗',
        label: 'Quiz analogii',
        lessonComponentIds: ['logical_analogies'],
        onSelectScreen: 'logical_analogies_quiz',
      },
      {
        accent: 'violet',
        description: 'Ćwicz szyk zdania, pytania i spójniki w krótkich rundach.',
        emoji: '🧩',
        label: 'Quiz składni zdania',
        lessonComponentIds: ['english_sentence_structure'],
        onSelectScreen: 'english_sentence_quiz',
      },
      {
        accent: 'sky',
        description: 'Sortuj słowa według części mowy w krótkich rundach.',
        emoji: '🎮',
        label: 'Quiz części mowy',
        lessonComponentIds: ['english_parts_of_speech'],
        onSelectScreen: 'english_parts_of_speech_quiz',
      },
    ],
    recommendation: {
      actions: {
        playAddition: 'Zagraj w dodawanie',
        playSubtraction: 'Zagraj w odejmowanie',
        playMultiplication: 'Zagraj w mnożenie',
        playDivision: 'Zagraj w dzielenie',
        playClock: 'Zagraj na zegarze',
        startMixedTraining: 'Uruchom trening mieszany',
        playFractions: 'Zagraj we ułamki',
        playPowers: 'Zagraj w potęgi',
        playRoots: 'Zagraj w pierwiastki',
        practiceCalendar: 'Ćwicz kalendarz',
        practiceGeometry: 'Ćwicz figury',
        practiceSubtraction: 'Ćwicz odejmowanie',
        practiceDivision: 'Ćwicz dzielenie',
        practiceMultiplication: 'Ćwicz mnożenie',
        startTraining: 'Uruchom trening',
        playNow: 'Zagraj teraz',
      },
      questLabel: 'Misja dnia',
      weakestLesson: {
        description: (masteryPercent) =>
          `Opanowanie ${masteryPercent}%. Jedna dobra runda pomoże szybciej domknąć ten temat przed kolejną lekcją.`,
        label: 'Nadrabiamy lekcje',
        title: (title) => `Najpierw popraw: ${title}`,
      },
      track: {
        descriptionWithActivity: (track, activity) =>
          `Tor ${track} jest najbliżej nagrody. Najmocniej pcha go teraz ${activity}.`,
        descriptionDefault: (track) => `Tor ${track} jest najbliżej kolejnej odznaki.`,
        label: 'Tor odznak',
        title: (track) => `Rozpędź tor: ${track}`,
      },
      guided: {
        descriptionWithActivity: (summary, activity, nextBadgeName) =>
          `Masz już ${summary} w polecanym rytmie. Jeszcze jedna mocna runda ${activity} pomoże domknąć odznakę ${nextBadgeName}.`,
        descriptionDefault: (summary, nextBadgeName) =>
          `Masz już ${summary} w polecanym rytmie. Jeszcze jedna mocna runda pomoże domknąć odznakę ${nextBadgeName}.`,
        label: 'Polecony kierunek',
        title: (nextBadgeName) => `Dopnij: ${nextBadgeName}`,
      },
      fallback: {
        description: (activity, averageXpPerSession) =>
          `${activity} daje teraz średnio ${averageXpPerSession} XP na grę. To najlepszy ruch na kolejną rundę.`,
        label: 'Mocna passa',
        title: (activity) => `Zagraj dalej w: ${activity}`,
      },
    },
  };
};

const OPERATION_LESSON_QUIZ_SCREENS: Partial<Record<KangurOperation, KangurGameScreen>> = {
  addition: 'addition_quiz',
  subtraction: 'subtraction_quiz',
  multiplication: 'multiplication_quiz',
  division: 'division_quiz',
  clock: 'clock_quiz',
};

type KangurRecommendedSelectorScreen = Extract<
  KangurGameScreen,
  | 'operation'
  | 'calendar_quiz'
  | 'geometry_quiz'
  | 'subtraction_quiz'
  | 'division_quiz'
  | 'multiplication_quiz'
>;

type KangurOperationSelectorRecommendationTarget =
  | {
      kind: 'operation';
      difficulty: KangurDifficulty;
      operation: KangurOperation;
    }
  | {
      kind: 'training';
    }
  | {
      kind: 'screen';
      screen: KangurRecommendedSelectorScreen;
    };

type KangurOperationSelectorRecommendation = {
  accent: KangurAccent;
  actionLabel: string;
  description: string;
  label: string;
  recommendedOperation: KangurOperation | null;
  recommendedScreen: KangurRecommendedSelectorScreen | null;
  target: KangurOperationSelectorRecommendationTarget;
  title: string;
};

const resolveRecommendationDifficulty = (accuracy: number): KangurDifficulty => {
  if (accuracy >= 85) {
    return 'hard';
  }
  if (accuracy >= 70) {
    return 'medium';
  }
  return 'easy';
};

const resolveLessonRecommendationTarget = (
  componentId: string | null | undefined,
  averageAccuracy: number
): KangurOperationSelectorRecommendationTarget | null => {
  if (!componentId) {
    return null;
  }

  const difficulty = resolveRecommendationDifficulty(averageAccuracy);

  switch (componentId) {
    case 'clock':
      return { kind: 'operation', difficulty, operation: 'clock' };
    case 'calendar':
      return { kind: 'screen', screen: 'calendar_quiz' };
    case 'adding':
      return { kind: 'operation', difficulty, operation: 'addition' };
    case 'subtracting':
      return { kind: 'operation', difficulty, operation: 'subtraction' };
    case 'multiplication':
      return { kind: 'operation', difficulty, operation: 'multiplication' };
    case 'division':
      return { kind: 'operation', difficulty, operation: 'division' };
    case 'geometry_basics':
    case 'geometry_shapes':
    case 'geometry_symmetry':
    case 'geometry_perimeter':
      return { kind: 'screen', screen: 'geometry_quiz' };
    case 'art_colors_harmony':
    case 'art_shapes_basic':
    case 'music_diatonic_scale':
      return { kind: 'screen', screen: 'operation' };
    default:
      return { kind: 'training' };
  }
};

const resolveActivityRecommendationTarget = (
  activityKey: string | null | undefined,
  averageAccuracy: number
): KangurOperationSelectorRecommendationTarget | null => {
  if (!activityKey) {
    return null;
  }

  const parts = activityKey.split(':');
  const primary = (parts[1] ?? parts[0] ?? '').trim();
  if (!primary) {
    return null;
  }

  if (primary === 'calendar') {
    return { kind: 'screen', screen: 'calendar_quiz' };
  }
  if (
    primary === 'geometry' ||
    (primary.startsWith('geometry_') && primary !== 'geometry_shape_recognition')
  ) {
    return { kind: 'screen', screen: 'geometry_quiz' };
  }

  return resolveLessonRecommendationTarget(primary, averageAccuracy);
};

const resolveActionRecommendationTarget = (
  action: KangurRouteAction | undefined,
  progress: KangurProgressState
): KangurOperationSelectorRecommendationTarget | null => {
  if (!action) {
    return null;
  }

  const averageAccuracy = getProgressAverageAccuracy(progress);
  if (action.page === 'Game') {
    const quickStart = action.query?.['quickStart'];
    if (quickStart === 'training') {
      return { kind: 'training' };
    }
    if (quickStart === 'operation') {
      const requestedOperation = action.query?.['operation'] ?? null;
      const difficulty = action.query?.['difficulty'];
      if (requestedOperation === 'mixed') {
        return { kind: 'training' };
      }
      if (
        requestedOperation &&
        [
          'addition',
          'subtraction',
          'multiplication',
          'division',
          'decimals',
          'powers',
          'roots',
          'clock',
        ].includes(requestedOperation)
      ) {
        return {
          kind: 'operation',
          difficulty:
            difficulty === 'easy' || difficulty === 'medium' || difficulty === 'hard'
              ? difficulty
              : resolveRecommendationDifficulty(averageAccuracy),
          operation: requestedOperation as KangurOperation,
        };
      }
    }
  }

  if (action.page === 'Lessons') {
    return resolveLessonRecommendationTarget(action.query?.['focus'], averageAccuracy);
  }

  return null;
};

const getRecommendationActionLabel = (
  target: KangurOperationSelectorRecommendationTarget,
  fallbackCopy: OperationSelectorFallbackCopy,
  translate?: RecommendationTranslate
): string => {
  const operationLabels: Partial<Record<KangurOperation, { fallback: string; key: string }>> = {
    addition: { fallback: fallbackCopy.recommendation.actions.playAddition, key: 'operationSelector.actions.playAddition' },
    subtraction: { fallback: fallbackCopy.recommendation.actions.playSubtraction, key: 'operationSelector.actions.playSubtraction' },
    multiplication: { fallback: fallbackCopy.recommendation.actions.playMultiplication, key: 'operationSelector.actions.playMultiplication' },
    division: { fallback: fallbackCopy.recommendation.actions.playDivision, key: 'operationSelector.actions.playDivision' },
    clock: { fallback: fallbackCopy.recommendation.actions.playClock, key: 'operationSelector.actions.playClock' },
    mixed: { fallback: fallbackCopy.recommendation.actions.startMixedTraining, key: 'operationSelector.actions.startMixedTraining' },
    decimals: { fallback: fallbackCopy.recommendation.actions.playFractions, key: 'operationSelector.actions.playFractions' },
    powers: { fallback: fallbackCopy.recommendation.actions.playPowers, key: 'operationSelector.actions.playPowers' },
    roots: { fallback: fallbackCopy.recommendation.actions.playRoots, key: 'operationSelector.actions.playRoots' },
  };

  if (target.kind === 'training') {
    return translateRecommendationWithFallback(
      translate,
      'operationSelector.actions.startMixedTraining',
      fallbackCopy.recommendation.actions.startMixedTraining
    );
  }

  if (target.kind === 'screen') {
    if (target.screen === 'calendar_quiz') {
      return translateRecommendationWithFallback(
        translate,
        'operationSelector.actions.practiceCalendar',
        fallbackCopy.recommendation.actions.practiceCalendar
      );
    }
    if (target.screen === 'geometry_quiz') {
      return translateRecommendationWithFallback(
        translate,
        'operationSelector.actions.practiceGeometry',
        fallbackCopy.recommendation.actions.practiceGeometry
      );
    }
    if (target.screen === 'subtraction_quiz') {
      return translateRecommendationWithFallback(
        translate,
        'operationSelector.actions.practiceSubtraction',
        fallbackCopy.recommendation.actions.practiceSubtraction
      );
    }
    if (target.screen === 'division_quiz') {
      return translateRecommendationWithFallback(
        translate,
        'operationSelector.actions.practiceDivision',
        fallbackCopy.recommendation.actions.practiceDivision
      );
    }
    if (target.screen === 'multiplication_quiz') {
      return translateRecommendationWithFallback(
        translate,
        'operationSelector.actions.practiceMultiplication',
        fallbackCopy.recommendation.actions.practiceMultiplication
      );
    }
    return translateRecommendationWithFallback(
      translate,
      'operationSelector.actions.startTraining',
      fallbackCopy.recommendation.actions.startTraining
    );
  }

  const operationLabel = operationLabels[target.operation];
  return operationLabel
    ? translateRecommendationWithFallback(translate, operationLabel.key, operationLabel.fallback)
    : translateRecommendationWithFallback(
        translate,
        'operationSelector.actions.playNow',
        fallbackCopy.recommendation.actions.playNow
      );
};

const finalizeRecommendation = (
  draft: Omit<
    KangurOperationSelectorRecommendation,
    'actionLabel' | 'recommendedOperation' | 'recommendedScreen'
  >,
  fallbackCopy: OperationSelectorFallbackCopy,
  translate?: RecommendationTranslate
): KangurOperationSelectorRecommendation => ({
  ...draft,
  actionLabel: getRecommendationActionLabel(draft.target, fallbackCopy, translate),
  recommendedOperation: draft.target.kind === 'operation' ? draft.target.operation : null,
  recommendedScreen: draft.target.kind === 'screen' ? draft.target.screen : null,
});

const getQuestRecommendation = (
  quest: KangurDailyQuestState | null,
  progress: KangurProgressState,
  fallbackCopy: OperationSelectorFallbackCopy,
  translate?: RecommendationTranslate
): KangurOperationSelectorRecommendation | null => {
  if (!quest?.assignment) {
    return null;
  }

  const target = resolveActionRecommendationTarget(quest.assignment.action, progress);
  if (!target) {
    return null;
  }

  return finalizeRecommendation({
    accent: quest.progress.status === 'completed' ? 'emerald' : 'indigo',
    description:
      quest.assignment.progressLabel ??
      quest.progress.summary ??
      quest.assignment.description,
    label:
      quest.assignment.questLabel ??
      translateRecommendationWithFallback(
        translate,
        'operationSelector.quest.label',
        fallbackCopy.recommendation.questLabel
      ),
    target,
    title: quest.assignment.title,
  }, fallbackCopy, translate);
};

const getWeakestLessonRecommendation = (
  progress: KangurProgressState,
  fallbackCopy: OperationSelectorFallbackCopy,
  localizer?: KangurRecommendationLocalizer
): KangurOperationSelectorRecommendation | null => {
  const translate = localizer?.translate;
  const weakestLesson = Object.entries(progress.lessonMastery ?? {})
    .filter(([, entry]) => entry.attempts > 0 && entry.masteryPercent < 80)
    .sort((left, right) => left[1].masteryPercent - right[1].masteryPercent)[0];

  if (!weakestLesson) {
    return null;
  }

  const [componentId, entry] = weakestLesson;
  const lesson = KANGUR_LESSON_LIBRARY[componentId as KangurLessonComponentId];
  const target = resolveLessonRecommendationTarget(
    componentId,
    getProgressAverageAccuracy(progress)
  );
  if (!lesson || !target) {
    return null;
  }
  const lessonTitle = getLocalizedKangurLessonTitle(componentId, localizer?.locale, lesson.title);

  return finalizeRecommendation({
    accent: entry.masteryPercent < 60 ? 'rose' : 'amber',
    description: translateRecommendationWithFallback(
      translate,
      'operationSelector.weakestLesson.description',
      fallbackCopy.recommendation.weakestLesson.description(entry.masteryPercent),
      {
        masteryPercent: entry.masteryPercent,
      }
    ),
    label: translateRecommendationWithFallback(
      translate,
      'operationSelector.weakestLesson.label',
      fallbackCopy.recommendation.weakestLesson.label
    ),
    target,
    title: translateRecommendationWithFallback(
      translate,
      'operationSelector.weakestLesson.title',
      fallbackCopy.recommendation.weakestLesson.title(lessonTitle),
      { title: lessonTitle }
    ),
  }, fallbackCopy, translate);
};

const getTrackRecommendation = (
  progress: KangurProgressState,
  fallbackCopy: OperationSelectorFallbackCopy,
  translate?: RecommendationTranslate,
  progressTranslate?: KangurProgressTranslate
): KangurOperationSelectorRecommendation | null => {
  const progressLocalizer = { translate: progressTranslate };
  const track =
    getProgressBadgeTrackSummaries(progress, { maxTracks: 6 }, progressLocalizer).find(
      (entry) =>
        Boolean(entry.nextBadge) && (entry.unlockedCount > 0 || entry.progressPercent >= 40)
    ) ?? null;
  const topActivity = getProgressTopActivities(progress, 1, progressLocalizer)[0] ?? null;
  const activityLabel = topActivity
    ? resolveLocalizedRecommendationActivityLabel({
        activityKey: topActivity.key,
        fallbackLabel: topActivity.label,
        translate,
      })
    : null;

  if (!track?.nextBadge) {
    return null;
  }

  const target =
    resolveActivityRecommendationTarget(
      topActivity?.key,
      topActivity?.averageAccuracy ?? getProgressAverageAccuracy(progress)
    ) ?? ({ kind: 'training' } as const);

  return finalizeRecommendation({
    accent: 'violet',
    description: topActivity
      ? translateRecommendationWithFallback(
          translate,
          'operationSelector.track.descriptionWithActivity',
          fallbackCopy.recommendation.track.descriptionWithActivity(
            track.label,
            activityLabel?.toLowerCase() ?? ''
          ),
          {
            activity: activityLabel?.toLowerCase() ?? '',
            track: track.label,
          }
        )
      : translateRecommendationWithFallback(
          translate,
          'operationSelector.track.descriptionDefault',
          fallbackCopy.recommendation.track.descriptionDefault(track.label),
          { track: track.label }
        ),
    label: translateRecommendationWithFallback(
      translate,
      'operationSelector.track.label',
      fallbackCopy.recommendation.track.label
    ),
    target,
    title: translateRecommendationWithFallback(
      translate,
      'operationSelector.track.title',
      fallbackCopy.recommendation.track.title(track.label),
      { track: track.label }
    ),
  }, fallbackCopy, translate);
};

const getGuidedRecommendation = (
  progress: KangurProgressState,
  fallbackCopy: OperationSelectorFallbackCopy,
  translate?: RecommendationTranslate,
  progressTranslate?: KangurProgressTranslate
): KangurOperationSelectorRecommendation | null => {
  const progressLocalizer = { translate: progressTranslate };
  const guidedMomentum = getRecommendedSessionMomentum(progress, progressLocalizer);
  if (guidedMomentum.completedSessions <= 0 || !guidedMomentum.nextBadgeName) {
    return null;
  }

  const topActivity = getProgressTopActivities(progress, 1, progressLocalizer)[0] ?? null;
  const activityLabel = topActivity
    ? resolveLocalizedRecommendationActivityLabel({
        activityKey: topActivity.key,
        fallbackLabel: topActivity.label,
        translate,
      })
    : null;
  const target =
    resolveActivityRecommendationTarget(
      topActivity?.key,
      topActivity?.averageAccuracy ?? getProgressAverageAccuracy(progress)
    ) ?? ({ kind: 'training' } as const);

  return finalizeRecommendation({
    accent: 'sky',
    description: topActivity
      ? translateRecommendationWithFallback(
          translate,
          'operationSelector.guided.descriptionWithActivity',
          fallbackCopy.recommendation.guided.descriptionWithActivity(
            guidedMomentum.summary,
            activityLabel?.toLowerCase() ?? '',
            guidedMomentum.nextBadgeName
          ),
          {
            activity: activityLabel?.toLowerCase() ?? '',
            nextBadgeName: guidedMomentum.nextBadgeName,
            summary: guidedMomentum.summary,
          }
        )
      : translateRecommendationWithFallback(
          translate,
          'operationSelector.guided.descriptionDefault',
          fallbackCopy.recommendation.guided.descriptionDefault(
            guidedMomentum.summary,
            guidedMomentum.nextBadgeName
          ),
          {
            nextBadgeName: guidedMomentum.nextBadgeName,
            summary: guidedMomentum.summary,
          }
        ),
    label: translateRecommendationWithFallback(
      translate,
      'operationSelector.guided.label',
      fallbackCopy.recommendation.guided.label
    ),
    target,
    title: translateRecommendationWithFallback(
      translate,
      'operationSelector.guided.title',
      fallbackCopy.recommendation.guided.title(guidedMomentum.nextBadgeName),
      { nextBadgeName: guidedMomentum.nextBadgeName }
    ),
  }, fallbackCopy, translate);
};

const getFallbackRecommendation = (
  progress: KangurProgressState,
  fallbackCopy: OperationSelectorFallbackCopy,
  translate?: RecommendationTranslate,
  progressTranslate?: KangurProgressTranslate
): KangurOperationSelectorRecommendation | null => {
  const topActivity = getProgressTopActivities(progress, 1, { translate: progressTranslate })[0] ?? null;
  if (!topActivity) {
    return null;
  }
  const activityLabel = resolveLocalizedRecommendationActivityLabel({
    activityKey: topActivity.key,
    fallbackLabel: topActivity.label,
    translate,
  });

  const target =
    resolveActivityRecommendationTarget(topActivity.key, topActivity.averageAccuracy) ??
    ({ kind: 'training' } as const);

  return finalizeRecommendation({
    accent: 'indigo',
    description: translateRecommendationWithFallback(
      translate,
      'operationSelector.fallback.description',
      fallbackCopy.recommendation.fallback.description(
        activityLabel,
        topActivity.averageXpPerSession
      ),
      {
        activity: activityLabel,
        averageXpPerSession: topActivity.averageXpPerSession,
      }
    ),
    label: translateRecommendationWithFallback(
      translate,
      'operationSelector.fallback.label',
      fallbackCopy.recommendation.fallback.label
    ),
    target,
    title: translateRecommendationWithFallback(
      translate,
      'operationSelector.fallback.title',
      fallbackCopy.recommendation.fallback.title(activityLabel),
      { activity: activityLabel }
    ),
  }, fallbackCopy, translate);
};

const getOperationSelectorRecommendation = (
  progress: KangurProgressState,
  quest: KangurDailyQuestState | null,
  fallbackCopy: OperationSelectorFallbackCopy,
  localizer?: KangurRecommendationLocalizer
): KangurOperationSelectorRecommendation | null =>
  getQuestRecommendation(quest, progress, fallbackCopy, localizer?.translate) ??
  getWeakestLessonRecommendation(progress, fallbackCopy, localizer) ??
  getGuidedRecommendation(progress, fallbackCopy, localizer?.translate, localizer?.progressTranslate) ??
  getTrackRecommendation(progress, fallbackCopy, localizer?.translate, localizer?.progressTranslate) ??
  getFallbackRecommendation(progress, fallbackCopy, localizer?.translate, localizer?.progressTranslate);

export function KangurGameOperationSelectorWidget(): React.JSX.Element | null {
  const locale = useLocale();
  const isCoarsePointer = useKangurCoarsePointer();
  const normalizedLocale = normalizeSiteLocale(locale);
  const fallbackCopy = useMemo(
    () => getOperationSelectorFallbackCopy(normalizedLocale),
    [normalizedLocale]
  );
  const gamePageTranslations = useTranslations('KangurGamePage');
  const recommendationTranslations = useTranslations('KangurGameRecommendations');
  const trainingSetupTranslations = useTranslations('KangurGameRecommendations.trainingSetup');
  const runtimeTranslations = useTranslations('KangurProgressRuntime');
  const {
    activePracticeAssignment,
    basePath,
    handleHome,
    handleSelectOperation,
    handleStartTraining,
    practiceAssignmentsByOperation,
    progress,
    screen,
    setScreen,
  } = useKangurGameRuntime();
  const { subject, subjectKey } = useKangurSubjectFocus();
  const { ageGroup } = useKangurAgeGroupFocus();
  const subjectGroups = useMemo(() => getKangurSubjectGroups(locale), [locale]);
  const trainingSectionRef = useRef<HTMLElement | null>(null);
  const normalizedProgress = useMemo(() => {
    const defaults = createDefaultKangurProgressState();
    return {
      ...defaults,
      ...progress,
      badges: progress.badges ?? defaults.badges,
      operationsPlayed: progress.operationsPlayed ?? defaults.operationsPlayed,
      lessonMastery: progress.lessonMastery ?? defaults.lessonMastery,
      openedTasks: progress.openedTasks ?? defaults.openedTasks,
      lessonPanelProgress: progress.lessonPanelProgress ?? defaults.lessonPanelProgress,
      activityStats: progress.activityStats ?? defaults.activityStats,
    };
  }, [progress]);
  const dailyQuest = useMemo(
    () =>
      getCurrentKangurDailyQuest(normalizedProgress, {
        locale: normalizedLocale,
        ownerKey: subjectKey,
        subject,
        translate: runtimeTranslations,
      }),
    [normalizedLocale, normalizedProgress, runtimeTranslations, subject, subjectKey]
  );
  const recommendation = useMemo(
    () =>
      getOperationSelectorRecommendation(normalizedProgress, dailyQuest, fallbackCopy, {
        locale: normalizedLocale,
        translate: recommendationTranslations,
        progressTranslate: runtimeTranslations,
      }),
    [
      dailyQuest,
      fallbackCopy,
      normalizedLocale,
      normalizedProgress,
      recommendationTranslations,
      runtimeTranslations,
    ]
  );
  const suggestedTraining = useMemo(
    () =>
      getRecommendedTrainingSetup(normalizedProgress, {
        locale,
        translate: trainingSetupTranslations,
        progressTranslate: runtimeTranslations,
      }),
    [locale, normalizedProgress, runtimeTranslations, trainingSetupTranslations]
  );
  const operationSelectorTitle = translateRecommendationWithFallback(
    gamePageTranslations,
    'operationSelector.title',
    fallbackCopy.operationSelectorTitle
  );
  const trainingSetupTitle = translateRecommendationWithFallback(
    gamePageTranslations,
    'screens.training.label',
    fallbackCopy.trainingSetupTitle
  );
  const trainingWordmarkLabel = translateRecommendationWithFallback(
    gamePageTranslations,
    'screens.training.wordmarkLabel',
    fallbackCopy.trainingSetupWordmarkLabel
  );
  const lessonsQuery = useKangurLessons({ subject, ageGroup, enabledOnly: true });
  const emptyLessonsRefetchedForSubject = useRef<KangurLessonSubject | null>(null);
  const lessonQuizOptions = useMemo<LessonQuizOption[]>(() => {
    const enabledLessons = lessonsQuery.data ?? [];
    const lessonsByComponentId = new Map(
      enabledLessons.map((lesson) => [lesson.componentId, lesson] as const)
    );
    const componentSortOrder = new Map(
      KANGUR_LESSON_COMPONENT_ORDER.map((componentId, index) => [componentId, index] as const)
    );
    const resolveFallbackSortOrder = (componentIds: readonly KangurLessonComponentId[]): number => {
      const orders = componentIds
        .map((componentId) => componentSortOrder.get(componentId))
        .filter((order): order is number => typeof order === 'number');

      return orders.length > 0 ? Math.min(...orders) : Number.MAX_SAFE_INTEGER;
    };

    const options = fallbackCopy.lessonQuizDefinitions.flatMap((definition) => {
      const activeLessons = definition.lessonComponentIds
        .map((componentId) => lessonsByComponentId.get(componentId))
        .filter((lesson): lesson is KangurLesson => Boolean(lesson));

      if (activeLessons.length === 0) {
        const fallbackLessons = definition.lessonComponentIds
          .map((componentId) => KANGUR_LESSON_LIBRARY[componentId])
          .filter((lesson): lesson is KangurLessonTemplate => Boolean(lesson));

        if (fallbackLessons.length === 0) {
          return [];
        }

        const primaryLesson = fallbackLessons[0]!;
        return [
          {
            ...definition,
            subject: primaryLesson.subject,
            sortOrder: resolveFallbackSortOrder(definition.lessonComponentIds),
          },
        ];
      }

      const primaryLesson = activeLessons[0]!;
      const sortOrder = Math.min(...activeLessons.map((lesson) => lesson.sortOrder));

      return [
        {
          ...definition,
          subject: primaryLesson.subject,
          sortOrder,
        },
      ];
    });
    return options.sort((left, right) => left.sortOrder - right.sortOrder);
  }, [fallbackCopy.lessonQuizDefinitions, lessonsQuery.data, subject]);
  const lessonQuizGroups = useMemo(
    () =>
      subjectGroups.map((group) => ({
        ...group,
        options: lessonQuizOptions.filter((option) => option.subject === group.value),
      })).filter((group) => group.options.length > 0),
    [lessonQuizOptions, subjectGroups]
  );
  const filteredLessonQuizGroups = useMemo(
    () => lessonQuizGroups.filter((group) => group.value === subject),
    [lessonQuizGroups, subject]
  );
  const recommendedLessonQuizScreen = useMemo(() => {
    if (!recommendation) {
      return null;
    }

    if (recommendation.target.kind === 'screen') {
      return recommendation.target.screen;
    }

    if (recommendation.target.kind === 'operation') {
      return OPERATION_LESSON_QUIZ_SCREENS[recommendation.target.operation] ?? null;
    }

    return null;
  }, [recommendation]);
  const mixedPracticeAssignment =
    practiceAssignmentsByOperation.mixed ??
    (activePracticeAssignment?.target.operation === 'mixed' ? activePracticeAssignment : null);
  const operationPracticeAssignment =
    activePracticeAssignment && activePracticeAssignment.target.operation !== 'mixed'
      ? activePracticeAssignment
      : null;
  const shouldRender = screen === 'operation' || screen === 'training';
  const showMathSections = subject === 'maths';
  const isSixYearOld = ageGroup === 'six_year_old';
  const compactActionClassName = isCoarsePointer
    ? 'w-full min-h-11 px-4 touch-manipulation select-none active:scale-[0.97] sm:w-auto'
    : 'w-full shrink-0 sm:w-auto';
  const gameIntroDescriptionLabel =
    subject === 'maths'
      ? translateRecommendationWithFallback(
          gamePageTranslations,
          'operationSelector.intro.maths',
          fallbackCopy.intro.maths
        )
      : subject === 'alphabet'
        ? translateRecommendationWithFallback(
            gamePageTranslations,
            'operationSelector.intro.alphabet',
            fallbackCopy.intro.alphabet
          )
        : subject === 'art'
          ? translateRecommendationWithFallback(
              gamePageTranslations,
              'operationSelector.intro.art',
              fallbackCopy.intro.art
            )
          : subject === 'music'
            ? translateRecommendationWithFallback(
                gamePageTranslations,
                'operationSelector.intro.music',
                fallbackCopy.intro.music
              )
        : subject === 'geometry'
          ? translateRecommendationWithFallback(
              gamePageTranslations,
              'operationSelector.intro.geometry',
              fallbackCopy.intro.geometry
            )
        : translateRecommendationWithFallback(
            gamePageTranslations,
            'operationSelector.intro.language',
            fallbackCopy.intro.language
          );
  const subjectVisual = getKangurSixYearOldSubjectVisual(subject);
  const quickPracticeTitle = translateRecommendationWithFallback(
    gamePageTranslations,
    'operationSelector.quickPractice.title',
    fallbackCopy.quickPractice.title
  );
  const quickPracticeDescription = translateRecommendationWithFallback(
    gamePageTranslations,
    'operationSelector.quickPractice.description',
    fallbackCopy.quickPractice.description
  );
  const quickPracticeGameChipLabel = translateRecommendationWithFallback(
    gamePageTranslations,
    'operationSelector.quickPractice.gameChip',
    fallbackCopy.quickPractice.gameChip
  );
  const gameIntroDescription = isSixYearOld ? (
    <KangurVisualCueContent
      className='text-lg'
      detail={
        <span className='inline-flex items-center gap-1.5 text-lg'>
          {subjectVisual.introSteps.map((stepIcon, index) => (
            <span key={`six-year-old-intro-step-${subject}-${index}`}>{stepIcon}</span>
          ))}
        </span>
      }
      detailTestId='kangur-game-operation-intro-detail'
      icon={subjectVisual.icon}
      iconClassName='text-xl'
      iconTestId='kangur-game-operation-intro-icon'
      label={gameIntroDescriptionLabel}
    />
  ) : (
    gameIntroDescriptionLabel
  );

  useEffect(() => {
    if (!lessonsQuery.data) {
      return;
    }
    if (lessonsQuery.data.length > 0) {
      emptyLessonsRefetchedForSubject.current = null;
      return;
    }
    if (lessonsQuery.isFetching) {
      return;
    }
    if (emptyLessonsRefetchedForSubject.current === subject) {
      return;
    }

    emptyLessonsRefetchedForSubject.current = subject;
    void lessonsQuery.refetch();
  }, [lessonsQuery.data, lessonsQuery.isFetching, lessonsQuery.refetch, subject]);

  useEffect(() => {
    if (subject === 'maths') {
      return;
    }

    if (screen === 'training') {
      setScreen('operation');
    }
  }, [screen, setScreen, subject]);

  useEffect(() => {
    if (screen !== 'training') {
      return;
    }

    trainingSectionRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }, [screen]);

  if (!shouldRender) {
    return null;
  }

  const handleRecommendationSelect = (): void => {
    if (!recommendation) {
      return;
    }

    if (recommendation.target.kind === 'training') {
      if (screen === 'training') {
        trainingSectionRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
      } else {
        setScreen('training');
      }
      return;
    }

    if (recommendation.target.kind === 'screen') {
      setScreen(recommendation.target.screen);
      return;
    }

    handleSelectOperation(recommendation.target.operation, recommendation.target.difficulty, {
      recommendation: {
        description: recommendation.description,
        label: recommendation.label,
        source: 'operation_selector',
        title: recommendation.title,
      },
    });
  };

  return (
    <div className={`w-full flex flex-col items-center ${KANGUR_PANEL_GAP_CLASSNAME}`}>
      <KangurPageIntroCard
        className='max-w-md'
        description={
          gameIntroDescription
        }
        headingSize='lg'
        onBack={handleHome}
        testId='kangur-game-operation-top-section'
        title={operationSelectorTitle}
        visualTitle={
          <KangurGrajmyWordmark
            className='mx-auto'
            data-testid='kangur-grajmy-heading-art'
            idPrefix='kangur-game-operation-heading'
            label={operationSelectorTitle}
            locale={locale}
          />
        }
      />
      {showMathSections && operationPracticeAssignment ? (
        <div className='flex w-full justify-center px-4'>
          <KangurPracticeAssignmentBanner
            assignment={operationPracticeAssignment}
            basePath={basePath}
            mode='queue'
          />
        </div>
      ) : null}
      {recommendation && showMathSections ? (
        <KangurInfoCard
          accent={recommendation.accent}
          className='w-full max-w-3xl rounded-[28px]'
          data-testid='kangur-operation-recommendation-card'
          padding='md'
          tone='accent'
        >
          <KangurPanelRow className='sm:items-start sm:justify-between'>
            <div className='min-w-0'>
              <KangurStatusChip
                accent={recommendation.accent}
                className='text-[11px] uppercase tracking-[0.16em]'
                data-testid='kangur-operation-recommendation-label'
                size='sm'
              >
                {recommendation.label}
              </KangurStatusChip>
              <p
                className='mt-3 break-words text-lg font-extrabold [color:var(--kangur-page-text)]'
                data-testid='kangur-operation-recommendation-title'
              >
                {recommendation.title}
              </p>
              <p
                className='mt-1 break-words text-sm [color:var(--kangur-page-muted-text)]'
                data-testid='kangur-operation-recommendation-description'
              >
                {recommendation.description}
              </p>
            </div>
            <KangurButton
              className={compactActionClassName}
              data-testid='kangur-operation-recommendation-action'
              size='sm'
              type='button'
              variant='surface'
              onClick={handleRecommendationSelect}
              >
                {recommendation.actionLabel}
              </KangurButton>
          </KangurPanelRow>
        </KangurInfoCard>
      ) : null}
      {showMathSections ? (
        <OperationSelector
          onSelect={handleSelectOperation}
          priorityAssignmentsByOperation={practiceAssignmentsByOperation}
          recommendedLabel={recommendation?.label}
          recommendedOperation={recommendation?.recommendedOperation}
        />
      ) : null}
      <section
        aria-labelledby='kangur-game-quick-practice-heading'
        className='w-full max-w-3xl space-y-4'
      >
        <KangurSectionHeading
          accent='violet'
          align='left'
          description={
            isSixYearOld ? (
              <KangurVisualCueContent
                detail={
                  <span className='inline-flex items-center gap-1.5 text-lg'>
                    <span>🎮</span>
                    <span>⚡</span>
                    <span>🎯</span>
                  </span>
                }
                detailTestId='kangur-quick-practice-description-detail'
                icon='👆'
                iconClassName='text-xl'
                iconTestId='kangur-quick-practice-description-icon'
                label={quickPracticeDescription}
              />
            ) : (
              quickPracticeDescription
            )
          }
          headingAs='h3'
          headingSize='sm'
          title={
            (isSixYearOld ? (
              <KangurVisualCueContent
                detail='🎮'
                detailClassName='text-lg'
                detailTestId='kangur-quick-practice-heading-detail'
                icon='⚡'
                iconClassName='text-xl'
                iconTestId='kangur-quick-practice-heading-icon'
                label={quickPracticeTitle}
              />
            ) : (
              quickPracticeTitle
            ))
          }
          titleId='kangur-game-quick-practice-heading'
        />
        <div className={`flex w-full flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}>
          {filteredLessonQuizGroups.map((group) => (
            <KangurSubjectGroupSection
              key={group.value}
              ariaLabel={translateRecommendationWithFallback(
                gamePageTranslations,
                'operationSelector.quickPractice.groupAria',
                fallbackCopy.quickPractice.groupAria(group.label),
                { group: group.label }
              )}
              label={
                isSixYearOld ? (
                  <KangurVisualCueContent
                    detail={getKangurSixYearOldSubjectVisual(group.value).detail}
                    detailClassName='text-base'
                    detailTestId={`kangur-quick-practice-group-detail-${group.value}`}
                    icon={getKangurSixYearOldSubjectVisual(group.value).icon}
                    iconClassName='text-lg'
                    iconTestId={`kangur-quick-practice-group-icon-${group.value}`}
                    label={group.label}
                  />
                ) : (
                  group.label
                )
              }
              className={`flex w-full flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}
            >
              <div className='flex w-full flex-col kangur-panel-gap'>
                {group.options.map((option) => {
                  const isRecommended = recommendedLessonQuizScreen === option.onSelectScreen;
                  const optionLabel = translateRecommendationWithFallback(
                    gamePageTranslations,
                    `screens.${option.onSelectScreen}.label`,
                    option.label
                  );
                  const optionDescription = translateRecommendationWithFallback(
                    gamePageTranslations,
                    `screens.${option.onSelectScreen}.description`,
                    option.description
                  );

                  return (
                    <KangurIconSummaryOptionCard
                      key={option.onSelectScreen}
                      accent={option.accent}
                      buttonClassName='w-full rounded-[24px] p-4 text-left sm:rounded-[28px] sm:p-5'
                      data-doc-id='home_quick_practice_action'
                      data-testid={`kangur-quick-practice-card-${option.onSelectScreen}`}
                      emphasis='accent'
                      aria-label={translateRecommendationWithFallback(
                        gamePageTranslations,
                        'operationSelector.quickPractice.cardAria',
                        fallbackCopy.quickPractice.cardAria(optionLabel),
                        { label: optionLabel }
                      )}
                      onClick={() => setScreen(option.onSelectScreen)}
                    >
                      <KangurIconSummaryCardContent
                        aside={
                          <>
                            <KangurStatusChip
                              accent={option.accent}
                              aria-label={quickPracticeGameChipLabel}
                              className='uppercase tracking-[0.14em]'
                              data-testid={`kangur-quick-practice-game-chip-${option.onSelectScreen}`}
                              size='sm'
                            >
                              {isSixYearOld ? (
                                <KangurVisualCueContent
                                  icon='🎮'
                                  iconClassName='text-base'
                                  iconTestId={`kangur-quick-practice-game-chip-icon-${option.onSelectScreen}`}
                                  label={quickPracticeGameChipLabel}
                                />
                              ) : (
                                quickPracticeGameChipLabel
                              )}
                            </KangurStatusChip>
                            {isRecommended && recommendation ? (
                              <KangurStatusChip
                                accent={option.accent}
                                aria-label={recommendation.label}
                                className='text-[11px] font-semibold'
                                data-testid={`kangur-quick-practice-recommendation-${option.onSelectScreen}`}
                                size='sm'
                              >
                                {isSixYearOld ? (
                                  <KangurVisualCueContent
                                    icon='🎯'
                                    iconClassName='text-base'
                                    iconTestId={`kangur-quick-practice-recommendation-icon-${option.onSelectScreen}`}
                                    label={recommendation.label}
                                  />
                                ) : (
                                  recommendation.label
                                )}
                              </KangurStatusChip>
                            ) : null}
                          </>
                        }
                        asideClassName={`${KANGUR_WRAP_START_ROW_CLASSNAME} w-full sm:w-auto sm:flex-col sm:items-end sm:gap-2`}
                        className={`w-full ${KANGUR_RELAXED_ROW_CLASSNAME} items-start sm:items-center`}
                        contentClassName='w-full sm:flex-1'
                        description={optionDescription}
                        descriptionClassName='text-slate-500'
                        headerClassName={`${KANGUR_TIGHT_ROW_CLASSNAME} items-start sm:items-start sm:justify-between`}
                        icon={
                          <KangurIconBadge
                            accent={option.accent}
                            className='shrink-0 scale-90 sm:scale-100'
                            size='xl'
                          >
                            {option.emoji}
                          </KangurIconBadge>
                        }
                        title={optionLabel}
                        titleClassName='text-slate-800'
                        titleWrapperClassName='w-full'
                      />
                    </KangurIconSummaryOptionCard>
                  );
                })}
              </div>
            </KangurSubjectGroupSection>
          ))}
        </div>
      </section>
      {showMathSections ? (
        <section
          aria-labelledby='kangur-game-training-heading'
          className='w-full max-w-3xl space-y-4'
          ref={trainingSectionRef}
        >
          <KangurPageIntroCard
            className='w-full'
            description={translateRecommendationWithFallback(
              gamePageTranslations,
              'screens.training.description',
              fallbackCopy.trainingSetupDescription
            )}
            headingAs='h3'
            headingSize='md'
            onBack={handleHome}
            showBackButton={false}
            testId='kangur-game-training-top-section'
            title={trainingSetupTitle}
            titleId='kangur-game-training-heading'
            visualTitle={
              <KangurTreningWordmark
                className='mx-auto'
                data-testid='kangur-training-heading-art'
                idPrefix='kangur-game-training-heading'
                label={trainingWordmarkLabel}
                locale={locale}
              />
            }
          />
          {mixedPracticeAssignment ? (
            <div className='flex w-full justify-center px-4'>
              <KangurPracticeAssignmentBanner
                assignment={mixedPracticeAssignment}
                basePath={basePath}
                mode='active'
              />
            </div>
          ) : null}
          <KangurGameSetupMomentumCard mode='training' progress={normalizedProgress} />
          <KangurTrainingSetupPanel
            onStart={(selection, options) => handleStartTraining(selection, options)}
            suggestedTraining={suggestedTraining}
          />
        </section>
      ) : null}
    </div>
  );
}
