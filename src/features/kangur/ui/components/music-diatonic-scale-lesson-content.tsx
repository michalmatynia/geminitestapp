import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import type { KangurUnifiedLessonSection } from '@/features/kangur/ui/components/KangurUnifiedLesson';
import {
  KangurLessonCaption,
  KangurLessonChip,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';
import {
  resolveKangurLessonTemplateComponentContent,
} from '@/features/kangur/lessons/lesson-template-component-content';
import type {
  KangurLessonTemplate,
  KangurMusicDiatonicScaleLessonTemplateContent,
} from '@/shared/contracts/kangur-lesson-templates';

import KangurMusicPianoRoll from '@/features/kangur/ui/components/music/KangurMusicPianoRoll';
import { DIATONIC_PIANO_KEYS } from '@/features/kangur/ui/components/music/music-theory';

export type MusicDiatonicScaleLessonSectionId =
  | 'notes'
  | 'melody'
  | 'game_repeat'
  | 'game_freeplay'
  | 'summary';

const PREVIEW_PIANO_ROLL = [
  { noteId: 'do', span: 2 },
  { noteId: 're', span: 1 },
  { noteId: 'mi', span: 1 },
  { noteId: 'fa', span: 1 },
  { noteId: 'sol', span: 2 },
  { noteId: 'la', span: 1 },
  { noteId: 'si', span: 1 },
  { label: 'DO+', noteId: 'high_do', span: 3 },
] as const;

export const buildMusicDiatonicScaleLessonSlides = (
  content: KangurMusicDiatonicScaleLessonTemplateContent,
): Partial<Record<MusicDiatonicScaleLessonSectionId, LessonSlide[]>> => ({
  notes: [
    {
      title: content.notesSection.introSlide.title,
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>{content.notesSection.introSlide.lead}</KangurLessonLead>
          <div className='grid w-full gap-3 sm:grid-cols-4'>
            {content.notesSection.introSlide.noteSequence.map((note, index) => (
              <div
                key={`${note}-${index}`}
                className='rounded-[24px] border border-sky-200 bg-white/90 px-4 py-3 text-center shadow-sm'
              >
                <div className='text-xs font-semibold uppercase tracking-[0.24em] text-sky-500'>
                  {content.notesSection.introSlide.noteCardLabel}
                </div>
                <div className='mt-2 text-2xl font-black tracking-tight text-sky-950'>{note}</div>
              </div>
            ))}
          </div>
          <KangurLessonCaption align='left'>
            {content.notesSection.introSlide.caption}
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
    {
      title: content.notesSection.colorsSlide.title,
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>{content.notesSection.colorsSlide.lead}</KangurLessonLead>
          <div className='flex flex-wrap gap-2'>
            {content.notesSection.colorsSlide.noteChips.map((chipLabel, index) => (
              <KangurLessonChip key={`${chipLabel}-${index}`} accent='sky'>
                {chipLabel}
              </KangurLessonChip>
            ))}
          </div>
          <KangurMusicPianoRoll
            completedStepCount={0}
            description={content.notesSection.colorsSlide.previewDescription}
            disabled
            interactive={false}
            keys={DIATONIC_PIANO_KEYS}
            melody={PREVIEW_PIANO_ROLL}
            shellTestId='music-diatonic-scale-preview-roll'
            title={content.notesSection.colorsSlide.previewTitle}
            visualCueMode='six_year_old'
          />
          <KangurLessonCaption align='left'>
            {content.notesSection.colorsSlide.caption}
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
  melody: [
    {
      title: content.melodySection.directionSlide.title,
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            {content.melodySection.directionSlide.lead}
          </KangurLessonLead>
          <div className='grid w-full gap-3 sm:grid-cols-2'>
            <div className='rounded-[26px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-left'>
              <div className='text-xs font-semibold uppercase tracking-[0.24em] text-emerald-600'>
                {content.melodySection.directionSlide.ascendingTitle}
              </div>
              <div className='mt-2 text-lg font-bold text-emerald-950'>
                {content.melodySection.directionSlide.ascendingSequence}
              </div>
              <KangurLessonCaption align='left' className='mt-2'>
                {content.melodySection.directionSlide.ascendingCaption}
              </KangurLessonCaption>
            </div>
            <div className='rounded-[26px] border border-amber-200 bg-amber-50 px-5 py-4 text-left'>
              <div className='text-xs font-semibold uppercase tracking-[0.24em] text-amber-600'>
                {content.melodySection.directionSlide.descendingTitle}
              </div>
              <div className='mt-2 text-lg font-bold text-amber-950'>
                {content.melodySection.directionSlide.descendingSequence}
              </div>
              <KangurLessonCaption align='left' className='mt-2'>
                {content.melodySection.directionSlide.descendingCaption}
              </KangurLessonCaption>
            </div>
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: content.melodySection.listenSlide.title,
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>{content.melodySection.listenSlide.lead}</KangurLessonLead>
          <div className='rounded-[28px] bg-slate-900 px-5 py-5 text-left text-slate-50'>
            <div className='text-xs font-semibold uppercase tracking-[0.24em] text-sky-300'>
              {content.melodySection.listenSlide.planTitle}
            </div>
            <div className='mt-3 flex flex-wrap gap-2'>
              {content.melodySection.listenSlide.planSteps.map((step, index) => (
                <KangurLessonChip
                  key={`${step}-${index}`}
                  accent={index === 0 ? 'sky' : index === 1 ? 'violet' : 'emerald'}
                >
                  {step}
                </KangurLessonChip>
              ))}
            </div>
            <KangurLessonCaption align='left' className='mt-3 text-slate-200'>
              {content.melodySection.listenSlide.caption}
            </KangurLessonCaption>
          </div>
        </KangurLessonStack>
      ),
    },
  ],
  summary: [
    {
      title: content.summarySection.summarySlide.title,
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>{content.summarySection.summarySlide.lead}</KangurLessonLead>
          <div className='grid w-full gap-3 sm:grid-cols-3'>
            {content.summarySection.summarySlide.facts.map((fact, index) => (
              <div
                key={`${fact.title}-${index}`}
                className='rounded-[24px] bg-white/90 px-4 py-4 text-left shadow-sm'
              >
                <div className='text-sm font-bold text-sky-950'>{fact.title}</div>
                <KangurLessonCaption align='left' className='mt-2'>
                  {fact.caption}
                </KangurLessonCaption>
              </div>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
  ],
});

export const buildMusicDiatonicScaleLessonSections = (
  content: KangurMusicDiatonicScaleLessonTemplateContent,
): ReadonlyArray<KangurUnifiedLessonSection<MusicDiatonicScaleLessonSectionId>> => [
  {
    id: 'notes',
    emoji: content.notesSection.emoji,
    title: content.notesSection.title,
    description: content.notesSection.description,
    slideCount: 2,
  },
  {
    id: 'melody',
    emoji: content.melodySection.emoji,
    title: content.melodySection.title,
    description: content.melodySection.description,
    slideCount: 2,
  },
  {
    id: 'game_repeat',
    emoji: content.gameRepeatSection.emoji,
    title: content.gameRepeatSection.title,
    description: content.gameRepeatSection.description,
    isGame: true,
  },
  {
    id: 'game_freeplay',
    emoji: content.gameFreeplaySection.emoji,
    title: content.gameFreeplaySection.title,
    description: content.gameFreeplaySection.description,
    isGame: true,
  },
  {
    id: 'summary',
    emoji: content.summarySection.emoji,
    title: content.summarySection.title,
    description: content.summarySection.description,
    slideCount: 1,
  },
];

export const resolveMusicDiatonicScaleLessonContent = (
  template: KangurLessonTemplate | null | undefined,
  fallback: KangurMusicDiatonicScaleLessonTemplateContent,
): KangurMusicDiatonicScaleLessonTemplateContent => {
  const resolved =
    resolveKangurLessonTemplateComponentContent('music_diatonic_scale', template?.componentContent) ??
    fallback;
  return resolved.kind === 'music_diatonic_scale' ? resolved : fallback;
};
