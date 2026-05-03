'use client';

import {
  ArrowLeft,
  ArrowRight,
  MousePointerClick,
  Navigation,
  RefreshCcw,
  Search,
  Type,
} from 'lucide-react';

import { Badge, Button, Input } from '@/shared/ui/primitives.public';
import { useLiveScripterPanelContext } from './LiveScripterPanelContext';

function LiveScripterStartButton({
  isLive,
}: {
  isLive: boolean;
}): React.JSX.Element {
  return isLive ? (
    <>
      <Navigation className='mr-2 size-4' />
      Go
    </>
  ) : (
    <>
      <Search className='mr-2 size-4' />
      Start
    </>
  );
}

function LiveScripterNavigationRow(): React.JSX.Element {
  const model = useLiveScripterPanelContext();
  const { urlInput, setUrlInput, liveScripter, handleStartOrNavigate, handleDispose } = model;
  const isLive = liveScripter.status === 'live';

  return (
    <div className='flex flex-wrap items-center gap-2'>
      <Button type='button' size='icon' variant='outline' onClick={liveScripter.back} disabled={!isLive}>
        <ArrowLeft className='size-4' />
      </Button>
      <Button type='button' size='icon' variant='outline' onClick={liveScripter.forward} disabled={!isLive}>
        <ArrowRight className='size-4' />
      </Button>
      <Button type='button' size='icon' variant='outline' onClick={liveScripter.reload} disabled={!isLive}>
        <RefreshCcw className='size-4' />
      </Button>
      <Input
        value={urlInput}
        onChange={(event) => setUrlInput(event.target.value)}
        placeholder='https://example.com'
        className='min-w-[280px] flex-1'
      />
      <Button
        type='button'
        onClick={handleStartOrNavigate}
        disabled={urlInput.trim().length === 0 || liveScripter.status === 'starting'}
      >
        <LiveScripterStartButton isLive={isLive} />
      </Button>
      <Button type='button' variant='outline' onClick={handleDispose} disabled={!isLive && liveScripter.status !== 'error'}>
        Stop
      </Button>
    </div>
  );
}

function LiveScripterModeRow(): React.JSX.Element {
  const model = useLiveScripterPanelContext();
  const { liveScripter } = model;
  const { mode, status, currentUrl, setMode } = liveScripter;

  return (
    <div className='flex flex-wrap items-center gap-2'>
      <Button
        type='button'
        size='sm'
        variant={mode === 'drive' ? 'default' : 'outline'}
        onClick={() => setMode('drive')}
      >
        <MousePointerClick className='mr-2 size-4' />
        Drive
      </Button>
      <Button
        type='button'
        size='sm'
        variant={mode === 'pick' ? 'default' : 'outline'}
        onClick={() => setMode('pick')}
      >
        <Search className='mr-2 size-4' />
        Pick
      </Button>
      <Badge variant='outline' className='capitalize'>
        {status}
      </Badge>
      {currentUrl.length > 0 ? (
        <span className='min-w-0 flex-1 truncate text-xs text-muted-foreground'>{currentUrl}</span>
      ) : null}
    </div>
  );
}

function LiveScripterTypingRow(): React.JSX.Element {
  const model = useLiveScripterPanelContext();
  const { typingValue, setTypingValue, handleDriveType, liveScripter } = model;
  const isLive = liveScripter.status === 'live';

  return (
    <div className='flex flex-wrap items-center gap-2'>
      <Input
        value={typingValue}
        onChange={(event) => setTypingValue(event.target.value)}
        placeholder='Type into the focused page element'
        className='min-w-[260px] flex-1'
      />
      <Button
        type='button'
        variant='outline'
        onClick={handleDriveType}
        disabled={!isLive || typingValue.trim().length === 0}
      >
        <Type className='mr-2 size-4' />
        Type
      </Button>
    </div>
  );
}

export function LiveScripterUrlBar(): React.JSX.Element {
  return (
    <div className='space-y-3 rounded-lg border border-white/10 bg-black/10 p-4'>
      <LiveScripterNavigationRow />
      <LiveScripterModeRow />
      <LiveScripterTypingRow />
    </div>
  );
}
