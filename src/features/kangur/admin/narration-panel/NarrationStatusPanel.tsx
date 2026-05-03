import { Button } from '@/features/kangur/shared/ui';
import { Sparkles, RefreshCw } from 'lucide-react';
import { cn } from '@/features/kangur/shared/utils';

export function NarrationStatusPanel({
  status,
  hasScriptContent,
  onPrepare,
  onRegenerate,
}: {
  status: 'idle' | 'loading' | 'ready' | 'error';
  hasScriptContent: boolean;
  onPrepare: () => void;
  onRegenerate: () => void;
}) {
  return (
    <div className='flex flex-wrap gap-2'>
      <Button
        type='button'
        onClick={onPrepare}
        disabled={!hasScriptContent || status === 'loading'}
        className='inline-flex items-center gap-2'
      >
        <Sparkles className='size-4' />
        Generate audio preview
      </Button>
      <Button
        type='button'
        variant='outline'
        onClick={onRegenerate}
        disabled={!hasScriptContent || status === 'loading'}
        className='inline-flex items-center gap-2'
      >
        <RefreshCw className={cn('size-4', status === 'loading' && 'animate-spin')} />
        Regenerate
      </Button>
    </div>
  );
}
