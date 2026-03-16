import type { KangurAiTutorOnboardingValidationIssue } from '@/features/kangur/ai-tutor-onboarding-validation';
import { Badge } from '@/features/kangur/shared/ui';

type Props = {
  listName: string;
  ruleCount: number;
  totalIssues: number;
  blockingIssueCount: number;
  collectionIssues: KangurAiTutorOnboardingValidationIssue[];
};

export function KangurAiTutorNativeGuideValidationSummary({
  listName,
  ruleCount,
  totalIssues,
  blockingIssueCount,
  collectionIssues,
}: Props): React.JSX.Element {
  const hasBlockingValidationIssues = blockingIssueCount > 0;

  return (
    <div className='mt-4 rounded-2xl border border-border/60 bg-background/60 px-4 py-4 shadow-sm'>
      <div className='flex flex-wrap items-center gap-2'>
        <div className='text-sm font-semibold text-foreground'>Onboarding validation</div>
        <Badge variant={hasBlockingValidationIssues ? 'warning' : 'secondary'}>
          {hasBlockingValidationIssues ? `${blockingIssueCount} blocking` : 'Ready to save'}
        </Badge>
        <Badge variant='outline'>{totalIssues} issues</Badge>
        <Badge variant='outline'>{ruleCount} rules</Badge>
        <Badge variant='outline'>{listName}</Badge>
      </div>

      {collectionIssues.length > 0 ? (
        <div className='mt-3 space-y-2'>
          {collectionIssues.map((issue, index) => (
            <div
              key={`${issue.ruleId ?? issue.title}-${issue.field}-${index}`}
              className={`rounded-xl border px-3 py-2 text-xs ${
                issue.blocking
                  ? 'border-rose-500/30 bg-rose-500/10 text-rose-950'
                  : 'border-amber-500/30 bg-amber-500/10 text-amber-950'
              }`}
            >
              <div className='font-semibold'>{issue.title}</div>
              <div className='mt-0.5'>{issue.message}</div>
            </div>
          ))}
        </div>
      ) : (
        <p className='mt-2 text-sm text-muted-foreground'>
          Native guide entries satisfy the AI Tutor onboarding validation sequence.
        </p>
      )}
    </div>
  );
}
