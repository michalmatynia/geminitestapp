import { KangurQuestionListItem } from '../components/KangurQuestionListItem';

export function QuestionsListView({ copy, filteredQuestions, questions, questionSummaries, mutations }: any) {
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
                copy={copy.listItem}
                canReorder={questions.length > 1}
                isSaving={mutations.isSaving}
                questionSummary={questionSummaries.get(q.id)}
                onMoveUp={() => { void mutations.handleMove(absoluteIndex, Math.max(0, absoluteIndex - 1)); }}
                onMoveDown={() => { void mutations.handleMove(absoluteIndex, Math.min(questions.length - 1, absoluteIndex + 1)); }}
                onEdit={() => mutations.openEdit(q)}
                onDuplicate={() => { void mutations.handleDuplicate(q); }}
                onDelete={() => mutations.setQuestionToDelete(q)}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
