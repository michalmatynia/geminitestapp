'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import {
  useClassifyProbeSuggestionsMutation,
  useMutateSelectorRegistryProfileMutation,
  useSaveSelectorRegistryProbeSessionMutation,
  useSaveSelectorRegistryEntryMutation,
  useSelectorRegistry,
  useSyncSelectorRegistryMutation,
} from '@/features/integrations/hooks/useSelectorRegistry';
import { useBrainModelOptions } from '@/shared/lib/ai-brain/hooks/useBrainModelOptions';
import type {
  SelectorRegistryClassifySuggestionItem,
  SelectorRegistryNamespace,
  SelectorRegistryRole,
} from '@/shared/contracts/integrations/selector-registry';
import type { LiveScripterResult } from '@/features/playwright/hooks/playwrightLiveScripter.result';
import {
  applySelectorRegistryProbeCarryForwardDefaults,
  applySelectorRegistryProbeCarryForwardManualSelection,
  buildSelectorRegistryProbeCarryForwardDefaultKeysByRole,
  buildSelectorRegistryProbeEntriesByRole,
  buildSelectorRegistryProbeCarryForwardInheritedCounts,
  buildSelectorRegistryProbeCarryForwardItems,
  buildSelectorRegistryProbeCarryForwardSources,
  buildSelectorRegistryProbeCarryForwardSummaries,
  isSelectorRegistryProbeCarryForwardInherited,
} from '@/shared/lib/browser-execution/selector-registry-probe-carry-forward';
import { buildSelectorRegistryProbeSessionClusters } from '@/shared/lib/browser-execution/selector-registry-probe-session-clustering';
import { SelectorRegistryProbeSuggestionBadges } from '@/shared/lib/browser-execution/selector-registry-probe-suggestion-badges';
import {
  getSelectorRegistryProbeSuggestionEvidenceText,
  getSelectorRegistryProbeSuggestionTextPreview,
} from '@/shared/lib/browser-execution/selector-registry-probe-suggestion-formatting';
import { SelectorRegistryProbeSuggestionCandidateDetails } from '@/shared/lib/browser-execution/selector-registry-probe-suggestion-candidates';
import {
  buildSelectorRegistryProbeTemplateFingerprint,
  formatSelectorRegistryProbeTemplateLabel,
} from '@/shared/lib/browser-execution/selector-registry-probe-template';
import {
  buildCustomSelectorRegistryProfileSuggestion,
  formatSelectorRegistryNamespaceLabel,
  getSelectorRegistryAdminHref,
  SELECTOR_REGISTRY_DEFAULT_PROFILES,
  SELECTOR_REGISTRY_NAMESPACES,
} from '@/shared/lib/browser-execution/selector-registry-metadata';
import {
  Badge,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useToast,
} from '@/shared/ui/primitives.public';
import { SparklesIcon } from 'lucide-react';

type Props = {
  liveScripter: LiveScripterResult;
};

type ProbeSuggestion = NonNullable<LiveScripterResult['probeResult']>['suggestions'][number];

type SavedProbeSessionHint = {
  href: string;
  sourceTitle: string;
  scannedPages: number;
  templateLabel: string;
};

const MAX_NODES_OPTIONS = [24, 48, 72, 96] as const;
const LINK_DEPTH_OPTIONS = [0, 1] as const;
const MAX_PAGES_OPTIONS = [1, 2, 4] as const;
const EMPTY_PROBE_SUGGESTIONS: ProbeSuggestion[] = [];

const inferNamespaceFromUrl = (url: string): SelectorRegistryNamespace => {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname.includes('amazon.')) return 'amazon';
    if (hostname.includes('1688.') || hostname.includes('alibaba.')) return '1688';
    if (hostname.includes('vinted.')) return 'vinted';
  } catch {
    return 'custom';
  }
  return 'custom';
};

const getSuggestedRegistryProfile = (
  namespace: SelectorRegistryNamespace,
  url: string
): string =>
  namespace === 'custom'
    ? buildCustomSelectorRegistryProfileSuggestion(url)
    : SELECTOR_REGISTRY_DEFAULT_PROFILES[namespace];
const formatCount = (count: number, singular: string, plural: string): string =>
  `${count} ${count === 1 ? singular : plural}`;

const areStringRecordsEqual = (
  left: Record<string, string>,
  right: Record<string, string>
): boolean => {
  const leftKeys = Object.keys(left);
  if (leftKeys.length !== Object.keys(right).length) {
    return false;
  }
  return leftKeys.every((key) => left[key] === right[key]);
};

