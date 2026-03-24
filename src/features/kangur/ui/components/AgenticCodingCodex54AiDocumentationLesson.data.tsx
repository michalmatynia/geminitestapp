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
import { useId } from 'react';

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

export const DocumentationLadderVisual = (): JSX.Element => {
  const baseId = useId().replace(/:/g, '');
  const clipId = `agentic-documentation-ladder-${baseId}-clip`;
  const panelGradientId = `agentic-documentation-ladder-${baseId}-panel`;
  const frameGradientId = `agentic-documentation-ladder-${baseId}-frame`;

  return (
    <svg
      aria-label='Diagram: hierarchia trosk w AI documentation.'
      className='h-auto w-full'
      data-testid='agentic-documentation-ladder-animation'
      role='img'
      viewBox='0 0 360 180'
    >
      <defs>
        <clipPath id={clipId}>
          <rect x='10' y='10' width='340' height='160' rx='24' />
        </clipPath>
        <linearGradient
          id={panelGradientId}
          x1='16'
          x2='342'
          y1='16'
          y2='168'
          gradientUnits='userSpaceOnUse'
        >
          <stop offset='0%' stopColor='#f0fdf4' />
          <stop offset='52%' stopColor='#ecfdf5' />
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
          <stop offset='0%' stopColor='rgba(16,185,129,0.82)' />
          <stop offset='50%' stopColor='rgba(52,211,153,0.82)' />
          <stop offset='100%' stopColor='rgba(110,231,183,0.8)' />
        </linearGradient>
      </defs>

      <g clipPath={`url(#${clipId})`} data-testid='agentic-documentation-ladder-atmosphere'>
        <rect
          x='10'
          y='10'
          width='340'
          height='160'
          rx='24'
          fill={`url(#${panelGradientId})`}
          stroke='rgba(16,185,129,0.16)'
          strokeWidth='2'
        />
        <ellipse cx='84' cy='30' rx='72' ry='18' fill='rgba(110,231,183,0.16)' />
        <ellipse cx='286' cy='36' rx='76' ry='18' fill='rgba(52,211,153,0.12)' />
        <ellipse cx='224' cy='150' rx='92' ry='20' fill='rgba(16,185,129,0.1)' />

        {[
          ['Goal', 18],
          ['Context', 42],
          ['Constraints', 66],
          ['Risks', 90],
          ['Evidence', 114],
          ['Rollout', 138],
        ].map(([label, y], index) => (
          <g key={label}>
            <rect
              x='60'
              y={y}
              width='240'
              height='20'
              rx='8'
              fill={index < 2 ? 'rgba(236,253,245,0.92)' : index < 4 ? 'rgba(220,252,231,0.92)' : 'rgba(240,253,244,0.92)'}
              stroke='#10b981'
              strokeWidth='1.6'
            />
            <rect x='72' y={Number(y) + 6} width={index % 2 === 0 ? 34 : 46} height='6' rx='3' fill='rgba(16,185,129,0.16)' />
            <text x='72' y={Number(y) + 14} fontSize='9' fontWeight='700' fontFamily='"Space Grotesk", "IBM Plex Sans", sans-serif' fill='#0f172a'>
              {label}
            </text>
          </g>
        ))}
        <text x='252' y='32' fontSize='8' fontWeight='600' fontFamily='"Space Grotesk", "IBM Plex Sans", sans-serif' fill='#64748b'>
          Strategic
        </text>
        <text x='250' y='152' fontSize='8' fontWeight='600' fontFamily='"Space Grotesk", "IBM Plex Sans", sans-serif' fill='#64748b'>
          Operational
        </text>
      </g>

      <rect
        x='18'
        y='18'
        width='324'
        height='144'
        rx='20'
        fill='none'
        stroke={`url(#${frameGradientId})`}
        strokeWidth='1.8'
        data-testid='agentic-documentation-ladder-frame'
      />
    </svg>
  );
};

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
            supportingContent={
              <ul className='space-y-2 text-sm text-emerald-950'>
                <li>Zaczynaj od celu, żeby zablokować scope creep.</li>
                <li>Ryzyka i dowody są obowiązkowe przed rollout.</li>
                <li>Rollout + monitoring zamykają dokumentację.</li>
              </ul>
            }
          >
            <DocumentationLadderVisual />
          </KangurLessonVisual>
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
