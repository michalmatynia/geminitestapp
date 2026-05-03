'use client';

import { LogOut, LogIn, SparklesIcon } from 'lucide-react';
import type { Session } from 'next-auth';
import { signIn, signOut, useSession } from 'next-auth/react';
import { useState } from 'react';

import { useAdminLayoutActions } from '@/features/admin/context/AdminLayoutContext';
import { useUpdateSettingsBulk } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { Avatar, AvatarFallback, AvatarImage, Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/shared/ui/primitives.public';
import { ToggleRow, ThemeToggle as ThemeToggleComponent } from '@/shared/ui/forms-and-actions.public';

type QueryPanelSettingKey = 'query_status_panel_enabled' | 'query_status_panel_open';

type SettingReader = (key: QueryPanelSettingKey) => string | undefined;

type QueryPanelSectionProps = {
  queryPanelEnabled: boolean;
  queryPanelOpen: boolean;
  setQueryPanelSetting: (key: QueryPanelSettingKey, value: boolean) => void;
  turnQueryPanelOff: () => void;
};

function QueryPanelSection({
  queryPanelEnabled,
  queryPanelOpen,
  setQueryPanelSetting,
  turnQueryPanelOff,
}: QueryPanelSectionProps): React.ReactNode {
  return (
    <DropdownMenuItem
      className='flex flex-col items-stretch gap-2'
      onSelect={(event: Event) => event.preventDefault()}
    >
      <div className='text-xs font-medium text-muted-foreground'>Query Panel</div>
      <ToggleRow
        label='Enable Panel'
        checked={queryPanelEnabled}
        onCheckedChange={(checked: boolean): void =>
          setQueryPanelSetting('query_status_panel_enabled', checked)
        }
        className='bg-transparent border-none p-0 hover:bg-transparent'
        labelClassName='text-sm font-normal normal-case tracking-normal'
      />
      <ToggleRow
        label='Open Panel'
        checked={queryPanelOpen}
        onCheckedChange={(checked: boolean): void =>
          setQueryPanelSetting('query_status_panel_open', checked)
        }
        disabled={!queryPanelEnabled}
        className='bg-transparent border-none p-0 hover:bg-transparent'
        labelClassName='text-sm font-normal normal-case tracking-normal'
      />
      <div className='flex w-full justify-end'>
        <Button
          variant='outline'
          size='sm'
          className='h-7 px-2 text-xs'
          onClick={turnQueryPanelOff}
        >
          Switch Panel Off
        </Button>
      </div>
    </DropdownMenuItem>
  );
}

type UserMenuContentProps = {
  contentId: string;
  onOpenAiWarnings: () => void;
  onSignOut: () => void;
  queryPanelEnabled: boolean;
  queryPanelOpen: boolean;
  session: Session;
  setQueryPanelSetting: (key: QueryPanelSettingKey, value: boolean) => void;
  turnQueryPanelOff: () => void;
};

function parseEnabled(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }

  return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
}

function readQueryPanelState(isOpen: boolean, getSetting: SettingReader): {
  queryPanelEnabled: boolean;
  queryPanelOpen: boolean;
} {
  if (!isOpen) {
    return {
      queryPanelEnabled: false,
      queryPanelOpen: false,
    };
  }

  return {
    queryPanelEnabled: parseEnabled(getSetting('query_status_panel_enabled'), false),
    queryPanelOpen: parseEnabled(getSetting('query_status_panel_open'), false),
  };
}

