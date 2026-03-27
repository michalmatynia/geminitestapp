import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import type { KangurUnifiedLessonSection } from '@/features/kangur/ui/components/KangurUnifiedLesson';
import {
  KangurLessonCaption,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';
import {
  resolveKangurLessonTemplateComponentContent,
} from '@/features/kangur/lessons/lesson-template-component-content';
import type {
  KangurAlphabetUnifiedLessonTemplateContent,
  KangurLessonTemplate,
} from '@/shared/contracts/kangur-lesson-templates';

export const buildAlphabetUnifiedLessonSlides = <SectionId extends string>(
  content: KangurAlphabetUnifiedLessonTemplateContent,
): Partial<Record<SectionId, LessonSlide[]>> =>
  Object.fromEntries(
    content.sections.map((section) => [
      section.id,
      section.slides.map((slide) => ({
        title: slide.title,
        content: (
          <KangurLessonStack>
            <KangurLessonLead>{slide.lead}</KangurLessonLead>
            {slide.caption ? <KangurLessonCaption>{slide.caption}</KangurLessonCaption> : null}
          </KangurLessonStack>
        ),
      })),
    ]),
  ) as Partial<Record<SectionId, LessonSlide[]>>;

export const buildAlphabetUnifiedLessonSections = <SectionId extends string>(
  content: KangurAlphabetUnifiedLessonTemplateContent,
): ReadonlyArray<KangurUnifiedLessonSection<SectionId>> =>
  content.sections.map((section) => ({
    id: section.id as SectionId,
    emoji: section.emoji,
    title: section.title,
    description: section.description,
    isGame: section.isGame,
    slideCount: section.isGame ? undefined : section.slides.length,
  }));

export const resolveAlphabetUnifiedLessonContent = (
  componentId: string,
  template: KangurLessonTemplate | null | undefined,
  fallback: KangurAlphabetUnifiedLessonTemplateContent,
): KangurAlphabetUnifiedLessonTemplateContent => {
  const resolved =
    resolveKangurLessonTemplateComponentContent(componentId, template?.componentContent) ?? fallback;
  return resolved.kind === 'alphabet_unified' ? resolved : fallback;
};

export const findAlphabetUnifiedLessonSection = (
  content: KangurAlphabetUnifiedLessonTemplateContent,
  sectionId: string,
) => content.sections.find((section) => section.id === sectionId) ?? null;
