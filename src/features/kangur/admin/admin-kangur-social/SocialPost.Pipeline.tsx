'use client';

import { Sparkles, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button, FormSection } from '@/features/kangur/shared/ui';
import { cn } from '@/shared/utils';

export function SocialPostPipeline({
  activePostId,
  pipelineStep,
  handleRunFullPipeline,
}: {
  activePostId: string | null;
  pipelineStep: 'idle' | 'capturing' | 'saving' | 'generating' | 'previewing' | 'done' | 'error';
  handleRunFullPipeline: () => Promise<void>;
}) {
  const isPipelineActive = pipelineStep !== 'idle' && pipelineStep !== 'done' && pipelineStep !== 'error';

  return (
    <FormSection
      title='Automation Pipeline'
      description='Run the full capture → analysis → draft generation sequence.'
      variant='subtle'
      className='p-4 border-primary/20 bg-primary/5'
      actions={
        <Button
          type='button'
          size='sm'
          onClick={handleRunFullPipeline}
          disabled={!activePostId || isPipelineActive}
          className='gap-2 shadow-lg shadow-primary/20'
        >
          <Sparkles className={cn('h-4 w-4', isPipelineActive && 'animate-pulse')} />
          Run full pipeline
        </Button>
      }
    >
      <div className='mt-2 space-y-3'>
        <div className='grid gap-4 sm:grid-cols-4'>
          {[
            { id: 'capturing', label: 'Capture screenshots' },
            { id: 'saving', label: 'Link images' },
            { id: 'generating', label: 'Generate draft' },
            { id: 'previewing', label: 'Prepare doc diff' },
          ].map((step, index) => {
            const steps = ['capturing', 'saving', 'generating', 'previewing', 'done'];
            const currentIdx = steps.indexOf(pipelineStep);
            const stepIdx = steps.indexOf(step.id);
            const isCompleted = currentIdx > stepIdx || pipelineStep === 'done';
            const isActive = pipelineStep === step.id;

            return (
              <div
                key={step.id}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition-all',
                  isActive ? 'border-primary bg-primary/10 shadow-sm' : 'border-border/40 bg-card/20',
                  isCompleted && 'border-emerald-500/40 bg-emerald-500/5'
                )}
              >
                <div className='relative'>
                  {isActive ? (
                    <Loader2 className='h-5 w-5 animate-spin text-primary' />
                  ) : isCompleted ? (
                    <CheckCircle2 className='h-5 w-5 text-emerald-500' />
                  ) : pipelineStep === 'error' && stepIdx === currentIdx ? (
                    <AlertCircle className='h-5 w-5 text-rose-500' />
                  ) : (
                    <div className='flex h-5 w-5 items-center justify-center rounded-full border border-border text-[10px] font-bold text-muted-foreground'>
                      {index + 1}
                    </div>
                  )}
                </div>
                <div
                  className={cn(
                    'text-[10px] font-bold uppercase tracking-wider',
                    isActive ? 'text-primary' : isCompleted ? 'text-emerald-400' : 'text-muted-foreground'
                  )}
                >
                  {step.label}
                </div>
              </div>
            );
          })}
        </div>
        <p className='text-xs text-muted-foreground italic text-center'>
          Automates the standard Kangur social update workflow in one click.
        </p>
      </div>
    </FormSection>
  );
}
