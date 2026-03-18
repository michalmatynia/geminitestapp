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
  AgenticResponsesStreamAnimation,
  AgenticToolLoopAnimation,
} from '@/features/kangur/ui/components/LessonAnimations';
import AgenticLessonQuickCheck from '@/features/kangur/ui/components/AgenticLessonQuickCheck';

type SectionId = 'responses';

const RESPONSES_CORE = [
  'Jeden endpoint obsługuje tekst, narzędzia i multimodalne akcje.',
  'Wyniki przychodzą jako itemy w output, możliwe jest streamowanie.',
  'API jest bazą pod agentów, automatyzacje i narzędzia.',
] as const;

const TOOL_RULES = [
  { title: 'tools', description: 'Definiujesz listę funkcji lub narzędzi w JSON Schema.' },
  { title: 'tool_choice', description: 'Auto, required albo wymuszenie konkretnej funkcji.' },
  { title: 'parallel_tool_calls', description: 'Steruje, czy model może wołać wiele narzędzi naraz.' },
  { title: 'built-in tools', description: 'Web search, code interpreter, MCP i więcej.' },
] as const;

const REACT_SCHEMA = `response_format: {
  type: "json_schema",
  json_schema: {
    name: "ReactCard",
    schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        tone: { type: "string" },
        cta: { type: "string" }
      },
      required: ["title", "cta"]
    }
  }
}`;

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  responses: [
    {
      title: 'Responses API jako rdzeń agenta',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Responses API to jedno miejsce na tekst, narzędzia i streaming odpowiedzi.
            Dzięki temu łatwiej budujesz workflow agenta.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='sky'
            caption='Strumień zdarzeń pokazuje postęp odpowiedzi.'
            maxWidthClassName='max-w-full'
          >
            <AgenticResponsesStreamAnimation />
          </KangurLessonVisual>
          <KangurLessonCallout accent='sky' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-sky-950'>
              {RESPONSES_CORE.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Tool-calling loop',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Responses API pozwala wprowadzić pętlę: model → narzędzie → wynik → finalna odpowiedź.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='sky'
            caption='Loop narzędzi przyspiesza pracę na repo i danych.'
            maxWidthClassName='max-w-full'
          >
            <AgenticToolLoopAnimation />
          </KangurLessonVisual>
          <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} sm:grid-cols-2`}>
            {TOOL_RULES.map((item) => (
              <KangurLessonInset key={item.title} accent='sky'>
                <div className='text-xs font-semibold uppercase tracking-[0.2em] text-sky-500'>
                  {item.title}
                </div>
                <KangurLessonCaption className='mt-2 text-sky-950'>
                  {item.description}
                </KangurLessonCaption>
              </KangurLessonInset>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Structured outputs dla UI',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Gdy agent ma budować UI (np. React), wymuś JSON Schema i odbierz gotowe propsy.
          </KangurLessonLead>
          <KangurLessonInset
            accent='sky'
            className='border-sky-900/70 bg-slate-950 text-slate-100'
          >
            <div className='text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-200'>
              React props schema
            </div>
            <pre className='mt-2 whitespace-pre-wrap text-xs leading-relaxed'>
              <code>{REACT_SCHEMA}</code>
            </pre>
          </KangurLessonInset>
          <KangurLessonCallout accent='sky' padding='sm' className='text-left'>
            <KangurLessonCaption className='text-sky-950'>
              Schemat = mniej ręcznej walidacji i mniej bugów w UI.
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Quick check',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Który parametr steruje wyborem narzędzia?
          </KangurLessonLead>
          <AgenticLessonQuickCheck
            accent='sky'
            question='Wybierz najlepszą odpowiedź.'
            choices={[
              { id: 'a', label: 'tool_choice', correct: true },
              { id: 'b', label: 'store' },
              { id: 'c', label: 'temperature' },
            ]}
          />
        </KangurLessonStack>
      ),
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'responses',
    emoji: '📡',
    title: 'Responses & Tools',
    description: 'Responses API, tool calling i structured outputs.',
    slideCount: SLIDES.responses.length,
  },
] as const;
