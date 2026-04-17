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

type Props = {
  url: string;
  onUrlChange: (value: string) => void;
  currentUrl: string;
  status: 'idle' | 'starting' | 'live' | 'error';
  mode: 'drive' | 'pick';
  onModeChange: (mode: 'drive' | 'pick') => void;
  onStartOrNavigate: () => void;
  onBack: () => void;
  onForward: () => void;
  onReload: () => void;
  onDispose: () => void;
  typingValue: string;
  onTypingValueChange: (value: string) => void;
  onDriveType: () => void;
};

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

function LiveScripterNavigationRow({
  isLive,
  url,
  status,
  onUrlChange,
  onBack,
  onForward,
  onReload,
  onStartOrNavigate,
  onDispose,
}: {
  isLive: boolean;
  url: string;
  status: Props['status'];
  onUrlChange: Props['onUrlChange'];
  onBack: Props['onBack'];
  onForward: Props['onForward'];
  onReload: Props['onReload'];
  onStartOrNavigate: Props['onStartOrNavigate'];
  onDispose: Props['onDispose'];
}): React.JSX.Element {
  return (
    <div className='flex flex-wrap items-center gap-2'>
      <Button type='button' size='icon' variant='outline' onClick={onBack} disabled={!isLive}>
        <ArrowLeft className='size-4' />
      </Button>
      <Button type='button' size='icon' variant='outline' onClick={onForward} disabled={!isLive}>
        <ArrowRight className='size-4' />
      </Button>
      <Button type='button' size='icon' variant='outline' onClick={onReload} disabled={!isLive}>
        <RefreshCcw className='size-4' />
      </Button>
      <Input
        value={url}
        onChange={(event) => onUrlChange(event.target.value)}
        placeholder='https://example.com'
        className='min-w-[280px] flex-1'
      />
      <Button
        type='button'
        onClick={onStartOrNavigate}
        disabled={url.trim().length === 0 || status === 'starting'}
      >
        <LiveScripterStartButton isLive={isLive} />
      </Button>
      <Button type='button' variant='outline' onClick={onDispose} disabled={!isLive && status !== 'error'}>
        Stop
      </Button>
    </div>
  );
}

function LiveScripterModeRow({
  mode,
  status,
  currentUrl,
  onModeChange,
}: {
  mode: Props['mode'];
  status: Props['status'];
  currentUrl: string;
  onModeChange: Props['onModeChange'];
}): React.JSX.Element {
  return (
    <div className='flex flex-wrap items-center gap-2'>
      <Button
        type='button'
        size='sm'
        variant={mode === 'drive' ? 'default' : 'outline'}
        onClick={() => onModeChange('drive')}
      >
        <MousePointerClick className='mr-2 size-4' />
        Drive
      </Button>
      <Button
        type='button'
        size='sm'
        variant={mode === 'pick' ? 'default' : 'outline'}
        onClick={() => onModeChange('pick')}
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

function LiveScripterTypingRow({
  isLive,
  typingValue,
  onTypingValueChange,
  onDriveType,
}: {
  isLive: boolean;
  typingValue: string;
  onTypingValueChange: Props['onTypingValueChange'];
  onDriveType: Props['onDriveType'];
}): React.JSX.Element {
  return (
    <div className='flex flex-wrap items-center gap-2'>
      <Input
        value={typingValue}
        onChange={(event) => onTypingValueChange(event.target.value)}
        placeholder='Type into the focused page element'
        className='min-w-[260px] flex-1'
      />
      <Button
        type='button'
        variant='outline'
        onClick={onDriveType}
        disabled={!isLive || typingValue.trim().length === 0}
      >
        <Type className='mr-2 size-4' />
        Type
      </Button>
    </div>
  );
}

export function LiveScripterUrlBar({
  url,
  onUrlChange,
  currentUrl,
  status,
  mode,
  onModeChange,
  onStartOrNavigate,
  onBack,
  onForward,
  onReload,
  onDispose,
  typingValue,
  onTypingValueChange,
  onDriveType,
}: Props): React.JSX.Element {
  const isLive = status === 'live';

  return (
    <div className='space-y-3 rounded-lg border border-white/10 bg-black/10 p-4'>
      <LiveScripterNavigationRow
        isLive={isLive}
        url={url}
        status={status}
        onUrlChange={onUrlChange}
        onBack={onBack}
        onForward={onForward}
        onReload={onReload}
        onStartOrNavigate={onStartOrNavigate}
        onDispose={onDispose}
      />
      <LiveScripterModeRow
        mode={mode}
        status={status}
        currentUrl={currentUrl}
        onModeChange={onModeChange}
      />
      <LiveScripterTypingRow
        isLive={isLive}
        typingValue={typingValue}
        onTypingValueChange={onTypingValueChange}
        onDriveType={onDriveType}
      />
    </div>
  );
}
