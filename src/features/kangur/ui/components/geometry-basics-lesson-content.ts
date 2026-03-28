import {
  resolveKangurLessonTemplateComponentContent,
} from '@/features/kangur/lessons/lesson-template-component-content';
import {
  type LessonTranslate,
  translateLessonShellTitle,
} from '@/features/kangur/ui/components/lesson-copy';
import type {
  KangurGeometryBasicsLessonTemplateContent,
  KangurLessonTemplate,
} from '@/shared/contracts/kangur-lesson-templates';

export const createGeometryBasicsLessonTranslate = (
  content: KangurGeometryBasicsLessonTemplateContent,
): LessonTranslate => {
  const gameTitle = content.game.gameTitle ?? '';
  const translationMap = new Map<string, string>([
    ['lessonTitle', content.lessonTitle],
    ['terms.point', content.terms.point],
    ['terms.segment', content.terms.segment],
    ['sections.punkt.title', content.sections.punkt.title],
    ['sections.punkt.description', content.sections.punkt.description],
    ['sections.bok.title', content.sections.bok.title],
    ['sections.bok.description', content.sections.bok.description],
    ['sections.kat.title', content.sections.kat.title],
    ['sections.kat.description', content.sections.kat.description],
    ['sections.podsumowanie.title', content.sections.podsumowanie.title],
    ['sections.podsumowanie.description', content.sections.podsumowanie.description],
    ['sections.game.title', content.sections.game.title],
    ['sections.game.description', content.sections.game.description],
    ['slides.punkt.segment.title', content.slides.punkt.segment.title],
    ['slides.punkt.segment.pointLead', content.slides.punkt.segment.pointLead],
    ['slides.punkt.segment.segmentLead', content.slides.punkt.segment.segmentLead],
    ['slides.punkt.segment.segmentLabel', content.slides.punkt.segment.segmentLabel],
    ['slides.punkt.segment.caption', content.slides.punkt.segment.caption],
    ['slides.punkt.pointOnSegment.title', content.slides.punkt.pointOnSegment.title],
    ['slides.punkt.pointOnSegment.lead', content.slides.punkt.pointOnSegment.lead],
    ['slides.punkt.pointOnSegment.caption', content.slides.punkt.pointOnSegment.caption],
    ['slides.bok.sideAndVertex.title', content.slides.bok.sideAndVertex.title],
    ['slides.bok.sideAndVertex.lead', content.slides.bok.sideAndVertex.lead],
    ['slides.bok.sideAndVertex.caption', content.slides.bok.sideAndVertex.caption],
    ['slides.bok.sideAndVertex.note', content.slides.bok.sideAndVertex.note],
    ['slides.bok.countSides.title', content.slides.bok.countSides.title],
    ['slides.bok.countSides.lead', content.slides.bok.countSides.lead],
    ['slides.bok.countSides.caption', content.slides.bok.countSides.caption],
    ['slides.kat.whatIsAngle.title', content.slides.kat.whatIsAngle.title],
    ['slides.kat.whatIsAngle.lead', content.slides.kat.whatIsAngle.lead],
    [
      'slides.kat.whatIsAngle.rightAngleCaption',
      content.slides.kat.whatIsAngle.rightAngleCaption,
    ],
    ['slides.kat.whatIsAngle.chips.acute', content.slides.kat.whatIsAngle.chips.acute],
    ['slides.kat.whatIsAngle.chips.right', content.slides.kat.whatIsAngle.chips.right],
    ['slides.kat.whatIsAngle.chips.obtuse', content.slides.kat.whatIsAngle.chips.obtuse],
    ['slides.kat.angleTypes.title', content.slides.kat.angleTypes.title],
    ['slides.kat.angleTypes.lead', content.slides.kat.angleTypes.lead],
    ['slides.kat.angleTypes.caption', content.slides.kat.angleTypes.caption],
    ['slides.podsumowanie.overview.title', content.slides.podsumowanie.overview.title],
    [
      'slides.podsumowanie.overview.items.point.term',
      content.slides.podsumowanie.overview.items.point.term,
    ],
    [
      'slides.podsumowanie.overview.items.point.definition',
      content.slides.podsumowanie.overview.items.point.definition,
    ],
    [
      'slides.podsumowanie.overview.items.segment.term',
      content.slides.podsumowanie.overview.items.segment.term,
    ],
    [
      'slides.podsumowanie.overview.items.segment.definition',
      content.slides.podsumowanie.overview.items.segment.definition,
    ],
    [
      'slides.podsumowanie.overview.items.sideAndVertex.term',
      content.slides.podsumowanie.overview.items.sideAndVertex.term,
    ],
    [
      'slides.podsumowanie.overview.items.sideAndVertex.definition',
      content.slides.podsumowanie.overview.items.sideAndVertex.definition,
    ],
    [
      'slides.podsumowanie.overview.items.angle.term',
      content.slides.podsumowanie.overview.items.angle.term,
    ],
    [
      'slides.podsumowanie.overview.items.angle.definition',
      content.slides.podsumowanie.overview.items.angle.definition,
    ],
    [
      'slides.podsumowanie.pointAndSegment.title',
      content.slides.podsumowanie.pointAndSegment.title,
    ],
    [
      'slides.podsumowanie.pointAndSegment.caption',
      content.slides.podsumowanie.pointAndSegment.caption,
    ],
    [
      'slides.podsumowanie.pointOnSegment.title',
      content.slides.podsumowanie.pointOnSegment.title,
    ],
    [
      'slides.podsumowanie.pointOnSegment.caption',
      content.slides.podsumowanie.pointOnSegment.caption,
    ],
    [
      'slides.podsumowanie.sidesAndVertices.title',
      content.slides.podsumowanie.sidesAndVertices.title,
    ],
    [
      'slides.podsumowanie.sidesAndVertices.caption',
      content.slides.podsumowanie.sidesAndVertices.caption,
    ],
    ['slides.podsumowanie.countSides.title', content.slides.podsumowanie.countSides.title],
    ['slides.podsumowanie.countSides.caption', content.slides.podsumowanie.countSides.caption],
    ['slides.podsumowanie.angleTypes.title', content.slides.podsumowanie.angleTypes.title],
    ['slides.podsumowanie.angleTypes.caption', content.slides.podsumowanie.angleTypes.caption],
    ['slides.podsumowanie.angleKinds.title', content.slides.podsumowanie.angleKinds.title],
    ['slides.podsumowanie.angleKinds.caption', content.slides.podsumowanie.angleKinds.caption],
    ['game.gameTitle', gameTitle],
  ]);

  return (key: string): string => translationMap.get(key) ?? key;
};

