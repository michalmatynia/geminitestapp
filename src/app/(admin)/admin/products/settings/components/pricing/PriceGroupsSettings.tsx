import React from "react";
import { PriceGroup } from "@/features/products/types";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";

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
}: PriceGroupsSettingsProps) {
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-4">
          <Button
            className="min-w-[100px] border border-white/20 hover:border-white/40"
            type="button"
            onClick={handleOpenCreate}
          >
            Add Price Group
          </Button>
          <h2 className="text-xl font-semibold text-white">Price Groups</h2>
        </div>
        <p className="mt-1 text-sm text-gray-400">
          Configure pricing tiers and group rules for products.
        </p>
      </div>
      {loadingGroups ? (
        <div className="rounded-md border border-dashed border-gray-700 p-6 text-center text-gray-400">
          Loading price groups...
        </div>
      ) : priceGroups.length === 0 ? (
        <div className="rounded-md border border-dashed border-gray-700 p-6 text-center text-gray-400">
          At least one price group is required. Add a price group to continue.
        </div>
      ) : (
        <div className="space-y-3">
          {priceGroups.map((group) => (
            <div
              key={group.id}
              className="flex items-center justify-between rounded-md border border-gray-800 bg-gray-950/60 px-4 py-3"
            >
              <div>
                <div className="flex items-center gap-2 text-white">
                  <span className="font-semibold">{group.name}</span>
                  {group.isDefault && (
                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-200">
                      Default
                    </span>
                  )}
                  <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-300">
                    {group.groupId}
                  </span>
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
            </div>
          ))}
        </div>
      )}
      <div className="rounded-md border border-gray-800 bg-gray-950/60 p-4">
        <Label className="text-sm font-semibold text-white">
          Default price group
        </Label>
        <p className="mt-1 text-xs text-gray-400">
          Required. Select one of the available price groups.
        </p>
        <select
          className="mt-3 w-full rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-white"
          value={defaultGroupId}
          onChange={(event) => onDefaultGroupChange(event.target.value)}
          disabled={priceGroups.length === 0 || defaultGroupSaving}
        >
          {priceGroups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name} ({group.groupId})
            </option>
          ))}
        </select>
        {defaultGroupSaving ? (
          <p className="mt-2 text-xs text-gray-500">Saving default...</p>
        ) : null}
      </div>
    </div>
  );
}
