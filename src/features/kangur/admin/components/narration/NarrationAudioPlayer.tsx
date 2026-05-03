'use client';

import React from 'react';
import type { JSX } from 'react';
import { Badge, Button } from '@/shared/ui/primitives.public';
import { Play, Pause, RefreshCw } from 'lucide-react';

interface NarrationAudioPlayerProps {
  audioUrl: string | null;
  onRefresh: () => void;
  isGenerating: boolean;
}

export function NarrationAudioPlayer({ audioUrl, onRefresh, isGenerating }: NarrationAudioPlayerProps): JSX.Element {
  const [isPlaying, setIsPlaying] = React.useState(false);

  const hasAudio = audioUrl !== null && audioUrl.length > 0;
  const isDisabled = isGenerating || !hasAudio;

  return (
    <div className='flex items-center gap-2 p-3 bg-gray-800 rounded-md border border-gray-700'>
      <Button 
        variant='ghost' 
        size='icon' 
        onClick={() => setIsPlaying(!isPlaying)}
        disabled={isDisabled}
      >
        {isPlaying ? <Pause className='size-4' /> : <Play className='size-4' />}
      </Button>
      <div className='flex-1 text-xs text-gray-400 truncate'>
        {hasAudio ? 'Audio ready' : 'No audio generated'}
      </div>
      <Button 
        variant='ghost' 
        size='icon' 
        onClick={onRefresh}
        disabled={isGenerating}
        title='Regenerate audio'
      >
        <RefreshCw className={isGenerating ? 'size-4 animate-spin' : 'size-4'} />
      </Button>
      {hasAudio && <Badge variant='outline' className='text-[10px]'>Ready</Badge>}
    </div>
  );
}
