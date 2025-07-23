"use client";

import { useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Setting {
  key: string;
  value: string;
}

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState("");
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("gpt-3.5-turbo");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetch("/api/settings")
      .then((res) => res.json())
      .then((settings: Setting[]) => {
        const apiKeySetting = settings.find(
          (setting) => setting.key === "openai_api_key"
        );
        if (apiKeySetting) {
          setApiKey(apiKeySetting.value);
        }
        const promptSetting = settings.find(
          (setting) => setting.key === "description_generation_prompt"
        );
        if (promptSetting) {
          setPrompt(promptSetting.value);
        }
        const modelSetting = settings.find(
          (setting) => setting.key === "openai_model"
        );
        if (modelSetting) {
          setModel(modelSetting.value);
        }
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all([
        fetch("/api/settings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ key: "openai_api_key", value: apiKey }),
        }),
        fetch("/api/settings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            key: "description_generation_prompt",
            value: prompt,
          }),
        }),
        fetch("/api/settings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ key: "openai_model", value: model }),
        }),
      ]);
      alert("Settings saved successfully!");
    } catch (error) {
      console.error("Failed to save settings:", error);
      alert("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg bg-gray-950 p-6 shadow-lg">
      <h1 className="text-3xl font-bold text-white">ChatGPT Settings</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSave();
        }}
      >
        <div className="mt-4">
          <Label htmlFor="api-key">OpenAI API Key</Label>
          <input
            type="text"
            autoComplete="username"
            style={{ display: "none" }}
          />
          <Input
            id="api-key"
            type="password"
            autoComplete="new-password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
        </div>
        <div className="mt-4">
          <Label htmlFor="model">Model</Label>
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger>
              <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gpt-3.5-turbo">gpt-3.5-turbo</SelectItem>
              <SelectItem value="gpt-4o">
                gpt-4o
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="mt-4">
          <Label htmlFor="prompt">Description Generation Prompt</Label>
          <Textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={5}
          />
          <p className="text-sm text-gray-500 mt-2">
            Available placeholders: [name], [price], [sku], [description],
            [supplierName], [supplierLink], [priceComment], [stock],
            [sizeLength], [sizeWidth], [images]
          </p>
        </div>
        <Button type="submit" disabled={saving} className="mt-4">
          {saving ? "Saving..." : "Save"}
        </Button>
      </form>
    </div>
  );
}

