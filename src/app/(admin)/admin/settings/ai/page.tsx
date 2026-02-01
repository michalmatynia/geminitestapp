"use client";

import { Button, Input, Label, useToast, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui";

import { useEffect, useState, type ChangeEvent } from "react";

import { ChevronLeftIcon, SaveIcon } from "lucide-react";

import Link from "next/link";











import { useSettings, useUpdateSetting, type SystemSetting } from "@/shared/hooks/use-settings";



export default function AiApiSettingsPage() {



  const { toast } = useToast();



  const { data: settings, isLoading } = useSettings();



  const updateSetting = useUpdateSetting();







  const [saving, setSaving] = useState(false);



  const [openaiApiKey, setOpenaiApiKey] = useState("");



  const [anthropicApiKey, setAnthropicApiKey] = useState("");



  const [geminiApiKey, setGeminiApiKey] = useState("");







  useEffect(() => {



    if (settings) {



      const settingsMap = new Map(settings.map((item: SystemSetting) => [item.key, item.value]));



      setOpenaiApiKey(settingsMap.get("openai_api_key") || "");



      setAnthropicApiKey(settingsMap.get("anthropic_api_key") || "");



      setGeminiApiKey(settingsMap.get("gemini_api_key") || "");



    }



  }, [settings]);







  const handleSave = async (): Promise<void> => {



    setSaving(true);



    try {



      await Promise.all([



        updateSetting.mutateAsync({ key: "openai_api_key", value: openaiApiKey }),



        updateSetting.mutateAsync({ key: "anthropic_api_key", value: anthropicApiKey }),



        updateSetting.mutateAsync({ key: "gemini_api_key", value: geminiApiKey }),



      ]);



      toast("API keys saved successfully", { variant: "success" });



    } catch (error: unknown) {



      console.error("Failed to save settings:", error);



      toast("Failed to save settings", { variant: "error" });



    } finally {



      setSaving(false);



    }



  };







  if (isLoading) {

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

              onChange={(e: ChangeEvent<HTMLInputElement>) => setOpenaiApiKey(e.target.value)}

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

              onChange={(e: ChangeEvent<HTMLInputElement>) => setAnthropicApiKey(e.target.value)}

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

              onChange={(e: ChangeEvent<HTMLInputElement>) => setGeminiApiKey(e.target.value)}

              className="bg-gray-900 border-gray-700 text-white"

            />

            <p className="text-[10px] text-gray-500">Used for Gemini 1.5 Pro and Flash models.</p>

          </div>



          <div className="flex justify-end pt-4">

            <Button 

              onClick={() => void handleSave()} 

              disabled={saving}

              className="min-w-[120px] border border-white/20 hover:border-white/40"

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
