"use client";

import React from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import type { AiNode, NodeConfig, RuntimeState } from "@/features/ai-paths/lib";
import {
  DEFAULT_CONTEXT_ROLE,
  applyContextPreset,
  formatRuntimeValue,
  getContextPresetSet,
  parsePathList,
  safeStringify,
  toggleContextTarget,
} from "@/features/ai-paths/lib";

function pruneLargeFields(value: unknown, seen = new Set<object>()): unknown {
  if (!value || typeof value !== "object") return value;
  if (seen.has(value)) return "[Circular]";
  seen.add(value);
  if (Array.isArray(value)) {
    return value.map((item) => pruneLargeFields(item, seen));
  }
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value)) {
    if (typeof val === "string" && val.length > 1000) {
      result[key] = `${val.substring(0, 1000)}... [truncated, ${val.length} chars]`;
    } else {
      result[key] = pruneLargeFields(val, seen);
    }
  }
  return result;
}

function sanitizePayload(value: unknown, hideLargeFields: boolean): unknown {
  return hideLargeFields ? pruneLargeFields(value) : value;
}

type ContextNodeConfigSectionProps = {
  selectedNode: AiNode;
  runtimeState: RuntimeState;
  updateSelectedNodeConfig: (patch: Partial<NodeConfig>) => void;
  toast: (message: string, options?: { variant?: "success" | "error" }) => void;
};

