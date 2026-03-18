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
import {
  AgenticBackgroundWebhookAnimation,
  AgenticCacheCompactionAnimation,
  AgenticStateChainAnimation,
} from '@/features/kangur/ui/components/LessonAnimations';
import AgenticLessonQuickCheck from '@/features/kangur/ui/components/AgenticLessonQuickCheck';

type SectionId = 'stateScale';

const STATE_RULES = [
  { title: 'store', description: 'Zapisz odpowiedź, aby móc do niej wrócić.' },
  { title: 'previous_response_id', description: 'Kontynuuj rozmowę bez przepisywania historii.' },
  { title: 'input list', description: 'Dodawaj kolejne wiadomości do listy input.' },
  { title: 'output_text', description: 'Wyciągaj gotowy tekst z output.' },
] as const;

const BACKGROUND_RULES = [
  'Użyj background mode dla długich zadań (build, migracje, duże analizy).',
  'Monitoruj status lub odbierz wynik przez webhook.',
  'Dobry fit: generowanie raportów i długie testy.',
] as const;

const WEBHOOK_NOTES = [
  'Obsługuj eventy typu response.completed i response.failed.',
  'Weryfikuj podpis webhooka i zapisuj idempotency key.',
  'Traktuj webhook jak źródło statusu background tasku.',
] as const;

const CACHE_RULES = [
  { title: 'Compaction', description: 'Podsumuj kontekst i zostaw najważniejsze decyzje.' },
  { title: 'Prefix match', description: 'Static prefix na początku zwiększa cache hit rate.' },
  { title: 'prompt_cache_key', description: 'Stabilizuje routing i poprawia trafienia cache.' },
  { title: 'React', description: 'Powtarzalne instrukcje UI trzymają się w cache.' },
] as const;

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  stateScale: [
    {
      title: 'Conversation state',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            W Responses API możesz trzymać stan rozmowy bez ręcznego kopiowania
            całej historii.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='indigo'
            caption='previous_response_id łączy kolejne kroki.'
            maxWidthClassName='max-w-full'
          >
            <AgenticStateChainAnimation />
          </KangurLessonVisual>
          <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} sm:grid-cols-2`}>
            {STATE_RULES.map((item) => (
              <KangurLessonInset key={item.title} accent='indigo'>
                <div className='text-xs font-semibold uppercase tracking-[0.2em] text-indigo-500'>
                  {item.title}
                </div>
                <KangurLessonCaption className='mt-2 text-indigo-950'>
                  {item.description}
                </KangurLessonCaption>
              </KangurLessonInset>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Background mode',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Ustaw background mode, gdy agent ma działać długo (np. analiza builda React).
          </KangurLessonLead>
          <KangurLessonVisual
            accent='indigo'
            caption='Odbieraj wynik przez webhook lub polling.'
            maxWidthClassName='max-w-full'
          >
            <AgenticBackgroundWebhookAnimation />
          </KangurLessonVisual>
          <KangurLessonCallout accent='indigo' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-indigo-950'>
              {BACKGROUND_RULES.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Webhooks',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Webhooki pozwalają automatycznie reagować na zakończenie pracy agenta.
          </KangurLessonLead>
          <KangurLessonCallout accent='indigo' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-indigo-950'>
              {WEBHOOK_NOTES.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Compaction & prompt caching',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Długi kontekst podsumowuj, a powtarzalne prefiksy układaj tak, by cache działał.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='indigo'
            caption='Compaction skraca pamięć, cache redukuje koszt.'
            maxWidthClassName='max-w-full'
          >
            <AgenticCacheCompactionAnimation />
          </KangurLessonVisual>
          <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} sm:grid-cols-2`}>
            {CACHE_RULES.map((item) => (
              <KangurLessonInset key={item.title} accent='indigo'>
                <div className='text-xs font-semibold uppercase tracking-[0.2em] text-indigo-500'>
                  {item.title}
                </div>
                <KangurLessonCaption className='mt-2 text-indigo-950'>
                  {item.description}
                </KangurLessonCaption>
              </KangurLessonInset>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Quick check',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Jak zwiększysz cache hit rate?
          </KangurLessonLead>
          <AgenticLessonQuickCheck
            accent='indigo'
            question='Wybierz najlepszą odpowiedź.'
            choices={[
              { id: 'a', label: 'Static prefix na początku promptu.', correct: true },
              { id: 'b', label: 'Zawsze losuj kolejność sekcji.' },
              { id: 'c', label: 'Wyłącz compaction i cache jednocześnie.' },
            ]}
          />
        </KangurLessonStack>
      ),
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'state-scale',
    emoji: '🗺️',
    title: 'State & Scale',
    description: 'Conversation state, background mode i webhooks.',
    slideCount: SLIDES.stateScale.length,
  },
] as const;
