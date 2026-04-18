/* eslint-disable complexity, jsx-a11y/control-has-associated-label, max-lines, max-lines-per-function */
'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  BotIcon,
  CopyIcon,
  DatabaseIcon,
  PencilIcon,
  RadarIcon,
  RefreshCw,
  RotateCcw,
  SparklesIcon,
  Trash2,
  WorkflowIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import {
  useClassifySelectorRoleMutation,
  useDeleteSelectorRegistryEntryMutation,
  useMutateSelectorRegistryProfileMutation,
  useProbeSelectorMutation,
  useSaveSelectorRegistryEntryMutation,
  useSelectorRegistry,
  useSyncSelectorRegistryMutation,
} from '@/features/integrations/hooks/useSelectorRegistry';
import type { SelectorRegistryProbeResponse } from '@/shared/contracts/integrations/selector-registry';
import { SelectorRegistryProbeSessionsSection } from '@/features/integrations/components/SelectorRegistryProbeSessionsSection';
import { useBrainModelOptions } from '@/shared/lib/ai-brain/hooks/useBrainModelOptions';
import {
  SELECTOR_REGISTRY_DEFAULT_PROFILES,
  SELECTOR_REGISTRY_NAMESPACES,
  formatSelectorRegistryNamespaceLabel,
  isSelectorRegistryNamespace,
} from '@/shared/lib/browser-execution/selector-registry-metadata';
import { formatSelectorRegistryRoleLabel } from '@/shared/lib/browser-execution/selector-registry-roles';
import type {
  SelectorRegistryEntry,
  SelectorRegistryNamespace,
} from '@/shared/contracts/integrations/selector-registry';
import { useConfirm } from '@/shared/hooks/ui/useConfirm';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';
import { AdminIntegrationsPageLayout } from '@/shared/ui/admin.public';
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
import { cn } from '@/shared/utils/ui-utils';

type Props = {
  initialNamespace?: SelectorRegistryNamespace;
};

const formatTimestamp = (value: string | null): string => {
  if (value === null || value.trim().length === 0) return 'Not synced yet';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
};

const formatValueJsonForEditor = (valueJson: string): string => {
  try {
    return JSON.stringify(JSON.parse(valueJson), null, 2);
  } catch {
    return valueJson;
  }
};

const normalizeSearchValue = (value: string): string =>
  value.toLowerCase().replace(/\s+/g, ' ').trim();

const getNamespaceDescription = (namespace: SelectorRegistryNamespace): string => {
  if (namespace === 'tradera') {
    return 'Tradera listing, relist, sync, and status-check selectors with profile inheritance.';
  }
  if (namespace === 'amazon') {
    return 'Amazon and Google Lens selectors, text hints, extraction patterns, and scan runtime signals.';
  }
  if (namespace === '1688') {
    return '1688 image-search selectors, access-barrier hints, and supplier-page extraction signals.';
  }
  return 'Vinted selector constants exposed as read-only code-seeded registry entries.';
};

const selectorRunHistoryHref = (namespace: SelectorRegistryNamespace, profile: string): string => {
  const params = new URLSearchParams({ selectorProfile: profile });
  if (namespace === '1688') params.set('runtimeKey', 'supplier_1688_probe_scan');
  if (namespace === 'amazon') params.set('runtimeKey', 'amazon_reverse_image_scan');
  return `/admin/playwright/step-sequencer/runs?${params.toString()}`;
};

const renderResolutionBadge = (
  entry: SelectorRegistryEntry,
  defaultProfile: string
): React.JSX.Element => {
  if (entry.profile === defaultProfile) {
    return <Badge variant='neutral'>default</Badge>;
  }
  if (entry.hasOverride === true) {
    return <Badge variant='info'>override</Badge>;
  }
  return <Badge variant='neutral'>inherited</Badge>;
};

const getEmptyEntriesMessage = (isLoading: boolean, query: string): string => {
  if (isLoading) return 'Loading selector registry...';
  if (query.trim().length > 0) return 'No registry entries matched the current search.';
  return 'No selector registry entries available.';
};

