import React from "react";
import { Button, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Badge, SectionHeader, SectionPanel } from "@/shared/ui";
import { PriceGroup } from "@/features/products/types";


type PriceGroupsSettingsProps = {
  loadingGroups: boolean;
  priceGroups: PriceGroup[];
  defaultGroupId: string;
  onDefaultGroupChange: (groupId: string) => void;
  defaultGroupSaving: boolean;
  handleOpenCreate: () => void;
  handleEditGroup: (group: PriceGroup) => void;
  handleDeleteGroup: (group: PriceGroup) => void;
};

export function PriceGroupsSettings({
  loadingGroups,
  priceGroups,
  defaultGroupId,
  onDefaultGroupChange,
  defaultGroupSaving,
  handleOpenCreate,
  handleEditGroup,
  handleDeleteGroup,
}: PriceGroupsSettingsProps): React.JSX.Element {
  return (
    <div className="space-y-4">
      <SectionHeader
        title="Price Groups"
        description="Configure pricing tiers and group rules for products."
        actions={
          <Button
            className="min-w-[100px] border border-white/20 hover:border-white/40"
            type="button"
            onClick={handleOpenCreate}
          >
            Add Price Group
          </Button>
        }
        size="md"
      />
      {loadingGroups ? (
        <div className="rounded-md border border-dashed border p-6 text-center text-gray-400">
          Loading price groups...
        </div>
      ) : priceGroups.length === 0 ? (
        <div className="rounded-md border border-dashed border p-6 text-center text-gray-400">
          At least one price group is required. Add a price group to continue.
        </div>
      ) : (
        <div className="space-y-3">
          {priceGroups.map((group: PriceGroup) => (
            <SectionPanel
              key={group.id}
              variant="subtle-compact"
              className="flex items-center justify-between"
            >
              <div>
                <div className="flex items-center gap-2 text-white">
                  <span className="font-semibold">{group.name}</span>
                  {group.isDefault && (
                    <Badge variant="success">
                      Default
                    </Badge>
                  )}
                  <Badge variant="neutral">
                    {group.groupId}
                  </Badge>
                </div>
                <p className="text-sm text-gray-400">
                  {group.currencyCode} · {group.groupType}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">
                  {group.description || "No description"}
                </span>
                <Button
                  className="border border-white/20 hover:border-white/40"
                  type="button"
                  onClick={() => handleEditGroup(group)}
                >
                  Edit
                </Button>
                <Button
                  className="border border-red-500/20 hover:border-red-500/40 text-red-400"
                  type="button"
                  onClick={() => handleDeleteGroup(group)}
                >
                  Delete
                </Button>
              </div>
            </SectionPanel>
          ))}
        </div>
      )}
      <SectionPanel variant="subtle" className="p-4">
        <Label className="text-sm font-semibold text-white">
          Default price group
        </Label>
        <p className="mt-1 text-xs text-gray-400">
          Required. Select one of the available price groups.
        </p>
        <div className="mt-3">
          <Select
            value={defaultGroupId}
            onValueChange={onDefaultGroupChange}
            disabled={priceGroups.length === 0 || defaultGroupSaving}
          >
            <SelectTrigger className="w-full bg-gray-900 border-border text-sm text-white">
              <SelectValue placeholder="Select default price group" />
            </SelectTrigger>
            <SelectContent>
              {priceGroups.map((group: PriceGroup) => (
                <SelectItem key={group.id} value={group.id}>
                  {group.name} ({group.groupId})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {defaultGroupSaving ? (
          <p className="mt-2 text-xs text-gray-500">Saving default...</p>
        ) : null}
      </SectionPanel>
    </div>
  );
}

