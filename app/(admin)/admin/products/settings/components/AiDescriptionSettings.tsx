"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";

const STATIC_VISION_MODELS = [
  { id: "gpt-4o", name: "GPT-4o" },
  { id: "gpt-4-turbo", name: "GPT-4 Turbo" },
];

const STATIC_TEXT_MODELS = [
  { id: "gpt-4o", name: "GPT-4o" },
  { id: "gpt-4-turbo", name: "GPT-4 Turbo" },
  { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo" },
];

export function AiDescriptionSettings() {
  const [imageAnalysisModel, setImageAnalysisModel] = useState("");
  const [visionPrompt, setVisionPrompt] = useState("");
  const [descriptionGenerationModel, setDescriptionGenerationModel] = useState("");
  const [ollamaModels, setOllamaModels] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load Settings
        const settingsRes = await fetch("/api/settings");
        let settingsMap = new Map<string, string>();
        if (settingsRes.ok) {
          const data = await settingsRes.json() as { key: string, value: string }[];
          settingsMap = new Map(data.map(item => [item.key, item.value]));
        }

        setImageAnalysisModel(settingsMap.get("ai_vision_model") || "gpt-4o");
        setVisionPrompt(
          settingsMap.get("ai_vision_prompt") ||
            "Analyze these product images and describe their visual features, colors, materials, and key design elements."
        );
        setDescriptionGenerationModel(settingsMap.get("openai_model") || "gpt-3.5-turbo");

        // Load Ollama Models
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
    loadData();
  }, [toast]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save Vision Model & Prompt
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "ai_vision_model",
          value: imageAnalysisModel,
        }),
      });
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "ai_vision_prompt",
          value: visionPrompt,
        }),
      });

      // Save Text Model
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "openai_model",
          value: descriptionGenerationModel,
        }),
      });

      toast("AI Description settings saved.", { variant: "success" });
    } catch (error) {
      console.error("Failed to save AI settings:", error);
      toast("Failed to save settings.", { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-gray-400">Loading settings...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-medium text-white mb-1">AI Description Configuration</h2>
        <p className="text-sm text-gray-400 mb-6">
          Configure the two-step signal path for generating product descriptions.
        </p>

        <div className="space-y-6 rounded-md border border-gray-800 bg-gray-950/50 p-6">
          {/* Signal Path 1 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/20 text-xs font-bold text-blue-400">1</span>
              <h3 className="text-md font-medium text-white">Signal Path 1: Image Analysis</h3>
            </div>
            <div className="pl-8 space-y-4">
              <p className="text-sm text-gray-400">
                This step analyzes product images (from links or uploads) to extract visual details.
              </p>
              <div className="max-w-md">
                <Label htmlFor="vision-model">Vision Model</Label>
                <Select value={imageAnalysisModel} onValueChange={setImageAnalysisModel}>
                  <SelectTrigger id="vision-model" className="mt-1.5 bg-gray-900 border-gray-700 text-white">
                    <SelectValue placeholder="Select a vision model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>OpenAI (Cloud)</SelectLabel>
                      {STATIC_VISION_MODELS.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    {ollamaModels.length > 0 && (
                      <SelectGroup>
                        <SelectLabel>Open Source (Chatbot/Ollama)</SelectLabel>
                        {ollamaModels.map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            {model.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="max-w-lg">
                <Label htmlFor="vision-prompt">Vision Prompt</Label>
                <Textarea
                  id="vision-prompt"
                  rows={4}
                  value={visionPrompt}
                  onChange={(e) => setVisionPrompt(e.target.value)}
                  className="mt-1.5 bg-gray-900 border-gray-700 text-white"
                  placeholder="Analyze these product images..."
                />
                <p className="mt-2 text-xs text-gray-500">
                  This prompt guides the AI to extract visual details from the images.
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 my-6"></div>

          {/* Signal Path 2 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-500/20 text-xs font-bold text-purple-400">2</span>
              <h3 className="text-md font-medium text-white">Signal Path 2: Description Generation</h3>
            </div>
            <div className="pl-8 space-y-4">
              <p className="text-sm text-gray-400">
                This step uses the image analysis results combined with product fields (e.g., Name) to generate the final description.
              </p>
              <div className="max-w-md">
                <Label htmlFor="text-model">Generation Model</Label>
                <Select value={descriptionGenerationModel} onValueChange={setDescriptionGenerationModel}>
                  <SelectTrigger id="text-model" className="mt-1.5 bg-gray-900 border-gray-700 text-white">
                    <SelectValue placeholder="Select a text model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>OpenAI (Cloud)</SelectLabel>
                      {STATIC_TEXT_MODELS.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    {ollamaModels.length > 0 && (
                      <SelectGroup>
                        <SelectLabel>Open Source (Chatbot/Ollama)</SelectLabel>
                        {ollamaModels.map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            {model.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="bg-white text-black hover:bg-gray-200">
          {saving ? "Saving..." : "Save Configuration"}
        </Button>
      </div>
    </div>
  );
}