const readPromotableSelectorValue = (
  suggestion: ProbeSuggestion
): string | null => suggestion.candidates.css ?? suggestion.candidates.xpath ?? null;

export function LiveScripterProbePanel({
  liveScripter,
}: Props): React.JSX.Element {
  const { toast } = useToast();
  const inferredNamespace = useMemo(
    () => inferNamespaceFromUrl(liveScripter.currentUrl),
    [liveScripter.currentUrl]
  );
  const inferredRegistryProfile = useMemo(
    () => getSuggestedRegistryProfile(inferredNamespace, liveScripter.currentUrl),
    [inferredNamespace, liveScripter.currentUrl]
  );
  const [registryNamespace, setRegistryNamespace] =
    useState<SelectorRegistryNamespace>(inferredNamespace);
  const [registryProfile, setRegistryProfile] = useState(inferredRegistryProfile);
  const [probeScope, setProbeScope] = useState<'main_content' | 'whole_page'>('main_content');
  const [probeMaxNodes, setProbeMaxNodes] = useState<number>(48);
  const [probeLinkDepth, setProbeLinkDepth] = useState<number>(0);
  const [probeMaxPages, setProbeMaxPages] = useState<number>(1);
  const [selectedKeys, setSelectedKeys] = useState<Record<string, string>>({});
  const [manuallySelectedKeys, setManuallySelectedKeys] = useState<Record<string, boolean>>({});
  const [aiClassifiedRoles, setAiClassifiedRoles] = useState<Record<string, SelectorRegistryRole>>({});
  const [classifyingAll, setClassifyingAll] = useState(false);
  const [savedProbeSessionHint, setSavedProbeSessionHint] = useState<SavedProbeSessionHint | null>(null);
  const [newRegistryProfile, setNewRegistryProfile] = useState('');
  const [syncTargetProfile, setSyncTargetProfile] = useState<string | null>(null);
  const [profileActionKey, setProfileActionKey] = useState<string | null>(null);

  const registryQuery = useSelectorRegistry({
    namespace: registryNamespace,
    profile: registryProfile,
    effective: true,
    includeArchived: true,
  });
  const syncMutation = useSyncSelectorRegistryMutation();
  const profileMutation = useMutateSelectorRegistryProfileMutation();
  const saveMutation = useSaveSelectorRegistryEntryMutation();
  const saveProbeSessionMutation = useSaveSelectorRegistryProbeSessionMutation();
  const classifySuggestionsMutation = useClassifyProbeSuggestionsMutation();
  const brainRoleClassifier = useBrainModelOptions({ capability: 'selector_registry.role_classification' });

  const handleClassifyAllSuggestions = async (): Promise<void> => {
    if (suggestions.length === 0 || !brainRoleClassifier.effectiveModelId) return;
    const items: SelectorRegistryClassifySuggestionItem[] = suggestions.map((s) => ({
      suggestionId: s.suggestionId,
      tag: s.tag,
      id: s.id,
      classes: s.classes,
      textPreview: s.textPreview,
      role: s.role,
      attrs: s.attrs,
      candidates: s.candidates,
      pageUrl: s.pageUrl,
    }));
    setClassifyingAll(true);
    try {
      const response = await classifySuggestionsMutation.mutateAsync({
        namespace: registryNamespace,
        suggestions: items,
      });
      const next: Record<string, SelectorRegistryRole> = {};
      for (const result of response.results) {
        next[result.suggestionId] = result.classificationRole;
      }
      setAiClassifiedRoles((current) => ({ ...current, ...next }));
      toast(`AI classified ${response.classifiedCount} suggestion(s) using ${response.modelId}.`, {
        variant: 'success',
      });
    } catch (error) {
      toast(
        error instanceof Error ? error.message : 'AI classification failed.',
        { variant: 'error' }
      );
    } finally {
      setClassifyingAll(false);
    }
  };

  useEffect(() => {
    setRegistryNamespace((current) => (current === inferredNamespace ? current : inferredNamespace));
    setRegistryProfile((current) => {
      const defaultProfile = inferredRegistryProfile;
      return current.trim().length === 0 ? defaultProfile : current;
    });
  }, [inferredNamespace, inferredRegistryProfile]);

  useEffect(() => {
    setRegistryProfile(getSuggestedRegistryProfile(registryNamespace, liveScripter.currentUrl));
    setNewRegistryProfile('');
  }, [liveScripter.currentUrl, registryNamespace]);

  const promotableEntries = useMemo(
    () =>
      (registryQuery.data?.entries ?? []).filter(
        (entry) => entry.kind === 'selector' && entry.valueType === 'string'
      ),
    [registryQuery.data?.entries]
  );
  const probeSessions = registryQuery.data?.probeSessions ?? [];
  const savedProbeUrl =
    registryNamespace === 'custom' ? registryQuery.data?.profileMetadata?.probeUrl ?? null : null;
  const savedProbePathHint =
    registryNamespace === 'custom'
      ? registryQuery.data?.profileMetadata?.probePathHint ?? null
      : null;
  const activeProbeSessions = useMemo(
    () => probeSessions.filter((session) => session.archivedAt === null),
    [probeSessions]
  );
  const archivedProbeSessions = useMemo(
    () => probeSessions.filter((session) => session.archivedAt !== null),
    [probeSessions]
  );
  const activeProbeTemplateCount = useMemo(
    () => buildSelectorRegistryProbeSessionClusters(activeProbeSessions).length,
    [activeProbeSessions]
  );
  const archivedProbeTemplateCount = useMemo(
    () => buildSelectorRegistryProbeSessionClusters(archivedProbeSessions).length,
    [archivedProbeSessions]
  );
  const effectiveRegistryProfile =
    registryProfile.trim().length > 0
      ? registryProfile.trim()
      : getSuggestedRegistryProfile(registryNamespace, liveScripter.currentUrl);
  const availableProfiles = useMemo(
    () =>
      Array.from(
        new Set([
          getSuggestedRegistryProfile(registryNamespace, liveScripter.currentUrl),
          effectiveRegistryProfile,
          ...(registryQuery.data?.profiles ?? []),
        ])
      )
        .filter((value) => value.trim().length > 0)
        .sort((left, right) => left.localeCompare(right)),
    [
      effectiveRegistryProfile,
      liveScripter.currentUrl,
      registryNamespace,
      registryQuery.data?.profiles,
    ]
  );
  const promotableEntriesByRole = useMemo(
    () => buildSelectorRegistryProbeEntriesByRole(promotableEntries),
    [promotableEntries]
  );
  const defaultKeysByRole = useMemo(
    () => buildSelectorRegistryProbeCarryForwardDefaultKeysByRole(promotableEntries),
    [promotableEntries]
  );

  const suggestions = liveScripter.probeResult?.suggestions ?? EMPTY_PROBE_SUGGESTIONS;
  const suggestionIdSet = useMemo(
    () => new Set(suggestions.map((suggestion) => suggestion.suggestionId)),
    [suggestions]
  );
  const currentProbeTemplateLabel = useMemo(() => {
    if (liveScripter.probeResult === null) {
      return null;
    }
    return formatSelectorRegistryProbeTemplateLabel(
      buildSelectorRegistryProbeTemplateFingerprint({
        sourceUrl: liveScripter.probeResult.url,
        suggestions: liveScripter.probeResult.suggestions,
      })
    );
  }, [liveScripter.probeResult]);

  const carryForwardItems = useMemo(
    () =>
      buildSelectorRegistryProbeCarryForwardItems({
        items: suggestions,
        getItemId: (suggestion) => suggestion.suggestionId,
        getRole: (suggestion) =>
          aiClassifiedRoles[suggestion.suggestionId] ?? suggestion.classificationRole,
        defaultKeysByRole,
      }),
    [aiClassifiedRoles, defaultKeysByRole, suggestions]
  );

  const carryForwardSourcesByRole = useMemo(() => {
    return buildSelectorRegistryProbeCarryForwardSources({
      items: carryForwardItems,
      selectedKeys,
      manuallySelectedKeys,
    });
  }, [carryForwardItems, manuallySelectedKeys, selectedKeys]);

  const carryForwardSummaries = useMemo(() => {
    return buildSelectorRegistryProbeCarryForwardSummaries({
      items: carryForwardItems,
      selectedKeys,
    });
  }, [carryForwardItems, selectedKeys]);

  const liveCarryForwardInheritedCountsBySuggestionId = useMemo(() => {
    return buildSelectorRegistryProbeCarryForwardInheritedCounts({
      items: carryForwardItems,
      selectedKeys,
      manuallySelectedKeys,
      carryForwardSourcesByRole,
    });
  }, [carryForwardItems, carryForwardSourcesByRole, manuallySelectedKeys, selectedKeys]);

  useEffect(() => {
    if (suggestions.length === 0) {
      setManuallySelectedKeys((current) =>
        Object.keys(current).length === 0 ? current : {}
      );
      return;
    }

    setManuallySelectedKeys((current) => {
      const next = Object.fromEntries(
        Object.entries(current).filter(([suggestionId]) => suggestionIdSet.has(suggestionId))
      );
      return Object.keys(next).length === Object.keys(current).length ? current : next;
    });
  }, [suggestionIdSet, suggestions]);

  useEffect(() => {
    if (suggestions.length === 0) {
      setSelectedKeys((current) =>
        Object.keys(current).length === 0 ? current : {}
      );
      return;
    }

    setSelectedKeys((current) => {
      const next = applySelectorRegistryProbeCarryForwardDefaults({
        items: carryForwardItems,
        selectedKeys: current,
        manuallySelectedKeys,
      });
      return areStringRecordsEqual(current, next) ? current : next;
    });
  }, [carryForwardItems, manuallySelectedKeys, suggestions.length]);

  useEffect(() => {
    if (liveScripter.probeResult === null) {
      setSavedProbeSessionHint(null);
    }
  }, [liveScripter.probeResult]);

  const syncCustomRegistryProbeUrl = async (profile: string): Promise<void> => {
    if (registryNamespace !== 'custom') {
      return;
    }
    await profileMutation.mutateAsync({
      action: 'set_probe_url',
      namespace: registryNamespace,
      profile,
      probeUrl: liveScripter.currentUrl,
    });
  };

  const handleCreateSeededRegistry = async (): Promise<void> => {
    const targetProfile = newRegistryProfile.trim();
    if (targetProfile.length === 0) {
      toast('Registry profile name is required.', { variant: 'error' });
      return;
    }
    setSyncTargetProfile(targetProfile);
    try {
      const response = await syncMutation.mutateAsync({
        namespace: registryNamespace,
        profile: targetProfile,
      });
      setRegistryProfile(targetProfile);
      setNewRegistryProfile('');
      toast(response.message, { variant: 'success' });
      if (registryNamespace === 'custom') {
        try {
          await syncCustomRegistryProbeUrl(targetProfile);
        } catch (error) {
          toast(
            error instanceof Error
              ? error.message
              : 'Registry was created, but probe site URL could not be saved.',
            { variant: 'error' }
          );
        }
      }
    } catch (error) {
      toast(
        error instanceof Error ? error.message : 'Registry profile could not be created.',
        { variant: 'error' }
      );
    } finally {
      setSyncTargetProfile(null);
    }
  };

  const handleCloneCurrentRegistry = async (): Promise<void> => {
    const targetProfile = newRegistryProfile.trim();
    if (targetProfile.length === 0) {
      toast('Target registry profile name is required.', { variant: 'error' });
      return;
    }
    const actionKey = `clone:${targetProfile}`;
    setProfileActionKey(actionKey);
    try {
      const response = await profileMutation.mutateAsync({
        action: 'clone_profile',
        namespace: registryNamespace,
        sourceProfile: effectiveRegistryProfile,
        targetProfile,
      });
      setRegistryProfile(targetProfile);
      setNewRegistryProfile('');
      toast(response.message, { variant: 'success' });
      if (registryNamespace === 'custom') {
        try {
          await syncCustomRegistryProbeUrl(targetProfile);
        } catch (error) {
          toast(
            error instanceof Error
              ? error.message
              : 'Registry was cloned, but probe site URL could not be saved.',
            { variant: 'error' }
          );
        }
      }
    } catch (error) {
      toast(
        error instanceof Error ? error.message : 'Registry profile could not be cloned.',
        { variant: 'error' }
      );
    } finally {
      setProfileActionKey(null);
    }
  };

  return (
    <div className='space-y-3 rounded-lg border border-white/10 bg-black/10 p-4'>
      <div className='space-y-1'>
        <div className='flex items-center justify-between gap-3'>
          <h2 className='text-sm font-semibold'>DOM Probe</h2>
          <div className='flex items-center gap-2'>
            {brainRoleClassifier.effectiveModelId ? (
              <Badge variant='outline' className='gap-1 text-xs'>
                <SparklesIcon className='h-3 w-3' />
                {brainRoleClassifier.effectiveModelId}
              </Badge>
            ) : null}
            <Button
              type='button'
              variant='outline'
              size='sm'
              disabled={
                suggestions.length === 0 ||
                !brainRoleClassifier.effectiveModelId ||
                classifyingAll ||
                classifySuggestionsMutation.isPending
              }
              onClick={() => void handleClassifyAllSuggestions()}
            >
              <SparklesIcon className='mr-1 h-3.5 w-3.5' />
              {classifyingAll ? 'Classifying…' : 'Classify with AI'}
            </Button>
            <Button
              type='button'
              variant='outline'
              size='sm'
              disabled={liveScripter.status !== 'live'}
              onClick={() => {
                liveScripter.probeDom({
                  scope: probeScope,
                  maxNodes: probeMaxNodes,
                  sameOriginOnly: true,
                  linkDepth: probeLinkDepth,
                  maxPages: probeMaxPages,
                });
              }}
            >
              Run Probe
            </Button>
          </div>
        </div>
        <p className='text-xs text-muted-foreground'>
          Analyze the current page, classify selector candidates, and promote reviewed suggestions
          into the selector registry.
        </p>
      </div>

      <div className='grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]'>
        <div className='space-y-3 rounded-md border border-white/10 bg-black/20 p-3'>
          <div className='text-sm font-medium'>Probe Settings</div>
          <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
            <div className='space-y-2'>
              <Label>Probe Scope</Label>
              <Select
                value={probeScope}
                onValueChange={(value) => {
                  if (value === 'main_content' || value === 'whole_page') {
                    setProbeScope(value);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder='Probe scope' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='main_content'>Main content</SelectItem>
                  <SelectItem value='whole_page'>Whole page</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-2'>
              <Label>Suggestion Cap</Label>
              <Select
                value={String(probeMaxNodes)}
                onValueChange={(value) => {
                  const next = Number(value);
                  if (Number.isFinite(next) && next > 0) {
                    setProbeMaxNodes(next);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder='Suggestion cap' />
                </SelectTrigger>
                <SelectContent>
                  {MAX_NODES_OPTIONS.map((value) => (
                    <SelectItem key={value} value={String(value)}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-2'>
              <Label>Link Depth</Label>
              <Select
                value={String(probeLinkDepth)}
                onValueChange={(value) => {
                  const next = Number(value);
                  if (Number.isFinite(next) && next >= 0) {
                    setProbeLinkDepth(next);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder='Link depth' />
                </SelectTrigger>
                <SelectContent>
                  {LINK_DEPTH_OPTIONS.map((value) => (
                    <SelectItem key={value} value={String(value)}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-2'>
              <Label>Max Pages</Label>
              <Select
                value={String(probeMaxPages)}
                onValueChange={(value) => {
                  const next = Number(value);
                  if (Number.isFinite(next) && next > 0) {
                    setProbeMaxPages(next);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder='Max pages' />
                </SelectTrigger>
                <SelectContent>
                  {MAX_PAGES_OPTIONS.map((value) => (
                    <SelectItem key={value} value={String(value)}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className='space-y-3 rounded-md border border-white/10 bg-black/20 p-3'>
          <div className='flex flex-wrap items-center justify-between gap-2'>
          <div className='text-sm font-medium'>Registry Target</div>
          <Badge variant='outline'>
            {formatSelectorRegistryNamespaceLabel(registryNamespace)} / {effectiveRegistryProfile}
          </Badge>
        </div>
        {savedProbeUrl !== null ? (
          <div className='rounded-md border border-white/10 bg-black/10 px-3 py-2 text-xs text-muted-foreground'>
            Probe target: <span className='font-mono'>{savedProbeUrl}</span>
            {savedProbePathHint !== null ? (
              <>
                {' · '}
                Path hint: <span className='font-mono'>{savedProbePathHint}</span>
              </>
            ) : null}
          </div>
        ) : null}
        <div className='grid gap-3 sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)]'>
            <div className='space-y-2'>
              <Label>Registry Namespace</Label>
              <Select
                value={registryNamespace}
                onValueChange={(value) => {
                  if (
                    value === 'tradera' ||
                    value === 'amazon' ||
                    value === '1688' ||
                    value === 'custom' ||
                    value === 'vinted'
                  ) {
                    setRegistryNamespace(value);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder='Registry namespace' />
                </SelectTrigger>
                <SelectContent>
                  {SELECTOR_REGISTRY_NAMESPACES.map((namespace) => (
                    <SelectItem key={namespace} value={namespace}>
                      {formatSelectorRegistryNamespaceLabel(namespace)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='live-scripter-registry-profile'>Active Registry</Label>
              <Input
                id='live-scripter-registry-profile'
                value={registryProfile}
                onChange={(event) => setRegistryProfile(event.target.value)}
                placeholder={getSuggestedRegistryProfile(
                  registryNamespace,
                  liveScripter.currentUrl
                )}
              />
            </div>
          </div>
          <div className='space-y-2'>
            <Label>Known Registries</Label>
            <div className='flex flex-wrap gap-2'>
              {availableProfiles.map((profile) => (
                <Button
                  key={profile}
                  type='button'
                  size='sm'
                  variant={profile === effectiveRegistryProfile ? 'default' : 'outline'}
                  onClick={() => setRegistryProfile(profile)}
                >
                  {profile}
                </Button>
              ))}
            </div>
          </div>
          <div className='grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]'>
            <div className='space-y-2'>
              <Label htmlFor='live-scripter-new-registry-profile'>New Registry</Label>
              <Input
                id='live-scripter-new-registry-profile'
                value={newRegistryProfile}
                onChange={(event) => setNewRegistryProfile(event.target.value)}
                placeholder='website-specific registry id'
                disabled={registryNamespace === 'vinted'}
              />
            </div>
            <div className='flex items-end'>
              <Button
                type='button'
                variant='outline'
                disabled={registryNamespace === 'vinted'}
                loading={syncTargetProfile === newRegistryProfile.trim() && newRegistryProfile.trim().length > 0}
                loadingText='Creating'
                onClick={() => void handleCreateSeededRegistry()}
              >
                Create Seeded Registry
              </Button>
            </div>
            <div className='flex items-end'>
              <Button
                type='button'
                variant='outline'
                disabled={registryNamespace === 'vinted'}
                loading={profileActionKey === `clone:${newRegistryProfile.trim()}` && newRegistryProfile.trim().length > 0}
                loadingText='Cloning'
                onClick={() => void handleCloneCurrentRegistry()}
              >
                Clone Current Registry
              </Button>
            </div>
          </div>
          <div className='text-xs text-muted-foreground'>
            Create or clone a website-specific selector registry here before saving probe
            sessions or promoting selectors, so new sites do not pollute the current shared
            library.
          </div>
        </div>
      </div>

      <div className='flex items-center justify-between gap-3 text-xs text-muted-foreground'>
        <div className='space-y-1'>
          <div>
            {liveScripter.probeResult === null
              ? 'Run a probe after the page settles to collect selector suggestions.'
              : `Probe scanned ${liveScripter.probeResult.scannedPages} page(s) and found ${liveScripter.probeResult.suggestionCount} suggestions.`}
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            {currentProbeTemplateLabel !== null ? (
              <Badge variant='outline'>Current template: {currentProbeTemplateLabel}</Badge>
            ) : null}
            {carryForwardSummaries.map((summary) => (
              <Badge
                key={`carry-forward:${summary.role}`}
                variant='outline'
              >
                Likely carry-forward for {summary.role} -&gt; {summary.selectedKey}
              </Badge>
            ))}
            <Link
              href={getSelectorRegistryAdminHref(registryNamespace, {
                profile: effectiveRegistryProfile,
                includeArchived: false,
                hash: 'probe-sessions',
              })}
              className='inline-flex'
            >
              <Badge variant='outline'>
                Probe backlog: {formatCount(activeProbeSessions.length, 'session', 'sessions')} /{' '}
                {formatCount(activeProbeTemplateCount, 'template', 'templates')}
              </Badge>
            </Link>
            <Link
              href={getSelectorRegistryAdminHref(registryNamespace, {
                profile: effectiveRegistryProfile,
                includeArchived: true,
                hash: 'probe-sessions',
              })}
              className='inline-flex'
            >
              <Badge variant='outline'>
                Probe history: {formatCount(archivedProbeSessions.length, 'archived session', 'archived sessions')} /{' '}
                {formatCount(archivedProbeTemplateCount, 'template', 'templates')}
              </Badge>
            </Link>
          </div>
        </div>
        <div className='flex items-center gap-3'>
          <Button
            type='button'
            size='sm'
            variant='outline'
            disabled={liveScripter.probeResult === null || saveProbeSessionMutation.isPending}
            onClick={async () => {
              if (liveScripter.probeResult === null) {
                return;
              }
              try {
                const response = await saveProbeSessionMutation.mutateAsync({
                  namespace: registryNamespace,
                  profile: registryProfile.trim().length > 0
                    ? registryProfile.trim()
                    : getSuggestedRegistryProfile(
                        registryNamespace,
                        liveScripter.currentUrl
                      ),
                  probeResult: {
                    url: liveScripter.probeResult.url,
                    title: liveScripter.probeResult.title,
                    scope: liveScripter.probeResult.scope,
                    sameOriginOnly: liveScripter.probeResult.sameOriginOnly,
                    linkDepth: liveScripter.probeResult.linkDepth,
                    maxPages: liveScripter.probeResult.maxPages,
                    scannedPages: liveScripter.probeResult.scannedPages,
                    visitedUrls: liveScripter.probeResult.visitedUrls,
                    pages: liveScripter.probeResult.pages,
                    suggestionCount: liveScripter.probeResult.suggestionCount,
                    suggestions: liveScripter.probeResult.suggestions,
                  },
                });
                setSavedProbeSessionHint({
                  href: getSelectorRegistryAdminHref(registryNamespace, {
                    profile: effectiveRegistryProfile,
                    includeArchived: false,
                    hash: 'probe-sessions',
                  }),
                  sourceTitle:
                    response.session.sourceTitle?.trim().length > 0
                      ? response.session.sourceTitle
                      : liveScripter.probeResult.title,
                  scannedPages: response.session.scannedPages,
                  templateLabel: formatSelectorRegistryProbeTemplateLabel(
                    response.session.templateFingerprint
                  ),
                });
                toast(response.message, { variant: 'success' });
                if (registryNamespace === 'custom') {
                  try {
                    await syncCustomRegistryProbeUrl(
                      registryProfile.trim().length > 0
                        ? registryProfile.trim()
                        : getSuggestedRegistryProfile(
                            registryNamespace,
                            liveScripter.currentUrl
                          )
                    );
                  } catch (error) {
                    toast(
                      error instanceof Error
                        ? error.message
                        : 'Probe session was saved, but probe site URL could not be saved.',
                      { variant: 'error' }
                    );
                  }
                }
              } catch (error) {
                setSavedProbeSessionHint(null);
                toast(
                  error instanceof Error
                    ? error.message
                    : 'Probe session could not be saved.',
                  { variant: 'error' }
                );
              }
            }}
          >
            Save Probe Session
          </Button>
          <Link
            href={getSelectorRegistryAdminHref(registryNamespace, {
              profile: effectiveRegistryProfile,
            })}
            className='underline underline-offset-4'
          >
            Open selector registry
          </Link>
        </div>
      </div>

      {savedProbeSessionHint !== null ? (
        <div className='flex flex-wrap items-center gap-2 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100'>
          <Badge variant='outline'>saved just now</Badge>
          <span>
            Saved "{savedProbeSessionHint.sourceTitle}" to active review under template{' '}
            {savedProbeSessionHint.templateLabel} from{' '}
            {formatCount(savedProbeSessionHint.scannedPages, 'scanned page', 'scanned pages')}.
          </span>
          <Link href={savedProbeSessionHint.href} className='underline underline-offset-4'>
            Open active review
          </Link>
        </div>
      ) : null}

      {liveScripter.probeResult === null ? (
        <div className='rounded-md border border-dashed border-white/10 p-4 text-sm text-muted-foreground'>
          No probe results yet.
        </div>
      ) : suggestions.length === 0 ? (
        <div className='rounded-md border border-dashed border-white/10 p-4 text-sm text-muted-foreground'>
          Probe completed but no stable candidates were classified.
        </div>
      ) : (
        <div className='space-y-3'>
          <div className='rounded-md border border-white/10 bg-black/20 p-3'>
            <div className='mb-2 text-sm font-medium'>Visited Pages</div>
            <div className='flex flex-wrap gap-2'>
              {liveScripter.probeResult.pages.map((pageSummary) => (
                <Badge key={pageSummary.url} variant='outline'>
                  {pageSummary.title ?? pageSummary.url} ({pageSummary.suggestionCount})
                </Badge>
              ))}
            </div>
            <div className='mt-2 text-xs text-muted-foreground'>
              Same-origin traversal only. Link depth {liveScripter.probeResult.linkDepth}, max pages{' '}
              {liveScripter.probeResult.maxPages}.
            </div>
          </div>

          <div className='grid gap-3 xl:grid-cols-2'>
            {suggestions.map((suggestion) => {
            const aiRole = aiClassifiedRoles[suggestion.suggestionId];
            const effectiveRole = aiRole ?? suggestion.classificationRole;
            const matchingEntries = promotableEntriesByRole.get(effectiveRole) ?? [];
            const selectedKey = selectedKeys[suggestion.suggestionId] ?? '';
            const carryForwardSource = carryForwardSourcesByRole.get(effectiveRole);
            const inheritedFromLiveCarryForward = isSelectorRegistryProbeCarryForwardInherited({
              itemId: suggestion.suggestionId,
              role: effectiveRole,
              selectedKey,
              manuallySelectedKeys,
              carryForwardSourcesByRole,
            });
            const isCarryForwardSource =
              (liveCarryForwardInheritedCountsBySuggestionId[suggestion.suggestionId] ?? 0) > 0;
            const selectorValue = readPromotableSelectorValue(suggestion);
            const promoteDisabled =
              registryNamespace === 'vinted' ||
              selectorValue === null ||
              selectedKey.trim().length === 0 ||
              saveMutation.isPending;

            return (
              <div
                key={suggestion.suggestionId}
                className='min-w-0 space-y-3 rounded-md border border-white/10 bg-black/20 p-4'
              >
                <SelectorRegistryProbeSuggestionBadges
                  role={effectiveRole}
                  confidence={suggestion.confidence}
                  tag={suggestion.tag}
                  draftTargetHints={suggestion.draftTargetHints}
                  baseKey={suggestion.suggestionId}
                  isCarryForwardSource={isCarryForwardSource}
                  isAiClassified={aiRole !== undefined}
                />

                <div className='space-y-1 text-sm'>
                  <div className='font-medium'>
                    {getSelectorRegistryProbeSuggestionTextPreview(suggestion)}
                  </div>
                  <div className='text-xs text-muted-foreground'>
                    {getSelectorRegistryProbeSuggestionEvidenceText(suggestion)}
                  </div>
                  <div className='text-xs text-muted-foreground'>{suggestion.pageUrl}</div>
                </div>

                <div className='grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(260px,320px)]'>
                  <SelectorRegistryProbeSuggestionCandidateDetails
                    suggestion={suggestion}
                    mode='stacked'
                    includeSiblingRepeat
                    className='space-y-2 text-xs text-muted-foreground'
                  />

                  <div className='space-y-2'>
                    <Label htmlFor={`probe-key-${suggestion.suggestionId}`}>Promote As</Label>
                    <Select
                      value={selectedKey}
                      onValueChange={(value) => {
                        const nextState = applySelectorRegistryProbeCarryForwardManualSelection({
                          items: carryForwardItems,
                          selectedKeys,
                          manuallySelectedKeys,
                          itemId: suggestion.suggestionId,
                          selectedKey: value,
                        });
                        setManuallySelectedKeys(nextState.manuallySelectedKeys);
                        setSelectedKeys(nextState.selectedKeys);
                      }}
                    >
                      <SelectTrigger id={`probe-key-${suggestion.suggestionId}`}>
                        <SelectValue
                          placeholder={
                            matchingEntries.length === 0
                              ? 'No matching selector keys'
                              : 'Choose a selector key'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {matchingEntries.map((entry) => (
                          <SelectItem key={entry.key} value={entry.key}>
                            {entry.key}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {inheritedFromLiveCarryForward ? (
                      <div className='text-xs text-muted-foreground'>
                        Will inherit on save/review: {carryForwardSource?.selectedKey}
                      </div>
                    ) : null}

                    <Button
                      type='button'
                      size='sm'
                      disabled={promoteDisabled}
                      onClick={async () => {
                        if (selectorValue === null || selectedKey.trim().length === 0) {
                          return;
                        }
                        try {
                          const response = await saveMutation.mutateAsync({
                            namespace: registryNamespace,
                            profile: registryProfile,
                            key: selectedKey,
                            valueJson: JSON.stringify(selectorValue),
                            role: effectiveRole,
                          });
                          toast(response.message, { variant: 'success' });
                        } catch (error) {
                          toast(
                            error instanceof Error
                              ? error.message
                              : 'Probe suggestion could not be saved.',
                            { variant: 'error' }
                          );
                        }
                      }}
                    >
                      Promote To Registry
                    </Button>
                    {registryNamespace === 'vinted' ? (
                      <div className='text-xs text-muted-foreground'>
                        Vinted selector seeds are currently read-only.
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
