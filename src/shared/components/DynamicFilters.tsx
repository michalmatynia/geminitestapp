"use client";

import React from "react";
import { Input, Label, UnifiedSelect, SearchInput, FiltersContainer } from "@/shared/ui";

export type FilterFieldType = "text" | "search" | "select" | "date" | "number";

export interface FilterField {
  key: string;
  label: string;
  type: FilterFieldType;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  className?: string;
  colSpan?: string; // Tailwind grid col-span e.g. "col-span-2"
}

interface DynamicFiltersProps {
  fields: FilterField[];
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
  onReset?: () => void;
  hasActiveFilters?: boolean;
  title?: string;
  gridClassName?: string;
  className?: string;
}

/**
 * A generic filtering component that renders a grid of filter fields based on configuration.
 * Consolidates the usage of FiltersContainer, Input, Label, and Selects.
 */
export function DynamicFilters({
  fields,
  values,
  onChange,
  onReset,
  hasActiveFilters,
  title,
  gridClassName,
  className,
}: DynamicFiltersProps): React.JSX.Element {
  return (
    <FiltersContainer
      title={title}
      onReset={onReset}
      hasActiveFilters={hasActiveFilters}
      gridClassName={gridClassName}
      className={className}
    >
      {fields.map((field) => (
        <div key={field.key} className={field.colSpan}>
          <Label className="text-[11px] font-medium text-gray-400 mb-1.5 block">
            {field.label}
          </Label>
          
          {field.type === "select" ? (
            <UnifiedSelect
              value={values[field.key] ?? ""}
              onValueChange={(value) => onChange(field.key, value)}
              options={field.options ?? []}
              placeholder={field.placeholder ?? `Select ${field.label.toLowerCase()}...`}
              triggerClassName="h-9"
            />
          ) : field.type === "search" ? (
            <SearchInput
              placeholder={field.placeholder ?? `Search ${field.label.toLowerCase()}...`}
              value={values[field.key] ?? ""}
              onChange={(e) => onChange(field.key, e.target.value)}
              onClear={() => onChange(field.key, "")}
              className="h-9"
            />
          ) : (
            <Input
              type={field.type === "date" ? "date" : field.type === "number" ? "number" : "text"}
              placeholder={field.placeholder ?? field.label}
              value={values[field.key] ?? ""}
              onChange={(e) => onChange(field.key, e.target.value)}
              className="h-9"
            />
          )}
        </div>
      ))}
    </FiltersContainer>
  );
}
