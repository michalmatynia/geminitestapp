'use client';

import { Plus, RefreshCw, Save, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  DEFAULT_MILKBAR_PAGE_CONTENT,
  type MilkbarCmsSnapshot,
  type MilkbarMetric,
  type MilkbarPageContent,
  type MilkbarPrinciple,
  type MilkbarProcessStep,
  type MilkbarProjectCmsRecord,
  type MilkbarServiceCmsRecord,
} from './milkbar-cms.types';
import { api } from '@/shared/lib/api-client';
import { AdminPageManagerLayout } from '@/shared/ui/admin.public';
import { Alert, Badge, Button, Input, Textarea, useToast } from '@/shared/ui/primitives.public';
import { FormField, FormSection } from '@/shared/ui/forms-and-actions.public';
import { LoadingPanel } from '@/shared/ui/navigation-and-layout.public';

const ENDPOINT = '/api/v2/page-manager/milkbardesigners';

const TABS = [
  { label: 'Page Content', value: 'content' },
  { label: 'Projects', value: 'projects' },
  { label: 'Services', value: 'services' },
  { label: 'Inquiries', value: 'inquiries' },
  { label: 'Sync Status', value: 'status' },
] as const;

type MilkbarCmsTab = (typeof TABS)[number]['value'];

const linesToText = (lines: string[]): string => lines.join('\n');
const textToLines = (value: string): string[] =>
  value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const newProject = (index: number): MilkbarProjectCmsRecord => ({
  code: `MBD-${String(index + 1).padStart(3, '0')}`,
  name: 'New project',
  projectType: 'Architecture Project',
  city: 'Amsterdam',
  country: 'NL',
  stats: [],
  description: 'Project description pending.',
  order: index,
  status: 'draft',
  cameraPosition: { x: 20, y: 15, z: 20 },
  cameraTarget: { x: 0, y: 6, z: 0 },
});

const newService = (index: number): MilkbarServiceCmsRecord => ({
  code: `S-${String(index + 1).padStart(2, '0')}`,
  title: 'New service',
  description: 'Service description pending.',
  order: index,
});

function FieldInput({
  label,
  value,
  onChange,
  description,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  description?: string;
}): React.JSX.Element {
  return (
    <FormField label={label} description={description}>
      <Input value={String(value)} onChange={(event) => onChange(event.target.value)} />
    </FormField>
  );
}

function FieldTextarea({
  label,
  value,
  onChange,
  description,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  description?: string;
  rows?: number;
}): React.JSX.Element {
  return (
    <FormField label={label} description={description}>
      <Textarea value={value} rows={rows} onChange={(event) => onChange(event.target.value)} />
    </FormField>
  );
}

function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}): React.JSX.Element {
  return (
    <div className='space-y-1'>
      <h3 className='text-sm font-semibold text-white'>{title}</h3>
      {subtitle ? <p className='text-xs text-muted-foreground'>{subtitle}</p> : null}
    </div>
  );
}

