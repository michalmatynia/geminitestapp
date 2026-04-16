/* eslint-disable complexity, max-lines, max-lines-per-function */
'use client';

import Link from 'next/link';
import {
  CopyIcon,
  DatabaseIcon,
  PencilIcon,
  RefreshCw,
  RotateCcw,
  Trash2,
  WorkflowIcon,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  useDeleteTraderaSelectorRegistryEntryMutation,
  useMutateTraderaSelectorRegistryProfileMutation,
  useSaveTraderaSelectorRegistryEntryMutation,
  useSyncTraderaSelectorRegistryMutation,
  useTraderaSelectorRegistry,
} from '@/features/integrations/hooks/useTraderaSelectorRegistry';
import type { TraderaSelectorRegistryEntry } from '@/shared/contracts/integrations/tradera-selector-registry';
import { useConfirm } from '@/shared/hooks/ui/useConfirm';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';
import { AdminIntegrationsPageLayout } from '@/shared/ui/admin.public';
import { EmptyState } from '@/shared/ui/empty-state';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  useToast,
} from '@/shared/ui/primitives.public';
import { SearchInput } from '@/shared/ui/search-input';
import { StandardDataTablePanel } from '@/shared/ui/templates/StandardDataTablePanel';

import type { ColumnDef } from '@tanstack/react-table';

type SelectorRegistryTableEntry = Omit<
  TraderaSelectorRegistryEntry,
  'createdAt' | 'profile' | 'updatedAt'
> & {
  createdAt: string | null;
  hasOverride: boolean;
  profile: string;
  resolvedFromProfile: string;
  updatedAt: string | null;
};

const DEFAULT_PROFILE = 'default';

