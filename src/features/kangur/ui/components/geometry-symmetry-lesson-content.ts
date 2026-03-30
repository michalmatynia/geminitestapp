import {
  resolveKangurLessonTemplateComponentContent,
} from '@/features/kangur/lessons/lesson-template-component-content';
import {
  type LessonTranslate,
  translateLessonShellTitle,
} from '@/features/kangur/ui/components/lesson-copy';
import type {
  KangurGeometrySymmetryLessonTemplateContent,
  KangurLessonTemplate,
} from '@/shared/contracts/kangur-lesson-templates';

const resolveTranslationValue = (
  content: KangurGeometrySymmetryLessonTemplateContent,
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

export const createGeometrySymmetryLessonTranslate = (
  content: KangurGeometrySymmetryLessonTemplateContent,
): LessonTranslate => (key) => {
  const resolved = resolveTranslationValue(content, key);
  if (resolved) {
    return resolved;
  }

  return key;
};

export const createGeometrySymmetryLessonContentFromTranslate = (
  translate: LessonTranslate,
): KangurGeometrySymmetryLessonTemplateContent => ({
  kind: 'geometry_symmetry',
  lessonTitle: translate('lessonTitle'),
  sections: {
    intro: {
      title: translate('sections.intro.title'),
      description: translate('sections.intro.description'),
    },
    os: {
      title: translate('sections.os.title'),
      description: translate('sections.os.description'),
    },
    figury: {
      title: translate('sections.figury.title'),
      description: translate('sections.figury.description'),
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
      whatIsSymmetry: {
        title: translate('slides.intro.whatIsSymmetry.title'),
        lead: translate('slides.intro.whatIsSymmetry.lead'),
        callout: translate('slides.intro.whatIsSymmetry.callout'),
        note: translate('slides.intro.whatIsSymmetry.note'),
      },
      mirrorSymmetry: {
        title: translate('slides.intro.mirrorSymmetry.title'),
        lead: translate('slides.intro.mirrorSymmetry.lead'),
        caption: translate('slides.intro.mirrorSymmetry.caption'),
      },
    },
    os: {
      axisOfSymmetry: {
        title: translate('slides.os.axisOfSymmetry.title'),
        lead: translate('slides.os.axisOfSymmetry.lead'),
        caption: translate('slides.os.axisOfSymmetry.caption'),
        note: translate('slides.os.axisOfSymmetry.note'),
      },
      axisInPractice: {
        title: translate('slides.os.axisInPractice.title'),
        lead: translate('slides.os.axisInPractice.lead'),
        caption: translate('slides.os.axisInPractice.caption'),
      },
    },
    figury: {
      symmetricShapes: {
        title: translate('slides.figury.symmetricShapes.title'),
        circleNote: translate('slides.figury.symmetricShapes.circleNote'),
        cards: {
          square: translate('slides.figury.symmetricShapes.cards.square'),
          rectangle: translate('slides.figury.symmetricShapes.cards.rectangle'),
          circle: translate('slides.figury.symmetricShapes.cards.circle'),
          isoscelesTriangle: translate('slides.figury.symmetricShapes.cards.isoscelesTriangle'),
          zigzag: translate('slides.figury.symmetricShapes.cards.zigzag'),
          irregularPolygon: translate('slides.figury.symmetricShapes.cards.irregularPolygon'),
        },
      },
      symmetricOrNot: {
        title: translate('slides.figury.symmetricOrNot.title'),
        caption: translate('slides.figury.symmetricOrNot.caption'),
      },
      rotational: {
        title: translate('slides.figury.rotational.title'),
        caption: translate('slides.figury.rotational.caption'),
      },
    },
    podsumowanie: {
      overview: {
        title: translate('slides.podsumowanie.overview.title'),
        items: {
          item1: translate('slides.podsumowanie.overview.items.item1'),
          item2: translate('slides.podsumowanie.overview.items.item2'),
          item3: translate('slides.podsumowanie.overview.items.item3'),
          item4: translate('slides.podsumowanie.overview.items.item4'),
        },
      },
      axis: {
        title: translate('slides.podsumowanie.axis.title'),
        caption: translate('slides.podsumowanie.axis.caption'),
      },
      manyAxes: {
        title: translate('slides.podsumowanie.manyAxes.title'),
        caption: translate('slides.podsumowanie.manyAxes.caption'),
      },
      mirror: {
        title: translate('slides.podsumowanie.mirror.title'),
        caption: translate('slides.podsumowanie.mirror.caption'),
      },
      rotation: {
        title: translate('slides.podsumowanie.rotation.title'),
        caption: translate('slides.podsumowanie.rotation.caption'),
      },
    },
  },
  game: {
    gameTitle: translateLessonShellTitle(translate, 'game', ''),
  },
});

export const resolveGeometrySymmetryLessonContent = (
  template: KangurLessonTemplate | null | undefined,
  fallbackTranslate: LessonTranslate,
): KangurGeometrySymmetryLessonTemplateContent => {
  if (!template?.componentContent) {
    return createGeometrySymmetryLessonContentFromTranslate(fallbackTranslate);
  }

  const resolved = resolveKangurLessonTemplateComponentContent(
    'geometry_symmetry',
    template.componentContent,
  );

  if (resolved?.kind === 'geometry_symmetry') {
    return resolved;
  }

  return createGeometrySymmetryLessonContentFromTranslate(fallbackTranslate);
};
