"use client";

import React from "react";
import { AppModal } from "@/shared/ui/app-modal";
import ModalShell from "@/shared/components/modal-shell";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { useToast } from "@/shared/ui/toast";
import type { CurrencyOption } from "@/shared/types/internationalization";

interface CurrencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currency?: CurrencyOption | null;
}

export function CurrencyModal({
  isOpen,
  onClose,
  onSuccess,
  currency,
}: CurrencyModalProps) {
  const { toast } = useToast();
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({
    code: "PLN",
    name: "",
    symbol: "",
  });

  React.useEffect(() => {
    if (currency) {
      setForm({
        code: currency.code,
        name: currency.name,
        symbol: currency.symbol ?? "",
      });
    } else {
      setForm({ code: "PLN", name: "", symbol: "" });
    }
  }, [currency]);

  const handleSubmit = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      toast("Required fields missing.", { variant: "error" });
      return;
    }

    setSaving(true);
    try {
      const endpoint = currency ? `/api/currencies/${currency.id}` : "/api/currencies";
      const res = await fetch(endpoint, {
        method: currency ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code.trim().toUpperCase(),
          name: form.name.trim(),
          symbol: form.symbol.trim() || undefined,
        }),
      });

      if (!res.ok) throw new Error("Failed to save currency");

      toast("Currency saved.", { variant: "success" });
      onSuccess();
    } catch (err) {
      console.error(err);
      toast("Failed to save currency.", { variant: "error" });
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
          {saving ? "Saving..." : currency ? "Update" : "Add"}
        </Button>
        <h2 className="text-2xl font-bold text-white">
          {currency ? "Edit Currency" : "Add Currency"}
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
      title={currency ? "Edit Currency" : "Add Currency"}
    >
      <ModalShell
        title={currency ? "Edit Currency" : "Add Currency"}
        onClose={onClose}
        header={header}
        size="md"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="curr-code">Code</Label>
            <select
              id="curr-code"
              className="w-full rounded-md border border-border bg-gray-900 px-3 py-2 text-white"
              value={form.code}
              onChange={(e) => setForm(p => ({ ...p, code: e.target.value }))}
            >
              {["PLN", "EUR", "USD", "GBP", "SEK"].map((code) => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="curr-name">Name</Label>
            <Input
              id="curr-name"
              value={form.name}
              onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Polish Zloty"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="curr-symbol">Symbol</Label>
            <Input
              id="curr-symbol"
              value={form.symbol}
              onChange={(e) => setForm(p => ({ ...p, symbol: e.target.value }))}
              placeholder="e.g. zł"
            />
          </div>
        </div>
      </ModalShell>
    </AppModal>
  );
}
