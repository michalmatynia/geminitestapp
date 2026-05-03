import { Button } from '@/shared/ui/primitives.public';

export function SuggestionReviewRow({ suggestion, onPromote, isReadOnly }: any) {
  return (
    <div className='grid gap-3 rounded-md border border-border/60 bg-muted/10 p-3 lg:grid-cols-[1fr_200px]'>
      <div className='text-sm'>{suggestion.classificationRole}</div>
      <Button size='sm' onClick={onPromote} disabled={isReadOnly}>Promote</Button>
    </div>
  );
}
