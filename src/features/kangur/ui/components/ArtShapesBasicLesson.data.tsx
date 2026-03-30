import type { LessonSlide } from '@/features/kangur/ui/components/lesson-framework/LessonSlideSection';
import {
  KangurLessonCallout,
  KangurLessonCaption,
  KangurLessonChip,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';

export type ArtShapesBasicLessonSectionId =
  | 'meetShapes'
  | 'compareShapes'
  | 'findShapes'
  | 'rotationPuzzle'
  | 'summary';

export const ART_SHAPES_ROTATION_PUZZLE_SECTION_ID = 'rotationPuzzle' as const;

type ArtShapesBasicLessonTranslationValue = string | number;

export type ArtShapesBasicLessonTranslate = (
  key: string,
  values?: Record<string, ArtShapesBasicLessonTranslationValue>
) => string;

type ShapeId = 'circle' | 'square' | 'triangle' | 'rectangle';

type ShapeCardProps = {
  shape: ShapeId;
  color: string;
  label: string;
  clue: string;
};

const ShapeCard = ({ shape, color, label, clue }: ShapeCardProps): JSX.Element => (
  <KangurLessonCallout accent='amber' className='text-center'>
    <div className='flex justify-center'>
      <svg aria-hidden='true' className='h-20 w-20' viewBox='0 0 120 120'>
        {shape === 'circle' ? (
          <circle cx='60' cy='60' r='34' fill={color} stroke='#0f172a' strokeWidth='4' />
        ) : null}
        {shape === 'square' ? (
          <rect
            x='28'
            y='28'
            width='64'
            height='64'
            rx='10'
            fill={color}
            stroke='#0f172a'
            strokeWidth='4'
          />
        ) : null}
        {shape === 'triangle' ? (
          <polygon
            points='60,20 100,96 20,96'
            fill={color}
            stroke='#0f172a'
            strokeWidth='4'
          />
        ) : null}
        {shape === 'rectangle' ? (
          <rect
            x='18'
            y='36'
            width='84'
            height='48'
            rx='10'
            fill={color}
            stroke='#0f172a'
            strokeWidth='4'
          />
        ) : null}
      </svg>
    </div>
    <div className='mt-3 text-lg font-bold [color:var(--kangur-page-text)]'>{label}</div>
    <KangurLessonCaption className='mt-2'>{clue}</KangurLessonCaption>
  </KangurLessonCallout>
);

export const buildArtShapesBasicSlides = (
  translate: ArtShapesBasicLessonTranslate
): Record<
  Exclude<ArtShapesBasicLessonSectionId, typeof ART_SHAPES_ROTATION_PUZZLE_SECTION_ID>,
  LessonSlide[]
> => ({
  meetShapes: [
    {
      title: translate('slides.meetShapes.title'),
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{translate('slides.meetShapes.lead')}</KangurLessonLead>
          <div className='grid w-full gap-4 sm:grid-cols-2'>
            <ShapeCard
              shape='circle'
              color='#38bdf8'
              label={translate('slides.meetShapes.shapes.circle.label')}
              clue={translate('slides.meetShapes.shapes.circle.clue')}
            />
            <ShapeCard
              shape='square'
              color='#f59e0b'
              label={translate('slides.meetShapes.shapes.square.label')}
              clue={translate('slides.meetShapes.shapes.square.clue')}
            />
            <ShapeCard
              shape='triangle'
              color='#fb7185'
              label={translate('slides.meetShapes.shapes.triangle.label')}
              clue={translate('slides.meetShapes.shapes.triangle.clue')}
            />
            <ShapeCard
              shape='rectangle'
              color='#34d399'
              label={translate('slides.meetShapes.shapes.rectangle.label')}
              clue={translate('slides.meetShapes.shapes.rectangle.clue')}
            />
          </div>
        </KangurLessonStack>
      ),
    },
  ],
  compareShapes: [
    {
      title: translate('slides.compareShapes.title'),
      content: (
        <KangurLessonStack>
          <div className='flex flex-wrap justify-center gap-2'>
            <KangurLessonChip accent='sky'>{translate('slides.compareShapes.chips.circle')}</KangurLessonChip>
            <KangurLessonChip accent='amber'>{translate('slides.compareShapes.chips.square')}</KangurLessonChip>
            <KangurLessonChip accent='rose'>{translate('slides.compareShapes.chips.triangle')}</KangurLessonChip>
            <KangurLessonChip accent='emerald'>
              {translate('slides.compareShapes.chips.rectangle')}
            </KangurLessonChip>
          </div>
          <KangurLessonCallout accent='slate'>
            <strong>{translate('slides.compareShapes.detective.title')}</strong>
            <KangurLessonCaption className='mt-2' align='left'>
              {translate('slides.compareShapes.detective.caption')}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
  findShapes: [
    {
      title: translate('slides.findShapes.examples.title'),
      content: (
        <div className='grid gap-4 sm:grid-cols-2'>
          <KangurLessonCallout accent='sky'>
            <div className='text-3xl'>⚽</div>
            <strong className='mt-3 block'>{translate('slides.findShapes.examples.circle.label')}</strong>
            <KangurLessonCaption className='mt-2' align='left'>
              {translate('slides.findShapes.examples.circle.caption')}
            </KangurLessonCaption>
          </KangurLessonCallout>
          <KangurLessonCallout accent='amber'>
            <div className='text-3xl'>🪟</div>
            <strong className='mt-3 block'>{translate('slides.findShapes.examples.window.label')}</strong>
            <KangurLessonCaption className='mt-2' align='left'>
              {translate('slides.findShapes.examples.window.caption')}
            </KangurLessonCaption>
          </KangurLessonCallout>
          <KangurLessonCallout accent='rose'>
            <div className='text-3xl'>🍕</div>
            <strong className='mt-3 block'>{translate('slides.findShapes.examples.pizza.label')}</strong>
            <KangurLessonCaption className='mt-2' align='left'>
              {translate('slides.findShapes.examples.pizza.caption')}
            </KangurLessonCaption>
          </KangurLessonCallout>
          <KangurLessonCallout accent='emerald'>
            <div className='text-3xl'>🧱</div>
            <strong className='mt-3 block'>{translate('slides.findShapes.examples.rectangle.label')}</strong>
            <KangurLessonCaption className='mt-2' align='left'>
              {translate('slides.findShapes.examples.rectangle.caption')}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </div>
      ),
    },
    {
      title: translate('slides.findShapes.puzzleClues.title'),
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{translate('slides.findShapes.puzzleClues.lead')}</KangurLessonLead>
          <div className='grid w-full gap-4 sm:grid-cols-2'>
            <KangurLessonCallout accent='amber'>
              <strong className='block text-base [color:var(--kangur-page-text)]'>
                {translate('slides.findShapes.puzzleClues.familyTitle')}
              </strong>
              <KangurLessonCaption className='mt-2' align='left'>
                {translate('slides.findShapes.puzzleClues.familyCaption')}
              </KangurLessonCaption>
            </KangurLessonCallout>
            <KangurLessonCallout accent='sky'>
              <strong className='block text-base [color:var(--kangur-page-text)]'>
                {translate('slides.findShapes.puzzleClues.speedTitle')}
              </strong>
              <KangurLessonCaption className='mt-2' align='left'>
                {translate('slides.findShapes.puzzleClues.speedCaption')}
              </KangurLessonCaption>
            </KangurLessonCallout>
          </div>
        </KangurLessonStack>
      ),
    },
  ],
  summary: [
    {
      title: translate('slides.summary.title'),
      content: (
        <div className='flex flex-col gap-4'>
          {[
            translate('slides.summary.facts.circle'),
            translate('slides.summary.facts.square'),
            translate('slides.summary.facts.triangle'),
            translate('slides.summary.facts.rectangle'),
          ].map((fact) => (
            <KangurLessonCallout
              key={fact}
              accent='amber'
              className='text-sm [color:var(--kangur-page-text)]'
              padding='sm'
            >
              {fact}
            </KangurLessonCallout>
          ))}
        </div>
      ),
    },
  ],
});

export const buildArtShapesBasicSections = (translate: ArtShapesBasicLessonTranslate) => [
  {
    id: 'meetShapes',
    emoji: '🧩',
    title: translate('sections.meetShapes.title'),
    description: translate('sections.meetShapes.description'),
  },
  {
    id: 'compareShapes',
    emoji: '🔍',
    title: translate('sections.compareShapes.title'),
    description: translate('sections.compareShapes.description'),
  },
  {
    id: 'findShapes',
    emoji: '🏠',
    title: translate('sections.findShapes.title'),
    description: translate('sections.findShapes.description'),
  },
  {
    id: ART_SHAPES_ROTATION_PUZZLE_SECTION_ID,
    emoji: '🌀',
    title: translate('sections.rotationPuzzle.title'),
    description: translate('sections.rotationPuzzle.description'),
    isGame: true,
  },
  {
    id: 'summary',
    emoji: '⭐',
    title: translate('sections.summary.title'),
    description: translate('sections.summary.description'),
  },
] as const;
