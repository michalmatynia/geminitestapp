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
import { AgenticAutomationScheduleAnimation } from '@/features/kangur/ui/components/LessonAnimations';

type SectionId = 'automations';

const AUTOMATION_INBOX = [
  'Automations i ich runy znajdziesz w panelu automations w Codex app.',
  'Sekcja Triage działa jak inbox na wyniki z zadań w tle.',
  'Możesz filtrować wszystkie runy lub tylko nieprzeczytane.',
] as const;

const AUTOMATION_ENVIRONMENTS = [
  {
    title: 'Worktree',
    description: 'Izoluje zmiany od lokalnej pracy i chroni bieżący checkout.',
  },
  {
    title: 'Local project',
    description: 'Pracuje na głównym checkout (może modyfikować pliki w toku).',
  },
  {
    title: 'No-git projects',
    description: 'W projektach bez VCS automations działają w katalogu projektu.',
  },
] as const;

const AUTOMATION_SANDBOX = [
  'Automations używają domyślnych ustawień sandbox.',
  'W read-only narzędzia nie mogą modyfikować plików ani używać sieci/aplikacji.',
  'Full access zwiększa ryzyko dla zadań w tle.',
  'Ustawienia i allowlist komend konfigurujesz w Settings i rules.',
] as const;

const AUTOMATION_SKILLS = [
  'Skills definiują metodę, automations definiują harmonogram.',
  'Automations mogą wywołać skill używając `$skill-name` w prompt.',
] as const;

const AUTOMATION_SCHEDULE_TIPS = [
  'Najpierw uruchom prompt manualnie i upewnij się, że działa.',
  'Zapisz konkretne Constraints i dowód Done.',
  'Ustal jasny kanał dostarczania wyników (np. Triage inbox).',
] as const;

const AUTOMATION_CANDIDATES = [
  'Podsumowanie commitów.',
  'Skan na likely bugs.',
  'Szkic release notes.',
  'Sprawdzenie CI failures.',
  'Standup summary.',
  'Powtarzalne analizy na harmonogramie.',
] as const;

const AUTOMATION_SCHEDULE_EXAMPLE = `Automation: Weekly risk scan
Schedule: Fri 17:00
Goal: Summarize last 20 commits + flag risky areas
Constraints: read-only, no network
Done when: Summary + follow-up questions in Triage`;

const LessonCodeBlock = ({
  title,
  code,
}: {
  title?: string;
  code: string;
}): JSX.Element => (
  <KangurLessonInset
    accent='indigo'
    className='border-indigo-900/70 bg-slate-950 text-slate-100'
  >
    {title ? (
      <div className='text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-200'>
        {title}
      </div>
    ) : null}
    <pre className='mt-2 whitespace-pre-wrap text-xs leading-relaxed'>
      <code>{code}</code>
    </pre>
  </KangurLessonInset>
);

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  automations: [
    {
      title: 'Inbox dla pracy w tle',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Automations w Codex app to stała pętla pracy w tle, z własnym
            triage-inboxem.
          </KangurLessonLead>
          <KangurLessonCallout accent='indigo' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-indigo-950'>
              {AUTOMATION_INBOX.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Gdzie uruchamiać automations',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            W repo Git wybierasz local project albo osobny worktree.
          </KangurLessonLead>
          <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} sm:grid-cols-3`}>
            {AUTOMATION_ENVIRONMENTS.map((item) => (
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
      title: 'Sandbox i ryzyko',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Automations dziedziczą Twoje ustawienia sandbox. Kontroluj zakres zanim
            ustawisz harmonogram.
          </KangurLessonLead>
          <KangurLessonCallout accent='indigo' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-indigo-950'>
              {AUTOMATION_SANDBOX.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Skills + automations',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Najpierw ustandaryzuj workflow w skillu, potem uruchom go cyklicznie.
          </KangurLessonLead>
          <KangurLessonCallout accent='indigo' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-indigo-950'>
              {AUTOMATION_SKILLS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Harmonogram i output',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Automations są tak dobre, jak ich harmonogram i definicja wyniku. Zadbaj o
            to, zanim uruchomisz cykliczne runy.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='indigo'
            caption='Stały rytm ułatwia triage i kontrolę jakości.'
            maxWidthClassName='max-w-full'
          >
            <AgenticAutomationScheduleAnimation />
          </KangurLessonVisual>
          <KangurLessonCallout accent='indigo' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-indigo-950'>
              {AUTOMATION_SCHEDULE_TIPS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
          <LessonCodeBlock title='Automation template' code={AUTOMATION_SCHEDULE_EXAMPLE} />
        </KangurLessonStack>
      ),
    },
    {
      title: 'Dobre kandydaty na automations',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Szukaj zadań, które często się powtarzają i mają jasny output.
          </KangurLessonLead>
          <KangurLessonCallout accent='indigo' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-indigo-950'>
              {AUTOMATION_CANDIDATES.map((item) => (
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
    id: 'automations',
    emoji: '⏱️',
    title: 'Automations',
    description: 'W tle, ale pod kontrolą: harmonogram i sandbox.',
    slideCount: SLIDES.automations.length,
  },
] as const;
