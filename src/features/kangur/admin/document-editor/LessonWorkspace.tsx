import { KangurLessonEmptyState } from '../components/KangurLessonEmptyState';
import { LessonBlockEditor } from './LessonBlockEditor';

export function LessonWorkspace({ controller }: { controller: any }) {
  const { activePage, mutations } = controller;

  if (!activePage) return <KangurLessonEmptyState activePage={null} updateDocument={mutations.updateDocument} />;

  return (
    <div className='space-y-4'>
      {activePage.blocks.map((block: any, index: number) => (
        <LessonBlockEditor
          key={block.id}
          block={block}
          index={index}
          activePage={activePage}
          mutations={mutations}
        />
      ))}
    </div>
  );
}
