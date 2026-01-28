"use client";

import { Button, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui";
import React from "react";



import type { DatabaseOperation } from "@/features/ai-paths/lib";
import type { QueryValidationResult } from "./query-utils";

type DatabaseQueryInputControlsProps = {
  operation: DatabaseOperation;
  queryTemplateValue: string;
  queryPlaceholder: string;
  queryValidation: QueryValidationResult | null;
  queryFormatterEnabled: boolean;
  queryValidatorEnabled: boolean;
  testQueryLoading: boolean;
  queryTemplateRef?: React.RefObject<HTMLTextAreaElement>;
  onOperationChange: (value: DatabaseOperation) => void;
  onFormatClick: () => void;
  onFormatContextMenu: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onToggleValidator: () => void;
  onRunQuery: () => void;
  onQueryChange: (value: string) => void;
};

export function DatabaseQueryInputControls({
  operation,
  queryTemplateValue,
  queryPlaceholder,
  queryValidation,
  queryFormatterEnabled,
  queryValidatorEnabled,
  testQueryLoading,
  queryTemplateRef,
  onOperationChange,
  onFormatClick,
  onFormatContextMenu,
  onToggleValidator,
  onRunQuery,
  onQueryChange,
}: DatabaseQueryInputControlsProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex gap-2 items-center">
          <Select
            value={operation}
            onValueChange={(value: DatabaseOperation) => onOperationChange(value)}
          >
            <SelectTrigger className="h-7 w-[140px] border-border bg-card/70 text-xs text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-border bg-gray-900">
              <SelectItem value="query">Query</SelectItem>
              <SelectItem value="update">Update</SelectItem>
              <SelectItem value="insert">Insert</SelectItem>
              <SelectItem value="delete">Delete</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            className={`h-7 rounded-md border px-2 text-[10px] ${
              !queryFormatterEnabled
                ? "border bg-gray-800/50 text-gray-400 hover:bg-muted/50"
                : queryValidation && queryValidation.status === "error"
                ? "border-amber-700 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20"
                : "border-emerald-700 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20"
            }`}
            onClick={onFormatClick}
            onContextMenu={onFormatContextMenu}
          >
            {!queryFormatterEnabled
              ? "Format"
              : queryValidation && queryValidation.status === "error"
              ? "Fix Issues"
              : "Format ✓"}
          </Button>
          <Button
            type="button"
            className="h-7 rounded-md border px-2 text-[10px] text-gray-200 hover:bg-muted/60"
            onClick={onToggleValidator}
          >
            {queryValidatorEnabled ? "Hide validator" : "Validate"}
          </Button>
          <Button
            type="button"
            className={`h-7 rounded-md border px-3 text-[10px] font-medium ${
              testQueryLoading
                ? "border-amber-700 bg-amber-500/10 text-amber-200"
                : "border-cyan-700 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20"
            }`}
            disabled={testQueryLoading}
            onClick={onRunQuery}
          >
            {testQueryLoading ? "Running..." : "Run"}
          </Button>
        </div>
      </div>
      <Textarea
        ref={queryTemplateRef}
        className="min-h-[140px] w-full rounded-md border border-border bg-card/70 text-sm text-white"
        value={queryTemplateValue}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder={queryTemplateValue.trim() === "" ? queryPlaceholder : undefined}
      />
    </div>
  );
}
