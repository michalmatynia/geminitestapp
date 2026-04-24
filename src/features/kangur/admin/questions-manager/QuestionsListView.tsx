import { KangurQuestionListItem } from '../components/KangurQuestionListItem';

export function QuestionsListView({ filteredQuestions, questions, listFilter, sortMode, isSaving, questionSummaries, mutations }: any) {
  return (
    <div className='flex-1 overflow-auto rounded-[28px] border border-border/60 bg-card/20 p-3 sm:p-4'>
      <div className='space-y-3 pr-1'>
        {filteredQuestions.length === 0 ? (
          <div className='rounded-2xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground'>
            No questions found.
          </div>
        ) : (
          filteredQuestions.map((q: any, index: number) => {
            const absoluteIndex = questions.findIndex((question: any) => question.id === q.id);
            return (
              <KangurQuestionListItem
                key={q.id}
                question={q}
                index={index}
                absoluteIndex={absoluteIndex}
                isSaving={isSaving}
                questionSummary={questionSummaries.get(q.id)}
                onEdit={() => mutations.openEdit(q)}
                onDelete={() => mutations.setQuestionToDelete(q)}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
