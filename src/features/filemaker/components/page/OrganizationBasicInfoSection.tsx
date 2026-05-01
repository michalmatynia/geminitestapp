'use client';

import React from 'react';

import { FormSection, FormField } from '@/shared/ui/forms-and-actions.public';
import { Input, Textarea } from '@/shared/ui/primitives.public';
import { UI_GRID_RELAXED_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';

import {
  useAdminFilemakerOrganizationEditPageActionsContext,
  useAdminFilemakerOrganizationEditPageStateContext,
} from '../../context/AdminFilemakerOrganizationEditPageContext';

import type { FilemakerOrganization } from '../../types';
import { FilemakerLinkedEmailsField } from '../shared/FilemakerLinkedEmailsField';
import {
  JOB_BOARD_COMPANY_INPUT_FIELDS,
  type OrganizationInputFieldConfig,
} from './OrganizationBasicInfoSection.jobBoardFields';

type OrganizationDraftSetter = (
  value: React.SetStateAction<Partial<FilemakerOrganization>>
) => void;
type OrganizationFieldUpdater = (
  field: keyof FilemakerOrganization
) => (event: React.ChangeEvent<HTMLInputElement>) => void;

function OrganizationRegistryFields(props: {
  orgDraft: Partial<FilemakerOrganization>;
  setOrgDraft: OrganizationDraftSetter;
}): React.JSX.Element {
  return (
    <>
      <FormField label='NIP / Tax ID'>
        <Input
          value={props.orgDraft.taxId ?? ''}
          onChange={(e) =>
            props.setOrgDraft((prev: Partial<FilemakerOrganization>) => ({
              ...prev,
              taxId: e.target.value,
            }))
          }
          placeholder='Tax identification number'
          aria-label='Tax identification number'
          title='Tax identification number'
        />
      </FormField>
      <FormField label='KRS'>
        <Input
          value={props.orgDraft.krs ?? ''}
          onChange={(e) =>
            props.setOrgDraft((prev: Partial<FilemakerOrganization>) => ({
              ...prev,
              krs: e.target.value,
            }))
          }
          placeholder='Court register number'
          aria-label='Court register number'
          title='Court register number'
        />
      </FormField>
      <FormField label='REGON'>
        <Input
          value={props.orgDraft.regon ?? ''}
          onChange={(e) =>
            props.setOrgDraft((prev: Partial<FilemakerOrganization>) => ({
              ...prev,
              regon: e.target.value,
            }))
          }
          placeholder='REGON number'
          aria-label='REGON number'
          title='REGON number'
        />
      </FormField>
    </>
  );
}

function JobBoardCompanyInputField({
  config,
  orgDraft,
  updateField,
}: {
  config: OrganizationInputFieldConfig;
  orgDraft: Partial<FilemakerOrganization>;
  updateField: OrganizationFieldUpdater;
}): React.JSX.Element {
  return (
    <FormField label={config.label} className={config.className}>
      <Input
        value={String(orgDraft[config.field] ?? '')}
        onChange={updateField(config.field)}
        placeholder={config.placeholder}
        aria-label={config.ariaLabel}
        title={config.title}
      />
    </FormField>
  );
}

function JobBoardCompanyProfileField(props: {
  orgDraft: Partial<FilemakerOrganization>;
  setOrgDraft: OrganizationDraftSetter;
}): React.JSX.Element {
  return (
    <FormField label='Job-board company profile' className='md:col-span-2'>
      <Textarea
        value={props.orgDraft.jobBoardCompanyProfile ?? ''}
        rows={8}
        onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void => {
          props.setOrgDraft((prev: Partial<FilemakerOrganization>) => ({
            ...prev,
            jobBoardCompanyProfile: event.target.value,
          }));
        }}
        placeholder='Full scraped company profile and facts.'
        aria-label='Job-board company profile'
        title='Full scraped company profile and facts'
      />
    </FormField>
  );
}

function JobBoardCompanyFields(props: {
  orgDraft: Partial<FilemakerOrganization>;
  setOrgDraft: OrganizationDraftSetter;
}): React.JSX.Element {
  const updateField =
    (field: keyof FilemakerOrganization) =>
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      props.setOrgDraft((prev: Partial<FilemakerOrganization>) => ({
        ...prev,
        [field]: event.target.value,
      }));
    };

  return (
    <>
      {JOB_BOARD_COMPANY_INPUT_FIELDS.map((config) => (
        <JobBoardCompanyInputField
          key={String(config.field)}
          config={config}
          orgDraft={props.orgDraft}
          updateField={updateField}
        />
      ))}
      <JobBoardCompanyProfileField
        orgDraft={props.orgDraft}
        setOrgDraft={props.setOrgDraft}
      />
    </>
  );
}

function OrganizationLegacyProfileFields(props: {
  orgDraft: Partial<FilemakerOrganization>;
  setOrgDraft: OrganizationDraftSetter;
}): React.JSX.Element {
  return (
    <>
      <FormField label='Cooperation Status'>
        <Input
          value={props.orgDraft.cooperationStatus ?? ''}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            props.setOrgDraft((prev: Partial<FilemakerOrganization>) => ({
              ...prev,
              cooperationStatus: event.target.value,
            }));
          }}
          placeholder='e.g. Active'
          aria-label='Cooperation status'
          title='Cooperation status'
        />
      </FormField>
      <FormField label='Established Date'>
        <Input
          type='date'
          value={props.orgDraft.establishedDate ?? ''}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            props.setOrgDraft((prev: Partial<FilemakerOrganization>) => ({
              ...prev,
              establishedDate: event.target.value,
            }));
          }}
          aria-label='Established date'
          title='Established date'
        />
      </FormField>
    </>
  );
}

export function OrganizationBasicInfoSection(): React.JSX.Element {
  const { emails, orgDraft } = useAdminFilemakerOrganizationEditPageStateContext();
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
            aria-label='Organization name'
            title='Organization name'
          />
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
        <OrganizationRegistryFields orgDraft={orgDraft} setOrgDraft={setOrgDraft} />
        <OrganizationLegacyProfileFields orgDraft={orgDraft} setOrgDraft={setOrgDraft} />
        <JobBoardCompanyFields orgDraft={orgDraft} setOrgDraft={setOrgDraft} />
        <FilemakerLinkedEmailsField emails={emails} className='md:col-span-2' />
      </div>
    </FormSection>
  );
}
