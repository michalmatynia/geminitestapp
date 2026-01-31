"use client";

import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui";
import { useCmsDomainSelection } from "@/features/cms/hooks/useCmsDomainSelection";
import type { CmsDomain } from "@/features/cms/types";

type CmsDomainSelectorProps = {
  label?: string;
  triggerClassName?: string;
  onChange?: (domainId: string) => void;
};

export function CmsDomainSelector({
  label = "Zone",
  triggerClassName,
  onChange,
}: CmsDomainSelectorProps): React.ReactNode {
  const { domains, activeDomainId, hostDomainId, setActiveDomainId } = useCmsDomainSelection();

  const handleChange = (value: string): void => {
    setActiveDomainId(value);
    onChange?.(value);
  };

  return (
    <div className="flex items-center gap-2">
      {label ? (
        <span className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
          {label}
        </span>
      ) : null}
      <Select value={activeDomainId ?? ""} onValueChange={handleChange} disabled={domains.length === 0}>
        <SelectTrigger className={triggerClassName ?? "h-9 w-[220px]"}>
          <SelectValue placeholder={domains.length ? "Select zone" : "No zones"} />
        </SelectTrigger>
        <SelectContent>
          {domains.map((item: CmsDomain) => (
            <SelectItem key={item.id} value={item.id}>
              {item.domain}
              {hostDomainId === item.id ? " (current)" : ""}
              {item.aliasOf ? " (shared)" : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
