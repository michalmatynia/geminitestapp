'use client';

import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import { CopyButton } from '@/shared/ui/copy-button';
import { Input } from '@/shared/ui/input';
import {
  groupAmazonAttributesBySource,
  matchesAttributeQuery,
} from './ProductScanAmazonDetails.attributes';
import type {
  AmazonAttributeGroup,
  ProductScanAmazonDetailsScan,
} from './ProductScanAmazonDetails.types';

export function ProductScanAmazonAttributesSection(props: {
  details: ProductScanAmazonDetailsScan['amazonDetails'];
}): React.JSX.Element | null {
  const [attributeQuery, setAttributeQuery] = useState('');
  const groupedAttributes = useMemo(
    () => groupAmazonAttributesBySource(props.details),
    [props.details]
  );
  const filteredGroupedAttributes = useMemo(
    () => filterGroupedAttributes(groupedAttributes, attributeQuery),
    [attributeQuery, groupedAttributes]
  );
  if (groupedAttributes.length === 0) return null;

  const totalAttributeCount = countGroupedAttributes(groupedAttributes);
  const filteredAttributeCount = countGroupedAttributes(filteredGroupedAttributes);
  return (
    <div className='space-y-2'>
      <ProductScanAmazonAttributesHeader
        filteredAttributeCount={filteredAttributeCount}
        totalAttributeCount={totalAttributeCount}
      />
      <ProductScanAmazonAttributesFilter
        attributeQuery={attributeQuery}
        setAttributeQuery={setAttributeQuery}
      />
      <ProductScanAmazonAttributeGroups
        filteredAttributeCount={filteredAttributeCount}
        groupedAttributes={filteredGroupedAttributes}
      />
    </div>
  );
}

const filterGroupedAttributes = (
  groupedAttributes: AmazonAttributeGroup[],
  attributeQuery: string
): AmazonAttributeGroup[] => {
  const normalizedQuery = attributeQuery.trim().toLowerCase();
  return groupedAttributes
    .map((group) => ({
      source: group.source,
      entries: group.entries.filter((entry) => matchesAttributeQuery(entry, normalizedQuery)),
    }))
    .filter((group) => group.entries.length > 0);
};

const countGroupedAttributes = (groupedAttributes: AmazonAttributeGroup[]): number =>
  groupedAttributes.reduce((count, group) => count + group.entries.length, 0);

function ProductScanAmazonAttributesHeader(props: {
  filteredAttributeCount: number;
  totalAttributeCount: number;
}): React.JSX.Element {
  return (
    <div className='flex flex-wrap items-center justify-between gap-2'>
      <h5 className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
        All Extracted Amazon Attributes
      </h5>
      <span className='inline-flex items-center rounded-md border border-border/60 bg-background/70 px-2.5 py-1 text-[11px] font-medium'>
        Showing {props.filteredAttributeCount} of {props.totalAttributeCount}
      </span>
    </div>
  );
}

function ProductScanAmazonAttributesFilter(props: {
  attributeQuery: string;
  setAttributeQuery: (value: string) => void;
}): React.JSX.Element {
  return (
    <div className='relative'>
      <Search className='pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground' />
      <Input
        value={props.attributeQuery}
        onChange={(event) => props.setAttributeQuery(event.currentTarget.value)}
        placeholder='Filter extracted attributes'
        aria-label='Filter extracted Amazon attributes'
        size='sm'
        className='pl-7'
      />
    </div>
  );
}

function ProductScanAmazonAttributeGroups(props: {
  filteredAttributeCount: number;
  groupedAttributes: AmazonAttributeGroup[];
}): React.JSX.Element {
  return (
    <div className='space-y-3'>
      {props.groupedAttributes.map((group, groupIndex) => (
        <ProductScanAmazonAttributeGroup
          group={group}
          groupIndex={groupIndex}
          key={`attribute-group-${group.source}-${groupIndex}`}
        />
      ))}
      {props.filteredAttributeCount === 0 ? (
        <div className='rounded-md border border-dashed border-border/60 bg-background/60 px-3 py-3 text-xs text-muted-foreground'>
          No extracted attributes match the current filter.
        </div>
      ) : null}
    </div>
  );
}

function ProductScanAmazonAttributeGroup(props: {
  group: AmazonAttributeGroup;
  groupIndex: number;
}): React.JSX.Element {
  const { group } = props;
  return (
    <div className='space-y-2'>
      <h6 className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
        {group.source}
      </h6>
      <dl className='grid gap-2 sm:grid-cols-2'>
        {group.entries.map((entry, index) => (
          <div
            key={`attribute-${group.source}-${index}-${entry.key}`}
            className='rounded-md border border-border/50 bg-background/70 px-3 py-2'
          >
            <div className='flex items-start justify-between gap-2'>
              <dt className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
                {entry.label}
              </dt>
              <CopyButton
                value={entry.value}
                ariaLabel={`Copy ${entry.label}`}
                size='sm'
                className='h-6 px-2 text-[11px]'
                showText
              />
            </div>
            <dd className='mt-1 text-sm'>{entry.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
