import { z } from 'zod';

import {
  kangurLessonActivityIdSchema,
  kangurLessonNarrationVoiceSchema,
} from './kangur-lesson-constants';

const nonEmptyTrimmedString = z.string().trim().min(1);
const kangurLessonBlockIdSchema = nonEmptyTrimmedString.max(120);
const kangurLessonBlockAlignSchema = z.enum(['left', 'center', 'right']);
const kangurLessonMediaFitSchema = z.enum(['contain', 'cover', 'none']);
const kangurLessonSvgImageSourcePattern = /\.svg(?:$|[?#])/i;
const kangurLessonGridColumnsSchema = z.number().int().min(1).max(4);
const kangurLessonGridGapSchema = z.number().int().min(0).max(48);
const kangurLessonGridSpanSchema = z.number().int().min(1).max(4);
const kangurLessonGridRowHeightSchema = z.number().int().min(120).max(480);
const kangurLessonGridRowIndexSchema = z.number().int().min(1).max(12);

export const kangurLessonTextBlockSchema = z.object({
  id: kangurLessonBlockIdSchema,
  type: z.literal('text'),
  html: z.string().max(100_000).default(''),
  ttsText: z.string().trim().max(10_000).optional(),
  align: kangurLessonBlockAlignSchema.default('left'),
});
export type KangurLessonTextBlock = z.infer<typeof kangurLessonTextBlockSchema>;

export const kangurLessonSvgBlockSchema = z.object({
  id: kangurLessonBlockIdSchema,
  type: z.literal('svg'),
  title: z.string().trim().max(120).default(''),
  ttsDescription: z.string().trim().max(2_000).optional(),
  markup: z.string().max(200_000).default(''),
  viewBox: z.string().trim().max(80).default('0 0 100 100'),
  align: kangurLessonBlockAlignSchema.default('center'),
  fit: kangurLessonMediaFitSchema.default('contain'),
  maxWidth: z.number().int().min(120).max(1_200).default(420),
});
export type KangurLessonSvgBlock = z.infer<typeof kangurLessonSvgBlockSchema>;

export const kangurLessonImageBlockSchema = z.object({
  id: kangurLessonBlockIdSchema,
  type: z.literal('image'),
  title: z.string().trim().max(120).default(''),
  altText: z.string().trim().max(300).optional(),
  caption: z.string().trim().max(300).optional(),
  ttsDescription: z.string().trim().max(2_000).optional(),
  src: z
    .string()
    .trim()
    .max(2_000)
    .refine(
      (value) =>
        value.length === 0 ||
        (!/^javascript:/i.test(value) && kangurLessonSvgImageSourcePattern.test(value)),
      {
        message: 'Kangur lesson image sources must use SVG files.',
      }
    )
    .default(''),
  align: kangurLessonBlockAlignSchema.default('center'),
  fit: kangurLessonMediaFitSchema.default('contain'),
  maxWidth: z.number().int().min(120).max(1_200).default(480),
});
export type KangurLessonImageBlock = z.infer<typeof kangurLessonImageBlockSchema>;

export const kangurLessonActivityBlockSchema = z.object({
  id: kangurLessonBlockIdSchema,
  type: z.literal('activity'),
  activityId: kangurLessonActivityIdSchema,
  title: z.string().trim().max(120).default(''),
  description: z.string().trim().max(500).optional(),
  ttsDescription: z.string().trim().max(2_000).optional(),
});
export type KangurLessonActivityBlock = z.infer<typeof kangurLessonActivityBlockSchema>;

export const kangurLessonInlineBlockSchema = z.discriminatedUnion('type', [
  kangurLessonTextBlockSchema,
  kangurLessonSvgBlockSchema,
  kangurLessonImageBlockSchema,
]);
export type KangurLessonInlineBlock = z.infer<typeof kangurLessonInlineBlockSchema>;

export const kangurLessonGridItemSchema = z.object({
  id: kangurLessonBlockIdSchema,
  colSpan: kangurLessonGridSpanSchema.default(1),
  rowSpan: kangurLessonGridSpanSchema.default(1),
  columnStart: kangurLessonGridColumnsSchema.nullable().default(null),
  rowStart: kangurLessonGridRowIndexSchema.nullable().default(null),
  block: kangurLessonInlineBlockSchema,
});
export type KangurLessonGridItem = z.infer<typeof kangurLessonGridItemSchema>;

export const kangurLessonGridBlockSchema = z.object({
  id: kangurLessonBlockIdSchema,
  type: z.literal('grid'),
  columns: kangurLessonGridColumnsSchema.default(2),
  gap: kangurLessonGridGapSchema.default(16),
  rowHeight: kangurLessonGridRowHeightSchema.default(220),
  denseFill: z.boolean().default(false),
  stackOnMobile: z.boolean().default(true),
  items: z.array(kangurLessonGridItemSchema).max(24).default([]),
});
export type KangurLessonGridBlock = z.infer<typeof kangurLessonGridBlockSchema>;

export const kangurLessonCalloutVariantSchema = z.enum(['info', 'tip', 'warning', 'success']);
export type KangurLessonCalloutVariant = z.infer<typeof kangurLessonCalloutVariantSchema>;

export const kangurLessonCalloutBlockSchema = z.object({
  id: kangurLessonBlockIdSchema,
  type: z.literal('callout'),
  variant: kangurLessonCalloutVariantSchema.default('info'),
  title: z.string().trim().max(120).optional(),
  html: z.string().max(10_000).default(''),
  ttsText: z.string().trim().max(2_000).optional(),
});
export type KangurLessonCalloutBlock = z.infer<typeof kangurLessonCalloutBlockSchema>;

export const kangurLessonQuizChoiceSchema = z.object({
  id: kangurLessonBlockIdSchema,
  text: z.string().trim().max(500).default(''),
});
export type KangurLessonQuizChoice = z.infer<typeof kangurLessonQuizChoiceSchema>;

export const kangurLessonQuizBlockSchema = z.object({
  id: kangurLessonBlockIdSchema,
  type: z.literal('quiz'),
  question: z.string().max(10_000).default(''),
  choices: z.array(kangurLessonQuizChoiceSchema).min(2).max(4).default([]),
  correctChoiceId: z.string().max(120).default(''),
  explanation: z.string().max(10_000).optional(),
  ttsText: z.string().trim().max(2_000).optional(),
});
export type KangurLessonQuizBlock = z.infer<typeof kangurLessonQuizBlockSchema>;

export const kangurLessonRootBlockSchema = z.discriminatedUnion('type', [
  kangurLessonTextBlockSchema,
  kangurLessonSvgBlockSchema,
  kangurLessonImageBlockSchema,
  kangurLessonActivityBlockSchema,
  kangurLessonGridBlockSchema,
  kangurLessonCalloutBlockSchema,
  kangurLessonQuizBlockSchema,
]);
export type KangurLessonRootBlock = z.infer<typeof kangurLessonRootBlockSchema>;

export const kangurLessonPageSchema = z.object({
  id: kangurLessonBlockIdSchema,
  sectionKey: z.string().trim().max(120).optional(),
  sectionTitle: z.string().trim().max(120).optional(),
  sectionDescription: z.string().trim().max(240).optional(),
  title: z.string().trim().max(120).optional(),
  description: z.string().trim().max(240).optional(),
  blocks: z.array(kangurLessonRootBlockSchema).max(48).default([]),
});
export type KangurLessonPage = z.infer<typeof kangurLessonPageSchema>;

export const kangurLessonDocumentNarrationSchema = z
  .object({
    voice: kangurLessonNarrationVoiceSchema.optional(),
    locale: z.string().trim().min(2).max(16).optional(),
    previewSourceSignature: z.string().trim().min(1).max(128).optional(),
    lastPreviewedAt: z.string().datetime({ offset: true }).optional(),
  })
  .optional();
export type KangurLessonDocumentNarration = z.infer<typeof kangurLessonDocumentNarrationSchema>;

export const kangurLessonDocumentSchema = z.object({
  version: z.literal(1).default(1),
  blocks: z.array(kangurLessonRootBlockSchema).max(256).default([]),
  pages: z.array(kangurLessonPageSchema).max(24).optional(),
  narration: kangurLessonDocumentNarrationSchema,
  updatedAt: z.string().datetime({ offset: true }).optional(),
});
export type KangurLessonDocument = z.infer<typeof kangurLessonDocumentSchema>;

export const kangurLessonDocumentStoreSchema = z.record(
  z.string().trim().min(1).max(120),
  kangurLessonDocumentSchema
);
export type KangurLessonDocumentStore = z.infer<typeof kangurLessonDocumentStoreSchema>;
