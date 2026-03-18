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
import AgenticLessonQuickCheck from '@/features/kangur/ui/components/AgenticLessonQuickCheck';

type SectionId = 'tooling';

const TOOL_CHOICES = [
  { title: 'exec_command', description: 'Shell, git i skrypty. Preferuj komendy nie-interaktywne.' },
  { title: 'apply_patch', description: 'Małe, pojedyncze edycje plików (bez generowanych plików).' },
  { title: 'js_repl', description: 'Node z top-level await. Bez JSON wrappera i bez równoległych tooli.' },
  { title: 'rg', description: 'Szybkie wyszukiwanie plików i treści (zamiast grep).' },
] as const;

const ESCALATION_TRIGGERS = [
  'Install/pobieranie zależności lub narzędzi.',
  'Zapisy poza workspace albo narzędzia systemowe (Docker/GUI).',
  'Komenda nie działa przez sandbox lub brak sieci - eskaluj i podaj powód.',
  'Planowana akcja jest destrukcyjna lub trudna do cofnięcia.',
] as const;

const REPO_GUARDRAILS = [
  'Nie zmieniaj: next.config.mjs, tsconfig.json, build script w package.json, vercel.json.',
  'Gdy dotykasz dokumentacji, respektuj reguły placementu i hubów.',
  'Nie cofaj cudzych zmian i nie amenduj commitów bez prośby.',
] as const;

const DANGER_ZONE = [
  'Nie używaj git reset --hard ani git checkout -- bez wyraźnej zgody.',
  'Unikaj destrukcyjnych rm, chyba że użytkownik wyraźnie poprosi.',
  'Nie uruchamiaj interaktywnych komend, jeśli można użyć non-interactive.',
] as const;

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  tooling: [
    {
      title: 'Dobór narzędzia',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Każde narzędzie ma kontrakt. Wybierz je świadomie, aby uniknąć błędów i
            niepotrzebnych pytań o approvals.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='slate'
            caption='Jasny wybór narzędzia skraca iteracje.'
            maxWidthClassName='max-w-full'
          >
            <AgenticDocsStackAnimation />
          </KangurLessonVisual>
          <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} sm:grid-cols-2`}>
            {TOOL_CHOICES.map((item) => (
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
        </KangurLessonStack>
      ),
    },
    {
      title: 'Sandbox i eskalacje',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Eskaluj tylko wtedy, gdy jest to konieczne i dobrze uzasadnione. To skraca
            review i chroni repo.
          </KangurLessonLead>
          <KangurLessonCallout accent='slate' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-slate-950'>
              {ESCALATION_TRIGGERS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Repo guardrails',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Repo ma twarde zasady bezpieczeństwa. Złamiesz je tylko za zgodą.
          </KangurLessonLead>
          <KangurLessonCallout accent='slate' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-slate-950'>
              {REPO_GUARDRAILS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Destrukcyjne komendy = stop',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Jeśli coś jest trudne do cofnięcia, najpierw pytasz. Bez wyjątku.
          </KangurLessonLead>
          <KangurLessonCallout accent='slate' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-slate-950'>
              {DANGER_ZONE.map((item) => (
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
            Kiedy prosisz o eskalację?
          </KangurLessonLead>
          <AgenticLessonQuickCheck
            accent='slate'
            question='Wybierz poprawną odpowiedź.'
            choices={[
              { id: 'a', label: 'Gdy musisz instalować zależności lub wyjść poza sandbox.', correct: true },
              { id: 'b', label: 'Gdy edytujesz jeden plik w workspace.' },
              { id: 'c', label: 'Zawsze na starcie zadania.' },
            ]}
          />
        </KangurLessonStack>
      ),
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'tooling',
    emoji: '🛠️',
    title: 'Tooling Contract',
    description: 'Dobór narzędzi, sandbox i repo guardrails.',
    slideCount: SLIDES.tooling.length,
  },
] as const;
