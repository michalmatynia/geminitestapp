"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  useToast,
} from "@/shared/ui";
import { cn } from "@/shared/utils";
import { useSettingsMap, useUpdateSetting } from "@/shared/hooks/use-settings";
import { serializeSetting } from "@/shared/utils/settings-json";
import { logClientError } from "@/features/observability";

import {
  defaultImageStudioSettings,
  IMAGE_STUDIO_SETTINGS_KEY,
  parseImageStudioSettings,
  parsePromptValidationRules,
  type PromptAutofixOperation,
  type PromptValidationRule,
  type PromptValidationSeverity,
} from "../utils/studio-settings";

type SeverityFilter = PromptValidationSeverity | "all";

type RuleDraft = {
  uid: string;
  text: string;
  parsed: PromptValidationRule | null;
  error: string | null;
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

export function AdminImageStudioValidationPatternsPage(): React.JSX.Element {
  const { toast } = useToast();
  const settingsQuery = useSettingsMap();
  const updateSetting = useUpdateSetting();

  const rawSettings = settingsQuery.data?.get(IMAGE_STUDIO_SETTINGS_KEY) ?? null;
  const studioSettings = useMemo(() => parseImageStudioSettings(rawSettings), [rawSettings]);
  const [query, setQuery] = useState<string>("");
  const [severity, setSeverity] = useState<SeverityFilter>("all");
  const [includeDisabled, setIncludeDisabled] = useState<boolean>(true);
  const [drafts, setDrafts] = useState<RuleDraft[]>([]);
  const [initializedAt, setInitializedAt] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [learnedDrafts, setLearnedDrafts] = useState<RuleDraft[]>([]);
  const [learnedDirty, setLearnedDirty] = useState<boolean>(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const importLearnedInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!settingsQuery.isSuccess) return;
    if (initializedAt === settingsQuery.dataUpdatedAt) return;
    const settings = parseImageStudioSettings(rawSettings);
    const rules = settings.promptValidation.rules ?? defaultImageStudioSettings.promptValidation.rules;
    setDrafts(rules.map((rule: PromptValidationRule, index: number) => createRuleDraft(rule, `${rule.id}-${index}`)));
    const learnedRules = settings.promptValidation.learnedRules ?? [];
    setLearnedDrafts(learnedRules.map((rule: PromptValidationRule, index: number) => createRuleDraft(rule, `${rule.id}-${index}`)));
    setSaveError(null);
    setIsDirty(false);
    setLearnedDirty(false);
    setInitializedAt(settingsQuery.dataUpdatedAt);
  }, [initializedAt, rawSettings, settingsQuery.dataUpdatedAt, settingsQuery.isSuccess]);

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
    anchor.download = `image-studio-validation-patterns-${new Date().toISOString().slice(0, 10)}.json`;
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
    anchor.download = `image-studio-learned-patterns-${new Date().toISOString().slice(0, 10)}.json`;
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

  const handleImportClick = useCallback((): void => {
    importInputRef.current?.click();
  }, []);

  const handleImportLearnedClick = useCallback((): void => {
    importLearnedInputRef.current?.click();
  }, []);

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
      const currentSettings = parseImageStudioSettings(rawSettings);
      const nextSettings = {
        ...currentSettings,
        promptValidation: {
          ...currentSettings.promptValidation,
          rules: result.rules,
          learnedRules: learnedResult.rules,
        },
      };
      await updateSetting.mutateAsync({
        key: IMAGE_STUDIO_SETTINGS_KEY,
        value: serializeSetting(nextSettings),
      });
      setDrafts(result.rules.map((rule: PromptValidationRule, index: number) => createRuleDraft(rule, `${rule.id}-${index}`)));
      setLearnedDrafts(learnedResult.rules.map((rule: PromptValidationRule, index: number) => createRuleDraft(rule, `${rule.id}-${index}`)));
      setIsDirty(false);
      setLearnedDirty(false);
      toast("Validation patterns saved.", { variant: "success" });
    } catch (error) {
      logClientError(error, { context: { source: "AdminImageStudioValidationPatternsPage", action: "saveRules" } });
      toast("Failed to save rules.", { variant: "error" });
    }
  }, [drafts, learnedDrafts, rawSettings, toast, updateSetting]);

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
        eyebrow="AI · Image Studio"
        title="Validation Patterns"
        description="Browse Prompt Validator rules (patterns, similar matches, and autofix operations)."
        actions={
          <>
            <Button type="button" variant="outline" asChild>
              <Link href="/admin/image-studio">Back to Studio</Link>
            </Button>
            <Button type="button" variant="outline" onClick={handleExport}>
              Export JSON
            </Button>
            <Button type="button" variant="outline" onClick={handleExportLearned}>
              Export learned
            </Button>
            <Button type="button" variant="outline" onClick={handleImportClick}>
              Import JSON
            </Button>
            <Button type="button" variant="outline" onClick={handleImportLearnedClick}>
              Import learned
            </Button>
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

      <input
        ref={importInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
          const file = event.target.files?.[0] ?? null;
          event.target.value = "";
          if (!file) return;
          void handleImport(file);
        }}
      />
      <input
        ref={importLearnedInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
          const file = event.target.files?.[0] ?? null;
          event.target.value = "";
          if (!file) return;
          void handleImportLearned(file);
        }}
      />

      <SectionPanel variant="subtle">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm text-gray-200">
            {studioSettings.promptValidation.enabled ? (
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

        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-4">
          <div className="md:col-span-2">
            <Label className="text-[11px] text-gray-400">Search</Label>
            <Input
              value={query}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
              className="h-9"
              placeholder="Search by id/title/pattern/suggestion…"
            />
          </div>

          <div>
            <Label className="text-[11px] text-gray-400">Severity</Label>
            <ClientOnly
              fallback={
                <div className="flex h-9 w-full items-center justify-between rounded-md border border-foreground/10 bg-transparent px-3 py-2 text-sm text-muted-foreground/70">
                  All
                </div>
              }
            >
              <Select
                value={severity}
                onValueChange={(value: string) => setSeverity((value as SeverityFilter) || "all")}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                </SelectContent>
              </Select>
            </ClientOnly>
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2 text-[11px] text-gray-200">
              <input
                type="checkbox"
                checked={includeDisabled}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIncludeDisabled(e.target.checked)}
              />
              Include disabled
            </label>
          </div>
        </div>

        <div className="mt-3 text-[11px] text-gray-400">
          Showing <span className="text-gray-200">{filteredDrafts.length}</span> of{" "}
          <span className="text-gray-200">{sortedDrafts.length}</span> rules
        </div>
      </SectionPanel>

      <div className="space-y-3">
        {saveError ? (
          <div className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {saveError}
          </div>
        ) : null}
        {filteredDrafts.map((draft: RuleDraft) => {
          const rule = draft.parsed;
          const regexStatus = rule && rule.kind === "regex" ? compileRegex(rule.pattern, rule.flags) : null;
          return (
            <SectionPanel key={draft.uid} variant="subtle">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-medium text-gray-100">{rule?.title ?? "Invalid rule JSON"}</div>
                    {rule ? (
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide",
                          getSeverityBadgeClasses(rule.severity)
                        )}
                      >
                        {formatSeverityLabel(rule.severity)}
                      </span>
                    ) : null}
                    {rule && !rule.enabled ? (
                      <span className="rounded-full border border-gray-600/60 bg-gray-600/10 px-2 py-0.5 text-[10px] text-gray-300">
                        Disabled
                      </span>
                    ) : null}
                    {rule ? (
                      <span className="rounded-full border border-border bg-card/50 px-2 py-0.5 text-[10px] text-gray-300">
                        {rule.kind}
                      </span>
                    ) : null}
                    {draft.error ? (
                      <span className="rounded-full border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-[10px] text-red-200">
                        Invalid JSON
                      </span>
                    ) : null}
                  </div>
                  <div className="text-[11px] text-gray-400">
                    <span className="text-gray-500">Rule ID:</span> {rule?.id ?? "—"}
                  </div>
                  {rule?.description ? (
                    <div className="text-[11px] text-gray-400">{rule.description}</div>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleRemoveRule(draft.uid)}
                  >
                    Remove
                  </Button>
                  <Tooltip content="Copy rule JSON" side="bottom">
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={() => void handleCopy(draft.text, "Rule JSON")}
                    >
                      <Copy className="size-4" />
                    </Button>
                  </Tooltip>
                </div>
              </div>

              {draft.error ? (
                <div className="mt-3 rounded border border-red-500/30 bg-red-500/10 p-2 text-[11px] text-red-200">
                  {draft.error}
                </div>
              ) : null}

              <div className="mt-3 space-y-2">
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <div className="space-y-1">
                    <div className="text-[11px] text-gray-500">Message</div>
                    <div className="rounded-md border border-border bg-card/50 p-2 text-[12px] text-gray-200">
                      {rule?.message ?? "—"}
                    </div>
                  </div>

                  {!rule ? (
                    <div className="space-y-1">
                      <div className="text-[11px] text-gray-500">Rule status</div>
                      <div className="rounded-md border border-border bg-card/50 p-2 text-[12px] text-gray-200">
                        Fix the JSON below to preview pattern details.
                      </div>
                    </div>
                  ) : rule.kind === "regex" ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-[11px] text-gray-500">
                        <span>Pattern</span>
                        {regexStatus && !regexStatus.ok ? (
                          <span className="text-[10px] text-red-300">Invalid: {regexStatus.error}</span>
                        ) : null}
                      </div>
                      <div className="rounded-md border border-border bg-card/50 p-2 font-mono text-[11px] text-gray-200">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="break-all">{rule.pattern}</span>
                          <span className="text-gray-400">/{rule.flags}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => void handleCopy(rule.pattern, "Pattern")}
                        >
                          Copy pattern
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => void handleCopy(rule.flags, "Flags")}
                        >
                          Copy flags
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="text-[11px] text-gray-500">Expected structure</div>
                      <div className="rounded-md border border-border bg-card/50 p-2 text-[12px] text-gray-200">
                        Requires a parsable <span className="font-mono text-gray-100">params = {"{ ... }"}</span> block.
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] text-gray-500">Similar patterns (suggestions)</div>
                  {rule?.similar && rule.similar.length > 0 ? (
                    <div className="space-y-2">
                      {rule.similar.map((sim: { pattern: string; flags?: string | undefined; suggestion: string; comment?: string | null | undefined }, index: number) => (
                        <div
                          key={`${rule.id}:${index}`}
                          className="rounded-md border border-border bg-card/50 p-2 text-[11px] text-gray-200"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="font-mono break-all">
                              {sim.pattern}
                              <span className="text-gray-400">{sim.flags?.trim() ? `/${sim.flags}` : ""}</span>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => void handleCopy(sim.pattern, "Similar pattern")}
                            >
                              Copy
                            </Button>
                          </div>
                          <div className="mt-1 text-gray-200">{sim.suggestion}</div>
                          {sim.comment ? <div className="mt-1 text-gray-400">{sim.comment}</div> : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[11px] text-gray-500">None</div>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] text-gray-500">Autofix operations</div>
                  {rule?.autofix?.enabled && rule.autofix.operations.length > 0 ? (
                    <div className="space-y-2">
                      {rule.autofix.operations.map((op: PromptAutofixOperation, index: number) => (
                        <div
                          key={`${rule.id}:autofix:${index}`}
                          className="rounded-md border border-border bg-card/50 p-2 text-[11px] text-gray-200"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="font-mono break-all">{formatAutofixOperation(op)}</div>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => void handleCopy(JSON.stringify(op, null, 2), "Autofix operation")}
                            >
                              Copy
                            </Button>
                          </div>
                          {"comment" in op && op.comment ? (
                            <div className="mt-1 text-gray-400">{op.comment}</div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[11px] text-gray-500">None</div>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] text-gray-500">Rule JSON</div>
                  <Textarea
                    value={draft.text}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleRuleTextChange(draft.uid, e.target.value)}
                    className="min-h-[180px] font-mono text-[11px]"
                    placeholder="Paste JSON for this rule"
                  />
                </div>
              </div>
            </SectionPanel>
          );
        })}
      </div>

      <SectionPanel variant="subtle">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm text-gray-100">Learned Patterns</div>
          <div className="text-[11px] text-gray-400">
            {learnedDrafts.length} learned rule(s)
          </div>
        </div>
        {learnedDrafts.length === 0 ? (
          <div className="mt-3 rounded border border-dashed border-border p-3 text-xs text-gray-400">
            No learned patterns yet. Use “Learn patterns” in Image Studio to add some.
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {learnedDrafts.map((draft: RuleDraft) => {
              const rule = draft.parsed;
              return (
                <div key={draft.uid} className="rounded-md border border-border bg-card/50 p-2 text-[11px] text-gray-200">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm text-gray-100">{rule?.title ?? "Invalid rule JSON"}</div>
                    <div className="flex flex-wrap items-center gap-2">
                      {rule ? (
                        <span className="rounded-full border border-border bg-card/60 px-2 py-0.5 text-[10px] text-gray-300">
                          {rule.kind}
                        </span>
                      ) : null}
                      {draft.error ? (
                        <span className="rounded-full border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-[10px] text-red-200">
                          Invalid JSON
                        </span>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleRemoveLearnedRule(draft.uid)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                  <div className="mt-1 text-[11px] text-gray-400">ID: {rule?.id ?? "—"}</div>
                  {rule?.kind === "regex" ? (
                    <div className="mt-2 rounded border border-border bg-card/50 p-2 font-mono text-[11px] text-gray-200">
                      {rule.pattern}
                      <span className="text-gray-400">{rule.flags?.trim() ? `/${rule.flags}` : ""}</span>
                    </div>
                  ) : null}
                  {draft.error ? (
                    <div className="mt-2 rounded border border-red-500/30 bg-red-500/10 p-2 text-[11px] text-red-200">
                      {draft.error}
                    </div>
                  ) : null}
                  <div className="mt-2 text-[11px] text-gray-500">Rule JSON</div>
                  <Textarea
                    value={draft.text}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleLearnedRuleTextChange(draft.uid, e.target.value)}
                    className="min-h-[140px] font-mono text-[11px]"
                    placeholder="Paste JSON for this learned rule"
                  />
                </div>
              );
            })}
          </div>
        )}
      </SectionPanel>
    </div>
  );
}
