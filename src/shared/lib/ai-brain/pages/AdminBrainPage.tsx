'use client';

import { Activity, Brain, KeyRound, Radar, Sparkles } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo } from 'react';


import { BrainSettingsHeader } from '@/shared/lib/ai-brain/components/BrainSettingsHeader';
import { BrainStateOverview } from '@/shared/lib/ai-brain/components/BrainStateOverview';
import { MetricsTab } from '@/shared/lib/ai-brain/components/MetricsTab';
import { OperationsTab } from '@/shared/lib/ai-brain/components/OperationsTab';
import { ProvidersTab } from '@/shared/lib/ai-brain/components/ProvidersTab';
import { ReportsTab } from '@/shared/lib/ai-brain/components/ReportsTab';
import { RoutingTab } from '@/shared/lib/ai-brain/components/RoutingTab';
import { BrainProvider, useBrain } from '@/shared/lib/ai-brain/context/BrainContext';
import {
  AI_BRAIN_CONTEXT_ROOT_IDS,
  buildAiBrainWorkspaceContextBundle,
} from '@/shared/lib/ai-brain/context-registry/workspace';
import {
  ContextRegistryPageProvider,
  useRegisterContextRegistryPageSource,
} from '@/shared/lib/ai-context-registry/page-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui';

type BrainTab = 'operations' | 'routing' | 'providers' | 'reports' | 'metrics';

const BRAIN_TABS: BrainTab[] = ['operations', 'routing', 'providers', 'reports', 'metrics'];

const isBrainTab = (value: string | null | undefined): value is BrainTab =>
  Boolean(value && BRAIN_TABS.includes(value as BrainTab));

function BrainContextRegistrySource(): React.JSX.Element {
  const {
    activeTab,
    analyticsPromptSystem,
    analyticsScheduleEnabled,
    analyticsScheduleMinutes,
    analyticsSummaryQuery,
    effectiveAssignments,
    effectiveCapabilityAssignments,
    insightsQuery,
    liveOllamaModels,
    logMetricsQuery,
    logsAutoOnError,
    logsPromptSystem,
    logsScheduleEnabled,
    logsScheduleMinutes,
    modelQuickPicks,
    agentQuickPicks,
    operationsOverviewQuery,
    operationsRange,
    overridesEnabled,
    runtimeAnalyticsLiveEnabled,
    runtimeAnalyticsPromptSystem,
    runtimeAnalyticsQuery,
    runtimeAnalyticsScheduleEnabled,
    runtimeAnalyticsScheduleMinutes,
    saving,
    settings,
  } = useBrain();

  const registrySource = useMemo(
    () => ({
      label: 'AI Brain workspace state',
      resolved: buildAiBrainWorkspaceContextBundle({
        activeTab,
        operationsRange,
        saving,
        analyticsScheduleEnabled,
        analyticsScheduleMinutes,
        runtimeAnalyticsScheduleEnabled,
        runtimeAnalyticsScheduleMinutes,
        logsScheduleEnabled,
        logsScheduleMinutes,
        logsAutoOnError,
        analyticsPromptSystem,
        runtimeAnalyticsPromptSystem,
        logsPromptSystem,
        runtimeAnalyticsLiveEnabled,
        liveOllamaModels,
        modelQuickPickCount: modelQuickPicks.length,
        agentQuickPickCount: agentQuickPicks.length,
        overridesEnabled,
        featureOverrides: settings.assignments,
        capabilityOverrides: settings.capabilities,
        effectiveAssignments,
        effectiveCapabilityAssignments,
        analyticsSummary: analyticsSummaryQuery.data,
        logMetrics: logMetricsQuery.data,
        insights: insightsQuery.data,
        runtimeAnalytics: runtimeAnalyticsQuery.data,
        operationsOverview: operationsOverviewQuery.data,
      }),
    }),
    [
      activeTab,
      agentQuickPicks.length,
      analyticsPromptSystem,
      analyticsScheduleEnabled,
      analyticsScheduleMinutes,
      analyticsSummaryQuery.data,
      effectiveAssignments,
      effectiveCapabilityAssignments,
      insightsQuery.data,
      liveOllamaModels,
      logMetricsQuery.data,
      logsAutoOnError,
      logsPromptSystem,
      logsScheduleEnabled,
      logsScheduleMinutes,
      modelQuickPicks.length,
      operationsOverviewQuery.data,
      operationsRange,
      overridesEnabled,
      runtimeAnalyticsLiveEnabled,
      runtimeAnalyticsPromptSystem,
      runtimeAnalyticsQuery.data,
      runtimeAnalyticsScheduleEnabled,
      runtimeAnalyticsScheduleMinutes,
      saving,
      settings.assignments,
      settings.capabilities,
    ]
  );

  useRegisterContextRegistryPageSource('brain-workspace-state', registrySource);

  return <></>;
}

function AdminBrainPageContent(): React.JSX.Element {
  const { activeTab, setActiveTab } = useBrain();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const resolvedTab: BrainTab = (() => {
    const tabParam = searchParams.get('tab');
    if (isBrainTab(tabParam)) return tabParam;
    return pathname === '/admin/brain' ? 'operations' : 'routing';
  })();

  useEffect(() => {
    if (activeTab === resolvedTab) return;
    setActiveTab(resolvedTab);
  }, [activeTab, resolvedTab, setActiveTab]);

  const handleTabChange = useCallback(
    (value: string): void => {
      if (!isBrainTab(value)) return;
      setActiveTab(value);
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.set('tab', value);
      const query = nextParams.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams, setActiveTab]
  );

  return (
    <div className='space-y-4'>
      <BrainContextRegistrySource />
      <BrainSettingsHeader />
      <BrainStateOverview />

      <Tabs value={activeTab} onValueChange={handleTabChange} className='space-y-4'>
        <TabsList
          className='grid h-auto w-full grid-cols-2 gap-1 p-1 md:grid-cols-5'
          aria-label='AI brain admin tabs'
        >
          <TabsTrigger value='operations' className='gap-2 text-xs md:text-sm'>
            <Activity className='size-4' />
            Operations
          </TabsTrigger>
          <TabsTrigger value='routing' className='gap-2 text-xs md:text-sm'>
            <Brain className='size-4' />
            Routing
          </TabsTrigger>
          <TabsTrigger value='providers' className='gap-2 text-xs md:text-sm'>
            <KeyRound className='size-4' />
            Providers
          </TabsTrigger>
          <TabsTrigger value='reports' className='gap-2 text-xs md:text-sm'>
            <Sparkles className='size-4' />
            Reports
          </TabsTrigger>
          <TabsTrigger value='metrics' className='gap-2 text-xs md:text-sm'>
            <Radar className='size-4' />
            Metrics
          </TabsTrigger>
        </TabsList>

        <TabsContent value='operations' className='space-y-4'>
          <OperationsTab />
        </TabsContent>

        <TabsContent value='routing' className='space-y-4'>
          <RoutingTab />
        </TabsContent>

        <TabsContent value='providers' className='space-y-4'>
          <ProvidersTab />
        </TabsContent>

        <TabsContent value='reports' className='space-y-4'>
          <ReportsTab />
        </TabsContent>

        <TabsContent value='metrics' className='space-y-4'>
          <MetricsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function AdminBrainPage(): React.JSX.Element {
  return (
    <ContextRegistryPageProvider
      pageId='admin:brain'
      title='AI Brain'
      rootNodeIds={[...AI_BRAIN_CONTEXT_ROOT_IDS]}
    >
      <BrainProvider>
        <AdminBrainPageContent />
      </BrainProvider>
    </ContextRegistryPageProvider>
  );
}
