import { z } from 'zod';

import { createLegacyCompatibleLessonShellSchema } from './kangur-lesson-templates.shared';

const kangurGeometryBasicsTitleDescriptionSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(240),
});

const kangurGeometryBasicsTitleCaptionSchema = z.object({
  title: z.string().trim().min(1).max(120),
  caption: z.string().trim().min(1).max(240),
});

const kangurGeometryShapesTitleDescriptionSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(240),
});

const kangurGeometryShapesTitleCaptionSchema = z.object({
  title: z.string().trim().min(1).max(120),
  caption: z.string().trim().min(1).max(240),
});

const kangurGeometryShapesShapeCardSchema = z.object({
  name: z.string().trim().min(1).max(120),
  details: z.string().trim().min(1).max(240),
});

const kangurGeometryShapeRecognitionTitleDescriptionSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(240),
});

const kangurGeometryShapeRecognitionLabelClueSchema = z.object({
  label: z.string().trim().min(1).max(120),
  clue: z.string().trim().min(1).max(240),
});

const kangurGeometrySymmetryTitleDescriptionSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(240),
});

const kangurGeometrySymmetryTitleCaptionSchema = z.object({
  title: z.string().trim().min(1).max(120),
  caption: z.string().trim().min(1).max(240),
});


export const kangurGeometryBasicsLessonTemplateContentSchema = z.object({
  kind: z.literal('geometry_basics'),
  lessonTitle: z.string().trim().min(1).max(120),
  terms: z.object({
    point: z.string().trim().min(1).max(80),
    segment: z.string().trim().min(1).max(80),
  }),
  sections: z.object({
    punkt: kangurGeometryBasicsTitleDescriptionSchema,
    bok: kangurGeometryBasicsTitleDescriptionSchema,
    kat: kangurGeometryBasicsTitleDescriptionSchema,
    podsumowanie: kangurGeometryBasicsTitleDescriptionSchema,
    game: kangurGeometryBasicsTitleDescriptionSchema,
  }),
  slides: z.object({
    punkt: z.object({
      segment: z.object({
        title: z.string().trim().min(1).max(120),
        pointLead: z.string().trim().min(1).max(240),
        segmentLead: z.string().trim().min(1).max(240),
        segmentLabel: z.string().trim().min(1).max(120),
        caption: z.string().trim().min(1).max(240),
      }),
      pointOnSegment: kangurGeometryBasicsTitleCaptionSchema.extend({
        lead: z.string().trim().min(1).max(240),
      }),
    }),
    bok: z.object({
      sideAndVertex: z.object({
        title: z.string().trim().min(1).max(120),
        lead: z.string().trim().min(1).max(240),
        caption: z.string().trim().min(1).max(240),
        note: z.string().trim().min(1).max(240),
      }),
      countSides: kangurGeometryBasicsTitleCaptionSchema.extend({
        lead: z.string().trim().min(1).max(240),
      }),
    }),
    kat: z.object({
      whatIsAngle: z.object({
        title: z.string().trim().min(1).max(120),
        lead: z.string().trim().min(1).max(240),
        rightAngleCaption: z.string().trim().min(1).max(240),
        chips: z.object({
          acute: z.string().trim().min(1).max(120),
          right: z.string().trim().min(1).max(120),
          obtuse: z.string().trim().min(1).max(120),
        }),
      }),
      angleTypes: kangurGeometryBasicsTitleCaptionSchema.extend({
        lead: z.string().trim().min(1).max(240),
      }),
    }),
    podsumowanie: z.object({
      overview: z.object({
        title: z.string().trim().min(1).max(120),
        items: z.object({
          point: z.object({
            term: z.string().trim().min(1).max(80),
            definition: z.string().trim().min(1).max(240),
          }),
          segment: z.object({
            term: z.string().trim().min(1).max(80),
            definition: z.string().trim().min(1).max(240),
          }),
          sideAndVertex: z.object({
            term: z.string().trim().min(1).max(120),
            definition: z.string().trim().min(1).max(240),
          }),
          angle: z.object({
            term: z.string().trim().min(1).max(80),
            definition: z.string().trim().min(1).max(240),
          }),
        }),
      }),
      pointAndSegment: kangurGeometryBasicsTitleCaptionSchema,
      pointOnSegment: kangurGeometryBasicsTitleCaptionSchema,
      sidesAndVertices: kangurGeometryBasicsTitleCaptionSchema,
      countSides: kangurGeometryBasicsTitleCaptionSchema,
      angleTypes: kangurGeometryBasicsTitleCaptionSchema,
      angleKinds: kangurGeometryBasicsTitleCaptionSchema,
    }),
  }),
  game: createLegacyCompatibleLessonShellSchema({}, 'Geometry basics game title is required.'),
});

