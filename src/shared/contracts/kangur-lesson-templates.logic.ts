import { z } from 'zod';

export * from './kangur-lesson-templates/logical-shared';
export * from './kangur-lesson-templates/logical-classification';
export * from './kangur-lesson-templates/logical-analogies';
export * from './kangur-lesson-templates/logical-thinking';
export * from './kangur-lesson-templates/logical-patterns';
export * from './kangur-lesson-templates/logical-reasoning';

import { kangurLogicalClassificationLessonTemplateContentSchema } from './kangur-lesson-templates/logical-classification';
import { kangurLogicalAnalogiesLessonTemplateContentSchema } from './kangur-lesson-templates/logical-analogies';
import { kangurLogicalThinkingLessonTemplateContentSchema } from './kangur-lesson-templates/logical-thinking';
import { kangurLogicalPatternsLessonTemplateContentSchema } from './kangur-lesson-templates/logical-patterns';
import { kangurLogicalReasoningLessonTemplateContentSchema } from './kangur-lesson-templates/logical-reasoning';

export const kangurLogicalLessonTemplateContentSchema = z.discriminatedUnion('kind', [
  kangurLogicalClassificationLessonTemplateContentSchema,
  kangurLogicalAnalogiesLessonTemplateContentSchema,
  kangurLogicalThinkingLessonTemplateContentSchema,
  kangurLogicalPatternsLessonTemplateContentSchema,
  kangurLogicalReasoningLessonTemplateContentSchema,
]);

export type KangurLogicalLessonTemplateContentDto = z.infer<
  typeof kangurLogicalLessonTemplateContentSchema
>;
export type KangurLogicalLessonTemplateContent = KangurLogicalLessonTemplateContentDto;
export type KangurLogicalLessonKind = KangurLogicalLessonTemplateContentDto['kind'];
