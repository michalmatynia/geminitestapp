'use client';

import React from 'react';

import { FormSection, FormField } from '@/shared/ui/forms-and-actions.public';
import { Input } from '@/shared/ui/primitives.public';
import { UI_GRID_RELAXED_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';

import {
  useAdminFilemakerOrganizationEditPageActionsContext,
  useAdminFilemakerOrganizationEditPageStateContext,
} from '../../context/AdminFilemakerOrganizationEditPageContext';

import type { FilemakerOrganization } from '../../types';

export function OrganizationBasicInfoSection(): React.JSX.Element {
  const { orgDraft } = useAdminFilemakerOrganizationEditPageStateContext();
  const { setOrgDraft } = useAdminFilemakerOrganizationEditPageActionsContext();

  return (
    <FormSection title='Basic Information' className='space-y-4 p-4'>
      <div className={`${UI_GRID_RELAXED_CLASSNAME} md:grid-cols-2`}>
        <FormField label='Organization Name'>
          <Input
            value={orgDraft.name ?? ''}
            onChange={(e) =>
              setOrgDraft((prev: Partial<FilemakerOrganization>) => ({
                ...prev,
                name: e.target.value,
              }))
            }
            placeholder='e.g. Acme Corp'
           aria-label='e.g. Acme Corp' title='e.g. Acme Corp'/>
        </FormField>
        <FormField label='Trading Name / Title'>
          <Input
            value={orgDraft.tradingName ?? ''}
            onChange={(e) =>
              setOrgDraft((prev: Partial<FilemakerOrganization>) => ({
                ...prev,
                tradingName: e.target.value,
              }))
            }
            placeholder='e.g. Acme Widgets'
            aria-label='Trading name or title'
            title='Trading name or title used in campaign audience filters'
          />
        </FormField>
      </div>
    </FormSection>
  );
}
