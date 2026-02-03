"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Copy, RefreshCcw } from "lucide-react";

import {
  Button,
  Input,
  Label,
  SectionHeader,
  SectionPanel,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tooltip,
  useToast,
} from "@/shared/ui";
import { cn } from "@/shared/utils";
import { useSettingsMap } from "@/shared/hooks/use-settings";

import {
  defaultImageStudioSettings,
  IMAGE_STUDIO_SETTINGS_KEY,
  parseImageStudioSettings,
  type PromptAutofixOperation,
  type PromptValidationRule,
  type PromptValidationSeverity,
} from "../utils/studio-settings";

type SeverityFilter = PromptValidationSeverity | "all";

const SEVERITY_ORDER: Record<PromptValidationSeverity, number> = {
  error: 0,
  warning: 1,
  info: 2,
};

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
  (rule.similar ?? []).forEach((sim) => {
    parts.push(sim.pattern);
    parts.push(sim.flags ?? "");
    parts.push(sim.suggestion);
    parts.push(sim.comment ?? "");
  });
  (rule.autofix?.operations ?? []).forEach((op) => {
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

  const rawSettings = settingsQuery.data?.get(IMAGE_STUDIO_SETTINGS_KEY) ?? null;
  const studioSettings = useMemo(() => parseImageStudioSettings(rawSettings), [rawSettings]);
  const rules = studioSettings.promptValidation.rules ?? defaultImageStudioSettings.promptValidation.rules;

  const [query, setQuery] = useState<string>("");
  const [severity, setSeverity] = useState<SeverityFilter>("all");
  const [includeDisabled, setIncludeDisabled] = useState<boolean>(true);

  const sortedRules = useMemo((): PromptValidationRule[] => {
    const list = [...rules];
    list.sort((a: PromptValidationRule, b: PromptValidationRule): number => {
      const severityCompare = (SEVERITY_ORDER[a.severity] ?? 99) - (SEVERITY_ORDER[b.severity] ?? 99);
      if (severityCompare !== 0) return severityCompare;
      return a.title.localeCompare(b.title);
    });
    return list;
  }, [rules]);

  const filteredRules = useMemo((): PromptValidationRule[] => {
    const term = query.trim().toLowerCase();
    return sortedRules.filter((rule: PromptValidationRule): boolean => {
      if (!includeDisabled && !rule.enabled) return false;
      if (severity !== "all" && rule.severity !== severity) return false;
      if (!term) return true;
      return ruleSearchText(rule).includes(term);
    });
  }, [includeDisabled, query, severity, sortedRules]);

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
            <Button
              type="button"
              variant="outline"
              onClick={() => void settingsQuery.refetch()}
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
            <Select value={severity} onValueChange={(value: string) => setSeverity((value as SeverityFilter) || "all")}>
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
          Showing <span className="text-gray-200">{filteredRules.length}</span> of{" "}
          <span className="text-gray-200">{sortedRules.length}</span> rules
        </div>
      </SectionPanel>

      <div className="space-y-3">
        {filteredRules.map((rule: PromptValidationRule) => {
          const regexStatus =
            rule.kind === "regex" ? compileRegex(rule.pattern, rule.flags) : null;
          return (
            <SectionPanel key={rule.id} variant="subtle">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-medium text-gray-100">{rule.title}</div>
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide",
                        getSeverityBadgeClasses(rule.severity)
                      )}
                    >
                      {formatSeverityLabel(rule.severity)}
                    </span>
                    {!rule.enabled ? (
                      <span className="rounded-full border border-gray-600/60 bg-gray-600/10 px-2 py-0.5 text-[10px] text-gray-300">
                        Disabled
                      </span>
                    ) : null}
                    <span className="rounded-full border border-border bg-card/50 px-2 py-0.5 text-[10px] text-gray-300">
                      {rule.kind}
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-400">
                    <span className="text-gray-500">Rule ID:</span> {rule.id}
                  </div>
                  {rule.description ? (
                    <div className="text-[11px] text-gray-400">{rule.description}</div>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Tooltip content="Copy rule JSON" side="bottom">
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={() => void handleCopy(JSON.stringify(rule, null, 2), "Rule JSON")}
                    >
                      <Copy className="size-4" />
                    </Button>
                  </Tooltip>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <div className="space-y-1">
                    <div className="text-[11px] text-gray-500">Message</div>
                    <div className="rounded-md border border-border bg-card/50 p-2 text-[12px] text-gray-200">
                      {rule.message}
                    </div>
                  </div>

                  {rule.kind === "regex" ? (
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
                  {rule.similar && rule.similar.length > 0 ? (
                    <div className="space-y-2">
                      {rule.similar.map((sim, index: number) => (
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
                  {rule.autofix?.enabled && rule.autofix.operations.length > 0 ? (
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
              </div>
            </SectionPanel>
          );
        })}
      </div>
    </div>
  );
}

