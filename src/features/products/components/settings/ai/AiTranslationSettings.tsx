'use client';

import { useState, useEffect, useMemo } from 'react';

import { useChatbotModels } from '@/features/ai/chatbot/hooks/useChatbotQueries';
import { logClientError } from '@/features/observability';
import { useSettingsMap, useUpdateSetting } from '@/shared/hooks/use-settings';
import { Button, Label, UnifiedSelect, useToast, SectionHeader, SectionPanel } from '@/shared/ui';

const STATIC_TRANSLATION_MODELS = [
  { value: 'gpt-4o', label: 'GPT-4o', description: 'OpenAI' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', description: 'OpenAI' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', description: 'OpenAI' },
];

export function AiTranslationSettings(): React.JSX.Element {
  const { toast } = useToast();
  const { data: settingsMap, isLoading: settingsLoading } = useSettingsMap({ scope: 'all' });
  const { data: chatbotModels = [] } = useChatbotModels();
  const { mutateAsync: updateSetting, isPending: saving } = useUpdateSetting();

  const [translationModel, setTranslationModel] = useState('');

  const ollamaModels = useMemo(() => 
    chatbotModels.map((name: string) => ({ value: name, label: name, description: 'Ollama' })),
    [chatbotModels]
  );

  useEffect(() => {
    if (settingsMap) {
      setTranslationModel(settingsMap.get('ai_translation_model') || 'gpt-4o');
    }
  }, [settingsMap]);

  const handleSave = async (): Promise<void> => {
    try {
      await updateSetting({
        key: 'ai_translation_model',
        value: translationModel,
      });
      toast('Settings saved successfully.', { variant: 'success' });
    } catch (error) {
      logClientError(error, { context: { source: 'AiTranslationSettings', action: 'handleSave' } });
      toast('Failed to save settings.', { variant: 'error' });
    }
  };

  if (settingsLoading) return <div className="text-sm text-gray-400">Loading settings...</div>;

  return (
    <div className="space-y-8">
      <SectionHeader
        title="AI Translation Configuration"
        description="Configure the AI model used for translating product names and descriptions."
        size="md"
      />

      <SectionPanel variant="subtle" className="space-y-6">
        <div className="max-w-md space-y-4">
          <div className="space-y-2">
            <Label>Translation Model</Label>
            <UnifiedSelect
              value={translationModel}
              onValueChange={setTranslationModel}
              options={[...STATIC_TRANSLATION_MODELS, ...ollamaModels]}
            />
            <p className="text-xs text-gray-500 mt-2">
              This model will be used to translate product names and descriptions into
              languages associated with the product&apos;s catalogs.
            </p>
          </div>

          <SectionPanel variant="subtle-compact" className="border border-border">
            <h4 className="text-sm font-medium text-white mb-2">How It Works</h4>
            <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside">
              <li>
                Translation requests can be triggered from the Product Edit/Create panel
              </li>
              <li>
                If the product belongs to catalogs, it translates to those catalog languages
              </li>
              <li>
                If no catalogs are assigned, it translates to all available languages
              </li>
              <li>
                Translations are processed as AI jobs and can be monitored on the Jobs page
              </li>
            </ul>
          </SectionPanel>
        </div>
      </SectionPanel>

      <div className="flex justify-end">
        <Button
          onClick={() => void handleSave()}
          disabled={saving}
          className="bg-white text-black hover:bg-gray-200"
        >
          {saving ? 'Saving...' : 'Save Configuration'}
        </Button>
      </div>
    </div>
  );
}