'use client';

import { BriefcaseBusiness, Globe2, Loader2, MailSearch } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

import { ActionMenu } from '@/shared/ui/ActionMenu';
import { DropdownMenuItem } from '@/shared/ui/dropdown-menu';
import { Button } from '@/shared/ui/primitives.public';

import type { FilemakerOrganization } from '../../types';
import type { OrganizationLeafNodeProps } from './FilemakerOrganizationMasterTreeNode.shared';

function OrganizationJobListingsButton(props: {
  organization: FilemakerOrganization;
}): React.JSX.Element {
  const href = `/admin/filemaker/organizations/${encodeURIComponent(props.organization.id)}/job-listings`;
  return (
    <Link
      href={href}
      className='inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md border border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
      aria-label={`Open job listings for ${props.organization.name}`}
      title={`Open job listings for ${props.organization.name}`}
      onClick={(event: React.MouseEvent<HTMLAnchorElement>): void => event.stopPropagation()}
    >
      <BriefcaseBusiness className='size-3.5' aria-hidden='true' />
    </Link>
  );
}

function OrganizationScrapeButton(props: {
  disabled: boolean;
  idleIcon: React.JSX.Element;
  label: string;
  loadingLabel: string;
  onClick: () => void;
}): React.JSX.Element {
  return (
    <Button
      type='button'
      variant='outline'
      size='icon'
      className='size-7 cursor-pointer'
      aria-label={props.label}
      title={props.disabled ? props.loadingLabel : props.label}
      disabled={props.disabled}
      onClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
        event.preventDefault();
        event.stopPropagation();
        props.onClick();
      }}
    >
      {props.disabled ? <Loader2 className='size-3.5 animate-spin' /> : props.idleIcon}
    </Button>
  );
}

export function OrganizationLeafActions(props: OrganizationLeafNodeProps): React.JSX.Element {
  const { organization } = props;
  return (
    <>
      <OrganizationJobListingsButton organization={organization} />
      <OrganizationScrapeButton
        disabled={props.isWebsiteSocialScrapeRunning}
        idleIcon={<Globe2 className='size-3.5' />}
        label={`Discover website and social profiles for organization ${organization.name}`}
        loadingLabel={`Discovering website and social profiles for organization ${organization.name}`}
        onClick={() => props.onLaunchOrganizationWebsiteSocialScrape(organization.id)}
      />
      <OrganizationScrapeButton
        disabled={props.isEmailScrapeRunning}
        idleIcon={<MailSearch className='size-3.5' />}
        label={`Scrape website, social profiles, and emails for organization ${organization.name}`}
        loadingLabel={`Scraping website, social profiles, and emails for organization ${organization.name}`}
        onClick={() => props.onLaunchOrganizationEmailScrape(organization.id)}
      />
      <ActionMenu
        ariaLabel={`Open actions for organization ${organization.name}`}
        triggerClassName='size-7 cursor-pointer'
      >
        <DropdownMenuItem
          className='text-destructive focus:text-destructive'
          onSelect={(event: Event): void => {
            event.preventDefault();
            props.onDeleteOrganization(organization);
          }}
        >
          Delete Organisation
        </DropdownMenuItem>
      </ActionMenu>
    </>
  );
}
