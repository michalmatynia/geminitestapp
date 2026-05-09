import { KangurLessonEmptyState } from '../components/KangurLessonEmptyState';
import { LessonBlockEditor } from './LessonBlockEditor';
import { ActivePageHealthPanel } from './ActivePageHealthPanel';

export function LessonWorkspace({ controller }: { controller: any }) {
  const { activePage, mutations, pageDraftReviews } = controller;

  if (!activePage) return <KangurLessonEmptyState activePage={null} updateDocument={mutations.updateDocument} />;

  const pageReview = pageDraftReviews.get(activePage.id);

  return (
    <div className='space-y-4'>
      {pageReview && <ActivePageHealthPanel review={pageReview} />}

      {activePage.blocks.length === 0 && (
        <KangurLessonEmptyState activePage={activePage} updateDocument={mutations.updateDocument} />
      )}

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
