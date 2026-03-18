import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import {
  KangurLessonCallout,
  KangurLessonCaption,
  KangurLessonInset,
  KangurLessonLead,
  KangurLessonStack,
  KangurLessonVisual,
} from '@/features/kangur/ui/design/lesson-primitives';
import { KANGUR_GRID_TIGHT_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { AgenticSkillPipelineAnimation } from '@/features/kangur/ui/components/LessonAnimations';
import AgenticLessonQuickCheck from '@/features/kangur/ui/components/AgenticLessonQuickCheck';

type SectionId = 'non_engineers';

const NON_ENGINEER_BRIEF = [
  { title: 'Goal', description: 'Jasny outcome w języku biznesowym.' },
  { title: 'Context', description: 'Gdzie w produkcie to siedzi i dlaczego.' },
  { title: 'Constraints', description: 'Co jest poza zakresem i czego nie zmieniać.' },
  { title: 'Done when', description: 'Jak poznasz, że wynik jest poprawny.' },
] as const;

const REVIEW_RITUAL = [
  'Poproś o krótki summary + listę ryzyk.',
  'Sprawdź dowód: testy, logi, zrzuty.',
  'Zatwierdź tylko jeśli rozumiesz wpływ na produkt.',
] as const;

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  non_engineers: [
    {
      title: 'Deleguj bez bycia full-time dev',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Nie musisz znać każdego pliku. Wystarczy jasny brief i wymaganie dowodu
            działania. Agent zrobi resztę.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='amber'
            caption='Ty dostarczasz intent, agent dowozi proof.'
            maxWidthClassName='max-w-full'
          >
            <AgenticSkillPipelineAnimation />
          </KangurLessonVisual>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Brief dla non-engineerów',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Używaj tego samego formatu, co inżynierowie. To gwarantuje spójność i
            mniejszą liczbę pytań zwrotnych.
          </KangurLessonLead>
          <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} sm:grid-cols-2`}>
            {NON_ENGINEER_BRIEF.map((item) => (
              <KangurLessonInset key={item.title} accent='amber'>
                <div className='text-xs font-semibold uppercase tracking-[0.2em] text-amber-500'>
                  {item.title}
                </div>
                <KangurLessonCaption className='mt-2 text-amber-950'>
                  {item.description}
                </KangurLessonCaption>
              </KangurLessonInset>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Review ritual',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Kontrola jakości nie wymaga deep dive w kod, ale wymaga dyscypliny.
          </KangurLessonLead>
          <KangurLessonCallout accent='amber' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-amber-950'>
              {REVIEW_RITUAL.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Quick check',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Co powinien zawierać brief non-engineera?
          </KangurLessonLead>
          <AgenticLessonQuickCheck
            accent='amber'
            question='Wybierz najlepszą odpowiedź.'
            choices={[
              { id: 'a', label: 'Goal / Context / Constraints / Done', correct: true },
              { id: 'b', label: 'Tylko opis problemu.' },
              { id: 'c', label: 'Same polecenia CLI.' },
            ]}
          />
        </KangurLessonStack>
      ),
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'non_engineers',
    emoji: '👥',
    title: 'Non-Engineers',
    description: 'Deleguj pracę, zachowując kontrolę jakości.',
    slideCount: SLIDES.non_engineers.length,
  },
] as const;
