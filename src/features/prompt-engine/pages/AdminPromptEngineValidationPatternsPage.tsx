"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { Copy, RefreshCcw } from "lucide-react";

import {
  Button,
  ClientOnly,
  Input,
  Label,
  SectionHeader,
  SectionPanel,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Tooltip,
  FileUploadButton,
  useToast,
} from "@/shared/ui";
import { cn } from "@/shared/utils";
import { useSettingsMap, useUpdateSetting } from "@/shared/hooks/use-settings";
import { serializeSetting } from "@/shared/utils/settings-json";
import { logClientError } from "@/features/observability";

import {
  defaultPromptEngineSettings,
  PROMPT_ENGINE_SETTINGS_KEY,
  parsePromptEngineSettings,
  parsePromptValidationRules,
  type PromptAutofixOperation,
  type PromptValidationRule,
  type PromptValidationSeverity,
} from "../settings";

type SeverityFilter = PromptValidationSeverity | "all";

type RuleDraft = {
  uid: string;
  text: string;
  parsed: PromptValidationRule | null;
  error: string | null;
};

type AdminPromptEngineValidationPatternsPageProps = {
  embedded?: boolean | undefined;
  onSaved?: (() => void) | undefined;
  eyebrow?: string | undefined;
  backLinkHref?: string | undefined;
  backLinkLabel?: string | undefined;
};

const SEVERITY_ORDER: Record<PromptValidationSeverity, number> = {
  error: 0,
  warning: 1,
  info: 2,
};

const createRuleDraft = (rule: PromptValidationRule, uid: string = rule.id): RuleDraft => ({
  uid,
  text: JSON.stringify(rule, null, 2),
  parsed: rule,
  error: null,
});

const createNewRule = (): PromptValidationRule => ({
  kind: "regex",
  id: `custom.rule.${Date.now()}`,
  enabled: true,
  severity: "warning",
  title: "New validation rule",
  description: null,
  pattern: "^$",
  flags: "mi",
  message: "Update this rule with the intended pattern and message.",
  similar: [],
  autofix: { enabled: true, operations: [] },
});

const formatSeverityLabel = (severity: PromptValidationSeverity): string => {
  if (severity === "error") return "Error";
  if (severity === "warning") return "Warning";
  return "Info";
};

const getSeverityBadgeClasses = (severity: PromptValidationSeverity): string => {
  if (severity === "error") return "border-red-500/30 bg-red-500/10 text-red-200";
  if (severity === "warning") return "border-amber-500/30 bg-amber-500/10 text-amber-200";
  return "border-sky-500/30 bg-sky-500/10 text-sky-200";
};

const compileRegex = (pattern: string, flags: string | undefined): { ok: true } | { ok: false; error: string } => {
  try {
    void new RegExp(pattern, flags);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Invalid regex" };
  }
};

const formatAutofixOperation = (op: PromptAutofixOperation): string => {
  if (op.kind === "params_json") return "Convert `params` object to strict JSON";
  const flags = op.flags?.trim() ? `/${op.flags.trim()}` : "";
  return `Replace ${op.pattern}${flags} → ${op.replacement}`;
};

const ruleSearchText = (rule: PromptValidationRule): string => {
  const parts: string[] = [
    rule.id,
    rule.kind,
    rule.severity,
    rule.title,
    rule.message,
    rule.description ?? "",
  ];
  if (rule.kind === "regex") {
    parts.push(rule.pattern);
    parts.push(rule.flags);
  }
  (rule.similar ?? []).forEach((sim: { pattern: string; flags?: string | undefined; suggestion: string; comment?: string | null | undefined }) => {
    parts.push(sim.pattern);
    parts.push(sim.flags ?? "");
    parts.push(sim.suggestion);
    parts.push(sim.comment ?? "");
  });
  (rule.autofix?.operations ?? []).forEach((op: PromptAutofixOperation) => {
    parts.push(op.kind);
    if (op.kind === "replace") {
      parts.push(op.pattern);
      parts.push(op.flags ?? "");
      parts.push(op.replacement);
      parts.push(op.comment ?? "");
    } else {
      parts.push(op.comment ?? "");
    }
  });
  return parts.filter(Boolean).join(" ").toLowerCase();
};

