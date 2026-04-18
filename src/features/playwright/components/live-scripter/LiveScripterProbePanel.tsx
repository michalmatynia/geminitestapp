'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import {
  useSaveSelectorRegistryProbeSessionMutation,
  useSaveSelectorRegistryEntryMutation,
  useSelectorRegistry,
} from '@/features/integrations/hooks/useSelectorRegistry';
import type { SelectorRegistryNamespace } from '@/shared/contracts/integrations/selector-registry';
import type { LiveScripterResult } from '@/features/playwright/hooks/playwrightLiveScripter.result';
import { formatSelectorRegistryRoleLabel } from '@/shared/lib/browser-execution/selector-registry-roles';
import {
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

type Props = {
  liveScripter: LiveScripterResult;
};

const MAX_NODES_OPTIONS = [24, 48, 72, 96] as const;
const LINK_DEPTH_OPTIONS = [0, 1] as const;
const MAX_PAGES_OPTIONS = [1, 2, 4] as const;

const inferNamespaceFromUrl = (url: string): SelectorRegistryNamespace => {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname.includes('amazon.')) return 'amazon';
    if (hostname.includes('1688.') || hostname.includes('alibaba.')) return '1688';
    if (hostname.includes('vinted.')) return 'vinted';
  } catch {
    return 'tradera';
  }
  return 'tradera';
};

const formatConfidence = (confidence: number): string => `${Math.round(confidence * 100)}%`;

const readPromotableSelectorValue = (
  suggestion: NonNullable<LiveScripterResult['probeResult']>['suggestions'][number]
): string | null => suggestion.candidates.css ?? suggestion.candidates.xpath ?? null;

