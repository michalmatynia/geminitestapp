'use client';

import React from 'react';

import { FormSection } from '@/shared/ui/forms-and-actions.public';
import { Badge } from '@/shared/ui/primitives.public';

import { useAdminFilemakerOrganizationEditPageStateContext } from '../../context/AdminFilemakerOrganizationEditPageContext';
import type {
  FilemakerOrganizationDemandValue,
  FilemakerOrganizationHarvestProfile,
  FilemakerOrganizationImportedDemand,
  FilemakerOrganizationImportedProfile,
} from '../../filemaker-organization-imported-metadata';
import { formatTimestamp } from '../../pages/filemaker-page-utils';
import type { FilemakerValue } from '../../types';

const missingValue = 'Not imported';

type ImportedValuePathSource = {
  legacyValueUuids: string[];
  valueIds: string[];
  values: FilemakerOrganizationDemandValue[];
};

type ValueCatalogLookups = {
  byId: Map<string, FilemakerValue>;
  byLegacyUuid: Map<string, FilemakerValue>;
};

const metadataValue = (value: string | undefined): string => {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : missingValue;
};

const optionalMetadataValue = (value: string | undefined): string | undefined => {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : undefined;
};

const firstMetadataValue = (values: Array<string | undefined>): string | undefined =>
  values.map(optionalMetadataValue).find((value): value is string => value !== undefined);

const normalizeLegacyUuidKey = (value: string): string => value.trim().toUpperCase();

const buildValueCatalogLookups = (valueCatalog: FilemakerValue[]): ValueCatalogLookups => {
  const byId = new Map<string, FilemakerValue>();
  const byLegacyUuid = new Map<string, FilemakerValue>();
  valueCatalog.forEach((value: FilemakerValue): void => {
    byId.set(value.id, value);
    const legacyUuid = normalizeLegacyUuidKey(value.legacyUuid ?? '');
    if (legacyUuid.length > 0) byLegacyUuid.set(legacyUuid, value);
  });
  return { byId, byLegacyUuid };
};

const importedValueLabel = (
  value: FilemakerOrganizationDemandValue,
  lookups: ValueCatalogLookups
): string => {
  const valueId = optionalMetadataValue(value.valueId);
  const valueIdLabel = valueId === undefined ? undefined : lookups.byId.get(valueId)?.label;
  const legacyUuidLabel = lookups.byLegacyUuid.get(
    normalizeLegacyUuidKey(value.legacyValueUuid)
  )?.label;
  return metadataValue(
    firstMetadataValue([value.label, valueIdLabel, legacyUuidLabel, valueId, value.legacyValueUuid])
  );
};

const importedValuePath = (
  source: ImportedValuePathSource,
  lookups: ValueCatalogLookups
): string => {
  const values = [...source.values].sort(
    (left: FilemakerOrganizationDemandValue, right: FilemakerOrganizationDemandValue): number =>
      left.level - right.level
  );
  if (values.length > 0) {
    return values.map((value: FilemakerOrganizationDemandValue): string =>
      importedValueLabel(value, lookups)
    ).join(' > ');
  }

  if (source.valueIds.length > 0) {
    return source.valueIds
      .map((valueId: string): string => lookups.byId.get(valueId)?.label ?? valueId)
      .join(' > ');
  }

  if (source.legacyValueUuids.length > 0) {
    return source.legacyValueUuids
      .map(
        (legacyValueUuid: string): string =>
          lookups.byLegacyUuid.get(normalizeLegacyUuidKey(legacyValueUuid))?.label ??
          legacyValueUuid
      )
      .join(' > ');
  }
  return missingValue;
};

function ImportedDemandCard(props: {
  demand: FilemakerOrganizationImportedDemand;
  valueCatalogLookups: ValueCatalogLookups;
}): React.JSX.Element {
  const { demand, valueCatalogLookups } = props;
  return (
    <div className='rounded-md border border-border/60 bg-card/25 p-3'>
      <div className='text-sm font-medium text-foreground'>
        {importedValuePath(demand, valueCatalogLookups)}
      </div>
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

function ImportedProfileCard(props: {
  profile: FilemakerOrganizationImportedProfile;
  valueCatalogLookups: ValueCatalogLookups;
}): React.JSX.Element {
  const { profile, valueCatalogLookups } = props;
  return (
    <div className='rounded-md border border-border/60 bg-card/25 p-3'>
      <div className='text-sm font-medium text-foreground'>
        {importedValuePath(profile, valueCatalogLookups)}
      </div>
      <div className='mt-2 flex flex-wrap gap-2'>
        <Badge variant='outline' className='text-[10px]'>
          Legacy UUID: {profile.legacyUuid}
        </Badge>
        <Badge variant='outline' className='text-[10px]'>
          Values:{' '}
          {profile.valueIds.length > 0
            ? profile.valueIds.length
            : profile.legacyValueUuids.length}
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
  const { harvestProfiles, importedDemands, importedProfiles, valueCatalog } =
    useAdminFilemakerOrganizationEditPageStateContext();
  const valueCatalogLookups = React.useMemo(
    () => buildValueCatalogLookups(valueCatalog),
    [valueCatalog]
  );
  const hasImportedMetadata =
    harvestProfiles.length > 0 || importedDemands.length > 0 || importedProfiles.length > 0;
  if (!hasImportedMetadata) return null;

  return (
    <FormSection title='Imported FileMaker Metadata' className='space-y-4 p-4'>
      <div className='space-y-2'>
        <div className='text-xs font-medium uppercase text-muted-foreground'>
          Profile
        </div>
        {importedProfiles.length === 0 ? (
          <div className='text-xs text-muted-foreground'>No imported profile rows.</div>
        ) : (
          importedProfiles.map((profile: FilemakerOrganizationImportedProfile) => (
            <ImportedProfileCard
              key={profile.id}
              profile={profile}
              valueCatalogLookups={valueCatalogLookups}
            />
          ))
        )}
      </div>
      <div className='space-y-2'>
        <div className='text-xs font-medium uppercase text-muted-foreground'>
          Demand
        </div>
        {importedDemands.length === 0 ? (
          <div className='text-xs text-muted-foreground'>No imported demand rows.</div>
        ) : (
          importedDemands.map((demand: FilemakerOrganizationImportedDemand) => (
            <ImportedDemandCard
              key={demand.id}
              demand={demand}
              valueCatalogLookups={valueCatalogLookups}
            />
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
