"use client";

import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";
import { cn } from "@/shared/utils";

export interface SelectOption {
  value: string;
  label: string;
  description?: string | undefined;
  disabled?: boolean | undefined;
}

interface UnifiedSelectProps {
  value: string | undefined;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string | undefined;
  className?: string | undefined;
  triggerClassName?: string | undefined;
  contentClassName?: string | undefined;
  disabled?: boolean | undefined;
  ariaLabel?: string | undefined;
}

export function UnifiedSelect({
  value,
  onValueChange,
  options,
  placeholder = "Select an option",
  className,
  triggerClassName,
  contentClassName,
  disabled = false,
  ariaLabel,
}: UnifiedSelectProps): React.JSX.Element {
  const normalizedOptions = options.filter((option) => option.value && option.value.trim() !== "");
  const hasValue = value !== undefined && normalizedOptions.some((option) => option.value === value);
  const safeValue = hasValue ? value : "";

  return (
    <div className={cn("w-full", className)}>
      <Select
        {...(safeValue ? { value: safeValue } : {})}
        onValueChange={onValueChange}
        disabled={disabled}
      >
        <SelectTrigger 
          className={cn("w-full", triggerClassName)}
          aria-label={ariaLabel}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className={contentClassName}>
          {normalizedOptions.map((option) => (
              <SelectItem 
                key={option.value} 
                value={option.value}
                {...(option.disabled !== undefined ? { disabled: option.disabled } : {})}
              >
              <div className="flex flex-col">
                <span>{option.label}</span>
                {option.description && (
                  <span className="text-[10px] text-gray-500">{option.description}</span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
