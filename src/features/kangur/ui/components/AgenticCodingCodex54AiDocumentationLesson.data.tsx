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
import AgenticDocsHierarchyGame from '@/features/kangur/ui/components/AgenticDocsHierarchyGame';
import AgenticLessonQuickCheck from '@/features/kangur/ui/components/AgenticLessonQuickCheck';
import AgenticLessonCodeBlock from '@/features/kangur/ui/components/AgenticLessonCodeBlock';

type SectionId = 'ai_documentation';

const DOC_PILLARS = [
  { title: 'Goal', description: 'Co dokładnie musi zostać osiągnięte.' },
  { title: 'Context', description: 'Gdzie w kodzie, dane wejściowe, zależności.' },
  { title: 'Constraints', description: 'Czego nie zmieniać, jakie są twarde limity.' },
  { title: 'Risks', description: 'Największe ryzyka i edge-case’y.' },
  { title: 'Evidence', description: 'Testy, logi, demo lub link do proofu.' },
  { title: 'Rollout', description: 'Plan wdrożenia, monitoring, rollback.' },
] as const;

const DOC_HIERARCHY_ITEMS = [
  { id: 'goal', title: 'Goal', description: 'Definiuje sukces i oczekiwany wynik.' },
  { id: 'context', title: 'Context', description: 'Zakres kodu, dane i zależności.' },
  { id: 'constraints', title: 'Constraints', description: 'Twarde ograniczenia i zakazy zmian.' },
  { id: 'risks', title: 'Risks', description: 'Ryzyka regresji i krytyczne edge-case’y.' },
  { id: 'evidence', title: 'Evidence', description: 'Testy, logi, demo lub checklist.' },
  { id: 'rollout', title: 'Rollout', description: 'Wdrożenie, monitoring, plan cofnięcia.' },
] as const;

const DOC_HIERARCHY_ORDER = [
  'goal',
  'context',
  'constraints',
  'risks',
  'evidence',
  'rollout',
] as const;

const AI_DOC_TEMPLATE = `# AI Documentation
Goal: <outcome>
Context: <paths + data>
Constraints: <limits>
Risks: <edge cases>
Evidence: <tests/logs>
Rollout: <plan + monitoring>`;

const DocumentationLadderVisual = (): JSX.Element => (
  <svg
    aria-label='Diagram: hierarchia trosk w AI documentation.'
    className='h-auto w-full'
    role='img'
    viewBox='0 0 360 170'
  >
    <style>{`
      .step {
        fill: #ecfdf5;
        stroke: #10b981;
        stroke-width: 1.6;
      }
      .label {
        font: 700 9px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
        fill: #0f172a;
      }
      .muted {
        font: 600 8px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
        fill: #64748b;
      }
    `}</style>
    <rect className='step' height='20' rx='8' width='240' x='60' y='16' />
    <rect className='step' height='20' rx='8' width='240' x='60' y='40' />
    <rect className='step' height='20' rx='8' width='240' x='60' y='64' />
    <rect className='step' height='20' rx='8' width='240' x='60' y='88' />
    <rect className='step' height='20' rx='8' width='240' x='60' y='112' />
    <rect className='step' height='20' rx='8' width='240' x='60' y='136' />
    <text className='label' x='72' y='30'>Goal</text>
    <text className='label' x='72' y='54'>Context</text>
    <text className='label' x='72' y='78'>Constraints</text>
    <text className='label' x='72' y='102'>Risks</text>
    <text className='label' x='72' y='126'>Evidence</text>
    <text className='label' x='72' y='150'>Rollout</text>
    <text className='muted' x='252' y='30'>Strategic</text>
    <text className='muted' x='252' y='150'>Operational</text>
  </svg>
);

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  ai_documentation: [
    {
      title: 'AI documentation = hierarchia trosk',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Dobre AI documentation zaczyna się od celu i ryzyka, a kończy na dowodach i
            rollout. Ten porządek skraca review i redukuje regresje.
          </KangurLessonLead>
          <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} sm:grid-cols-2`}>
            {DOC_PILLARS.map((item) => (
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
      title: 'Piramida trosk',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Hierarchia pomaga utrzymać balans: najpierw strategiczne decyzje, potem
            operacyjne szczegóły.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='emerald'
            caption='Od strategii do operacji — jeden spójny format.'
            maxWidthClassName='max-w-full'
          >
            <DocumentationLadderVisual />
          </KangurLessonVisual>
          <KangurLessonCallout accent='emerald' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-emerald-950'>
              <li>Zaczynaj od celu, żeby zablokować scope creep.</li>
              <li>Ryzyka i dowody są obowiązkowe przed rollout.</li>
              <li>Rollout + monitoring zamykają dokumentację.</li>
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Szablon dokumentacji',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Jedna krótka struktura wystarcza, by utrzymać jakość i spójność.
          </KangurLessonLead>
          <AgenticLessonCodeBlock
            accent='emerald'
            title='AI doc template'
            code={AI_DOC_TEMPLATE}
          />
        </KangurLessonStack>
      ),
    },
    {
      title: 'Mini game: ułóż hierarchię',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Przeciągnij karty, aby ułożyć właściwą kolejność sekcji AI documentation.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='emerald'
            caption='Hierarchia trosk w AI documentation.'
            maxWidthClassName='max-w-full'
          >
            <DocumentationLadderVisual />
          </KangurLessonVisual>
          <AgenticDocsHierarchyGame
            accent='emerald'
            items={DOC_HIERARCHY_ITEMS}
            correctOrder={DOC_HIERARCHY_ORDER}
            prompt='Ułóż sekcje od najważniejszej do najbardziej operacyjnej.'
          />
        </KangurLessonStack>
      ),
    },
    {
      title: 'Quick check',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Co powinno być najwyżej w AI documentation?
          </KangurLessonLead>
          <AgenticLessonQuickCheck
            accent='emerald'
            question='Wybierz najlepszą odpowiedź.'
            choices={[
              { id: 'a', label: 'Goal (cel i sukces).', correct: true },
              { id: 'b', label: 'Rollout i monitoring.' },
              { id: 'c', label: 'Evidence (testy) na starcie.' },
            ]}
          />
        </KangurLessonStack>
      ),
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'ai_documentation',
    emoji: '📚',
    title: 'AI Documentation',
    description: 'Hierarchia trosk, dowody i rollout w jednym formacie.',
    slideCount: SLIDES.ai_documentation.length,
  },
] as const;
