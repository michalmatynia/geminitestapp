'use client';

import React from 'react';

import {
  AI_PATHS_REGEX_TEMPLATES_KEY,
  buildRegexTemplatesStore,
  createRegexTemplateId,
  parseRegexTemplatesStore,
  renderTemplate,
} from '@/shared/lib/ai-paths';
import type { RegexConfig, RegexTemplate } from '@/shared/lib/ai-paths';
import {
  fetchAiPathsSettingsCached,
  updateAiPathsSetting,
} from '@/shared/lib/ai-paths/settings-store-client';
import { DOCUMENTATION_MODULE_IDS } from '@/shared/lib/documentation';
import { getDocumentationTooltip } from '@/shared/lib/documentation';
import { createListQueryV2, createUpdateMutationV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui';
import { serializeSetting } from '@/shared/utils/settings-json';

import {
  buildRegexItems,
  buildRegexPreview,
  extractCodeSnippets,
  normalizeRegexFlags,
  parseRegexCandidate,
} from './regex-node-config-preview';
import { useBrainModelOptions } from '@/shared/lib/ai-brain/hooks/useBrainModelOptions';
import { RegexPendingAiProposal } from './RegexPendingAiProposal';
import { RegexTemplatesTabContent } from './RegexTemplatesTabContent';
import {
  useAiPathGraph,
  useAiPathOrchestrator,
  useAiPathRuntime,
  useAiPathSelection,
} from '../../AiPathConfigContext';

import { RegexConfigBasicTab } from './regex/RegexConfigBasicTab';
import { RegexAiProposalSection } from './regex/RegexAiProposalSection';
import { RegexPreviewSection } from './regex/RegexPreviewSection';
import { RegexAiPromptSection } from './regex/RegexAiPromptSection';

export function RegexNodeConfigSection(): React.JSX.Element | null {
  const { selectedNode } = useAiPathSelection();
  const { nodes, edges } = useAiPathGraph();
  const { runtimeState, onSendToAi, sendingToAi } = useAiPathRuntime();
  const { updateSelectedNodeConfig, toast } = useAiPathOrchestrator();
  const brainModel = useBrainModelOptions({
    capability: 'ai_paths.model',
    enabled: selectedNode?.type === 'regex',
  });
  const brainModelId = brainModel.effectiveModelId.trim();

  if (selectedNode?.type !== 'regex') return null;

  const isRegexNode = true;

  const regexConfig = React.useMemo((): RegexConfig => {
    return (
      (isRegexNode ? selectedNode.config?.regex : undefined) ?? {
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
      }
    );
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
      text:
        getDocumentationTooltip(DOCUMENTATION_MODULE_IDS.aiPaths, 'regex_placeholder_text') ??
        'Resolved sample text (from Preview Sample / runtime)',
      lines:
        getDocumentationTooltip(DOCUMENTATION_MODULE_IDS.aiPaths, 'regex_placeholder_lines') ??
        'Resolved sample items array (lines)',
      value:
        getDocumentationTooltip(DOCUMENTATION_MODULE_IDS.aiPaths, 'regex_placeholder_value') ??
        'Alias for current value (same as sample text)',
    }),
    []
  );
  const activeVariant = regexConfig.activeVariant ?? 'manual';
  const aiProposals = React.useMemo(() => regexConfig.aiProposals ?? [], [regexConfig.aiProposals]);
  const regexTemplates = React.useMemo(() => regexConfig.templates ?? [], [regexConfig.templates]);

  const settingsQuery = createListQueryV2<
    Array<{ key: string; value: string }>,
    Array<{ key: string; value: string }>
  >({
    queryKey: QUERY_KEYS.ai.aiPaths.settings(),
    queryFn: async (): Promise<Array<{ key: string; value: string }>> =>
      await fetchAiPathsSettingsCached(),
    staleTime: 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    meta: {
      source: 'ai.ai-paths.node-config.regex.settings',
      operation: 'list',
      resource: 'ai-paths.settings',
      domain: 'ai_paths',
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
  const [globalTemplates, setGlobalTemplates] =
    React.useState<RegexTemplate[]>(parsedGlobalTemplates);
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
      const next = globalTemplates.map(
        (template: RegexTemplate): RegexTemplate =>
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
      const next = regexTemplates.map(
        (template: RegexTemplate): RegexTemplate =>
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
          ...((proposal.flags ?? regexConfig.flags)
            ? { flags: proposal.flags ?? regexConfig.flags }
            : {}),
          ...((proposal.groupBy ?? regexConfig.groupBy)
            ? { groupBy: proposal.groupBy ?? regexConfig.groupBy }
            : {}),
        });
        return;
      }
      if (variant === 'manual' && regexConfig.manual?.pattern) {
        const manual = regexConfig.manual;
        updateRegex({
          activeVariant: 'manual',
          pattern: manual.pattern,
          ...((manual.flags ?? regexConfig.flags)
            ? { flags: manual.flags ?? regexConfig.flags }
            : {}),
          ...((manual.groupBy ?? regexConfig.groupBy)
            ? { groupBy: manual.groupBy ?? regexConfig.groupBy }
            : {}),
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
              return typeof callbackValue === 'object'
                ? '[Object]'
                : String(callbackValue as string | number | boolean);
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
    if (isPatternEmpty)
      return {
        ok: false,
        error: 'Enter a regex pattern to preview.',
        regex: null as RegExp | null,
      };
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

  const sampleSource = (regexConfig.sampleText ?? '').trim()
    ? regexConfig.sampleText
    : runtimeSample;
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
    const outgoing = edges.filter((edge) => edge.from === selectedNode.id);
    const aiEdge = outgoing.find((edge) => {
      const targetNode = nodes.find((n) => n.id === edge.to);
      return targetNode?.type === 'model';
    });
    const modelNode = aiEdge ? nodes.find((n) => n.id === aiEdge.to && n.type === 'model') : null;
    const selectedModelId = modelNode?.config?.model?.modelId?.trim() || '';
    return {
      aiEdge,
      modelNode,
      modelLabel: modelNode
        ? selectedModelId || `Use Brain default (${brainModelId || 'Not configured'})`
        : undefined,
      usesBrainDefault: modelNode ? !selectedModelId : undefined,
      isStale:
        modelNode && selectedModelId
          ? !brainModel.models.some((modelId: string): boolean => modelId === selectedModelId)
          : false,
    };
  }, [brainModel.models, brainModelId, edges, nodes, selectedNode.id]);

  const sampleTextForAi = React.useMemo((): string => {
    if (typeof sampleSource === 'string') return sampleSource;
    if (sampleSource === undefined || sampleSource === null) return '';
    try {
      return JSON.stringify(sampleSource, null, 2);
    } catch {
      return typeof sampleSource === 'object'
        ? '[Object]'
        : String(sampleSource as string | number | boolean);
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
        <RegexAiProposalSection
          regexConfig={regexConfig}
          hasAiProposal={hasAiProposal}
          activeVariant={activeVariant}
          onApplyVariant={applyVariant}
          aiProposals={aiProposals}
          onUseProposal={(proposal) => {
            const nextManual = regexConfig.manual?.pattern
              ? regexConfig.manual
              : {
                pattern: regexConfig.pattern ?? '',
                flags: regexConfig.flags ?? '',
                groupBy: regexConfig.groupBy ?? 'match',
              };
            updateRegex({
              pattern: proposal.pattern,
              ...((proposal.flags ?? normalizedFlags)
                ? { flags: proposal.flags ?? normalizedFlags }
                : {}),
              ...((proposal.groupBy ?? regexConfig.groupBy)
                ? { groupBy: proposal.groupBy ?? regexConfig.groupBy }
                : {}),
              activeVariant: 'ai',
              manual: nextManual,
              aiProposal: {
                pattern: proposal.pattern,
                flags: proposal.flags ?? normalizedFlags,
                groupBy: proposal.groupBy ?? regexConfig.groupBy ?? 'match',
              },
            });
          }}
          normalizedFlags={normalizedFlags}
        />

        <RegexConfigBasicTab
          regexConfig={regexConfig}
          onUpdateVariantField={updateVariantField}
          onUpdateRegex={updateRegex}
          templateName={templateName}
          onTemplateNameChange={setTemplateName}
          onSaveNodeTemplate={saveRegexTemplate}
          onSaveGlobalTemplate={saveGlobalRegexTemplate}
          isSavingGlobal={updateSettingMutation.isPending}
          isExtractMode={isExtractMode}
          regexMode={regexMode}
          regexValidation={regexValidation}
        />
      </div>

      <RegexPreviewSection
        sampleLines={sampleLines}
        sampleSource={typeof sampleSource === 'string' ? sampleSource : ''}
        onSampleChange={(val) => updateRegex({ sampleText: val })}
        isExtractMode={isExtractMode}
        preview={preview}
      />

      {pendingAiRegexSection}

      <RegexAiPromptSection
        regexConfig={regexConfig}
        onUpdateRegex={updateRegex}
        connectedModel={connectedModel}
        onSendToAi={onSendToAi}
        sendingToAi={sendingToAi}
        resolvedAiPrompt={resolvedAiPrompt}
        nodeId={selectedNode.id}
        placeholderTooltips={placeholderTooltips}
      />
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