export function ContextNodeConfigSection({
  selectedNode,
  runtimeState,
  updateSelectedNodeConfig,
  toast,
}: ContextNodeConfigSectionProps) {
  const [hideLargeFields, setHideLargeFields] = React.useState(true);
  const [showDiff, setShowDiff] = React.useState(true);
  const [diffOnlyChanges, setDiffOnlyChanges] = React.useState(true);

  if (selectedNode.type !== "context") return null;

  const contextConfig = selectedNode.config?.context ?? {
    role: DEFAULT_CONTEXT_ROLE,
    entityType: "product",
    entityIdSource: "simulation",
    entityId: "",
    scopeMode: "full",
    scopeTarget: "entity",
    includePaths: [],
    excludePaths: [],
  };
  const presetSet = getContextPresetSet(contextConfig.entityType);
  const receivedInputs = runtimeState.inputs[selectedNode.id] ?? {};
  const resolvedOutputs = runtimeState.outputs[selectedNode.id] ?? {};

  const stringifyPayload = (value: unknown): string => {
    if (value === undefined) return "";
    if (typeof value === "string") return value;
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return safeStringify(value);
    }
  };
  const receivedContext = sanitizePayload(receivedInputs["context"], hideLargeFields);
  const sanitizedInputs = sanitizePayload(receivedInputs, hideLargeFields) as Record<string, unknown>;
  const sanitizedOutputs = sanitizePayload(resolvedOutputs, hideLargeFields) as Record<string, unknown>;
  const receivedContextText = stringifyPayload(receivedContext);
  const receivedInputsText = stringifyPayload(sanitizedInputs);
  const resolvedOutputsText = stringifyPayload(sanitizedOutputs);
  const resolvedEntityId =
    typeof sanitizedOutputs?.entityId === "string"
      ? (sanitizedOutputs.entityId)
      : "";
  const resolvedEntityType =
    typeof sanitizedOutputs?.entityType === "string"
      ? (sanitizedOutputs.entityType)
      : "";
  const diffInputs = sanitizedInputs ?? {};
  const diffOutputs = sanitizedOutputs ?? {};
  const diffKeys = Array.from(
    new Set([
      ...Object.keys(diffInputs ?? {}),
      ...Object.keys(diffOutputs ?? {}),
    ])
  ).sort();
  const diff = diffKeys.reduce<{
    added: string[];
    removed: string[];
    changed: string[];
    same: string[];
  }>(
    (acc, key) => {
      const inInput = key in diffInputs;
      const inOutput = key in diffOutputs;
      if (!inInput && inOutput) {
        acc.added.push(key);
        return acc;
      }
      if (inInput && !inOutput) {
        acc.removed.push(key);
        return acc;
      }
      const inputValue = diffInputs[key];
      const outputValue = diffOutputs[key];
      const inputString = stringifyPayload(inputValue);
      const outputString = stringifyPayload(outputValue);
      if (inputString !== outputString) {
        acc.changed.push(key);
      } else {
        acc.same.push(key);
      }
      return acc;
    },
    { added: [], removed: [], changed: [], same: [] }
  );
  const diffLines = [
    ...diff.added.map(
      (key) => `+ ${key}: ${formatRuntimeValue(diffOutputs[key])}`
    ),
    ...diff.removed.map(
      (key) => `- ${key}: ${formatRuntimeValue(diffInputs[key])}`
    ),
    ...diff.changed.map(
      (key) =>
        `~ ${key}: ${formatRuntimeValue(diffInputs[key])} -> ${formatRuntimeValue(
          diffOutputs[key]
        )}`
    ),
    ...(!diffOnlyChanges
      ? diff.same.map((key) => `= ${key}`)
      : []),
  ];
  const copyPayload = async (payload: unknown, label: string) => {
    try {
      await navigator.clipboard.writeText(stringifyPayload(payload));
      toast(`${label} copied.`, { variant: "success" });
    } catch (error) {
      toast("Failed to copy payload.", { variant: "error" });
      console.warn("Failed to copy payload", error);
    }
  };
  const copyDiff = async () => {
    try {
      await navigator.clipboard.writeText(diffLines.join("\n"));
      toast("Diff copied.", { variant: "success" });
    } catch (error) {
      toast("Failed to copy diff.", { variant: "error" });
      console.warn("Failed to copy diff", error);
    }
  };
  const combinedPayload = {
    inputs: sanitizedInputs,
    outputs: sanitizedOutputs,
    diff: {
      added: diff.added,
      removed: diff.removed,
      changed: diff.changed,
      same: diff.same,
    },
  };
  return (
    <div className="space-y-4">
      <p className="text-[11px] text-gray-500">
        Connect Trigger <span className="text-gray-300">context</span> into this
        node to filter it. If left unconnected, the filter will fetch an
        entity based on the settings below.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          className="rounded-md border px-2 py-1 text-[10px] text-gray-200 hover:bg-card/70"
          onClick={() => { void copyPayload(combinedPayload, "Payload"); }}
        >
          Copy payload
        </Button>
        <Button
          type="button"
          className="rounded-md border px-2 py-1 text-[10px] text-gray-200 hover:bg-card/70"
          onClick={() => { void copyPayload(sanitizedInputs, "Inputs"); }}
        >
          Copy inputs
        </Button>
        <Button
          type="button"
          className="rounded-md border px-2 py-1 text-[10px] text-gray-200 hover:bg-card/70"
          onClick={() => { void copyPayload(sanitizedOutputs, "Outputs"); }}
        >
          Copy outputs
        </Button>
        <Button
          type="button"
          className="rounded-md border px-2 py-1 text-[10px] text-gray-200 hover:bg-card/70"
          onClick={() => { void copyDiff(); }}
        >
          Copy diff
        </Button>
        <Button
          type="button"
          className={`rounded-md border px-2 py-1 text-[10px] ${
            hideLargeFields
              ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-200"
              : "border text-gray-200 hover:bg-card/70"
          }`}
          onClick={() => setHideLargeFields((prev) => !prev)}
        >
          {hideLargeFields ? "Hide large fields" : "Show large fields"}
        </Button>
        <Button
          type="button"
          className={`rounded-md border px-2 py-1 text-[10px] ${
            showDiff
              ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-200"
              : "border text-gray-200 hover:bg-card/70"
          }`}
          onClick={() => setShowDiff((prev) => !prev)}
        >
          {showDiff ? "Diff on" : "Diff off"}
        </Button>
        {showDiff && (
          <Button
            type="button"
            className={`rounded-md border px-2 py-1 text-[10px] ${
              diffOnlyChanges
                ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-200"
                : "border text-gray-200 hover:bg-card/70"
            }`}
            onClick={() => setDiffOnlyChanges((prev) => !prev)}
          >
            {diffOnlyChanges ? "Changes only" : "Show all"}
          </Button>
        )}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-md border border-border bg-card/60 p-3">
          <div className="text-[11px] text-gray-400">Resolved Entity</div>
          <div className="mt-2 text-[12px] text-gray-200">
            {resolvedEntityId
              ? `${resolvedEntityType || "entity"} · ${resolvedEntityId}`
              : "No entity resolved yet"}
          </div>
        </div>
        <div className="rounded-md border border-border bg-card/60 p-3">
          <div className="text-[11px] text-gray-400">Received context summary</div>
          <div className="mt-2 text-[12px] text-gray-200">
            {receivedContextText
              ? `${receivedContextText.length} chars`
              : "No context input received"}
          </div>
        </div>
      </div>
      <div className="rounded-md border border-border bg-card/60 p-3">
        <div className="text-[11px] text-gray-400">Received payload (context input)</div>
        {receivedContextText ? (
          <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap text-[11px] text-gray-200">
            {receivedContextText}
          </pre>
        ) : (
          <p className="mt-2 text-[11px] text-gray-500">
            No context payload received yet. Fire the trigger or connect a
            context input to inspect the payload.
          </p>
        )}
      </div>
      <div className="rounded-md border border-border bg-card/60 p-3">
        <div className="text-[11px] text-gray-400">All incoming inputs</div>
        {Object.keys(receivedInputs).length > 0 ? (
          <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap text-[11px] text-gray-200">
            {receivedInputsText}
          </pre>
        ) : (
          <p className="mt-2 text-[11px] text-gray-500">
            No inputs recorded yet for this node.
          </p>
        )}
      </div>
      <div className="rounded-md border border-border bg-card/60 p-3">
        <div className="text-[11px] text-gray-400">Resolved outputs</div>
        {Object.keys(resolvedOutputs).length > 0 ? (
          <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap text-[11px] text-gray-200">
            {resolvedOutputsText}
          </pre>
        ) : (
          <p className="mt-2 text-[11px] text-gray-500">
            No resolved outputs yet. Trigger the path to populate this panel.
          </p>
        )}
      </div>
      {showDiff && (
        <div className="rounded-md border border-border bg-card/60 p-3">
          <div className="text-[11px] text-gray-400">
            Diff (inputs vs outputs)
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-gray-300">
            <span>Added: {diff.added.length}</span>
            <span>Removed: {diff.removed.length}</span>
            <span>Changed: {diff.changed.length}</span>
            <span>Unchanged: {diff.same.length}</span>
          </div>
          {diffLines.length > 0 ? (
            <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap text-[11px] text-gray-200">
              {diffLines.join("\n")}
            </pre>
          ) : (
            <p className="mt-2 text-[11px] text-gray-500">
              No differences detected yet.
            </p>
          )}
        </div>
      )}
      <div>
        <Label className="text-xs text-gray-400">Filter Role</Label>
        <Input
          className="mt-2 w-full rounded-md border border-border bg-card/70 text-sm text-white"
          value={contextConfig.role}
          onChange={(event) =>
            updateSelectedNodeConfig({
              context: { ...contextConfig, role: event.target.value },
            })
          }
        />
        <p className="mt-2 text-[11px] text-gray-500">
          Optional label attached to the filtered context output.
        </p>
      </div>
      <div>
        <Label className="text-xs text-gray-400">Context Scope Presets</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {(["light", "medium", "full"] as const).map((preset) => (
            <Button
              key={preset}
              type="button"
              className="rounded-md border px-3 py-1 text-[10px] text-gray-200 hover:bg-muted/60"
              onClick={() =>
                updateSelectedNodeConfig({
                  context: applyContextPreset(contextConfig, preset),
                })
              }
            >
              {preset.toUpperCase()}
            </Button>
          ))}
          <Button
            type="button"
            className="rounded-md border px-3 py-1 text-[10px] text-gray-200 hover:bg-muted/60"
            onClick={() =>
              updateSelectedNodeConfig({
                context: {
                  ...contextConfig,
                  scopeMode: "full",
                  includePaths: [],
                  excludePaths: [],
                },
              })
            }
          >
            RESET
          </Button>
        </div>
        <p className="mt-2 text-[11px] text-gray-500">
          Presets adjust scope to include curated fields for the selected entity (or a generic set when auto).
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs text-gray-400">Entity Type</Label>
        <Select
            value={contextConfig.entityType ?? "auto"}
            onValueChange={(value) =>
              updateSelectedNodeConfig({
                context: { ...contextConfig, entityType: value },
              })
            }
          >
            <SelectTrigger className="mt-2 w-full border-border bg-card/70 text-sm text-white">
              <SelectValue placeholder="Select entity" />
            </SelectTrigger>
            <SelectContent className="border-border bg-gray-900">
              <SelectItem value="auto">Auto (use trigger)</SelectItem>
              <SelectItem value="product">Product</SelectItem>
              <SelectItem value="note">Note</SelectItem>
              <SelectItem value="chat">Chat</SelectItem>
              <SelectItem value="log">Log Entry</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-gray-400">Scope Target</Label>
          <Select
            value={contextConfig.scopeTarget ?? "entity"}
            onValueChange={(value) =>
              updateSelectedNodeConfig({
                context: {
                  ...contextConfig,
                  scopeTarget: value as "entity" | "context",
                },
              })
            }
          >
            <SelectTrigger className="mt-2 w-full border-border bg-card/70 text-sm text-white">
              <SelectValue placeholder="Select target" />
            </SelectTrigger>
            <SelectContent className="border-border bg-gray-900">
              <SelectItem value="entity">Entity only</SelectItem>
              <SelectItem value="context">Full context</SelectItem>
            </SelectContent>
          </Select>
          <p className="mt-2 text-[11px] text-gray-500">
            Choose whether scope filters apply to the entity payload or the
            full context object.
          </p>
        </div>
        <div>
          <Label className="text-xs text-gray-400">Entity ID Source</Label>
          <Select
            value={contextConfig.entityIdSource ?? "simulation"}
            onValueChange={(value) =>
              updateSelectedNodeConfig({
                context: {
                  ...contextConfig,
                  entityIdSource: value as "simulation" | "manual" | "context",
                },
              })
            }
          >
            <SelectTrigger className="mt-2 w-full border-border bg-card/70 text-sm text-white">
              <SelectValue placeholder="Select source" />
            </SelectTrigger>
            <SelectContent className="border-border bg-gray-900">
              <SelectItem value="simulation">Simulation node</SelectItem>
              <SelectItem value="context">Context payload</SelectItem>
              <SelectItem value="manual">Manual ID</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label className="text-xs text-gray-400">Target Fields</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {presetSet.suggested.map((field) => {
            const active = contextConfig.includePaths?.includes(field);
            return (
              <button
                key={field}
                type="button"
                onClick={() =>
                  updateSelectedNodeConfig({
                    context: toggleContextTarget(contextConfig, field),
                  })
                }
                className={`rounded-full border px-2 py-1 text-[10px] transition ${
                  active
                    ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-200"
                    : "border text-gray-300 hover:bg-card/70"
                }`}
              >
                {field}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() =>
              updateSelectedNodeConfig({
                context: {
                  ...contextConfig,
                  scopeMode: "include",
                  includePaths: [],
                  excludePaths: [],
                },
              })
            }
            className="rounded-full border px-2 py-1 text-[10px] text-gray-300 hover:bg-card/70"
          >
            Clear
          </button>
        </div>
        <p className="mt-2 text-[11px] text-gray-500">
          Click to toggle fields. This switches scope to include mode.
        </p>
      </div>
      {contextConfig.entityIdSource === "manual" && (
        <div>
          <Label className="text-xs text-gray-400">Entity ID</Label>
          <Input
            className="mt-2 w-full rounded-md border border-border bg-card/70 text-sm text-white"
            value={contextConfig.entityId ?? ""}
            onChange={(event) =>
              updateSelectedNodeConfig({
                context: { ...contextConfig, entityId: event.target.value },
              })
            }
          />
        </div>
      )}
        <div>
          <Label className="text-xs text-gray-400">Data Scope</Label>
          <Select
            value={contextConfig.scopeMode ?? "full"}
            onValueChange={(value) =>
              updateSelectedNodeConfig({
                context: {
                  ...contextConfig,
                  scopeMode: value as "full" | "include" | "exclude",
                },
              })
            }
          >

          <SelectTrigger className="mt-2 w-full border-border bg-card/70 text-sm text-white">
            <SelectValue placeholder="Select scope" />
          </SelectTrigger>
          <SelectContent className="border-border bg-gray-900">
            <SelectItem value="full">Full entity payload</SelectItem>
            <SelectItem value="include">Include only listed paths</SelectItem>
            <SelectItem value="exclude">Exclude listed paths</SelectItem>
          </SelectContent>
        </Select>
        <p className="mt-2 text-[11px] text-gray-500">
          Use dot paths (e.g. <span className="text-gray-300">priceGroups.default</span>).
        </p>
      </div>
      {(contextConfig.scopeMode === "include" ||
        contextConfig.scopeMode === "exclude") && (
        <div>
          <Label className="text-xs text-gray-400">
            {contextConfig.scopeMode === "include"
              ? "Include paths (one per line)"
              : "Exclude paths (one per line)"}
          </Label>
          <Textarea
            className="mt-2 min-h-[120px] w-full rounded-md border border-border bg-card/70 text-sm text-white"
            value={
              contextConfig.scopeMode === "include"
                ? (contextConfig.includePaths ?? []).join("\n")
                : (contextConfig.excludePaths ?? []).join("\n")
            }
            onChange={(event) => {
              const list = parsePathList(event.target.value);
              updateSelectedNodeConfig({
                context: {
                  ...contextConfig,
                  includePaths:
                    contextConfig.scopeMode === "include"
                      ? list
                      : contextConfig.includePaths ?? [],
                  excludePaths:
                    contextConfig.scopeMode === "exclude"
                      ? list
                      : contextConfig.excludePaths ?? [],
                },
              });
            }}
          />
        </div>
      )}
    </div>
  );
            
}
