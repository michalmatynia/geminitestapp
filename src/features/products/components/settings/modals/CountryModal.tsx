/* eslint-disable @typescript-eslint/typedef, @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types */
"use client";

import React from "react";
import {
  Button,
  Input,
  Label,
  AppModal,
  ModalShell,
  Checkbox,
  useToast,
} from "@/shared/ui";
import type {
  CountryOption,
  CurrencyOption,
} from "@/shared/types/internationalization";
import { countryCodeOptions } from "@/shared/constants/internationalization";
import { useSaveCountryMutation } from "@/features/internationalization/hooks/useInternationalizationMutations";

interface CountryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  country?: CountryOption | null;
  currencyOptions: CurrencyOption[];
  loadingCurrencies: boolean;
}

export function CountryModal({
  isOpen,
  onClose,
  onSuccess,
  country,
  currencyOptions,
  loadingCurrencies,
}: CountryModalProps) {
  const { toast } = useToast();
  const saveMutation = useSaveCountryMutation();
  const [form, setForm] = React.useState({
    code: "",
    name: "",
  });
  const [selectedCurrencyIds, setSelectedCurrencyIds] = React.useState<
    string[]
  >([]);

  React.useEffect(() => {
    if (country) {
      setForm({ code: country.code, name: country.name });
      setSelectedCurrencyIds(
        country.currencies?.map((c) => c.currencyId) ?? [],
      );
    } else {
      const def = countryCodeOptions[0];
      setForm({ code: def?.code ?? "", name: def?.name ?? "" });
      setSelectedCurrencyIds([]);
    }
  }, [country]);

  const handleSubmit = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      toast("Required fields missing.", { variant: "error" });
      return;
    }

    try {
      await saveMutation.mutateAsync({
        id: country?.id,
        data: {
          code: form.code.trim().toUpperCase(),
          name: form.name.trim(),
          currencyIds: selectedCurrencyIds,
        },
      });

      toast("Country saved.", { variant: "success" });
      onSuccess();
    } catch (err) {
      console.error(err);
      toast("Failed to save country.", { variant: "error" });
    }
  };

  const toggleCurrency = (id: string) => {
    setSelectedCurrencyIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const header = (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Button
          onClick={() => {
            void handleSubmit();
          }}
          disabled={saveMutation.isPending}
          className="min-w-[100px] border border-white/20 hover:border-white/40"
        >
          {saveMutation.isPending ? "Saving..." : country ? "Update" : "Add"}
        </Button>
        <h2 className="text-2xl font-bold text-white">
          {country ? "Edit Country" : "Add Country"}
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
      title={country ? "Edit Country" : "Add Country"}
    >
      <ModalShell
        title={country ? "Edit Country" : "Add Country"}
        onClose={onClose}
        header={header}
        size="md"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="country-code">Code</Label>
            <select
              id="country-code"
              className="w-full rounded-md border border-border bg-gray-900 px-3 py-2 text-white"
              value={form.code}
              onChange={(e) => {
                const sel = countryCodeOptions.find(
                  (o) => o.code === e.target.value,
                );
                setForm({ code: e.target.value, name: sel?.name ?? "" });
              }}
            >
              {countryCodeOptions.map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.code} · {opt.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="country-name">Name</Label>
            <Input
              id="country-name"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Associated Currencies</Label>
            {loadingCurrencies ? (
              <p className="text-xs text-gray-500">Loading currencies...</p>
            ) : (
              <div className="mt-2 grid grid-cols-2 gap-2 max-h-48 overflow-y-auto rounded-md border border-border bg-card/50 p-3">
                {currencyOptions.map((curr) => (
                  <Label
                    key={curr.id}
                    className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1.5 rounded transition-colors"
                  >
                    <Checkbox
                      checked={selectedCurrencyIds.includes(curr.id)}
                      onCheckedChange={() => toggleCurrency(curr.id)}
                    />
                    <span className="text-xs text-gray-200">
                      {curr.code} ({curr.name})
                    </span>
                  </Label>
                ))}
              </div>
            )}
          </div>
        </div>
      </ModalShell>
    </AppModal>
  );
}