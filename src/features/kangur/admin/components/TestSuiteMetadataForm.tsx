import React from 'react';

import { FormField, Input, Switch, Textarea } from '@/shared/ui';

import type { TestSuiteFormData } from '../../test-suites';

export function TestSuiteMetadataForm(props: {
  formData: TestSuiteFormData;
  setFormData: React.Dispatch<React.SetStateAction<TestSuiteFormData>>;
}): React.JSX.Element {
  const { formData, setFormData } = props;

  return (
    <div className='space-y-4'>
      <FormField label='Title'>
        <Input
          value={formData.title}
          onChange={(e): void => setFormData((f) => ({ ...f, title: e.target.value }))}
          placeholder='e.g. Kangur Matematyczny 2024 — 3 pkt'
          className='h-9'
        />
      </FormField>

      <FormField label='Description'>
        <Textarea
          value={formData.description}
          onChange={(e): void => setFormData((f) => ({ ...f, description: e.target.value }))}
          placeholder='Optional description of this test suite'
          className='min-h-[80px]'
        />
      </FormField>

      <div className='grid gap-4 sm:grid-cols-3'>
        <FormField label='Year'>
          <Input
            value={formData.year}
            onChange={(e): void => setFormData((f) => ({ ...f, year: e.target.value }))}
            placeholder='e.g. 2024'
            className='h-9'
            maxLength={4}
          />
        </FormField>

        <FormField label='Grade Level'>
          <Input
            value={formData.gradeLevel}
            onChange={(e): void => setFormData((f) => ({ ...f, gradeLevel: e.target.value }))}
            placeholder='e.g. III–IV'
            className='h-9'
          />
        </FormField>

        <FormField label='Category'>
          <Input
            value={formData.category}
            onChange={(e): void => setFormData((f) => ({ ...f, category: e.target.value }))}
            placeholder='e.g. matematyczny, custom'
            className='h-9'
          />
        </FormField>
      </div>

      <div className='flex items-center justify-between rounded-md border border-border/50 bg-card/40 p-3'>
        <div>
          <div className='text-sm font-medium text-white'>Active</div>
          <div className='text-xs text-gray-400'>Disabled suites are hidden from learners.</div>
        </div>
        <Switch
          checked={formData.enabled}
          onCheckedChange={(checked): void => setFormData((f) => ({ ...f, enabled: checked }))}
        />
      </div>

      <div className='rounded-md border border-border/50 bg-card/30 p-3'>
        <div className='text-sm font-medium text-white'>Learner live status</div>
        <div className='mt-1 text-xs text-gray-400'>
          {formData.publicationStatus === 'live'
            ? 'This suite is currently marked live for learner-facing runtime.'
            : 'This suite is still in draft mode for learners. Use the suite library go-live action once the published question set is complete.'}
        </div>
      </div>
    </div>
  );
}
