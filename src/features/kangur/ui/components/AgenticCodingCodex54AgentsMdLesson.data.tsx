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
import { AgenticCodingMiniGame } from '@/features/kangur/ui/components/AgenticCodingMiniGames';
import AgenticLessonQuickCheck from '@/features/kangur/ui/components/AgenticLessonQuickCheck';
import AgenticLessonCodeBlock from '@/features/kangur/ui/components/AgenticLessonCodeBlock';

type SectionId = 'agents_md';

const WHY_AGENTS = [
  'Stałe reguły bez powtarzania w promptach.',
  'Mniej błędów wynikających z brakującego kontekstu.',
  'Szybsze onboardowanie agentów i ludzi.',
] as const;

const TEMPLATE_BLOCKS = [
  { title: 'Repo map', description: 'Gdzie są kluczowe moduły i warstwy.' },
  { title: 'Commands', description: 'install/dev/test/lint/typecheck.' },
  { title: 'Rules', description: 'Konwencje, zakazy, API contracts.' },
  { title: 'Done means', description: 'Testy, review i opis ryzyk.' },
] as const;

const PLACEMENT = [
  'Plik bliżej katalogu roboczego ma wyższy priorytet.',
  'Utrzymuj go krótko i aktualnie.',
  'Dodawaj tylko zasady, które realnie wpływają na jakość.',
] as const;

const LAYERING_RULES = [
  'AGENTS.md w repo root opisuje bazowe zasady.',
  'AGENTS.override.md w podkatalogu nadpisuje szersze reguły.',
  'Najbliższy plik w drzewie wygrywa.',
] as const;

const VERIFY_SETUP = [
  'codex --ask-for-approval never "Summarize the current instructions."',
  'codex --cd subdir --ask-for-approval never "Show which instruction files are active."',
  'Sprawdź ~/.codex/log/codex-tui.log po sesji.',
] as const;

const AGENTS_MD_TEMPLATE = `# AGENTS.md
## Repo map
- apps/web (frontend), apps/api (backend)
- shared/lib (shared utilities)

## Commands
- install: npm install
- test: npm run test
- lint: npm run lint

## Rules
- No new deps without approval
- Keep API contracts stable

## Done means
- Tests + lint pass
- Diff reviewed, risks listed`;

const AgentsMdLayeringVisual = (): JSX.Element => (
  <svg
    aria-label='Diagram: warstwowanie AGENTS.md w repo.'
    className='h-auto w-full'
    role='img'
    viewBox='0 0 360 140'
  >
    <style>{`
      .panel {
        fill: #f8fafc;
        stroke: #e2e8f0;
        stroke-width: 2;
      }
      .label {
        font: 700 10px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
        fill: #0f172a;
      }
      .arrow {
        stroke: #94a3b8;
        stroke-width: 2;
        fill: none;
      }
    `}</style>
    <rect className='panel' height='36' rx='10' width='160' x='20' y='28' />
    <rect className='panel' height='36' rx='10' width='160' x='180' y='28' />
    <rect className='panel' height='36' rx='10' width='140' x='110' y='84' />
    <text className='label' x='36' y='50'>/AGENTS.md</text>
    <text className='label' x='196' y='50'>/apps/api/AGENTS.override.md</text>
    <text className='label' x='132' y='106'>Closest wins</text>
    <path className='arrow' d='M100 64 L140 84' />
    <path className='arrow' d='M260 64 L210 84' />
  </svg>
);

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  agents_md: [
    {
      title: 'Dlaczego AGENTS.md działa',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            AGENTS.md to repo-kontrakt dla agentów. Zamiast powtarzać zasady w promptach,
            kodujesz je raz w miejscu, które agent zawsze czyta.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='amber'
            caption='Jedno źródło prawdy dla agentów i ludzi.'
            maxWidthClassName='max-w-full'
          >
            <AgenticDocsStackAnimation />
          </KangurLessonVisual>
          <KangurLessonCallout accent='amber' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-amber-950'>
              {WHY_AGENTS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Minimalny template',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Minimalny template jest krótki, ale wystarczający. To fundament jakości pracy.
          </KangurLessonLead>
          <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} sm:grid-cols-2`}>
            {TEMPLATE_BLOCKS.map((item) => (
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
      title: 'Przykład AGENTS.md',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Krótki, konkretny template działa najlepiej. Ten przykład możesz skopiować.
          </KangurLessonLead>
          <AgenticLessonCodeBlock
            accent='amber'
            title='AGENTS.md example'
            code={AGENTS_MD_TEMPLATE}
          />
        </KangurLessonStack>
      ),
    },
    {
      title: 'Placement i utrzymanie',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Dobrze utrzymany AGENTS.md jest najlepszym mnożnikiem jakości pracy agentów.
          </KangurLessonLead>
          <KangurLessonCallout accent='amber' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-amber-950'>
              {PLACEMENT.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Layering i overrides',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            AGENTS.md wspiera warstwowanie reguł. To klucz przy większych repo.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='amber'
            caption='Najbliższy plik z instrukcjami wygrywa.'
            maxWidthClassName='max-w-full'
          >
            <AgentsMdLayeringVisual />
          </KangurLessonVisual>
          <KangurLessonCallout accent='amber' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-amber-950'>
              {LAYERING_RULES.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Verify setup',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Sprawdź, czy Codex wczytuje właściwe instrukcje. To oszczędza dużo czasu.
          </KangurLessonLead>
          <KangurLessonCallout accent='amber' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-amber-950'>
              {VERIFY_SETUP.map((item) => (
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
            Co jest głównym celem AGENTS.md?
          </KangurLessonLead>
          <AgenticLessonQuickCheck
            accent='amber'
            question='Wybierz poprawną odpowiedź.'
            choices={[
              { id: 'a', label: 'Ukrywanie kontekstu repo.' },
              { id: 'b', label: 'Centralny kontrakt zasad, komend i Done.', correct: true },
              { id: 'c', label: 'Opis wizualnego design systemu.' },
            ]}
          />
        </KangurLessonStack>
      ),
    },
    {
      title: 'Mini game: AGENTS.md Map',
      content: <AgenticCodingMiniGame gameId='agents_md' />,
      panelClassName: 'w-full',
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'agents_md',
    emoji: '🗂️',
    title: 'AGENTS.md',
    description: 'Repo-kontrakt, który stabilizuje agentic coding.',
    slideCount: SLIDES.agents_md.length,
  },
] as const;