function UserMenuContent({
  contentId,
  onOpenAiWarnings,
  onSignOut,
  queryPanelEnabled,
  queryPanelOpen,
  session,
  setQueryPanelSetting,
  turnQueryPanelOff,
}: UserMenuContentProps): React.ReactNode {
  return (
    <DropdownMenuContent id={contentId} className='z-[95] w-56' align='end'>
      <DropdownMenuLabel className='font-normal'>
        <div className='flex flex-col space-y-1'>
          <p className='text-sm font-medium leading-none'>{session.user?.name}</p>
          <p className='text-xs leading-none text-muted-foreground'>{session.user?.email}</p>
        </div>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onSelect={() => {
          onOpenAiWarnings();
        }}
      >
        <SparklesIcon className='mr-2 h-4 w-4' />
        <span>AI warnings</span>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <QueryPanelSection
        queryPanelEnabled={queryPanelEnabled}
        queryPanelOpen={queryPanelOpen}
        setQueryPanelSetting={setQueryPanelSetting}
        turnQueryPanelOff={turnQueryPanelOff}
      />
      <DropdownMenuSeparator />
      <div className='flex items-center justify-between px-2 py-1.5'>
        <span className='text-sm font-medium'>Appearance</span>
        <ThemeToggleComponent />
      </div>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onClick={() => {
          onSignOut();
        }}
      >
        <LogOut className='mr-2 h-4 w-4' />
        <span>Log out</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
}

function UserAvatarTrigger({
  session,
  triggerId,
}: {
  session: Session;
  triggerId: string;
}): React.ReactNode {
  const avatarImage = session.user?.image ?? '';
  const avatarName = session.user?.name ?? '';
  const avatarInitial = avatarName.length > 0 ? avatarName.slice(0, 1).toUpperCase() : 'U';

  return (
    <Button
      id={triggerId}
      variant='ghost'
      className='relative z-[95] h-10 w-10 rounded-full opacity-60 transition-opacity hover:opacity-100'
      aria-label='Avatar'
      title='Avatar'
    >
      <Avatar className='h-10 w-10'>
        <AvatarImage src={avatarImage} alt={avatarName} />
        <AvatarFallback>{avatarInitial}</AvatarFallback>
      </Avatar>
    </Button>
  );
}

type AuthenticatedUserNavProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onOpenAiWarnings: () => void;
  onSignOut: () => void;
  queryPanelEnabled: boolean;
  queryPanelOpen: boolean;
  session: Session;
  setQueryPanelSetting: (key: QueryPanelSettingKey, value: boolean) => void;
  turnQueryPanelOff: () => void;
};

function AuthenticatedUserNav({
  isOpen,
  onOpenChange,
  onOpenAiWarnings,
  onSignOut,
  queryPanelEnabled,
  queryPanelOpen,
  session,
  setQueryPanelSetting,
  turnQueryPanelOff,
}: AuthenticatedUserNavProps): React.ReactNode {
  const triggerId = 'admin-user-nav-trigger';
  const contentId = 'admin-user-nav-content';

  return (
    <DropdownMenu open={isOpen} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <UserAvatarTrigger session={session} triggerId={triggerId} />
      </DropdownMenuTrigger>
      {isOpen ? (
        <UserMenuContent
          contentId={contentId}
          onOpenAiWarnings={onOpenAiWarnings}
          onSignOut={onSignOut}
          queryPanelEnabled={queryPanelEnabled}
          queryPanelOpen={queryPanelOpen}
          session={session}
          setQueryPanelSetting={setQueryPanelSetting}
          turnQueryPanelOff={turnQueryPanelOff}
        />
      ) : null}
    </DropdownMenu>
  );
}

function SignInButton({ onSignIn }: { onSignIn: () => void }): React.ReactNode {
  return (
    <Button variant='ghost' onClick={onSignIn}>
      <LogIn className='mr-2 h-4 w-4' />
      Log In
    </Button>
  );
}

export function UserNav(): React.ReactNode {
  const { data: session } = useSession();
  const { setAiDrawerOpen } = useAdminLayoutActions();
  const settingsStore = useSettingsStore();
  const updateSettings = useUpdateSettingsBulk();
  const [isOpen, setIsOpen] = useState(false);
  const { queryPanelEnabled, queryPanelOpen } = readQueryPanelState(isOpen, settingsStore.get);

  const setQueryPanelSetting = (key: QueryPanelSettingKey, value: boolean): void => {
    if (key === 'query_status_panel_enabled') {
      updateSettings.mutate([
        { key: 'query_status_panel_enabled', value: value ? 'true' : 'false' },
        { key: 'query_status_panel_open', value: value ? 'true' : 'false' },
      ]);
      return;
    }

    updateSettings.mutate([{ key, value: value ? 'true' : 'false' }]);
  };

  const turnQueryPanelOff = (): void => {
    updateSettings.mutate([
      { key: 'query_status_panel_enabled', value: 'false' },
      { key: 'query_status_panel_open', value: 'false' },
    ]);
  };

  const handleSignIn = (): void => {
    signIn().catch(() => undefined);
  };

  const handleSignOut = (): void => {
    signOut().catch(() => undefined);
  };

  if (!session) {
    return <SignInButton onSignIn={handleSignIn} />;
  }

  return (
    <AuthenticatedUserNav
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      onOpenAiWarnings={() => setAiDrawerOpen(true)}
      onSignOut={handleSignOut}
      queryPanelEnabled={queryPanelEnabled}
      queryPanelOpen={queryPanelOpen}
      session={session}
      setQueryPanelSetting={setQueryPanelSetting}
      turnQueryPanelOff={turnQueryPanelOff}
    />
  );
}
