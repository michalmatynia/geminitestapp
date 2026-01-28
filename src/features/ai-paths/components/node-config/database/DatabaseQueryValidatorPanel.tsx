"use client";

import { Button } from "@/shared/ui";
import React from "react";

import type { AiNode, DatabaseConfig, DatabaseOperation, DbQueryConfig, Edge, NodeConfig } from "@/features/ai-paths/lib";
import type { QueryValidationResult } from "./query-utils";

type DatabaseQueryValidatorPanelProps = {
  queryValidation: QueryValidationResult;
  queryConfig: DbQueryConfig;
  operation: DatabaseOperation;
  queryTemplateValue: string;
  databaseConfig: DatabaseConfig;
  selectedNode: AiNode;
  nodes: AiNode[];
  edges: Edge[];
  updateSelectedNodeConfig: (patch: Partial<NodeConfig>) => void;
  toast: (message: string, options?: { variant?: "success" | "error" }) => void;
};

export function DatabaseQueryValidatorPanel({
  queryValidation,
  queryConfig,
  operation,
  queryTemplateValue,
  databaseConfig,
  selectedNode,
  nodes,
  edges,
  updateSelectedNodeConfig,
  toast,
}: DatabaseQueryValidatorPanelProps) {
  return (
    <div
      className={`rounded-md border px-3 py-2 text-[11px] ${
        queryValidation.status === "valid"
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-100"
          : queryValidation.status === "empty"
            ? "border-amber-500/40 bg-amber-500/10 text-amber-100"
            : "border-rose-500/40 bg-rose-500/10 text-rose-100"
      }`}
    >
      <div className="font-medium">MongoDB Query Validator</div>
      <div className="mt-1">{queryValidation.message}</div>
      {queryValidation.line && queryValidation.column && (
        <div className="mt-1">
          Line {queryValidation.line}, column {queryValidation.column}
        </div>
      )}
      {queryValidation.snippet && (
        <pre className="mt-2 whitespace-pre-wrap text-[11px] text-rose-100">
          {queryValidation.snippet}
        </pre>
      )}
      {queryValidation.hints && queryValidation.hints.length > 0 && (
        <div className="mt-2 space-y-1 text-[11px] text-rose-100/90">
          {queryValidation.hints.map((hint) => (
            <div key={hint}>- {hint}</div>
          ))}
        </div>
      )}
      {queryValidation.status === "error" && (() => {
        const aiPromptEdges = edges.filter(
          (edge) => edge.from === selectedNode.id && edge.fromPort === "aiPrompt"
        );
        const aiNode = aiPromptEdges.length > 0
          ? nodes.find((n) => n.id === aiPromptEdges[0]?.to && n.type === "model")
          : null;

        if (!aiNode) return null;

        return (
          <Button
            type="button"
            className="mt-3 w-full rounded-md border border-purple-700 bg-purple-500/10 px-3 py-2 text-[11px] text-purple-200 hover:bg-purple-500/20"
            onClick={() => {
              const providerName = queryConfig.provider === "auto" ? "MongoDB (auto-detect)" : queryConfig.provider;
              const correctionPrompt = `Fix this invalid ${providerName} query for a ${operation} operation on the "${queryConfig.collection}" collection.

Current Query:
\`\`\`json
${queryTemplateValue}
\`\`\`

Validation Errors:
${queryValidation.message}

${queryValidation.hints && queryValidation.hints.length > 0 ? `Suggestions:\n${queryValidation.hints.map(h => `- ${h}`).join('\n')}` : ''}

Please return ONLY the corrected query as valid JSON, without any explanation or markdown formatting.`;

              updateSelectedNodeConfig({
                database: {
                  ...databaseConfig,
                  aiPrompt: correctionPrompt,
                },
              });
              toast("Validation errors sent to AI for correction.", { variant: "success" });
            }}
          >
            🤖 Send to AI for Auto-Correction
          </Button>
        );
      })()}
    </div>
  );
}
