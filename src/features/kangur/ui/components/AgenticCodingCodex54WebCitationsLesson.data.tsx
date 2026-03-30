import type { LessonSlide } from '@/features/kangur/ui/components/lesson-framework/LessonSlideSection';
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
import { AgenticCodingMiniGame } from '@/features/kangur/ui/components/AgenticCodingMiniGames';
import AgenticLessonQuickCheck from '@/features/kangur/ui/components/AgenticLessonQuickCheck';
import AgenticLessonCodeBlock from '@/features/kangur/ui/components/AgenticLessonCodeBlock';

type SectionId = 'web_citations';

const MUST_USE_WEB = [
  'Informacje mogą się zmienić: news, ceny, prawo, harmonogramy, specyfikacje.',
  'Użytkownik prosi o "latest", weryfikację lub "are you sure".',
  'Pojawia się nieznany termin lub możliwa literówka.',
  'Rekomendacje wymagające czasu lub pieniędzy.',
  'Wymagane cytaty, linki albo precyzyjne źródła.',
  'Temat jest medyczny, prawny lub finansowy (high-stakes).',
  'Wskazana jest konkretna strona lub dokument, którego nie mamy.',
] as const;

const MUST_NOT_USE_WEB = [
  'Tłumaczenia, rewrite i kreatywne pisanie bez potrzeby aktualności.',
  'Streszczenie tekstu dostarczonego przez użytkownika.',
  'Small talk bez potrzeby świeżych danych.',
  'Użytkownik wprost mówi: "nie przeszukuj sieci".',
] as const;

const CITATION_RULES = [
  'Jeśli używasz web.run choć raz, cytuj wszystkie wspieralne fakty.',
  'Cytacje po kropce, nie w bold/italic ani w code fence.',
  'Minimum 5 kluczowych stwierdzeń musi mieć źródła.',
  'Stawiaj na autorytatywne domeny i różnorodne źródła.',
  'Unikaj długich cytatów: max 25 słów z jednego źródła.',
] as const;

const SOURCE_RULES = [
  {
    title: 'OpenAI products',
    description: 'Korzystaj tylko z oficjalnych domen OpenAI.',
  },
  {
    title: 'Technical Q&A',
    description: 'Opieraj się na źródłach pierwotnych (docs, papers).',
  },
  {
    title: 'Weather/finance/sports/time',
    description: 'Używaj dedykowanych narzędzi zamiast web search.',
  },
  {
    title: 'Recency',
    description: 'Podawaj daty, gdy informacja może się zmieniać.',
  },
] as const;

const CITATION_EXAMPLE = `Fakt wsparty źródłem. citesource1
Drugi fakt z innym źródłem. citesource2`;

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  web_citations: [
    {
      title: 'Kiedy web search jest obowiązkowy',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Web search nie jest opcjonalny, gdy wiedza może być nieaktualna lub gdy
            użytkownik potrzebuje weryfikacji.
          </KangurLessonLead>
          <KangurLessonCallout accent='sky' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-sky-950'>
              {MUST_USE_WEB.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Kiedy web search jest zabroniony',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Są sytuacje, w których przeszukiwanie sieci tylko spowalnia i zwiększa ryzyko.
          </KangurLessonLead>
          <KangurLessonCallout accent='sky' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-sky-950'>
              {MUST_NOT_USE_WEB.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Citations = kontrakt zaufania',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Cytacje to część odpowiedzialności agenta. Bez nich trudno zweryfikować fakty.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='sky'
            caption='Źródła podnoszą wiarygodność i skracają review.'
            maxWidthClassName='max-w-full'
          >
            <AgenticDocsStackAnimation />
          </KangurLessonVisual>
          <KangurLessonCallout accent='sky' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-sky-950'>
              {CITATION_RULES.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
          <AgenticLessonCodeBlock
            accent='sky'
            title='Przykład cytowania'
            code={CITATION_EXAMPLE}
          />
        </KangurLessonStack>
      ),
    },
    {
      title: 'Specjalne reguły źródeł',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Dla niektórych tematów obowiązują twardsze zasady źródeł i narzędzi.
          </KangurLessonLead>
          <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} sm:grid-cols-2`}>
            {SOURCE_RULES.map((item) => (
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
      title: 'Quick check',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Kiedy musisz użyć web.run?
          </KangurLessonLead>
          <AgenticLessonQuickCheck
            accent='sky'
            question='Wybierz najlepszą odpowiedź.'
            choices={[
              { id: 'a', label: 'Gdy dane mogą się zmienić lub użytkownik prosi o weryfikację.', correct: true },
              { id: 'b', label: 'Gdy tłumaczysz krótkie zdanie.' },
              { id: 'c', label: 'Gdy streszczasz tekst podany przez użytkownika.' },
            ]}
          />
        </KangurLessonStack>
      ),
    },
    {
      title: 'Mini game: Citation Check',
      content: <AgenticCodingMiniGame gameId='web_citations' />,
      panelClassName: 'w-full',
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'web_citations',
    emoji: '🌐',
    title: 'Web & Citations',
    description: 'Kiedy szukać w sieci i jak cytować źródła.',
    slideCount: SLIDES.web_citations.length,
  },
] as const;
