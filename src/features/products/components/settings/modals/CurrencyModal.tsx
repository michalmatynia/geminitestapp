import React from "react";
import {
  Button,
  Input,
  Label,
  SharedModal,
  useToast,
} from "@/shared/ui";
import type { CurrencyOption } from "@/shared/types/internationalization";
import { countryCodeOptions } from "@/shared/constants/internationalization";
import { useSaveCurrencyMutation } from "@/features/internationalization/hooks/useInternationalizationMutations";

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
  const saveMutation = useSaveCurrencyMutation();
  const [form, setForm] = React.useState({
    code: "",
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
      const def = countryCodeOptions[0];
      setForm({ code: "PLN", name: "Polish Zloty", symbol: "zł" });
    }
  }, [currency]);

  const handleSubmit = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      toast("Required fields missing.", { variant: "error" });
      return;
    }

    try {
      await saveMutation.mutateAsync({
        id: currency?.id,
        data: {
          code: form.code.trim().toUpperCase(),
          name: form.name.trim(),
          symbol: form.symbol.trim() || null,
        },
      });

      toast("Currency saved.", { variant: "success" });
      onSuccess();
    } catch (err) {
      console.error(err);
      toast("Failed to save currency.", { variant: "error" });
    }
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
          {saveMutation.isPending ? "Saving..." : currency ? "Update" : "Add"}
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
    <SharedModal
      open={isOpen}
      onClose={onClose}
      title={currency ? "Edit Currency" : "Add Currency"}
      header={header}
      size="md"
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="currency-code">Code</Label>
          <select
            id="currency-code"
            className="w-full rounded-md border border-border bg-gray-900 px-3 py-2 text-white"
            value={form.code}
            onChange={(e) => {
              setForm((p) => ({ ...p, code: e.target.value }));
            }}
          >
            {["PLN", "EUR", "USD", "GBP", "SEK"].map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="currency-name">Name</Label>
          <Input
            id="currency-name"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="currency-symbol">Symbol (optional)</Label>
          <Input
            id="currency-symbol"
            value={form.symbol}
            onChange={(e) => setForm((p) => ({ ...p, symbol: e.target.value }))}
            placeholder="$"
          />
        </div>
      </div>
    </SharedModal>
  );
}
