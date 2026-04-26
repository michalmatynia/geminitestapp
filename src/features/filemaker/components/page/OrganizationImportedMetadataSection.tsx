'use client';

import React from 'react';

import { FormSection } from '@/shared/ui/forms-and-actions.public';
import { Badge } from '@/shared/ui/primitives.public';

import { useAdminFilemakerOrganizationEditPageStateContext } from '../../context/AdminFilemakerOrganizationEditPageContext';
import type {
  FilemakerOrganizationDemandValue,
  FilemakerOrganizationHarvestProfile,
  FilemakerOrganizationImportedDemand,
} from '../../filemaker-organization-imported-metadata';
import { formatTimestamp } from '../../pages/filemaker-page-utils';

const missingValue = 'Not imported';

const metadataValue = (value: string | undefined): string => {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : missingValue;
};

const demandValueLabel = (value: FilemakerOrganizationDemandValue): string =>
  metadataValue(value.label ?? value.valueId ?? value.legacyValueUuid);

const demandPath = (demand: FilemakerOrganizationImportedDemand): string => {
  const values = [...demand.values].sort(
    (left: FilemakerOrganizationDemandValue, right: FilemakerOrganizationDemandValue): number =>
      left.level - right.level
  );
  if (values.length > 0) return values.map(demandValueLabel).join(' > ');
  if (demand.legacyValueUuids.length > 0) return demand.legacyValueUuids.join(' > ');
  return missingValue;
};

function ImportedDemandCard(props: {
  demand: FilemakerOrganizationImportedDemand;
}): React.JSX.Element {
  const { demand } = props;
  return (
    <div className='rounded-md border border-border/60 bg-card/25 p-3'>
      <div className='text-sm font-medium text-foreground'>{demandPath(demand)}</div>
      <div className='mt-2 flex flex-wrap gap-2'>
        <Badge variant='outline' className='text-[10px]'>
          Legacy UUID: {demand.legacyUuid}
        </Badge>
        <Badge variant='outline' className='text-[10px]'>
          Values:{' '}
          {demand.valueIds.length > 0
            ? demand.valueIds.length
            : demand.legacyValueUuids.length}
        </Badge>
        <Badge variant='outline' className='text-[10px]'>
          Modified: {formatTimestamp(demand.updatedAt)}
        </Badge>
        <Badge variant='outline' className='text-[10px]'>
          Modified By: {metadataValue(demand.updatedBy)}
        </Badge>
      </div>
    </div>
  );
}

function HarvestProfileCard(props: {
  profile: FilemakerOrganizationHarvestProfile;
}): React.JSX.Element {
  const { profile } = props;
  return (
    <div className='rounded-md border border-border/60 bg-card/25 p-3'>
      <div className='flex flex-wrap items-center gap-2'>
        <div className='min-w-0 flex-1 text-sm font-medium text-foreground'>
          {metadataValue(profile.pageTitle)}
        </div>
        <Badge variant='outline' className='text-[10px]'>
          Owner: {metadataValue(profile.owner)}
        </Badge>
      </div>
      <div className='mt-2 space-y-1 text-xs text-muted-foreground'>
        <div>{metadataValue(profile.pageDescription)}</div>
        <div className='font-mono'>Keywords: {metadataValue(profile.pageKeywords)}</div>
      </div>
      <div className='mt-2 flex flex-wrap gap-2'>
        <Badge variant='outline' className='text-[10px]'>
          Legacy UUID: {profile.legacyUuid}
        </Badge>
        <Badge variant='outline' className='text-[10px]'>
          Modified: {formatTimestamp(profile.updatedAt)}
        </Badge>
        <Badge variant='outline' className='text-[10px]'>
          Modified By: {metadataValue(profile.updatedBy)}
        </Badge>
      </div>
    </div>
  );
}

export function OrganizationImportedMetadataSection(): React.JSX.Element | null {
  const { harvestProfiles, importedDemands } =
    useAdminFilemakerOrganizationEditPageStateContext();
  if (harvestProfiles.length === 0 && importedDemands.length === 0) return null;

  return (
    <FormSection title='Imported FileMaker Metadata' className='space-y-4 p-4'>
      <div className='space-y-2'>
        <div className='text-xs font-medium uppercase text-muted-foreground'>
          Demand
        </div>
        {importedDemands.length === 0 ? (
          <div className='text-xs text-muted-foreground'>No imported demand rows.</div>
        ) : (
          importedDemands.map((demand: FilemakerOrganizationImportedDemand) => (
            <ImportedDemandCard key={demand.id} demand={demand} />
          ))
        )}
      </div>
      <div className='space-y-2'>
        <div className='text-xs font-medium uppercase text-muted-foreground'>
          Harvest / Scraper
        </div>
        {harvestProfiles.length === 0 ? (
          <div className='text-xs text-muted-foreground'>No imported harvest profiles.</div>
        ) : (
          harvestProfiles.map((profile: FilemakerOrganizationHarvestProfile) => (
            <HarvestProfileCard key={profile.id} profile={profile} />
          ))
        )}
      </div>
    </FormSection>
  );
}
