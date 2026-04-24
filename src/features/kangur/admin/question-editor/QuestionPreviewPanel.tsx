import { KangurTestQuestionRenderer } from '@/features/kangur/ui/components/KangurTestQuestionRenderer';

export function QuestionPreviewPanel({ 
  copy, previewQuestion, previewSelectedLabel, previewShowAnswer, previewMode, setPreviewMode, previewFrame, setPreviewFrame 
}: any) {
  return (
    <div className='sticky top-4 hidden h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/20 xl:flex'>
      <div className='flex items-center justify-between border-b border-border/60 bg-card/40 px-4 py-3 backdrop-blur-md'>
        <div>
          <div className='text-sm font-semibold text-white'>{copy.shell.preview}</div>
        </div>
        <div className='flex items-center gap-2'>
           {/* Preview mode/frame toggles */}
        </div>
      </div>
      <div className='flex-1 overflow-y-auto p-4'>
        <div className='mx-auto max-w-xl rounded-xl border border-border/40 bg-white p-4 shadow-sm'>
          <KangurTestQuestionRenderer
            question={previewQuestion}
            selectedLabel={previewSelectedLabel}
            onSelect={() => {}}
            showAnswer={previewShowAnswer}
            showSectionIntro={false}
          />
        </div>
      </div>
    </div>
  );
}
