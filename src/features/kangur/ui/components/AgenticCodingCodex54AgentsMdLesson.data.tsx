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
import { useId } from 'react';

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

export const AgentsMdLayeringVisual = (): JSX.Element => {
  const baseId = useId().replace(/:/g, '');
  const clipId = `agentic-agents-md-layering-${baseId}-clip`;
  const panelGradientId = `agentic-agents-md-layering-${baseId}-panel`;
  const frameGradientId = `agentic-agents-md-layering-${baseId}-frame`;

  return (
    <svg
      aria-label='Diagram: warstwowanie AGENTS.md w repo.'
      className='h-auto w-full'
      data-testid='agentic-agents-md-layering-animation'
      role='img'
      viewBox='0 0 360 160'
    >
      <defs>
        <clipPath id={clipId}>
          <rect x='10' y='10' width='340' height='140' rx='24' />
        </clipPath>
        <linearGradient
          id={panelGradientId}
          x1='16'
          x2='342'
          y1='16'
          y2='148'
          gradientUnits='userSpaceOnUse'
        >
          <stop offset='0%' stopColor='#fffbeb' />
          <stop offset='52%' stopColor='#fef3c7' />
          <stop offset='100%' stopColor='#f8fafc' />
        </linearGradient>
        <linearGradient
          id={frameGradientId}
          x1='18'
          x2='342'
          y1='18'
          y2='18'
          gradientUnits='userSpaceOnUse'
        >
          <stop offset='0%' stopColor='rgba(245,158,11,0.82)' />
          <stop offset='50%' stopColor='rgba(251,191,36,0.82)' />
          <stop offset='100%' stopColor='rgba(245,158,11,0.8)' />
        </linearGradient>
      </defs>

      <g clipPath={`url(#${clipId})`} data-testid='agentic-agents-md-layering-atmosphere'>
        <rect
          x='10'
          y='10'
          width='340'
          height='140'
          rx='24'
          fill={`url(#${panelGradientId})`}
          stroke='rgba(245,158,11,0.16)'
          strokeWidth='2'
        />
        <ellipse cx='84' cy='32' rx='74' ry='18' fill='rgba(251,191,36,0.16)' />
        <ellipse cx='286' cy='36' rx='76' ry='18' fill='rgba(245,158,11,0.12)' />
        <ellipse cx='190' cy='132' rx='100' ry='20' fill='rgba(217,119,6,0.1)' />

        <rect x='20' y='28' width='160' height='40' rx='14' fill='rgba(255,255,255,0.9)' stroke='#fcd34d' strokeWidth='2' />
        <rect x='180' y='28' width='160' height='40' rx='14' fill='rgba(255,255,255,0.92)' stroke='#fbbf24' strokeWidth='2' />
        <rect x='110' y='88' width='140' height='40' rx='14' fill='rgba(255,251,235,0.94)' stroke='#f59e0b' strokeWidth='2' />
        <rect x='34' y='40' width='34' height='8' rx='4' fill='rgba(245,158,11,0.18)' />
        <rect x='194' y='40' width='52' height='8' rx='4' fill='rgba(245,158,11,0.18)' />
        <rect x='126' y='100' width='42' height='8' rx='4' fill='rgba(217,119,6,0.18)' />

        <path d='M100 68 L140 88' stroke='#94a3b8' strokeWidth='2.5' fill='none' />
        <path d='M260 68 L210 88' stroke='#94a3b8' strokeWidth='2.5' fill='none' />

        <text x='36' y='53' fontSize='10' fontWeight='700' fontFamily='"Space Grotesk", "IBM Plex Sans", sans-serif' fill='#0f172a'>/AGENTS.md</text>
        <text x='196' y='53' fontSize='9' fontWeight='700' fontFamily='"Space Grotesk", "IBM Plex Sans", sans-serif' fill='#0f172a'>/apps/api/AGENTS.override.md</text>
        <text x='132' y='113' fontSize='10' fontWeight='700' fontFamily='"Space Grotesk", "IBM Plex Sans", sans-serif' fill='#0f172a'>Closest wins</text>
      </g>

      <rect
        x='18'
        y='18'
        width='324'
        height='124'
        rx='20'
        fill='none'
        stroke={`url(#${frameGradientId})`}
        strokeWidth='1.8'
        data-testid='agentic-agents-md-layering-frame'
      />
    </svg>
  );
};

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
