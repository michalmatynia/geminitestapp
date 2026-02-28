'use client';

import { Brain, KeyRound, Radar, Sparkles } from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui';

import { BrainSettingsHeader } from '@/shared/lib/ai-brain/components/BrainSettingsHeader';
import { BrainStateOverview } from '@/shared/lib/ai-brain/components/BrainStateOverview';
import { MetricsTab } from '@/shared/lib/ai-brain/components/MetricsTab';
import { ProvidersTab } from '@/shared/lib/ai-brain/components/ProvidersTab';
import { ReportsTab } from '@/shared/lib/ai-brain/components/ReportsTab';
import { RoutingTab } from '@/shared/lib/ai-brain/components/RoutingTab';
import { BrainProvider, useBrain } from '@/shared/lib/ai-brain/context/BrainContext';

type BrainTab = 'routing' | 'providers' | 'reports' | 'metrics';

function AdminBrainPageContent(): React.JSX.Element {
  const { activeTab, setActiveTab } = useBrain();

  return (
    <div className='space-y-4'>
      <BrainSettingsHeader />
      <BrainStateOverview />

      <Tabs
        value={activeTab}
        onValueChange={(value: string) => setActiveTab(value as BrainTab)}
        className='space-y-4'
      >
        <TabsList className='grid h-auto w-full grid-cols-2 gap-1 p-1 md:grid-cols-4'>
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
    <BrainProvider>
      <AdminBrainPageContent />
    </BrainProvider>
  );
}
