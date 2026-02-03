"use client";

import React from "react";
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
  Textarea,
  Tooltip,
  useToast,
} from "@/shared/ui";
import { ChevronDown, ChevronUp } from "lucide-react";

import type { AiNode, Edge, NodeConfig, RegexConfig, RuntimeState } from "@/features/ai/ai-paths/lib";
import { renderTemplate } from "@/features/ai/ai-paths/lib";

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
  if (!flags) return "";
  const allowed = new Set(["d", "g", "i", "m", "s", "u", "v", "y"]);
  const seen = new Set<string>();
  const normalized = Array.from(flags)
    .filter((ch: string) => allowed.has(ch))
    .filter((ch: string) => {
      if (seen.has(ch)) return false;
      seen.add(ch);
      return true;
    });
  const order = ["d", "g", "i", "m", "s", "u", "v", "y"];
  normalized.sort((a: string, b: string) => order.indexOf(a) - order.indexOf(b));
  return normalized.join("");
};

const extractRegexLiteral = (value: string): { pattern: string; flags: string } | null => {
  const s = value.trim();
  if (!s.startsWith("/")) return null;
  let pattern = "";
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
    if (ch === "/") break;
    pattern += ch;
  }
  if (i >= s.length) return null;
  const flagsMatch = s.slice(i + 1).match(/^[dgimsuvy]*/);
  const flags = flagsMatch?.[0] ?? "";
  return { pattern, flags };
};

const parseRegexCandidate = (raw: string): RegexCandidate | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // JSON: {"pattern":"...","flags":"...","groupBy":"..."}
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const record = parsed as Record<string, unknown>;
      if (typeof record.pattern === "string" && record.pattern.trim()) {
        return {
          pattern: record.pattern.trim(),
          flags: typeof record.flags === "string" ? normalizeRegexFlags(record.flags) : "",
          ...(typeof record.groupBy === "string" ? { groupBy: record.groupBy } : {}),
        };
      }
      if (typeof record.regex === "string" && record.regex.trim()) {
        const literal = extractRegexLiteral(record.regex);
        if (literal) return { pattern: literal.pattern, flags: normalizeRegexFlags(literal.flags) };
        return { pattern: record.regex.trim(), flags: "" };
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
      pattern: extracted ? extracted.pattern : patternValue.replace(/^\"|\"$/g, "").replace(/^'|'$/g, ""),
      flags: normalizeRegexFlags(flagsLine?.[1] ?? (extracted?.flags ?? "")),
      ...(groupByLine?.[1] ? { groupBy: groupByLine[1].trim() } : {}),
    };
  }

  // Fallback: treat as pattern string
  return { pattern: trimmed, flags: "" };
};

const buildRegexItems = (value: unknown, splitLines: boolean): string[] => {
  if (value === undefined || value === null) return [];
  const list = Array.isArray(value) ? value : [value];
  return list.flatMap((item: unknown): string[] => {
    if (item === undefined || item === null) return [];
    const asString = typeof item === "string" ? item : JSON.stringify(item, null, 2);
    if (!asString) return [];
    if (!splitLines) return [asString];
    return asString
      .split(/\r?\n/)
      .map((line: string) => line.trim())
      .filter(Boolean);
  });
};

const resolveGroupKey = (match: RegExpExecArray, groupBy: string | undefined): string | null => {
  const key = (groupBy ?? "match").trim();
  if (!key || key === "match" || key === "0") {
    return match[0] ?? null;
  }
  const asIndex = Number(key);
  if (Number.isInteger(asIndex)) {
    return match[asIndex] ?? null;
  }
  const groups =
    match.groups && typeof match.groups === "object"
      ? (match.groups as Record<string, string | undefined>)
      : null;
  const candidate = groups ? groups[key] : undefined;
  if (typeof candidate === "string") return candidate;
  return null;
};

type RegexNodeConfigSectionProps = {
  selectedNode: AiNode;
  nodes: AiNode[];
  edges: Edge[];
  runtimeState: RuntimeState;
  updateSelectedNodeConfig: (patch: Partial<NodeConfig>) => void;
  onSendToAi?: (sourceNodeId: string, prompt: string) => Promise<void>;
  sendingToAi?: boolean;
};

