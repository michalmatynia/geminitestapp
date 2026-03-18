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
import { AgenticDocsStackAnimation } from '@/features/kangur/ui/components/LessonAnimations';
import AgenticLessonQuickCheck from '@/features/kangur/ui/components/AgenticLessonQuickCheck';

type SectionId = 'response_contract';

const OUTPUT_RULES = [
  'Odpowiedź ma być zwięzła, konkretna i nastawiona na działania.',
  'Bez emoji i bez żargonu, który nie pomaga w decyzji.',
  'Jeśli użytkownik pyta o output komendy, podaj kluczowe linie.',
] as const;

const LIST_RULES = [
  'Brak zagnieżdżonych list - tylko jeden poziom.',
  'Numerowanie zawsze jako 1. 2. 3. (nigdy 1)).',
  'Nagłówki krótkie, Title Case, w **pogrubieniu**.',
] as const;

const FILE_RULES = [
  'Ścieżki plików zawsze w inline code, każda referencja osobno.',
  'Możesz dodać :linia lub #LliniaCkolumna dla precyzji.',
  'Bez file:// i bez linków - same ścieżki w code.',
] as const;

const LINK_RULES = [
  'URL tylko w code lub gdy użytkownik prosi o link.',
  'Code blocki zawsze z info string (np. ts, bash).',
  'Cytaty krótkie: max 25 słów z jednego źródła.',
] as const;

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  response_contract: [
    {
      title: 'Response contract = przewidywalny output',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Format odpowiedzi jest częścią jakości. Dzięki niemu decyzje są szybsze,
            a review krótszy.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='amber'
            caption='Stały format = mniej tarcia.'
            maxWidthClassName='max-w-full'
          >
            <AgenticDocsStackAnimation />
          </KangurLessonVisual>
          <KangurLessonCallout accent='amber' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-amber-950'>
              {OUTPUT_RULES.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Listy i nagłówki',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Prosty format list i nagłówków ułatwia skanowanie odpowiedzi.
          </KangurLessonLead>
          <KangurLessonCallout accent='amber' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-amber-950'>
              {LIST_RULES.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'File references i code blocks',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Ścieżki i snippet powinny być jednoznaczne i łatwe do kliknięcia.
          </KangurLessonLead>
          <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} sm:grid-cols-2`}>
            {FILE_RULES.map((item) => (
              <KangurLessonInset key={item} accent='amber'>
                <KangurLessonCaption className='text-amber-950'>{item}</KangurLessonCaption>
              </KangurLessonInset>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Linki i cytaty',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Linki i cytaty są częścią kontraktu jakości, ale tylko w kontrolowanej formie.
          </KangurLessonLead>
          <KangurLessonCallout accent='amber' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-amber-950'>
              {LINK_RULES.map((item) => (
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
            Jak formatować listy w odpowiedzi?
          </KangurLessonLead>
          <AgenticLessonQuickCheck
            accent='amber'
            question='Wybierz najlepszą odpowiedź.'
            choices={[
              { id: 'a', label: 'Jedno poziomowe listy i numerowanie 1. 2. 3.', correct: true },
              { id: 'b', label: 'Dowolne zagnieżdżenia i format 1).' },
              { id: 'c', label: 'Listy tylko w tabelach.' },
            ]}
          />
        </KangurLessonStack>
      ),
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'response_contract',
    emoji: '📐',
    title: 'Response Contract',
    description: 'Format odpowiedzi, listy, ścieżki i code blocks.',
    slideCount: SLIDES.response_contract.length,
  },
] as const;
