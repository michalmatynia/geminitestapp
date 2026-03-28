import {
  resolveKangurLessonTemplateComponentContent,
} from '@/features/kangur/lessons/lesson-template-component-content';
import {
  type LessonTranslate,
  translateLessonValueWithLegacyKey,
} from '@/features/kangur/ui/components/lesson-copy';
import type {
  KangurGeometryShapesLessonTemplateContent,
  KangurLessonTemplate,
} from '@/shared/contracts/kangur-lesson-templates';

const resolveTranslationValue = (
  content: KangurGeometryShapesLessonTemplateContent,
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

export const createGeometryShapesLessonTranslate = (
  content: KangurGeometryShapesLessonTemplateContent,
): LessonTranslate => (key) => {
  const resolved = resolveTranslationValue(content, key);
  if (resolved) {
    return resolved;
  }

  return key;
};

export const createGeometryShapesLessonContentFromTranslate = (
  translate: LessonTranslate,
): KangurGeometryShapesLessonTemplateContent => ({
  kind: 'geometry_shapes',
  lessonTitle: translate('lessonTitle'),
  shapeCards: {
    circle: {
      name: translate('shapeCards.circle.name'),
      details: translate('shapeCards.circle.details'),
    },
    triangle: {
      name: translate('shapeCards.triangle.name'),
      details: translate('shapeCards.triangle.details'),
    },
    square: {
      name: translate('shapeCards.square.name'),
      details: translate('shapeCards.square.details'),
    },
    rectangle: {
      name: translate('shapeCards.rectangle.name'),
      details: translate('shapeCards.rectangle.details'),
    },
    pentagon: {
      name: translate('shapeCards.pentagon.name'),
      details: translate('shapeCards.pentagon.details'),
    },
    hexagon: {
      name: translate('shapeCards.hexagon.name'),
      details: translate('shapeCards.hexagon.details'),
    },
  },
  sections: {
    podstawowe: {
      title: translate('sections.podstawowe.title'),
      description: translate('sections.podstawowe.description'),
    },
    ileBokow: {
      title: translate('sections.ileBokow.title'),
      description: translate('sections.ileBokow.description'),
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
    podstawowe: {
      intro: {
        title: translate('slides.podstawowe.intro.title'),
        orbitCaption: translate('slides.podstawowe.intro.orbitCaption'),
      },
      outline: {
        title: translate('slides.podstawowe.outline.title'),
        caption: translate('slides.podstawowe.outline.caption'),
      },
      build: {
        title: translate('slides.podstawowe.build.title'),
        caption: translate('slides.podstawowe.build.caption'),
      },
    },
    ileBokow: {
      count: {
        title: translate('slides.ileBokow.count.title'),
      },
      countSides: {
        title: translate('slides.ileBokow.countSides.title'),
        caption: translate('slides.ileBokow.countSides.caption'),
      },
      corners: {
        title: translate('slides.ileBokow.corners.title'),
        caption: translate('slides.ileBokow.corners.caption'),
      },
      segmentSide: {
        title: translate('slides.ileBokow.segmentSide.title'),
        caption: translate('slides.ileBokow.segmentSide.caption'),
      },
      drawSide: {
        title: translate('slides.ileBokow.drawSide.title'),
        caption: translate('slides.ileBokow.drawSide.caption'),
      },
    },
    podsumowanie: {
      rotate: {
        title: translate('slides.podsumowanie.rotate.title'),
        caption: translate('slides.podsumowanie.rotate.caption'),
      },
      sides: {
        title: translate('slides.podsumowanie.sides.title'),
        caption: translate('slides.podsumowanie.sides.caption'),
      },
      interior: {
        title: translate('slides.podsumowanie.interior.title'),
        caption: translate('slides.podsumowanie.interior.caption'),
      },
      build: {
        title: translate('slides.podsumowanie.build.title'),
        caption: translate('slides.podsumowanie.build.caption'),
      },
    },
  },
  game: {
    gameTitle: translateLessonValueWithLegacyKey(
      translate,
      'game.gameTitle',
      'game.stageTitle',
      '',
    ),
  },
});

export const resolveGeometryShapesLessonContent = (
  template: KangurLessonTemplate | null | undefined,
  fallbackTranslate: LessonTranslate,
): KangurGeometryShapesLessonTemplateContent => {
  if (!template?.componentContent) {
    return createGeometryShapesLessonContentFromTranslate(fallbackTranslate);
  }

  const resolved =
    resolveKangurLessonTemplateComponentContent('geometry_shapes', template.componentContent);
  if (resolved?.kind === 'geometry_shapes') {
    return resolved;
  }

  return createGeometryShapesLessonContentFromTranslate(fallbackTranslate);
};
