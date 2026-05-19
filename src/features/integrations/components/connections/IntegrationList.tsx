'use client';

import { PlusIcon, SettingsIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'nextjs-toploader/app';
import { useEffect, useMemo } from 'react';

import { useIntegrationList } from '@/features/integrations/hooks/useIntegrationList';
import type { IntegrationDefinition } from '@/features/integrations/context/integrations-context-types';
import {
  Badge,
  Button,
  Card,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/ui/primitives.public';
import { ListPanel } from '@/shared/ui/navigation-and-layout.public';
import { StatusBadge } from '@/shared/ui/data-display.public';

interface IntegrationNode {
  slug: string;
  label: string;
  type: string;
  variant: 'warning' | 'info' | 'processing';
  color: 'info' | 'success' | 'warning' | 'active';
  definition: IntegrationDefinition | null;
}

function MarketplaceBadge({ 
  node, 
  onClick 
}: { 
  node: IntegrationNode; 
  onClick: (def: IntegrationDefinition) => void;
}): React.JSX.Element {
  return (
    <Badge variant={node.color} className='flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-normal'>
      <StatusBadge status={node.type} variant={node.variant} size='sm' className='h-4 font-bold' />
      <span className='font-medium'>{node.label}</span>
      <Button
        type='button'
        onClick={() => { if (node.definition !== null) onClick(node.definition); }}
        className='h-6 w-6 rounded-full border border-white/20 bg-white/10 p-0 text-white hover:bg-white/20'
        aria-label={`Manage ${node.label} settings`}
        title={`Manage ${node.label} settings`}
      >
        <SettingsIcon className='size-3' />
      </Button>
    </Badge>
  );
}

function MarketplaceSystem({ 
  nodes, 
  slugs, 
  onClick 
}: { 
  nodes: IntegrationNode[]; 
  slugs: string[]; 
  onClick: (def: IntegrationDefinition) => void;
}): React.JSX.Element {
  return (
    <Card variant='glass' padding='lg' className='relative overflow-hidden'>
      <div className='absolute -left-20 -top-20 size-64 rounded-full bg-emerald-500/10 blur-3xl' />
      <div className='absolute -bottom-24 right-10 size-72 rounded-full bg-sky-500/10 blur-3xl' />
      <div className='absolute -right-16 top-20 size-48 rounded-full bg-purple-500/10 blur-3xl' />

      <div className='relative mx-auto flex min-h-[420px] max-w-5xl items-center justify-center'>
        <div className='relative z-10 flex flex-col items-center gap-6'>
          <Card variant='subtle' padding='lg' className='border-emerald-400/40 bg-emerald-500/10 text-center shadow-lg rounded-2xl'>
            <p className='text-xs uppercase tracking-[0.3em] text-emerald-200'>Core</p>
            <p className='mt-2 text-xl font-semibold text-white'>Stardb Hub</p>
          </Card>
          <div className='flex flex-wrap items-center justify-center gap-3'>
            {nodes.map(node => slugs.includes(node.slug) ? <MarketplaceBadge key={node.slug} node={node} onClick={onClick} /> : null)}
            {!nodes.some(n => slugs.includes(n.slug)) && <div className='text-xs text-gray-500'>No marketplace integrations added yet.</div>}
          </div>
        </div>
      </div>

      <div className='mt-6 grid gap-3 text-xs text-gray-500 md:grid-cols-3'>
        <Card variant='subtle-compact' padding='sm' className='text-xs text-muted-foreground'>Connect marketplaces and automate listings.</Card>
        <Card variant='subtle-compact' padding='sm' className='text-xs text-muted-foreground'>Monitor sync status and data flow.</Card>
        <Card variant='subtle-compact' padding='sm' className='text-xs text-muted-foreground'>Add new nodes to expand your stack.</Card>
      </div>
    </Card>
  );
}

interface JobPlatformNode {
  slug: string;
  label: string;
  type: string;
  definition: IntegrationDefinition | null;
  description: string;
}

function JobSearchPlatforms({ 
  platforms, 
  slugs, 
  onClick 
}: { 
  platforms: JobPlatformNode[]; 
  slugs: string[]; 
  onClick: (def: IntegrationDefinition) => void;
}): React.JSX.Element {
  return (
    <div className='grid gap-3 md:grid-cols-2'>
      {platforms.map((platform) => {
        const configured = slugs.includes(platform.slug);
        return (
          <Card key={platform.slug} variant='subtle' padding='md' className='border-border bg-card/40'>
            <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
              <div className='space-y-2'>
                <div className='flex flex-wrap items-center gap-2'>
                  <h3 className='text-base font-semibold text-white'>{platform.label}</h3>
                  <StatusBadge status={platform.type} variant='warning' size='sm' className='font-semibold' />
                  <StatusBadge status={configured ? 'Configured' : 'Not configured'} variant={configured ? 'success' : 'neutral'} size='sm' className='font-semibold' />
                </div>
                <p className='max-w-xl text-sm text-muted-foreground'>{platform.description}</p>
              </div>
              <Button type='button' variant='outline' className='gap-2' onClick={() => { if (platform.definition !== null) onClick(platform.definition); }}>
                <SettingsIcon className='size-4' />
                {configured ? 'Manage' : 'Configure'}
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

export function IntegrationList(): React.JSX.Element {
  const router = useRouter();
  const { handleIntegrationClick, integrationSlugs, traderaDefinition, allegroDefinition, vintedDefinition, scanner1688Definition, baselinkerDefinition, scrapedSourceDefinition, linkedinDefinition, pracujDefinition } = useIntegrationList();

  useEffect(() => { router.prefetch('/admin/integrations/add'); }, [router]);

  const marketplaceNodes: IntegrationNode[] = [
    { slug: 'tradera', label: 'Tradera', type: 'Browser', variant: 'warning', color: 'info', definition: traderaDefinition },
    { slug: 'vinted', label: 'Vinted.pl', type: 'Browser', variant: 'warning', color: 'success', definition: vintedDefinition },
    { slug: '1688', label: '1688', type: 'Browser', variant: 'warning', color: 'warning', definition: scanner1688Definition },
    { slug: 'allegro', label: 'Allegro', type: 'API', variant: 'info', color: 'warning', definition: allegroDefinition },
    { slug: 'baselinker', label: 'Baselinker', type: 'Platform', variant: 'processing', color: 'active', definition: baselinkerDefinition },
    { slug: 'scraped-source', label: 'Scraped Source', type: 'Source', variant: 'info', color: 'info', definition: scrapedSourceDefinition },
    { slug: 'linkedin', label: 'LinkedIn', type: 'Social', variant: 'info', color: 'info', definition: linkedinDefinition },
  ];

  const jobPlatforms: JobPlatformNode[] = useMemo(() => [
    { 
      slug: 'pracuj-pl', 
      label: 'Pracuj.pl', 
      type: 'Browser', 
      definition: pracujDefinition, 
      description: 'Connect a reusable Pracuj.pl candidate profile for authenticated job applications.' 
    }
  ], [pracujDefinition]);

  return (
    <ListPanel title='Integrations' description='Manage marketplace systems separately from job-search platform profiles.' headerActions={<Button asChild className='gap-2'><Link href='/admin/integrations/add'><PlusIcon className='size-4' />Add Integration</Link></Button>}>
      <Tabs defaultValue='marketplace-system' className='space-y-4'>
        <TabsList aria-label='Integration groups'>
          <TabsTrigger value='marketplace-system'>Marketplace System</TabsTrigger>
          <TabsTrigger value='job-search-platforms'>Job Search Platforms</TabsTrigger>
        </TabsList>
        <TabsContent value='marketplace-system'>
          <MarketplaceSystem nodes={marketplaceNodes} slugs={integrationSlugs} onClick={(def) => { void handleIntegrationClick(def); }} />
        </TabsContent>
        <TabsContent value='job-search-platforms'>
          <JobSearchPlatforms platforms={jobPlatforms} slugs={integrationSlugs} onClick={(def) => { void handleIntegrationClick(def); }} />
        </TabsContent>
      </Tabs>
    </ListPanel>
  );
}
