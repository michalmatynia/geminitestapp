'use client';

import { ChevronLeftIcon, SaveIcon } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState, type ChangeEvent } from 'react';

import { logClientError } from '@/features/observability';
import { useSettings, useUpdateSetting, useUpdateSettingsBulk, type SystemSetting } from '@/shared/hooks/use-settings';
import {
  Button,
  Input,
  Label,
  useToast,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Switch,
  UnifiedSelect,
} from '@/shared/ui';



export default function AiApiSettingsPage() {



  const { toast } = useToast();



  const { data: settings, isLoading } = useSettings();



  const updateSetting = useUpdateSetting();
  const updateSettingsBulk = useUpdateSettingsBulk();







  const [saving, setSaving] = useState(false);



  const [openaiApiKey, setOpenaiApiKey] = useState('');



  const [anthropicApiKey, setAnthropicApiKey] = useState('');



  const [geminiApiKey, setGeminiApiKey] = useState('');

  const [analyticsProvider, setAnalyticsProvider] = useState<'model' | 'agent'>('model');
  const [analyticsModel, setAnalyticsModel] = useState('');
  const [analyticsAgentId, setAnalyticsAgentId] = useState('');
  const [analyticsScheduleEnabled, setAnalyticsScheduleEnabled] = useState(true);
  const [analyticsScheduleMinutes, setAnalyticsScheduleMinutes] = useState(30);

  const [logsProvider, setLogsProvider] = useState<'model' | 'agent'>('model');
  const [logsModel, setLogsModel] = useState('');
  const [logsAgentId, setLogsAgentId] = useState('');
  const [logsScheduleEnabled, setLogsScheduleEnabled] = useState(true);
  const [logsScheduleMinutes, setLogsScheduleMinutes] = useState(15);
  const [logsAutoOnError, setLogsAutoOnError] = useState(true);

  const modelPresets = [
    'gpt-4o-mini',
    'gpt-4o',
    'gpt-4.1-mini',
    'gpt-4.1',
    'o1-mini',
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
    'claude-3-opus-20240229',
    'gemini-1.5-pro',
    'gemini-1.5-flash',
  ];







  useEffect(() => {



    if (settings) {



      const settingsMap = new Map(settings.map((item: SystemSetting) => [item.key, item.value]));



      setOpenaiApiKey(settingsMap.get('openai_api_key') || '');



      setAnthropicApiKey(settingsMap.get('anthropic_api_key') || '');



      setGeminiApiKey(settingsMap.get('gemini_api_key') || '');

      setAnalyticsProvider(
        (settingsMap.get('ai_analytics_provider') as 'model' | 'agent') || 'model'
      );
      setAnalyticsModel(settingsMap.get('ai_analytics_model') || '');
      setAnalyticsAgentId(settingsMap.get('ai_analytics_agent_id') || '');
      setAnalyticsScheduleEnabled(
        settingsMap.get('ai_analytics_schedule_enabled') !== 'false'
      );
      setAnalyticsScheduleMinutes(
        Number(settingsMap.get('ai_analytics_schedule_minutes') || 30)
      );

      setLogsProvider(
        (settingsMap.get('ai_logs_provider') as 'model' | 'agent') || 'model'
      );
      setLogsModel(settingsMap.get('ai_logs_model') || '');
      setLogsAgentId(settingsMap.get('ai_logs_agent_id') || '');
      setLogsScheduleEnabled(settingsMap.get('ai_logs_schedule_enabled') !== 'false');
      setLogsScheduleMinutes(
        Number(settingsMap.get('ai_logs_schedule_minutes') || 15)
      );
      setLogsAutoOnError(settingsMap.get('ai_logs_autorun_on_error') !== 'false');



    }



  }, [settings]);







  const handleSave = async (): Promise<void> => {



    setSaving(true);



    try {



      await Promise.all([



        updateSetting.mutateAsync({ key: 'openai_api_key', value: openaiApiKey }),



        updateSetting.mutateAsync({ key: 'anthropic_api_key', value: anthropicApiKey }),



        updateSetting.mutateAsync({ key: 'gemini_api_key', value: geminiApiKey }),



      ]);



      



      toast('API keys saved successfully', { variant: 'success' });



      



    } catch (error: unknown) {



      



      logClientError(error, { context: { source: 'AiApiSettingsPage', action: 'saveSettings' } });



      



      toast('Failed to save settings', { variant: 'error' });



      



    } finally {



      setSaving(false);



    }



  };

  const handleSaveInsights = async (): Promise<void> => {
    try {
      if (analyticsProvider === 'model' && !analyticsModel.trim()) {
        toast('Analytics model is required when provider is Model.', { variant: 'error' });
        return;
      }
      if (analyticsProvider === 'agent' && !analyticsAgentId.trim()) {
        toast('Analytics agent id is required when provider is Agent.', { variant: 'error' });
        return;
      }
      if (logsProvider === 'model' && !logsModel.trim()) {
        toast('Logs model is required when provider is Model.', { variant: 'error' });
        return;
      }
      if (logsProvider === 'agent' && !logsAgentId.trim()) {
        toast('Logs agent id is required when provider is Agent.', { variant: 'error' });
        return;
      }
      if (analyticsScheduleMinutes < 5 || logsScheduleMinutes < 5) {
        toast('Schedule minutes must be at least 5.', { variant: 'error' });
        return;
      }
      await updateSettingsBulk.mutateAsync([
        { key: 'ai_analytics_provider', value: analyticsProvider },
        { key: 'ai_analytics_model', value: analyticsModel },
        { key: 'ai_analytics_agent_id', value: analyticsAgentId },
        { key: 'ai_analytics_schedule_enabled', value: String(analyticsScheduleEnabled) },
        { key: 'ai_analytics_schedule_minutes', value: String(analyticsScheduleMinutes) },
        { key: 'ai_logs_provider', value: logsProvider },
        { key: 'ai_logs_model', value: logsModel },
        { key: 'ai_logs_agent_id', value: logsAgentId },
        { key: 'ai_logs_schedule_enabled', value: String(logsScheduleEnabled) },
        { key: 'ai_logs_schedule_minutes', value: String(logsScheduleMinutes) },
        { key: 'ai_logs_autorun_on_error', value: String(logsAutoOnError) },
      ]);
      toast('AI insights settings saved.', { variant: 'success' });
    } catch (error: unknown) {
      logClientError(error, { context: { source: 'AiApiSettingsPage', action: 'saveInsights' } });
      toast('Failed to save AI insights settings', { variant: 'error' });
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

              {saving ? 'Saving...' : (

                <>

                  <SaveIcon className="mr-2 size-4" />

                  Save Keys

                </>

              )}

            </Button>

          </div>

        </CardContent>

      </Card>

      <Card className="mt-6 bg-gray-950 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white text-xl">AI Insights</CardTitle>
          <CardDescription className="text-gray-400">
            Configure analytics and system log interpretation models and schedules.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white">Analytics Insights</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-gray-200">Provider</Label>
                <UnifiedSelect
                  value={analyticsProvider}
                  onValueChange={(value: string) => setAnalyticsProvider(value as 'model' | 'agent')}
                  options={[
                    { value: 'model', label: 'Model' },
                    { value: 'agent', label: 'Deepthinking agent' },
                  ]}
                  placeholder="Select provider"
                  triggerClassName="bg-gray-900 border-gray-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-200">Model ID</Label>
                <Input
                  placeholder="gpt-4o-mini"
                  value={analyticsModel}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setAnalyticsModel(e.target.value)}
                  list="ai-insights-models"
                  className="bg-gray-900 border-gray-700 text-white"
                />
                <p className="text-[10px] text-gray-500">Used when provider is Model.</p>
                <UnifiedSelect
                  value=""
                  onValueChange={(value: string) => setAnalyticsModel(value)}
                  options={modelPresets.map((model) => ({
                    value: model,
                    label: model,
                  }))}
                  placeholder="Pick a preset"
                  triggerClassName="mt-2 h-7 border-border bg-gray-900/40 text-[11px] text-gray-200"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-200">Agent ID</Label>
                <Input
                  placeholder="agent_..."
                  value={analyticsAgentId}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setAnalyticsAgentId(e.target.value)}
                  className="bg-gray-900 border-gray-700 text-white"
                />
                <p className="text-[10px] text-gray-500">Used when provider is Deepthinking agent.</p>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-200">Schedule (minutes)</Label>
                <Input
                  type="number"
                  min={5}
                  value={analyticsScheduleMinutes}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setAnalyticsScheduleMinutes(Number(e.target.value))}
                  className="bg-gray-900 border-gray-700 text-white"
                />
                <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                  <Switch checked={analyticsScheduleEnabled} onCheckedChange={setAnalyticsScheduleEnabled} />
                  <span>Enable scheduled insights</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white">System Log Insights</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-gray-200">Provider</Label>
                <UnifiedSelect
                  value={logsProvider}
                  onValueChange={(value: string) => setLogsProvider(value as 'model' | 'agent')}
                  options={[
                    { value: 'model', label: 'Model' },
                    { value: 'agent', label: 'Deepthinking agent' },
                  ]}
                  placeholder="Select provider"
                  triggerClassName="bg-gray-900 border-gray-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-200">Model ID</Label>
                <Input
                  placeholder="gpt-4o-mini"
                  value={logsModel}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setLogsModel(e.target.value)}
                  list="ai-insights-models"
                  className="bg-gray-900 border-gray-700 text-white"
                />
                <p className="text-[10px] text-gray-500">Used when provider is Model.</p>
                <UnifiedSelect
                  value=""
                  onValueChange={(value: string) => setLogsModel(value)}
                  options={modelPresets.map((model) => ({
                    value: model,
                    label: model,
                  }))}
                  placeholder="Pick a preset"
                  triggerClassName="mt-2 h-7 border-border bg-gray-900/40 text-[11px] text-gray-200"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-200">Agent ID</Label>
                <Input
                  placeholder="agent_..."
                  value={logsAgentId}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setLogsAgentId(e.target.value)}
                  className="bg-gray-900 border-gray-700 text-white"
                />
                <p className="text-[10px] text-gray-500">Used when provider is Deepthinking agent.</p>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-200">Schedule (minutes)</Label>
                <Input
                  type="number"
                  min={5}
                  value={logsScheduleMinutes}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setLogsScheduleMinutes(Number(e.target.value))}
                  className="bg-gray-900 border-gray-700 text-white"
                />
                <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                  <Switch checked={logsScheduleEnabled} onCheckedChange={setLogsScheduleEnabled} />
                  <span>Enable scheduled insights</span>
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                  <Switch checked={logsAutoOnError} onCheckedChange={setLogsAutoOnError} />
                  <span>Auto-run on new errors</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={() => void handleSaveInsights()}
              disabled={updateSettingsBulk.isPending}
              className="min-w-[160px] border border-white/20 hover:border-white/40"
            >
              {updateSettingsBulk.isPending ? 'Saving...' : 'Save AI Insights'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <datalist id="ai-insights-models">
        {modelPresets.map((model) => (
          <option key={model} value={model} />
        ))}
      </datalist>

    </div>

  );

}
