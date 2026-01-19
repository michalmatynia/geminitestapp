"use client";

import React, { useEffect, useState } from "react";
import { ChevronLeftIcon, SaveIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AiApiSettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [anthropicApiKey, setAnthropicApiKey] = useState("");
  const [geminiApiKey, setGeminiApiKey] = useState("");

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = (await res.json()) as { key: string; value: string }[];
          const settingsMap = new Map(data.map((item) => [item.key, item.value]));
          
          setOpenaiApiKey(settingsMap.get("openai_api_key") || "");
          setAnthropicApiKey(settingsMap.get("anthropic_api_key") || "");
          setGeminiApiKey(settingsMap.get("gemini_api_key") || "");
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
        toast("Failed to load settings", { variant: "error" });
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, [toast]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all([
        fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "openai_api_key", value: openaiApiKey }),
        }),
        fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "anthropic_api_key", value: anthropicApiKey }),
        }),
        fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "gemini_api_key", value: geminiApiKey }),
        }),
      ]);
      toast("API keys saved successfully", { variant: "success" });
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast("Failed to save settings", { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <div className="text-white">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 max-w-4xl">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin" aria-label="Back to dashboard">
            <ChevronLeftIcon className="size-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-white">AI API Settings</h1>
          <p className="text-sm text-gray-400">
            Configure your API keys for cloud-based AI models.
          </p>
        </div>
      </div>

      <Card className="bg-gray-950 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white text-xl">Cloud Providers</CardTitle>
          <CardDescription className="text-gray-400">
            Enter your API keys for the services you want to use. These keys are stored securely and used across the application.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="openai" className="text-gray-200">OpenAI API Key</Label>
            <Input
              id="openai"
              type="password"
              placeholder="sk-..."
              value={openaiApiKey}
              onChange={(e) => setOpenaiApiKey(e.target.value)}
              className="bg-gray-900 border-gray-700 text-white"
            />
            <p className="text-[10px] text-gray-500">Used for GPT-4o, GPT-3.5 Turbo, and DALL-E.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="anthropic" className="text-gray-200">Anthropic API Key</Label>
            <Input
              id="anthropic"
              type="password"
              placeholder="sk-ant-..."
              value={anthropicApiKey}
              onChange={(e) => setAnthropicApiKey(e.target.value)}
              className="bg-gray-900 border-gray-700 text-white"
            />
            <p className="text-[10px] text-gray-500">Used for Claude 3.5 Sonnet, Opus, and Haiku.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="gemini" className="text-gray-200">Gemini API Key</Label>
            <Input
              id="gemini"
              type="password"
              placeholder="AIza..."
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
              className="bg-gray-900 border-gray-700 text-white"
            />
            <p className="text-[10px] text-gray-500">Used for Gemini 1.5 Pro and Flash models.</p>
          </div>

          <div className="flex justify-end pt-4">
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]"
            >
              {saving ? "Saving..." : (
                <>
                  <SaveIcon className="mr-2 size-4" />
                  Save Keys
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
