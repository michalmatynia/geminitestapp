'use client';

import { InfoIcon, PlayIcon, RefreshCcw, XCircle } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';

import { useChatbotModels } from '@/features/ai/chatbot/hooks/useChatbotQueries';
import { logClientError } from '@/features/observability';
import { useAiConfig, useUpdateAiConfigMutation } from '@/features/products/hooks/useAiConfigQueries';
import { useAiJobStatus, useEnqueueAiJob, useBulkAiJobs } from '@/features/products/hooks/useProductAiJobs';
import { ProductWithImages, ProductImageRecord } from '@/features/products/types';
import { Button, Input, useToast, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, SettingsPageLayout, PromptGenerationSection } from '@/shared/ui';

const STATIC_VISION_MODELS = [
  { value: 'gpt-4o', label: 'GPT-4o', description: 'OpenAI' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', description: 'OpenAI' },
];

const STATIC_TEXT_MODELS = [
  { value: 'gpt-4o', label: 'GPT-4o', description: 'OpenAI' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', description: 'OpenAI' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', description: 'OpenAI' },
];

const AVAILABLE_PLACEHOLDERS = [
  { key: 'result', description: 'Result from the immediate previous step.' },
  { key: 'analysis', description: 'Final result from Signal Path 1 (Image Analysis).' },
  { key: 'description', description: 'Final result from Signal Path 2 (Description Generation).' },
  { key: 'images', description: 'Product images. Only sent to AI if this placeholder is present.' },
  { key: 'sku', description: 'Product SKU' },
  { key: 'name_en', description: 'Product Name (English)' },
  { key: 'name_pl', description: 'Product Name (Polish)' },
  { key: 'name_de', description: 'Product Name (German)' },
  { key: 'price', description: 'Regular Price' },
  { key: 'stock', description: 'Current Stock Level' },
  { key: 'ean', description: 'EAN Code' },
  { key: 'gtin', description: 'GTIN Code' },
  { key: 'asin', description: 'ASIN (Amazon)' },
  { key: 'supplierName', description: 'Supplier Name' },
  { key: 'weight', description: 'Product Weight' },
  { key: 'sizeLength', description: 'Size: Length' },
  { key: 'sizeWidth', description: 'Size: Width' },
  { key: 'length', description: 'Length' },
];

type TestResultData = { 
  analysisInitial?: string; 
  analysisFinal?: string;
  descriptionInitial?: string;
  descriptionFinal?: string;
};

export function AiDescriptionSettings(): React.JSX.Element {
  const { toast } = useToast();
  const { data: config, isLoading: configLoading } = useAiConfig();
  const { mutateAsync: updateConfig } = useUpdateAiConfigMutation();
  const { data: chatbotModels = [] } = useChatbotModels();
  
  const [imageAnalysisModel, setImageAnalysisModel] = useState('');
  const [visionInputPrompt, setVisionInputPrompt] = useState('');
  const [visionOutputPrompt, setVisionOutputPrompt] = useState('');
  const [visionOutputEnabled, setVisionOutputEnabled] = useState(false);

  const [descriptionGenerationModel, setDescriptionGenerationModel] = useState('');
  const [generationInputPrompt, setGenerationInputPrompt] = useState('');
  const [generationOutputPrompt, setGenerationOutputPrompt] = useState('');
  const [generationOutputEnabled, setGenerationOutputEnabled] = useState(false);

  const [testProductId, setTestProductId] = useState('');
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<TestResultData | null>(null);

  const { data: jobStatus } = useAiJobStatus(activeJobId);
  const { mutateAsync: enqueueJob, isPending: enqueuing } = useEnqueueAiJob();
  const { mutateAsync: bulkJob, isPending: bulkQueuing } = useBulkAiJobs();

  const ollamaModels = useMemo(() => 
    chatbotModels.map((name: string) => ({ value: name, label: name, description: 'Ollama' })),
    [chatbotModels]
  );

  useEffect(() => {
    if (config) {
      setImageAnalysisModel(config.imageAnalysisModel || 'gpt-4o');
      setVisionInputPrompt(config.visionInputPrompt || 'Analyze these product images...');
      setVisionOutputPrompt(config.visionOutputPrompt || '');
      setVisionOutputEnabled(config.visionOutputEnabled ?? false);
      setDescriptionGenerationModel(config.descriptionGenerationModel || 'gpt-4o');
      setGenerationInputPrompt(config.generationInputPrompt || 'Generate description for [name_en] using [result]');
      setGenerationOutputPrompt(config.generationOutputPrompt || '');
      setGenerationOutputEnabled(config.generationOutputEnabled ?? false);
      setTestProductId(config.testProductId || '');
    }
  }, [config]);

  // Handle job status updates
  useEffect(() => {
    if (jobStatus?.job?.status === 'completed') {
      const data = jobStatus.job.result;
      const newTestResult: TestResultData = {
        analysisInitial: data?.analysisInitial || data?.analysis || '',
        analysisFinal: data?.analysisFinal || '',
        descriptionInitial: data?.descriptionInitial || data?.description || '',
        descriptionFinal: data?.descriptionFinal || '',
      };
      setTestResult(newTestResult);
      setActiveJobId(null);
      toast('Test completed successfully.', { variant: 'success' });
    } else if (jobStatus?.job?.status === 'failed') {
      toast(jobStatus.job.errorMessage || 'Job failed.', { variant: 'error' });
      setActiveJobId(null);
    }
  }, [jobStatus, toast]);

  const handleTest = async (): Promise<void> => {
    if (!testProductId) {
      toast('Please enter a Product ID or SKU.', { variant: 'error' });
      return;
    }

    try {
      setTestResult(null);
      
      // First find the product
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

      const { jobId } = await enqueueJob({
        productId: product.id,
        type: 'description_generation',
        payload: {
          productData: product,
          imageUrls: allImageUrls,
          visionOutputEnabled,
          generationOutputEnabled,
          isTest: true
        }
      });

      setActiveJobId(jobId);
      toast('Test job enqueued. Waiting for results...', { variant: 'info' });

    } catch (error) {
      logClientError(error, { context: { source: 'AiDescriptionSettings', action: 'handleTest', productId: testProductId } });
      toast(error instanceof Error ? error.message : 'Test failed.', { variant: 'error' });
    }
  };

  const handleQueueAll = async (): Promise<void> => {
    if (!window.confirm('This will queue description generation for ALL products using the current configuration. Proceed?')) return;
    
    try {
      const data = await bulkJob({
        type: 'description_generation',
        config: {
          visionOutputEnabled,
          generationOutputEnabled
        }
      });
      toast(`Queued ${data.count} products for generation.`, { variant: 'success' });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to queue jobs.', { variant: 'error' });
    }
  };

  const handleSave = async (): Promise<void> => {
    try {
      await updateConfig({
        imageAnalysisModel,
        visionInputPrompt,
        visionOutputPrompt,
        visionOutputEnabled,
        descriptionGenerationModel,
        generationInputPrompt,
        generationOutputPrompt,
        generationOutputEnabled,
        testProductId,
      });
      toast('Settings saved successfully.', { variant: 'success' });
    } catch (error) {
      logClientError(error, { context: { source: 'AiDescriptionSettings', action: 'handleSave' } });
      toast('Failed to save settings.', { variant: 'error' });
    }
  };

  const copyResult = (text?: string): void => {
    if (!text) return;
    void navigator.clipboard.writeText(text);
    toast('Result copied to clipboard.');
  };

  const clearTestResults = (): void => {
    setTestResult(null);
    toast('Test results cleared.');
  };

  if (configLoading) return <div className="text-sm text-gray-400">Loading settings...</div>;

  const testing = !!activeJobId;

  return (
    <SettingsPageLayout
      title="AI Description Configuration"
      description="Configure multi-step generation flow for product descriptions."
      onSave={handleSave}
      isSaving={false}
      actions={
        <>
          <Input
            placeholder="Product ID or SKU"
            value={testProductId}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTestProductId(e.target.value)}
            className="w-[180px] bg-gray-900 border text-white h-9 text-sm"
          />
          <Button variant="secondary" onClick={() => void handleTest()} disabled={testing || enqueuing} className="gap-2 h-9">
            <PlayIcon className={`size-3.5 ${testing ? 'animate-pulse' : ''}`} />
            {testing ? 'Testing...' : 'Test on Product'}
          </Button>

          {testResult && (
            <Button variant="ghost" onClick={clearTestResults} className="gap-2 h-9 text-red-400 hover:text-red-300">
              <XCircle className="size-3.5" />
              Clear Results
            </Button>
          )}

          <Button variant="outline" onClick={() => void handleQueueAll()} disabled={bulkQueuing} className="gap-2 h-9 text-purple-400 border-purple-900/50 hover:bg-purple-950">
            <RefreshCcw className={`size-3.5 ${bulkQueuing ? 'animate-spin' : ''}`} />
            {bulkQueuing ? 'Queuing...' : 'Queue for All'}
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