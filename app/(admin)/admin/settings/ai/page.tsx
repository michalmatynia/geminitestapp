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
import { Label } from "@/components/ui/label";

type SettingsPayload = {
  id?: string;
  key: string;
  value: string;
};

const visionModelOptions = ["gpt-4o", "gpt-4-turbo"] as const;
const textModelOptions = ["gpt-3.5-turbo", "gpt-4o", "gpt-4-turbo"] as const;
const aiSections = ["GPT"] as const;

export default function AISettingsPage() {
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState<(typeof aiSections)[number]>(
    "GPT"
  );
  
  // Step 1: Vision
  const [visionModel, setVisionModel] = useState<(typeof visionModelOptions)[number]>("gpt-4o");

  // Step 2: Generation
  const [generationModel, setGenerationModel] = useState<(typeof textModelOptions)[number]>("gpt-3.5-turbo");
  const [generationPrompt, setGenerationPrompt] = useState(
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
        
        // Vision
        const savedVisionModel = settingsMap.get("ai_vision_model");
        if (savedVisionModel && visionModelOptions.includes(savedVisionModel as any)) {
            setVisionModel(savedVisionModel as typeof visionModelOptions[number]);
        }

        // Generation
        const savedGenModel = settingsMap.get("openai_model"); // Keeping existing key
        if (savedGenModel && textModelOptions.includes(savedGenModel as any)) {
            setGenerationModel(savedGenModel as typeof textModelOptions[number]);
        }
        setGenerationPrompt(
          settingsMap.get("description_generation_prompt") || // Keeping existing key
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
        saveSetting("ai_vision_model", visionModel),
        saveSetting("openai_model", generationModel),
        saveSetting("description_generation_prompt", generationPrompt),
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
            Configure the 2-step description generation pipeline.
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
            <div className="space-y-8">
              {/* Step 1: Vision */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white">Step 1: Image Analysis (Vision)</h2>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold bg-blue-500/10 text-blue-400 px-2 py-1 rounded">Signal Path 1</span>
                </div>
                <p className="text-sm text-gray-400">
                    Select a vision-capable model to analyze product images before generating the description.
                </p>
                <div>
                  <Label className="mb-2 block text-sm font-medium text-gray-200">
                    Vision Model
                  </Label>
                  <Select
                    value={visionModel}
                    onValueChange={(value) =>
                      setVisionModel(value as typeof visionModelOptions[number])
                    }
                    disabled={loading || saving}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      {visionModelOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <hr className="border-gray-800" />

              {/* Step 2: Generation */}
              <div className="space-y-4">
                 <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white">Step 2: Description Generation</h2>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold bg-purple-500/10 text-purple-400 px-2 py-1 rounded">Signal Path 2</span>
                </div>
                 <p className="text-sm text-gray-400">
                    Generates the final description using product data and the analysis from Step 1.
                </p>
                <div>
                  <Label className="mb-2 block text-sm font-medium text-gray-200">
                    Generation Model
                  </Label>
                  <Select
                    value={generationModel}
                    onValueChange={(value) =>
                      setGenerationModel(value as typeof textModelOptions[number])
                    }
                    disabled={loading || saving}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      {textModelOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-2 block text-sm font-medium text-gray-200">
                    Generation Prompt
                  </Label>
                  <Textarea
                    rows={6}
                    value={generationPrompt}
                    onChange={(event) => setGenerationPrompt(event.target.value)}
                    disabled={loading || saving}
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    Use <code>[imageAnalysis]</code> to include the output from Step 1.
                    Other placeholders: <code>[name_en]</code>, <code>[price]</code>, <code>[brand]</code>.
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleSave} disabled={loading || saving}>
                  {saving ? "Saving..." : "Save AI Settings"}
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
