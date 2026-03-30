import type { LessonSlide } from '@/features/kangur/ui/components/lesson-framework/LessonSlideSection';
import { KangurLessonCaption, KangurLessonLead, KangurLessonStack } from '@/features/kangur/ui/design/lesson-primitives';
import { LessonCodeBlock } from './WebDevelopmentReactComponentsLesson.data.shared';

export const compositionSlides: LessonSlide[] = [
    {
      title: 'Kompozycja i propsy',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>Składaj UI z mniejszych, przewidywalnych części.</KangurLessonLead>
          <KangurLessonCaption>
            Materiały o kompozycji pojawią się tu w kolejnych iteracjach.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Przekazywanie propsów',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Propsy to dane wejściowe komponentu. Dzięki nim jeden komponent może działać w różnych
            kontekstach.
          </KangurLessonLead>
          <LessonCodeBlock
            title='Propsy w akcji'
            code={`function Badge({ label, tone }) {
  return <span className={\`badge \${tone}\`}>{label}</span>;
}

<Badge label="New" tone="success" />
<Badge label="Draft" tone="warning" />`}
            caption='Ten sam komponent, różne dane wejściowe.'
          />
        </KangurLessonStack>
      ),
    },
    {
      title: 'Kompozycja UI',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Kompozycja polega na składaniu UI z mniejszych elementów zamiast kopiowania kodu.
          </KangurLessonLead>
          <LessonCodeBlock
            title='Kompozycja'
            code={`function Card({ title, children }) {
  return (
    <section className="card">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

<Card title="Stats">
  <StatsGrid />
</Card>`}
            caption='Card buduje ramę, a children wypełniają treść.'
          />
        </KangurLessonStack>
      ),
    },
];
