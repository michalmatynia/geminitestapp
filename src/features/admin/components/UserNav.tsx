'use client';

import { LogOut, LogIn, SparklesIcon } from 'lucide-react';
import { signIn, signOut, useSession } from 'next-auth/react';

import { useAdminLayout } from '@/features/admin/context/AdminLayoutContext';
import { useUpdateSettingsBulk } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Switch,
  ThemeToggle as ThemeToggleComponent,
} from '@/shared/ui';


export function UserNav(): React.ReactNode {
  const { data: session } = useSession();
  const { setAiDrawerOpen } = useAdminLayout();
  const settingsStore = useSettingsStore();
  const updateSettings = useUpdateSettingsBulk();

  const parseEnabled = (value: string | undefined, fallback: boolean): boolean => {
    if (value === undefined) return fallback;
    return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
  };

  const queryPanelEnabled = parseEnabled(settingsStore.get('query_status_panel_enabled'), false);
  const queryPanelOpen = parseEnabled(settingsStore.get('query_status_panel_open'), false);

  const setQueryPanelSetting = (key: string, value: boolean): void => {
    if (key === 'query_status_panel_enabled') {
      updateSettings.mutate([
        { key: 'query_status_panel_enabled', value: value ? 'true' : 'false' },
        { key: 'query_status_panel_open', value: value ? 'true' : 'false' },
      ]);
      return;
    }
    updateSettings.mutate([{ key, value: value ? 'true' : 'false' }]);
  };

  if (!session) {
    return (
      <Button variant="ghost" onClick={() => { void signIn(); }}>
        <LogIn className="mr-2 h-4 w-4" />
        Log In
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-10 w-10 rounded-full opacity-60 transition-opacity hover:opacity-100"
        >
          <Avatar className="h-10 w-10">
            <AvatarImage src={session.user?.image ?? ''} alt={session.user?.name ?? ''} />
            <AvatarFallback>{session.user?.name?.[0]?.toUpperCase() ?? 'U'}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{session.user?.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {session.user?.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            setAiDrawerOpen(true);
          }}
        >
          <SparklesIcon className="mr-2 h-4 w-4" />
          <span>AI warnings</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="flex flex-col items-start gap-2"
          onSelect={(event: Event) => event.preventDefault()}
        >
          <div className="text-xs font-medium text-muted-foreground">Query Panel</div>
          <div className="flex w-full items-center justify-between gap-3">
            <span className="text-sm">Enable Panel</span>
            <Switch
              checked={queryPanelEnabled}
              onCheckedChange={(checked: boolean): void => setQueryPanelSetting('query_status_panel_enabled', checked)}
            />
          </div>
          <div className="flex w-full items-center justify-between gap-3">
            <span className="text-sm">Open Panel</span>
            <Switch
              checked={queryPanelOpen}
              onCheckedChange={(checked: boolean): void => setQueryPanelSetting('query_status_panel_open', checked)}
              disabled={!queryPanelEnabled}
            />
          </div>
          <div className="flex w-full justify-end">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() =>
                updateSettings.mutate([
                  { key: 'query_status_panel_enabled', value: 'false' },
                  { key: 'query_status_panel_open', value: 'false' },
                ])
              }
            >
              Switch Panel Off
            </Button>
          </div>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <div className="flex items-center justify-between px-2 py-1.5">
          <span className="text-sm font-medium">Appearance</span>
          <ThemeToggleComponent />
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => { void signOut(); }}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
