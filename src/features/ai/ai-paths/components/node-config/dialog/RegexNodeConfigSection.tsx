'use client';

import { useQueryClient } from '@tanstack/react-query';
import React from 'react';

import {
  AI_PATHS_REGEX_TEMPLATES_KEY,
  buildRegexTemplatesStore,
  createRegexTemplateId,
  parseRegexTemplatesStore,
  renderTemplate,
} from '@/features/ai/ai-paths/lib';
import type { AiNode, Edge, RegexConfig, RegexTemplate } from '@/features/ai/ai-paths/lib';
import {
  fetchAiPathsSettingsCached,
  updateAiPathsSetting,
} from '@/features/ai/ai-paths/lib/settings-store-client';
import { DOCUMENTATION_MODULE_IDS } from '@/features/documentation';
import { getDocumentationTooltip } from '@/features/tooltip-engine';
import { createListQueryV2, createUpdateMutationV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import {
  Button,
  FormField,
  Hint,
  Input,
  Label,
  SelectSimple,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  ToggleRow,
  Tooltip,
} from '@/shared/ui';
import { serializeSetting } from '@/shared/utils/settings-json';

import {
  buildRegexItems,
  buildRegexPreview,
  extractCodeSnippets,
  extractRegexLiteral,
  normalizeRegexFlags,
  parseRegexCandidate,
} from './regex-node-config-preview';
import { RegexPendingAiProposal } from './RegexPendingAiProposal';
import { RegexTemplatesTabContent } from './RegexTemplatesTabContent';
import { useAiPathConfig } from '../../AiPathConfigContext';

export function RegexNodeConfigSection(): React.JSX.Element | null {
  const {
    selectedNode,
    nodes,
    edges,
    runtimeState,
    updateSelectedNodeConfig,
    onSendToAi,
    sendingToAi,
    toast,
  } = useAiPathConfig();

  if (selectedNode?.type !== 'regex') return null;

  const isRegexNode = true;

  const regexConfig = React.useMemo((): RegexConfig => {
    return (isRegexNode ? selectedNode.config?.regex : undefined) ?? {
      pattern: '',
      flags: 'g',
      mode: 'group',
      matchMode: 'first',
      groupBy: 'match',
      outputMode: 'object',
      includeUnmatched: true,
      unmatchedKey: '__unmatched__',
      splitLines: true,
      sampleText: '',
      aiPrompt: '',
      jsonIntegrityPolicy: 'repair',
    };
  }, [isRegexNode, selectedNode.config?.regex]);

  const regexConfigRef = React.useRef(regexConfig);
  React.useEffect(() => {
    regexConfigRef.current = regexConfig;
  });

  const updateRegex = React.useCallback(
    (patch: Partial<RegexConfig>): void => {
      if (!isRegexNode) return;
      updateSelectedNodeConfig({
        regex: {
          ...regexConfigRef.current,
          ...patch,
        },
      });
    },
    [isRegexNode, updateSelectedNodeConfig]
  );

  const [pendingAiRegex, setPendingAiRegex] = React.useState<string>('');
  const [selectedSnippetIndex, setSelectedSnippetIndex] = React.useState<number>(-1);
  const lastInjectedResponseRef = React.useRef<string>('');
  const hasAiProposal = Boolean(regexConfig.aiProposal?.pattern?.trim());
  const placeholderTooltips = React.useMemo(
    () => ({
      text: getDocumentationTooltip(
        DOCUMENTATION_MODULE_IDS.aiPaths,
        'regex_placeholder_text'
      ) ?? 'Resolved sample text (from Preview Sample / runtime)',
      lines: getDocumentationTooltip(
        DOCUMENTATION_MODULE_IDS.aiPaths,
        'regex_placeholder_lines'
      ) ?? 'Resolved sample items array (lines)',
      value: getDocumentationTooltip(
        DOCUMENTATION_MODULE_IDS.aiPaths,
        'regex_placeholder_value'
      ) ?? 'Alias for current value (same as sample text)',
    }),
    []
  );
  const activeVariant = regexConfig.activeVariant ?? 'manual';
  const aiProposals = React.useMemo(() => regexConfig.aiProposals ?? [], [regexConfig.aiProposals]);
  const regexTemplates = React.useMemo(() => regexConfig.templates ?? [], [regexConfig.templates]);
  const queryClient = useQueryClient();
  const cachedAiPathSettings =
    queryClient.getQueryData<Array<{ key: string; value: string }>>(
      QUERY_KEYS.ai.aiPaths.settings()
    ) ?? [];
  const hasCachedAiPathSettings = Boolean(
    queryClient.getQueryState(QUERY_KEYS.ai.aiPaths.settings())?.dataUpdatedAt
  );
  const settingsQuery = createListQueryV2<
    Array<{ key: string; value: string }>,
    Array<{ key: string; value: string }>
  >({
    queryKey: QUERY_KEYS.ai.aiPaths.settings(),
    queryFn: async (): Promise<Array<{ key: string; value: string }>> =>
      await fetchAiPathsSettingsCached(),
    ...(hasCachedAiPathSettings ? { initialData: cachedAiPathSettings } : {}),
    staleTime: 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    meta: {
      source: 'ai.ai-paths.node-config.regex.settings',
      operation: 'list',
      resource: 'ai-paths.settings',
      domain: 'global',
      tags: ['ai-paths', 'node-config', 'regex'],
    },
  });
  const updateSettingMutation = createUpdateMutationV2<void, { key: string; value: string }>({
    mutationKey: QUERY_KEYS.ai.aiPaths.mutation('regex.update-setting'),
    mutationFn: async (payload: { key: string; value: string }): Promise<void> => {
      await updateAiPathsSetting(payload.key, payload.value);
    },
    meta: {
      source: 'ai.ai-paths.node-config.regex.update-setting',
      operation: 'update',
      resource: 'ai-paths.settings.regex',
      domain: 'global',
      tags: ['ai-paths', 'node-config', 'regex'],
    },
  });
  const globalTemplatesRaw = React.useMemo(() => {
    const map = new Map((settingsQuery.data ?? []).map((item) => [item.key, item.value]));
    return map.get(AI_PATHS_REGEX_TEMPLATES_KEY) ?? null;
  }, [settingsQuery.data]);
  const parsedGlobalTemplates = React.useMemo(
    () => parseRegexTemplatesStore(globalTemplatesRaw).templates,
    [globalTemplatesRaw]
  );
  const [globalTemplates, setGlobalTemplates] = React.useState<RegexTemplate[]>(parsedGlobalTemplates);
  const lastSyncedGlobalTemplatesRef = React.useRef<RegexTemplate[]>(parsedGlobalTemplates);
  const [activeTab, setActiveTab] = React.useState<'config' | 'templates'>('config');
  const [templateName, setTemplateName] = React.useState<string>('');

  React.useEffect(() => {
    if (!settingsQuery.isSuccess) return;
    setGlobalTemplates(parsedGlobalTemplates);
    lastSyncedGlobalTemplatesRef.current = parsedGlobalTemplates;
  }, [parsedGlobalTemplates, settingsQuery.dataUpdatedAt, settingsQuery.isSuccess]);

  const saveRegexTemplate = React.useCallback((): void => {
    const name = templateName.trim();
    if (!name) {
      toast('Template name is required.', { variant: 'error' });
      return;
    }
    const newTemplate: RegexTemplate = {
      id: createRegexTemplateId(),
      name,
      pattern: regexConfig.pattern ?? '',
      flags: regexConfig.flags ?? '',
      mode: regexConfig.mode ?? 'group',
      matchMode: regexConfig.matchMode ?? 'first',
      groupBy: regexConfig.groupBy ?? 'match',
      outputMode: regexConfig.outputMode ?? 'object',
      includeUnmatched: regexConfig.includeUnmatched ?? true,
      unmatchedKey: regexConfig.unmatchedKey ?? '__unmatched__',
      splitLines: regexConfig.splitLines ?? true,
      createdAt: new Date().toISOString(),
    };
    updateRegex({ templates: [newTemplate, ...regexTemplates] });
    setTemplateName('');
    toast('Regex template saved.', { variant: 'success' });
  }, [regexConfig, regexTemplates, templateName, toast, updateRegex]);

  const persistGlobalTemplates = React.useCallback(
    async (nextTemplates: RegexTemplate[], successMessage?: string): Promise<void> => {
      setGlobalTemplates(nextTemplates);
      try {
        await updateSettingMutation.mutateAsync({
          key: AI_PATHS_REGEX_TEMPLATES_KEY,
          value: serializeSetting(buildRegexTemplatesStore(nextTemplates)),
        });
        if (successMessage) {
          toast(successMessage, { variant: 'success' });
        }
      } catch {
        setGlobalTemplates(lastSyncedGlobalTemplatesRef.current);
        toast('Failed to update global regex templates.', { variant: 'error' });
      }
    },
    [toast, updateSettingMutation]
  );

  const saveGlobalRegexTemplate = React.useCallback((): void => {
    const name = templateName.trim();
    if (!name) {
      toast('Template name is required.', { variant: 'error' });
      return;
    }
    const newTemplate: RegexTemplate = {
      id: createRegexTemplateId(),
      name,
      pattern: regexConfig.pattern ?? '',
      flags: regexConfig.flags ?? '',
      mode: regexConfig.mode ?? 'group',
      matchMode: regexConfig.matchMode ?? 'first',
      groupBy: regexConfig.groupBy ?? 'match',
      outputMode: regexConfig.outputMode ?? 'object',
      includeUnmatched: regexConfig.includeUnmatched ?? true,
      unmatchedKey: regexConfig.unmatchedKey ?? '__unmatched__',
      splitLines: regexConfig.splitLines ?? true,
      createdAt: new Date().toISOString(),
    };
    const next = [newTemplate, ...globalTemplates];
    void persistGlobalTemplates(next, 'Global regex template saved.');
    setTemplateName('');
  }, [globalTemplates, persistGlobalTemplates, regexConfig, templateName, toast]);

  const applyRegexTemplate = React.useCallback(
    (template: RegexTemplate, label?: string): void => {
      updateRegex({
        pattern: template.pattern,
        flags: template.flags ?? '',
        mode: template.mode ?? regexConfig.mode,
        matchMode: template.matchMode ?? regexConfig.matchMode,
        groupBy: template.groupBy ?? 'match',
        outputMode: template.outputMode ?? regexConfig.outputMode,
        includeUnmatched: template.includeUnmatched ?? regexConfig.includeUnmatched,
        unmatchedKey: template.unmatchedKey ?? regexConfig.unmatchedKey,
        splitLines: template.splitLines ?? regexConfig.splitLines,
        activeVariant: 'manual',
      });
      const prefix = label ? `${label} template applied: ` : 'Template applied: ';
      toast(`${prefix}${template.name}`, { variant: 'success' });
    },
    [regexConfig, toast, updateRegex]
  );

  const updateGlobalTemplate = React.useCallback(
    (templateId: string, patch: Partial<RegexTemplate>): void => {
      const next = globalTemplates.map((template: RegexTemplate): RegexTemplate =>
        template.id === templateId
          ? { ...template, ...patch, updatedAt: new Date().toISOString() }
          : template
      );
      void persistGlobalTemplates(next);
    },
    [globalTemplates, persistGlobalTemplates]
  );

  const removeGlobalTemplate = React.useCallback(
    (templateId: string): void => {
      const next = globalTemplates.filter((template: RegexTemplate) => template.id !== templateId);
      void persistGlobalTemplates(next, 'Global template removed.');
    },
    [globalTemplates, persistGlobalTemplates]
  );

  const updateRegexTemplate = React.useCallback(
    (templateId: string, patch: Partial<RegexTemplate>): void => {
      const next = regexTemplates.map((template: RegexTemplate): RegexTemplate =>
        template.id === templateId
          ? { ...template, ...patch, updatedAt: new Date().toISOString() }
          : template
      );
      updateRegex({ templates: next });
    },
    [regexTemplates, updateRegex]
  );

  const removeRegexTemplate = React.useCallback(
    (templateId: string): void => {
      const next = regexTemplates.filter((template: RegexTemplate) => template.id !== templateId);
      updateRegex({ templates: next });
      toast('Template removed.', { variant: 'success' });
    },
    [regexTemplates, toast, updateRegex]
  );

  const applyVariant = React.useCallback(
    (variant: 'manual' | 'ai'): void => {
      if (variant === 'ai' && regexConfig.aiProposal?.pattern) {
        const proposal = regexConfig.aiProposal;
        updateRegex({
          activeVariant: 'ai',
          pattern: proposal.pattern,
          ...(proposal.flags ?? regexConfig.flags ? { flags: proposal.flags ?? regexConfig.flags } : {}),
          ...(proposal.groupBy ?? regexConfig.groupBy ? { groupBy: proposal.groupBy ?? regexConfig.groupBy } : {}),
        });
        return;
      }
      if (variant === 'manual' && regexConfig.manual?.pattern) {
        const manual = regexConfig.manual;
        updateRegex({
          activeVariant: 'manual',
          pattern: manual.pattern,
          ...(manual.flags ?? regexConfig.flags ? { flags: manual.flags ?? regexConfig.flags } : {}),
          ...(manual.groupBy ?? regexConfig.groupBy ? { groupBy: manual.groupBy ?? regexConfig.groupBy } : {}),
        });
        return;
      }
      updateRegex({ activeVariant: variant });
    },
    [regexConfig, updateRegex]
  );

  const addAiProposal = React.useCallback(
    (proposal: { pattern: string; flags?: string; groupBy?: string }): void => {
      const normalized = {
        pattern: proposal.pattern.trim(),
        flags: (proposal.flags ?? '').trim(),
        groupBy: (proposal.groupBy ?? '').trim(),
        createdAt: new Date().toISOString(),
      };
      if (!normalized.pattern) return;
      const exists = aiProposals.some(
        (item: { pattern: string; flags?: string | undefined; groupBy?: string | undefined }) =>
          item.pattern === normalized.pattern &&
          (item.flags ?? '') === normalized.flags &&
          (item.groupBy ?? '') === normalized.groupBy
      );
      if (exists) return;
      const next = [normalized, ...aiProposals].slice(0, 8);
      updateRegex({ aiProposals: next });
    },
    [aiProposals, updateRegex]
  );

  const clearPendingAiRegex = React.useCallback((): void => {
    setPendingAiRegex('');
    setSelectedSnippetIndex(-1);
  }, []);

  const updateVariantField = React.useCallback(
    (field: 'pattern' | 'flags' | 'groupBy', value: string): void => {
      const patch: Partial<RegexConfig> = { [field]: value };
      if (activeVariant === 'ai' && regexConfig.aiProposal?.pattern) {
        patch.aiProposal = { ...regexConfig.aiProposal, [field]: value };
      } else if (activeVariant === 'manual' && regexConfig.manual?.pattern) {
        patch.manual = { ...regexConfig.manual, [field]: value };
      }
      updateRegex(patch);
    },
    [activeVariant, regexConfig.aiProposal, regexConfig.manual, updateRegex]
  );

  const codeSnippets = React.useMemo((): string[] => {
    if (!pendingAiRegex) return [];
    return extractCodeSnippets(pendingAiRegex);
  }, [pendingAiRegex]);

  React.useEffect((): void => {
    setSelectedSnippetIndex(codeSnippets.length > 0 ? 0 : -1);
  }, [codeSnippets.length]);

  React.useEffect(() => {
    const callbackValue =
      runtimeState.inputs?.[selectedNode.id]?.['regexCallback'] ??
      runtimeState.outputs?.[selectedNode.id]?.['regexCallback'];
    const resolvedCallbackValue =
      typeof callbackValue === 'string'
        ? callbackValue
        : callbackValue !== undefined && callbackValue !== null
          ? ((): string => {
            try {
              return JSON.stringify(callbackValue, null, 2);
            } catch {
              return typeof callbackValue === 'object' ? '[Object]' : String(callbackValue as string | number | boolean);
            }
          })()
          : '';
    if (resolvedCallbackValue.trim().length === 0) return;
    if (resolvedCallbackValue === lastInjectedResponseRef.current) return;
    lastInjectedResponseRef.current = resolvedCallbackValue;
    setPendingAiRegex(resolvedCallbackValue);
    toast('AI regex ready for review.', { variant: 'success' });
  }, [runtimeState, selectedNode.id, toast]);

  const normalizedFlags = normalizeRegexFlags(regexConfig.flags);
  const pattern = regexConfig.pattern ?? '';
  const isPatternEmpty = !pattern.trim();

  const regexValidation = React.useMemo(() => {
    if (isPatternEmpty) return { ok: false, error: 'Enter a regex pattern to preview.', regex: null as RegExp | null };
    try {
      return {
        ok: true,
        error: '',
        regex: new RegExp(pattern, normalizedFlags),
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Invalid regex.',
        regex: null,
      };
    }
  }, [isPatternEmpty, pattern, normalizedFlags]);

  const runtimeSample =
    runtimeState.inputs?.[selectedNode.id]?.['value'] ??
    runtimeState.inputs?.[selectedNode.id]?.['prompt'] ??
    runtimeState.outputs?.[selectedNode.id]?.['value'] ??
    runtimeState.outputs?.[selectedNode.id]?.['prompt'] ??
    undefined;

  const sampleSource = (regexConfig.sampleText ?? '').trim() ? regexConfig.sampleText : runtimeSample;
  const splitLines = regexConfig.splitLines ?? true;
  const sampleLines = React.useMemo(
    (): string[] => buildRegexItems(sampleSource, splitLines),
    [sampleSource, splitLines]
  );

  const preview = React.useMemo(
    () => buildRegexPreview(regexConfig, regexValidation, sampleLines),
    [regexConfig, regexValidation, sampleLines]
  );

  const handleAcceptPendingAiRegex = React.useCallback((): void => {
    const candidateText =
      selectedSnippetIndex >= 0 && codeSnippets[selectedSnippetIndex]
        ? codeSnippets[selectedSnippetIndex]
        : pendingAiRegex;
    const candidate = parseRegexCandidate(candidateText);
    if (!candidate) {
      toast('Could not parse AI regex suggestion.', { variant: 'error' });
      return;
    }
    const nextManual = regexConfig.manual?.pattern
      ? regexConfig.manual
      : {
        pattern: regexConfig.pattern ?? '',
        flags: regexConfig.flags ?? '',
        groupBy: regexConfig.groupBy ?? 'match',
      };
    addAiProposal(candidate);
    updateRegex({
      pattern: candidate.pattern,
      flags: candidate.flags || normalizedFlags,
      ...(candidate.groupBy ? { groupBy: candidate.groupBy } : {}),
      activeVariant: 'ai',
      manual: nextManual,
      aiProposal: {
        pattern: candidate.pattern,
        flags: candidate.flags || normalizedFlags,
        groupBy: candidate.groupBy ?? regexConfig.groupBy ?? 'match',
      },
    });
    clearPendingAiRegex();
    toast('AI regex accepted.', { variant: 'success' });
  }, [
    addAiProposal,
    clearPendingAiRegex,
    codeSnippets,
    normalizedFlags,
    pendingAiRegex,
    regexConfig,
    selectedSnippetIndex,
    toast,
    updateRegex,
  ]);

  const pendingAiRegexSection = pendingAiRegex ? (
    <RegexPendingAiProposal
      codeSnippets={codeSnippets}
      pendingAiRegex={pendingAiRegex}
      selectedSnippetIndex={selectedSnippetIndex}
      onSelectSnippetIndex={setSelectedSnippetIndex}
      onAccept={handleAcceptPendingAiRegex}
      onReject={() => {
        clearPendingAiRegex();
        toast('AI regex rejected.', { variant: 'success' });
      }}
    />
  ) : null;

  const connectedModel = React.useMemo(() => {
    const outgoing = edges.filter((edge: Edge) => edge.from === selectedNode.id);
    const aiEdge = outgoing.find((edge: Edge) => {
      const targetNode = nodes.find((n: AiNode) => n.id === edge.to);
      return targetNode?.type === 'model';
    });
    const modelNode = aiEdge ? nodes.find((n: AiNode) => n.id === aiEdge.to && n.type === 'model') : null;
    return {
      aiEdge,
      modelNode,
      modelId: modelNode?.config?.model?.modelId,
    };
  }, [edges, nodes, selectedNode.id]);

  const sampleTextForAi = React.useMemo((): string => {
    if (typeof sampleSource === 'string') return sampleSource;
    if (sampleSource === undefined || sampleSource === null) return '';
    try {
      return JSON.stringify(sampleSource, null, 2);
    } catch {
      return typeof sampleSource === 'object' ? '[Object]' : String(sampleSource as string | number | boolean);
    }
  }, [sampleSource]);

  const resolvedAiPrompt = React.useMemo((): string => {
    const template = regexConfig.aiPrompt ?? '';
    if (!template.trim()) return '';
    const context: Record<string, unknown> = {
      ...regexConfig,
      text: sampleTextForAi,
      lines: sampleLines,
      sampleCount: sampleLines.length,
    };
    return renderTemplate(template, context, sampleTextForAi);
  }, [regexConfig, sampleLines, sampleTextForAi]);

  if (!isRegexNode) return null;
  const regexMode = regexConfig.mode ?? 'group';
  const isExtractMode = regexMode === 'extract' || regexMode === 'extract_json';

  const configContent = (
    <div className='space-y-6'>
      <div className='space-y-4'>
        <div className='flex items-start justify-between gap-3'>
          <div className='flex-1'>
            <FormField label='Regex Pattern'>
              {hasAiProposal ? (
                <div className='mt-2 flex items-center gap-2'>
                  <SelectSimple size='sm'
                    value={activeVariant}
                    onValueChange={(value: string): void => {
                      if (value === 'ai' || value === 'manual') {
                        applyVariant(value);
                      }
                    }}
                    placeholder='Select variant'
                    triggerClassName='h-8 w-[180px] border-border bg-card/70 text-xs text-white'
                    contentClassName='border-border bg-gray-900'
                    options={[
                      { value: 'manual', label: 'Manual' },
                      { value: 'ai', label: 'AI Proposal' },
                    ]}
                  />
                  <div className='text-[11px] text-gray-500'>
                    Switch between manual and AI proposal.
                  </div>
                </div>
              ) : null}
              <Input
                className='mt-2 w-full rounded-md border border-border bg-card/70 text-sm text-white'
                value={regexConfig.pattern ?? ''}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                  updateVariantField('pattern', event.target.value)
                }
                placeholder='Example: ^(?<prefix>[A-Z]+)-(?<id>\\d+)$'
              />
              <p className='mt-2 text-[11px] text-gray-500'>
                Pattern is stored without / delimiters. You can paste /pattern/flags and click Normalize.
              </p>
            </FormField>
            {aiProposals.length > 0 ? (
              <div className='mt-3 rounded-md border border-border bg-card/50 p-2'>
                <div className='mb-2 text-[11px] text-gray-300'>AI Proposal History</div>
                <div className='space-y-2'>
                  {aiProposals.map((proposal: { pattern: string; flags?: string | undefined; groupBy?: string | undefined; createdAt: string }, index: number) => (
                    <div key={`${proposal.pattern}-${proposal.createdAt}-${index}`} className='rounded border border-border/60 bg-card/60 p-2'>
                      <div className='flex items-center justify-between gap-2'>
                        <div className='text-[11px] text-gray-200 truncate'>{proposal.pattern}</div>
                        <Button
                          type='button'
                          className='h-6 rounded-md border border-emerald-700 bg-emerald-500/10 px-2 text-[10px] text-emerald-200 hover:bg-emerald-500/20'
                          onClick={() => {
                            const nextManual = regexConfig.manual?.pattern
                              ? regexConfig.manual
                              : {
                                pattern: regexConfig.pattern ?? '',
                                flags: regexConfig.flags ?? '',
                                groupBy: regexConfig.groupBy ?? 'match',
                              };
                            updateRegex({
                              pattern: proposal.pattern,
                              ...(proposal.flags ?? normalizedFlags ? { flags: proposal.flags ?? normalizedFlags } : {}),
                              ...(proposal.groupBy ?? regexConfig.groupBy ? { groupBy: proposal.groupBy ?? regexConfig.groupBy } : {}),
                              activeVariant: 'ai',
                              manual: nextManual,
                              aiProposal: {
                                pattern: proposal.pattern,
                                flags: proposal.flags ?? normalizedFlags,
                                groupBy: proposal.groupBy ?? regexConfig.groupBy ?? 'match',
                              },
                            });
                          }}
                        >
                          Use
                        </Button>
                      </div>
                      <div className='mt-1 flex flex-wrap gap-2 text-[10px] text-gray-400'>
                        <span>flags: {proposal.flags ?? normalizedFlags}</span>
                        <span>groupBy: {proposal.groupBy ?? 'match'}</span>
                        <span>{new Date(proposal.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          <div className='w-[140px]'>
            <FormField label='Flags'>
              <Input
                className='mt-2 w-full rounded-md border border-border bg-card/70 text-sm text-white'
                value={regexConfig.flags ?? ''}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                  updateVariantField('flags', event.target.value)
                }
                placeholder='gim'
              />
              <div className='mt-2 flex gap-2'>
                <Button
                  type='button'
                  className='h-7 flex-1 rounded-md border border-border px-2 text-[10px] text-gray-200 hover:bg-muted/50'
                  onClick={() => {
                    const combined = (regexConfig.pattern ?? '').trim();
                    const extracted = extractRegexLiteral(combined);
                    if (!extracted) {
                      updateVariantField('flags', normalizedFlags);
                      return;
                    }
                    updateVariantField('pattern', extracted.pattern);
                    updateVariantField('flags', normalizeRegexFlags(extracted.flags));
                  }}
                  title='Normalize flags / parse /pattern/flags if pasted into the Pattern field'
                >
                  Normalize
                </Button>
              </div>
            </FormField>
          </div>
        </div>

        <div className='rounded-md border border-border bg-card/50 p-3'>
          <div className='flex flex-wrap items-end gap-2'>
            <div className='flex-1 min-w-[200px]'>
              <FormField label='Save Regex Template'>
                <Input
                  className='mt-2 w-full rounded-md border border-border bg-card/70 text-sm text-white'
                  value={templateName}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>): void => setTemplateName(event.target.value)}
                  placeholder='Template name'
                />
              </FormField>
            </div>
            <div className='flex gap-2 mb-0.5'>
              <Button
                type='button'
                className='h-8 rounded-md border border-emerald-600/50 bg-emerald-500/10 px-3 text-[11px] text-emerald-200 hover:bg-emerald-500/20'
                onClick={saveRegexTemplate}
              >
                Save Node
              </Button>
              <Button
                type='button'
                className='h-8 rounded-md border border-sky-600/50 bg-sky-500/10 px-3 text-[11px] text-sky-200 hover:bg-sky-500/20 disabled:opacity-60'
                onClick={saveGlobalRegexTemplate}
                disabled={updateSettingMutation.isPending}
              >
                {updateSettingMutation.isPending ? 'Saving...' : 'Save Global'}
              </Button>
            </div>
          </div>
          <Hint className='mt-2'>
            Saved templates can be managed in the Templates tab. Global templates are shared across nodes/paths.
          </Hint>
        </div>

        <div className='grid grid-cols-1 gap-3 md:grid-cols-3'>
          <div>
            <Label className='text-xs text-gray-400'>Mode</Label>
            <SelectSimple size='sm'
              value={regexMode}
              onValueChange={(value: string): void =>
                updateRegex({ mode: value as NonNullable<RegexConfig['mode']> })
              }
              placeholder='Select mode'
              triggerClassName='mt-2 h-8 w-full border-border bg-card/70 text-xs text-white'
              contentClassName='border-border bg-gray-900'
              options={[
                { value: 'group', label: 'Group matches' },
                { value: 'extract', label: 'Extract value' },
                { value: 'extract_json', label: 'Extract JSON/object' },
              ]}
            />
          </div>
          <div>
            <Label className='text-xs text-gray-400'>Match Mode</Label>
            <SelectSimple size='sm'
              value={regexConfig.matchMode ?? 'first'}
              onValueChange={(value: string): void =>
                updateRegex({ matchMode: value as NonNullable<RegexConfig['matchMode']> })
              }
              placeholder='Select mode'
              triggerClassName='mt-2 h-8 w-full border-border bg-card/70 text-xs text-white'
              contentClassName='border-border bg-gray-900'
              options={[
                { value: 'first', label: 'First match' },
                { value: 'first_overall', label: 'First overall' },
                { value: 'all', label: 'All matches' },
              ]}
            />
            <p className='mt-1 text-[11px] text-gray-500'>
              First overall stops after the first match across all inputs.
            </p>
          </div>
          <div>
            <Label className='text-xs text-gray-400'>Grouped Output Mode</Label>
            <SelectSimple size='sm'
              value={regexConfig.outputMode ?? 'object'}
              onValueChange={(value: string): void =>
                updateRegex({ outputMode: value as NonNullable<RegexConfig['outputMode']> })
              }
              placeholder='Select output'
              triggerClassName='mt-2 h-8 w-full border-border bg-card/70 text-xs text-white'
              contentClassName='border-border bg-gray-900'
              options={[
                { value: 'object', label: 'Object (Record)' },
                { value: 'array', label: 'Array (Groups list)' },
              ]}
            />
          </div>
        </div>

        <div>
          <Label className='text-xs text-gray-400'>JSON Integrity Policy</Label>
          <SelectSimple size='sm'
            value={regexConfig.jsonIntegrityPolicy ?? 'repair'}
            onValueChange={(value: string): void =>
              updateRegex({
                jsonIntegrityPolicy:
                  value === 'strict' ? 'strict' : 'repair',
              })
            }
            placeholder='Select policy'
            triggerClassName='mt-2 h-8 w-full border-border bg-card/70 text-xs text-white md:w-[280px]'
            contentClassName='border-border bg-gray-900'
            options={[
              { value: 'strict', label: 'Strict (no repair)' },
              { value: 'repair', label: 'Repair malformed JSON' },
            ]}
          />
          <p className='mt-1 text-[11px] text-gray-500'>
            Applies in <span className='text-gray-300'>extract_json</span> mode.
          </p>
        </div>

        <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
          <div>
            <Label className='text-xs text-gray-400'>
              {isExtractMode ? 'Extract By' : 'Group By'}
            </Label>
            <Input
              className='mt-2 w-full rounded-md border border-border bg-card/70 text-sm text-white'
              value={regexConfig.groupBy ?? 'match'}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                updateVariantField('groupBy', event.target.value)
              }
              placeholder={isExtractMode ? 'match | 1 | amount | groups | captures' : 'match | 1 | prefix'}
            />
            <p className='mt-1 text-[11px] text-gray-500'>
              {isExtractMode ? (
                <>
                  Use <span className='text-gray-300'>match</span>, a capture index, a named group,{' '}
                  <span className='text-gray-300'>groups</span> (named-group object), or{' '}
                  <span className='text-gray-300'>captures</span> (captures array).
                  {regexMode === 'extract_json' ? (
                    <span className='mt-1 block text-gray-400'>
                      Extract JSON parses the selected value when possible.
                    </span>
                  ) : null}
                </>
              ) : (
                <>
                  Use <span className='text-gray-300'>match</span>, a capture index (1,2,...) or a named group.
                </>
              )}
            </p>
          </div>
          <div className='flex flex-col justify-between gap-2'>
            <ToggleRow
              type='switch'
              label='Split lines'
              description='Treat each line as an input item.'
              checked={regexConfig.splitLines ?? true}
              onCheckedChange={(checked: boolean) => updateRegex({ splitLines: checked })}
              className='flex-1'
            />
            <ToggleRow
              type='switch'
              label='Include unmatched'
              description={isExtractMode
                ? 'Keep non-matching inputs in matches with the fallback key.'
                : 'Keep non-matching inputs under a group key.'}
              checked={regexConfig.includeUnmatched ?? true}
              onCheckedChange={(checked: boolean) => updateRegex({ includeUnmatched: checked })}
              className='flex-1'
            />
          </div>
        </div>

        <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
          <div>
            <Label className='text-xs text-gray-400'>Unmatched Key</Label>
            <Input
              className='mt-2 w-full rounded-md border border-border bg-card/70 text-sm text-white'
              value={regexConfig.unmatchedKey ?? '__unmatched__'}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                updateRegex({ unmatchedKey: event.target.value })
              }
              placeholder='__unmatched__'
            />
          </div>
          <div className='rounded-md border border-border bg-card/50 px-3 py-2'>
            <div className='text-[11px] text-gray-300'>Validation</div>
            <div className={`mt-1 text-[11px] ${regexValidation.ok ? 'text-emerald-200' : 'text-rose-200'}`}>
              {regexValidation.ok ? 'Regex compiles' : regexValidation.error}
            </div>
            {!regexValidation.ok ? (
              <div className='mt-1 text-[11px] text-gray-500'>
                Tip: use <span className='text-gray-300'>\\\\</span> to escape backslashes in string patterns.
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className='space-y-3'>
        <div className='flex items-center justify-between'>
          <Label className='text-xs text-gray-400'>Preview Sample</Label>
          <div className='text-[11px] text-gray-500'>
            {sampleLines.length} item{sampleLines.length === 1 ? '' : 's'}
          </div>
        </div>
        <Textarea
          className='min-h-[110px] w-full rounded-md border border-border bg-card/70 font-mono text-xs text-white'
          value={typeof sampleSource === 'string' ? sampleSource : ''}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => updateRegex({ sampleText: event.target.value })}
          placeholder='Paste example strings here (one per line). Leave empty to use runtime inputs.'
        />
        <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
          <div className='rounded-md border border-border bg-card/50 p-3'>
            <div className='text-[11px] text-gray-300'>Matches</div>
            <pre className='mt-2 max-h-48 overflow-auto rounded bg-card/70 p-2 text-[11px] text-gray-200 whitespace-pre-wrap break-all'>
              {JSON.stringify(preview.matches, null, 2)}
            </pre>
          </div>
          <div className='rounded-md border border-border bg-card/50 p-3'>
            <div className='text-[11px] text-gray-300'>
              {isExtractMode ? 'Extracted Value (value port)' : 'Grouped Output'}
            </div>
            <pre className='mt-2 max-h-48 overflow-auto rounded bg-card/70 p-2 text-[11px] text-gray-200 whitespace-pre-wrap break-all'>
              {JSON.stringify(isExtractMode ? preview.extracted : preview.grouped, null, 2)}
            </pre>
          </div>
        </div>
      </div>

      {pendingAiRegexSection}

      <div className='space-y-3'>
        <div className='flex items-center justify-between'>
          <Label className='text-xs text-gray-400'>AI Prompt (Output to AI Model)</Label>
          {connectedModel.modelNode ? (
            <div className='text-[11px] text-emerald-200'>
              Connected: <span className='text-emerald-100'>{connectedModel.modelId || 'Model'}</span>
            </div>
          ) : (
            <div className='text-[11px] text-amber-200'>Not connected to AI Model</div>
          )}
        </div>
        <ToggleRow
          type='switch'
          label='Auto-run AI prompt'
          description="When off, Regex won't auto-trigger the model during path runs."
          checked={regexConfig.aiAutoRun ?? false}
          onCheckedChange={(checked: boolean) => updateRegex({ aiAutoRun: checked })}
        />

        <Textarea
          className='min-h-[120px] w-full rounded-md border border-border bg-card/70 text-sm text-white'
          value={regexConfig.aiPrompt ?? ''}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void => updateRegex({ aiPrompt: event.target.value })}
          onKeyDown={(event: React.KeyboardEvent<HTMLTextAreaElement>): void => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
              event.preventDefault();
              if (!onSendToAi || !resolvedAiPrompt.trim() || sendingToAi) return;
              void onSendToAi(selectedNode.id, resolvedAiPrompt);
            }
          }}
          placeholder='Ask the model to propose a regex. Use {{text}} / {{lines}} placeholders. (Ctrl+Enter to send)'
        />

        <div className='flex flex-wrap items-center gap-2 text-[11px] text-gray-400'>
          <span>Placeholders:</span>
          <Tooltip content={placeholderTooltips.text} side='bottom'>
            <span className='rounded-full border px-2 py-0.5 text-[10px] text-gray-200'>{'{{text}}'}</span>
          </Tooltip>
          <Tooltip content={placeholderTooltips.lines} side='bottom'>
            <span className='rounded-full border px-2 py-0.5 text-[10px] text-gray-200'>{'{{lines}}'}</span>
          </Tooltip>
          <Tooltip content={placeholderTooltips.value} side='bottom'>
            <span className='rounded-full border px-2 py-0.5 text-[10px] text-gray-200'>{'{{value}}'}</span>
          </Tooltip>
        </div>

        <div className='flex flex-wrap gap-2'>
          {onSendToAi ? (
            <Button
              type='button'
              className='h-8 rounded-md border border-sky-500/40 bg-sky-500/10 px-3 text-[11px] text-sky-200 hover:bg-sky-500/20 disabled:opacity-50'
              disabled={sendingToAi || !resolvedAiPrompt.trim()}
              onClick={() => {
                if (!resolvedAiPrompt.trim()) {
                  toast('AI prompt is empty.', { variant: 'error' });
                  return;
                }
                void onSendToAi(selectedNode.id, resolvedAiPrompt);
              }}
            >
              {sendingToAi ? 'Sending...' : 'Send to AI Model'}
            </Button>
          ) : null}
          <Button
            type='button'
            className='h-8 rounded-md border border-border px-3 text-[11px] text-gray-200 hover:bg-muted/50'
            onClick={() => {
              try {
                void navigator.clipboard.writeText(resolvedAiPrompt);
                toast('Resolved AI prompt copied.', { variant: 'success' });
              } catch {
                toast('Failed to copy.', { variant: 'error' });
              }
            }}
            disabled={!resolvedAiPrompt.trim()}
            title='Copy the resolved prompt (after placeholder substitution)'
          >
            Copy Resolved
          </Button>
        </div>
      </div>
    </div>
  );

  const templatesContent = (
    <RegexTemplatesTabContent
      regexTemplates={regexTemplates}
      globalTemplates={globalTemplates}
      settingsLoading={settingsQuery.isLoading}
      onApplyNodeTemplate={(template) => applyRegexTemplate(template)}
      onRemoveNodeTemplate={removeRegexTemplate}
      onUpdateNodeTemplate={updateRegexTemplate}
      onApplyGlobalTemplate={(template) => applyRegexTemplate(template, 'Global')}
      onRemoveGlobalTemplate={removeGlobalTemplate}
      onUpdateGlobalTemplate={updateGlobalTemplate}
    />
  );

  return (
    <div className='space-y-4'>
      <Tabs
        value={activeTab}
        onValueChange={(value: string): void => setActiveTab(value as 'config' | 'templates')}
        className='space-y-4'
      >
        <TabsList className='h-9 border border-border bg-card/60'>
          <TabsTrigger value='config'>Config</TabsTrigger>
          <TabsTrigger value='templates'>Templates</TabsTrigger>
        </TabsList>
        <TabsContent value='config'>{configContent}</TabsContent>
        <TabsContent value='templates'>{templatesContent}</TabsContent>
      </Tabs>
    </div>
  );
}
