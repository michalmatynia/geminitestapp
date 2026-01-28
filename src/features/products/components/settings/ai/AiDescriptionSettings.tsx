"use client";

import { Button, Input, Label, Select, SelectContent, SelectItem, SelectGroup, SelectLabel, SelectTrigger, SelectValue, Textarea, useToast, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, Checkbox } from "@/shared/ui";
import { useState, useEffect } from "react";






import { CopyIcon, InfoIcon, PlayIcon, RefreshCcw, XCircle } from "lucide-react";


import { ProductWithImages } from "@/features/products/types";

const STATIC_VISION_MODELS = [
  { id: "gpt-4o", name: "GPT-4o" },
  { id: "gpt-4-turbo", name: "GPT-4 Turbo" },
];

const STATIC_TEXT_MODELS = [
  { id: "gpt-4o", name: "GPT-4o" },
  { id: "gpt-4-turbo", name: "GPT-4 Turbo" },
  { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo" },
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

export function AiDescriptionSettings() {
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

  const [ollamaModels, setOllamaModels] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [testProductId, setTestProductId] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResultData | null>(null);
  const [queuing, setQueuing] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const settingsRes = await fetch("/api/settings");
        let settingsMap = new Map<string, string>();
        if (settingsRes.ok) {
          const data = (await settingsRes.json()) as { key: string, value: string }[];
          settingsMap = new Map(data.map(item => [item.key, item.value]));
        }

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

  const handleTest = async () => {
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
        ? product.images.map((img) => img.imageFile?.filepath).filter((p): p is string => Boolean(p)) 
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
        await new Promise(r => setTimeout(r, 2000));
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
          } catch (err) {
            console.warn("Failed to save test result to database:", err);
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
      console.error("Test failed:", error);
      toast(error instanceof Error ? error.message : "Test failed.", { variant: "error" });
    } finally {
      setTesting(false);
    }
  };

  const handleQueueAll = async () => {
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

  const handleSave = async () => {
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

      for (const payload of payloads) {
        await fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
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
      console.error("Failed to save:", error);
      toast("Failed to save.", { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const copyResult = (text?: string) => {
    if (!text) return;
    void navigator.clipboard.writeText(text);
    toast("Result copied to clipboard.");
  };

  const clearTestResults = async () => {
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
      toast("Test results cleared.", { variant: "success" });
    } catch (err) {
      console.warn("Failed to clear test results from database:", err);
    }
  };

  if (loading) return <div className="text-sm text-gray-400">Loading settings...</div>;

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-medium text-white mb-1">AI Description Configuration</h2>
            <p className="text-sm text-gray-400">Configure multi-step generation flow for product descriptions.</p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Product ID or SKU"
              value={testProductId}
              onChange={(e) => setTestProductId(e.target.value)}
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
                  {AVAILABLE_PLACEHOLDERS.map((ph) => (
                    <div key={ph.key} className="flex items-center justify-between text-sm border-b border-border/50 pb-2 last:border-0 last:pb-0">
                      <code className="text-purple-400 font-bold bg-purple-500/10 px-1 py-0.5 rounded">[{ph.key}]</code>
                      <span className="text-gray-500 italic text-xs">{ph.description}</span>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="space-y-6 rounded-md border border-border bg-card/50 p-6">
          {/* Path 1 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/20 text-xs font-bold text-blue-400">1</span>
              <h3 className="text-md font-medium text-white">Signal Path 1: Image Analysis</h3>
            </div>
            
            <div className="pl-8 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Input Prompt</Label>
                  <Textarea
                    rows={4}
                    value={visionInputPrompt}
                    onChange={(e) => setVisionInputPrompt(e.target.value)}
                    className="mt-1.5 bg-gray-900 border text-white font-mono text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Initial Result</Label>
                    <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => copyResult(testResult?.analysisInitial)}>
                      <CopyIcon className="size-3 mr-1"/>Copy
                    </Button>
                  </div>
                  <div className="mt-1.5 rounded-md bg-card/50 p-4 text-sm text-gray-300 h-[100px] overflow-y-auto border border-border font-mono">
                    {testResult?.analysisInitial ? (
                      <div className="whitespace-pre-wrap">{testResult.analysisInitial}</div>
                    ) : (
                      <span className="text-gray-600 italic text-xs">Waiting for test...</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="max-w-md">
                <Label>Vision Model</Label>
                <Select value={imageAnalysisModel} onValueChange={setImageAnalysisModel}>
                  <SelectTrigger className="mt-1.5 bg-gray-900 border text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>OpenAI</SelectLabel>
                      {STATIC_VISION_MODELS.map((m) => (<SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>))}
                    </SelectGroup>
                    {ollamaModels.length > 0 && (
                      <SelectGroup>
                        <SelectLabel>Ollama</SelectLabel>
                        {ollamaModels.map((m) => (<SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>))}
                      </SelectGroup>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-4 border-t border-border/50 space-y-4">
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="v-output-enabled" 
                    checked={visionOutputEnabled} 
                    onCheckedChange={(checked) => setVisionOutputEnabled(!!checked)} 
                  />
                  <Label htmlFor="v-output-enabled" className="text-blue-400 cursor-pointer">Enable Output Prompt (Refinement using {imageAnalysisModel})</Label>
                </div>
                {visionOutputEnabled && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="space-y-2">
                      <Label>Output Prompt</Label>
                      <Textarea
                        rows={4}
                        value={visionOutputPrompt}
                        onChange={(e) => setVisionOutputPrompt(e.target.value)}
                        className="mt-1.5 bg-gray-900 border text-white font-mono text-sm"
                        placeholder="Refine result... use [result] for initial analysis."
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Final Analysis</Label>
                        <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => copyResult(testResult?.analysisFinal)}>
                          <CopyIcon className="size-3 mr-1"/>Copy
                        </Button>
                      </div>
                      <div className="mt-1.5 rounded-md bg-card/50 p-4 text-sm text-gray-300 h-[100px] overflow-y-auto border border-border font-mono">
                        {testResult?.analysisFinal ? (
                          <div className="whitespace-pre-wrap">{testResult.analysisFinal}</div>
                        ) : (
                          <span className="text-gray-600 italic text-xs">No result yet.</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-border my-8"></div>

          {/* Path 2 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-500/20 text-xs font-bold text-purple-400">2</span>
              <h3 className="text-md font-medium text-white">Signal Path 2: Description Generation</h3>
            </div>
            
            <div className="pl-8 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Input Prompt</Label>
                  <Textarea
                    rows={6}
                    value={generationInputPrompt}
                    onChange={(e) => setGenerationInputPrompt(e.target.value)}
                    className="mt-1.5 bg-gray-900 border text-white font-mono text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Initial Description</Label>
                    <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => copyResult(testResult?.descriptionInitial)}>
                      <CopyIcon className="size-3 mr-1"/>Copy
                    </Button>
                  </div>
                  <div className="mt-1.5 rounded-md bg-card/50 p-4 text-sm text-gray-300 h-[132px] overflow-y-auto border border-border font-sans">
                    {testResult?.descriptionInitial ? (
                      <div className="whitespace-pre-wrap">{testResult.descriptionInitial}</div>
                    ) : (
                      <span className="text-gray-600 italic text-xs">Waiting for test...</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="max-w-md">
                <Label>Generation Model</Label>
                <Select value={descriptionGenerationModel} onValueChange={setDescriptionGenerationModel}>
                  <SelectTrigger className="mt-1.5 bg-gray-900 border text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>OpenAI</SelectLabel>
                      {STATIC_TEXT_MODELS.map((m) => (<SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>))}
                    </SelectGroup>
                    {ollamaModels.length > 0 && (
                      <SelectGroup>
                        <SelectLabel>Ollama</SelectLabel>
                        {ollamaModels.map((m) => (<SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>))}
                      </SelectGroup>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-4 border-t border-border/50 space-y-4">
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="g-output-enabled" 
                    checked={generationOutputEnabled} 
                    onCheckedChange={(checked) => setGenerationOutputEnabled(!!checked)} 
                  />
                  <Label htmlFor="g-output-enabled" className="text-purple-400 cursor-pointer">Enable Output Prompt (Refinement using {descriptionGenerationModel})</Label>
                </div>
                {generationOutputEnabled && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="space-y-2">
                      <Label>Output Prompt</Label>
                      <Textarea
                        rows={6}
                        value={generationOutputPrompt}
                        onChange={(e) => setGenerationOutputPrompt(e.target.value)}
                        className="mt-1.5 bg-gray-900 border text-white font-mono text-sm"
                        placeholder="Final polish... use [result] for initial description."
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Final Description</Label>
                        <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => copyResult(testResult?.descriptionFinal)}>
                          <CopyIcon className="size-3 mr-1"/>Copy
                        </Button>
                      </div>
                      <div className="mt-1.5 rounded-md bg-card/50 p-4 text-sm text-gray-300 h-[132px] overflow-y-auto border border-border font-sans">
                        {testResult?.descriptionFinal ? (
                          <div className="whitespace-pre-wrap">{testResult.descriptionFinal}</div>
                        ) : (
                          <span className="text-gray-600 italic text-xs">No result yet.</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => void handleSave()} disabled={saving} className="bg-white text-black hover:bg-gray-200">
          {saving ? "Saving..." : "Save Configuration"}
        </Button>
      </div>
    </div>
  );
}