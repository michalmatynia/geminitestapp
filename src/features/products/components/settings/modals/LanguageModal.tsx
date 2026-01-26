"use client";

import React from "react";
import { Dialog, DialogContent } from "@/shared/ui/dialog";
import ModalShell from "@/shared/ui/modal-shell";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Checkbox } from "@/shared/ui/checkbox";
import { useToast } from "@/shared/ui/toast";
import type { Language, CountryOption } from "@/features/products/types";

interface LanguageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  language?: Language | null;
  countries: CountryOption[];
}

export function LanguageModal({
  isOpen,
  onClose,
  onSuccess,
  language,
  countries,
}: LanguageModalProps) {
  const { toast } = useToast();
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({
    code: "",
    name: "",
    nativeName: "",
  });
  const [selectedCountryIds, setSelectedCountryIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (language) {
      setForm({
        code: language.code,
        name: language.name,
        nativeName: language.nativeName ?? "",
      });
      setSelectedCountryIds(language.countries?.map(c => c.countryId) ?? []);
    } else {
      setForm({ code: "", name: "", nativeName: "" });
      setSelectedCountryIds([]);
    }
  }, [language]);

  const handleSubmit = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      toast("Language code and name are required.", { variant: "error" });
      return;
    }

    setSaving(true);
    try {
      const endpoint = language ? `/api/languages/${language.id}` : "/api/languages";
      const res = await fetch(endpoint, {
        method: language ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code.trim(),
          name: form.name.trim(),
          nativeName: form.nativeName.trim() || undefined,
          countryIds: selectedCountryIds,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save language");
      }

      toast("Language saved.", { variant: "success" });
      onSuccess();
    } catch (err) {
      console.error(err);
      toast("Failed to save language.", { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const toggleCountry = (id: string) => {
    setSelectedCountryIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const header = (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Button
          onClick={() => { void handleSubmit(); }}
          disabled={saving}
          className="min-w-[100px] border border-white/20 hover:border-white/40"
        >
          {saving ? "Saving..." : language ? "Update" : "Add"}
        </Button>
        <h2 className="text-2xl font-bold text-white">
          {language ? "Edit Language" : "Add Language"}
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-none w-auto p-0 border-none bg-transparent shadow-none">
        <ModalShell title={language ? "Edit Language" : "Add Language"} onClose={onClose} header={header} size="md">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="lang-code">Code</Label>
              <Input
                id="lang-code"
                value={form.code}
                onChange={(e) => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                placeholder="e.g. EN"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lang-name">Name</Label>
              <Input
                id="lang-name"
                value={form.name}
                onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. English"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lang-native">Native Name</Label>
              <Input
                id="lang-native"
                value={form.nativeName}
                onChange={(e) => setForm(p => ({ ...p, nativeName: e.target.value }))}
                placeholder="e.g. English"
              />
            </div>
            <div className="space-y-2">
              <Label>Associated Countries</Label>
              <div className="mt-2 grid grid-cols-2 gap-2 max-h-48 overflow-y-auto rounded-md border border-gray-800 bg-gray-900/50 p-3">
                {countries.map((country) => (
                  <Label
                    key={country.id}
                    className="flex items-center gap-2 cursor-pointer hover:bg-gray-800 p-1.5 rounded transition-colors"
                  >
                    <Checkbox
                      checked={selectedCountryIds.includes(country.id)}
                      onCheckedChange={() => toggleCountry(country.id)}
                    />
                    <span className="text-xs text-gray-200">
                      {country.name} ({country.code})
                    </span>
                  </Label>
                ))}
              </div>
            </div>
          </div>
        </ModalShell>
      </DialogContent>
    </Dialog>
  );
}
