'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronUp } from 'lucide-react';
import React from 'react';

import {
  AI_PATHS_REGEX_TEMPLATES_KEY,
  buildRegexTemplatesStore,
  createRegexTemplateId,
  parseRegexTemplatesStore,
  parseJsonSafe,
  renderTemplate,
} from '@/features/ai/ai-paths/lib';
import type { AiNode, Edge, RegexConfig, RegexTemplate } from '@/features/ai/ai-paths/lib';
import {
  fetchAiPathsSettingsCached,
  updateAiPathsSetting,
} from '@/features/ai/ai-paths/lib/settings-store-client';
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  Tooltip,
} from '@/shared/ui';
import { serializeSetting } from '@/shared/utils/settings-json';

import { useAiPathConfig } from '../../AiPathConfigContext';

type RegexCandidate = {
  pattern: string;
  flags: string;
  groupBy?: string;
};

type RegexPreviewRecord = {
  input: string;
  match: string | null;
  index: number | null;
  captures: string[];
  groups: Record<string, string> | null;
  key: string;
  extracted: unknown;
};

/** Extract code blocks from markdown-style ``` delimiters */
function extractCodeSnippets(text: string): string[] {
  const regex = /```[\w]*\n?([\s\S]*?)```/g;
  const snippets: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const code = match[1]?.trim();
    if (code) snippets.push(code);
  }
  return snippets;
}

const normalizeRegexFlags = (flags: string | undefined): string => {
  if (!flags) return '';
  const allowed = new Set(['d', 'g', 'i', 'm', 's', 'u', 'v', 'y']);
  const seen = new Set<string>();
  const normalized = Array.from(flags)
    .filter((ch: string) => allowed.has(ch))
    .filter((ch: string) => {
      if (seen.has(ch)) return false;
      seen.add(ch);
      return true;
    });
  const order = ['d', 'g', 'i', 'm', 's', 'u', 'v', 'y'];
  normalized.sort((a: string, b: string) => order.indexOf(a) - order.indexOf(b));
  return normalized.join('');
};

const extractRegexLiteral = (value: string): { pattern: string; flags: string } | null => {
  const s = value.trim();
  if (!s.startsWith('/')) return null;
  let pattern = '';
  let escaped = false;
  let i = 1;
  for (; i < s.length; i += 1) {
    const ch = s[i]!;
    if (escaped) {
      pattern += ch;
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      pattern += ch;
      escaped = true;
      continue;
    }
    if (ch === '/') break;
    pattern += ch;
  }
  if (i >= s.length) return null;
  const flagsMatch = s.slice(i + 1).match(/^[dgimsuvy]*/);
  const flags = flagsMatch?.[0] ?? '';
  return { pattern, flags };
};

const parseRegexCandidate = (raw: string): RegexCandidate | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // JSON: {"pattern":"...","flags":"...","groupBy":"..."}
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const record = parsed as Record<string, unknown>;
      if (typeof record['pattern'] === 'string' && record['pattern'].trim()) {
        return {
          pattern: record['pattern'].trim(),
          flags: typeof record['flags'] === 'string' ? normalizeRegexFlags(record['flags']) : '',
          ...(typeof record['groupBy'] === 'string' ? { groupBy: record['groupBy'] } : {}),
        };
      }
      if (typeof record['regex'] === 'string' && record['regex'].trim()) {
        const literal = extractRegexLiteral(record['regex']);
        if (literal) return { pattern: literal.pattern, flags: normalizeRegexFlags(literal.flags) };
        return { pattern: record['regex'].trim(), flags: '' };
      }
    }
  } catch {
    // ignore
  }

  // Regex literal: /.../gim
  const literal = extractRegexLiteral(trimmed);
  if (literal) {
    return {
      pattern: literal.pattern,
      flags: normalizeRegexFlags(literal.flags),
    };
  }

  // Heuristic: "pattern: ..." and optional "flags: ..."
  const patternLine = trimmed.match(/(?:^|\n)\s*pattern\s*[:=]\s*(.+)\s*$/im);
  if (patternLine?.[1]) {
    const patternValue = patternLine[1].trim();
    const flagsLine = trimmed.match(/(?:^|\n)\s*flags\s*[:=]\s*([dgimsuvy]+)\s*$/im);
    const groupByLine = trimmed.match(/(?:^|\n)\s*groupBy\s*[:=]\s*(.+)\s*$/im);
    const extracted = extractRegexLiteral(patternValue);
    return {
      pattern: extracted ? extracted.pattern : patternValue.replace(/^"|"$/g, '').replace(/^'|'$/g, ''),
      flags: normalizeRegexFlags(flagsLine?.[1] ?? (extracted?.flags ?? '')),
      ...(groupByLine?.[1] ? { groupBy: groupByLine[1].trim() } : {}),
    };
  }

  // Fallback: treat as pattern string
  return { pattern: trimmed, flags: '' };
};

