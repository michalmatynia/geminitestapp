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
  AgenticSkillManifestAnimation,
  AgenticSkillPipelineAnimation,
} from '@/features/kangur/ui/components/LessonAnimations';
import { AgenticCodingMiniGame } from '@/features/kangur/ui/components/AgenticCodingMiniGames';
import AgenticLessonQuickCheck from '@/features/kangur/ui/components/AgenticLessonQuickCheck';
import AgenticLessonCodeBlock from '@/features/kangur/ui/components/AgenticLessonCodeBlock';

type SectionId = 'skills';

const WHEN_TO_BUILD = [
  'Zadanie wraca co tydzień lub w każdym sprincie.',
  'Masz stały flow: import, raport, backfill, audit.',
  'Potrzebujesz spójnych logów lub audytu zmian.',
  'Chcesz odseparować ryzyko od głównego promptu.',
] as const;

const SKILL_CONTRACT = [
  { title: 'Inputs', description: 'Wejścia, które agent musi dostać (np. repo path, config).' },
  { title: 'Tools', description: 'Zestaw narzędzi i komend, które skill może uruchamiać.' },
  { title: 'Outputs', description: 'Jak wygląda wynik: diff, raport, lista zmian.' },
  { title: 'Safety', description: 'Guardrails, limity i wymagane approvals.' },
] as const;

const SKILL_QUALITY = [
  'Wejścia są jawne i możliwe do walidacji.',
  'Output ma jeden format, który łatwo skanować.',
  'Guardrails i approvals są spisane wprost.',
] as const;

const MCP_CLI_COMMANDS = [
  { title: 'codex mcp list / get', description: 'Lista i podgląd konfiguracji serwerów.' },
  { title: 'codex mcp add <name>', description: 'Rejestracja serwera (URL lub STDIO).' },
  { title: 'codex mcp remove <name>', description: 'Usuwanie integracji MCP.' },
  { title: 'codex mcp login / logout', description: 'Obsługa OAuth dla serwerów MCP.' },
  { title: 'codex mcp-server', description: 'Uruchom Codex jako MCP server (stdio).' },
] as const;

const SKILL_MANIFEST_TEMPLATE = `name: audit-react-hooks
inputs:
  - repo_path
  - scope: "src/features/*"
tools:
  - rg
  - eslint
outputs:
  - report.md
safety:
  approvals: workspace-write
  network: disabled`;

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  skills: [
    {
      title: 'Skills = powtarzalność bez tarcia',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Skills pakują powtarzalne workflow, a MCP daje zewnętrzny kontekst. Skills
            działają w CLI, IDE extension i Codex app.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='emerald'
            caption='Prompt → Skill → Tools → Output.'
            maxWidthClassName='max-w-full'
          >
            <AgenticSkillPipelineAnimation />
          </KangurLessonVisual>
          <KangurLessonCallout accent='emerald' padding='sm' className='text-left'>
            <KangurLessonCaption className='text-emerald-950'>
              Przykład: skill do audytu React hooks albo generowania changelogów.
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Manifest skilla',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Spisz minimalny manifest: wejścia, narzędzia, output i safety. To gwarantuje,
            że skill jest powtarzalny i bezpieczny.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='emerald'
            caption='Manifest ułatwia audit i reuse.'
            maxWidthClassName='max-w-full'
          >
            <AgenticSkillManifestAnimation />
          </KangurLessonVisual>
          <KangurLessonCallout accent='emerald' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-emerald-950'>
              {SKILL_QUALITY.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
          <AgenticLessonCodeBlock
            accent='emerald'
            title='Skill manifest'
            code={SKILL_MANIFEST_TEMPLATE}
          />
        </KangurLessonStack>
      ),
    },
    {
      title: 'MCP w CLI',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Jeśli integrujesz Codex z narzędziami zewnętrznymi, CLI daje szybkie wejście
            do konfiguracji MCP.
          </KangurLessonLead>
          <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} sm:grid-cols-2`}>
            {MCP_CLI_COMMANDS.map((item) => (
              <KangurLessonInset key={item.title} accent='emerald'>
                <div className='text-xs font-semibold uppercase tracking-[0.2em] text-emerald-500'>
                  {item.title}
                </div>
                <KangurLessonCaption className='mt-2 text-emerald-950'>
                  {item.description}
                </KangurLessonCaption>
              </KangurLessonInset>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Kiedy budować skill',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Jeśli zadanie jest powtarzalne lub krytyczne, skill daje spójność i mniejszy
            koszt utrzymania.
          </KangurLessonLead>
          <KangurLessonCallout accent='emerald' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-emerald-950'>
              {WHEN_TO_BUILD.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Minimalny kontrakt skilla',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Najlepsze skills mają jasne wejścia i przewidywalny output.
          </KangurLessonLead>
          <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} sm:grid-cols-2`}>
            {SKILL_CONTRACT.map((item) => (
              <KangurLessonInset key={item.title} accent='emerald'>
                <div className='text-xs font-semibold uppercase tracking-[0.2em] text-emerald-500'>
                  {item.title}
                </div>
                <KangurLessonCaption className='mt-2 text-emerald-950'>
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
            Kiedy warto zbudować skill?
          </KangurLessonLead>
          <AgenticLessonQuickCheck
            accent='emerald'
            question='Wybierz najlepszą odpowiedź.'
            choices={[
              { id: 'a', label: 'Gdy zadanie powtarza się regularnie.', correct: true },
              { id: 'b', label: 'Gdy jest to jednorazowy wyjątek.' },
              { id: 'c', label: 'Gdy nie masz żadnych narzędzi.' },
            ]}
          />
        </KangurLessonStack>
      ),
    },
    {
      title: 'Mini game: Skill Contract',
      content: <AgenticCodingMiniGame gameId='skills' />,
      panelClassName: 'w-full',
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'skills',
    emoji: '🧰',
    title: 'Skills & MCP',
    description: 'Automatyzuj powtarzalne workflow i narzędzia.',
    slideCount: SLIDES.skills.length,
  },
] as const;
