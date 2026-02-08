'use client';

import { KeyRound } from 'lucide-react';

import { Button, Input, Label, SectionPanel } from '@/shared/ui';

import { useBrain } from '../context/BrainContext';
import { type AiBrainProviderCatalog } from '../settings';
import { CatalogEditorField } from './CatalogEditorField';

export function ProvidersTab(): React.JSX.Element {
  const {
    openaiApiKey,
    setOpenaiApiKey,
    anthropicApiKey,
    setAnthropicApiKey,
    geminiApiKey,
    setGeminiApiKey,
    providerCatalog,
    setProviderCatalog,
    ollamaModelsQuery,
    liveOllamaModels,
    syncPlaywrightPersonas,
  } = useBrain();

  return (
    <div className='space-y-4'>
      <SectionPanel variant='subtle'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <div className='text-xs uppercase tracking-wide text-cyan-300'>Live Ollama discovery</div>
            <div className='mt-1 text-xs text-gray-300'>
              {ollamaModelsQuery.isLoading
                ? 'Loading live models from Ollama...'
                : ollamaModelsQuery.error
                  ? ((ollamaModelsQuery.error).message || 'Failed to load Ollama models.')
                  : `${liveOllamaModels.length} live model(s) available for report routing.`}
            </div>
            {ollamaModelsQuery.data?.warning?.message ? (
              <div className='mt-1 text-[11px] text-amber-300'>
                {ollamaModelsQuery.data.warning.message}
              </div>
            ) : null}
          </div>
          <div className='flex gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => void ollamaModelsQuery.refetch()}
              disabled={ollamaModelsQuery.isFetching}
            >
              {ollamaModelsQuery.isFetching ? 'Refreshing...' : 'Refresh Ollama'}
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={() =>
                setProviderCatalog((prev: AiBrainProviderCatalog) => ({
                  ...prev,
                  ollamaModels: Array.from(new Set([...prev.ollamaModels, ...liveOllamaModels])),
                }))
              }
              disabled={liveOllamaModels.length === 0}
            >
              Add Live to Catalog
            </Button>
          </div>
        </div>
      </SectionPanel>

      <SectionPanel>
        <div className='flex items-center gap-2 text-sm font-semibold text-white'>
          <KeyRound className='size-4 text-emerald-300' />
          Cloud API keys
        </div>
        <div className='mt-3 grid gap-3 md:grid-cols-3'>
          <div className='space-y-1'>
            <Label className='text-xs text-gray-400'>OpenAI API key</Label>
            <Input
              type='password'
              value={openaiApiKey}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOpenaiApiKey(e.target.value)}
              placeholder='sk-...'
            />
          </div>
          <div className='space-y-1'>
            <Label className='text-xs text-gray-400'>Anthropic API key</Label>
            <Input
              type='password'
              value={anthropicApiKey}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAnthropicApiKey(e.target.value)}
              placeholder='sk-ant-...'
            />
          </div>
          <div className='space-y-1'>
            <Label className='text-xs text-gray-400'>Gemini API key</Label>
            <Input
              type='password'
              value={geminiApiKey}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGeminiApiKey(e.target.value)}
              placeholder='AIza...'
            />
          </div>
        </div>
      </SectionPanel>

      <SectionPanel>
        <div className='flex items-center justify-between gap-3'>
          <div>
            <div className='text-sm font-semibold text-white'>Model and Agent Catalog</div>
            <div className='text-xs text-gray-400'>
              Define pools for agent models, deepthinking agents, paid models, Ollama, and Playwright personas.
            </div>
          </div>
          <Button variant='outline' size='sm' onClick={syncPlaywrightPersonas}>
            Sync Playwright Personas
          </Button>
        </div>

        <div className='mt-4 grid gap-4 lg:grid-cols-2'>
          <CatalogEditorField
            label='Core model presets'
            description='General model defaults used across the Brain editors.'
            value={providerCatalog.modelPresets}
            onChange={(next: string[]) => setProviderCatalog((prev: AiBrainProviderCatalog) => ({ ...prev, modelPresets: next }))}
            placeholder='gpt-4o-mini&#10;claude-3-5-sonnet-20241022'
          />
          <CatalogEditorField
            label='Paid models'
            description='Premium models you want to route explicitly.'
            value={providerCatalog.paidModels}
            onChange={(next: string[]) => setProviderCatalog((prev: AiBrainProviderCatalog) => ({ ...prev, paidModels: next }))}
            placeholder='gpt-4.1&#10;o1-mini'
          />
          <CatalogEditorField
            label='Ollama models'
            description='Local/Ollama model ids (e.g. llama3.1, mistral).'
            value={providerCatalog.ollamaModels}
            onChange={(next: string[]) => setProviderCatalog((prev: AiBrainProviderCatalog) => ({ ...prev, ollamaModels: next }))}
            placeholder='llama3.1&#10;mistral'
          />
          <CatalogEditorField
            label='Agent models'
            description='General purpose agent ids.'
            value={providerCatalog.agentModels}
            onChange={(next: string[]) => setProviderCatalog((prev: AiBrainProviderCatalog) => ({ ...prev, agentModels: next }))}
            placeholder='agent_sales_ops&#10;agent_growth'
          />
          <CatalogEditorField
            label='Deepthinking agents'
            description='Agent ids specialized for deeper multi-step reasoning.'
            value={providerCatalog.deepthinkingAgents}
            onChange={(next: string[]) => setProviderCatalog((prev: AiBrainProviderCatalog) => ({ ...prev, deepthinkingAgents: next }))}
            placeholder='deepthink_incident&#10;deepthink_forecast'
          />
          <CatalogEditorField
            label='Playwright personas'
            description='Persona ids for tasks that require browser automation.'
            value={providerCatalog.playwrightPersonas}
            onChange={(next: string[]) => setProviderCatalog((prev: AiBrainProviderCatalog) => ({ ...prev, playwrightPersonas: next }))}
            placeholder='persona_checkout_bot&#10;persona_scraper'
          />
        </div>
      </SectionPanel>
    </div>
  );
}
