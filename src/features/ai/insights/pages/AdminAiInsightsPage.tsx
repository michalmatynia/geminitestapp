'use client';

import React from 'react';

import { Button, SectionHeader } from '@/shared/ui';

import { AnalyticsInsightsPanel } from '../components/AnalyticsInsightsPanel';
import { LogInsightsPanel } from '../components/LogInsightsPanel';
import { InsightsProvider } from '../context/InsightsContext';

function AdminAiInsightsPageContent(): React.JSX.Element {
  return (
    <div className='container mx-auto py-10'>
      <SectionHeader
        title='AI Insights'
        description='Aggregated AI summaries for analytics and system logs.'
        className='mb-6'
        actions={(
          <Button variant='outline' size='sm' onClick={() => window.location.assign('/admin/settings/brain')}>
            Settings
          </Button>
        )}
      />

      <div className='grid gap-6 lg:grid-cols-2'>
        <AnalyticsInsightsPanel />
        <LogInsightsPanel />
      </div>
    </div>
  );
}

export default function AdminAiInsightsPage(): React.JSX.Element {
  return (
    <InsightsProvider>
      <AdminAiInsightsPageContent />
    </InsightsProvider>
  );
}