const buildRegexItems = (value: unknown, splitLines: boolean): string[] => {
  if (value === undefined || value === null) return [];
  const list = Array.isArray(value) ? value : [value];
  return list.flatMap((item: unknown): string[] => {
    if (item === undefined || item === null) return [];
    const asString = typeof item === 'string' ? item : JSON.stringify(item, null, 2);
    if (!asString) return [];
    if (!splitLines) return [asString];
    return asString
      .split(/\r?\n/)
      .map((line: string) => line.trim())
      .filter(Boolean);
  });
};

const stringifyRegexSelection = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value === undefined || value === null) return '';
  try {
    return JSON.stringify(value);
  } catch {
    return typeof value === 'object' ? '[Object]' : String(value as string | number | boolean);
  }
};

const resolveRegexSelection = (match: RegExpExecArray, selector: string | undefined): unknown => {
  const key = (selector ?? 'match').trim();
  if (!key || key === 'match' || key === '0') {
    return match[0] ?? null;
  }
  if (key === 'captures') {
    return match.slice(1).map((value: string | undefined) => value ?? '');
  }
  const rawGroups =
    match.groups && typeof match.groups === 'object'
      ? (match.groups as Record<string, string | undefined>)
      : null;
  const groups =
    rawGroups
      ? (Object.fromEntries(
        Object.entries(rawGroups).map(([name, value]: [string, string | undefined]) => [name, value ?? ''])
      ) as Record<string, string>)
      : null;
  if (key === 'groups') {
    return groups;
  }
  const asIndex = Number(key);
  if (Number.isInteger(asIndex)) {
    return match[asIndex] ?? null;
  }
  const candidate = rawGroups ? rawGroups[key] : undefined;
  if (typeof candidate === 'string') return candidate;
  if (candidate === undefined || candidate === null) return null;
  return stringifyRegexSelection(candidate);
};

const resolveGroupKey = (match: RegExpExecArray, groupBy: string | undefined): string | null => {
  const selected = resolveRegexSelection(match, groupBy);
  if (selected === undefined || selected === null) return null;
  if (typeof selected === 'string') return selected;
  return stringifyRegexSelection(selected);
};

