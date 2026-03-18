import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import {
  KangurLessonCallout,
  KangurLessonLead,
  KangurLessonStack,
  KangurLessonVisual,
} from '@/features/kangur/ui/design/lesson-primitives';
import {
  AgenticRolloutMetricsAnimation,
  AgenticRolloutStagesAnimation,
} from '@/features/kangur/ui/components/LessonAnimations';
import { AgenticCodingMiniGame } from '@/features/kangur/ui/components/AgenticCodingMiniGames';
import AgenticLessonQuickCheck from '@/features/kangur/ui/components/AgenticLessonQuickCheck';
import AgenticLessonCodeBlock from '@/features/kangur/ui/components/AgenticLessonCodeBlock';

type SectionId = 'rollout';

const ENABLEMENT_ASSETS = [
  'AGENTS.md + prompt library w repo.',
  'Checklisty dla review i testów.',
  'Szablony briefów (bugfix/refactor/review).',
] as const;

const SUCCESS_METRICS = [
  'Skrócony czas dostarczania zmian.',
  'Mniej regresji i mniej hotfixów.',
  'Wyższa przewidywalność scope i kosztu.',
] as const;

const ROLLOUT_CHECKLIST = `Rollout checklist:
- Pilot owners assigned
- AGENTS.md + prompt library ready
- Metrics dashboard defined
- Review/QA gate agreed
- Feedback loop scheduled`;

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  rollout: [
    {
      title: 'Etapy rolloutu',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Najlepszy rollout zaczyna się od pilota i kończy na skali zespołu.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='teal'
            caption='Pilot → Playbook → Metrics → Scale.'
            maxWidthClassName='max-w-full'
          >
            <AgenticRolloutStagesAnimation />
          </KangurLessonVisual>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Enablement assets',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Zespół potrzebuje materiałów startowych i jasnych zasad, inaczej jakość
            spadnie przy skali.
          </KangurLessonLead>
          <KangurLessonCallout accent='teal' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-teal-950'>
              {ENABLEMENT_ASSETS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Metrics i feedback',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Bez metryk rollout jest tylko nadzieją. Mierz czas, jakość i regresje.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='teal'
            caption='Adopcja i jakość rosną, gdy mierzymy postęp.'
            maxWidthClassName='max-w-full'
          >
            <AgenticRolloutMetricsAnimation />
          </KangurLessonVisual>
          <KangurLessonCallout accent='teal' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-teal-950'>
              {SUCCESS_METRICS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Rollout checklist',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Ustal checklistę przed skalowaniem - to stabilizuje jakość.
          </KangurLessonLead>
          <AgenticLessonCodeBlock
            accent='teal'
            title='Checklist'
            code={ROLLOUT_CHECKLIST}
          />
        </KangurLessonStack>
      ),
    },
    {
      title: 'Quick check',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Od czego zaczyna się rollout w zespole?
          </KangurLessonLead>
          <AgenticLessonQuickCheck
            accent='teal'
            question='Wybierz najlepszą odpowiedź.'
            choices={[
              { id: 'a', label: 'Od pilota.', correct: true },
              { id: 'b', label: 'Od pełnego wdrożenia.' },
              { id: 'c', label: 'Od migracji całej bazy.' },
            ]}
          />
        </KangurLessonStack>
      ),
    },
    {
      title: 'Mini game: Rollout Stages',
      content: <AgenticCodingMiniGame gameId='rollout' />,
      panelClassName: 'w-full',
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'rollout',
    emoji: '🚀',
    title: 'Team Rollout',
    description: 'Pilot, playbook i metryki jakości.',
    slideCount: SLIDES.rollout.length,
  },
] as const;
