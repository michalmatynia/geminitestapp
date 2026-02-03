import React from "react";
import {
  Button,
  Input,
  Label,
  SharedModal,
  useToast,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui";
import type { CurrencyOption } from "@/shared/types/internationalization";
import { useSaveCurrencyMutation } from "@/features/internationalization/hooks/useInternationalizationMutations";
import { logClientError } from "@/features/observability";

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
}: CurrencyModalProps): React.JSX.Element {
  const { toast } = useToast();
  const saveMutation = useSaveCurrencyMutation();
  const [form, setForm] = React.useState({
    code: "",
    name: "",
    symbol: "",
  });

  React.useEffect((): void => {
    if (currency) {
      setForm({
        code: currency.code,
        name: currency.name,
        symbol: currency.symbol ?? "",
      });
    } else {
      setForm({ code: "PLN", name: "Polish Zloty", symbol: "zł" });
    }
  }, [currency]);

  const handleSubmit = async (): Promise<void> => {
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
      logClientError(err, { context: { source: "CurrencyModal", action: "saveCurrency", currencyId: currency?.id } });
      toast("Failed to save currency.", { variant: "error" });
    }
  };

  const header: React.JSX.Element = (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Button
          onClick={(): void => {
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
          <Select
            value={form.code}
            onValueChange={(value: string): void => {
              setForm((p: typeof form) => ({ ...p, code: value }));
            }}
          >
            <SelectTrigger className="w-full bg-gray-900 border-border text-white">
              <SelectValue placeholder="Select code" />
            </SelectTrigger>
            <SelectContent>
              {["PLN", "EUR", "USD", "GBP", "SEK"].map((code: string) => (
                <SelectItem key={code} value={code}>
                  {code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="currency-name">Name</Label>
          <Input
            id="currency-name"
            value={form.name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setForm((p: typeof form) => ({ ...p, name: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="currency-symbol">Symbol (optional)</Label>
          <Input
            id="currency-symbol"
            value={form.symbol}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setForm((p: typeof form) => ({ ...p, symbol: e.target.value }))}
            placeholder="$"
          />
        </div>
      </div>
    </SharedModal>
  );
}