export default function SelectorRegistryPage({
  initialNamespace,
}: Props): React.JSX.Element {
  const searchParams = useSearchParams();
  const namespaceParam = searchParams.get('namespace');
  const initialSearchNamespace = isSelectorRegistryNamespace(namespaceParam)
    ? namespaceParam
    : null;
  const [namespace, setNamespace] = useState<SelectorRegistryNamespace>(
    initialNamespace ?? initialSearchNamespace ?? 'tradera'
  );
  const [selectedProfile, setSelectedProfile] = useState(
    SELECTOR_REGISTRY_DEFAULT_PROFILES[namespace]
  );
  const [query, setQuery] = useState('');
  const [newProfile, setNewProfile] = useState('');
  const [editingEntry, setEditingEntry] = useState<SelectorRegistryEntry | null>(null);
  const [draftValueJson, setDraftValueJson] = useState('');
  const [renameProfileOpen, setRenameProfileOpen] = useState(false);
  const [renameTargetProfile, setRenameTargetProfile] = useState('');
  const [profileActionKey, setProfileActionKey] = useState<string | null>(null);
  const [syncTargetProfile, setSyncTargetProfile] = useState<string | null>(null);
  const [resettingKey, setResettingKey] = useState<string | null>(null);
  const [classifyingKey, setClassifyingKey] = useState<string | null>(null);
  const [classifyAllProgress, setClassifyAllProgress] = useState<{ done: number; total: number } | null>(null);
  const [probingKey, setProbingKey] = useState<string | null>(null);
  const [probeResult, setProbeResult] = useState<SelectorRegistryProbeResponse | null>(null);
  const { toast } = useToast();
  const { confirm, ConfirmationModal } = useConfirm();

  const registryQuery = useSelectorRegistry({
    namespace,
    profile: selectedProfile,
    effective: true,
  });
  const syncMutation = useSyncSelectorRegistryMutation();
  const saveMutation = useSaveSelectorRegistryEntryMutation();
  const deleteMutation = useDeleteSelectorRegistryEntryMutation();
  const profileMutation = useMutateSelectorRegistryProfileMutation();
  const classifyMutation = useClassifySelectorRoleMutation();
  const probeMutation = useProbeSelectorMutation();
  const brainRoleClassifier = useBrainModelOptions({ capability: 'selector_registry.role_classification' });

  const defaultProfile =
    registryQuery.data?.defaultProfile ?? SELECTOR_REGISTRY_DEFAULT_PROFILES[namespace];
  const isReadOnly = namespace === 'vinted';
  const rawProfiles = registryQuery.data?.profiles ?? [];
  const availableProfiles = useMemo(
    () =>
      Array.from(new Set([defaultProfile, selectedProfile, ...rawProfiles]))
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right)),
    [defaultProfile, rawProfiles, selectedProfile]
  );
  const entries = registryQuery.data?.entries ?? [];
  const probeSessions = registryQuery.data?.probeSessions ?? [];
  const probeSessionClusters = registryQuery.data?.probeSessionClusters ?? [];
  const errorMessage = registryQuery.error instanceof Error ? registryQuery.error.message : null;

  const promotableEntries = useMemo(
    () =>
      entries.filter((entry) => entry.kind === 'selector' && entry.valueType === 'string'),
    [entries]
  );

  useEffect(() => {
    setSelectedProfile(SELECTOR_REGISTRY_DEFAULT_PROFILES[namespace]);
    setNewProfile('');
    setEditingEntry(null);
    setQuery('');
  }, [namespace]);

  useEffect(() => {
    if (!availableProfiles.includes(selectedProfile)) {
      setSelectedProfile(defaultProfile);
    }
  }, [availableProfiles, defaultProfile, selectedProfile]);

  useEffect(() => {
    if (editingEntry === null) {
      setDraftValueJson('');
      return;
    }
    setDraftValueJson(formatValueJsonForEditor(editingEntry.valueJson));
  }, [editingEntry]);

  const filteredEntries = useMemo(() => {
    const normalizedQuery = normalizeSearchValue(query);
    if (normalizedQuery.length === 0) return entries;
    return entries.filter((entry) => {
      const haystack = normalizeSearchValue(
        [
          entry.namespace,
          entry.profile,
          entry.resolvedFromProfile ?? '',
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
  }, [entries, query]);

  const totalItemCount = useMemo(
    () => entries.reduce((sum, entry) => sum + entry.itemCount, 0),
    [entries]
  );
  const overrideCount = useMemo(
    () => entries.filter((entry) => entry.hasOverride === true).length,
    [entries]
  );
  const inheritedCount = Math.max(0, entries.length - overrideCount);
  const groupCount = useMemo(() => new Set(entries.map((entry) => entry.group)).size, [entries]);
  const syncedAt = registryQuery.data?.syncedAt ?? null;

  const handleNamespaceChange = (value: string): void => {
    if (isSelectorRegistryNamespace(value)) setNamespace(value);
  };

  const performSync = async (profile: string): Promise<void> => {
    const trimmedProfile = profile.trim();
    const normalizedProfile = trimmedProfile.length > 0 ? trimmedProfile : defaultProfile;
    setSyncTargetProfile(normalizedProfile);
    try {
      const response = await syncMutation.mutateAsync({
        namespace,
        profile: normalizedProfile,
      });
      setSelectedProfile(normalizedProfile);
      toast(response.message, { variant: 'success' });
    } catch (error) {
      logClientCatch(error, {
        source: 'SelectorRegistryPage',
        action: 'syncRegistry',
        namespace,
        profile: normalizedProfile,
      });
      toast(error instanceof Error ? error.message : 'Failed to sync selector registry.', {
        variant: 'error',
      });
    } finally {
      setSyncTargetProfile(null);
    }
  };

  const handleCreateProfile = (): void => {
    const targetProfile = newProfile.trim();
    if (targetProfile.length === 0) {
      toast('Profile name is required.', { variant: 'error' });
      return;
    }
    performSync(targetProfile)
      .then(() => setNewProfile(''))
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
        namespace,
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
          source: 'SelectorRegistryPage',
          action: 'cloneProfile',
          namespace,
          profile: selectedProfile,
          targetProfile,
        });
        toast(error instanceof Error ? error.message : 'Failed to clone selector profile.', {
          variant: 'error',
        });
      })
      .finally(() => setProfileActionKey(null));
  };

  const handleRenameProfile = (): void => {
    const targetProfile = renameTargetProfile.trim();
    if (targetProfile.length === 0) {
      toast('Target profile name is required.', { variant: 'error' });
      return;
    }
    const actionKey = `rename:${selectedProfile}`;
    setProfileActionKey(actionKey);
    profileMutation
      .mutateAsync({
        action: 'rename_profile',
        namespace,
        profile: selectedProfile,
        targetProfile,
      })
      .then((response) => {
        setSelectedProfile(targetProfile);
        setRenameProfileOpen(false);
        toast(response.message, { variant: 'success' });
      })
      .catch((error) => {
        logClientCatch(error, {
          source: 'SelectorRegistryPage',
          action: 'renameProfile',
          namespace,
          profile: selectedProfile,
          targetProfile,
        });
        toast(error instanceof Error ? error.message : 'Failed to rename selector profile.', {
          variant: 'error',
        });
      })
      .finally(() => setProfileActionKey(null));
  };

  const handleDeleteProfile = (): void => {
    const profile = selectedProfile;
    confirm({
      title: 'Delete selector profile?',
      message: `This will remove every Mongo-backed selector entry stored for "${formatSelectorRegistryNamespaceLabel(namespace)} / ${profile}".`,
      confirmText: 'Delete',
      isDangerous: true,
      onConfirm: async () => {
        const actionKey = `delete:${profile}`;
        setProfileActionKey(actionKey);
        try {
          const response = await profileMutation.mutateAsync({
            action: 'delete_profile',
            namespace,
            profile,
          });
          setSelectedProfile(defaultProfile);
          toast(response.message, { variant: 'success' });
        } catch (error) {
          logClientCatch(error, {
            source: 'SelectorRegistryPage',
            action: 'deleteProfile',
            namespace,
            profile,
          });
          toast(error instanceof Error ? error.message : 'Failed to delete selector profile.', {
            variant: 'error',
          });
        } finally {
          setProfileActionKey(null);
        }
      },
    });
  };

  const handleSaveEntry = async (): Promise<void> => {
    if (editingEntry === null) return;
    try {
      const response = await saveMutation.mutateAsync({
        namespace: editingEntry.namespace,
        profile: editingEntry.profile,
        key: editingEntry.key,
        valueJson: draftValueJson,
      });
      toast(response.message, { variant: 'success' });
      setEditingEntry(null);
    } catch (error) {
      logClientCatch(error, {
        source: 'SelectorRegistryPage',
        action: 'saveEntry',
        namespace: editingEntry.namespace,
        key: editingEntry.key,
        profile: editingEntry.profile,
      });
      toast(error instanceof Error ? error.message : 'Failed to save selector entry.', {
        variant: 'error',
      });
    }
  };

  const handleResetEntry = async (entry: SelectorRegistryEntry): Promise<void> => {
    const resetKey = `${entry.namespace}:${entry.profile}:${entry.key}`;
    setResettingKey(resetKey);
    try {
      const response = await deleteMutation.mutateAsync({
        namespace: entry.namespace,
        profile: entry.profile,
        key: entry.key,
      });
      if (editingEntry?.key === entry.key && editingEntry.profile === entry.profile) {
        setEditingEntry(null);
      }
      toast(response.message, { variant: 'success' });
    } catch (error) {
      logClientCatch(error, {
        source: 'SelectorRegistryPage',
        action: 'resetEntry',
        namespace: entry.namespace,
        key: entry.key,
        profile: entry.profile,
      });
      toast(error instanceof Error ? error.message : 'Failed to reset selector override.', {
        variant: 'error',
      });
    } finally {
      setResettingKey(null);
    }
  };

  const handleClassifyRole = async (entry: SelectorRegistryEntry): Promise<void> => {
    const key = `${entry.namespace}:${entry.profile}:${entry.key}`;
    setClassifyingKey(key);
    try {
      const response = await classifyMutation.mutateAsync({
        namespace: entry.namespace,
        profile: entry.profile,
        key: entry.key,
      });
      toast(response.message, { variant: 'success' });
    } catch (error) {
      logClientCatch(error, {
        source: 'SelectorRegistryPage',
        action: 'classifyRole',
        namespace: entry.namespace,
        key: entry.key,
        profile: entry.profile,
      });
      toast(error instanceof Error ? error.message : 'Failed to classify selector role.', {
        variant: 'error',
      });
    } finally {
      setClassifyingKey(null);
    }
  };

  const handleClassifyAll = async (): Promise<void> => {
    const targets = filteredEntries.filter((e) => e.namespace !== 'vinted');
    if (targets.length === 0) return;
    setClassifyAllProgress({ done: 0, total: targets.length });
    let done = 0;
    for (const entry of targets) {
      try {
        await classifyMutation.mutateAsync({
          namespace: entry.namespace,
          profile: entry.profile,
          key: entry.key,
        });
      } catch {
        // continue on individual failures
      }
      done += 1;
      setClassifyAllProgress({ done, total: targets.length });
    }
    setClassifyAllProgress(null);
    toast(`Classified ${done} of ${targets.length} selectors.`, { variant: 'success' });
  };

  const handleProbeEntry = async (entry: SelectorRegistryEntry): Promise<void> => {
    const key = `${entry.namespace}:${entry.profile}:${entry.key}`;
    setProbingKey(key);
    try {
      const response = await probeMutation.mutateAsync({
        namespace: entry.namespace,
        profile: entry.profile,
        key: entry.key,
      });
      setProbeResult(response);
      toast(response.message, { variant: 'success' });
    } catch (error) {
      logClientCatch(error, {
        source: 'SelectorRegistryPage',
        action: 'probeEntry',
        namespace: entry.namespace,
        key: entry.key,
        profile: entry.profile,
      });
      toast(error instanceof Error ? error.message : 'Probe failed.', { variant: 'error' });
    } finally {
      setProbingKey(null);
    }
  };

  const pageTitle =
    initialNamespace === undefined
      ? 'Super Selector Registry'
      : `${formatSelectorRegistryNamespaceLabel(namespace)} Selector Registry`;

  return (
    <AdminIntegrationsPageLayout
      title={pageTitle}
      current='Selector Registry'
      parent={{ label: 'Integrations', href: '/admin/integrations' }}
      description='One namespace-aware selector registry for marketplace automation profiles, overrides, code seeds, and Step Sequencer bindings.'
      icon={<DatabaseIcon className='size-4' />}
      headerActions={
        <div className='flex flex-wrap items-center gap-2'>
          <Button asChild type='button' size='sm' variant='outline'>
            <Link href='/admin/playwright/step-sequencer'>
              <WorkflowIcon className='mr-2 size-4' />
              Step Sequencer
            </Link>
          </Button>
          <Button asChild type='button' size='sm' variant='outline'>
            <Link href={selectorRunHistoryHref(namespace, selectedProfile)}>Run History</Link>
          </Button>
          {selectedProfile !== defaultProfile && !isReadOnly ? (
            <>
              <Button
                type='button'
                size='sm'
                variant='outline'
                onClick={() => {
                  setRenameTargetProfile(selectedProfile);
                  setRenameProfileOpen(true);
                }}
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
            disabled={isReadOnly || !brainRoleClassifier.effectiveModelId || classifyAllProgress !== null}
            title={
              !brainRoleClassifier.effectiveModelId
                ? 'Configure a model for Selector Registry Role Classification in AI Brain settings'
                : classifyAllProgress !== null
                  ? `Classifying ${classifyAllProgress.done}/${classifyAllProgress.total}…`
                  : `Classify all ${filteredEntries.filter((e) => e.namespace !== 'vinted').length} visible selectors`
            }
            onClick={() => {
              handleClassifyAll().catch(() => undefined);
            }}
            loading={classifyAllProgress !== null}
            loadingText={
              classifyAllProgress !== null
                ? `${classifyAllProgress.done}/${classifyAllProgress.total}`
                : 'Classifying'
            }
          >
            {classifyAllProgress === null ? <SparklesIcon className='mr-2 size-4' /> : null}
            Classify All
          </Button>
          <Button
            type='button'
            size='sm'
            variant='outline'
            disabled={isReadOnly}
            onClick={() => {
              performSync(selectedProfile).catch(() => undefined);
            }}
            loading={syncTargetProfile === selectedProfile}
            loadingText='Syncing'
          >
            {syncTargetProfile !== selectedProfile ? <RefreshCw className='mr-2 size-4' /> : null}
            Sync Profile
          </Button>
        </div>
      }
    >
      <div className='space-y-4'>
        <section className='rounded-lg border border-border bg-card/40 p-4'>
          <div className='flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between'>
            <div className='space-y-2'>
              <div className='flex flex-wrap items-center gap-2'>
                <Badge variant='outline'>{formatSelectorRegistryNamespaceLabel(namespace)}</Badge>
                <Badge variant='outline'>Profile: {selectedProfile}</Badge>
                <Badge variant='outline'>Default: {defaultProfile}</Badge>
                <Badge variant='outline'>{entries.length} effective entries</Badge>
                <Badge variant='outline'>{availableProfiles.length} profiles</Badge>
                <Badge variant='outline'>{groupCount} groups</Badge>
                <Badge variant='outline'>{totalItemCount} values</Badge>
                {selectedProfile !== defaultProfile ? (
                  <>
                    <Badge variant='outline'>{overrideCount} overrides</Badge>
                    <Badge variant='outline'>{inheritedCount} inherited</Badge>
                  </>
                ) : null}
                {isReadOnly ? <Badge variant='neutral'>read-only</Badge> : null}
              </div>
              <p className='max-w-3xl text-sm text-muted-foreground'>
                {getNamespaceDescription(namespace)}
              </p>
              <div className='flex flex-wrap items-center gap-2 text-xs text-muted-foreground'>
                <span>Last sync: {formatTimestamp(syncedAt)}</span>
                <span>·</span>
                <span className='flex items-center gap-1'>
                  <BotIcon className='size-3' />
                  Role AI:
                  {brainRoleClassifier.effectiveModelId ? (
                    <Badge variant='outline' className='font-mono text-[11px]'>
                      {brainRoleClassifier.effectiveModelId}
                    </Badge>
                  ) : (
                    <Badge variant='neutral' className='text-[11px]'>
                      not configured
                    </Badge>
                  )}
                </span>
              </div>
            </div>
            <div className='flex flex-col gap-2 sm:flex-row'>
              {initialNamespace === undefined ? (
                <Select value={namespace} onValueChange={handleNamespaceChange}>
                  <SelectTrigger className='w-full sm:w-[180px]'>
                    <SelectValue placeholder='Namespace' />
                  </SelectTrigger>
                  <SelectContent>
                    {SELECTOR_REGISTRY_NAMESPACES.map((entryNamespace) => (
                      <SelectItem key={entryNamespace} value={entryNamespace}>
                        {formatSelectorRegistryNamespaceLabel(entryNamespace)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
              <Select value={selectedProfile} onValueChange={setSelectedProfile}>
                <SelectTrigger className='w-full sm:w-[220px]'>
                  <SelectValue placeholder='Profile' />
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
          </div>

          {errorMessage !== null ? (
            <div className='mt-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200'>
              {errorMessage}
            </div>
          ) : null}

          <div className='mt-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between'>
            <div className='w-full max-w-md'>
              <SearchInput
                placeholder='Search namespace, selectors, groups, values...'
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onClear={() => setQuery('')}
                size='sm'
              />
            </div>
            <div className='flex flex-col gap-2 sm:flex-row'>
              <Input
                value={newProfile}
                onChange={(event) => setNewProfile(event.target.value)}
                placeholder='target profile id'
                className='w-full sm:w-[200px]'
                disabled={isReadOnly}
              />
              <Button
                type='button'
                variant='outline'
                onClick={handleCreateProfile}
                disabled={isReadOnly}
                loading={syncTargetProfile !== null && syncTargetProfile === newProfile.trim()}
                loadingText='Seeding'
              >
                Seed Profile
              </Button>
              <Button
                type='button'
                variant='outline'
                onClick={handleCloneProfile}
                disabled={isReadOnly}
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
        </section>

        <SelectorRegistryProbeSessionsSection
          namespace={namespace}
          profile={selectedProfile}
          sessions={probeSessions}
          clusters={probeSessionClusters}
          promotableEntries={promotableEntries}
          isReadOnly={isReadOnly}
        />

        <section className='overflow-hidden rounded-lg border border-border'>
          <div className='overflow-auto'>
            <table className='min-w-full divide-y divide-border text-sm'>
              <thead className='bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground'>
                <tr>
                  <th className='px-4 py-3 text-left font-semibold'>Selector</th>
                  <th className='px-4 py-3 text-left font-semibold'>Resolution</th>
                  <th className='px-4 py-3 text-left font-semibold'>Preview</th>
                  <th className='px-4 py-3 text-left font-semibold'>Stats</th>
                  <th className='px-4 py-3 text-right font-semibold'>Actions</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-border bg-background/60'>
                {filteredEntries.map((entry) => {
                  const resetKey = `${entry.namespace}:${entry.profile}:${entry.key}`;
                  return (
                    <tr key={`${entry.namespace}:${entry.profile}:${entry.key}`}>
                      <td className='max-w-[360px] px-4 py-3 align-top'>
                        <div className='space-y-1'>
                          <div className='flex flex-wrap items-center gap-2'>
                            <span className='font-mono text-xs font-medium'>{entry.key}</span>
                            <Badge variant='info' className='capitalize'>
                              {entry.kind}
                            </Badge>
                            <Badge variant='neutral'>{entry.valueType.replace(/_/g, ' ')}</Badge>
                          </div>
                          <div className='flex flex-wrap items-center gap-1.5'>
                            <Badge
                              variant={entry.role === 'generic' ? 'neutral' : 'success'}
                              className='text-[11px]'
                            >
                              {formatSelectorRegistryRoleLabel(entry.role) ?? entry.role}
                            </Badge>
                          </div>
                          <p className='text-xs text-muted-foreground'>
                            {entry.description ?? 'No registry description.'}
                          </p>
                          <Badge variant='outline' className='font-mono text-[11px]'>
                            {entry.group}
                          </Badge>
                        </div>
                      </td>
                      <td className='px-4 py-3 align-top'>
                        <div className='space-y-2'>
                          <div className='flex flex-wrap items-center gap-2'>
                            <Badge variant='outline'>
                              {formatSelectorRegistryNamespaceLabel(entry.namespace)}
                            </Badge>
                            <Badge variant='outline' className='font-mono text-[11px]'>
                              {entry.profile}
                            </Badge>
                            {renderResolutionBadge(entry, defaultProfile)}
                          </div>
                          <p className='text-xs text-muted-foreground'>
                            Source: {entry.source}
                            {entry.resolvedFromProfile !== undefined &&
                            entry.resolvedFromProfile !== null
                              ? ` · resolved from ${entry.resolvedFromProfile}`
                              : ''}
                          </p>
                        </div>
                      </td>
                      <td className='max-w-[360px] px-4 py-3 align-top'>
                        {entry.preview.length > 0 ? (
                          <div className='space-y-1'>
                            {entry.preview.slice(0, 3).map((previewValue, index) => (
                              <div
                                key={`${previewValue}:${index}`}
                                className='truncate rounded-md border border-border/60 bg-muted/20 px-2 py-1 font-mono text-[11px] text-muted-foreground'
                              >
                                {previewValue}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className='text-xs text-muted-foreground'>No preview.</span>
                        )}
                      </td>
                      <td className='px-4 py-3 align-top text-xs'>
                        <div className='space-y-1'>
                          <div className='font-medium'>{entry.itemCount} values</div>
                          <div className='text-muted-foreground'>{formatTimestamp(entry.updatedAt)}</div>
                        </div>
                      </td>
                      <td className='px-4 py-3 align-top'>
                        <div className='flex flex-wrap items-center justify-end gap-2'>
                          <Button
                            type='button'
                            size='xs'
                            variant='outline'
                            disabled={isReadOnly || !brainRoleClassifier.effectiveModelId}
                            title={
                              !brainRoleClassifier.effectiveModelId
                                ? 'Configure a model for Selector Registry Role Classification in AI Brain settings'
                                : `Classify role using ${brainRoleClassifier.effectiveModelId}`
                            }
                            onClick={() => {
                              handleClassifyRole(entry).catch(() => undefined);
                            }}
                            loading={classifyingKey === resetKey}
                            loadingText='Classifying'
                          >
                            {classifyingKey !== resetKey ? (
                              <SparklesIcon className='mr-2 size-3.5' />
                            ) : null}
                            Classify
                          </Button>
                          <Button
                            type='button'
                            size='xs'
                            variant='outline'
                            title={`Probe "${entry.key}" on the live ${entry.namespace} website`}
                            onClick={() => {
                              handleProbeEntry(entry).catch(() => undefined);
                            }}
                            loading={probingKey === resetKey}
                            loadingText='Probing'
                          >
                            {probingKey !== resetKey ? (
                              <RadarIcon className='mr-2 size-3.5' />
                            ) : null}
                            Probe
                          </Button>
                          <Button
                            type='button'
                            size='xs'
                            variant='outline'
                            disabled={isReadOnly}
                            onClick={() => setEditingEntry(entry)}
                          >
                            <PencilIcon className='mr-2 size-3.5' />
                            Edit
                          </Button>
                          {entry.hasOverride === true ? (
                            <Button
                              type='button'
                              size='xs'
                              variant='outline'
                              onClick={() => {
                                handleResetEntry(entry).catch(() => undefined);
                              }}
                              loading={resettingKey === resetKey}
                              loadingText='Resetting'
                            >
                              {resettingKey !== resetKey ? (
                                <RotateCcw className='mr-2 size-3.5' />
                              ) : null}
                              Reset
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className='px-4 py-12 text-center text-sm text-muted-foreground'>
                      {getEmptyEntriesMessage(registryQuery.isLoading, query)}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>

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
              <Label htmlFor='selector-profile-name'>Target Profile</Label>
              <Input
                id='selector-profile-name'
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
          if (!open) setEditingEntry(null);
        }}
      >
        <DialogContent className='max-w-3xl'>
          <DialogHeader>
            <DialogTitle>Edit Selector Entry</DialogTitle>
            <DialogDescription>
              {editingEntry?.hasOverride === true
                ? `Update the Mongo-backed override for "${editingEntry.key}".`
                : `Saving will create a "${editingEntry?.profile ?? selectedProfile}" override for this effective entry.`}
            </DialogDescription>
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
                {[
                  ['Namespace', formatSelectorRegistryNamespaceLabel(editingEntry.namespace)],
                  ['Profile', editingEntry.profile],
                  ['Key', editingEntry.key],
                  ['Value Type', editingEntry.valueType],
                ].map(([label, value]) => (
                  <div key={label} className='space-y-1'>
                    <Label>{label}</Label>
                    <div
                      className={cn(
                        'rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground',
                        label === 'Key' || label === 'Profile' ? 'font-mono' : ''
                      )}
                    >
                      {value}
                    </div>
                  </div>
                ))}
              </div>
              <div className='space-y-1.5'>
                <Label htmlFor='selector-registry-value-json'>Registry JSON</Label>
                <Textarea
                  id='selector-registry-value-json'
                  value={draftValueJson}
                  onChange={(event) => setDraftValueJson(event.target.value)}
                  rows={18}
                  className='font-mono text-xs'
                />
              </div>
              <DialogFooter>
                {editingEntry.hasOverride === true ? (
                  <Button
                    type='button'
                    variant='outline'
                    onClick={() => {
                      handleResetEntry(editingEntry).catch(() => undefined);
                    }}
                    loading={
                      resettingKey === `${editingEntry.namespace}:${editingEntry.profile}:${editingEntry.key}`
                    }
                    loadingText='Resetting'
                  >
                    {resettingKey !== `${editingEntry.namespace}:${editingEntry.profile}:${editingEntry.key}` ? (
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
      <Dialog
        open={probeResult !== null}
        onOpenChange={(open) => {
          if (!open) setProbeResult(null);
        }}
      >
        <DialogContent className='max-w-3xl'>
          <DialogHeader>
            <DialogTitle>Probe Result — {probeResult?.key}</DialogTitle>
            <DialogDescription>
              Playwright probed{' '}
              <span className='font-mono text-xs'>{probeResult?.probeUrl}</span> at{' '}
              {probeResult?.probedAt ? formatTimestamp(probeResult.probedAt) : ''}
            </DialogDescription>
          </DialogHeader>
          {probeResult !== null ? (
            <div className='space-y-4'>
              <div className='flex flex-wrap items-center gap-2'>
                <Badge variant={probeResult.matchCount > 0 ? 'success' : 'neutral'}>
                  {probeResult.matchCount} match{probeResult.matchCount !== 1 ? 'es' : ''}
                </Badge>
                {probeResult.matchedSelector !== null ? (
                  <Badge variant='outline' className='max-w-xs truncate font-mono text-[11px]'>
                    {probeResult.matchedSelector}
                  </Badge>
                ) : null}
              </div>
              {probeResult.screenshotBase64 !== null ? (
                <div className='overflow-hidden rounded-md border border-border'>
                  <img
                    src={`data:image/png;base64,${probeResult.screenshotBase64}`}
                    alt='Probe screenshot'
                    className='max-h-[420px] w-full object-contain'
                  />
                </div>
              ) : (
                <div className='rounded-md border border-border bg-muted/20 px-3 py-6 text-center text-xs text-muted-foreground'>
                  No screenshot captured.
                </div>
              )}
              {probeResult.domSnippet !== null ? (
                <div className='space-y-1.5'>
                  <p className='text-xs font-medium text-muted-foreground'>DOM snippet (first match)</p>
                  <pre className='max-h-[180px] overflow-auto rounded-md border border-border bg-muted/20 p-3 font-mono text-[11px] text-muted-foreground'>
                    {probeResult.domSnippet}
                  </pre>
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
      <ConfirmationModal />
    </AdminIntegrationsPageLayout>
  );
}
