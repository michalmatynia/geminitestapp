import { Badge, Button } from '@/shared/ui/primitives.public';
import { Trash2 } from 'lucide-react';
import type { SelectorRegistryProbeSession } from '@/shared/contracts/integrations/selector-registry';

type SessionCardProps = {
  session: SelectorRegistryProbeSession;
  isReadOnly: boolean;
  readyCount: number;
  onPromoteAll: () => Promise<void>;
  onPromoteAndArchive: () => Promise<void>;
  onReject: () => Promise<void>;
  isPromoting: boolean;
  isArchiving: boolean;
  isRejecting: boolean;
  canArchive: boolean;
  formatTimestamp: (value: string) => string;
};

export function SessionCard({
  session,
  isReadOnly,
  readyCount,
  onPromoteAll,
  onPromoteAndArchive,
  onReject,
  isPromoting,
  isArchiving,
  isRejecting,
  canArchive,
  formatTimestamp,
}: SessionCardProps) {
  return (
    <div className='space-y-3 rounded-md border border-border/70 bg-background/50 p-4'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div className='space-y-1'>
          <div className='flex flex-wrap items-center gap-2'>
            <Badge variant='outline'>{session.profile}</Badge>
            <Badge variant='outline'>{session.scannedPages} pages</Badge>
            <Badge variant='outline'>{session.suggestionCount} suggestions</Badge>
            <Badge variant='outline'>{readyCount} ready</Badge>
            <Badge variant='outline'>{formatTimestamp(session.createdAt)}</Badge>
          </div>
          <div className='text-sm font-medium'>{session.sourceTitle ?? session.sourceUrl}</div>
          <div className='text-xs text-muted-foreground'>{session.sourceUrl}</div>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <Button
            type='button'
            size='sm'
            variant='outline'
            disabled={isReadOnly || readyCount === 0 || isPromoting}
            loading={isPromoting}
            loadingText='Promoting'
            onClick={onPromoteAll}
          >
            Promote All Matching
          </Button>
          <Button
            type='button'
            size='sm'
            variant='outline'
            disabled={isReadOnly || !canArchive || isArchiving}
            loading={isArchiving}
            loadingText='Archiving'
            onClick={onPromoteAndArchive}
          >
            Promote And Archive Session
          </Button>
          <Button
            type='button'
            size='sm'
            variant='outline'
            loading={isRejecting}
            loadingText='Rejecting'
            onClick={onReject}
          >
            {!isRejecting && <Trash2 className='mr-2 size-4' />}
            Reject Session
          </Button>
        </div>
      </div>
      <div className='flex flex-wrap gap-2 text-xs text-muted-foreground'>
        {session.pages.map((pageSummary) => (
          <Badge key={`${session.id}:${pageSummary.url}`} variant='outline'>
            {pageSummary.title ?? pageSummary.url} ({pageSummary.suggestionCount})
          </Badge>
        ))}
      </div>
    </div>
  );
}
