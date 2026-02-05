"use client";

import { Button, Input, useToast, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, SettingsPageLayout, PromptGenerationSection } from "@/shared/ui";
import { useState, useEffect } from "react";
import { useUpdateSetting } from "@/shared/hooks/use-settings";
import { useSettingsStore } from "@/shared/providers/SettingsStoreProvider";
import { InfoIcon, PlayIcon, RefreshCcw, XCircle } from "lucide-react";
import { ProductWithImages, ProductImageRecord } from "@/features/products/types";
import { logClientError } from "@/features/observability";
import { fetchSettingsCached, invalidateSettingsCache, type SettingRecord } from "@/shared/api/settings-client";

const STATIC_VISION_MODELS = [
  { value: "gpt-4o", label: "GPT-4o", description: "OpenAI" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo", description: "OpenAI" },
];

const STATIC_TEXT_MODELS = [
  { value: "gpt-4o", label: "GPT-4o", description: "OpenAI" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo", description: "OpenAI" },
  { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo", description: "OpenAI" },
];

const AVAILABLE_PLACEHOLDERS = [
  { key: "result", description: "Result from the immediate previous step." },
  { key: "analysis", description: "Final result from Signal Path 1 (Image Analysis)." },
  { key: "description", description: "Initial result from Signal Path 2 (Description Generation)." },
  { key: "images", description: "Product images. Only sent to AI if this placeholder is present." },
  { key: "sku", description: "Product SKU" },
  { key: "name_en", description: "Product Name (English)" },
  { key: "name_pl", description: "Product Name (Polish)" },
  { key: "name_de", description: "Product Name (German)" },
  { key: "price", description: "Regular Price" },
  { key: "stock", description: "Current Stock Level" },
  { key: "ean", description: "EAN Code" },
  { key: "gtin", description: "GTIN Code" },
  { key: "asin", description: "ASIN (Amazon)" },
  { key: "supplierName", description: "Supplier Name" },
  { key: "weight", description: "Product Weight" },
  { key: "sizeLength", description: "Size: Length" },
  { key: "sizeWidth", description: "Size: Width" },
  { key: "length", description: "Length" },
];

type TestResultData = { 
  analysisInitial?: string; 
  analysisFinal?: string;
  descriptionInitial?: string;
  descriptionFinal?: string;
};

interface JobData {
  status: "pending" | "running" | "completed" | "failed" | "canceled";
  result?: TestResultData & { analysis?: string; description?: string };
  errorMessage?: string;
}

export function AiDescriptionSettings(): React.JSX.Element {
  const [imageAnalysisModel, setImageAnalysisModel] = useState("");
  
  // Path 1
  const [visionInputPrompt, setVisionInputPrompt] = useState("");
  const [visionOutputPrompt, setVisionOutputPrompt] = useState("");
  const [visionOutputEnabled, setVisionOutputEnabled] = useState(false);

  const [descriptionGenerationModel, setDescriptionGenerationModel] = useState("");
  
  // Path 2
  const [generationInputPrompt, setGenerationInputPrompt] = useState("");
  const [generationOutputPrompt, setGenerationOutputPrompt] = useState("");
  const [generationOutputEnabled, setGenerationOutputEnabled] = useState(false);

  const [ollamaModels, setOllamaModels] = useState<{ value: string; label: string; description: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [testProductId, setTestProductId] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResultData | null>(null);
  const [queuing, setQueuing] = useState(false);

  // Use TanStack Query hooks
  const settingsStore = useSettingsStore();
  const settingsMap = settingsStore.map;
  const settingsLoading = settingsStore.isLoading;
  const { mutateAsync: updateSettingMutateAsync } = useUpdateSetting();

  useEffect(() => {
    if (settingsMap && !settingsLoading) {
      setImageAnalysisModel(settingsMap.get("ai_vision_model") || "gpt-4o");
      setVisionInputPrompt(settingsMap.get("ai_vision_user_prompt") || "Analyze these product images...");
      setVisionOutputPrompt(settingsMap.get("ai_vision_prompt") || "");
      setVisionOutputEnabled(settingsMap.get("ai_vision_output_enabled") === "true");
      setDescriptionGenerationModel(settingsMap.get("ai_description_model") || "gpt-4o");
      setGenerationInputPrompt(settingsMap.get("ai_description_user_prompt") || "Generate a product description...");
      setGenerationOutputPrompt(settingsMap.get("ai_description_prompt") || "");
      setGenerationOutputEnabled(settingsMap.get("ai_description_output_enabled") === "true");
      setLoading(false);
    }
  }, [settingsMap, settingsLoading]);

  useEffect(() => {
    const loadData = async (): Promise<void> => {
      try {
        const data = await fetchSettingsCached();
        const settingsMap = new Map(data.map((item: SettingRecord) => [item.key, item.value]));

        setImageAnalysisModel(settingsMap.get("ai_vision_model") || "gpt-4o");
        setVisionInputPrompt(settingsMap.get("ai_vision_user_prompt") || "Analyze these product images...");
        setVisionOutputPrompt(settingsMap.get("ai_vision_prompt") || "");
        setVisionOutputEnabled(settingsMap.get("ai_vision_output_enabled") === "true");

        setDescriptionGenerationModel(settingsMap.get("openai_model") || "gpt-3.5-turbo");
        setGenerationInputPrompt(settingsMap.get("description_generation_user_prompt") || "Generate description for [name_en] using [result]");
        setGenerationOutputPrompt(settingsMap.get("description_generation_prompt") || "");
        setGenerationOutputEnabled(settingsMap.get("ai_generation_output_enabled") === "true");
        setTestProductId(settingsMap.get("ai_description_test_product_id") || "");

        // Load last test result if exists
        const testResultJson = settingsMap.get("ai_description_last_test_result");
        if (testResultJson) {
          try {
            const parsed = JSON.parse(testResultJson) as TestResultData;
            setTestResult(parsed);
            console.log("Loaded previous test result from database");
          } catch (err) {
            console.warn("Failed to parse saved test result:", err);
          }
        }

        const chatbotRes = await fetch("/api/chatbot");
        if (chatbotRes.ok) {
          const data = (await chatbotRes.json()) as { models?: string[] };
          if (Array.isArray(data.models)) {
            setOllamaModels(data.models.map((name: string) => ({ value: name, label: name, description: "Ollama" })));
          }
        }
      } catch (error) {
        logClientError(error, { context: { source: "AiDescriptionSettings", action: "loadData" } });
        toast("Failed to load configuration.", { variant: "error" });
      } finally {
        setLoading(false);
      }
    };
    void loadData();
  }, [toast]);

  const handleTest = async (): Promise<void> => {
    if (!testProductId) {
      toast("Please enter a Product ID or SKU.", { variant: "error" });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      let product: ProductWithImages | null = null;
      const productRes = await fetch(`/api/products/${testProductId}`);
      
      if (productRes.ok) {
        product = (await productRes.json()) as ProductWithImages;
      } else {
        const skuRes = await fetch(`/api/products?sku=${testProductId}`);
        if (skuRes.ok) {
          const products = (await skuRes.json()) as ProductWithImages[];
          if (Array.isArray(products) && products.length > 0) {
            product = products[0] || null;
          }
        }
      }

      if (!product) {
        throw new Error(`Product not found: ${testProductId}`);
      }

      const uploadedImages = Array.isArray(product.images) 
        ? product.images.map((img: ProductImageRecord) => img.imageFile?.filepath).filter((p: string | undefined): p is string => Boolean(p)) 
        : [];
      const externalImages = Array.isArray(product.imageLinks) ? product.imageLinks : [];
      const allImageUrls = [...externalImages, ...uploadedImages];

      // Create a job for the test
      const enqueueRes = await fetch("/api/products/ai-jobs/enqueue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          type: "description_generation",
          payload: {
            productData: product,
            imageUrls: allImageUrls,
            visionOutputEnabled,
            generationOutputEnabled,
            isTest: true
          }
        }),
      });

      const enqueueData = (await enqueueRes.json()) as { error?: string; jobId: string };
      if (!enqueueRes.ok) {
        throw new Error(enqueueData.error || "Failed to enqueue test job.");
      }
      const jobId = enqueueData.jobId;

      // Poll for completion
      let completed = false;
      let attempts = 0;
      while (!completed && attempts < 60) { // 2 minutes max
        await new Promise((r: (value: void) => void) => setTimeout(r, 2000));
        const statusRes = await fetch(`/api/products/ai-jobs/${jobId}`);
        if (!statusRes.ok) break;
        const { job } = (await statusRes.json()) as { job: JobData };
        
        if (job.status === "completed") {
          const data = job.result;

          const newTestResult: TestResultData = {
            analysisInitial: data?.analysisInitial || data?.analysis || "",
            analysisFinal: data?.analysisFinal || "",
            descriptionInitial: data?.descriptionInitial || data?.description || "",
            descriptionFinal: data?.descriptionFinal || "",
          };

          setTestResult(newTestResult);

          // Save test result to database so it persists across page navigations
          try {
            await fetch("/api/settings", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                key: "ai_description_last_test_result",
                value: JSON.stringify(newTestResult)
              }),
            });
            invalidateSettingsCache();
          } catch (err) {
            logClientError(err, { context: { source: "AiDescriptionSettings", action: "saveTestResult", jobId } });
          }

          toast("Test completed. Results saved.", { variant: "success" });
          completed = true;
        } else if (job.status === "failed") {
          throw new Error(job.errorMessage || "Job failed.");
        } else if (job.status === "canceled") {
          throw new Error("Job was canceled.");
        }
        attempts++;
      }

      if (!completed) {
        throw new Error("Test timed out. Check the Jobs page.");
      }

    } catch (error) {
      logClientError(error, { context: { source: "AiDescriptionSettings", action: "handleTest", productId: testProductId } });
      toast(error instanceof Error ? error.message : "Test failed.", { variant: "error" });
    } finally {
      setTesting(false);
    }
  };

  const handleQueueAll = async (): Promise<void> => {
    if (!window.confirm("This will queue description generation for ALL products using the current configuration. Proceed?")) return;
    setQueuing(true);
    try {
      const res = await fetch("/api/products/ai-jobs/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "description_generation",
          config: {
            visionOutputEnabled,
            generationOutputEnabled
          }
        }),
      });
      if (!res.ok) throw new Error("Failed to queue jobs.");
      const data = (await res.json()) as { count: number };
      toast(`Queued ${data.count} products for generation.`, { variant: "success" });
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to queue jobs.", { variant: "error" });
    } finally {
      setQueuing(false);
    }
  };

  const handleSave = async (): Promise<void> => {
    setSaving(true);
    try {
      const payloads = [
        { key: "ai_vision_model", value: imageAnalysisModel },
        { key: "ai_vision_user_prompt", value: visionInputPrompt },
        { key: "ai_vision_prompt", value: visionOutputPrompt },
        { key: "ai_vision_output_enabled", value: String(visionOutputEnabled) },
        { key: "openai_model", value: descriptionGenerationModel },
        { key: "description_generation_user_prompt", value: generationInputPrompt },
        { key: "description_generation_prompt", value: generationOutputPrompt },
        { key: "ai_generation_output_enabled", value: String(generationOutputEnabled) },
        { key: "ai_description_test_product_id", value: testProductId },
      ];

      // Use TanStack Query mutation for settings updates
      for (const payload of payloads) {
        await updateSettingMutateAsync(payload);
      }

      // Also save to dedicated MongoDB collection
      await fetch("/api/ai-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageAnalysisModel,
          visionInputPrompt,
          visionOutputPrompt,
          visionOutputEnabled,
          descriptionGenerationModel,
          generationInputPrompt,
          generationOutputPrompt,
          generationOutputEnabled,
          testProductId,
        }),
      });

      toast("Settings saved.", { variant: "success" });
    } catch (error) {
      logClientError(error, { context: { source: "AiDescriptionSettings", action: "handleSave" } });
      toast("Failed to save.", { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const copyResult = (text?: string): void => {
    if (!text) return;
    void navigator.clipboard.writeText(text);
    toast("Result copied to clipboard.");
  };

  const clearTestResults = async (): Promise<void> => {
    setTestResult(null);
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "ai_description_last_test_result",
          value: ""
        }),
      });
      invalidateSettingsCache();
      toast("Test results cleared.", { variant: "success" });
    } catch (err) {
      console.warn("Failed to clear test results from database:", err);
    }
  };

  if (loading) return <div className="text-sm text-gray-400">Loading settings...</div>;

  return (
    <SettingsPageLayout
      title="AI Description Configuration"
      description="Configure multi-step generation flow for product descriptions."
      onSave={handleSave}
      isSaving={saving}
      actions={
        <>
          <Input
            placeholder="Product ID or SKU"
            value={testProductId}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTestProductId(e.target.value)}
            className="w-[180px] bg-gray-900 border text-white h-9 text-sm"
          />
          <Button variant="secondary" onClick={() => void handleTest()} disabled={testing} className="gap-2 h-9">
            <PlayIcon className="size-3.5" />
            {testing ? "Testing..." : "Test on Product"}
          </Button>

          {testResult && (
            <Button variant="ghost" onClick={() => void clearTestResults()} className="gap-2 h-9 text-red-400 hover:text-red-300">
              <XCircle className="size-3.5" />
              Clear Results
            </Button>
          )}

          <Button variant="outline" onClick={() => void handleQueueAll()} disabled={queuing} className="gap-2 h-9 text-purple-400 border-purple-900/50 hover:bg-purple-950">
            <RefreshCcw className={`size-3.5 ${queuing ? "animate-spin" : ""}`} />
            {queuing ? "Queuing..." : "Queue for All"}
          </Button>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="h-9 gap-2">
                <InfoIcon className="size-4" />
                Placeholders
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Available Placeholders</DialogTitle>
                <DialogDescription>Use these placeholders to inject dynamic data into your prompts.</DialogDescription>
              </DialogHeader>
              <div className="space-y-2 mt-4">
                {AVAILABLE_PLACEHOLDERS.map((ph: { key: string, description: string }) => (
                  <div key={ph.key} className="flex items-center justify-between text-sm border-b border-border/50 pb-2 last:border-0 last:pb-0">
                    <code className="text-purple-400 font-bold bg-purple-500/10 px-1 py-0.5 rounded">[{ph.key}]</code>
                    <span className="text-gray-500 italic text-xs">{ph.description}</span>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </>
      }
    >
      <div className="space-y-8">
        <PromptGenerationSection
          pathNumber={1}
          pathTitle="Signal Path 1: Image Analysis"
          inputLabel="Input Prompt"
          inputValue={visionInputPrompt}
          onInputChange={setVisionInputPrompt}
          initialResultLabel="Initial Result"
          initialResultValue={testResult?.analysisInitial || null}
          onCopyInitialResult={() => copyResult(testResult?.analysisInitial)}
          modelLabel="Vision Model"
          modelValue={imageAnalysisModel}
          onModelChange={setImageAnalysisModel}
          modelOptions={[...STATIC_VISION_MODELS, ...ollamaModels]}
          outputEnabled={visionOutputEnabled}
          onOutputEnabledChange={setVisionOutputEnabled}
          outputPromptLabel="Output Prompt"
          outputPromptValue={visionOutputPrompt}
          onOutputPromptChange={setVisionOutputPrompt}
          outputPlaceholder="Refine result... use [result] for initial analysis."
          finalResultLabel="Final Analysis"
          finalResultValue={testResult?.analysisFinal || null}
          onCopyFinalResult={() => copyResult(testResult?.analysisFinal)}
          badgeVariant="info"
          badgeTextColor="text-blue-400"
          outputEnabledCheckboxId="v-output-enabled"
        />

        <PromptGenerationSection
          pathNumber={2}
          pathTitle="Signal Path 2: Description Generation"
          inputLabel="Input Prompt"
          inputValue={generationInputPrompt}
          onInputChange={setGenerationInputPrompt}
          initialResultLabel="Initial Description"
          initialResultValue={testResult?.descriptionInitial || null}
          onCopyInitialResult={() => copyResult(testResult?.descriptionInitial)}
          modelLabel="Generation Model"
          modelValue={descriptionGenerationModel}
          onModelChange={setDescriptionGenerationModel}
          modelOptions={[...STATIC_TEXT_MODELS, ...ollamaModels]}
          outputEnabled={generationOutputEnabled}
          onOutputEnabledChange={setGenerationOutputEnabled}
          outputPromptLabel="Output Prompt"
          outputPromptValue={generationOutputPrompt}
          onOutputPromptChange={setGenerationOutputPrompt}
          outputPlaceholder="Final polish... use [result] for initial description."
          finalResultLabel="Final Description"
          finalResultValue={testResult?.descriptionFinal || null}
          onCopyFinalResult={() => copyResult(testResult?.descriptionFinal)}
          badgeVariant="secondary"
          badgeTextColor="text-purple-400"
          outputEnabledCheckboxId="g-output-enabled"
        />
      </div>
    </SettingsPageLayout>
  );
}