const parseRegexExtractedJson = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(parseRegexExtractedJson);
  if (value && typeof value === 'object') return value;
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  const parsed = parseJsonSafe(trimmed);
  return parsed === undefined ? value : parsed;
};

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

  if (!selectedNode || selectedNode.type !== 'regex') return null;

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
  const activeVariant = regexConfig.activeVariant ?? 'manual';
  const aiProposals = React.useMemo(() => regexConfig.aiProposals ?? [], [regexConfig.aiProposals]);
  const regexTemplates = React.useMemo(() => regexConfig.templates ?? [], [regexConfig.templates]);
  const settingsQuery = useQuery({
    queryKey: ['ai-paths-settings'],
    queryFn: async (): Promise<Array<{ key: string; value: string }>> =>
      await fetchAiPathsSettingsCached({ bypassCache: true }),
  });
  const updateSettingMutation = useMutation({
    mutationFn: async (payload: { key: string; value: string }): Promise<void> => {
      await updateAiPathsSetting(payload.key, payload.value);
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
      runtimeState.inputs[selectedNode.id]?.['regexCallback'] ??
      runtimeState.outputs[selectedNode.id]?.['regexCallback'];
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
    runtimeState.inputs[selectedNode.id]?.['value'] ??
    runtimeState.inputs[selectedNode.id]?.['prompt'] ??
    runtimeState.outputs[selectedNode.id]?.['value'] ??
    runtimeState.outputs[selectedNode.id]?.['prompt'] ??
    undefined;

  const sampleSource = (regexConfig.sampleText ?? '').trim() ? regexConfig.sampleText : runtimeSample;
  const splitLines = regexConfig.splitLines ?? true;
  const sampleLines = React.useMemo(
    (): string[] => buildRegexItems(sampleSource, splitLines),
    [sampleSource, splitLines]
  );

  const preview = React.useMemo(() => {
    const mode = regexConfig.mode ?? 'group';
    const isExtractMode = mode === 'extract' || mode === 'extract_json';
    const shouldParse = mode === 'extract_json';
    const includeUnmatched = regexConfig.includeUnmatched ?? true;
    const unmatchedKey = (regexConfig.unmatchedKey ?? '__unmatched__').trim() || '__unmatched__';
    const matchMode = regexConfig.matchMode ?? 'first';
    const groupBy = regexConfig.groupBy ?? 'match';

    const matches: RegexPreviewRecord[] = [];
    const groupedMap = new Map<string, RegexPreviewRecord[]>();
    const pushGrouped = (key: string, record: RegexPreviewRecord): void => {
      const current = groupedMap.get(key) ?? [];
      current.push(record);
      groupedMap.set(key, current);
    };

    if (!regexValidation.ok || !regexValidation.regex) {
      return {
        matches,
        grouped: regexConfig.outputMode === 'array' ? [] : {},
        extracted: null,
      };
    }

    const compiled = regexValidation.regex;
    const nonGlobalRegex =
      compiled && matchMode !== 'all' && compiled.flags.includes('g')
        ? new RegExp(compiled.source, compiled.flags.replace('g', ''))
        : compiled;

    if (matchMode === 'first_overall') {
      let found = false;
      for (const input of sampleLines) {
        if (!nonGlobalRegex) break;
        nonGlobalRegex.lastIndex = 0;
        const match = nonGlobalRegex.exec(input);
        if (!match) continue;
        found = true;
        const key = resolveGroupKey(match, groupBy) ?? unmatchedKey;
        const groups =
          match.groups && typeof match.groups === 'object'
            ? (Object.fromEntries(
              Object.entries(match.groups).map(([k, v]: [string, string | undefined]) => [k, v ?? ''])
            ) as Record<string, string>)
            : null;
        const extracted = shouldParse
          ? parseRegexExtractedJson(resolveRegexSelection(match, groupBy))
          : resolveRegexSelection(match, groupBy);
        const record: RegexPreviewRecord = {
          input,
          match: match[0] ?? null,
          index: typeof match.index === 'number' ? match.index : null,
          captures: match.slice(1).map((value: string | undefined) => value ?? ''),
          groups,
          key,
          extracted,
        };
        matches.push(record);
        pushGrouped(key, record);
        break;
      }

      if (!found && includeUnmatched && sampleLines.length > 0) {
        const record: RegexPreviewRecord = {
          input: sampleLines[0] ?? '',
          match: null,
          index: null,
          captures: [],
          groups: null,
          key: unmatchedKey,
          extracted: null,
        };
        matches.push(record);
        pushGrouped(unmatchedKey, record);
      }
    } else {
      sampleLines.forEach((input: string) => {
        if (matchMode === 'all' && compiled) {
          const flagsWithG = compiled.flags.includes('g') ? compiled.flags : `${compiled.flags}g`;
          const regexAll = new RegExp(compiled.source, flagsWithG);
          let found = false;
          let match: RegExpExecArray | null;
          while ((match = regexAll.exec(input)) !== null) {
            found = true;
            const key = resolveGroupKey(match, groupBy) ?? unmatchedKey;
            const groups =
              match.groups && typeof match.groups === 'object'
                ? (Object.fromEntries(
                  Object.entries(match.groups).map(([k, v]: [string, string | undefined]) => [k, v ?? ''])
                ) as Record<string, string>)
                : null;
            const extracted = shouldParse
              ? parseRegexExtractedJson(resolveRegexSelection(match, groupBy))
              : resolveRegexSelection(match, groupBy);
            const record: RegexPreviewRecord = {
              input,
              match: match[0] ?? null,
              index: typeof match.index === 'number' ? match.index : null,
              captures: match.slice(1).map((value: string | undefined) => value ?? ''),
              groups,
              key,
              extracted,
            };
            matches.push(record);
            pushGrouped(key, record);
            if (match[0] === '') {
              regexAll.lastIndex = Math.min(input.length, regexAll.lastIndex + 1);
            }
          }
          if (!found && includeUnmatched) {
            const record: RegexPreviewRecord = {
              input,
              match: null,
              index: null,
              captures: [],
              groups: null,
              key: unmatchedKey,
              extracted: null,
            };
            matches.push(record);
            pushGrouped(unmatchedKey, record);
          }
          return;
        }

        if (nonGlobalRegex) {
          nonGlobalRegex.lastIndex = 0;
        }
        const match = nonGlobalRegex ? nonGlobalRegex.exec(input) : null;
        if (!match) {
          if (!includeUnmatched) return;
          const record: RegexPreviewRecord = {
            input,
            match: null,
            index: null,
            captures: [],
            groups: null,
            key: unmatchedKey,
            extracted: null,
          };
          matches.push(record);
          pushGrouped(unmatchedKey, record);
          return;
        }
        const key = resolveGroupKey(match, groupBy) ?? unmatchedKey;
        const groups =
          match.groups && typeof match.groups === 'object'
            ? (Object.fromEntries(
              Object.entries(match.groups).map(([k, v]: [string, string | undefined]) => [k, v ?? ''])
            ) as Record<string, string>)
            : null;
        const extracted = shouldParse
          ? parseRegexExtractedJson(resolveRegexSelection(match, groupBy))
          : resolveRegexSelection(match, groupBy);
        const record: RegexPreviewRecord = {
          input,
          match: match[0] ?? null,
          index: typeof match.index === 'number' ? match.index : null,
          captures: match.slice(1).map((value: string | undefined) => value ?? ''),
          groups,
          key,
          extracted,
        };
        matches.push(record);
        pushGrouped(key, record);
      });
    }

    const groupedObject = Object.fromEntries(groupedMap.entries());
    const grouped =
      regexConfig.outputMode === 'array'
        ? Object.entries(groupedObject).map(([key, items]: [string, RegexPreviewRecord[]]) => ({ key, items }))
        : groupedObject;
    const extractedValues = matches
      .filter((record: RegexPreviewRecord): boolean => record.match !== null)
      .map((record: RegexPreviewRecord): unknown => record.extracted);
    const extracted = extractedValues.length <= 1 ? (extractedValues[0] ?? null) : extractedValues;

    return {
      matches,
      grouped,
      extracted: isExtractMode ? extracted : null,
    };
  }, [regexConfig, regexValidation, sampleLines]);

  const pendingAiRegexSection = pendingAiRegex ? (
    <div className='rounded-md border border-purple-500/40 bg-purple-500/10 p-3'>
      <div className='flex items-center justify-between gap-2'>
        <div className='flex items-center gap-2'>
          <div className='h-2 w-2 rounded-full bg-purple-400'></div>
          <span className='text-xs text-purple-100'>AI regex ready for review</span>
          {codeSnippets.length > 0 ? (
            <span className='text-[10px] text-purple-300'>
              ({codeSnippets.length} code snippet{codeSnippets.length > 1 ? 's' : ''})
            </span>
          ) : null}
        </div>
        <div className='flex gap-2'>
          <Button
            type='button'
            className='h-7 rounded-md border border-emerald-700 bg-emerald-500/10 px-3 text-[10px] text-emerald-200 hover:bg-emerald-500/20'
            onClick={() => {
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
            }}
          >
            {selectedSnippetIndex >= 0 && codeSnippets.length > 0
              ? `Accept Snippet ${selectedSnippetIndex + 1}`
              : 'Accept'}
          </Button>
          <Button
            type='button'
            className='h-7 rounded-md border border-rose-700 bg-rose-500/10 px-3 text-[10px] text-rose-200 hover:bg-rose-500/20'
            onClick={() => {
              clearPendingAiRegex();
              toast('AI regex rejected.', { variant: 'success' });
            }}
          >
            Reject
          </Button>
        </div>
      </div>

      {codeSnippets.length > 0 ? (
        <div className='mt-2 flex items-center gap-2'>
          <div className='flex flex-col'>
            <Button
              type='button'
              className='h-5 w-5 rounded-sm border border-purple-600 bg-purple-500/20 p-0 text-purple-200 hover:bg-purple-500/40 disabled:opacity-30'
              disabled={selectedSnippetIndex <= 0}
              onClick={() => setSelectedSnippetIndex((prev: number) => Math.max(0, prev - 1))}
            >
              <ChevronUp className='h-3 w-3' />
            </Button>
            <Button
              type='button'
              className='h-5 w-5 rounded-sm border border-purple-600 bg-purple-500/20 p-0 text-purple-200 hover:bg-purple-500/40 disabled:opacity-30'
              disabled={selectedSnippetIndex >= codeSnippets.length - 1}
              onClick={() =>
                setSelectedSnippetIndex((prev: number) => Math.min(codeSnippets.length - 1, prev + 1))
              }
            >
              <ChevronDown className='h-3 w-3' />
            </Button>
          </div>
          <div className='flex-1 rounded-md border border-cyan-600/50 bg-cyan-500/10 p-2'>
            <div className='mb-1 flex items-center justify-between'>
              <span className='text-[10px] text-cyan-300'>
                Snippet {selectedSnippetIndex + 1} of {codeSnippets.length}
              </span>
              <Button
                type='button'
                className='h-5 rounded-sm border border-gray-600 bg-gray-500/20 px-2 text-[9px] text-gray-300 hover:bg-gray-500/40'
                onClick={() => setSelectedSnippetIndex(-1)}
              >
                Show Full Response
              </Button>
            </div>
            <pre className='max-h-20 overflow-auto rounded bg-card/70 p-2 text-[11px] text-cyan-100 whitespace-pre-wrap break-all'>
              {codeSnippets[selectedSnippetIndex]}
            </pre>
          </div>
        </div>
      ) : null}

      {selectedSnippetIndex < 0 || codeSnippets.length === 0 ? (
        <pre className='mt-2 max-h-28 overflow-auto rounded-md bg-card/70 p-2 text-[11px] text-gray-300 whitespace-pre-wrap break-all'>
          {pendingAiRegex}
        </pre>
      ) : null}
    </div>
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
            <Label className='text-xs text-gray-400'>Regex Pattern</Label>
            {hasAiProposal ? (
              <div className='mt-2 flex items-center gap-2'>
                <Select
                  value={activeVariant}
                  onValueChange={(value: string): void => {
                    if (value === 'ai' || value === 'manual') {
                      applyVariant(value);
                    }
                  }}
                >
                  <SelectTrigger className='h-8 w-[180px] border-border bg-card/70 text-xs text-white'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className='border-border bg-gray-900'>
                    <SelectItem value='manual'>Manual</SelectItem>
                    <SelectItem value='ai'>AI Proposal</SelectItem>
                  </SelectContent>
                </Select>
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
            <Label className='text-xs text-gray-400'>Flags</Label>
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
          </div>
        </div>

        <div className='rounded-md border border-border bg-card/50 p-3'>
          <div className='flex flex-wrap items-end gap-2'>
            <div className='flex-1 min-w-[200px]'>
              <Label className='text-xs text-gray-400'>Save Regex Template</Label>
              <Input
                className='mt-2 w-full rounded-md border border-border bg-card/70 text-sm text-white'
                value={templateName}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void => setTemplateName(event.target.value)}
                placeholder='Template name'
              />
            </div>
            <div className='flex gap-2'>
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
          <div className='mt-2 text-[11px] text-gray-500'>
            Saved templates can be managed in the Templates tab. Global templates are shared across nodes/paths.
          </div>
        </div>

        <div className='grid grid-cols-1 gap-3 md:grid-cols-3'>
          <div>
            <Label className='text-xs text-gray-400'>Mode</Label>
            <Select
              value={regexMode}
              onValueChange={(value: string): void =>
                updateRegex({ mode: value as NonNullable<RegexConfig['mode']> })
              }
            >
              <SelectTrigger className='mt-2 h-8 w-full border-border bg-card/70 text-xs text-white'>
                <SelectValue placeholder='Select mode' />
              </SelectTrigger>
              <SelectContent className='border-border bg-gray-900'>
                <SelectItem value='group'>Group matches</SelectItem>
                <SelectItem value='extract'>Extract value</SelectItem>
                <SelectItem value='extract_json'>Extract JSON/object</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className='text-xs text-gray-400'>Match Mode</Label>
            <Select
              value={regexConfig.matchMode ?? 'first'}
              onValueChange={(value: string): void =>
                updateRegex({ matchMode: value as NonNullable<RegexConfig['matchMode']> })
              }
            >
              <SelectTrigger className='mt-2 h-8 w-full border-border bg-card/70 text-xs text-white'>
                <SelectValue placeholder='Select mode' />
              </SelectTrigger>
              <SelectContent className='border-border bg-gray-900'>
                <SelectItem value='first'>First match</SelectItem>
                <SelectItem value='first_overall'>First overall</SelectItem>
                <SelectItem value='all'>All matches</SelectItem>
              </SelectContent>
            </Select>
            <p className='mt-1 text-[11px] text-gray-500'>
              First overall stops after the first match across all inputs.
            </p>
          </div>
          <div>
            <Label className='text-xs text-gray-400'>Grouped Output Mode</Label>
            <Select
              value={regexConfig.outputMode ?? 'object'}
              onValueChange={(value: string): void =>
                updateRegex({ outputMode: value as NonNullable<RegexConfig['outputMode']> })
              }
            >
              <SelectTrigger className='mt-2 h-8 w-full border-border bg-card/70 text-xs text-white'>
                <SelectValue placeholder='Select output' />
              </SelectTrigger>
              <SelectContent className='border-border bg-gray-900'>
                <SelectItem value='object'>Object (Record)</SelectItem>
                <SelectItem value='array'>Array (Groups list)</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
          <div className='flex flex-col justify-between'>
            <div className='flex items-center justify-between rounded-md border border-border bg-card/50 px-3 py-2'>
              <div>
                <div className='text-[11px] text-gray-300'>Split lines</div>
                <div className='text-[11px] text-gray-500'>Treat each line as an input item.</div>
              </div>
              <Switch
                checked={regexConfig.splitLines ?? true}
                onCheckedChange={(checked: boolean) => updateRegex({ splitLines: checked })}
              />
            </div>
            <div className='mt-2 flex items-center justify-between rounded-md border border-border bg-card/50 px-3 py-2'>
              <div>
                <div className='text-[11px] text-gray-300'>Include unmatched</div>
                <div className='text-[11px] text-gray-500'>
                  {isExtractMode
                    ? 'Keep non-matching inputs in matches with the fallback key.'
                    : 'Keep non-matching inputs under a group key.'}
                </div>
              </div>
              <Switch
                checked={regexConfig.includeUnmatched ?? true}
                onCheckedChange={(checked: boolean) => updateRegex({ includeUnmatched: checked })}
              />
            </div>
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
        <div className='flex items-center justify-between rounded-md border border-border bg-card/50 px-3 py-2'>
          <div>
            <div className='text-[11px] text-gray-300'>Auto-run AI prompt</div>
            <div className='text-[11px] text-gray-500'>
              When off, Regex won&apos;t auto-trigger the model during path runs.
            </div>
          </div>
          <Switch
            checked={regexConfig.aiAutoRun ?? false}
            onCheckedChange={(checked: boolean) => updateRegex({ aiAutoRun: checked })}
          />
        </div>

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
          <Tooltip content='Resolved sample text (from Preview Sample / runtime)' side='bottom'>
            <span className='rounded-full border px-2 py-0.5 text-[10px] text-gray-200'>{'{{text}}'}</span>
          </Tooltip>
          <Tooltip content='Resolved sample items array (lines)' side='bottom'>
            <span className='rounded-full border px-2 py-0.5 text-[10px] text-gray-200'>{'{{lines}}'}</span>
          </Tooltip>
          <Tooltip content='Alias for current value (same as sample text)' side='bottom'>
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
    <div className='space-y-6'>
      <div className='rounded-md border border-border/60 bg-card/50 p-3 text-[11px] text-gray-400'>
        Local templates live on this node. Global templates are shared across all nodes/paths.
      </div>

      <div className='space-y-4'>
        <div className='flex items-center justify-between'>
          <Label className='text-xs text-gray-400'>Node Templates</Label>
          <span className='text-[11px] text-gray-500'>{regexTemplates.length} saved</span>
        </div>
        {regexTemplates.length === 0 ? (
          <div className='rounded-md border border-dashed border-border/70 bg-card/40 p-4 text-xs text-gray-400'>
            No node templates yet. Save one from the Config tab.
          </div>
        ) : (
          <div className='space-y-4'>
            {regexTemplates.map((template: RegexTemplate) => (
              <div key={template.id} className='rounded-md border border-border bg-card/60 p-3 space-y-3'>
                <div className='flex flex-wrap items-center justify-between gap-3'>
                  <div className='min-w-[220px] flex-1'>
                    <Label className='text-[10px] text-gray-400'>Template Name</Label>
                    <Input
                      className='mt-1 w-full rounded-md border border-border bg-card/70 text-sm text-white'
                      value={template.name}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                        updateRegexTemplate(template.id, { name: event.target.value })
                      }
                    />
                  </div>
                  <div className='flex gap-2'>
                    <Button
                      type='button'
                      className='h-8 rounded-md border border-emerald-600/50 bg-emerald-500/10 px-3 text-[11px] text-emerald-200 hover:bg-emerald-500/20'
                      onClick={() => applyRegexTemplate(template)}
                    >
                      Apply
                    </Button>
                    <Button
                      type='button'
                      className='h-8 rounded-md border border-rose-600/50 bg-rose-500/10 px-3 text-[11px] text-rose-200 hover:bg-rose-500/20'
                      onClick={() => removeRegexTemplate(template.id)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>

                <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                  <div>
                    <Label className='text-[10px] text-gray-400'>Pattern</Label>
                    <Input
                      className='mt-1 w-full rounded-md border border-border bg-card/70 text-sm text-white'
                      value={template.pattern}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                        updateRegexTemplate(template.id, { pattern: event.target.value })
                      }
                    />
                  </div>
                  <div className='grid grid-cols-2 gap-2'>
                    <div>
                      <Label className='text-[10px] text-gray-400'>Flags</Label>
                      <Input
                        className='mt-1 w-full rounded-md border border-border bg-card/70 text-sm text-white'
                        value={template.flags ?? ''}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                          updateRegexTemplate(template.id, { flags: event.target.value })
                        }
                        placeholder='gim'
                      />
                    </div>
                    <div>
                      <Label className='text-[10px] text-gray-400'>Group By</Label>
                      <Input
                        className='mt-1 w-full rounded-md border border-border bg-card/70 text-sm text-white'
                        value={template.groupBy ?? 'match'}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                          updateRegexTemplate(template.id, { groupBy: event.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className='grid grid-cols-1 gap-3 md:grid-cols-3'>
                  <div>
                    <Label className='text-[10px] text-gray-400'>Mode</Label>
                    <Select
                      value={template.mode ?? 'group'}
                      onValueChange={(value: string): void =>
                        updateRegexTemplate(template.id, { mode: value as RegexConfig['mode'] })
                      }
                    >
                      <SelectTrigger className='mt-1 h-8 w-full border-border bg-card/70 text-xs text-white'>
                        <SelectValue placeholder='Select mode' />
                      </SelectTrigger>
                      <SelectContent className='border-border bg-gray-900'>
                        <SelectItem value='group'>Group matches</SelectItem>
                        <SelectItem value='extract'>Extract value</SelectItem>
                        <SelectItem value='extract_json'>Extract JSON/object</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className='text-[10px] text-gray-400'>Match Mode</Label>
                    <Select
                      value={template.matchMode ?? 'first'}
                      onValueChange={(value: string): void =>
                        updateRegexTemplate(template.id, { matchMode: value as RegexConfig['matchMode'] })
                      }
                    >
                      <SelectTrigger className='mt-1 h-8 w-full border-border bg-card/70 text-xs text-white'>
                        <SelectValue placeholder='Select mode' />
                      </SelectTrigger>
                      <SelectContent className='border-border bg-gray-900'>
                        <SelectItem value='first'>First match</SelectItem>
                        <SelectItem value='first_overall'>First overall</SelectItem>
                        <SelectItem value='all'>All matches</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className='text-[10px] text-gray-400'>Output Mode</Label>
                    <Select
                      value={template.outputMode ?? 'object'}
                      onValueChange={(value: string): void =>
                        updateRegexTemplate(template.id, { outputMode: value as RegexConfig['outputMode'] })
                      }
                    >
                      <SelectTrigger className='mt-1 h-8 w-full border-border bg-card/70 text-xs text-white'>
                        <SelectValue placeholder='Select output' />
                      </SelectTrigger>
                      <SelectContent className='border-border bg-gray-900'>
                        <SelectItem value='object'>Object (Record)</SelectItem>
                        <SelectItem value='array'>Array (Groups list)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                  <div className='flex items-center justify-between rounded-md border border-border bg-card/50 px-3 py-2'>
                    <div>
                      <div className='text-[11px] text-gray-300'>Split lines</div>
                      <div className='text-[11px] text-gray-500'>Treat each line as an input item.</div>
                    </div>
                    <Switch
                      checked={template.splitLines ?? true}
                      onCheckedChange={(checked: boolean) => updateRegexTemplate(template.id, { splitLines: checked })}
                    />
                  </div>
                  <div className='flex items-center justify-between rounded-md border border-border bg-card/50 px-3 py-2'>
                    <div>
                      <div className='text-[11px] text-gray-300'>Include unmatched</div>
                      <div className='text-[11px] text-gray-500'>
                        Keep non-matching inputs under a group key.
                      </div>
                    </div>
                    <Switch
                      checked={template.includeUnmatched ?? true}
                      onCheckedChange={(checked: boolean) =>
                        updateRegexTemplate(template.id, { includeUnmatched: checked })
                      }
                    />
                  </div>
                </div>

                <div>
                  <Label className='text-[10px] text-gray-400'>Unmatched Key</Label>
                  <Input
                    className='mt-1 w-full rounded-md border border-border bg-card/70 text-sm text-white'
                    value={template.unmatchedKey ?? '__unmatched__'}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                      updateRegexTemplate(template.id, { unmatchedKey: event.target.value })
                    }
                  />
                </div>

                <div className='text-[10px] text-gray-500'>
                  Created: {template.createdAt ? new Date(template.createdAt).toLocaleString() : '—'}
                  {template.updatedAt ? ` • Updated: ${new Date(template.updatedAt).toLocaleString()}` : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className='space-y-4'>
        <div className='flex items-center justify-between'>
          <Label className='text-xs text-gray-400'>Global Templates</Label>
          <span className='text-[11px] text-gray-500'>{globalTemplates.length} shared</span>
        </div>
        {settingsQuery.isLoading && globalTemplates.length === 0 ? (
          <div className='rounded-md border border-dashed border-border/70 bg-card/40 p-4 text-xs text-gray-400'>
            Loading global templates…
          </div>
        ) : globalTemplates.length === 0 ? (
          <div className='rounded-md border border-dashed border-border/70 bg-card/40 p-4 text-xs text-gray-400'>
            No global templates yet. Save one from the Config tab.
          </div>
        ) : (
          <div className='space-y-4'>
            {globalTemplates.map((template: RegexTemplate) => (
              <div key={template.id} className='rounded-md border border-border bg-card/60 p-3 space-y-3'>
                <div className='flex flex-wrap items-center justify-between gap-3'>
                  <div className='min-w-[220px] flex-1'>
                    <Label className='text-[10px] text-gray-400'>Template Name</Label>
                    <Input
                      className='mt-1 w-full rounded-md border border-border bg-card/70 text-sm text-white'
                      value={template.name}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                        updateGlobalTemplate(template.id, { name: event.target.value })
                      }
                    />
                  </div>
                  <div className='flex gap-2'>
                    <Button
                      type='button'
                      className='h-8 rounded-md border border-emerald-600/50 bg-emerald-500/10 px-3 text-[11px] text-emerald-200 hover:bg-emerald-500/20'
                      onClick={() => applyRegexTemplate(template, 'Global')}
                    >
                      Apply
                    </Button>
                    <Button
                      type='button'
                      className='h-8 rounded-md border border-rose-600/50 bg-rose-500/10 px-3 text-[11px] text-rose-200 hover:bg-rose-500/20'
                      onClick={() => removeGlobalTemplate(template.id)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>

                <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                  <div>
                    <Label className='text-[10px] text-gray-400'>Pattern</Label>
                    <Input
                      className='mt-1 w-full rounded-md border border-border bg-card/70 text-sm text-white'
                      value={template.pattern}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                        updateGlobalTemplate(template.id, { pattern: event.target.value })
                      }
                    />
                  </div>
                  <div className='grid grid-cols-2 gap-2'>
                    <div>
                      <Label className='text-[10px] text-gray-400'>Flags</Label>
                      <Input
                        className='mt-1 w-full rounded-md border border-border bg-card/70 text-sm text-white'
                        value={template.flags ?? ''}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                          updateGlobalTemplate(template.id, { flags: event.target.value })
                        }
                        placeholder='gim'
                      />
                    </div>
                    <div>
                      <Label className='text-[10px] text-gray-400'>Group By</Label>
                      <Input
                        className='mt-1 w-full rounded-md border border-border bg-card/70 text-sm text-white'
                        value={template.groupBy ?? 'match'}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                          updateGlobalTemplate(template.id, { groupBy: event.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className='grid grid-cols-1 gap-3 md:grid-cols-3'>
                  <div>
                    <Label className='text-[10px] text-gray-400'>Mode</Label>
                    <Select
                      value={template.mode ?? 'group'}
                      onValueChange={(value: string): void =>
                        updateGlobalTemplate(template.id, { mode: value as RegexConfig['mode'] })
                      }
                    >
                      <SelectTrigger className='mt-1 h-8 w-full border-border bg-card/70 text-xs text-white'>
                        <SelectValue placeholder='Select mode' />
                      </SelectTrigger>
                      <SelectContent className='border-border bg-gray-900'>
                        <SelectItem value='group'>Group matches</SelectItem>
                        <SelectItem value='extract'>Extract value</SelectItem>
                        <SelectItem value='extract_json'>Extract JSON/object</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className='text-[10px] text-gray-400'>Match Mode</Label>
                    <Select
                      value={template.matchMode ?? 'first'}
                      onValueChange={(value: string): void =>
                        updateGlobalTemplate(template.id, { matchMode: value as RegexConfig['matchMode'] })
                      }
                    >
                      <SelectTrigger className='mt-1 h-8 w-full border-border bg-card/70 text-xs text-white'>
                        <SelectValue placeholder='Select mode' />
                      </SelectTrigger>
                      <SelectContent className='border-border bg-gray-900'>
                        <SelectItem value='first'>First match</SelectItem>
                        <SelectItem value='first_overall'>First overall</SelectItem>
                        <SelectItem value='all'>All matches</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className='text-[10px] text-gray-400'>Output Mode</Label>
                    <Select
                      value={template.outputMode ?? 'object'}
                      onValueChange={(value: string): void =>
                        updateGlobalTemplate(template.id, { outputMode: value as RegexConfig['outputMode'] })
                      }
                    >
                      <SelectTrigger className='mt-1 h-8 w-full border-border bg-card/70 text-xs text-white'>
                        <SelectValue placeholder='Select output' />
                      </SelectTrigger>
                      <SelectContent className='border-border bg-gray-900'>
                        <SelectItem value='object'>Object (Record)</SelectItem>
                        <SelectItem value='array'>Array (Groups list)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                  <div className='flex items-center justify-between rounded-md border border-border bg-card/50 px-3 py-2'>
                    <div>
                      <div className='text-[11px] text-gray-300'>Split lines</div>
                      <div className='text-[11px] text-gray-500'>Treat each line as an input item.</div>
                    </div>
                    <Switch
                      checked={template.splitLines ?? true}
                      onCheckedChange={(checked: boolean) => updateGlobalTemplate(template.id, { splitLines: checked })}
                    />
                  </div>
                  <div className='flex items-center justify-between rounded-md border border-border bg-card/50 px-3 py-2'>
                    <div>
                      <div className='text-[11px] text-gray-300'>Include unmatched</div>
                      <div className='text-[11px] text-gray-500'>
                        Keep non-matching inputs under a group key.
                      </div>
                    </div>
                    <Switch
                      checked={template.includeUnmatched ?? true}
                      onCheckedChange={(checked: boolean) =>
                        updateGlobalTemplate(template.id, { includeUnmatched: checked })
                      }
                    />
                  </div>
                </div>

                <div>
                  <Label className='text-[10px] text-gray-400'>Unmatched Key</Label>
                  <Input
                    className='mt-1 w-full rounded-md border border-border bg-card/70 text-sm text-white'
                    value={template.unmatchedKey ?? '__unmatched__'}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                      updateGlobalTemplate(template.id, { unmatchedKey: event.target.value })
                    }
                  />
                </div>

                <div className='text-[10px] text-gray-500'>
                  Created: {template.createdAt ? new Date(template.createdAt).toLocaleString() : '—'}
                  {template.updatedAt ? ` • Updated: ${new Date(template.updatedAt).toLocaleString()}` : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
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
