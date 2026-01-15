import React from "react";
import { PriceGroup } from "../types";

type PriceGroupsSettingsProps = {
  loadingGroups: boolean;
  priceGroups: PriceGroup[];
  handleOpenCreate: () => void;
  handleEditGroup: (group: PriceGroup) => void;
  handleDeleteGroup: (group: PriceGroup) => void;
};

export function PriceGroupsSettings({
  loadingGroups,
  priceGroups,
  handleOpenCreate,
  handleEditGroup,
  handleDeleteGroup,
}: PriceGroupsSettingsProps) {
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-white">Price Groups</h2>
          <button
            className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200"
            type="button"
            onClick={handleOpenCreate}
          >
            Add Price Group
          </button>
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
          Select a price group to edit or add a new one.
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
                <button
                  className="text-sm text-gray-300 hover:text-white"
                  type="button"
                  onClick={() => handleEditGroup(group)}
                >
                  Edit
                </button>
                <button
                  className="text-sm text-red-400 hover:text-red-300"
                  type="button"
                  onClick={() => handleDeleteGroup(group)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