export const createGeometryBasicsLessonContentFromTranslate = (
  translate: LessonTranslate,
): KangurGeometryBasicsLessonTemplateContent => ({
  kind: 'geometry_basics',
  lessonTitle: translate('lessonTitle'),
  terms: {
    point: translate('terms.point'),
    segment: translate('terms.segment'),
  },
  sections: {
    punkt: {
      title: translate('sections.punkt.title'),
      description: translate('sections.punkt.description'),
    },
    bok: {
      title: translate('sections.bok.title'),
      description: translate('sections.bok.description'),
    },
    kat: {
      title: translate('sections.kat.title'),
      description: translate('sections.kat.description'),
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
    punkt: {
      segment: {
        title: translate('slides.punkt.segment.title'),
        pointLead: translate('slides.punkt.segment.pointLead'),
        segmentLead: translate('slides.punkt.segment.segmentLead'),
        segmentLabel: translate('slides.punkt.segment.segmentLabel'),
        caption: translate('slides.punkt.segment.caption'),
      },
      pointOnSegment: {
        title: translate('slides.punkt.pointOnSegment.title'),
        lead: translate('slides.punkt.pointOnSegment.lead'),
        caption: translate('slides.punkt.pointOnSegment.caption'),
      },
    },
    bok: {
      sideAndVertex: {
        title: translate('slides.bok.sideAndVertex.title'),
        lead: translate('slides.bok.sideAndVertex.lead'),
        caption: translate('slides.bok.sideAndVertex.caption'),
        note: translate('slides.bok.sideAndVertex.note'),
      },
      countSides: {
        title: translate('slides.bok.countSides.title'),
        lead: translate('slides.bok.countSides.lead'),
        caption: translate('slides.bok.countSides.caption'),
      },
    },
    kat: {
      whatIsAngle: {
        title: translate('slides.kat.whatIsAngle.title'),
        lead: translate('slides.kat.whatIsAngle.lead'),
        rightAngleCaption: translate('slides.kat.whatIsAngle.rightAngleCaption'),
        chips: {
          acute: translate('slides.kat.whatIsAngle.chips.acute'),
          right: translate('slides.kat.whatIsAngle.chips.right'),
          obtuse: translate('slides.kat.whatIsAngle.chips.obtuse'),
        },
      },
      angleTypes: {
        title: translate('slides.kat.angleTypes.title'),
        lead: translate('slides.kat.angleTypes.lead'),
        caption: translate('slides.kat.angleTypes.caption'),
      },
    },
    podsumowanie: {
      overview: {
        title: translate('slides.podsumowanie.overview.title'),
        items: {
          point: {
            term: translate('slides.podsumowanie.overview.items.point.term'),
            definition: translate('slides.podsumowanie.overview.items.point.definition'),
          },
          segment: {
            term: translate('slides.podsumowanie.overview.items.segment.term'),
            definition: translate('slides.podsumowanie.overview.items.segment.definition'),
          },
          sideAndVertex: {
            term: translate('slides.podsumowanie.overview.items.sideAndVertex.term'),
            definition: translate('slides.podsumowanie.overview.items.sideAndVertex.definition'),
          },
          angle: {
            term: translate('slides.podsumowanie.overview.items.angle.term'),
            definition: translate('slides.podsumowanie.overview.items.angle.definition'),
          },
        },
      },
      pointAndSegment: {
        title: translate('slides.podsumowanie.pointAndSegment.title'),
        caption: translate('slides.podsumowanie.pointAndSegment.caption'),
      },
      pointOnSegment: {
        title: translate('slides.podsumowanie.pointOnSegment.title'),
        caption: translate('slides.podsumowanie.pointOnSegment.caption'),
      },
      sidesAndVertices: {
        title: translate('slides.podsumowanie.sidesAndVertices.title'),
        caption: translate('slides.podsumowanie.sidesAndVertices.caption'),
      },
      countSides: {
        title: translate('slides.podsumowanie.countSides.title'),
        caption: translate('slides.podsumowanie.countSides.caption'),
      },
      angleTypes: {
        title: translate('slides.podsumowanie.angleTypes.title'),
        caption: translate('slides.podsumowanie.angleTypes.caption'),
      },
      angleKinds: {
        title: translate('slides.podsumowanie.angleKinds.title'),
        caption: translate('slides.podsumowanie.angleKinds.caption'),
      },
    },
  },
  game: {
    gameTitle: translateLessonShellTitle(translate, 'game', ''),
  },
});

export const resolveGeometryBasicsLessonContent = (
  template: KangurLessonTemplate | null | undefined,
  fallbackTranslate: LessonTranslate,
): KangurGeometryBasicsLessonTemplateContent => {
  if (!template?.componentContent) {
    return createGeometryBasicsLessonContentFromTranslate(fallbackTranslate);
  }

  const resolved =
    resolveKangurLessonTemplateComponentContent('geometry_basics', template.componentContent);
  if (resolved?.kind === 'geometry_basics') {
    return resolved;
  }

  return createGeometryBasicsLessonContentFromTranslate(fallbackTranslate);
};
