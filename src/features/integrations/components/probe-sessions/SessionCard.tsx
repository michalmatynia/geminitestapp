import { Badge, Button } from '@/shared/ui/primitives.public';
import { Trash2 } from 'lucide-react';

export function SessionCard({ session, onPromote, onPromoteAndArchive, onReject, isReadOnly }: any) {
  return (
    <div className='space-y-3 rounded-md border border-border/70 bg-background/50 p-4'>
      <div className='flex items-center justify-between'>
        <div className='text-sm font-medium'>{session.sourceTitle ?? session.sourceUrl}</div>
        <div className='flex gap-2'>
          <Button size='sm' variant='outline' onClick={onPromote} disabled={isReadOnly}>Promote All</Button>
          <Button size='sm' variant='ghost' onClick={onReject} className='text-rose-500'><Trash2 className='size-4' /></Button>
        </div>
      </div>
    </div>
  );
}
