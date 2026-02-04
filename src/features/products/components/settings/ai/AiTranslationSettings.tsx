"use client";

import { Button, Label, UnifiedSelect, useToast, SectionHeader, SectionPanel } from "@/shared/ui";
import { useState, useEffect } from "react";
import { logClientError } from "@/features/observability";
import { fetchSettingsCached, invalidateSettingsCache } from "@/shared/api/settings-client";

const STATIC_TRANSLATION_MODELS = [
  { value: "gpt-4o", label: "GPT-4o", description: "OpenAI" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo", description: "OpenAI" },
  { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo", description: "OpenAI" },
];

export function AiTranslationSettings(): React.JSX.Element {
  const [translationModel, setTranslationModel] = useState("");
  const [ollamaModels, setOllamaModels] = useState<{ value: string; label: string; description: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const loadData = async (): Promise<void> => {
      try {
        const data = await fetchSettingsCached();
        const settingsMap = new Map(data.map((item) => [item.key, item.value]));

        setTranslationModel(settingsMap.get("ai_translation_model") || "gpt-4o");

        const chatbotRes = await fetch("/api/chatbot");
        if (chatbotRes.ok) {
          const data = await chatbotRes.json() as { models?: string[] };
          if (Array.isArray(data.models)) {
            setOllamaModels(data.models.map((name: string) => ({ value: name, label: name, description: "Ollama" })));
          }
        }
      } catch (error) {
        logClientError(error, { context: { source: "AiTranslationSettings", action: "loadData" } });
        toast("Failed to load configuration.", { variant: "error" });
      } finally {
        setLoading(false);
      }
    };
    void loadData();
  }, [toast]);

  const handleSave = async (): Promise<void> => {
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
      invalidateSettingsCache();

      toast("Settings saved.", { variant: "success" });
    } catch (error) {
      logClientError(error, { context: { source: "AiTranslationSettings", action: "handleSave" } });
      toast("Failed to save.", { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-sm text-gray-400">Loading settings...</div>;

  return (
    <div className="space-y-8">
      <SectionHeader
        title="AI Translation Configuration"
        description="Configure the AI model used for translating product names and descriptions."
        size="md"
      />

      <SectionPanel variant="subtle" className="space-y-6">
        <div className="max-w-md space-y-4">
          <div className="space-y-2">
            <Label>Translation Model</Label>
            <UnifiedSelect
              value={translationModel}
              onValueChange={setTranslationModel}
              options={[...STATIC_TRANSLATION_MODELS, ...ollamaModels]}
            />
            <p className="text-xs text-gray-500 mt-2">
              This model will be used to translate product names and descriptions into
              languages associated with the product&apos;s catalogs.
            </p>
          </div>

          <SectionPanel variant="subtle-compact" className="border border-border">
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
          </SectionPanel>
        </div>
      </SectionPanel>

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