export function RegexNodeConfigSection({
  selectedNode,
  nodes,
  edges,
  runtimeState,
  updateSelectedNodeConfig,
  onSendToAi,
  sendingToAi,
}: RegexNodeConfigSectionProps): React.JSX.Element | null {
  const { toast } = useToast();

  const isRegexNode = selectedNode.type === "regex";

  const regexConfig = React.useMemo((): RegexConfig => {
    return (isRegexNode ? selectedNode.config?.regex : undefined) ?? {
      pattern: "",
      flags: "g",
      matchMode: "first",
      groupBy: "match",
      outputMode: "object",
      includeUnmatched: true,
      unmatchedKey: "__unmatched__",
      splitLines: true,
      sampleText: "",
      aiPrompt: "",
    };
  }, [isRegexNode, selectedNode.config?.regex]);

  const updateRegex = (patch: Partial<RegexConfig>): void => {
    if (!isRegexNode) return;
    updateSelectedNodeConfig({
      regex: {
        ...regexConfig,
        ...patch,
      },
    });
  };

  const [pendingAiRegex, setPendingAiRegex] = React.useState<string>("");
  const [selectedSnippetIndex, setSelectedSnippetIndex] = React.useState<number>(-1);
  const lastInjectedResponseRef = React.useRef<string>("");

  const codeSnippets = React.useMemo((): string[] => {
    if (!pendingAiRegex) return [];
    return extractCodeSnippets(pendingAiRegex);
  }, [pendingAiRegex]);

  React.useEffect((): void => {
    setSelectedSnippetIndex(codeSnippets.length > 0 ? 0 : -1);
  }, [codeSnippets.length]);

  React.useEffect(() => {
    const callbackValue =
      runtimeState.inputs[selectedNode.id]?.regexCallback ??
      runtimeState.outputs[selectedNode.id]?.regexCallback;
    if (typeof callbackValue === "string" && callbackValue.trim().length > 0) {
      if (callbackValue !== lastInjectedResponseRef.current) {
        lastInjectedResponseRef.current = callbackValue;
        setPendingAiRegex(callbackValue);
        toast("AI regex ready for review.", { variant: "success" });
      }
    }
  }, [runtimeState, selectedNode.id, toast]);

  const normalizedFlags = normalizeRegexFlags(regexConfig.flags);
  const pattern = regexConfig.pattern ?? "";
  const isPatternEmpty = !pattern.trim();

  const regexValidation = React.useMemo(() => {
    if (isPatternEmpty) return { ok: false, error: "Enter a regex pattern to preview.", regex: null as RegExp | null };
    try {
      return {
        ok: true,
        error: "",
        regex: new RegExp(pattern, normalizedFlags),
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Invalid regex.",
        regex: null,
      };
    }
  }, [isPatternEmpty, pattern, normalizedFlags]);

  const runtimeSample =
    runtimeState.inputs[selectedNode.id]?.value ??
    runtimeState.inputs[selectedNode.id]?.prompt ??
    runtimeState.outputs[selectedNode.id]?.value ??
    runtimeState.outputs[selectedNode.id]?.prompt ??
    undefined;

  const sampleSource = (regexConfig.sampleText ?? "").trim() ? regexConfig.sampleText : runtimeSample;
  const splitLines = regexConfig.splitLines ?? true;
  const sampleLines = React.useMemo(
    (): string[] => buildRegexItems(sampleSource, splitLines),
    [sampleSource, splitLines]
  );

  const preview = React.useMemo(() => {
    const includeUnmatched = regexConfig.includeUnmatched ?? true;
    const unmatchedKey = (regexConfig.unmatchedKey ?? "__unmatched__").trim() || "__unmatched__";
    const matchMode = regexConfig.matchMode ?? "first";
    const groupBy = regexConfig.groupBy ?? "match";

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
        grouped: regexConfig.outputMode === "array" ? [] : {},
      };
    }

    const compiled = regexValidation.regex;
    const nonGlobalRegex = compiled && matchMode === "first" && compiled.flags.includes("g")
      ? new RegExp(compiled.source, compiled.flags.replace("g", ""))
      : compiled;

    sampleLines.forEach((input: string) => {
      if (matchMode === "all" && compiled) {
        const flagsWithG = compiled.flags.includes("g") ? compiled.flags : `${compiled.flags}g`;
        const regexAll = new RegExp(compiled.source, flagsWithG);
        let found = false;
        let match: RegExpExecArray | null;
        while ((match = regexAll.exec(input)) !== null) {
          found = true;
          const key = resolveGroupKey(match, groupBy) ?? unmatchedKey;
          const groups =
            match.groups && typeof match.groups === "object"
              ? (Object.fromEntries(
                  Object.entries(match.groups).map(([k, v]: [string, string | undefined]) => [k, v ?? ""])
                ) as Record<string, string>)
              : null;
          const record: RegexPreviewRecord = {
            input,
            match: match[0] ?? null,
            index: typeof match.index === "number" ? match.index : null,
            captures: match.slice(1).map((value: string | undefined) => value ?? ""),
            groups,
            key,
          };
          matches.push(record);
          pushGrouped(key, record);
          if (match[0] === "") {
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
          };
          matches.push(record);
          pushGrouped(unmatchedKey, record);
        }
        return;
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
        };
        matches.push(record);
        pushGrouped(unmatchedKey, record);
        return;
      }
      const key = resolveGroupKey(match, groupBy) ?? unmatchedKey;
      const groups =
        match.groups && typeof match.groups === "object"
          ? (Object.fromEntries(
              Object.entries(match.groups).map(([k, v]: [string, string | undefined]) => [k, v ?? ""])
            ) as Record<string, string>)
          : null;
      const record: RegexPreviewRecord = {
        input,
        match: match[0] ?? null,
        index: typeof match.index === "number" ? match.index : null,
        captures: match.slice(1).map((value: string | undefined) => value ?? ""),
        groups,
        key,
      };
      matches.push(record);
      pushGrouped(key, record);
    });

    const groupedObject = Object.fromEntries(groupedMap.entries());
    const grouped =
      regexConfig.outputMode === "array"
        ? Object.entries(groupedObject).map(([key, items]: [string, RegexPreviewRecord[]]) => ({ key, items }))
        : groupedObject;

    return { matches, grouped };
  }, [regexConfig, regexValidation, sampleLines]);

  const pendingAiRegexSection = pendingAiRegex ? (
    <div className="rounded-md border border-purple-500/40 bg-purple-500/10 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-purple-400"></div>
          <span className="text-xs text-purple-100">AI regex ready for review</span>
          {codeSnippets.length > 0 ? (
            <span className="text-[10px] text-purple-300">
              ({codeSnippets.length} code snippet{codeSnippets.length > 1 ? "s" : ""})
            </span>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            className="h-7 rounded-md border border-emerald-700 bg-emerald-500/10 px-3 text-[10px] text-emerald-200 hover:bg-emerald-500/20"
            onClick={() => {
              const candidateText =
                selectedSnippetIndex >= 0 && codeSnippets[selectedSnippetIndex]
                  ? codeSnippets[selectedSnippetIndex]
                  : pendingAiRegex;
              const candidate = parseRegexCandidate(candidateText);
              if (!candidate) {
                toast("Could not parse AI regex suggestion.", { variant: "error" });
                return;
              }
              updateRegex({
                pattern: candidate.pattern,
                flags: candidate.flags || normalizedFlags,
                ...(candidate.groupBy ? { groupBy: candidate.groupBy } : {}),
              });
              setPendingAiRegex("");
              toast("AI regex accepted.", { variant: "success" });
            }}
          >
            {selectedSnippetIndex >= 0 && codeSnippets.length > 0
              ? `Accept Snippet ${selectedSnippetIndex + 1}`
              : "Accept"}
          </Button>
          <Button
            type="button"
            className="h-7 rounded-md border border-rose-700 bg-rose-500/10 px-3 text-[10px] text-rose-200 hover:bg-rose-500/20"
            onClick={() => {
              setPendingAiRegex("");
              toast("AI regex rejected.", { variant: "success" });
            }}
          >
            Reject
          </Button>
        </div>
      </div>

      {codeSnippets.length > 0 ? (
        <div className="mt-2 flex items-center gap-2">
          <div className="flex flex-col">
            <Button
              type="button"
              className="h-5 w-5 rounded-sm border border-purple-600 bg-purple-500/20 p-0 text-purple-200 hover:bg-purple-500/40 disabled:opacity-30"
              disabled={selectedSnippetIndex <= 0}
              onClick={() => setSelectedSnippetIndex((prev: number) => Math.max(0, prev - 1))}
            >
              <ChevronUp className="h-3 w-3" />
            </Button>
            <Button
              type="button"
              className="h-5 w-5 rounded-sm border border-purple-600 bg-purple-500/20 p-0 text-purple-200 hover:bg-purple-500/40 disabled:opacity-30"
              disabled={selectedSnippetIndex >= codeSnippets.length - 1}
              onClick={() =>
                setSelectedSnippetIndex((prev: number) => Math.min(codeSnippets.length - 1, prev + 1))
              }
            >
              <ChevronDown className="h-3 w-3" />
            </Button>
          </div>
          <div className="flex-1 rounded-md border border-cyan-600/50 bg-cyan-500/10 p-2">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[10px] text-cyan-300">
                Snippet {selectedSnippetIndex + 1} of {codeSnippets.length}
              </span>
              <Button
                type="button"
                className="h-5 rounded-sm border border-gray-600 bg-gray-500/20 px-2 text-[9px] text-gray-300 hover:bg-gray-500/40"
                onClick={() => setSelectedSnippetIndex(-1)}
              >
                Show Full Response
              </Button>
            </div>
            <pre className="max-h-20 overflow-auto rounded bg-card/70 p-2 text-[11px] text-cyan-100 whitespace-pre-wrap break-all">
              {codeSnippets[selectedSnippetIndex]}
            </pre>
          </div>
        </div>
      ) : null}

      {selectedSnippetIndex < 0 || codeSnippets.length === 0 ? (
        <pre className="mt-2 max-h-28 overflow-auto rounded-md bg-card/70 p-2 text-[11px] text-gray-300 whitespace-pre-wrap break-all">
          {pendingAiRegex}
        </pre>
      ) : null}
    </div>
  ) : null;

  const connectedModel = React.useMemo(() => {
    const outgoing = edges.filter((edge: Edge) => edge.from === selectedNode.id);
    const aiEdge = outgoing.find((edge: Edge) => {
      const targetNode = nodes.find((n: AiNode) => n.id === edge.to);
      return targetNode?.type === "model";
    });
    const modelNode = aiEdge ? nodes.find((n: AiNode) => n.id === aiEdge.to && n.type === "model") : null;
    return {
      aiEdge,
      modelNode,
      modelId: modelNode?.config?.model?.modelId,
    };
  }, [edges, nodes, selectedNode.id]);

  const sampleTextForAi = React.useMemo((): string => {
    if (typeof sampleSource === "string") return sampleSource;
    if (sampleSource === undefined || sampleSource === null) return "";
    try {
      return JSON.stringify(sampleSource, null, 2);
    } catch {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return String(sampleSource as any);
    }
  }, [sampleSource]);

  const resolvedAiPrompt = React.useMemo((): string => {
    const template = regexConfig.aiPrompt ?? "";
    if (!template.trim()) return "";
    const context: Record<string, unknown> = {
      ...regexConfig,
      text: sampleTextForAi,
      lines: sampleLines,
      sampleCount: sampleLines.length,
    };
    return renderTemplate(template, context, sampleTextForAi);
  }, [regexConfig, sampleLines, sampleTextForAi]);

  if (!isRegexNode) return null;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <Label className="text-xs text-gray-400">Regex Pattern</Label>
            <Input
              className="mt-2 w-full rounded-md border border-border bg-card/70 text-sm text-white"
              value={regexConfig.pattern ?? ""}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                updateRegex({ pattern: event.target.value })
              }
              placeholder='Example: ^(?<prefix>[A-Z]+)-(?<id>\\d+)$'
            />
            <p className="mt-2 text-[11px] text-gray-500">
              Pattern is stored without / delimiters. You can paste /pattern/flags and click Normalize.
            </p>
          </div>
          <div className="w-[140px]">
            <Label className="text-xs text-gray-400">Flags</Label>
            <Input
              className="mt-2 w-full rounded-md border border-border bg-card/70 text-sm text-white"
              value={regexConfig.flags ?? ""}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                updateRegex({ flags: event.target.value })
              }
              placeholder="gim"
            />
            <div className="mt-2 flex gap-2">
              <Button
                type="button"
                className="h-7 flex-1 rounded-md border border-border px-2 text-[10px] text-gray-200 hover:bg-muted/50"
                onClick={() => {
                  const combined = (regexConfig.pattern ?? "").trim();
                  const extracted = extractRegexLiteral(combined);
                  if (!extracted) {
                    updateRegex({ flags: normalizedFlags });
                    return;
                  }
                  updateRegex({
                    pattern: extracted.pattern,
                    flags: normalizeRegexFlags(extracted.flags),
                  });
                }}
                title="Normalize flags / parse /pattern/flags if pasted into the Pattern field"
              >
                Normalize
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <Label className="text-xs text-gray-400">Match Mode</Label>
            <Select
              value={regexConfig.matchMode ?? "first"}
              onValueChange={(value: string): void =>
                updateRegex({ matchMode: value as NonNullable<RegexConfig["matchMode"]> })
              }
            >
              <SelectTrigger className="mt-2 h-8 w-full border-border bg-card/70 text-xs text-white">
                <SelectValue placeholder="Select mode" />
              </SelectTrigger>
              <SelectContent className="border-border bg-gray-900">
                <SelectItem value="first">First match</SelectItem>
                <SelectItem value="all">All matches</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-gray-400">Output Mode</Label>
            <Select
              value={regexConfig.outputMode ?? "object"}
              onValueChange={(value: string): void =>
                updateRegex({ outputMode: value as NonNullable<RegexConfig["outputMode"]> })
              }
            >
              <SelectTrigger className="mt-2 h-8 w-full border-border bg-card/70 text-xs text-white">
                <SelectValue placeholder="Select output" />
              </SelectTrigger>
              <SelectContent className="border-border bg-gray-900">
                <SelectItem value="object">Object (Record)</SelectItem>
                <SelectItem value="array">Array (Groups list)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <Label className="text-xs text-gray-400">Group By</Label>
            <Input
              className="mt-2 w-full rounded-md border border-border bg-card/70 text-sm text-white"
              value={regexConfig.groupBy ?? "match"}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                updateRegex({ groupBy: event.target.value })
              }
              placeholder='match | 1 | prefix'
            />
            <p className="mt-1 text-[11px] text-gray-500">
              Use <span className="text-gray-300">match</span>, a capture index (1,2,...) or a named group.
            </p>
          </div>
          <div className="flex flex-col justify-between">
            <div className="flex items-center justify-between rounded-md border border-border bg-card/50 px-3 py-2">
              <div>
                <div className="text-[11px] text-gray-300">Split lines</div>
                <div className="text-[11px] text-gray-500">Treat each line as an input item.</div>
              </div>
              <Switch
                checked={regexConfig.splitLines ?? true}
                onCheckedChange={(checked: boolean) => updateRegex({ splitLines: checked })}
              />
            </div>
            <div className="mt-2 flex items-center justify-between rounded-md border border-border bg-card/50 px-3 py-2">
              <div>
                <div className="text-[11px] text-gray-300">Include unmatched</div>
                <div className="text-[11px] text-gray-500">Keep non-matching inputs under a group key.</div>
              </div>
              <Switch
                checked={regexConfig.includeUnmatched ?? true}
                onCheckedChange={(checked: boolean) => updateRegex({ includeUnmatched: checked })}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <Label className="text-xs text-gray-400">Unmatched Key</Label>
            <Input
              className="mt-2 w-full rounded-md border border-border bg-card/70 text-sm text-white"
              value={regexConfig.unmatchedKey ?? "__unmatched__"}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                updateRegex({ unmatchedKey: event.target.value })
              }
              placeholder="__unmatched__"
            />
          </div>
          <div className="rounded-md border border-border bg-card/50 px-3 py-2">
            <div className="text-[11px] text-gray-300">Validation</div>
            <div className={`mt-1 text-[11px] ${regexValidation.ok ? "text-emerald-200" : "text-rose-200"}`}>
              {regexValidation.ok ? "Regex compiles" : regexValidation.error}
            </div>
            {!regexValidation.ok ? (
              <div className="mt-1 text-[11px] text-gray-500">
                Tip: use <span className="text-gray-300">\\\\</span> to escape backslashes in string patterns.
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-gray-400">Preview Sample</Label>
          <div className="text-[11px] text-gray-500">
            {sampleLines.length} item{sampleLines.length === 1 ? "" : "s"}
          </div>
        </div>
        <Textarea
          className="min-h-[110px] w-full rounded-md border border-border bg-card/70 font-mono text-xs text-white"
          value={typeof sampleSource === "string" ? sampleSource : ""}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => updateRegex({ sampleText: event.target.value })}
          placeholder="Paste example strings here (one per line). Leave empty to use runtime inputs."
        />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-md border border-border bg-card/50 p-3">
            <div className="text-[11px] text-gray-300">Matches</div>
            <pre className="mt-2 max-h-48 overflow-auto rounded bg-card/70 p-2 text-[11px] text-gray-200 whitespace-pre-wrap break-all">
              {JSON.stringify(preview.matches, null, 2)}
            </pre>
          </div>
          <div className="rounded-md border border-border bg-card/50 p-3">
            <div className="text-[11px] text-gray-300">Grouped Output</div>
            <pre className="mt-2 max-h-48 overflow-auto rounded bg-card/70 p-2 text-[11px] text-gray-200 whitespace-pre-wrap break-all">
              {JSON.stringify(preview.grouped, null, 2)}
            </pre>
          </div>
        </div>
      </div>

      {pendingAiRegexSection}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-gray-400">AI Prompt (Output to AI Model)</Label>
          {connectedModel.modelNode ? (
            <div className="text-[11px] text-emerald-200">
              Connected: <span className="text-emerald-100">{connectedModel.modelId || "Model"}</span>
            </div>
          ) : (
            <div className="text-[11px] text-amber-200">Not connected to AI Model</div>
          )}
        </div>

        <Textarea
          className="min-h-[120px] w-full rounded-md border border-border bg-card/70 text-sm text-white"
          value={regexConfig.aiPrompt ?? ""}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void => updateRegex({ aiPrompt: event.target.value })}
          onKeyDown={(event: React.KeyboardEvent<HTMLTextAreaElement>): void => {
            if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
              event.preventDefault();
              if (!onSendToAi || !resolvedAiPrompt.trim() || sendingToAi) return;
              void onSendToAi(selectedNode.id, resolvedAiPrompt);
            }
          }}
          placeholder="Ask the model to propose a regex. Use {{text}} / {{lines}} placeholders. (Ctrl+Enter to send)"
        />

        <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-400">
          <span>Placeholders:</span>
          <Tooltip content="Resolved sample text (from Preview Sample / runtime)" side="bottom">
            <span className="rounded-full border px-2 py-0.5 text-[10px] text-gray-200">{`{{text}}`}</span>
          </Tooltip>
          <Tooltip content="Resolved sample items array (lines)" side="bottom">
            <span className="rounded-full border px-2 py-0.5 text-[10px] text-gray-200">{`{{lines}}`}</span>
          </Tooltip>
          <Tooltip content="Alias for current value (same as sample text)" side="bottom">
            <span className="rounded-full border px-2 py-0.5 text-[10px] text-gray-200">{`{{value}}`}</span>
          </Tooltip>
        </div>

        <div className="flex flex-wrap gap-2">
          {onSendToAi ? (
            <Button
              type="button"
              className="h-8 rounded-md border border-sky-500/40 bg-sky-500/10 px-3 text-[11px] text-sky-200 hover:bg-sky-500/20 disabled:opacity-50"
              disabled={sendingToAi || !resolvedAiPrompt.trim()}
              onClick={() => {
                if (!resolvedAiPrompt.trim()) {
                  toast("AI prompt is empty.", { variant: "error" });
                  return;
                }
                void onSendToAi(selectedNode.id, resolvedAiPrompt);
              }}
            >
              {sendingToAi ? "Sending..." : "Send to AI Model"}
            </Button>
          ) : null}
          <Button
            type="button"
            className="h-8 rounded-md border border-border px-3 text-[11px] text-gray-200 hover:bg-muted/50"
            onClick={() => {
              try {
                void navigator.clipboard.writeText(resolvedAiPrompt);
                toast("Resolved AI prompt copied.", { variant: "success" });
              } catch {
                toast("Failed to copy.", { variant: "error" });
              }
            }}
            disabled={!resolvedAiPrompt.trim()}
            title="Copy the resolved prompt (after placeholder substitution)"
          >
            Copy Resolved
          </Button>
        </div>
      </div>
    </div>
  );
}
