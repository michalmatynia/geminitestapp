"use client";



import * as React from "react";

import {
  Input,
  Label,
  Checkbox,
  Textarea,
  RadioGroup,
  RadioGroupItem,
  useToast,
  UnifiedSelect,
} from "@/shared/ui";
import { FormModal } from "@/shared/ui";
import type { PriceGroup, PriceGroupType } from "@/features/products/types";
import type { CurrencyOption } from "@/shared/types/internationalization";
import { useSavePriceGroupMutation } from "@/features/products/hooks/useProductSettingsQueries";
import { logClientError } from "@/features/observability";

interface PriceGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  priceGroup?: PriceGroup | null;
  currencyOptions: CurrencyOption[];
  loadingCurrencies: boolean;
  priceGroups: PriceGroup[];
}

export function PriceGroupModal({
  isOpen,
  onClose,
  onSuccess,
  priceGroup,
  currencyOptions,
  loadingCurrencies,
  priceGroups,
}: PriceGroupModalProps): React.JSX.Element {
  const { toast } = useToast();
  const saveMutation = useSavePriceGroupMutation();
  const [form, setForm] = React.useState({
    isDefault: false,
    groupId: "",
    name: "",
    description: "",
    currencyId: "",
    groupType: "standard" as PriceGroupType,
    basePriceField: "price",
    sourceGroupId: "",
    priceMultiplier: 1,
    addToPrice: 0,
  });

  React.useEffect(() => {
    if (priceGroup) {
      setForm({
        isDefault: priceGroup.isDefault,
        groupId: priceGroup.groupId,
        name: priceGroup.name,
        description: priceGroup.description ?? "",
        currencyId: priceGroup.currencyId,
        groupType: priceGroup.groupType,
        basePriceField: priceGroup.basePriceField,
        sourceGroupId: priceGroup.sourceGroupId ?? "",
        priceMultiplier: priceGroup.priceMultiplier,
        addToPrice: priceGroup.addToPrice,
      });
    } else {
      const pln = currencyOptions.find((c) => c.code === "PLN")?.id || "";
      setForm({
        isDefault: false,
        groupId: `PG-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        name: "",
        description: "",
        currencyId: pln,
        groupType: "standard",
        basePriceField: "price",
        sourceGroupId: "",
        priceMultiplier: 1,
        addToPrice: 0,
      });
    }
  }, [priceGroup, currencyOptions]);

  const handleSubmit = async (): Promise<void> => {
    if (!form.groupId.trim() || !form.name.trim() || !form.currencyId) {
      toast("Required fields missing.", { variant: "error" });
      return;
    }
    if (form.groupType === "dependent" && !form.sourceGroupId) {
      toast("Source price group is required for dependent groups.", {
        variant: "error",
      });
      return;
    }

    try {
      await saveMutation.mutateAsync({
        ...(priceGroup?.id ? { id: priceGroup.id } : {}),
        data: {
          ...form,
          groupId: form.groupId.trim(),
          name: form.name.trim(),
          description: form.description.trim(),
          sourceGroupId: form.sourceGroupId || null,
          groupType: form.groupType,
        },
      });

      toast("Price group saved.", { variant: "success" });
      onSuccess();
    } catch (err) {
      logClientError(err, { context: { source: "PriceGroupModal", action: "savePriceGroup", priceGroupId: priceGroup?.id } });
      toast("Failed to save price group.", { variant: "error" });
    }
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title={priceGroup ? "Edit Price Group" : "Create Price Group"}
      onSave={() => {
        void handleSubmit();
      }}
      isSaving={saveMutation.isPending}
      saveText={priceGroup ? "Update" : "Create"}
      cancelText="Close"
      size="lg"
    >
      <div className="space-y-4">
        <Label className="flex items-center gap-2 text-sm text-gray-300">
          <Checkbox
            checked={form.isDefault}
            onCheckedChange={(v) =>
              setForm((p) => ({ ...p, isDefault: Boolean(v) }))
            }
          />
          Set as default group
        </Label>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="pg-name">Name</Label>
            <Input
              id="pg-name"
              value={form.name}
              onChange={(e) =>
                setForm((p) => ({ ...p, name: e.target.value }))
              }
              placeholder="e.g. Retail PLN"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pg-currency">Currency</Label>
            <UnifiedSelect
              value={form.currencyId}
              onValueChange={(v) =>
                setForm((p) => ({ ...p, currencyId: v }))
              }
              options={currencyOptions.map((opt) => ({
                value: opt.id,
                label: `${opt.code} · ${opt.name}`,
              }))}
              placeholder="Select currency"
              disabled={loadingCurrencies}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="pg-desc">Description</Label>
          <Textarea
            id="pg-desc"
            value={form.description}
            onChange={(e) =>
              setForm((p) => ({ ...p, description: e.target.value }))
            }
            placeholder="Optional description..."
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label>Group Type</Label>
          <RadioGroup
            className="flex gap-4"
            value={form.groupType}
            onValueChange={(v) =>
              setForm((p) => ({ ...p, groupType: v as PriceGroupType }))
            }
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="standard" id="type-standard" />
              <Label htmlFor="type-standard">Standard</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="dependent" id="type-dependent" />
              <Label htmlFor="type-dependent">Dependent</Label>
            </div>
          </RadioGroup>
        </div>

        {form.groupType === "dependent" && (
          <div className="rounded-md border border-border bg-card/70 p-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pg-source">Source Price Group</Label>
              <UnifiedSelect
                value={form.sourceGroupId}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, sourceGroupId: v }))
                }
                options={priceGroups
                  .filter((g) => g.id !== priceGroup?.id)
                  .map((g) => ({
                    value: g.id,
                    label: g.name,
                    description: g.groupId,
                  }))}
                placeholder="Select source..."
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pg-mult">Price Multiplier</Label>
                <Input
                  id="pg-mult"
                  type="number"
                  step="0.01"
                  value={form.priceMultiplier}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      priceMultiplier: Number(e.target.value),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pg-add">Add To Price</Label>
                <Input
                  id="pg-add"
                  type="number"
                  value={form.addToPrice}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      addToPrice: Number(e.target.value),
                    }))
                  }
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </FormModal>
  );
}
