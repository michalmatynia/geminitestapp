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

function OrganizationRegistryFields(props: {
  orgDraft: Partial<FilemakerOrganization>;
  setOrgDraft: (value: React.SetStateAction<Partial<FilemakerOrganization>>) => void;
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

function JobBoardCompanyFields(props: {
  orgDraft: Partial<FilemakerOrganization>;
  setOrgDraft: (value: React.SetStateAction<Partial<FilemakerOrganization>>) => void;
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
      <FormField label='Job-board website'>
        <Input
          value={props.orgDraft.jobBoardCompanyWebsiteUrl ?? ''}
          onChange={updateField('jobBoardCompanyWebsiteUrl')}
          placeholder='https://example.com'
          aria-label='Job-board company website'
          title='Website extracted from job-board company data'
        />
      </FormField>
      <FormField label='Job-board email'>
        <Input
          value={props.orgDraft.jobBoardCompanyEmail ?? ''}
          onChange={updateField('jobBoardCompanyEmail')}
          placeholder='contact@example.com'
          aria-label='Job-board company email'
          title='Email extracted from job-board company data'
        />
      </FormField>
      <FormField label='Job-board phone'>
        <Input
          value={props.orgDraft.jobBoardCompanyPhone ?? ''}
          onChange={updateField('jobBoardCompanyPhone')}
          placeholder='+48 ...'
          aria-label='Job-board company phone'
          title='Phone extracted from job-board company data'
        />
      </FormField>
      <FormField label='Job-board industry'>
        <Input
          value={props.orgDraft.jobBoardCompanyIndustry ?? ''}
          onChange={updateField('jobBoardCompanyIndustry')}
          placeholder='Industry / sector'
          aria-label='Job-board company industry'
          title='Industry extracted from job-board company data'
        />
      </FormField>
      <FormField label='Job-board company size'>
        <Input
          value={props.orgDraft.jobBoardCompanySize ?? ''}
          onChange={updateField('jobBoardCompanySize')}
          placeholder='e.g. 201-500'
          aria-label='Job-board company size'
          title='Company size extracted from job-board company data'
        />
      </FormField>
      <FormField label='Job-board logo URL'>
        <Input
          value={props.orgDraft.jobBoardCompanyLogoUrl ?? ''}
          onChange={updateField('jobBoardCompanyLogoUrl')}
          placeholder='https://...'
          aria-label='Job-board company logo URL'
          title='Logo URL extracted from job-board company data'
        />
      </FormField>
      <FormField label='Job-board raw address'>
        <Input
          value={props.orgDraft.jobBoardCompanyAddress ?? ''}
          onChange={updateField('jobBoardCompanyAddress')}
          placeholder='Raw company address from job board'
          aria-label='Job-board raw company address'
          title='Raw company address extracted from job-board data'
        />
      </FormField>
      <FormField label='Job-board region'>
        <Input
          value={props.orgDraft.jobBoardCompanyRegion ?? ''}
          onChange={updateField('jobBoardCompanyRegion')}
          placeholder='Region / voivodeship'
          aria-label='Job-board company region'
          title='Region extracted from job-board company data'
        />
      </FormField>
      <FormField label='Job-board profile URL' className='md:col-span-2'>
        <Input
          value={props.orgDraft.jobBoardCompanyProfileUrl ?? ''}
          onChange={updateField('jobBoardCompanyProfileUrl')}
          placeholder='https://www.pracuj.pl/pracodawcy/...'
          aria-label='Job-board company profile URL'
          title='Job-board company profile URL'
        />
      </FormField>
      <FormField label='Job-board profile scraped at'>
        <Input
          value={props.orgDraft.jobBoardCompanyProfileScrapedAt ?? ''}
          onChange={updateField('jobBoardCompanyProfileScrapedAt')}
          placeholder='2026-04-29T12:00:00.000Z'
          aria-label='Job-board company profile scraped at'
          title='When the job-board company profile was last scraped'
        />
      </FormField>
      <FormField label='Scrape source portal'>
        <Input
          value={props.orgDraft.jobBoardSourceSite ?? ''}
          onChange={updateField('jobBoardSourceSite')}
          placeholder='pracuj.pl'
          aria-label='Job-board scrape source portal'
          title='Portal where this organisation was scraped from'
        />
      </FormField>
      <FormField label='Scrape source label'>
        <Input
          value={props.orgDraft.jobBoardSourceLabel ?? ''}
          onChange={updateField('jobBoardSourceLabel')}
          placeholder='Pracuj.pl'
          aria-label='Job-board scrape source label'
          title='Human-readable scrape source label'
        />
      </FormField>
      <FormField label='Scrape source URL' className='md:col-span-2'>
        <Input
          value={props.orgDraft.jobBoardSourceUrl ?? ''}
          onChange={updateField('jobBoardSourceUrl')}
          placeholder='https://...'
          aria-label='Job-board scrape source URL'
          title='Original job-board URL used to create or update this organisation'
        />
      </FormField>
      <FormField label='Organisation scraped at'>
        <Input
          value={props.orgDraft.jobBoardScrapedAt ?? ''}
          onChange={updateField('jobBoardScrapedAt')}
          placeholder='2026-04-29T12:00:00.000Z'
          aria-label='Organisation scraped at'
          title='When this organisation was last updated by job-board scraping'
        />
      </FormField>
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
    </>
  );
}

function OrganizationLegacyProfileFields(props: {
  orgDraft: Partial<FilemakerOrganization>;
  setOrgDraft: (value: React.SetStateAction<Partial<FilemakerOrganization>>) => void;
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
