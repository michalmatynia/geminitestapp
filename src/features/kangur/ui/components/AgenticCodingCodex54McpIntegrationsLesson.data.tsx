import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import {
  KangurLessonCallout,
  KangurLessonCaption,
  KangurLessonInset,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';
import { KANGUR_GRID_TIGHT_CLASSNAME } from '@/features/kangur/ui/design/tokens';

type SectionId = 'mcpIntegrations';

const MCP_WHEN = [
  'Kontekst potrzebny Codex żyje poza repo.',
  'Dane często się zmieniają i nie warto ich wklejać ręcznie.',
  'Wolisz użyć narzędzia zamiast statycznych instrukcji.',
  'Chcesz powtarzalną integrację dla wielu osób lub projektów.',
] as const;

const MCP_ROLES = [
  { title: 'Host', description: 'Codex jako środowisko wykonawcze.' },
  { title: 'Client', description: 'Połączenie MCP w środku Codex.' },
  { title: 'Server', description: 'Zewnętrzne narzędzie lub źródło danych.' },
] as const;

const MCP_SURFACES = [
  { title: 'Tools', description: 'Akcje i operacje wykonywane przez serwer.' },
  { title: 'Resources', description: 'Czytelne dane do odczytu.' },
  { title: 'Prompts', description: 'Szablony promptów do ponownego użycia.' },
] as const;

const MCP_SYSTEMS = ['Figma', 'Linear', 'GitHub', 'wewnętrzne bazy wiedzy'] as const;

const MCP_CONNECTIONS = [
  'STDIO dla lokalnych serwerów.',
  'Streamable HTTP z OAuth dla zdalnych integracji.',
] as const;

const MCP_SETUP = [
  'Codex App → Settings → MCP servers.',
  'CLI: `codex mcp add` z nazwą i URL serwera.',
] as const;

const MCP_START_SMALL = [
  'Dodawaj narzędzia tylko, gdy realnie usuwają manualny loop.',
  'Zacznij od 1-2 integracji i rozbudowuj po sprawdzeniu efektu.',
] as const;

const LINEAR_COMMAND = 'codex mcp add linear --url https://mcp.linear.app/mcp';

const LINEAR_CONFIG = `[mcp_servers.linear]
url = "https://mcp.linear.app/mcp"`;

const LINEAR_NOTES = [
  'CLI i IDE korzystają z tej samej konfiguracji MCP.',
  'Po dodaniu serwera Codex poprosi o logowanie do Linear.',
] as const;

const LessonCodeBlock = ({
  title,
  code,
}: {
  title?: string;
  code: string;
}): JSX.Element => (
  <KangurLessonInset
    accent='sky'
    className='border-sky-900/70 bg-slate-950 text-slate-100'
  >
    {title ? (
      <div className='text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-200'>
        {title}
      </div>
    ) : null}
    <pre className='mt-2 whitespace-pre-wrap text-xs leading-relaxed'>
      <code>{code}</code>
    </pre>
  </KangurLessonInset>
);

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  mcpIntegrations: [
    {
      title: 'Kiedy sięgać po MCP',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            MCP podłącza Codex do zewnętrznych narzędzi i kontekstu, gdy repo nie
            wystarcza.
          </KangurLessonLead>
          <KangurLessonCallout accent='sky' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-sky-950'>
              {MCP_WHEN.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Model mentalny MCP',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            MCP to jasny podział ról: Codex hostuje połączenie, serwer dostarcza
            kontekst lub akcje.
          </KangurLessonLead>
          <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} sm:grid-cols-3`}>
            {MCP_ROLES.map((item) => (
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
          <KangurLessonCallout accent='sky' padding='sm' className='text-left'>
            <KangurLessonCaption className='text-sky-950'>
              Najczęstsze integracje: {MCP_SYSTEMS.join(', ')}.
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Co wystawia MCP server',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Serwer MCP może udostępniać akcje, dane i gotowe szablony promptów.
          </KangurLessonLead>
          <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} sm:grid-cols-3`}>
            {MCP_SURFACES.map((item) => (
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
      title: 'Połączenia i setup',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            MCP działa zarówno lokalnie, jak i zdalnie. Najpierw podłącz tylko to,
            co daje realną przewagę.
          </KangurLessonLead>
          <KangurLessonCallout accent='sky' padding='sm' className='text-left'>
            <KangurLessonCaption className='mb-2 text-sky-950'>
              Typy połączeń:
            </KangurLessonCaption>
            <ul className='space-y-2 text-sm text-sky-950'>
              {MCP_CONNECTIONS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
          <KangurLessonCallout accent='sky' padding='sm' className='text-left'>
            <KangurLessonCaption className='mb-2 text-sky-950'>
              Gdzie podpiąć MCP:
            </KangurLessonCaption>
            <ul className='space-y-2 text-sm text-sky-950'>
              {MCP_SETUP.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
          <KangurLessonCallout accent='sky' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-sky-950'>
              {MCP_START_SMALL.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Przykład: Linear',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Integracje w CLI i IDE korzystają z tej samej konfiguracji MCP.
          </KangurLessonLead>
          <LessonCodeBlock title='CLI' code={LINEAR_COMMAND} />
          <LessonCodeBlock title='config.toml' code={LINEAR_CONFIG} />
          <KangurLessonCallout accent='sky' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-sky-950'>
              {LINEAR_NOTES.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'mcp-integrations',
    emoji: '🔗',
    title: 'MCP Integrations',
    description: 'Podłącz zewnętrzny kontekst i narzędzia do Codex.',
    slideCount: SLIDES.mcpIntegrations.length,
  },
] as const;
