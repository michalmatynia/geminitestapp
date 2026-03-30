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
import { AgenticOperatingLoopAnimation } from '@/features/kangur/ui/components/LessonAnimations';
import { AgenticCodingMiniGame } from '@/features/kangur/ui/components/AgenticCodingMiniGames';
import AgenticLessonQuickCheck from '@/features/kangur/ui/components/AgenticLessonQuickCheck';
import AgenticLessonCodeBlock from '@/features/kangur/ui/components/AgenticLessonCodeBlock';

type SectionId = 'delegation';

const DELEGATION_RULES = [
  'Deleguj tylko wtedy, gdy użytkownik explicitnie tego chce.',
  'Zadanie delegowane musi być samodzielne i jasno opisane.',
  'Określ właściciela plików i rozłączny write scope.',
  'Przypomnij, że worker nie jest sam w repo i nie może cofać cudzych zmian.',
] as const;

const PARALLEL_RULES = [
  'multi_tool_use.parallel tylko dla niezależnych narzędzi.',
  'Nie uruchamiaj js_repl ani apply_patch równolegle z innymi toolami.',
  'wait_agent tylko gdy blokuje to kolejny krok.',
  'W trakcie oczekiwania wykonuj niezależne zadania lokalnie.',
] as const;

const PLAN_RULES = [
  { title: 'Plan tool', description: 'Używaj przy złożonych zadaniach i aktualizuj postęp.' },
  { title: 'Default mode', description: 'Bez request_user_input - pytaj tylko, gdy to konieczne.' },
  { title: 'Critical path', description: 'Blokujące kroki wykonuj lokalnie, nie deleguj.' },
  { title: 'Scope discipline', description: 'Nie duplikuj pracy między agentami.' },
] as const;

const DELEGATION_BRIEF = `Sub-agent brief:
Goal: Scan src/features/kangur for unused imports.
Scope: Only touch *.data.tsx in kangur/ui/components.
Output: List of files + suggested removals.
Constraints: Do not edit files; no deletions.`;

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  delegation: [
    {
      title: 'Delegacja tylko na prośbę',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Sub-agenci przyspieszają, ale tylko wtedy, gdy użytkownik tego oczekuje.
            W innym przypadku trzymaj zadanie lokalnie.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='violet'
            caption='Delegacja wymaga jasnych granic.'
            maxWidthClassName='max-w-full'
            supportingContent={
              <ul className='space-y-2 text-sm text-violet-950'>
                {DELEGATION_RULES.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            }
          >
            <AgenticOperatingLoopAnimation />
          </KangurLessonVisual>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Parallelism bez konfliktów',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Równoległość działa tylko wtedy, gdy scope jest rozłączny i kontrolowany.
          </KangurLessonLead>
          <KangurLessonCallout accent='violet' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-violet-950'>
              {PARALLEL_RULES.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Plan i krytyczna ścieżka',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Najpierw plan, potem wykonanie. Krytyczna ścieżka zawsze zostaje lokalnie.
          </KangurLessonLead>
          <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} sm:grid-cols-2`}>
            {PLAN_RULES.map((item) => (
              <KangurLessonInset key={item.title} accent='violet'>
                <div className='text-xs font-semibold uppercase tracking-[0.2em] text-violet-500'>
                  {item.title}
                </div>
                <KangurLessonCaption className='mt-2 text-violet-950'>
                  {item.description}
                </KangurLessonCaption>
              </KangurLessonInset>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Przykład briefu delegacji',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Deleguj z jasnym zakresem i outputem, żeby uniknąć konfliktów.
          </KangurLessonLead>
          <AgenticLessonCodeBlock
            accent='violet'
            title='Delegation brief'
            code={DELEGATION_BRIEF}
          />
        </KangurLessonStack>
      ),
    },
    {
      title: 'Quick check',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Kiedy możesz użyć sub-agentów?
          </KangurLessonLead>
          <AgenticLessonQuickCheck
            accent='violet'
            question='Wybierz najlepszą odpowiedź.'
            choices={[
              { id: 'a', label: 'Gdy użytkownik wprost prosi o delegację.', correct: true },
              { id: 'b', label: 'Zawsze, nawet bez zgody.' },
              { id: 'c', label: 'Tylko po zakończeniu zadania.' },
            ]}
          />
        </KangurLessonStack>
      ),
    },
    {
      title: 'Mini game: Delegation Loop',
      content: <AgenticCodingMiniGame gameId='delegation' />,
      panelClassName: 'w-full',
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'delegation',
    emoji: '🤝',
    title: 'Delegation & Parallelism',
    description: 'Sub-agenci, równoległość i krytyczna ścieżka.',
    slideCount: SLIDES.delegation.length,
  },
] as const;