export const kangurGeometryShapesLessonTemplateContentSchema = z.object({
  kind: z.literal('geometry_shapes'),
  lessonTitle: z.string().trim().min(1).max(120),
  shapeCards: z.object({
    circle: kangurGeometryShapesShapeCardSchema,
    triangle: kangurGeometryShapesShapeCardSchema,
    square: kangurGeometryShapesShapeCardSchema,
    rectangle: kangurGeometryShapesShapeCardSchema,
    pentagon: kangurGeometryShapesShapeCardSchema,
    hexagon: kangurGeometryShapesShapeCardSchema,
  }),
  sections: z.object({
    podstawowe: kangurGeometryShapesTitleDescriptionSchema,
    ileBokow: kangurGeometryShapesTitleDescriptionSchema,
    podsumowanie: kangurGeometryShapesTitleDescriptionSchema,
    game: kangurGeometryShapesTitleDescriptionSchema,
  }),
  slides: z.object({
    podstawowe: z.object({
      intro: z.object({
        title: z.string().trim().min(1).max(120),
        orbitCaption: z.string().trim().min(1).max(240),
      }),
      outline: kangurGeometryShapesTitleCaptionSchema,
      build: kangurGeometryShapesTitleCaptionSchema,
    }),
    ileBokow: z.object({
      count: z.object({
        title: z.string().trim().min(1).max(120),
      }),
      countSides: kangurGeometryShapesTitleCaptionSchema,
      corners: kangurGeometryShapesTitleCaptionSchema,
      segmentSide: kangurGeometryShapesTitleCaptionSchema,
      drawSide: kangurGeometryShapesTitleCaptionSchema,
    }),
    podsumowanie: z.object({
      rotate: kangurGeometryShapesTitleCaptionSchema,
      sides: kangurGeometryShapesTitleCaptionSchema,
      interior: kangurGeometryShapesTitleCaptionSchema,
      build: kangurGeometryShapesTitleCaptionSchema,
    }),
  }),
  game: createLegacyCompatibleLessonShellSchema({}, 'Geometry shapes game title is required.'),
});

export const kangurGeometryShapeRecognitionLessonTemplateContentSchema = z.object({
  kind: z.literal('geometry_shape_recognition'),
  lessonTitle: z.string().trim().min(1).max(120),
  sections: z.object({
    intro: kangurGeometryShapeRecognitionTitleDescriptionSchema,
    practice: kangurGeometryShapeRecognitionTitleDescriptionSchema,
    draw: kangurGeometryShapeRecognitionTitleDescriptionSchema,
    summary: kangurGeometryShapeRecognitionTitleDescriptionSchema,
  }),
  shapes: z.object({
    circle: kangurGeometryShapeRecognitionLabelClueSchema,
    square: kangurGeometryShapeRecognitionLabelClueSchema,
    triangle: kangurGeometryShapeRecognitionLabelClueSchema,
    rectangle: kangurGeometryShapeRecognitionLabelClueSchema,
    oval: kangurGeometryShapeRecognitionLabelClueSchema,
    diamond: kangurGeometryShapeRecognitionLabelClueSchema,
  }),
  clues: z.object({
    title: z.string().trim().min(1).max(120),
    lead: z.string().trim().min(1).max(240),
    chips: z.object({
      corners: z.string().trim().min(1).max(120),
      sides: z.string().trim().min(1).max(120),
      curves: z.string().trim().min(1).max(120),
      longShortSides: z.string().trim().min(1).max(120),
    }),
    inset: z.string().trim().min(1).max(240),
  }),
  practice: z.object({
    slideTitle: z.string().trim().min(1).max(120),
    emptyRounds: z.string().trim().min(1).max(120),
    finished: z.object({
      status: z.string().trim().min(1).max(120),
      title: z.string().trim().min(1).max(160),
      subtitle: z.string().trim().min(1).max(240),
      restart: z.string().trim().min(1).max(120),
    }),
    progress: z.object({
      round: z.string().trim().min(1).max(120),
      score: z.string().trim().min(1).max(120),
    }),
    question: z.string().trim().min(1).max(120),
    feedback: z.object({
      correct: z.string().trim().min(1).max(120),
      incorrect: z.string().trim().min(1).max(160),
    }),
    actions: z.object({
      next: z.string().trim().min(1).max(120),
      finish: z.string().trim().min(1).max(120),
    }),
  }),
  intro: z.object({
    title: z.string().trim().min(1).max(120),
    lead: z.string().trim().min(1).max(240),
  }),
  summary: z.object({
    title: z.string().trim().min(1).max(120),
    status: z.string().trim().min(1).max(120),
    lead: z.string().trim().min(1).max(240),
    caption: z.string().trim().min(1).max(240),
  }),
  draw: createLegacyCompatibleLessonShellSchema({
    difficultyLabel: z.string().trim().min(1).max(120).optional(),
    finishLabel: z.string().trim().min(1).max(120),
  }, 'Geometry shape recognition draw game title is required.'),
});

