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
import { AgenticCodingMiniGame } from '@/features/kangur/ui/components/AgenticCodingMiniGames';
import AgenticLessonQuickCheck from '@/features/kangur/ui/components/AgenticLessonQuickCheck';
import AgenticLessonCodeBlock from '@/features/kangur/ui/components/AgenticLessonCodeBlock';

type SectionId = 'state-scale';

const STATE_RULES = [
  { title: 'Responses API', description: 'Stan rozmowy jest wbudowany, bez ręcznego kopiowania.' },
  { title: 'conversation', description: 'Przekazuj identyfikator rozmowy do kolejnych odpowiedzi.' },
  { title: 'previous_response_id', description: 'Łańcuchuj kolejne kroki bez pełnej historii.' },
  { title: 'Chat Completions', description: 'Wymaga manualnego sklejania kontekstu.' },
] as const;

const BACKGROUND_RULES = [
  'Ustaw `background: true`, gdy zadanie trwa długo lub wymaga wielu kroków.',
  'Status śledzisz przez GET /responses (queued → in_progress → terminal).',
  'Background responses możesz anulować, gdy przestają być potrzebne.',
] as const;

const POLLING_NOTES = [
  'Polling sprawdzaj co kilka sekund, aż status będzie terminalny.',
  'W odpowiedzi końcowej odbierasz output_text lub output items.',
  'Cancel jest idempotentny - ponowne wywołanie nie zmienia wyniku.',
] as const;

const CACHE_RULES = [
  { title: 'Compaction', description: 'Włącz `context_management` z `compact_threshold`.' },
  { title: 'Opaque item', description: 'Compaction item przenosi kluczowy stan dalej.' },
  { title: 'Prefix match', description: 'Stały prefix na początku zwiększa cache hit rate.' },
  { title: 'prompt_cache_key', description: 'Ułatwia routing i poprawia trafienia cache.' },
] as const;

const POLLING_EXAMPLE = `// Polling loop (pseudo)
while (status !== "completed") {
  await sleep(3000);
  status = await responses.get(id);
}
// Use output_text or output items`;

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  'state-scale': [
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
            caption='Odbieraj wynik przez polling.'
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
      title: 'Polling & cancel',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Polling to prosty sposób na monitorowanie długich zadań i ich statusu.
          </KangurLessonLead>
          <KangurLessonCallout accent='indigo' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-indigo-950'>
              {POLLING_NOTES.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
          <AgenticLessonCodeBlock
            accent='indigo'
            title='Polling loop'
            code={POLLING_EXAMPLE}
          />
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
              { id: 'a', label: 'Stały prefix na początku promptu.', correct: true },
              { id: 'b', label: 'Zawsze losuj kolejność sekcji.' },
              { id: 'c', label: 'Wyłącz compaction i cache jednocześnie.' },
            ]}
          />
        </KangurLessonStack>
      ),
    },
    {
      title: 'Mini game: State & Scale',
      content: <AgenticCodingMiniGame gameId='state_scale' />,
      panelClassName: 'w-full',
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'state-scale',
    emoji: '🗺️',
    title: 'State & Scale',
    description: 'Conversation state, background mode i webhooks.',
    slideCount: SLIDES['state-scale'].length,
  },
] as const;
