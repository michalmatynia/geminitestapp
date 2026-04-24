import { Badge, Button } from '@/features/kangur/shared/ui';
import { GripVertical, Copy, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import { cn } from '@/features/kangur/shared/utils';

export function LessonBlockEditor({ block, index, activePage, mutations }: { block: any; index: number; activePage: any; mutations: any }) {
  return (
    <div className='relative rounded-[28px] border border-border/60 bg-card/50 p-4'>
      <div className='mb-4 flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <Badge variant='outline'>{block.type}</Badge>
          <div className='text-sm font-semibold'>Block {index + 1}</div>
        </div>
        <div className='flex items-center gap-1'>
          <Button size='sm' variant='outline' onClick={() => mutations.duplicateRootBlock(index)}><Copy className='size-3.5' /></Button>
          <Button size='sm' variant='outline' onClick={() => mutations.removeRootBlock(block.id)}><Trash2 className='size-3.5 text-rose-600' /></Button>
        </div>
      </div>
      {/* Block content editor would go here based on block.type */}
      <div className='text-xs text-muted-foreground'>Editor for {block.type}</div>
    </div>
  );
}
