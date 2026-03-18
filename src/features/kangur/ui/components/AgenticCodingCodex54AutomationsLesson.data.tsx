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
import { AgenticCodingMiniGame } from '@/features/kangur/ui/components/AgenticCodingMiniGames';
import AgenticLessonCodeBlock from '@/features/kangur/ui/components/AgenticLessonCodeBlock';
import AgenticLessonQuickCheck from '@/features/kangur/ui/components/AgenticLessonQuickCheck';

type SectionId = 'automations';

const AUTOMATION_INBOX = [
  'Automations planują powtarzalne zadania w tle w Codex app.',
  'Wyniki trafiają do inboxa, a brak zmian kończy się auto-archiwizacją.',
  'App musi być uruchomiona, a projekt dostępny na dysku.',
] as const;

const AUTOMATION_ENVIRONMENTS = [
  {
    title: 'Worktree (Git)',
    description: 'Automations w repo Git działają w dedykowanych worktree.',
  },
  {
    title: 'Local project',
    description: 'Dla projektów bez VCS automations pracują w katalogu projektu.',
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
  'Łączenie skills + automations poprawia spójność i reuse.',
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
          <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} sm:grid-cols-2`}>
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
          <AgenticLessonCodeBlock
            accent='indigo'
            title='Automation template'
            code={AUTOMATION_SCHEDULE_EXAMPLE}
          />
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
    {
      title: 'Quick check',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Co warto zrobić przed ustawieniem automation?
          </KangurLessonLead>
          <AgenticLessonQuickCheck
            accent='indigo'
            question='Wybierz najlepszą odpowiedź.'
            choices={[
              { id: 'a', label: 'Przetestować prompt manualnie.', correct: true },
              { id: 'b', label: 'Od razu ustawić daily schedule.' },
              { id: 'c', label: 'Wyłączyć sandbox.' },
            ]}
          />
        </KangurLessonStack>
      ),
    },
    {
      title: 'Mini game: Automation Cadence',
      content: <AgenticCodingMiniGame gameId='automations' />,
      panelClassName: 'w-full',
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
