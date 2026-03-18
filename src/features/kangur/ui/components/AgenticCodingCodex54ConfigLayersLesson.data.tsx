import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import {
  KangurLessonCallout,
  KangurLessonCaption,
  KangurLessonInset,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';
import { KANGUR_GRID_TIGHT_CLASSNAME } from '@/features/kangur/ui/design/tokens';

type SectionId = 'configLayers';

const CONFIG_LAYERS = [
  { title: 'User config', description: '`~/.codex/config.toml` dla ustawien osobistych.' },
  { title: 'Project config', description: '`.codex/config.toml` dla projektu.' },
] as const;

const CONFIG_LAYER_NOTES = [
  'Projektowe warstwy wczytuja sie tylko, gdy repo jest zaufane.',
  'Dzieki temu mozesz miec inne ustawienia dla kazdego projektu.',
] as const;

const TRUST_RULES = [
  '`projects.<path>.trust_level` oznacza repo jako trusted/untrusted.',
  'Untrusted pomija projektowe warstwy `.codex/` i dziala bezpieczniej.',
] as const;

const PROFILE_KEYS = [
  { title: 'profile', description: 'Domyslny profil startowy (jak `--profile`).' },
  {
    title: 'profiles.<name>.*',
    description: 'Profilowe nadpisania dowolnych kluczy config.',
  },
] as const;

const PROFILE_NOTES = [
  'Profile pozwalaja szybko przelaczac tryb pracy (np. safe vs fast).',
  'W profilu mozesz ustawic m.in. `web_search`, approvals i sandbox.',
] as const;

const CONFIG_EXAMPLE = `# ~/.codex/config.toml
profile = "work"

[profiles.work]
web_search = "cached"
approval_policy = "on-request"
sandbox_mode = "workspace-write"`;

const LessonCodeBlock = ({
  title,
  code,
}: {
  title?: string;
  code: string;
}): JSX.Element => (
  <KangurLessonInset
    accent='slate'
    className='border-slate-900/70 bg-slate-950 text-slate-100'
  >
    {title ? (
      <div className='text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-200'>
        {title}
      </div>
    ) : null}
    <pre className='mt-2 whitespace-pre-wrap text-xs leading-relaxed'>
      <code>{code}</code>
    </pre>
  </KangurLessonInset>
);

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  configLayers: [
    {
      title: 'Warstwy konfiguracji',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Codex laduje konfiguracje z poziomu user i projektu. Warstwy projektu
            dzialaja tylko dla zaufanych repo.
          </KangurLessonLead>
          <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} sm:grid-cols-2`}>
            {CONFIG_LAYERS.map((item) => (
              <KangurLessonInset key={item.title} accent='slate'>
                <div className='text-xs font-semibold uppercase tracking-[0.2em] text-slate-500'>
                  {item.title}
                </div>
                <KangurLessonCaption className='mt-2 text-slate-950'>
                  {item.description}
                </KangurLessonCaption>
              </KangurLessonInset>
            ))}
          </div>
          <KangurLessonCallout accent='slate' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-slate-950'>
              {CONFIG_LAYER_NOTES.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Zaufanie repo i worktree',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Trust level decyduje, czy Codex wczyta projektowe warstwy config.
          </KangurLessonLead>
          <KangurLessonCallout accent='slate' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-slate-950'>
              {TRUST_RULES.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Profile jako presety',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Profile pozwalaja trzymac rozne konfiguracje w jednym miejscu.
          </KangurLessonLead>
          <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} sm:grid-cols-2`}>
            {PROFILE_KEYS.map((item) => (
              <KangurLessonInset key={item.title} accent='slate'>
                <div className='text-xs font-semibold uppercase tracking-[0.2em] text-slate-500'>
                  {item.title}
                </div>
                <KangurLessonCaption className='mt-2 text-slate-950'>
                  {item.description}
                </KangurLessonCaption>
              </KangurLessonInset>
            ))}
          </div>
          <KangurLessonCallout accent='slate' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-slate-950'>
              {PROFILE_NOTES.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Przyklad configu',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Traktuj profile jako bezpieczne presety. Nastepnie odpaliaj Codex z
            docelowym profilem.
          </KangurLessonLead>
          <LessonCodeBlock title='config.toml' code={CONFIG_EXAMPLE} />
        </KangurLessonStack>
      ),
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'config-layers',
    emoji: '⚙️',
    title: 'Config Layers',
    description: 'Warstwy konfiguracji i profile pracy.',
    slideCount: SLIDES.configLayers.length,
  },
] as const;
