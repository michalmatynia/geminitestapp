"use client";

import { useState, useEffect } from "react";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { useToast } from "@/shared/ui/toast";

const STATIC_TRANSLATION_MODELS = [
  { id: "gpt-4o", name: "GPT-4o" },
  { id: "gpt-4-turbo", name: "GPT-4 Turbo" },
  { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo" },
];

export function AiTranslationSettings() {
  const [translationModel, setTranslationModel] = useState("");
  const [ollamaModels, setOllamaModels] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const loadData = async () => {
      try {
        const settingsRes = await fetch("/api/settings");
        let settingsMap = new Map<string, string>();
        if (settingsRes.ok) {
          const data = await settingsRes.json() as { key: string, value: string }[];
          settingsMap = new Map(data.map(item => [item.key, item.value]));
        }

        setTranslationModel(settingsMap.get("ai_translation_model") || "gpt-4o");

        const chatbotRes = await fetch("/api/chatbot");
        if (chatbotRes.ok) {
          const data = await chatbotRes.json() as { models?: string[] };
          if (Array.isArray(data.models)) {
            setOllamaModels(data.models.map(name => ({ id: name, name })));
          }
        }
      } catch (error) {
        console.error("Failed to load data:", error);
        toast("Failed to load configuration.", { variant: "error" });
      } finally {
        setLoading(false);
      }
    };
    void loadData();
  }, [toast]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "ai_translation_model",
          value: translationModel,
        }),
      });

      toast("Settings saved.", { variant: "success" });
    } catch (error) {
      console.error("Failed to save:", error);
      toast("Failed to save.", { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-sm text-gray-400">Loading settings...</div>;

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-medium text-white mb-1">AI Translation Configuration</h2>
            <p className="text-sm text-gray-400">
              Configure the AI model used for translating product names and descriptions.
            </p>
          </div>
        </div>

        <div className="space-y-6 rounded-md border border-border bg-card/50 p-6">
          <div className="max-w-md space-y-4">
            <div className="space-y-2">
              <Label>Translation Model</Label>
              <Select value={translationModel} onValueChange={setTranslationModel}>
                <SelectTrigger className="mt-1.5 bg-gray-900 border text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>OpenAI</SelectLabel>
                    {STATIC_TRANSLATION_MODELS.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  {ollamaModels.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>Ollama</SelectLabel>
                      {ollamaModels.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-2">
                This model will be used to translate product names and descriptions into
                languages associated with the product&apos;s catalogs.
              </p>
            </div>

            <div className="rounded-md bg-card/50 p-4 border border-border">
              <h4 className="text-sm font-medium text-white mb-2">How It Works</h4>
              <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside">
                <li>
                  Translation requests can be triggered from the Product Edit/Create panel
                </li>
                <li>
                  If the product belongs to catalogs, it translates to those catalog languages
                </li>
                <li>
                  If no catalogs are assigned, it translates to all available languages
                </li>
                <li>
                  Translations are processed as AI jobs and can be monitored on the Jobs page
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={() => void handleSave()}
          disabled={saving}
          className="bg-white text-black hover:bg-gray-200"
        >
          {saving ? "Saving..." : "Save Configuration"}
        </Button>
      </div>
    </div>
  );
}
