import {
  resolveKangurLessonTemplateComponentContent,
} from '@/features/kangur/lessons/lesson-template-component-content';
import type {
  KangurLessonTemplate,
  KangurMultiplicationLessonTemplateContent,
} from '@/shared/contracts/kangur-lesson-templates';

export const MULTIPLICATION_LESSON_COMPONENT_CONTENT: KangurMultiplicationLessonTemplateContent = {
  kind: 'multiplication',
  lessonTitle: 'Mnożenie',
  sections: {
    intro: {
      title: 'Co to mnożenie?',
      description: 'Mnożenie jako powtarzane dodawanie',
    },
    tabela23: {
      title: 'Tabliczka × 2 i × 3',
      description: 'Tabliczka mnożenia dla 2 i 3',
    },
    tabela45: {
      title: 'Tabliczka × 4 i × 5',
      description: 'Tabliczka mnożenia dla 4 i 5',
    },
    triki: {
      title: 'Triki mnożenia',
      description: 'Szybkie zasady do zapamiętania',
    },
    gameArray: {
      title: 'Gra z grupami',
      description: 'Zbieraj grupy kropek — odkryj mnożenie!',
    },
  },
  slides: {
    intro: {
      meaning: {
        title: 'Co to znaczy mnożyć?',
        lead: 'Mnożenie zbiera powtarzane grupy w jedno krótkie działanie.',
        patternChip: 'Powtarzamy',
        patternCaption: 'Trzy takie same porcje.',
        equation: '3 × 3 = 9',
        equationCaption: 'To samo co 3 + 3 + 3.',
      },
      groups: {
        title: 'Mnożenie jako grupy',
        lead: 'Gdy masz równe grupy, liczysz grupy i liczbę elementów w każdej.',
        groupsChip: 'Równe grupy',
        equation: '3 × 4 = 12',
        caption: '3 grupy, po 4 elementy.',
      },
    },
    tabela23: {
      basics: {
        title: 'Tabliczka mnożenia × 2 i × 3',
        lead: 'Dwójki i trójki mają rytm: liczymy skokami po osi.',
        skipCountChip: 'Skoki na osi',
        caption: '0 → 2 → 4 → 6 i 0 → 3 → 6 → 9.',
      },
    },
    tabela45: {
      basics: {
        title: 'Tabliczka mnożenia × 4 i × 5',
        lead: 'Czwórki to podwójne dwójki, a piątki mają rytm co pięć.',
        doubleChip: '×4 = podwójnie',
        doubleCaption: 'Podwój, potem jeszcze raz.',
        rhythmChip: '×5 = rytm',
        rhythmCaption: 'Wynik kończy się na 0 lub 5.',
      },
      array: {
        title: 'Rzędy w tablicy',
        lead: 'Tablica pokazuje rzędy i kolumny, które liczymy raz i mnożymy.',
        arrayChip: 'Tablica',
        equation: '4 + 4 + 4 = 12',
        caption: 'Trzy rzędy po cztery.',
      },
    },
    triki: {
      shortcuts: {
        title: 'Triki do zapamiętania',
        lead: 'Zapamiętaj kilka skrótów, które przyspieszają liczenie.',
        rules: [
          '✖️ × 1 = ta sama liczba: 7×1=7',
          '✖️ × 2 = podwójnie: 6×2=12',
          '✖️ × 5 = kończy się na 0 lub 5: 7×5=35',
          '✖️ × 10 = dodaj zero: 8×10=80',
          '✅ Kolejność nie ma znaczenia: 3×4=4×3',
        ],
        tenShiftChip: '×10 w sekundę',
        tenShiftCaption: 'Dopisz 0 i gotowe.',
      },
      commutative: {
        title: 'Kolejność czynników',
        lead: '3 × 4 to to samo co 4 × 3.',
        swapChip: 'Zamiana miejsc',
        caption: 'Zamiana czynników nie zmienia wyniku.',
      },
    },
  },
  game: {
    preludeChip: 'Zobacz grupy',
    preludeCaption: 'Łącz równe grupy kropek, aby zobaczyć mnożenie.',
    stageTitle: 'Gra z grupami!',
  },
};

export const resolveMultiplicationLessonContent = (
  template: KangurLessonTemplate | null | undefined,
): KangurMultiplicationLessonTemplateContent => {
  if (!template?.componentContent) {
    return MULTIPLICATION_LESSON_COMPONENT_CONTENT;
  }

  const resolved = resolveKangurLessonTemplateComponentContent(
    'multiplication',
    template.componentContent,
  );

  return resolved?.kind === 'multiplication'
    ? resolved
    : MULTIPLICATION_LESSON_COMPONENT_CONTENT;
};
