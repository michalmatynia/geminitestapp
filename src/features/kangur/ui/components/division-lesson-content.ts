import {
  resolveKangurLessonTemplateComponentContent,
} from '@/features/kangur/lessons/lesson-template-component-content';
import type {
  KangurDivisionLessonTemplateContent,
  KangurLessonTemplate,
} from '@/shared/contracts/kangur-lesson-templates';

export const DIVISION_LESSON_COMPONENT_CONTENT: KangurDivisionLessonTemplateContent = {
  kind: 'division',
  lessonTitle: 'Dzielenie',
  sections: {
    intro: {
      title: 'Co to dzielenie?',
      description: 'Podział na równe grupy',
    },
    odwrotnosc: {
      title: 'Dzielenie i mnożenie',
      description: 'Odwrotne działania',
    },
    reszta: {
      title: 'Reszta z dzielenia',
      description: 'Gdy nie wychodzi równo',
    },
    zapamietaj: {
      title: 'Zapamiętaj!',
      description: 'Ważne zasady dzielenia',
    },
    game: {
      title: 'Gra z dzieleniem',
      description: 'Podziel elementy na równe grupy',
    },
  },
  slides: {
    intro: {
      meaning: {
        title: 'Co to znaczy dzielić?',
        lead: 'Dzielenie to równy podział na grupy. Pytamy: ile w każdej grupie?',
        exampleCaption: '6 ciastek podzielone na 2 osoby',
        equation: '6 ÷ 2 = 3',
        groupOne: '🧒🍪🍪🍪',
        groupTwo: '🧒🍪🍪🍪',
      },
      equalGroupsAnimation: {
        title: 'Dzielenie w ruchu (SVG)',
        lead: 'Dzielimy równo: każda grupa dostaje tyle samo elementów.',
        equation: '12 ÷ 3 = 4',
        caption: '3 grupy po 4.',
      },
    },
    odwrotnosc: {
      basics: {
        title: 'Dzielenie i mnożenie',
        lead: 'Każde mnożenie ma swoje dzielenie!',
        multiplicationEquation: '4 × 3 = 12',
        divisionEquationA: '12 ÷ 4 = 3',
        divisionEquationB: '12 ÷ 3 = 4',
        caption: 'Znając tabliczkę mnożenia, znasz też tabliczkę dzielenia!',
      },
      animation: {
        title: 'Odwrotność w animacji',
        lead: 'Dzielenie i mnożenie to odwrotne działania.',
        caption: 'Jeśli 4 × 3 = 12, to 12 ÷ 3 = 4.',
      },
    },
    reszta: {
      basics: {
        title: 'Reszta z dzielenia',
        lead: 'Nie zawsze dzielenie wychodzi równo — wtedy zostaje reszta.',
        promptEquation: '7 ÷ 2 = ?',
        reasoningCaption: '2×3=6 (za mało), 2×4=8 (za dużo)',
        resultEquation: '7 ÷ 2 = 3 reszta 1',
        exampleEmojiRow: '🍫🍫🍫🍫🍫🍫🍫',
        exampleCaption: '7 czekolad → 3 dla każdego, 1 zostaje',
      },
      animation: {
        title: 'Reszta w ruchu',
        lead: 'Gdy nie da się podzielić równo, coś zostaje.',
        equation: '7 ÷ 2 = 3 r 1',
        caption: '3 pełne pary i 1 zostaje.',
      },
    },
    zapamietaj: {
      rules: {
        title: 'Zapamiętaj!',
        items: [
          '✅ Podziel przez 1 = ta sama liczba: 9÷1=9',
          '✅ Podziel przez siebie = 1: 5÷5=1',
          '✅ 0 podzielone przez cokolwiek = 0: 0÷4=0',
          '✅ Reszta jest zawsze mniejsza od dzielnika',
          '✅ Sprawdź: wynik × dzielnik + reszta = liczba',
        ],
      },
      equalGroups: {
        title: 'Równe grupy',
        caption: 'Dziel równo na grupy – każda grupa ma tyle samo.',
      },
      inverse: {
        title: 'Odwrotność',
        caption: 'Dzielenie i mnożenie to działania odwrotne.',
      },
      remainder: {
        title: 'Reszta',
        caption: 'Reszta pokazuje, co zostaje poza pełnymi grupami.',
      },
    },
  },
  game: {
    stageTitle: 'Gra z dzieleniem!',
  },
};

export const resolveDivisionLessonContent = (
  template: KangurLessonTemplate | null | undefined,
): KangurDivisionLessonTemplateContent => {
  if (!template?.componentContent) {
    return DIVISION_LESSON_COMPONENT_CONTENT;
  }

  const resolved = resolveKangurLessonTemplateComponentContent(
    'division',
    template.componentContent,
  );

  return resolved?.kind === 'division' ? resolved : DIVISION_LESSON_COMPONENT_CONTENT;
};
