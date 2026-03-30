import {
  resolveKangurLessonTemplateComponentContent,
} from '@/features/kangur/lessons/lesson-template-component-content';
import {
  type LessonTranslate,
  translateLessonShellTitle,
} from '@/features/kangur/ui/components/lesson-copy';
import type {
  KangurLessonTemplate,
  KangurLogicalClassificationLessonTemplateContent,
} from '@/shared/contracts/kangur-lesson-templates';

const resolveTranslationValue = (
  content: KangurLogicalClassificationLessonTemplateContent,
  key: string,
): string | null => {
  const value = key.split('.').reduce<unknown>((current, part) => {
    if (!current || typeof current !== 'object' || Array.isArray(current)) {
      return null;
    }
    return (current as Record<string, unknown>)[part] ?? null;
  }, content as unknown);

  return typeof value === 'string' ? value : null;
};

export const createLogicalClassificationLessonTranslate = (
  content: KangurLogicalClassificationLessonTemplateContent,
): LessonTranslate => (key) => {
  const resolved = resolveTranslationValue(content, key);
  if (resolved) {
    return resolved;
  }

  return key;
};

export const createLogicalClassificationLessonContentFromTranslate = (
  translate: LessonTranslate,
): KangurLogicalClassificationLessonTemplateContent => ({
  kind: 'logical_classification',
  lessonTitle: translate('lessonTitle'),
  sections: {
    intro: {
      title: translate('sections.intro.title'),
      description: translate('sections.intro.description'),
    },
    diagram: {
      title: translate('sections.diagram.title'),
      description: translate('sections.diagram.description'),
    },
    intruz: {
      title: translate('sections.intruz.title'),
      description: translate('sections.intruz.description'),
    },
    podsumowanie: {
      title: translate('sections.podsumowanie.title'),
      description: translate('sections.podsumowanie.description'),
    },
    game: {
      title: translate('sections.game.title'),
      description: translate('sections.game.description'),
    },
  },
  slides: {
    intro: {
      basics: {
        title: translate('slides.intro.basics.title'),
        lead: translate('slides.intro.basics.lead'),
        caption: translate('slides.intro.basics.caption'),
        criteriaLabel: translate('slides.intro.basics.criteriaLabel'),
        criteria: {
          color: translate('slides.intro.basics.criteria.color'),
          shape: translate('slides.intro.basics.criteria.shape'),
          size: translate('slides.intro.basics.criteria.size'),
          category: translate('slides.intro.basics.criteria.category'),
          number: translate('slides.intro.basics.criteria.number'),
        },
      },
      grouping: {
        title: translate('slides.intro.grouping.title'),
        lead: translate('slides.intro.grouping.lead'),
        caption: translate('slides.intro.grouping.caption'),
        cards: {
          flyingAnimals: {
            title: translate('slides.intro.grouping.cards.flyingAnimals.title'),
            items: translate('slides.intro.grouping.cards.flyingAnimals.items'),
            note: translate('slides.intro.grouping.cards.flyingAnimals.note'),
          },
          waterAnimals: {
            title: translate('slides.intro.grouping.cards.waterAnimals.title'),
            items: translate('slides.intro.grouping.cards.waterAnimals.items'),
            note: translate('slides.intro.grouping.cards.waterAnimals.note'),
          },
          evenNumbers: {
            title: translate('slides.intro.grouping.cards.evenNumbers.title'),
            items: translate('slides.intro.grouping.cards.evenNumbers.items'),
            note: translate('slides.intro.grouping.cards.evenNumbers.note'),
          },
          oddNumbers: {
            title: translate('slides.intro.grouping.cards.oddNumbers.title'),
            items: translate('slides.intro.grouping.cards.oddNumbers.items'),
            note: translate('slides.intro.grouping.cards.oddNumbers.note'),
          },
        },
      },
      shapeSorting: {
        title: translate('slides.intro.shapeSorting.title'),
        lead: translate('slides.intro.shapeSorting.lead'),
        caption: translate('slides.intro.shapeSorting.caption'),
        cards: {
          circles: {
            title: translate('slides.intro.shapeSorting.cards.circles.title'),
            items: translate('slides.intro.shapeSorting.cards.circles.items'),
            note: translate('slides.intro.shapeSorting.cards.circles.note'),
          },
          squares: {
            title: translate('slides.intro.shapeSorting.cards.squares.title'),
            items: translate('slides.intro.shapeSorting.cards.squares.items'),
            note: translate('slides.intro.shapeSorting.cards.squares.note'),
          },
        },
      },
      categories: {
        title: translate('slides.intro.categories.title'),
        lead: translate('slides.intro.categories.lead'),
        caption: translate('slides.intro.categories.caption'),
        examplesLabel: translate('slides.intro.categories.examplesLabel'),
        examples: {
          fruit: translate('slides.intro.categories.examples.fruit'),
          vegetables: translate('slides.intro.categories.examples.vegetables'),
          toys: translate('slides.intro.categories.examples.toys'),
        },
      },
    },
    diagram: {
      multiCriteria: {
        title: translate('slides.diagram.multiCriteria.title'),
        lead: translate('slides.diagram.multiCriteria.lead'),
        gridCaption: translate('slides.diagram.multiCriteria.gridCaption'),
        axesCaption: translate('slides.diagram.multiCriteria.axesCaption'),
        exampleLabel: translate('slides.diagram.multiCriteria.exampleLabel'),
        items: {
          bigRed: {
            label: translate('slides.diagram.multiCriteria.items.bigRed.label'),
            icons: translate('slides.diagram.multiCriteria.items.bigRed.icons'),
          },
          bigBlue: {
            label: translate('slides.diagram.multiCriteria.items.bigBlue.label'),
            icons: translate('slides.diagram.multiCriteria.items.bigBlue.icons'),
          },
          smallRed: {
            label: translate('slides.diagram.multiCriteria.items.smallRed.label'),
            icons: translate('slides.diagram.multiCriteria.items.smallRed.icons'),
          },
          smallBlue: {
            label: translate('slides.diagram.multiCriteria.items.smallBlue.label'),
            icons: translate('slides.diagram.multiCriteria.items.smallBlue.icons'),
          },
        },
        summary: translate('slides.diagram.multiCriteria.summary'),
      },
      venn: {
        title: translate('slides.diagram.venn.title'),
        lead: translate('slides.diagram.venn.lead'),
        overlapCaption: translate('slides.diagram.venn.overlapCaption'),
        unionCaption: translate('slides.diagram.venn.unionCaption'),
        exampleLabel: translate('slides.diagram.venn.exampleLabel'),
        zones: {
          onlySport: {
            label: translate('slides.diagram.venn.zones.onlySport.label'),
            icons: translate('slides.diagram.venn.zones.onlySport.icons'),
          },
          both: {
            label: translate('slides.diagram.venn.zones.both.label'),
            icons: translate('slides.diagram.venn.zones.both.icons'),
          },
          onlyMusic: {
            label: translate('slides.diagram.venn.zones.onlyMusic.label'),
            icons: translate('slides.diagram.venn.zones.onlyMusic.icons'),
          },
        },
      },
      switchCriteria: {
        title: translate('slides.diagram.switchCriteria.title'),
        lead: translate('slides.diagram.switchCriteria.lead'),
        caption: translate('slides.diagram.switchCriteria.caption'),
        pickLabel: translate('slides.diagram.switchCriteria.pickLabel'),
        tips: {
          first: translate('slides.diagram.switchCriteria.tips.first'),
          second: translate('slides.diagram.switchCriteria.tips.second'),
        },
      },
    },
    intruz: {
      level1: {
        title: translate('slides.intruz.level1.title'),
        lead: translate('slides.intruz.level1.lead'),
        caption: translate('slides.intruz.level1.caption'),
        examples: {
          fruits: {
            items: translate('slides.intruz.level1.examples.fruits.items'),
            answer: translate('slides.intruz.level1.examples.fruits.answer'),
          },
          numbers: {
            items: translate('slides.intruz.level1.examples.numbers.items'),
            answer: translate('slides.intruz.level1.examples.numbers.answer'),
          },
          animals: {
            items: translate('slides.intruz.level1.examples.animals.items'),
            answer: translate('slides.intruz.level1.examples.animals.answer'),
          },
        },
      },
      level2: {
        title: translate('slides.intruz.level2.title'),
        lead: translate('slides.intruz.level2.lead'),
        caption: translate('slides.intruz.level2.caption'),
        examples: {
          multiples: {
            items: translate('slides.intruz.level2.examples.multiples.items'),
            answer: translate('slides.intruz.level2.examples.multiples.answer'),
          },
          space: {
            items: translate('slides.intruz.level2.examples.space.items'),
            answer: translate('slides.intruz.level2.examples.space.answer'),
          },
          shapes: {
            items: translate('slides.intruz.level2.examples.shapes.items'),
            answer: translate('slides.intruz.level2.examples.shapes.answer'),
          },
        },
      },
      level3: {
        title: translate('slides.intruz.level3.title'),
        lead: translate('slides.intruz.level3.lead'),
        caption: translate('slides.intruz.level3.caption'),
        examples: {
          shape: {
            items: translate('slides.intruz.level3.examples.shape.items'),
            answer: translate('slides.intruz.level3.examples.shape.answer'),
          },
          color: {
            items: translate('slides.intruz.level3.examples.color.items'),
            answer: translate('slides.intruz.level3.examples.color.answer'),
          },
        },
      },
    },
    podsumowanie: {
      overview: {
        title: translate('slides.podsumowanie.overview.title'),
        caption: translate('slides.podsumowanie.overview.caption'),
        items: {
          classification: translate('slides.podsumowanie.overview.items.classification'),
          manyCriteria: translate('slides.podsumowanie.overview.items.manyCriteria'),
          venn: translate('slides.podsumowanie.overview.items.venn'),
          oddOneOut1: translate('slides.podsumowanie.overview.items.oddOneOut1'),
          oddOneOut2: translate('slides.podsumowanie.overview.items.oddOneOut2'),
          oddOneOut3: translate('slides.podsumowanie.overview.items.oddOneOut3'),
        },
        closing: translate('slides.podsumowanie.overview.closing'),
      },
      color: {
        title: translate('slides.podsumowanie.color.title'),
        caption: translate('slides.podsumowanie.color.caption'),
      },
      shape: {
        title: translate('slides.podsumowanie.shape.title'),
        caption: translate('slides.podsumowanie.shape.caption'),
      },
      parity: {
        title: translate('slides.podsumowanie.parity.title'),
        caption: translate('slides.podsumowanie.parity.caption'),
      },
      twoCriteria: {
        title: translate('slides.podsumowanie.twoCriteria.title'),
        caption: translate('slides.podsumowanie.twoCriteria.caption'),
      },
      intersection: {
        title: translate('slides.podsumowanie.intersection.title'),
        caption: translate('slides.podsumowanie.intersection.caption'),
      },
      oddOneOut: {
        title: translate('slides.podsumowanie.oddOneOut.title'),
        caption: translate('slides.podsumowanie.oddOneOut.caption'),
      },
    },
  },
  game: {
    gameTitle: translateLessonShellTitle(translate, 'game', ''),
  },
});

export const resolveLogicalClassificationLessonContent = (
  template: KangurLessonTemplate | null | undefined,
  fallbackTranslate: LessonTranslate,
): KangurLogicalClassificationLessonTemplateContent => {
  if (!template?.componentContent) {
    return createLogicalClassificationLessonContentFromTranslate(fallbackTranslate);
  }

  const resolved = resolveKangurLessonTemplateComponentContent(
    'logical_classification',
    template.componentContent,
  );

  if (resolved?.kind === 'logical_classification') {
    return resolved;
  }

  return createLogicalClassificationLessonContentFromTranslate(fallbackTranslate);
};
