"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeftIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";

type SettingsPayload = {
  id?: string;
  key: string;
  value: string;
};

const modelOptions = ["gpt-3.5-turbo", "gpt-4o"] as const;
const aiSections = ["GPT"] as const;

export default function AISettingsPage() {
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState<(typeof aiSections)[number]>(
    "GPT"
  );
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState<(typeof modelOptions)[number]>("gpt-3.5-turbo");
  const [prompt, setPrompt] = useState(
    "You are a helpful assistant that generates compelling product descriptions."
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await fetch("/api/settings", { cache: "no-store" });
        if (!res.ok) {
          throw new Error("Failed to load AI settings.");
        }
        const data = (await res.json()) as SettingsPayload[];
        if (!mounted) return;
        const settingsMap = new Map(data.map((item) => [item.key, item.value]));
        setApiKey(settingsMap.get("openai_api_key") || "");
        setModel(
          (settingsMap.get("openai_model") as typeof modelOptions[number]) ||
            "gpt-3.5-turbo"
        );
        setPrompt(
          settingsMap.get("description_generation_prompt") ||
            "You are a helpful assistant that generates compelling product descriptions."
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load AI settings.";
        toast(message, { variant: "error" });
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [toast]);

  const saveSetting = async (key: string, value: string) => {
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
    if (!res.ok) {
      throw new Error("Failed to save AI settings.");
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await Promise.all([
        saveSetting("openai_api_key", apiKey),
        saveSetting("openai_model", model),
        saveSetting("description_generation_prompt", prompt),
      ]);
      toast("AI settings saved", { variant: "success" });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save AI settings.";
      toast(message, { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/settings" aria-label="Back to settings">
            <ChevronLeftIcon className="size-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-white">AI Settings</h1>
          <p className="text-sm text-gray-400">
            Configure GPT credentials and prompt behavior.
          </p>
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-[240px_1fr]">
        <aside className="rounded-md border border-gray-800 bg-gray-900 p-4">
          <div className="flex flex-col gap-2">
            {aiSections.map((section) => (
              <button
                key={section}
                onClick={() => setActiveSection(section)}
                className={`rounded px-3 py-2 text-left text-sm transition ${
                  activeSection === section
                    ? "bg-gray-800 text-white"
                    : "text-gray-300 hover:bg-gray-800/60"
                }`}
              >
                {section}
              </button>
            ))}
          </div>
        </aside>
        <section className="rounded-md border border-gray-800 bg-gray-900 p-6">
          {activeSection === "GPT" && (
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-200">
                  OpenAI API key
                </label>
                <Input
                  type="password"
                  placeholder="sk-..."
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  disabled={loading || saving}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-200">
                  Default model
                </label>
                <Select
                  value={model}
                  onValueChange={(value) =>
                    setModel(value as typeof modelOptions[number])
                  }
                  disabled={loading || saving}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {modelOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-200">
                  Description prompt
                </label>
                <Textarea
                  rows={6}
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  disabled={loading || saving}
                />
                <p className="mt-2 text-xs text-gray-500">
                  Use placeholders like [name_en] or [price] and include [images]
                  to attach product images.
                </p>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={loading || saving}>
                  {saving ? "Saving..." : "Save GPT settings"}
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