const formatTimestamp = (value: string | null): string => {
  if (value === null || value.trim().length === 0) {
    return 'Not synced yet';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
};

const normalizeSearchValue = (value: string): string =>
  value
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const formatValueJsonForEditor = (valueJson: string): string => {
  try {
    return JSON.stringify(JSON.parse(valueJson), null, 2);
  } catch {
    return valueJson;
  }
};

const buildEffectiveEntries = (
  entries: readonly TraderaSelectorRegistryEntry[],
  selectedProfile: string
): SelectorRegistryTableEntry[] => {
  const defaultEntriesByKey = new Map(
    entries
      .filter((entry) => entry.profile === DEFAULT_PROFILE)
      .map((entry) => [entry.key, entry])
  );
  const profileEntriesByKey =
    selectedProfile === DEFAULT_PROFILE
      ? defaultEntriesByKey
      : new Map(
          entries
            .filter((entry) => entry.profile === selectedProfile)
            .map((entry) => [entry.key, entry])
        );

  return Array.from(new Set([...defaultEntriesByKey.keys(), ...profileEntriesByKey.keys()]))
    .sort()
    .flatMap((key): SelectorRegistryTableEntry[] => {
      const profileEntry =
        selectedProfile === DEFAULT_PROFILE ? defaultEntriesByKey.get(key) : profileEntriesByKey.get(key);
      const defaultEntry = defaultEntriesByKey.get(key);
      const effectiveEntry = profileEntry ?? defaultEntry;

      if (!effectiveEntry) {
        return [];
      }

      return [
        {
          ...effectiveEntry,
          id: `${selectedProfile}:${effectiveEntry.id}`,
          profile: selectedProfile,
          resolvedFromProfile:
            selectedProfile === DEFAULT_PROFILE || profileEntry ? selectedProfile : DEFAULT_PROFILE,
          hasOverride: selectedProfile !== DEFAULT_PROFILE && profileEntry !== undefined,
          createdAt: effectiveEntry.createdAt,
          updatedAt: effectiveEntry.updatedAt,
        },
      ];
    })
    .sort((left, right) => {
      const groupCompare = left.group.localeCompare(right.group);
      if (groupCompare !== 0) return groupCompare;
      return left.key.localeCompare(right.key);
    });
};

const buildColumns = (options: {
  onEdit: (entry: SelectorRegistryTableEntry) => void;
  onReset: (entry: SelectorRegistryTableEntry) => void;
  resettingKey: string | null;
}): ColumnDef<SelectorRegistryTableEntry>[] => [
  {
    accessorKey: 'key',
    header: 'Selector',
    cell: ({ row }) => {
      const entry = row.original;

      return (
        <div className='min-w-0 space-y-1'>
          <div className='flex flex-wrap items-center gap-2'>
            <div className='truncate text-sm font-medium text-gray-100'>{entry.key}</div>
            <Badge variant='info' className='capitalize'>
              {entry.kind}
            </Badge>
            <Badge variant='neutral'>{entry.valueType.replace(/_/g, ' ')}</Badge>
          </div>
          <div className='text-xs text-muted-foreground'>
            {entry.description ?? 'No registry description.'}
          </div>
        </div>
      );
    },
  },
  {
    id: 'resolution',
    header: 'Resolved',
    cell: ({ row }) => {
      const entry = row.original;
      let stateBadge: React.JSX.Element;

      if (entry.profile === DEFAULT_PROFILE) {
        stateBadge = <Badge variant='neutral'>default</Badge>;
      } else if (entry.hasOverride) {
        stateBadge = <Badge variant='info'>override</Badge>;
      } else {
        stateBadge = <Badge variant='neutral'>inherited</Badge>;
      }

      return (
        <div className='space-y-1'>
          <div className='flex flex-wrap items-center gap-2'>
            <Badge variant='outline' className='font-mono text-[11px]'>
              {entry.profile}
            </Badge>
            {stateBadge}
          </div>
          <div className='text-xs text-muted-foreground'>
            {entry.resolvedFromProfile === entry.profile
              ? 'Resolved from selected profile'
              : `Inherited from ${entry.resolvedFromProfile}`}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: 'group',
    header: 'Group',
    cell: ({ row }) => {
      const entry = row.original;

      return (
        <div className='space-y-1'>
          <Badge variant='outline' className='font-mono text-[11px]'>
            {entry.group}
          </Badge>
          <div className='text-xs text-muted-foreground'>Source: {entry.source}</div>
        </div>
      );
    },
  },
  {
    id: 'preview',
    header: 'Preview',
    cell: ({ row }) => {
      const entry = row.original;

      if (entry.preview.length === 0) {
        return <div className='text-xs text-muted-foreground'>No preview text available.</div>;
      }

      return (
        <div className='min-w-0 space-y-1'>
          {entry.preview.slice(0, 3).map((previewValue) => (
            <div
              key={previewValue}
              className='truncate rounded-md border border-border/60 bg-muted/20 px-2 py-1 font-mono text-[11px] text-muted-foreground'
            >
              {previewValue}
            </div>
          ))}
        </div>
      );
    },
  },
  {
    id: 'stats',
    header: 'Stats',
    cell: ({ row }) => {
      const entry = row.original;

      return (
        <div className='space-y-1 text-xs'>
          <div className='font-medium text-gray-100'>{entry.itemCount} values</div>
          <div className='text-muted-foreground'>{formatTimestamp(entry.updatedAt)}</div>
        </div>
      );
    },
  },
  {
    id: 'actions',
    header: () => <div className='text-right'>Actions</div>,
    cell: ({ row }) => {
      const entry = row.original;
      const resetKey = `${entry.profile}:${entry.key}`;

      return (
        <div className='flex items-center justify-end gap-2'>
          <Button type='button' size='xs' variant='outline' onClick={() => options.onEdit(entry)}>
            <PencilIcon className='mr-2 size-3.5' />
            Edit
          </Button>
          {entry.hasOverride ? (
            <Button
              type='button'
              size='xs'
              variant='outline'
              onClick={() => options.onReset(entry)}
              loading={options.resettingKey === resetKey}
              loadingText='Resetting'
            >
              {options.resettingKey !== resetKey ? <RotateCcw className='mr-2 size-3.5' /> : null}
              Reset
            </Button>
          ) : null}
        </div>
      );
    },
  },
];

export default function TraderaSelectorRegistryPage(): React.JSX.Element {
  const { toast } = useToast();
  const { confirm, ConfirmationModal } = useConfirm();
  const registryQuery = useTraderaSelectorRegistry();
  const syncMutation = useSyncTraderaSelectorRegistryMutation();
  const saveMutation = useSaveTraderaSelectorRegistryEntryMutation();
  const deleteMutation = useDeleteTraderaSelectorRegistryEntryMutation();
  const profileMutation = useMutateTraderaSelectorRegistryProfileMutation();
  const [query, setQuery] = useState('');
  const [selectedProfile, setSelectedProfile] = useState(DEFAULT_PROFILE);
  const [newProfile, setNewProfile] = useState('');
  const [editingEntry, setEditingEntry] = useState<SelectorRegistryTableEntry | null>(null);
  const [draftValueJson, setDraftValueJson] = useState('');
  const [renameProfileOpen, setRenameProfileOpen] = useState(false);
  const [renameTargetProfile, setRenameTargetProfile] = useState('');
  const [profileActionKey, setProfileActionKey] = useState<string | null>(null);
  const [syncTargetProfile, setSyncTargetProfile] = useState<string | null>(null);
  const [resettingKey, setResettingKey] = useState<string | null>(null);

  const rawEntries = registryQuery.data?.entries ?? [];
  const syncedAt = registryQuery.data?.syncedAt ?? null;
  const errorMessage =
    registryQuery.error instanceof Error ? registryQuery.error.message : null;

  const availableProfiles = useMemo(
    () =>
      Array.from(new Set([DEFAULT_PROFILE, ...rawEntries.map((entry) => entry.profile)])).sort(
        (left, right) => left.localeCompare(right)
      ),
    [rawEntries]
  );

  useEffect(() => {
    if (!availableProfiles.includes(selectedProfile)) {
      setSelectedProfile(DEFAULT_PROFILE);
    }
  }, [availableProfiles, selectedProfile]);

  useEffect(() => {
    if (editingEntry === null) {
      setDraftValueJson('');
      return;
    }

    setDraftValueJson(formatValueJsonForEditor(editingEntry.valueJson));
  }, [editingEntry]);

  const effectiveEntries = useMemo(
    () => buildEffectiveEntries(rawEntries, selectedProfile),
    [rawEntries, selectedProfile]
  );

  const filteredEntries = useMemo((): SelectorRegistryTableEntry[] => {
    const normalizedQuery = normalizeSearchValue(query);
    if (normalizedQuery.length === 0) {
      return effectiveEntries;
    }

    return effectiveEntries.filter((entry) => {
      const haystack = normalizeSearchValue(
        [
          entry.profile,
          entry.resolvedFromProfile,
          entry.key,
          entry.group,
          entry.kind,
          entry.valueType,
          entry.description ?? '',
          entry.preview.join(' '),
        ].join(' ')
      );

      return haystack.includes(normalizedQuery);
    });
  }, [effectiveEntries, query]);

  const totalItemCount = useMemo(
    () => effectiveEntries.reduce((sum, entry) => sum + entry.itemCount, 0),
    [effectiveEntries]
  );
  const profileSpecificEntryCount = useMemo(
    () => rawEntries.filter((entry) => entry.profile === selectedProfile).length,
    [rawEntries, selectedProfile]
  );
  const overrideCount = useMemo(
    () => effectiveEntries.filter((entry) => entry.hasOverride).length,
    [effectiveEntries]
  );
  const inheritedCount = effectiveEntries.length - overrideCount;
  const groupCount = useMemo(
    () => new Set(effectiveEntries.map((entry) => entry.group)).size,
    [effectiveEntries]
  );
  const hasQuery = query.trim().length > 0;
  let emptyStateDescription =
    'Sync the default profile from code to seed Mongo with the complete Tradera selector catalogue.';
  if (hasQuery) {
    emptyStateDescription = 'No registry entries matched the current search.';
  } else if (selectedProfile !== DEFAULT_PROFILE) {
    emptyStateDescription = `Seed "${selectedProfile}" from code or save an override to start storing profile-specific selector entries.`;
  }

  let editDialogDescription = 'Update a selector registry entry.';
  if (editingEntry !== null) {
    editDialogDescription =
      editingEntry.resolvedFromProfile === editingEntry.profile
        ? `Update the Mongo-backed entry for "${editingEntry.key}" in profile "${editingEntry.profile}".`
        : `Saving will create a "${editingEntry.profile}" override for "${editingEntry.key}" using the JSON below.`;
  }

  const performSync = async (profile: string): Promise<void> => {
    const trimmedProfile = profile.trim();
    const normalizedProfile =
      trimmedProfile.length > 0 ? trimmedProfile : DEFAULT_PROFILE;
    setSyncTargetProfile(normalizedProfile);

    try {
      const response = await syncMutation.mutateAsync({ profile: normalizedProfile });
      setSelectedProfile(normalizedProfile);
      toast(response.message, { variant: 'success' });
    } catch (error) {
      logClientCatch(error, {
        source: 'TraderaSelectorRegistryPage',
        action: 'syncRegistry',
        profile: normalizedProfile,
      });
      toast(
        error instanceof Error ? error.message : 'Failed to sync the selector registry.',
        { variant: 'error' }
      );
    } finally {
      setSyncTargetProfile(null);
    }
  };

  const handleSyncSelectedProfile = (): void => {
    performSync(selectedProfile).catch(() => undefined);
  };

  const handleCreateProfile = (): void => {
    const normalizedProfile = newProfile.trim();

    if (normalizedProfile.length === 0) {
      toast('Profile name is required.', { variant: 'error' });
      return;
    }

    performSync(normalizedProfile)
      .then(() => {
        setNewProfile('');
      })
      .catch(() => undefined);
  };

  const handleCloneProfile = (): void => {
    const targetProfile = newProfile.trim();

    if (targetProfile.length === 0) {
      toast('Target profile name is required.', { variant: 'error' });
      return;
    }

    const actionKey = `clone:${targetProfile}`;
    setProfileActionKey(actionKey);

    profileMutation
      .mutateAsync({
        action: 'clone_profile',
        sourceProfile: selectedProfile,
        targetProfile,
      })
      .then((response) => {
        setSelectedProfile(targetProfile);
        setNewProfile('');
        toast(response.message, { variant: 'success' });
      })
      .catch((error) => {
        logClientCatch(error, {
          source: 'TraderaSelectorRegistryPage',
          action: 'cloneProfile',
          profile: selectedProfile,
          targetProfile,
        });
        toast(error instanceof Error ? error.message : 'Failed to clone the selector profile.', {
          variant: 'error',
        });
      })
      .finally(() => {
        setProfileActionKey(null);
      });
  };

  const handleOpenRenameProfile = (): void => {
    setRenameTargetProfile(selectedProfile);
    setRenameProfileOpen(true);
  };

  const handleRenameProfile = (): void => {
    const targetProfile = renameTargetProfile.trim();

    if (targetProfile.length === 0) {
      toast('Target profile name is required.', { variant: 'error' });
      return;
    }

    const sourceProfile = selectedProfile;
    const actionKey = `rename:${sourceProfile}`;
    setProfileActionKey(actionKey);

    profileMutation
      .mutateAsync({
        action: 'rename_profile',
        profile: sourceProfile,
        targetProfile,
      })
      .then((response) => {
        setSelectedProfile(targetProfile);
        setRenameProfileOpen(false);
        toast(response.message, { variant: 'success' });
      })
      .catch((error) => {
        logClientCatch(error, {
          source: 'TraderaSelectorRegistryPage',
          action: 'renameProfile',
          profile: sourceProfile,
          targetProfile,
        });
        toast(error instanceof Error ? error.message : 'Failed to rename the selector profile.', {
          variant: 'error',
        });
      })
      .finally(() => {
        setProfileActionKey(null);
      });
  };

  const handleDeleteProfile = (): void => {
    const profile = selectedProfile;

    confirm({
      title: 'Delete selector profile?',
      message: `This will remove every Mongo-backed selector entry stored for "${profile}".`,
      confirmText: 'Delete',
      isDangerous: true,
      onConfirm: async () => {
        const actionKey = `delete:${profile}`;
        setProfileActionKey(actionKey);

        try {
          const response = await profileMutation.mutateAsync({
            action: 'delete_profile',
            profile,
          });
          setSelectedProfile(DEFAULT_PROFILE);
          toast(response.message, { variant: 'success' });
        } catch (error) {
          logClientCatch(error, {
            source: 'TraderaSelectorRegistryPage',
            action: 'deleteProfile',
            profile,
          });
          toast(
            error instanceof Error ? error.message : 'Failed to delete the selector profile.',
            { variant: 'error' }
          );
        } finally {
          setProfileActionKey(null);
        }
      },
    });
  };

  const handleSaveEntry = async (): Promise<void> => {
    if (editingEntry === null) {
      return;
    }

    try {
      const response = await saveMutation.mutateAsync({
        profile: editingEntry.profile,
        key: editingEntry.key,
        valueJson: draftValueJson,
      });
      toast(response.message, { variant: 'success' });
      setEditingEntry(null);
    } catch (error) {
      logClientCatch(error, {
        source: 'TraderaSelectorRegistryPage',
        action: 'saveEntry',
        key: editingEntry.key,
        profile: editingEntry.profile,
      });
      toast(error instanceof Error ? error.message : 'Failed to save the selector entry.', {
        variant: 'error',
      });
    }
  };

  const handleResetEntry = useCallback(
    async (entry: SelectorRegistryTableEntry): Promise<void> => {
      const resetKey = `${entry.profile}:${entry.key}`;
      setResettingKey(resetKey);

      try {
        const response = await deleteMutation.mutateAsync({
          profile: entry.profile,
          key: entry.key,
        });
        if (editingEntry?.key === entry.key && editingEntry.profile === entry.profile) {
          setEditingEntry(null);
        }
        toast(response.message, { variant: 'success' });
      } catch (error) {
        logClientCatch(error, {
          source: 'TraderaSelectorRegistryPage',
          action: 'deleteEntry',
          key: entry.key,
          profile: entry.profile,
        });
        toast(error instanceof Error ? error.message : 'Failed to reset the selector override.', {
          variant: 'error',
        });
      } finally {
        setResettingKey(null);
      }
    },
    [deleteMutation, editingEntry, toast]
  );

  const columns = useMemo(
    () =>
      buildColumns({
        onEdit: setEditingEntry,
        onReset: (entry) => {
          handleResetEntry(entry).catch(() => undefined);
        },
        resettingKey,
      }),
    [handleResetEntry, resettingKey]
  );

  return (
    <AdminIntegrationsPageLayout
      title='Tradera Selector Registry'
      current='Selector Registry'
      parent={{ label: 'Tradera', href: '/admin/integrations/tradera' }}
      description='Mongo-backed selector profiles for the Tradera listing and status-check flows, with profile-scoped overrides and code sync.'
      icon={<DatabaseIcon className='size-4' />}
      headerActions={
        <div className='flex flex-wrap items-center gap-2'>
          <Button asChild type='button' size='sm' variant='outline'>
            <Link href='/admin/playwright/step-sequencer'>
              <WorkflowIcon className='mr-2 size-4' />
              Step Sequencer
            </Link>
          </Button>
          {selectedProfile !== DEFAULT_PROFILE ? (
            <>
              <Button
                type='button'
                size='sm'
                variant='outline'
                onClick={handleOpenRenameProfile}
                loading={profileActionKey === `rename:${selectedProfile}`}
                loadingText='Renaming'
              >
                {profileActionKey !== `rename:${selectedProfile}` ? (
                  <PencilIcon className='mr-2 size-4' />
                ) : null}
                Rename Profile
              </Button>
              <Button
                type='button'
                size='sm'
                variant='outline'
                onClick={handleDeleteProfile}
                loading={profileActionKey === `delete:${selectedProfile}`}
                loadingText='Deleting'
              >
                {profileActionKey !== `delete:${selectedProfile}` ? (
                  <Trash2 className='mr-2 size-4' />
                ) : null}
                Delete Profile
              </Button>
            </>
          ) : null}
          <Button
            type='button'
            size='sm'
            variant='outline'
            onClick={handleSyncSelectedProfile}
            loading={syncTargetProfile === selectedProfile}
            loadingText='Syncing'
          >
            {syncTargetProfile !== selectedProfile ? <RefreshCw className='mr-2 size-4' /> : null}
            Sync Selected Profile
          </Button>
        </div>
      }
    >
      <StandardDataTablePanel
        title='Registry Entries'
        description={`Effective selector registry for profile "${selectedProfile}". Editing writes directly to Mongo for that profile.`}
        refresh={{
          onRefresh: () => {
            registryQuery.refetch().catch(() => undefined);
          },
          isRefreshing: registryQuery.isFetching,
        }}
        alerts={
          errorMessage !== null ? (
            <div className='rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200'>
              {errorMessage}
            </div>
          ) : (
            <div className='flex flex-wrap items-center gap-2 text-xs text-muted-foreground'>
              <Badge variant='outline'>{effectiveEntries.length} effective entries</Badge>
              <Badge variant='outline'>{availableProfiles.length} profiles</Badge>
              <Badge variant='outline'>{groupCount} groups</Badge>
              <Badge variant='outline'>{totalItemCount} values</Badge>
              <Badge variant='outline'>{profileSpecificEntryCount} stored for profile</Badge>
              {selectedProfile !== DEFAULT_PROFILE ? (
                <>
                  <Badge variant='outline'>{overrideCount} overrides</Badge>
                  <Badge variant='outline'>{inheritedCount} inherited</Badge>
                </>
              ) : null}
              <span>Last sync: {formatTimestamp(syncedAt)}</span>
            </div>
          )
        }
        filters={
          <div className='flex flex-col gap-3'>
            <div className='flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between'>
              <div className='w-full max-w-sm'>
                <SearchInput
                  placeholder='Search selectors, groups, values...'
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onClear={() => setQuery('')}
                  size='sm'
                />
              </div>
              <div className='flex flex-col gap-3 lg:flex-row lg:items-center'>
                <div className='w-full lg:w-[240px]'>
                  <Select value={selectedProfile} onValueChange={setSelectedProfile}>
                    <SelectTrigger>
                      <SelectValue placeholder='Select profile' />
                    </SelectTrigger>
                    <SelectContent>
                      {availableProfiles.map((profile) => (
                        <SelectItem key={profile} value={profile}>
                          {profile}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className='flex flex-col gap-2 sm:flex-row'>
                  <Input
                    value={newProfile}
                    onChange={(event) => setNewProfile(event.target.value)}
                    placeholder='target profile id'
                    className='w-full sm:w-[200px]'
                  />
                  <Button
                    type='button'
                    variant='outline'
                    onClick={handleCreateProfile}
                    loading={syncTargetProfile !== null && syncTargetProfile === newProfile.trim()}
                    loadingText='Seeding'
                  >
                    Seed Profile
                  </Button>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={handleCloneProfile}
                    loading={profileActionKey === `clone:${newProfile.trim()}`}
                    loadingText='Cloning'
                  >
                    {profileActionKey !== `clone:${newProfile.trim()}` ? (
                      <CopyIcon className='mr-2 size-4' />
                    ) : null}
                    Clone Selected
                  </Button>
                </div>
              </div>
            </div>
            <div className='text-xs text-muted-foreground'>
              Showing {filteredEntries.length} of {effectiveEntries.length} registry entries for "{selectedProfile}"
            </div>
          </div>
        }
        columns={columns}
        data={filteredEntries}
        isLoading={registryQuery.isLoading}
        emptyState={
          <EmptyState
            title='No selector registry entries'
            description={emptyStateDescription}
            action={
              !hasQuery ? (
                <Button
                  type='button'
                  variant='outline'
                  onClick={handleSyncSelectedProfile}
                  loading={syncTargetProfile === selectedProfile}
                  loadingText='Syncing'
                >
                  {syncTargetProfile !== selectedProfile ? <RefreshCw className='mr-2 size-4' /> : null}
                  Sync Profile
                </Button>
              ) : undefined
            }
          />
        }
      />

      <Dialog open={renameProfileOpen} onOpenChange={setRenameProfileOpen}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle>Rename Selector Profile</DialogTitle>
            <DialogDescription>
              Move every Mongo-backed selector entry from "{selectedProfile}" to a new profile id.
            </DialogDescription>
          </DialogHeader>

          <form
            className='space-y-4'
            onSubmit={(event) => {
              event.preventDefault();
              handleRenameProfile();
            }}
          >
            <div className='space-y-1.5'>
              <Label htmlFor='tradera-selector-profile-name'>Target Profile</Label>
              <Input
                id='tradera-selector-profile-name'
                value={renameTargetProfile}
                onChange={(event) => setRenameTargetProfile(event.target.value)}
                placeholder='profile id'
              />
            </div>
            <DialogFooter>
              <Button
                type='submit'
                loading={profileActionKey === `rename:${selectedProfile}`}
                loadingText='Renaming'
              >
                Rename Profile
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editingEntry !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditingEntry(null);
          }
        }}
      >
        <DialogContent className='max-w-3xl'>
          <DialogHeader>
            <DialogTitle>Edit Selector Entry</DialogTitle>
            <DialogDescription>{editDialogDescription}</DialogDescription>
          </DialogHeader>

          {editingEntry !== null ? (
            <form
              className='space-y-4'
              onSubmit={(event) => {
                event.preventDefault();
                handleSaveEntry().catch(() => undefined);
              }}
            >
              <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
                <div className='space-y-1'>
                  <Label>Key</Label>
                  <div className='rounded-md border border-border/60 bg-muted/20 px-3 py-2 font-mono text-xs text-muted-foreground'>
                    {editingEntry.key}
                  </div>
                </div>
                <div className='space-y-1'>
                  <Label>Profile</Label>
                  <div className='rounded-md border border-border/60 bg-muted/20 px-3 py-2 font-mono text-xs text-muted-foreground'>
                    {editingEntry.profile}
                  </div>
                </div>
                <div className='space-y-1'>
                  <Label>Group</Label>
                  <div className='rounded-md border border-border/60 bg-muted/20 px-3 py-2 font-mono text-xs text-muted-foreground'>
                    {editingEntry.group}
                  </div>
                </div>
                <div className='space-y-1'>
                  <Label>Value Type</Label>
                  <div className='rounded-md border border-border/60 bg-muted/20 px-3 py-2 font-mono text-xs text-muted-foreground'>
                    {editingEntry.valueType}
                  </div>
                </div>
              </div>

              <div className='space-y-1.5'>
                <Label htmlFor='tradera-selector-registry-value-json'>Registry JSON</Label>
                <Textarea
                  id='tradera-selector-registry-value-json'
                  value={draftValueJson}
                  onChange={(event) => setDraftValueJson(event.target.value)}
                  rows={18}
                  className='font-mono text-xs'
                />
              </div>

              <DialogFooter>
                {editingEntry.hasOverride ? (
                  <Button
                    type='button'
                    variant='outline'
                    onClick={() => {
                      handleResetEntry(editingEntry).catch(() => undefined);
                    }}
                    loading={resettingKey === `${editingEntry.profile}:${editingEntry.key}`}
                    loadingText='Resetting'
                  >
                    {resettingKey !== `${editingEntry.profile}:${editingEntry.key}` ? (
                      <RotateCcw className='mr-2 size-4' />
                    ) : null}
                    Reset Override
                  </Button>
                ) : null}
                <Button type='submit' loading={saveMutation.isPending} loadingText='Saving'>
                  Save Entry
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
      <ConfirmationModal />
    </AdminIntegrationsPageLayout>
  );
}
