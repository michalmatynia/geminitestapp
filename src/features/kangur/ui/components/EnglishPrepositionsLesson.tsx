'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import EnglishPrepositionsGame from '@/features/kangur/ui/components/EnglishPrepositionsGame';
import EnglishPrepositionsOrderGame from '@/features/kangur/ui/components/EnglishPrepositionsOrderGame';
import EnglishPrepositionsSortGame from '@/features/kangur/ui/components/EnglishPrepositionsSortGame';
import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import {
  EnglishPrepositionsPlaceAnimation,
  EnglishPrepositionsRelationsDiagram,
  EnglishPrepositionsTimeAnimation,
  EnglishPrepositionsTimelineAnimation,
} from '@/features/kangur/ui/components/LessonAnimations';
import {
  KangurLessonCallout,
  KangurLessonCaption,
  KangurLessonChip,
  KangurLessonInset,
  KangurLessonLead,
  KangurLessonStack,
  KangurLessonVisual,
} from '@/features/kangur/ui/design/lesson-primitives';
import {
  KANGUR_GRID_TIGHT_CLASSNAME,
  KANGUR_WRAP_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { KangurUnifiedLesson } from '@/features/kangur/ui/lessons/lesson-components';

const LESSON_KEY = 'english_prepositions_time_place';

type SectionId =
  | 'intro'
  | 'time'
  | 'place'
  | 'relations'
  | 'traps'
  | 'practice'
  | 'summary'
  | 'game_prepositions'
  | 'game_prepositions_sort'
  | 'game_prepositions_order';

type SlideSectionId = Exclude<
  SectionId,
  'game_prepositions' | 'game_prepositions_sort' | 'game_prepositions_order'
>;

const buildEnglishPrepositionsSlides = (
  translations: ReturnType<typeof useTranslations>
): Record<SlideSectionId, LessonSlide[]> => ({
  intro: [
    {
      title: translations('slides.intro.overview.title'),
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            {translations('slides.intro.overview.lead')}
          </KangurLessonLead>
          <KangurLessonCallout accent='rose' padding='sm'>
            <div className={`${KANGUR_WRAP_ROW_CLASSNAME} text-xs font-semibold`}>
              <KangurLessonChip accent='rose'>⏰ at 7:30</KangurLessonChip>
              <KangurLessonChip accent='rose'>📅 on Monday</KangurLessonChip>
              <KangurLessonChip accent='rose'>🗓️ in May</KangurLessonChip>
              <KangurLessonChip accent='rose'>📍 at school</KangurLessonChip>
              <KangurLessonChip accent='rose'>📦 in the classroom</KangurLessonChip>
              <KangurLessonChip accent='rose'>🧩 on the board</KangurLessonChip>
            </div>
            <KangurLessonCaption className='mt-3'>
              {translations('slides.intro.overview.caption')}
            </KangurLessonCaption>
          </KangurLessonCallout>
          <KangurLessonInset accent='rose' className='text-left'>
            <p className='text-sm font-semibold text-rose-700'>
              We solve equations at 7:30 on Monday in the classroom.
            </p>
          </KangurLessonInset>
        </KangurLessonStack>
      ),
    },
  ],
  time: [
    {
      title: translations('slides.time.core.title'),
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            {translations('slides.time.core.lead')}
          </KangurLessonLead>
          <KangurLessonVisual
            accent='rose'
            caption={translations('slides.time.core.caption')}
          >
            <EnglishPrepositionsTimeAnimation />
          </KangurLessonVisual>
          <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} sm:grid-cols-3 text-sm`}>
            {[
              { title: 'AT', items: ['at 7:30', 'at noon', 'at midnight'] },
              { title: 'ON', items: ['on Monday', 'on 14 May', 'on my birthday'] },
              { title: 'IN', items: ['in April', 'in 2026', 'in the morning'] },
            ].map((group) => (
              <KangurLessonInset key={group.title} accent='rose' className='text-left'>
                <p className='text-xs uppercase tracking-wide text-rose-500'>{group.title}</p>
                <ul className='mt-1 space-y-1 text-sm font-semibold text-rose-700'>
                  {group.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </KangurLessonInset>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: translations('slides.time.sequence.title'),
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            {translations('slides.time.sequence.lead')}
          </KangurLessonLead>
          <KangurLessonVisual
            accent='rose'
            caption={translations('slides.time.sequence.caption')}
          >
            <EnglishPrepositionsTimelineAnimation />
          </KangurLessonVisual>
          <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} text-sm`}>
            {[
              'Finish the homework before class.',
              'No phones during the test.',
              'We compare answers after school.',
              'Wait until 4:00.',
              'I have been here since 8:00.',
            ].map((text) => (
              <KangurLessonInset key={text} accent='rose' className='text-left'>
                <p className='font-semibold text-rose-700'>{text}</p>
              </KangurLessonInset>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: translations('slides.time.cheatsheet.title'),
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            {translations('slides.time.cheatsheet.lead')}
          </KangurLessonLead>
          <KangurLessonCallout accent='rose' padding='sm'>
            <div className={`${KANGUR_WRAP_ROW_CLASSNAME} text-xs font-semibold`}>
              <KangurLessonChip accent='rose'>at + exact time</KangurLessonChip>
              <KangurLessonChip accent='rose'>on + day/date</KangurLessonChip>
              <KangurLessonChip accent='rose'>in + month/year</KangurLessonChip>
              <KangurLessonChip accent='rose'>in the morning</KangurLessonChip>
              <KangurLessonChip accent='rose'>at night</KangurLessonChip>
            </div>
          </KangurLessonCallout>
          <KangurLessonInset accent='rose' className='text-left'>
            <p className='text-sm font-semibold text-rose-700'>
              We practice in the afternoon, but the quiz is at 5:00.
            </p>
          </KangurLessonInset>
        </KangurLessonStack>
      ),
    },
  ],
  place: [
    {
      title: translations('slides.place.core.title'),
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            {translations('slides.place.core.lead')}
          </KangurLessonLead>
          <KangurLessonVisual
            accent='rose'
            caption={translations('slides.place.core.caption')}
          >
            <EnglishPrepositionsPlaceAnimation />
          </KangurLessonVisual>
          <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} text-sm`}>
            {[
              'Meet me at the bus stop.',
              'The calculator is in the backpack.',
              'The formula is on the screen.',
            ].map((text) => (
              <KangurLessonInset key={text} accent='rose' className='text-left'>
                <p className='font-semibold text-rose-700'>{text}</p>
              </KangurLessonInset>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: translations('slides.place.schoolMap.title'),
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            {translations('slides.place.schoolMap.lead')}
          </KangurLessonLead>
          <KangurLessonCallout accent='rose' padding='sm'>
            <div className='space-y-2 text-sm text-slate-700'>
              <p>
                <strong>at school</strong> ={' '}
                {translations('slides.place.schoolMap.items.atSchool')}
              </p>
              <p>
                <strong>in the classroom</strong> ={' '}
                {translations('slides.place.schoolMap.items.inClassroom')}
              </p>
              <p>
                <strong>on the desk</strong> ={' '}
                {translations('slides.place.schoolMap.items.onDesk')}
              </p>
            </div>
          </KangurLessonCallout>
          <KangurLessonInset accent='rose' className='text-left'>
            <p className='text-sm font-semibold text-rose-700'>
              We are at school, in the classroom, with notes on the desk.
            </p>
          </KangurLessonInset>
        </KangurLessonStack>
      ),
    },
  ],
  relations: [
    {
      title: translations('slides.relations.core.title'),
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            {translations('slides.relations.core.lead')}
          </KangurLessonLead>
          <KangurLessonVisual
            accent='violet'
            caption={translations('slides.relations.core.caption')}
          >
            <EnglishPrepositionsRelationsDiagram />
          </KangurLessonVisual>
          <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} text-sm`}>
            {[
              'Point P is between A and B.',
              'The graph is above the axis.',
              'The label sits below the chart.',
              'The triangle is next to the square.',
              'The coach stands in front of the board.',
            ].map((text) => (
              <KangurLessonInset key={text} accent='violet' className='text-left'>
                <p className='font-semibold text-violet-700'>{text}</p>
              </KangurLessonInset>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
  ],
  traps: [
    {
      title: translations('slides.traps.common.title'),
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            {translations('slides.traps.common.lead')}
          </KangurLessonLead>
          <KangurLessonCallout accent='amber' padding='sm'>
            <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} sm:grid-cols-2 text-sm`}>
              <KangurLessonInset accent='emerald' className='text-left'>
                <p className='font-semibold text-emerald-700'>at night</p>
                <p className='text-xs text-slate-500'>
                  {translations('slides.traps.common.notes.atNight')}
                </p>
              </KangurLessonInset>
              <KangurLessonInset accent='rose' className='text-left'>
                <p className='font-semibold text-rose-600 line-through'>in the night</p>
                <p className='text-xs text-slate-500'>
                  {translations('slides.traps.common.notes.inTheNight')}
                </p>
              </KangurLessonInset>
              <KangurLessonInset accent='emerald' className='text-left'>
                <p className='font-semibold text-emerald-700'>on the bus</p>
                <p className='text-xs text-slate-500'>
                  {translations('slides.traps.common.notes.onTheBus')}
                </p>
              </KangurLessonInset>
              <KangurLessonInset accent='emerald' className='text-left'>
                <p className='font-semibold text-emerald-700'>in the car</p>
                <p className='text-xs text-slate-500'>
                  {translations('slides.traps.common.notes.inTheCar')}
                </p>
              </KangurLessonInset>
              <KangurLessonInset accent='emerald' className='text-left'>
                <p className='font-semibold text-emerald-700'>at school</p>
                <p className='text-xs text-slate-500'>
                  {translations('slides.traps.common.notes.atSchool')}
                </p>
              </KangurLessonInset>
              <KangurLessonInset accent='emerald' className='text-left'>
                <p className='font-semibold text-emerald-700'>in the classroom</p>
                <p className='text-xs text-slate-500'>
                  {translations('slides.traps.common.notes.inTheClassroom')}
                </p>
              </KangurLessonInset>
            </div>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
  practice: [
    {
      title: translations('slides.practice.quick.title'),
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            {translations('slides.practice.quick.lead')}
          </KangurLessonLead>
          <KangurLessonCallout accent='rose' padding='sm'>
            <div className='space-y-3 text-sm text-slate-700'>
              <p>{translations('slides.practice.quick.examplesLabel')}</p>
              <div className={`${KANGUR_WRAP_ROW_CLASSNAME} text-xs font-semibold`}>
                <KangurLessonChip accent='rose'>at · We · 8:00 · start</KangurLessonChip>
                <KangurLessonChip accent='amber'>desk · the · notes · are · on · The</KangurLessonChip>
                <KangurLessonChip accent='violet'>between · P · A · and · Point · is · B</KangurLessonChip>
              </div>
            </div>
            <KangurLessonCaption className='mt-3'>
              {translations('slides.practice.quick.caption')}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
  summary: [
    {
      title: translations('slides.summary.recap.title'),
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            {translations('slides.summary.recap.lead')}
          </KangurLessonLead>
          <KangurLessonCallout accent='rose' padding='sm'>
            <ul className='space-y-2 text-sm text-slate-700'>
              <li>{translations('slides.summary.recap.items.at')}</li>
              <li>{translations('slides.summary.recap.items.on')}</li>
              <li>{translations('slides.summary.recap.items.in')}</li>
              <li>{translations('slides.summary.recap.items.between')}</li>
              <li>{translations('slides.summary.recap.items.questions')}</li>
            </ul>
          </KangurLessonCallout>
          <div className={`${KANGUR_WRAP_ROW_CLASSNAME} text-xs font-semibold`}>
            <KangurLessonChip accent='rose'>⏰ at</KangurLessonChip>
            <KangurLessonChip accent='rose'>📅 on</KangurLessonChip>
            <KangurLessonChip accent='rose'>🗓️ in</KangurLessonChip>
            <KangurLessonChip accent='rose'>📍 between</KangurLessonChip>
          </div>
        </KangurLessonStack>
      ),
    },
  ],
});

const PREPOSITIONS_SECTION_META: Array<{
  id: SectionId;
  emoji: string;
  key: string;
  isGame?: boolean;
}> = [
  { id: 'intro', emoji: '🧭', key: 'intro' },
  { id: 'time', emoji: '⏰', key: 'time' },
  { id: 'place', emoji: '📍', key: 'place' },
  { id: 'relations', emoji: '🧩', key: 'relations' },
  { id: 'traps', emoji: '⚠️', key: 'traps' },
  { id: 'practice', emoji: '✅', key: 'practice' },
  { id: 'summary', emoji: '🧠', key: 'summary' },
  { id: 'game_prepositions', emoji: '🎯', key: 'gamePrepositions', isGame: true },
  {
    id: 'game_prepositions_sort',
    emoji: '🧲',
    key: 'gamePrepositionsSort',
    isGame: true,
  },
  {
    id: 'game_prepositions_order',
    emoji: '🧩',
    key: 'gamePrepositionsOrder',
    isGame: true,
  },
];

export default function EnglishPrepositionsLesson(): React.JSX.Element {
  const shellTranslations = useTranslations('KangurStaticLessons.englishPrepositionsShell');
  const contentTranslations = useTranslations('KangurStaticLessons.englishPrepositions');
  const localizedSections = useMemo(
    () =>
      PREPOSITIONS_SECTION_META.map((section) => ({
        id: section.id,
        emoji: section.emoji,
        title: shellTranslations(`sections.${section.key}.title`),
        description: shellTranslations(`sections.${section.key}.description`),
        isGame: section.isGame,
      })),
    [shellTranslations]
  );
  const localizedSlides = useMemo(
    () => buildEnglishPrepositionsSlides(contentTranslations),
    [contentTranslations]
  );
  const sectionTitles = useMemo(
    () =>
      Object.fromEntries(localizedSections.map((section) => [section.id, section.title])) as Record<
        SectionId,
        string
      >,
    [localizedSections]
  );
  const sectionDescriptions = useMemo(
    () =>
      Object.fromEntries(
        localizedSections.map((section) => [section.id, section.description ?? ''])
      ) as Record<SectionId, string>,
    [localizedSections]
  );

  return (
    <KangurUnifiedLesson
      progressMode='panel'
      lessonId={LESSON_KEY}
      lessonEmoji='🧭'
      lessonTitle={shellTranslations('lessonTitle')}
      sections={localizedSections}
      slides={localizedSlides}
      gradientClass='kangur-gradient-accent-rose'
      progressDotClassName='bg-rose-300'
      dotActiveClass='bg-rose-500'
      dotDoneClass='bg-rose-300'
      completionSectionId='summary'
      autoRecordComplete
      scorePercent={120}
      skipMarkFor={[
        'game_prepositions',
        'game_prepositions_sort',
        'game_prepositions_order',
      ]}
      games={[
        {
          sectionId: 'game_prepositions',
          stage: {
            accent: 'rose',
            title: sectionTitles.game_prepositions,
            icon: '🎯',
            description: sectionDescriptions.game_prepositions,
            shellTestId: 'english-prepositions-game-shell',
          },
          render: ({ onFinish }) => <EnglishPrepositionsGame onFinish={onFinish} />,
        },
        {
          sectionId: 'game_prepositions_sort',
          stage: {
            accent: 'rose',
            title: sectionTitles.game_prepositions_sort,
            icon: '🧲',
            description: sectionDescriptions.game_prepositions_sort,
            maxWidthClassName: 'max-w-3xl',
            shellTestId: 'english-prepositions-sort-game-shell',
          },
          render: ({ onFinish }) => <EnglishPrepositionsSortGame onFinish={onFinish} />,
        },
        {
          sectionId: 'game_prepositions_order',
          stage: {
            accent: 'rose',
            title: sectionTitles.game_prepositions_order,
            icon: '🧩',
            description: sectionDescriptions.game_prepositions_order,
            maxWidthClassName: 'max-w-3xl',
            shellTestId: 'english-prepositions-order-game-shell',
          },
          render: ({ onFinish }) => <EnglishPrepositionsOrderGame onFinish={onFinish} />,
        },
      ]}
    />
  );
}