export function LiveScripterProbePanel({
  liveScripter,
}: Props): React.JSX.Element {
  const { toast } = useToast();
  const inferredNamespace = useMemo(
    () => inferNamespaceFromUrl(liveScripter.currentUrl),
    [liveScripter.currentUrl]
  );
  const [registryNamespace, setRegistryNamespace] =
    useState<SelectorRegistryNamespace>(inferredNamespace);
  const [registryProfile, setRegistryProfile] = useState(
    SELECTOR_REGISTRY_DEFAULT_PROFILES[inferredNamespace]
  );
  const [probeScope, setProbeScope] = useState<'main_content' | 'whole_page'>('main_content');
  const [probeMaxNodes, setProbeMaxNodes] = useState<number>(48);
  const [probeLinkDepth, setProbeLinkDepth] = useState<number>(0);
  const [probeMaxPages, setProbeMaxPages] = useState<number>(1);
  const [selectedKeys, setSelectedKeys] = useState<Record<string, string>>({});

  const registryQuery = useSelectorRegistry({
    namespace: registryNamespace,
    profile: registryProfile,
    effective: true,
  });
  const saveMutation = useSaveSelectorRegistryEntryMutation();
  const saveProbeSessionMutation = useSaveSelectorRegistryProbeSessionMutation();

  useEffect(() => {
    setRegistryNamespace((current) => (current === inferredNamespace ? current : inferredNamespace));
    setRegistryProfile((current) => {
      const defaultProfile = SELECTOR_REGISTRY_DEFAULT_PROFILES[inferredNamespace];
      return current.trim().length === 0 ? defaultProfile : current;
    });
  }, [inferredNamespace]);

  useEffect(() => {
    setRegistryProfile(SELECTOR_REGISTRY_DEFAULT_PROFILES[registryNamespace]);
  }, [registryNamespace]);

  const promotableEntries = useMemo(
    () =>
      (registryQuery.data?.entries ?? []).filter(
        (entry) => entry.kind === 'selector' && entry.valueType === 'string'
      ),
    [registryQuery.data?.entries]
  );

  const suggestions = liveScripter.probeResult?.suggestions ?? [];

  useEffect(() => {
    if (suggestions.length === 0) {
      setSelectedKeys({});
      return;
    }

    setSelectedKeys((current) => {
      const next: Record<string, string> = {};
      for (const suggestion of suggestions) {
        const matchingEntries = promotableEntries.filter(
          (entry) => entry.role === suggestion.classificationRole
        );
        next[suggestion.suggestionId] =
          current[suggestion.suggestionId] ??
          matchingEntries[0]?.key ??
          '';
      }
      return next;
    });
  }, [promotableEntries, suggestions]);

  return (
    <div className='space-y-3 rounded-lg border border-white/10 bg-black/10 p-4'>
      <div className='space-y-1'>
        <div className='flex items-center justify-between gap-3'>
          <h2 className='text-sm font-semibold'>DOM Probe</h2>
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
        <p className='text-xs text-muted-foreground'>
          Analyze the current page, classify selector candidates, and promote reviewed suggestions
          into the selector registry.
        </p>
      </div>

      <div className='grid gap-3 md:grid-cols-6'>
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

        <div className='space-y-2'>
          <Label>Registry Namespace</Label>
          <Select
            value={registryNamespace}
            onValueChange={(value) => {
              if (
                value === 'tradera' ||
                value === 'amazon' ||
                value === '1688' ||
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
          <Label>Registry Profile</Label>
          <Input
            value={registryProfile}
            onChange={(event) => setRegistryProfile(event.target.value)}
            placeholder={SELECTOR_REGISTRY_DEFAULT_PROFILES[registryNamespace]}
          />
        </div>
      </div>

      <div className='flex items-center justify-between gap-3 text-xs text-muted-foreground'>
        <div>
          {liveScripter.probeResult === null
            ? 'Run a probe after the page settles to collect selector suggestions.'
            : `Probe scanned ${liveScripter.probeResult.scannedPages} page(s) and found ${liveScripter.probeResult.suggestionCount} suggestions.`}
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
                    : SELECTOR_REGISTRY_DEFAULT_PROFILES[registryNamespace],
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
                toast(response.message, { variant: 'success' });
              } catch (error) {
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
            href={getSelectorRegistryAdminHref(registryNamespace)}
            className='underline underline-offset-4'
          >
            Open selector registry
          </Link>
        </div>
      </div>

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

          {suggestions.map((suggestion) => {
            const matchingEntries = promotableEntries.filter(
              (entry) => entry.role === suggestion.classificationRole
            );
            const selectedKey = selectedKeys[suggestion.suggestionId] ?? '';
            const selectorValue = readPromotableSelectorValue(suggestion);
            const promoteDisabled =
              registryNamespace === 'vinted' ||
              selectorValue === null ||
              selectedKey.trim().length === 0 ||
              saveMutation.isPending;

            return (
              <div
                key={suggestion.suggestionId}
                className='space-y-3 rounded-md border border-white/10 bg-black/20 p-3'
              >
                <div className='flex flex-wrap items-center gap-2'>
                  <Badge variant='secondary'>{formatSelectorRegistryRoleLabel(suggestion.classificationRole) ?? suggestion.classificationRole}</Badge>
                  <Badge variant='outline'>{formatConfidence(suggestion.confidence)}</Badge>
                  <Badge variant='outline'>{suggestion.tag}</Badge>
                  {suggestion.draftTargetHints.map((hint) => (
                    <Badge key={`${suggestion.suggestionId}-${hint}`} variant='outline'>
                      {hint}
                    </Badge>
                  ))}
                </div>

                <div className='space-y-1 text-sm'>
                  <div className='font-medium'>{suggestion.textPreview ?? '(no visible text)'}</div>
                  <div className='text-xs text-muted-foreground'>
                    {suggestion.evidence.join(' ')}
                  </div>
                  <div className='text-xs text-muted-foreground'>{suggestion.pageUrl}</div>
                </div>

                <div className='grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(220px,280px)]'>
                  <div className='space-y-2 text-xs text-muted-foreground'>
                    <div>
                      <span className='font-medium text-foreground'>CSS:</span>{' '}
                      {suggestion.candidates.css ?? 'Unavailable'}
                    </div>
                    <div>
                      <span className='font-medium text-foreground'>XPath:</span>{' '}
                      {suggestion.candidates.xpath ?? 'Unavailable'}
                    </div>
                    <div>
                      <span className='font-medium text-foreground'>Sibling repeat:</span>{' '}
                      {suggestion.repeatedSiblingCount}
                    </div>
                  </div>

                  <div className='space-y-2'>
                    <Label htmlFor={`probe-key-${suggestion.suggestionId}`}>Promote As</Label>
                    <Select
                      value={selectedKey}
                      onValueChange={(value) => {
                        setSelectedKeys((current) => ({
                          ...current,
                          [suggestion.suggestionId]: value,
                        }));
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
                            role: suggestion.classificationRole,
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
      )}
    </div>
  );
}