export function AdminMilkbarDesignersCmsPage(): React.JSX.Element {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<MilkbarCmsTab>('content');
  const [snapshot, setSnapshot] = useState<MilkbarCmsSnapshot | null>(null);
  const [pageContent, setPageContent] = useState<MilkbarPageContent>(DEFAULT_MILKBAR_PAGE_CONTENT);
  const [projects, setProjects] = useState<MilkbarProjectCmsRecord[]>([]);
  const [services, setServices] = useState<MilkbarServiceCmsRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSnapshot = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const nextSnapshot = await api.get<MilkbarCmsSnapshot>(ENDPOINT);
      setSnapshot(nextSnapshot);
      setPageContent(nextSnapshot.pageContent);
      setProjects(nextSnapshot.projects);
      setServices(nextSnapshot.services);
    } catch (loadError) {
      setError(toErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSnapshot().catch(() => undefined);
  }, [loadSnapshot]);

  const saveSnapshot = useCallback(async (): Promise<void> => {
    setIsSaving(true);
    setError(null);
    try {
      const nextSnapshot = await api.put<MilkbarCmsSnapshot>(
        ENDPOINT,
        { pageContent, projects, services },
        { timeout: 120_000 }
      );
      setSnapshot(nextSnapshot);
      setPageContent(nextSnapshot.pageContent);
      setProjects(nextSnapshot.projects);
      setServices(nextSnapshot.services);
      toast('Milkbardesigners CMS saved.', { variant: 'success' });
    } catch (saveError) {
      const message = toErrorMessage(saveError);
      setError(message);
      toast(message, { variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  }, [pageContent, projects, services, toast]);

  const updateHero = useCallback((patch: Partial<MilkbarPageContent['hero']>) => {
    setPageContent((current) => ({ ...current, hero: { ...current.hero, ...patch } }));
  }, []);

  const updateDrawing = useCallback((patch: Partial<MilkbarPageContent['drawing']>) => {
    setPageContent((current) => ({ ...current, drawing: { ...current.drawing, ...patch } }));
  }, []);

  const updatePhilosophy = useCallback((patch: Partial<MilkbarPageContent['philosophy']>) => {
    setPageContent((current) => ({
      ...current,
      philosophy: { ...current.philosophy, ...patch },
    }));
  }, []);

  const updateServicesHeader = useCallback((patch: Partial<MilkbarPageContent['services']>) => {
    setPageContent((current) => ({ ...current, services: { ...current.services, ...patch } }));
  }, []);

  const updateProjectsHeader = useCallback((patch: Partial<MilkbarPageContent['projects']>) => {
    setPageContent((current) => ({ ...current, projects: { ...current.projects, ...patch } }));
  }, []);

  const updateProcess = useCallback((patch: Partial<MilkbarPageContent['process']>) => {
    setPageContent((current) => ({ ...current, process: { ...current.process, ...patch } }));
  }, []);

  const updateQuote = useCallback((patch: Partial<MilkbarPageContent['quote']>) => {
    setPageContent((current) => ({ ...current, quote: { ...current.quote, ...patch } }));
  }, []);

  const updateCta = useCallback((patch: Partial<MilkbarPageContent['cta']>) => {
    setPageContent((current) => ({ ...current, cta: { ...current.cta, ...patch } }));
  }, []);

  const updateFooter = useCallback((patch: Partial<MilkbarPageContent['footer']>) => {
    setPageContent((current) => ({ ...current, footer: { ...current.footer, ...patch } }));
  }, []);

  const updatePrinciple = useCallback(
    (index: number, patch: Partial<MilkbarPrinciple>): void => {
      setPageContent((current) => {
        const principles = current.philosophy.principles.map((principle, principleIndex) =>
          principleIndex === index ? { ...principle, ...patch } : principle
        );
        return {
          ...current,
          philosophy: { ...current.philosophy, principles },
        };
      });
    },
    []
  );

  const updateProcessStep = useCallback(
    (index: number, patch: Partial<MilkbarProcessStep>): void => {
      setPageContent((current) => {
        const steps = current.process.steps.map((step, stepIndex) =>
          stepIndex === index ? { ...step, ...patch } : step
        );
        return { ...current, process: { ...current.process, steps } };
      });
    },
    []
  );

  const updateMetric = useCallback((index: number, patch: Partial<MilkbarMetric>): void => {
    setPageContent((current) => {
      const metrics = current.metrics.map((metric, metricIndex) =>
        metricIndex === index ? { ...metric, ...patch } : metric
      );
      return { ...current, metrics };
    });
  }, []);

  const updateProject = useCallback(
    (index: number, patch: Partial<MilkbarProjectCmsRecord>): void => {
      setProjects((current) =>
        current.map((project, projectIndex) =>
          projectIndex === index ? { ...project, ...patch } : project
        )
      );
    },
    []
  );

  const updateService = useCallback(
    (index: number, patch: Partial<MilkbarServiceCmsRecord>): void => {
      setServices((current) =>
        current.map((service, serviceIndex) =>
          serviceIndex === index ? { ...service, ...patch } : service
        )
      );
    },
    []
  );

  const headerDescription = useMemo(() => {
    if (activeTab === 'projects') return 'Manage Milkbar project cards and 3D project metadata.';
    if (activeTab === 'services') return 'Manage the practice/service entries shown on the architecture website.';
    if (activeTab === 'inquiries') return 'Review incoming Milkbar website inquiries.';
    if (activeTab === 'status') return 'Review Milkbar Mongo source configuration and record counts.';
    return 'Manage Milkbar page copy and section content.';
  }, [activeTab]);

  return (
    <AdminPageManagerLayout
      title='Milkbardesigners CMS'
      current='Milkbardesigners'
      description={headerDescription}
      icon={<PanelsIcon />}
      tabs={{
        activeTab,
        onTabChange: (value) => setActiveTab(value as MilkbarCmsTab),
        tabsList: [...TABS],
      }}
      headerActions={
        <div className='flex items-center gap-2'>
          <Button
            type='button'
            variant='secondary'
            size='sm'
            icon={<RefreshCw className='size-4' />}
            onClick={() => void loadSnapshot()}
            disabled={isLoading || isSaving}
          >
            Refresh
          </Button>
          <Button
            type='button'
            variant='solid'
            size='sm'
            icon={<Save className='size-4' />}
            loading={isSaving}
            onClick={() => void saveSnapshot()}
          >
            Save CMS
          </Button>
        </div>
      }
    >
      {error ? <Alert variant='error' title='Milkbardesigners CMS error' description={error} /> : null}
      {isLoading ? (
        <LoadingPanel>Loading Milkbardesigners CMS...</LoadingPanel>
      ) : (
        <div className='space-y-4'>
          {activeTab === 'content' ? (
            <ContentTab
              pageContent={pageContent}
              updateHero={updateHero}
              updateDrawing={updateDrawing}
              updatePhilosophy={updatePhilosophy}
              updateServicesHeader={updateServicesHeader}
              updateProjectsHeader={updateProjectsHeader}
              updateProcess={updateProcess}
              updateQuote={updateQuote}
              updateCta={updateCta}
              updateFooter={updateFooter}
              updatePrinciple={updatePrinciple}
              updateProcessStep={updateProcessStep}
              updateMetric={updateMetric}
            />
          ) : null}
          {activeTab === 'projects' ? (
            <ProjectsTab
              projects={projects}
              onAdd={() => setProjects((current) => [...current, newProject(current.length)])}
              onRemove={(index) =>
                setProjects((current) => current.filter((_, currentIndex) => currentIndex !== index))
              }
              onUpdate={updateProject}
            />
          ) : null}
          {activeTab === 'services' ? (
            <ServicesTab
              services={services}
              onAdd={() => setServices((current) => [...current, newService(current.length)])}
              onRemove={(index) =>
                setServices((current) => current.filter((_, currentIndex) => currentIndex !== index))
              }
              onUpdate={updateService}
            />
          ) : null}
          {activeTab === 'inquiries' ? <InquiriesTab snapshot={snapshot} /> : null}
          {activeTab === 'status' ? <StatusTab snapshot={snapshot} /> : null}
        </div>
      )}
    </AdminPageManagerLayout>
  );
}

function PanelsIcon(): React.JSX.Element {
  return <span className='inline-block size-4 rounded border border-current/60' aria-hidden='true' />;
}

function ContentTab({
  pageContent,
  updateHero,
  updateDrawing,
  updatePhilosophy,
  updateServicesHeader,
  updateProjectsHeader,
  updateProcess,
  updateQuote,
  updateCta,
  updateFooter,
  updatePrinciple,
  updateProcessStep,
  updateMetric,
}: {
  pageContent: MilkbarPageContent;
  updateHero: (patch: Partial<MilkbarPageContent['hero']>) => void;
  updateDrawing: (patch: Partial<MilkbarPageContent['drawing']>) => void;
  updatePhilosophy: (patch: Partial<MilkbarPageContent['philosophy']>) => void;
  updateServicesHeader: (patch: Partial<MilkbarPageContent['services']>) => void;
  updateProjectsHeader: (patch: Partial<MilkbarPageContent['projects']>) => void;
  updateProcess: (patch: Partial<MilkbarPageContent['process']>) => void;
  updateQuote: (patch: Partial<MilkbarPageContent['quote']>) => void;
  updateCta: (patch: Partial<MilkbarPageContent['cta']>) => void;
  updateFooter: (patch: Partial<MilkbarPageContent['footer']>) => void;
  updatePrinciple: (index: number, patch: Partial<MilkbarPrinciple>) => void;
  updateProcessStep: (index: number, patch: Partial<MilkbarProcessStep>) => void;
  updateMetric: (index: number, patch: Partial<MilkbarMetric>) => void;
}): React.JSX.Element {
  return (
    <div className='space-y-4'>
      <FormSection title='Hero' gridClassName='md:grid-cols-2'>
        <FieldInput label='Location line' value={pageContent.hero.location} onChange={(location) => updateHero({ location })} />
        <FieldInput label='Index label' value={pageContent.hero.indexLabel} onChange={(indexLabel) => updateHero({ indexLabel })} />
        <FieldTextarea
          label='Headline lines'
          value={linesToText(pageContent.hero.titleLines)}
          onChange={(value) => updateHero({ titleLines: textToLines(value) })}
          description='One headline line per row.'
          rows={3}
        />
        <FieldTextarea label='Lede' value={pageContent.hero.lede} onChange={(lede) => updateHero({ lede })} rows={3} />
        <FieldInput label='Primary CTA' value={pageContent.hero.primaryCtaLabel} onChange={(primaryCtaLabel) => updateHero({ primaryCtaLabel })} />
        <FieldInput label='Secondary CTA' value={pageContent.hero.secondaryCtaLabel} onChange={(secondaryCtaLabel) => updateHero({ secondaryCtaLabel })} />
      </FormSection>

      <FormSection title='Drawing Section' gridClassName='md:grid-cols-2'>
        <FieldInput label='Eyebrow' value={pageContent.drawing.eyebrow} onChange={(eyebrow) => updateDrawing({ eyebrow })} />
        <FieldInput label='Title' value={pageContent.drawing.title} onChange={(title) => updateDrawing({ title })} />
        <FieldInput label='Emphasis' value={pageContent.drawing.emphasis} onChange={(emphasis) => updateDrawing({ emphasis })} />
        <FieldInput label='CTA label' value={pageContent.drawing.ctaLabel} onChange={(ctaLabel) => updateDrawing({ ctaLabel })} />
        <FieldTextarea label='Description' value={pageContent.drawing.description} onChange={(description) => updateDrawing({ description })} rows={3} />
        <FieldInput label='Interaction hint' value={pageContent.drawing.hint} onChange={(hint) => updateDrawing({ hint })} />
      </FormSection>

      <FormSection title='Philosophy' gridClassName='md:grid-cols-2'>
        <FieldInput label='Eyebrow' value={pageContent.philosophy.eyebrow} onChange={(eyebrow) => updatePhilosophy({ eyebrow })} />
        <FieldInput label='Title' value={pageContent.philosophy.title} onChange={(title) => updatePhilosophy({ title })} />
        <FieldInput label='Emphasis' value={pageContent.philosophy.emphasis} onChange={(emphasis) => updatePhilosophy({ emphasis })} />
        <FieldInput label='Figure caption' value={pageContent.philosophy.caption} onChange={(caption) => updatePhilosophy({ caption })} />
        <FieldTextarea label='Body' value={pageContent.philosophy.body} onChange={(body) => updatePhilosophy({ body })} rows={3} />
        <FieldTextarea label='Closing line' value={pageContent.philosophy.closing} onChange={(closing) => updatePhilosophy({ closing })} rows={2} />
      </FormSection>

      <FormSection title='Philosophy Principles'>
        {pageContent.philosophy.principles.map((principle, index) => (
          <div key={`${principle.number}-${index}`} className='grid gap-3 rounded-md border border-white/10 p-3 md:grid-cols-[5rem_minmax(0,1fr)_minmax(0,1fr)]'>
            <FieldInput label='No.' value={principle.number} onChange={(number) => updatePrinciple(index, { number })} />
            <FieldInput label='Title' value={principle.title} onChange={(title) => updatePrinciple(index, { title })} />
            <FieldInput label='Emphasis' value={principle.emphasis} onChange={(emphasis) => updatePrinciple(index, { emphasis })} />
            <div className='md:col-span-3'>
              <FieldTextarea label='Description' value={principle.description} onChange={(description) => updatePrinciple(index, { description })} rows={2} />
            </div>
          </div>
        ))}
      </FormSection>

      <div className='grid gap-4 xl:grid-cols-2'>
        <FormSection title='Practice Header' gridClassName='md:grid-cols-2'>
          <FieldInput label='Eyebrow' value={pageContent.services.eyebrow} onChange={(eyebrow) => updateServicesHeader({ eyebrow })} />
          <FieldInput label='Label' value={pageContent.services.label} onChange={(label) => updateServicesHeader({ label })} />
          <FieldInput label='Title' value={pageContent.services.title} onChange={(title) => updateServicesHeader({ title })} />
          <FieldInput label='Emphasis' value={pageContent.services.emphasis} onChange={(emphasis) => updateServicesHeader({ emphasis })} />
        </FormSection>
        <FormSection title='Projects Header' gridClassName='md:grid-cols-2'>
          <FieldInput label='Eyebrow' value={pageContent.projects.eyebrow} onChange={(eyebrow) => updateProjectsHeader({ eyebrow })} />
          <FieldInput label='Label' value={pageContent.projects.label} onChange={(label) => updateProjectsHeader({ label })} />
          <FieldInput label='Title' value={pageContent.projects.title} onChange={(title) => updateProjectsHeader({ title })} />
          <FieldInput label='Emphasis' value={pageContent.projects.emphasis} onChange={(emphasis) => updateProjectsHeader({ emphasis })} />
        </FormSection>
      </div>

      <FormSection title='Process' gridClassName='md:grid-cols-2'>
        <FieldInput label='Eyebrow' value={pageContent.process.eyebrow} onChange={(eyebrow) => updateProcess({ eyebrow })} />
        <FieldInput label='Label' value={pageContent.process.label} onChange={(label) => updateProcess({ label })} />
        <FieldInput label='Title' value={pageContent.process.title} onChange={(title) => updateProcess({ title })} />
        <FieldInput label='Emphasis' value={pageContent.process.emphasis} onChange={(emphasis) => updateProcess({ emphasis })} />
      </FormSection>
      <FormSection title='Process Steps'>
        {pageContent.process.steps.map((step, index) => (
          <div key={`${step.number}-${index}`} className='grid gap-3 rounded-md border border-white/10 p-3 md:grid-cols-[5rem_minmax(0,1fr)]'>
            <FieldInput label='No.' value={step.number} onChange={(number) => updateProcessStep(index, { number })} />
            <FieldInput label='Title' value={step.title} onChange={(title) => updateProcessStep(index, { title })} />
            <div className='md:col-span-2'>
              <FieldTextarea label='Description' value={step.description} onChange={(description) => updateProcessStep(index, { description })} rows={2} />
            </div>
          </div>
        ))}
      </FormSection>

      <FormSection title='Metrics' gridClassName='md:grid-cols-2'>
        {pageContent.metrics.map((metric, index) => (
          <div key={`${metric.label}-${index}`} className='grid gap-3 rounded-md border border-white/10 p-3 md:grid-cols-[7rem_5rem_minmax(0,1fr)]'>
            <FieldInput label='Value' value={metric.value} onChange={(value) => updateMetric(index, { value })} />
            <FieldInput label='Suffix' value={metric.suffix} onChange={(suffix) => updateMetric(index, { suffix })} />
            <FieldInput label='Label' value={metric.label} onChange={(label) => updateMetric(index, { label })} />
          </div>
        ))}
      </FormSection>

      <div className='grid gap-4 xl:grid-cols-2'>
        <FormSection title='Quote' gridClassName='md:grid-cols-2'>
          <FieldInput label='Eyebrow' value={pageContent.quote.eyebrow} onChange={(eyebrow) => updateQuote({ eyebrow })} />
          <FieldInput label='Attribution' value={pageContent.quote.attribution} onChange={(attribution) => updateQuote({ attribution })} />
          <FieldTextarea label='Text' value={pageContent.quote.text} onChange={(text) => updateQuote({ text })} rows={2} />
          <FieldTextarea label='Emphasis' value={pageContent.quote.emphasis} onChange={(emphasis) => updateQuote({ emphasis })} rows={2} />
        </FormSection>
        <FormSection title='CTA' gridClassName='md:grid-cols-2'>
          <FieldInput label='Title' value={pageContent.cta.title} onChange={(title) => updateCta({ title })} />
          <FieldInput label='Emphasis' value={pageContent.cta.emphasis} onChange={(emphasis) => updateCta({ emphasis })} />
          <FieldTextarea label='Description' value={pageContent.cta.description} onChange={(description) => updateCta({ description })} rows={2} />
          <FieldTextarea label='Note' value={pageContent.cta.note} onChange={(note) => updateCta({ note })} rows={2} />
        </FormSection>
      </div>

      <FormSection title='Footer' gridClassName='md:grid-cols-2'>
        <FieldInput label='Brand name' value={pageContent.footer.brandName} onChange={(brandName) => updateFooter({ brandName })} />
        <FieldInput label='Copyright' value={pageContent.footer.copyright} onChange={(copyright) => updateFooter({ copyright })} />
        <FieldTextarea label='Address' value={pageContent.footer.address} onChange={(address) => updateFooter({ address })} rows={3} />
        <FieldTextarea label='Tagline' value={pageContent.footer.tagline} onChange={(tagline) => updateFooter({ tagline })} rows={3} />
      </FormSection>
    </div>
  );
}

function ProjectsTab({
  projects,
  onAdd,
  onRemove,
  onUpdate,
}: {
  projects: MilkbarProjectCmsRecord[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, patch: Partial<MilkbarProjectCmsRecord>) => void;
}): React.JSX.Element {
  return (
    <FormSection
      title='Projects'
      subtitle={`${projects.length} project records`}
      actions={
        <Button type='button' size='sm' variant='secondary' icon={<Plus className='size-4' />} onClick={onAdd}>
          Add Project
        </Button>
      }
    >
      {projects.map((project, index) => (
        <div key={`${project.code}-${index}`} className='space-y-3 rounded-md border border-white/10 p-4'>
          <div className='flex items-center justify-between gap-3'>
            <SectionTitle title={project.name || project.code} subtitle={project.code} />
            <Button type='button' variant='destructive' size='sm' icon={<Trash2 className='size-4' />} onClick={() => onRemove(index)}>
              Remove
            </Button>
          </div>
          <div className='grid gap-3 md:grid-cols-3'>
            <FieldInput label='Code' value={project.code} onChange={(code) => onUpdate(index, { code })} />
            <FieldInput label='Name' value={project.name} onChange={(name) => onUpdate(index, { name })} />
            <FormField label='Status'>
              <select
                className='h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground'
                value={project.status}
                onChange={(event) => onUpdate(index, { status: event.target.value === 'draft' ? 'draft' : 'published' })}
              >
                <option value='published'>Published</option>
                <option value='draft'>Draft</option>
              </select>
            </FormField>
            <FieldInput label='Type' value={project.projectType} onChange={(projectType) => onUpdate(index, { projectType })} />
            <FieldInput label='City' value={project.city} onChange={(city) => onUpdate(index, { city })} />
            <FieldInput label='Country' value={project.country} onChange={(country) => onUpdate(index, { country })} />
            <FieldInput label='Order' value={project.order} onChange={(order) => onUpdate(index, { order: Number(order) || 0 })} />
            <div className='md:col-span-2'>
              <FieldTextarea label='Stats' value={linesToText(project.stats)} onChange={(value) => onUpdate(index, { stats: textToLines(value) })} rows={3} />
            </div>
            <div className='md:col-span-3'>
              <FieldTextarea label='Description' value={project.description} onChange={(description) => onUpdate(index, { description })} rows={3} />
            </div>
          </div>
        </div>
      ))}
    </FormSection>
  );
}

function ServicesTab({
  services,
  onAdd,
  onRemove,
  onUpdate,
}: {
  services: MilkbarServiceCmsRecord[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, patch: Partial<MilkbarServiceCmsRecord>) => void;
}): React.JSX.Element {
  return (
    <FormSection
      title='Services'
      subtitle={`${services.length} service records`}
      actions={
        <Button type='button' size='sm' variant='secondary' icon={<Plus className='size-4' />} onClick={onAdd}>
          Add Service
        </Button>
      }
    >
      {services.map((service, index) => (
        <div key={`${service.code}-${index}`} className='space-y-3 rounded-md border border-white/10 p-4'>
          <div className='flex items-center justify-between gap-3'>
            <SectionTitle title={service.title || service.code} subtitle={service.code} />
            <Button type='button' variant='destructive' size='sm' icon={<Trash2 className='size-4' />} onClick={() => onRemove(index)}>
              Remove
            </Button>
          </div>
          <div className='grid gap-3 md:grid-cols-[8rem_minmax(0,1fr)_8rem]'>
            <FieldInput label='Code' value={service.code} onChange={(code) => onUpdate(index, { code })} />
            <FieldInput label='Title' value={service.title} onChange={(title) => onUpdate(index, { title })} />
            <FieldInput label='Order' value={service.order} onChange={(order) => onUpdate(index, { order: Number(order) || 0 })} />
            <div className='md:col-span-3'>
              <FieldTextarea label='Description' value={service.description} onChange={(description) => onUpdate(index, { description })} rows={3} />
            </div>
          </div>
        </div>
      ))}
    </FormSection>
  );
}

function InquiriesTab({ snapshot }: { snapshot: MilkbarCmsSnapshot | null }): React.JSX.Element {
  const inquiries = snapshot?.inquiries ?? [];
  return (
    <FormSection title='Inquiries' subtitle={`${inquiries.length} latest records from arch_web_local`}>
      {inquiries.length === 0 ? (
        <p className='text-sm text-muted-foreground'>No inquiries found.</p>
      ) : (
        <div className='overflow-hidden rounded-md border border-white/10'>
          <table className='w-full text-left text-sm'>
            <thead className='bg-white/5 text-xs uppercase text-muted-foreground'>
              <tr>
                <th className='px-3 py-2'>Email</th>
                <th className='px-3 py-2'>Status</th>
                <th className='px-3 py-2'>Source</th>
                <th className='px-3 py-2'>Created</th>
              </tr>
            </thead>
            <tbody>
              {inquiries.map((inquiry) => (
                <tr key={`${inquiry.email}-${inquiry.createdAt}`} className='border-t border-white/10'>
                  <td className='px-3 py-2 text-white'>{inquiry.email}</td>
                  <td className='px-3 py-2'><Badge>{inquiry.status}</Badge></td>
                  <td className='px-3 py-2 text-muted-foreground'>{inquiry.source}</td>
                  <td className='px-3 py-2 text-muted-foreground'>{inquiry.createdAt ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </FormSection>
  );
}

function StatusTab({ snapshot }: { snapshot: MilkbarCmsSnapshot | null }): React.JSX.Element {
  return (
    <div className='grid gap-4 lg:grid-cols-2'>
      <FormSection title='Database Sources'>
        <div className='space-y-3 text-sm'>
          <div className='rounded-md border border-white/10 p-3'>
            <div className='font-medium text-white'>Local</div>
            <div className='mt-1 text-muted-foreground'>{snapshot?.sourceStatus.local.uriLabel ?? 'Not configured'}</div>
            <div className='mt-1 text-xs text-muted-foreground'>DB: {snapshot?.sourceStatus.local.dbName ?? '-'}</div>
          </div>
          <div className='rounded-md border border-white/10 p-3'>
            <div className='font-medium text-white'>Cloud</div>
            <div className='mt-1 text-muted-foreground'>{snapshot?.sourceStatus.cloud.uriLabel ?? 'Not configured'}</div>
            <div className='mt-1 text-xs text-muted-foreground'>DB: {snapshot?.sourceStatus.cloud.dbName ?? '-'}</div>
          </div>
        </div>
      </FormSection>
      <FormSection title='Record Counts'>
        <div className='grid gap-3 sm:grid-cols-3'>
          <CountBox label='Projects' value={snapshot?.counts.projects ?? 0} />
          <CountBox label='Services' value={snapshot?.counts.services ?? 0} />
          <CountBox label='Inquiries' value={snapshot?.counts.inquiries ?? 0} />
        </div>
        <p className='text-xs text-muted-foreground'>Last page content update: {snapshot?.updatedAt ?? 'not saved yet'}</p>
      </FormSection>
    </div>
  );
}

function CountBox({ label, value }: { label: string; value: number }): React.JSX.Element {
  return (
    <div className='rounded-md border border-white/10 p-3'>
      <div className='text-2xl font-semibold text-white'>{value}</div>
      <div className='text-xs uppercase tracking-wide text-muted-foreground'>{label}</div>
    </div>
  );
}
