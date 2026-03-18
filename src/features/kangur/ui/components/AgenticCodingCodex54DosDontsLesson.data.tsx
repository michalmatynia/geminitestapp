import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import {
  KangurLessonCallout,
  KangurLessonLead,
  KangurLessonStack,
  KangurLessonVisual,
} from '@/features/kangur/ui/design/lesson-primitives';
import { AgenticDoDontAnimation } from '@/features/kangur/ui/components/LessonAnimations';
import { AgenticCodingMiniGame } from '@/features/kangur/ui/components/AgenticCodingMiniGames';
import AgenticLessonQuickCheck from '@/features/kangur/ui/components/AgenticLessonQuickCheck';
import AgenticLessonCodeBlock from '@/features/kangur/ui/components/AgenticLessonCodeBlock';

type SectionId = 'dos_donts';

const DOS = [
  'Dostarczaj jasny brief i definicję Done.',
  'Weryfikuj wynik: testy + review diffu.',
  'Proś o plan, gdy scope jest niejasny.',
  'Ogranicz scope do jednego outcome.',
] as const;

const DONTS = [
  'Nie dawaj pełnej autonomii bez guardrails.',
  'Nie akceptuj zmian bez proof loop.',
  'Nie mieszaj wielu zadań w jednym promptcie.',
  'Nie uruchamiaj równoległych wątków bez worktrees.',
  'Nie ignoruj sygnałów o braku kontekstu.',
] as const;

const REGRESSION_GATES = [
  'Testy i lint uruchomione lub jasno opisane.',
  'Diff przeczytany pod kątem regresji.',
  'Ryzyka opisane w podsumowaniu.',
] as const;

const DO_DONT_CHEATSHEET = `Do:
- Provide Goal/Context/Constraints/Done
- Ask for plan on ambiguous tasks
- Verify with tests + diff

Don't:
- Mix multiple tasks
- Skip proof loop
- Grant full access by default`;

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  dos_donts: [
    {
      title: "Do's",
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Te zasady minimalizują ryzyko i przyspieszają akceptację.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='violet'
            caption='Najważniejsze do i don’t w jednym spojrzeniu.'
            maxWidthClassName='max-w-full'
          >
            <AgenticDoDontAnimation />
          </KangurLessonVisual>
          <KangurLessonCallout accent='violet' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-violet-950'>
              {DOS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: "Don'ts",
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Najczęstsze błędy wynikają z braku kontroli i zbyt szerokiego scope.
          </KangurLessonLead>
          <KangurLessonCallout accent='violet' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-violet-950'>
              {DONTS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Gates na regresje',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Jeśli nie ma dowodu działania, nie ma akceptacji. To najtańszy sposób
            na uniknięcie regresji.
          </KangurLessonLead>
          <KangurLessonCallout accent='violet' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-violet-950'>
              {REGRESSION_GATES.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Cheat sheet',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Krótka ściąga do codziennej pracy z agentem.
          </KangurLessonLead>
          <AgenticLessonCodeBlock
            accent='violet'
            title='Do / Don’t'
            code={DO_DONT_CHEATSHEET}
          />
        </KangurLessonStack>
      ),
    },
    {
      title: 'Quick check',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Która zasada jest właściwym “Do”?
          </KangurLessonLead>
          <AgenticLessonQuickCheck
            accent='violet'
            question='Wybierz poprawną odpowiedź.'
            choices={[
              { id: 'a', label: 'Dostarczyć jasny brief i proof loop.', correct: true },
              { id: 'b', label: 'Akceptować zmiany bez testów.' },
              { id: 'c', label: 'Mieszać wiele zadań w jednym promptcie.' },
            ]}
          />
        </KangurLessonStack>
      ),
    },
    {
      title: "Mini game: Do / Don't",
      content: <AgenticCodingMiniGame gameId='dos_donts' />,
      panelClassName: 'w-full',
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'dos_donts',
    emoji: '✅',
    title: "Do's & Don'ts",
    description: 'Najważniejsze zasady współpracy z agentem.',
    slideCount: SLIDES.dos_donts.length,
  },
] as const;
