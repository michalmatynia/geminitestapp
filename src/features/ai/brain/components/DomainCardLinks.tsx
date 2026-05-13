import React from 'react';
import Link from 'next/link';
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';
import type {
  BrainOperationsDomainKey,
  BrainOperationsDomainOverview,
} from '@/shared/contracts/ai-brain';

export function DomainCardLinks({
  domainKey,
  links,
  isExpanded,
  onToggleExpand,
}: {
  domainKey: BrainOperationsDomainKey;
  links: BrainOperationsDomainOverview['links'];
  isExpanded: boolean;
  onToggleExpand: () => void;
}): React.JSX.Element {
  return (
    <div className='flex flex-wrap items-center gap-2'>
      {links.map((link) => (
        <Link
          key={`${domainKey}:${link.href}`}
          href={link.href}
          className='inline-flex items-center gap-1 rounded-md border border-border/60 bg-background/50 px-2 py-1 text-[11px] text-gray-200 hover:bg-background/70'
        >
          {link.label}
          <ExternalLink className='size-3' />
        </Link>
      ))}
      <button
        type='button'
        className='inline-flex items-center gap-1 rounded-md border border-border/60 bg-background/50 px-2 py-1 text-[11px] text-gray-200 hover:bg-background/70'
        onClick={onToggleExpand}
      >
        Details
        {isExpanded ? <ChevronUp className='size-3' /> : <ChevronDown className='size-3' />}
      </button>
    </div>
  );
}
