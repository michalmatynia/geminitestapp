"use client";

import { AppModal, ModalShell, Button, Input, Label, Textarea, Checkbox, RadioGroup, RadioGroupItem, useToast } from "@/shared/ui";










import type { PriceGroup, PriceGroupType } from "@/features/products/types";
import type { CurrencyOption } from "@/shared/types/internationalization";

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
}: PriceGroupModalProps) {
  const { toast } = useToast();
  const [saving, setSaving] = React.useState(false);
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
        description: priceGroup.description,
        currencyId: priceGroup.currencyId,
        groupType: priceGroup.groupType,
        basePriceField: priceGroup.basePriceField,
        sourceGroupId: priceGroup.sourceGroupId ?? "",
        priceMultiplier: priceGroup.priceMultiplier,
        addToPrice: priceGroup.addToPrice,
      });
    } else {
      const pln = currencyOptions.find(c => c.code === "PLN")?.id || "";
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

  const handleSubmit = async () => {
    if (!form.groupId.trim() || !form.name.trim() || !form.currencyId) {
      toast("Required fields missing.", { variant: "error" });
      return;
    }
    if (form.groupType === "dependent" && !form.sourceGroupId) {
      toast("Source price group is required for dependent groups.", { variant: "error" });
      return;
    }

    setSaving(true);
    try {
      const endpoint = priceGroup ? `/api/price-groups/${priceGroup.id}` : "/api/price-groups";
      const res = await fetch(endpoint, {
        method: priceGroup ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          groupId: form.groupId.trim(),
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          sourceGroupId: form.sourceGroupId || undefined,
          type: form.groupType,
        }),
      });

      if (!res.ok) throw new Error("Failed to save price group");

      toast("Price group saved.", { variant: "success" });
      onSuccess();
    } catch (err) {
      console.error(err);
      toast("Failed to save price group.", { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const header = (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Button
          onClick={() => { void handleSubmit(); }}
          disabled={saving}
          className="min-w-[100px] border border-white/20 hover:border-white/40"
        >
          {saving ? "Saving..." : priceGroup ? "Update" : "Create"}
        </Button>
        <h2 className="text-2xl font-bold text-white">
          {priceGroup ? "Edit Price Group" : "Create Price Group"}
        </h2>
      </div>
      <Button
        type="button"
        onClick={onClose}
        className="min-w-[100px] border border-white/20 hover:border-white/40"
      >
        Close
      </Button>
    </div>
  );

  return (
    <AppModal
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title={priceGroup ? "Edit Price Group" : "Create Price Group"}
    >
      <ModalShell
        title={priceGroup ? "Edit Price Group" : "Create Price Group"}
        onClose={onClose}
        header={header}
        size="lg"
      >
        <div className="space-y-4">
          <Label className="flex items-center gap-2 text-sm text-gray-300">
            <Checkbox
              checked={form.isDefault}
              onCheckedChange={(v) => setForm(p => ({ ...p, isDefault: Boolean(v) }))}
            />
            Set as default group
          </Label>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pg-name">Name</Label>
                <Input
                  id="pg-name"
                  value={form.name}
                  onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Retail PLN"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pg-currency">Currency</Label>
                <select
                  id="pg-currency"
                  className="w-full rounded-md border border-border bg-gray-900 px-3 py-2 text-white"
                  value={form.currencyId}
                  onChange={(e) => setForm(p => ({ ...p, currencyId: e.target.value }))}
                  disabled={loadingCurrencies}
                >
                  {currencyOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.code} · {opt.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pg-desc">Description</Label>
              <Textarea
                id="pg-desc"
                value={form.description}
                onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Optional description..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Group Type</Label>
              <RadioGroup
                className="flex gap-4"
                value={form.groupType}
                onValueChange={(v) => setForm(p => ({ ...p, groupType: v as PriceGroupType }))}
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
                  <select
                    id="pg-source"
                    className="w-full rounded-md border border-border bg-gray-900 px-3 py-2 text-white"
                    value={form.sourceGroupId}
                    onChange={(e) => setForm(p => ({ ...p, sourceGroupId: e.target.value }))}
                  >
                    <option value="">Select source...</option>
                    {priceGroups.filter(g => g.id !== priceGroup?.id).map(g => (
                      <option key={g.id} value={g.id}>{g.name} ({g.groupId})</option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="pg-mult">Price Multiplier</Label>
                    <Input
                      id="pg-mult"
                      type="number"
                      step="0.01"
                      value={form.priceMultiplier}
                      onChange={(e) => setForm(p => ({ ...p, priceMultiplier: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pg-add">Add To Price</Label>
                    <Input
                      id="pg-add"
                      type="number"
                      value={form.addToPrice}
                      onChange={(e) => setForm(p => ({ ...p, addToPrice: Number(e.target.value) }))}
                    />
                  </div>
                </div>
              </div>
            )}
        </div>
      </ModalShell>
    </AppModal>
  );
}