export const kangurGeometrySymmetryLessonTemplateContentSchema = z.object({
  kind: z.literal('geometry_symmetry'),
  lessonTitle: z.string().trim().min(1).max(120),
  sections: z.object({
    intro: kangurGeometrySymmetryTitleDescriptionSchema,
    os: kangurGeometrySymmetryTitleDescriptionSchema,
    figury: kangurGeometrySymmetryTitleDescriptionSchema,
    podsumowanie: kangurGeometrySymmetryTitleDescriptionSchema,
    game: kangurGeometrySymmetryTitleDescriptionSchema,
  }),
  slides: z.object({
    intro: z.object({
      whatIsSymmetry: z.object({
        title: z.string().trim().min(1).max(120),
        lead: z.string().trim().min(1).max(240),
        callout: z.string().trim().min(1).max(240),
        note: z.string().trim().min(1).max(240),
      }),
      mirrorSymmetry: kangurGeometrySymmetryTitleCaptionSchema.extend({
        lead: z.string().trim().min(1).max(240),
      }),
    }),
    os: z.object({
      axisOfSymmetry: z.object({
        title: z.string().trim().min(1).max(120),
        lead: z.string().trim().min(1).max(240),
        caption: z.string().trim().min(1).max(240),
        note: z.string().trim().min(1).max(240),
      }),
      axisInPractice: kangurGeometrySymmetryTitleCaptionSchema.extend({
        lead: z.string().trim().min(1).max(240),
      }),
    }),
    figury: z.object({
      symmetricShapes: z.object({
        title: z.string().trim().min(1).max(120),
        circleNote: z.string().trim().min(1).max(240),
        cards: z.object({
          square: z.string().trim().min(1).max(160),
          rectangle: z.string().trim().min(1).max(160),
          circle: z.string().trim().min(1).max(160),
          isoscelesTriangle: z.string().trim().min(1).max(160),
          zigzag: z.string().trim().min(1).max(160),
          irregularPolygon: z.string().trim().min(1).max(160),
        }),
      }),
      symmetricOrNot: kangurGeometrySymmetryTitleCaptionSchema,
      rotational: kangurGeometrySymmetryTitleCaptionSchema,
    }),
    podsumowanie: z.object({
      overview: z.object({
        title: z.string().trim().min(1).max(120),
        items: z.object({
          item1: z.string().trim().min(1).max(240),
          item2: z.string().trim().min(1).max(240),
          item3: z.string().trim().min(1).max(240),
          item4: z.string().trim().min(1).max(240),
        }),
      }),
      axis: kangurGeometrySymmetryTitleCaptionSchema,
      manyAxes: kangurGeometrySymmetryTitleCaptionSchema,
      mirror: kangurGeometrySymmetryTitleCaptionSchema,
      rotation: kangurGeometrySymmetryTitleCaptionSchema,
    }),
  }),
  game: createLegacyCompatibleLessonShellSchema({}, 'Geometry symmetry game title is required.'),
});
