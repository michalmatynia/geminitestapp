'use client';

import React from 'react';
import { DocumentWysiwygEditor } from '@/features/document-editor/components/DocumentWysiwygEditor';
import {
  Badge,
  Button,
  Checkbox,
  FormField,
  FormSection,
  Input,
  MultiSelect,
  SelectSimple,
  Textarea,
} from '@/shared/ui';
import type {
  FilemakerEmailCampaign,
  FilemakerEmailCampaignLifecycleStatus,
} from '../types';
import {
  CAMPAIGN_STATUS_OPTIONS as FILEMAKER_CAMPAIGN_STATUS_OPTIONS,
  EMAIL_STATUS_OPTIONS as FILEMAKER_EMAIL_STATUS_OPTIONS,
} from './AdminFilemakerCampaignEditPage.utils';

export * from './campaign-edit-sections/CampaignInsightsSections';
export * from './campaign-edit-sections/DeliveryGovernanceSection';
export * from './campaign-edit-sections/LaunchSchedulingSection';
export * from './campaign-edit-sections/AudienceSourceSection';

interface CampaignLifecycleSectionProps {
  status: FilemakerEmailCampaignLifecycleStatus;
  setStatus: (val: FilemakerEmailCampaignLifecycleStatus) => void;
  isUpdatePending: boolean;
}

export const CampaignLifecycleSection = ({
  status,
  setStatus,
  isUpdatePending,
}: CampaignLifecycleSectionProps) => (
  <FormSection title='Campaign Lifecycle' className='space-y-4 p-4'>
    <div className='flex items-center justify-between gap-4'>
      <div className='max-w-md space-y-1'>
        <div className='text-sm font-semibold text-white'>Lifecycle Status</div>
        <div className='text-xs text-gray-400'>
          Controls whether the campaign is active, paused, or in draft mode.
        </div>
      </div>
      <SelectSimple
        value={status}
        onChange={(val) => setStatus(val as any)}
        options={FILEMAKER_CAMPAIGN_STATUS_OPTIONS}
        className='w-48'
        disabled={isUpdatePending}
      />
    </div>
  </FormSection>
);

interface CampaignContentSectionProps {
  subjectTemplate: string;
  setSubjectSubjectTemplate: (val: string) => void;
  bodyTemplate: string;
  setBodyTemplate: (val: string) => void;
  previewTextTemplate: string;
  setPreviewTextTemplate: (val: string) => void;
}

export const CampaignContentSection = ({
  subjectTemplate,
  setSubjectSubjectTemplate,
  bodyTemplate,
  setBodyTemplate,
  previewTextTemplate,
  setPreviewTextTemplate,
}: CampaignContentSectionProps) => (
  <FormSection title='Campaign Content' className='space-y-4 p-4'>
    <FormField label='Subject Line Template'>
      <Input
        placeholder='e.g. Hello {{NAME}}'
        value={subjectTemplate}
        onChange={(e) => setSubjectSubjectTemplate(e.target.value)}
      />
    </FormField>
    <FormField label='Preview Text (Snippet)'>
      <Input
        placeholder='Short summary visible in inbox list...'
        value={previewTextTemplate}
        onChange={(e) => setPreviewTextTemplate(e.target.value)}
      />
    </FormField>
    <div className='space-y-2'>
      <label className='text-xs font-bold uppercase tracking-wider text-slate-500'>
        Email Body (HTML)
      </label>
      <div className='rounded-md border border-border/60 bg-white'>
        <DocumentWysiwygEditor
          content={bodyTemplate}
          onChange={setBodyTemplate}
          minHeight='400px'
        />
      </div>
    </div>
  </FormSection>
);

interface EmailSettingsSectionProps {
  fromName: string;
  setFromName: (val: string) => void;
  replyTo: string;
  setReplyTo: (val: string) => void;
  trackOpens: boolean;
  setTrackOpens: (val: boolean) => void;
  trackClicks: boolean;
  setTrackClicks: (val: boolean) => void;
}

export const EmailSettingsSection = ({
  fromName,
  setFromName,
  replyTo,
  setReplyTo,
  trackOpens,
  setTrackOpens,
  trackClicks,
  setTrackClicks,
}: EmailSettingsSectionProps) => (
  <FormSection title='Email Headers & Tracking' className='space-y-4 p-4'>
    <div className='grid gap-4 md:grid-cols-2'>
      <FormField label='Sender Name (From)'>
        <Input
          placeholder='e.g. StuqiQ Team'
          value={fromName}
          onChange={(e) => setFromName(e.target.value)}
        />
      </FormField>
      <FormField label='Reply-To Address'>
        <Input
          placeholder='e.g. support@stuqiq.com'
          value={replyTo}
          onChange={(e) => setReplyTo(e.target.value)}
        />
      </FormField>
    </div>
    <div className='flex flex-wrap gap-6'>
      <div className='flex items-center gap-2'>
        <Checkbox checked={trackOpens} onCheckedChange={setTrackOpens} id='campaign-track-opens' />
        <label htmlFor='campaign-track-opens' className='text-sm text-gray-300'>
          Track Email Opens
        </label>
      </div>
      <div className='flex items-center gap-2'>
        <Checkbox checked={trackClicks} onCheckedChange={setTrackClicks} id='campaign-track-clicks' />
        <label htmlFor='campaign-track-clicks' className='text-sm text-gray-300'>
          Track Link Clicks
        </label>
      </div>
    </div>
  </FormSection>
);
