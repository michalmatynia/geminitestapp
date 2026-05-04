'use client';

import React from 'react';
import { Save, Sparkles } from 'lucide-react';
import { CanvasBoard } from '@/features/ai/public';
import { Button, Card } from '@/shared/ui/primitives.public';
import { useCaseResolverPageState } from '../context/CaseResolverPageContext';

export function WorkspaceCanvas({ 
  onSave 
}: { 
  onSave: () => void;
}): React.JSX.Element {
  const { activeFile } = useCaseResolverPageState();

  return (
    <Card
      variant='subtle'
      padding='none'
      className='relative flex flex-1 flex-col overflow-hidden'
    >
      <div className='absolute left-4 top-4 z-10 flex items-center gap-2'>
        <div className='rounded-full border border-border/60 bg-card/80 px-3 py-1.5 backdrop-blur-sm'>
          <div className='flex items-center gap-2'>
            <span className='text-[10px] font-bold uppercase tracking-wider text-gray-500'>
              Active:
            </span>
            <span className='text-xs font-medium text-white'>
              {activeFile?.name ?? 'Untitled Map'}
            </span>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={onSave}
            className='h-8 border-emerald-500/30 text-emerald-200 hover:bg-emerald-500/10'
          >
            <Save className='mr-2 size-3.5' />
            Save Map
          </Button>
          <Button
            variant='outline'
            size='sm'
            className='h-8 border-sky-500/30 text-sky-200 hover:bg-sky-500/10'
          >
            <Sparkles className='mr-2 size-3.5' />
            Preview Compiled
          </Button>
        </div>
      </div>

      <CanvasBoard />
    </Card>
  );
}
