"use client";

import { Button, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui";




import type { DatabaseAction, DatabaseActionCategory, DbQueryConfig } from "@/features/ai/ai-paths/lib";
import type { QueryValidationResult } from "./query-utils";

type DatabaseQueryInputControlsProps = {
  provider: DbQueryConfig["provider"];
  actionCategory: DatabaseActionCategory;
  action: DatabaseAction;
  actionCategoryOptions: Array<{ value: DatabaseActionCategory; label: string }>;
  actionOptions: Array<{ value: DatabaseAction; label: string }>;
  queryTemplateValue: string;
  queryPlaceholder: string;
  showFilterInput?: boolean;
  filterTemplateValue?: string;
  filterPlaceholder?: string;
  onFilterChange?: (value: string) => void;
  runDry?: boolean;
  onToggleRunDry?: () => void;
  queryValidation: QueryValidationResult | null;
  queryFormatterEnabled: boolean;
  queryValidatorEnabled: boolean;
  testQueryLoading: boolean;
  queryTemplateRef?: React.RefObject<HTMLTextAreaElement | null>;
  onActionCategoryChange: (value: DatabaseActionCategory) => void;
  onActionChange: (value: DatabaseAction) => void;
  onFormatClick: () => void;
  onFormatContextMenu: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onToggleValidator: () => void;
  onRunQuery: () => void;
  onQueryChange: (value: string) => void;
  onQueryFocus?: () => void;
  onFilterFocus?: () => void;
};

export function DatabaseQueryInputControls({
  provider,
  actionCategory,
  action,
  actionCategoryOptions,
  actionOptions,
  queryTemplateValue,
  queryPlaceholder,
  showFilterInput,
  filterTemplateValue,
  filterPlaceholder,
  onFilterChange,
  runDry,
  onToggleRunDry,
  queryValidation,
  queryFormatterEnabled,
  queryValidatorEnabled,
  testQueryLoading,
  queryTemplateRef,
  onActionCategoryChange,
  onActionChange,
  onFormatClick,
  onFormatContextMenu,
  onToggleValidator,
  onRunQuery,
  onQueryChange,
  onQueryFocus,
  onFilterFocus,
}: DatabaseQueryInputControlsProps): React.JSX.Element {
  const isPrismaProvider = provider === "prisma";
  const filterLabel = isPrismaProvider ? "Where" : "Filter";
  const filterHint = isPrismaProvider ? "Matches records" : "Matches documents";
  const updateLabel = isPrismaProvider ? "Update Data" : "Update Document";
  const updateHint = isPrismaProvider ? "Applies to matched records" : "Applies to matched docs";
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex gap-2 items-center">
          <Select
            value={actionCategory}
            onValueChange={(value: DatabaseActionCategory): void => onActionCategoryChange(value)}
          >
            <SelectTrigger className="h-7 w-[140px] border-border bg-card/70 text-xs text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-border bg-gray-900">
              {actionCategoryOptions.map((option: { value: DatabaseActionCategory; label: string }): React.JSX.Element => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={action}
            onValueChange={(value: DatabaseAction): void => onActionChange(value)}
          >
            <SelectTrigger className="h-7 w-[170px] border-border bg-card/70 text-xs text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-border bg-gray-900 max-h-72">
              {actionOptions.map((option: { value: DatabaseAction; label: string }): React.JSX.Element => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
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
                : queryValidation && queryValidation.status === "warning"
                  ? "border-amber-500/60 bg-amber-500/5 text-amber-200 hover:bg-amber-500/15"
                  : "border-emerald-700 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20"
            }`}
            onClick={onFormatClick}
            onContextMenu={(event: React.MouseEvent<HTMLButtonElement>): void => onFormatContextMenu(event)}
          >
            {!queryFormatterEnabled
              ? "Format"
              : queryValidation && queryValidation.status === "error"
                ? "Fix Issues"
                : queryValidation && queryValidation.status === "warning"
                  ? "Review"
                  : "Format ✓"}
          </Button>
          <Button
            type="button"
            className="h-7 rounded-md border px-2 text-[10px] text-gray-200 hover:bg-muted/60"
            onClick={onToggleValidator}
          >
            {queryValidatorEnabled ? "Hide validator" : "Validate"}
          </Button>
          {onToggleRunDry ? (
            <Button
              type="button"
              className={`h-7 rounded-md border px-2 text-[10px] ${
                runDry
                  ? "border-amber-700 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20"
                  : "border-gray-700 text-gray-300 hover:bg-muted/60"
              }`}
              onClick={onToggleRunDry}
            >
              {runDry ? "Dry Run: On" : "Dry Run"}
            </Button>
          ) : null}
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
      {showFilterInput ? (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wide text-gray-500">
              {filterLabel}
            </span>
            <span className="text-[9px] text-gray-500">{filterHint}</span>
          </div>
          <Textarea
            className="min-h-[110px] w-full rounded-md border border-border bg-card/70 text-xs text-white"
            value={filterTemplateValue ?? ""}
            onFocus={onFilterFocus}
            onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void => onFilterChange?.(event.target.value)}
            placeholder={(filterTemplateValue ?? "").trim() === "" ? filterPlaceholder : undefined}
          />
        </div>
      ) : null}
      {showFilterInput ? (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wide text-gray-500">
              {updateLabel}
            </span>
            <span className="text-[9px] text-gray-500">{updateHint}</span>
          </div>
          <Textarea
            ref={queryTemplateRef}
            className="min-h-[140px] w-full rounded-md border border-border bg-card/70 text-sm text-white"
            value={queryTemplateValue}
            onFocus={onQueryFocus}
            onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void => onQueryChange(event.target.value)}
            placeholder={queryTemplateValue.trim() === "" ? queryPlaceholder : undefined}
          />
        </div>
      ) : (
        <Textarea
          ref={queryTemplateRef}
          className="min-h-[140px] w-full rounded-md border border-border bg-card/70 text-sm text-white"
          value={queryTemplateValue}
          onFocus={onQueryFocus}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void => onQueryChange(event.target.value)}
          placeholder={queryTemplateValue.trim() === "" ? queryPlaceholder : undefined}
        />
      )}
    </div>
  );
}
