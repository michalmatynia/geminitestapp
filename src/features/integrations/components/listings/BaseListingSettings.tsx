"use client";

import React from "react";
import { Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Checkbox } from "@/shared/ui";
import type { BaseInventory, Template } from "@/features/data-import-export/types/imports";

interface BaseListingSettingsProps {
  inventories: BaseInventory[];
  selectedInventoryId: string;
  onInventoryIdChange: (id: string) => void;
  loadingInventories: boolean;
  templates: Template[];
  selectedTemplateId: string;
  onTemplateIdChange: (id: string) => void;
  allowDuplicateSku: boolean;
  onAllowDuplicateSkuChange: (allowed: boolean) => void;
}

export function BaseListingSettings({
  inventories,
  selectedInventoryId,
  onInventoryIdChange,
  loadingInventories,
  templates,
  selectedTemplateId,
  onTemplateIdChange,
  allowDuplicateSku,
  onAllowDuplicateSkuChange,
}: BaseListingSettingsProps): React.JSX.Element {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="inventory">
          Base.com Inventory {loadingInventories && "(Loading...)"}
        </Label>
        <Select
          value={selectedInventoryId}
          onValueChange={onInventoryIdChange}
          disabled={loadingInventories || inventories.length === 0}
        >
          <SelectTrigger id="inventory">
            <SelectValue placeholder="Select inventory..." />
          </SelectTrigger>
          <SelectContent>
            {inventories
              .filter((inventory: BaseInventory): boolean => !!inventory.id)
              .map((inventory: BaseInventory) => (
                <SelectItem key={inventory.id} value={inventory.id}>
                  {inventory.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        {inventories.length === 0 && !loadingInventories && (
          <p className="text-xs text-red-400">
            No inventories found. Please check your Base.com account.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="template">Template (Optional)</Label>
        <Select
          value={selectedTemplateId}
          onValueChange={onTemplateIdChange}
        >
          <SelectTrigger id="template">
            <SelectValue placeholder="No template (use defaults)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No template</SelectItem>
            {templates
              .filter((template: Template): boolean => !!template.id)
              .map((template: Template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500">
          Templates define how product fields map to Base.com fields.
        </p>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <Checkbox
          id="allowDuplicateSku"
          checked={allowDuplicateSku} 
          onCheckedChange={(checked: boolean | "indeterminate"): void => onAllowDuplicateSkuChange(Boolean(checked))}
          className="h-4 w-4 rounded border bg-gray-900 text-blue-500"
        />
        <Label htmlFor="allowDuplicateSku" className="text-sm text-gray-300">
          Allow duplicate SKUs
        </Label>
      </div>
      <p className="text-xs text-gray-500">
        When unchecked, export will fail if the SKU already exists in the Base.com inventory.
      </p>
    </div>
  );
}