export function AdminPromptEngineValidationPatternsPage({
  embedded = false,
  onSaved,
  eyebrow = "AI · Prompt Engine",
  backLinkHref = "/admin/prompt-engine",
  backLinkLabel = "Back to Prompt Engine",
}: AdminPromptEngineValidationPatternsPageProps): React.JSX.Element {
  const { toast } = useToast();
  const settingsQuery = useSettingsMap();
  const updateSetting = useUpdateSetting();

  const rawSettings = settingsQuery.data?.get(PROMPT_ENGINE_SETTINGS_KEY) ?? null;
  const promptEngineSettings = useMemo(() => parsePromptEngineSettings(rawSettings), [rawSettings]);
  const [query, setQuery] = useState<string>("");
  const [severity, setSeverity] = useState<SeverityFilter>("all");
  const [includeDisabled, setIncludeDisabled] = useState<boolean>(true);
  const [drafts, setDrafts] = useState<RuleDraft[]>([]);
  const [initializedAt, setInitializedAt] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [learnedDrafts, setLearnedDrafts] = useState<RuleDraft[]>([]);
  const [learnedDirty, setLearnedDirty] = useState<boolean>(false);

  if (settingsQuery.isSuccess && initializedAt !== settingsQuery.dataUpdatedAt) {
    setInitializedAt(settingsQuery.dataUpdatedAt);
    const settings = parsePromptEngineSettings(rawSettings);
    const rules = settings.promptValidation.rules ?? defaultPromptEngineSettings.promptValidation.rules;
    setDrafts(rules.map((rule: PromptValidationRule, index: number) => createRuleDraft(rule, `${rule.id}-${index}`)));
    const learnedRules = settings.promptValidation.learnedRules ?? [];
    setLearnedDrafts(learnedRules.map((rule: PromptValidationRule, index: number) => createRuleDraft(rule, `${rule.id}-${index}`)));
    setSaveError(null);
    setIsDirty(false);
    setLearnedDirty(false);
  }

  const sortedDrafts = useMemo((): RuleDraft[] => {
    const list = [...drafts];
    list.sort((a: RuleDraft, b: RuleDraft): number => {
      if (!a.parsed && !b.parsed) return 0;
      if (!a.parsed) return 1;
      if (!b.parsed) return -1;
      const severityCompare = (SEVERITY_ORDER[a.parsed.severity] ?? 99) - (SEVERITY_ORDER[b.parsed.severity] ?? 99);
      if (severityCompare !== 0) return severityCompare;
      return a.parsed.title.localeCompare(b.parsed.title);
    });
    return list;
  }, [drafts]);

  const filteredDrafts = useMemo((): RuleDraft[] => {
    const term = query.trim().toLowerCase();
    return sortedDrafts.filter((draft: RuleDraft): boolean => {
      const rule = draft.parsed;
      if (!rule) {
        if (severity !== "all") return false;
        if (!term) return true;
        return draft.text.toLowerCase().includes(term);
      }
      if (!includeDisabled && !rule.enabled) return false;
      if (severity !== "all" && rule.severity !== severity) return false;
      if (!term) return true;
      return ruleSearchText(rule).includes(term);
    });
  }, [includeDisabled, query, severity, sortedDrafts]);

  const handleRuleTextChange = useCallback((uid: string, nextText: string): void => {
    setDrafts((prev: RuleDraft[]) =>
      prev.map((draft: RuleDraft) => {
        if (draft.uid !== uid) return draft;
        try {
          const parsed = JSON.parse(nextText) as unknown;
          if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
            return { ...draft, text: nextText, parsed: null, error: "Rule JSON must be an object." };
          }
          return { ...draft, text: nextText, parsed: parsed as PromptValidationRule, error: null };
        } catch (error) {
          return {
            ...draft,
            text: nextText,
            parsed: null,
            error: error instanceof Error ? error.message : "Invalid JSON.",
          };
        }
      })
    );
    setIsDirty(true);
    setSaveError(null);
  }, []);

  const handleLearnedRuleTextChange = useCallback((uid: string, nextText: string): void => {
    setLearnedDrafts((prev: RuleDraft[]) =>
      prev.map((draft: RuleDraft) => {
        if (draft.uid !== uid) return draft;
        try {
          const parsed = JSON.parse(nextText) as unknown;
          if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
            return { ...draft, text: nextText, parsed: null, error: "Rule JSON must be an object." };
          }
          return { ...draft, text: nextText, parsed: parsed as PromptValidationRule, error: null };
        } catch (error) {
          return {
            ...draft,
            text: nextText,
            parsed: null,
            error: error instanceof Error ? error.message : "Invalid JSON.",
          };
        }
      })
    );
    setLearnedDirty(true);
    setSaveError(null);
  }, []);

  const handleAddRule = useCallback((): void => {
    const newRule = createNewRule();
    setDrafts((prev: RuleDraft[]) => [createRuleDraft(newRule), ...prev]);
    setIsDirty(true);
    setSaveError(null);
  }, []);

  const handleAddLearnedRule = useCallback((): void => {
    const newRule: PromptValidationRule = {
      ...createNewRule(),
      id: `learned.${Date.now()}`,
      title: "Learned validation rule",
    };
    setLearnedDrafts((prev: RuleDraft[]) => [createRuleDraft(newRule), ...prev]);
    setLearnedDirty(true);
    setSaveError(null);
  }, []);

  const handleRemoveRule = useCallback((uid: string): void => {
    setDrafts((prev: RuleDraft[]) => prev.filter((draft: RuleDraft) => draft.uid !== uid));
    setIsDirty(true);
    setSaveError(null);
  }, []);

  const handleRemoveLearnedRule = useCallback((uid: string): void => {
    setLearnedDrafts((prev: RuleDraft[]) => prev.filter((draft: RuleDraft) => draft.uid !== uid));
    setLearnedDirty(true);
    setSaveError(null);
  }, []);

  const handleRefresh = useCallback(async (): Promise<void> => {
    setSaveError(null);
    await settingsQuery.refetch();
  }, [settingsQuery]);

  const handleExport = useCallback((): void => {
    const invalidJson = drafts.filter((draft: RuleDraft) => draft.error || !draft.parsed);
    if (invalidJson.length > 0) {
      toast(`Fix invalid JSON in ${invalidJson.length} rule(s) before exporting.`, { variant: "error" });
      return;
    }
    const parsedRules = drafts.map((draft: RuleDraft) => draft.parsed!).filter(Boolean);
    const result = parsePromptValidationRules(JSON.stringify(parsedRules));
    if (!result.ok) {
      toast(result.error, { variant: "error" });
      return;
    }
    const blob = new Blob([JSON.stringify(result.rules, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `prompt-engine-validation-patterns-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }, [drafts, toast]);

  const handleExportLearned = useCallback((): void => {
    const invalidJson = learnedDrafts.filter((draft: RuleDraft) => draft.error || !draft.parsed);
    if (invalidJson.length > 0) {
      toast(`Fix invalid JSON in ${invalidJson.length} learned rule(s) before exporting.`, { variant: "error" });
      return;
    }
    const parsedRules = learnedDrafts.map((draft: RuleDraft) => draft.parsed!).filter(Boolean);
    const result = parsePromptValidationRules(JSON.stringify(parsedRules));
    if (!result.ok) {
      toast(result.error, { variant: "error" });
      return;
    }
    const blob = new Blob([JSON.stringify(result.rules, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `prompt-engine-learned-patterns-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }, [learnedDrafts, toast]);

  const handleImport = useCallback(async (file: File): Promise<void> => {
    const text = await file.text();
    const result = parsePromptValidationRules(text);
    if (!result.ok) {
      toast(result.error, { variant: "error" });
      return;
    }
    setDrafts(result.rules.map((rule: PromptValidationRule, index: number) => createRuleDraft(rule, `${rule.id}-${index}`)));
    setIsDirty(true);
    setSaveError(null);
    toast("Validation patterns imported. Review and save to apply.", { variant: "success" });
  }, [toast]);

  const handleImportLearned = useCallback(async (file: File): Promise<void> => {
    const text = await file.text();
    const result = parsePromptValidationRules(text);
    if (!result.ok) {
      toast(result.error, { variant: "error" });
      return;
    }
    setLearnedDrafts(result.rules.map((rule: PromptValidationRule, index: number) => createRuleDraft(rule, `${rule.id}-${index}`)));
    setLearnedDirty(true);
    setSaveError(null);
    toast("Learned patterns imported. Review and save to apply.", { variant: "success" });
  }, [toast]);

  const handleSave = useCallback(async (): Promise<void> => {
    const invalidJson = drafts.filter((draft: RuleDraft) => draft.error || !draft.parsed);
    if (invalidJson.length > 0) {
      toast(`Fix invalid JSON in ${invalidJson.length} rule(s) before saving.`, { variant: "error" });
      return;
    }
    const invalidLearnedJson = learnedDrafts.filter((draft: RuleDraft) => draft.error || !draft.parsed);
    if (invalidLearnedJson.length > 0) {
      toast(`Fix invalid JSON in ${invalidLearnedJson.length} learned rule(s) before saving.`, { variant: "error" });
      return;
    }

    const parsedRules = drafts.map((draft: RuleDraft) => draft.parsed!).filter(Boolean);
    const parsedLearnedRules = learnedDrafts.map((draft: RuleDraft) => draft.parsed!).filter(Boolean);
    const invalidRuleIds: string[] = [];
    parsedRules.forEach((rule: PromptValidationRule, index: number) => {
      const result = parsePromptValidationRules(JSON.stringify([rule]));
      if (!result.ok) invalidRuleIds.push(rule.id || `#${index + 1}`);
    });
    if (invalidRuleIds.length > 0) {
      toast(`Invalid rule(s): ${invalidRuleIds.join(", ")}.`, { variant: "error" });
      return;
    }
    const invalidLearnedIds: string[] = [];
    parsedLearnedRules.forEach((rule: PromptValidationRule, index: number) => {
      const result = parsePromptValidationRules(JSON.stringify([rule]));
      if (!result.ok) invalidLearnedIds.push(rule.id || `#${index + 1}`);
    });
    if (invalidLearnedIds.length > 0) {
      toast(`Invalid learned rule(s): ${invalidLearnedIds.join(", ")}.`, { variant: "error" });
      return;
    }

    const result = parsePromptValidationRules(JSON.stringify(parsedRules));
    if (!result.ok) {
      toast(result.error, { variant: "error" });
      return;
    }
    const learnedResult = parsePromptValidationRules(JSON.stringify(parsedLearnedRules));
    if (!learnedResult.ok) {
      toast(learnedResult.error, { variant: "error" });
      return;
    }

    try {
      const currentSettings = parsePromptEngineSettings(rawSettings);
      const nextSettings = {
        ...currentSettings,
        promptValidation: {
          ...currentSettings.promptValidation,
          rules: result.rules,
          learnedRules: learnedResult.rules,
        },
      };
      await updateSetting.mutateAsync({
        key: PROMPT_ENGINE_SETTINGS_KEY,
        value: serializeSetting(nextSettings),
      });
      setDrafts(result.rules.map((rule: PromptValidationRule, index: number) => createRuleDraft(rule, `${rule.id}-${index}`)));
      setLearnedDrafts(learnedResult.rules.map((rule: PromptValidationRule, index: number) => createRuleDraft(rule, `${rule.id}-${index}`)));
      setIsDirty(false);
      setLearnedDirty(false);
      toast("Validation patterns saved.", { variant: "success" });
      onSaved?.();
    } catch (error) {
      logClientError(error, { context: { source: "AdminPromptEngineValidationPatternsPage", action: "saveRules" } });
      toast("Failed to save rules.", { variant: "error" });
    }
  }, [drafts, learnedDrafts, onSaved, rawSettings, toast, updateSetting]);

  const handleCopy = async (value: string, label: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(value);
      toast(`${label} copied.`, { variant: "success" });
    } catch {
      toast("Failed to copy.", { variant: "error" });
    }
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        eyebrow={eyebrow}
        title="Validation Patterns"
        description="Browse Prompt Validator rules (patterns, similar matches, and autofix operations)."
        actions={
          <>
            {!embedded ? (
              <Button type="button" variant="outline" asChild>
                <Link href={backLinkHref}>{backLinkLabel}</Link>
              </Button>
            ) : null}
            <Button type="button" variant="outline" onClick={handleExport}>
              Export JSON
            </Button>
            <Button type="button" variant="outline" onClick={handleExportLearned}>
              Export learned
            </Button>
            <FileUploadButton
              variant="outline"
              accept="application/json"
              onFilesSelected={(files: File[]) => {
                const file = files[0];
                if (!file) return;
                void handleImport(file);
              }}
            >
              Import JSON
            </FileUploadButton>
            <FileUploadButton
              variant="outline"
              accept="application/json"
              onFilesSelected={(files: File[]) => {
                const file = files[0];
                if (!file) return;
                void handleImportLearned(file);
              }}
            >
              Import learned
            </FileUploadButton>
            <Button type="button" variant="outline" onClick={handleAddRule}>
              Add rule
            </Button>
            <Button type="button" variant="outline" onClick={handleAddLearnedRule}>
              Add learned
            </Button>
            <Button
              type="button"
              onClick={() => void handleSave()}
              disabled={updateSetting.isPending || (!isDirty && !learnedDirty)}
            >
              {updateSetting.isPending ? "Saving..." : "Save changes"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleRefresh()}
              disabled={settingsQuery.isFetching}
              title="Reload settings"
            >
              <RefreshCcw className={cn("mr-2 size-4", settingsQuery.isFetching ? "animate-spin" : "")} />
              Refresh
            </Button>
          </>
        }
      />

      <SectionPanel variant="subtle">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm text-gray-200">
            {promptEngineSettings.promptValidation.enabled ? (
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-200">
                Validator enabled
              </span>
            ) : (
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-200">
                Validator disabled
              </span>
            )}
          </div>
          <div className="text-[11px] text-gray-400">
            Source: {rawSettings ? "saved settings" : "defaults"}
          </div>
        </div>
      </SectionPanel>

      {saveError ? (
        <SectionPanel variant="danger">
          <div className="text-xs text-red-200">{saveError}</div>
        </SectionPanel>
      ) : null}

      <SectionPanel>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1">
            <Label className="text-xs text-gray-400">Search rules</Label>
            <Input
              value={query}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
              placeholder="Search ids, patterns, suggestions..."
            />
          </div>
          <div className="w-[180px]">
            <Label className="text-xs text-gray-400">Severity</Label>
            <Select value={severity} onValueChange={(value: string) => setSeverity(value as SeverityFilter)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="info">Info</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2">
            <label className="flex items-center gap-2 text-[11px] text-gray-400">
              <input
                type="checkbox"
                className="h-3 w-3 rounded border-gray-500"
                checked={includeDisabled}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => setIncludeDisabled(event.target.checked)}
              />
              Include disabled
            </label>
          </div>
        </div>
      </SectionPanel>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          {filteredDrafts.length === 0 ? (
            <SectionPanel>
              <div className="text-sm text-gray-400">No rules match this filter.</div>
            </SectionPanel>
          ) : null}
          {filteredDrafts.map((draft: RuleDraft) => {
            const rule = draft.parsed;
            const regexStatus = rule?.kind === "regex" ? compileRegex(rule.pattern, rule.flags) : null;
            return (
              <SectionPanel key={draft.uid} className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={cn("rounded-full border px-2 py-0.5 text-[11px]", rule ? getSeverityBadgeClasses(rule.severity) : "border-gray-600/40 text-gray-300")}>
                      {rule ? formatSeverityLabel(rule.severity) : "Invalid"}
                    </span>
                    <span className="text-sm font-medium text-gray-100">
                      {rule?.title ?? "Invalid rule"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Tooltip content="Copy JSON">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => void handleCopy(draft.text, "Rule")}
                      >
                        <Copy className="size-4" />
                      </Button>
                    </Tooltip>
                    <Button type="button" variant="outline" size="sm" onClick={() => handleRemoveRule(draft.uid)}>
                      Remove
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                  <div className="space-y-2">
                    <Textarea
                      className="min-h-[180px] font-mono text-[12px]"
                      value={draft.text}
                      onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => handleRuleTextChange(draft.uid, event.target.value)}
                    />
                    {draft.error ? (
                      <div className="text-xs text-red-300">{draft.error}</div>
                    ) : null}
                    {rule?.kind === "regex" && regexStatus && !regexStatus.ok ? (
                      <div className="text-xs text-red-300">Regex error: {regexStatus.error}</div>
                    ) : null}
                  </div>

                  <div className="space-y-2 text-xs text-gray-300">
                    {rule ? (
                      <>
                        <div>
                          <div className="text-[11px] uppercase text-gray-500">Rule ID</div>
                          <div className="break-all">{rule.id}</div>
                        </div>
                        <div>
                          <div className="text-[11px] uppercase text-gray-500">Kind</div>
                          <div>{rule.kind}</div>
                        </div>
                        {rule.kind === "regex" ? (
                          <div>
                            <div className="text-[11px] uppercase text-gray-500">Pattern</div>
                            <div className="break-all">/{rule.pattern}/{rule.flags}</div>
                          </div>
                        ) : null}
                        <div>
                          <div className="text-[11px] uppercase text-gray-500">Enabled</div>
                          <div>{rule.enabled ? "Yes" : "No"}</div>
                        </div>
                        <div>
                          <div className="text-[11px] uppercase text-gray-500">Message</div>
                          <div className="whitespace-pre-wrap">{rule.message}</div>
                        </div>
                      </>
                    ) : (
                      <div className="text-xs text-red-300">Invalid JSON. Fix to see summary.</div>
                    )}
                  </div>
                </div>

                {rule?.similar?.length ? (
                  <div className="space-y-1">
                    <div className="text-[11px] uppercase text-gray-500">Similar patterns</div>
                    <div className="space-y-2">
                      {rule.similar.map((sim: { pattern: string; flags?: string | undefined; suggestion: string; comment?: string | null | undefined }) => (
                        <div key={`${sim.pattern}-${sim.suggestion}`} className="rounded border border-gray-700/60 bg-gray-900/40 p-2 text-xs text-gray-300">
                          <div className="font-mono">/{sim.pattern}/{sim.flags ?? ""}</div>
                          <div className="text-[11px] text-gray-400">{sim.suggestion}</div>
                          {sim.comment ? <div className="text-[11px] text-gray-500">{sim.comment}</div> : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {rule?.autofix?.operations?.length ? (
                  <div className="space-y-1">
                    <div className="text-[11px] uppercase text-gray-500">Autofix operations</div>
                    <div className="space-y-2">
                      {rule.autofix.operations.map((op: PromptAutofixOperation, index: number) => (
                        <div key={`${rule.id}-autofix-${index}`} className="rounded border border-gray-700/60 bg-gray-900/40 p-2 text-xs text-gray-300">
                          <div>{formatAutofixOperation(op)}</div>
                          {op.comment ? <div className="text-[11px] text-gray-500">{op.comment}</div> : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </SectionPanel>
            );
          })}
        </div>

        <div className="space-y-4">
          <SectionPanel>
            <div className="text-xs uppercase text-gray-500">Learned Rules</div>
            <div className="mt-1 text-xs text-gray-400">
              Auto-generated patterns from prompts. Review and edit before saving.
            </div>
          </SectionPanel>

          {learnedDrafts.length === 0 ? (
            <SectionPanel>
              <div className="text-sm text-gray-400">No learned patterns yet.</div>
            </SectionPanel>
          ) : null}

          {learnedDrafts.map((draft: RuleDraft) => {
            const rule = draft.parsed;
            return (
              <SectionPanel key={draft.uid} className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-medium text-gray-100">{rule?.title ?? "Invalid rule"}</div>
                  <div className="flex items-center gap-2">
                    <Tooltip content="Copy JSON">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => void handleCopy(draft.text, "Rule")}
                      >
                        <Copy className="size-4" />
                      </Button>
                    </Tooltip>
                    <Button type="button" variant="outline" size="sm" onClick={() => handleRemoveLearnedRule(draft.uid)}>
                      Remove
                    </Button>
                  </div>
                </div>
                <Textarea
                  className="min-h-[140px] font-mono text-[12px]"
                  value={draft.text}
                  onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => handleLearnedRuleTextChange(draft.uid, event.target.value)}
                />
                {draft.error ? (
                  <div className="text-xs text-red-300">{draft.error}</div>
                ) : null}
                {rule ? (
                  <div className="text-xs text-gray-400">
                    <div>Severity: {formatSeverityLabel(rule.severity)}</div>
                    <div>Enabled: {rule.enabled ? "Yes" : "No"}</div>
                  </div>
                ) : null}
              </SectionPanel>
            );
          })}

          <ClientOnly>
            <SectionPanel>
              <div className="text-[11px] text-gray-500">Tip</div>
              <div className="text-xs text-gray-400">
                Use the Image Studio prompt tools to suggest learned patterns automatically.
              </div>
            </SectionPanel>
          </ClientOnly>
        </div>
      </div>
    </div>
  );
}
