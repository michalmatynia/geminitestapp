'use client';

/* eslint-disable max-lines, max-lines-per-function, complexity */

import { Box, Camera, ChevronDown, ChevronUp, Copy, Download, Eye, Globe, Library, Plus, RefreshCw, Save, Settings2, Trash2, Upload, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Admin3DAssetsPage } from '@/features/viewer3d/admin.public';
import { MediaLibraryPanel } from '@/features/cms/components/page-builder/MediaLibraryPanel';
import { useUploadCmsMedia } from '@/features/cms/hooks/useCmsQueries';
import { uploadAsset3DFile } from '@/features/viewer3d/api';
import { useAsset3DById, useAssets3D } from '@/features/viewer3d/hooks/useAsset3dQueries';
import type { ImageFileSelection } from '@/shared/contracts/files';
import type { ManagedImageSlot } from '@/shared/contracts/image-slots';
import type { ProductImageManagerController } from '@/shared/contracts/product-image-manager';
import type { Asset3DRecord } from '@/shared/contracts/viewer3d';
import { Viewer3D } from '@/features/viewer3d/components/Viewer3D';
import type { OrbitControlsHandle } from '@/features/viewer3d/components/Viewer3D';
import { Viewer3DSettingsPanel } from '@/features/viewer3d/components/Viewer3DSettingsPanel';
import { Viewer3DStatusInfo } from '@/features/viewer3d/components/Viewer3DStatusInfo';
import { Viewer3DProvider } from '@/features/viewer3d/context/Viewer3DContext';
import { DetailModal } from '@/shared/ui/templates/modals';

import {
  DEFAULT_MILKBAR_LOCALIZED_CONTENT,
  DEFAULT_MILKBAR_PAGE_SETTINGS,
  MILKBAR_LOCALE_LABELS,
  MILKBAR_LOCALES,
  type MilkbarCmsSnapshot,
  type MilkbarLinkItem,
  type MilkbarLocale,
  type MilkbarLocalizedContent,
  type MilkbarMetric,
  type MilkbarPageContent,
  type MilkbarPageSettings,
  type MilkbarPrinciple,
  type MilkbarProcessStep,
  type MilkbarProjectCmsRecord,
  type MilkbarSectionVisibility,
  type MilkbarSeoMeta,
  type MilkbarServiceCmsRecord,
} from './milkbar-cms.types';
import type { MutationResult, SingleQuery } from '@/shared/contracts/ui/queries';
import { api } from '@/shared/lib/api-client';
import {
  MILKBAR_CMS_VISUALISATION_FOLDER,
} from '@/shared/lib/files/constants';
import { useMutationV2, useSingleQueryV2 } from '@/shared/lib/query-factories-v2';
import { AdminPageManagerLayout } from '@/shared/ui/admin.public';
import { Alert, Badge, Button, Input, Switch, Textarea, useToast } from '@/shared/ui/primitives.public';
import { FormField, FormSection } from '@/shared/ui/forms-and-actions.public';
import { ProductImageManager } from '@/shared/ui/image-slot-manager';
import { LoadingPanel } from '@/shared/ui/navigation-and-layout.public';

const ENDPOINT = '/api/v2/page-manager/milkbardesigners';
const PUSH_ENDPOINT = '/api/v2/page-manager/milkbardesigners/push-to-cloud';
const MILKBAR_CMS_SNAPSHOT_QUERY_KEY = ['page-manager', 'milkbardesigners', 'snapshot'] as const;

const TABS = [
  { label: 'Page Content', value: 'content' },
  { label: 'Projects', value: 'projects' },
  { label: 'Services', value: 'services' },
  { label: 'Inquiries', value: 'inquiries' },
  { label: '3D Assets', value: '3d-assets' },
  { label: 'Settings', value: 'settings' },
  { label: 'Sync Status', value: 'status' },
] as const;

type MilkbarCmsTab = (typeof TABS)[number]['value'];
type MilkbarCmsSavePayload = Pick<
  MilkbarCmsSnapshot,
  'localizedContent' | 'pageSettings' | 'projects' | 'services'
>;
type MilkbarInquiryStatusUpdate = {
  email: string;
  status: 'pending' | 'contacted';
};
type MilkbarInquiryStatusUpdateResponse = {
  ok: boolean;
};

const linesToText = (lines: string[]): string => lines.join('\n');
const textToLines = (value: string): string[] =>
  value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const toOrderNumber = (value: string): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const ROMAN = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'] as const;
const toRoman = (n: number): string => ROMAN[n - 1] ?? String(n);

const getMetaDescriptionHint = (len: number): string => {
  if (len > 160) return ' ⚠ too long';
  if (len < 120) return ' ↑ too short';
  return '';
};

const exportInquiriesCsv = (inquiries: MilkbarCmsSnapshot['inquiries']): void => {
  const header = 'email,status,locale,source,createdAt';
  const rows = inquiries.map((i) =>
    [i.email, i.status, i.locale ?? '', i.source, i.createdAt ?? '']
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(',')
  );
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `milkbar-inquiries-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

const getSeoDisplayTitle = (title: string): string => {
  if (title.length > 60) return `${title.slice(0, 60)}…`;
  if (title.length > 0) return title;
  return 'Untitled page';
};

const getSeoDisplayDesc = (description: string): string => {
  if (description.length > 160) return `${description.slice(0, 160)}…`;
  if (description.length > 0) return description;
  return 'No description set.';
};

const getLocaleStatusDotClassName = ({
  isPublished,
  isUntranslated,
}: {
  isPublished: boolean;
  isUntranslated: boolean;
}): string => {
  if (isUntranslated) return 'bg-amber-400';
  if (isPublished) return 'bg-emerald-500';
  return 'bg-white/20';
};

const getLocaleStatusLabel = ({
  isPublished,
  isUntranslated,
}: {
  isPublished: boolean;
  isUntranslated: boolean;
}): string => {
  if (isUntranslated) return 'Not translated - identical to EN';
  if (isPublished) return 'Published';
  return 'Draft';
};

const getInquiryStatusActionLabel = (
  isLoading: boolean,
  status: 'pending' | 'contacted'
): string => {
  if (isLoading) return '...';
  if (status === 'contacted') return 'Mark pending';
  return 'Mark contacted';
};

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
  emphasis: '',
  description: 'Service description pending.',
  order: index,
});

const fetchMilkbarCmsSnapshot = async (): Promise<MilkbarCmsSnapshot> =>
  api.get<MilkbarCmsSnapshot>(ENDPOINT);

const saveMilkbarCmsSnapshot = async (
  payload: MilkbarCmsSavePayload
): Promise<MilkbarCmsSnapshot> =>
  api.put<MilkbarCmsSnapshot>(ENDPOINT, payload, { timeout: 120_000 });

const updateMilkbarInquiryStatus = async (
  payload: MilkbarInquiryStatusUpdate
): Promise<MilkbarInquiryStatusUpdateResponse> =>
  api.patch<MilkbarInquiryStatusUpdateResponse>(ENDPOINT, payload);

const useMilkbarCmsSnapshotQuery = (): SingleQuery<MilkbarCmsSnapshot> =>
  useSingleQueryV2<
    MilkbarCmsSnapshot,
    MilkbarCmsSnapshot,
    typeof MILKBAR_CMS_SNAPSHOT_QUERY_KEY
  >({
    id: 'milkbardesigners-cms',
    queryKey: MILKBAR_CMS_SNAPSHOT_QUERY_KEY,
    queryFn: fetchMilkbarCmsSnapshot,
    meta: {
      source: 'features.page-manager.milkbardesigners.snapshot',
      operation: 'detail',
      resource: 'page-manager.milkbardesigners.cms',
      domain: 'cms',
      description: 'Loads Milkbardesigners CMS source-of-truth snapshot.',
      errorPresentation: 'inline',
      tags: ['page-manager', 'milkbardesigners'],
    },
  });

const useSaveMilkbarCmsSnapshotMutation = (): MutationResult<
  MilkbarCmsSnapshot,
  MilkbarCmsSavePayload
> =>
  useMutationV2({
    mutationKey: ['page-manager', 'milkbardesigners', 'save'],
    mutationFn: saveMilkbarCmsSnapshot,
    meta: {
      source: 'features.page-manager.milkbardesigners.save',
      operation: 'update',
      resource: 'page-manager.milkbardesigners.cms',
      domain: 'cms',
      description: 'Saves Milkbardesigners CMS content to source and runtime databases.',
      errorPresentation: 'toast',
      tags: ['page-manager', 'milkbardesigners'],
    },
  });

const useUpdateMilkbarInquiryStatusMutation = (): MutationResult<
  MilkbarInquiryStatusUpdateResponse,
  MilkbarInquiryStatusUpdate
> =>
  useMutationV2({
    mutationKey: ['page-manager', 'milkbardesigners', 'inquiry-status'],
    mutationFn: updateMilkbarInquiryStatus,
    meta: {
      source: 'features.page-manager.milkbardesigners.inquiryStatus',
      operation: 'update',
      resource: 'page-manager.milkbardesigners.inquiries',
      domain: 'cms',
      description: 'Updates Milkbardesigners runtime inquiry status.',
      errorPresentation: 'toast',
      tags: ['page-manager', 'milkbardesigners', 'inquiries'],
    },
  });

type PushToCloudOutcome = {
  ok: boolean;
  jobId: string | null;
  mode: 'queue' | 'inline' | 'no-redis';
  triggeredAt: string;
  result?: { projectCount: number; serviceCount: number; updatedAt: string };
  error?: string;
};

type PushJobStatus = {
  ok: boolean;
  jobStatus: {
    state: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'unknown';
    progress: { step: number; total: number; phase: string; message: string } | null;
    failedReason?: string;
    result?: { projectCount: number; serviceCount: number; updatedAt: string };
  } | null;
};

const triggerPushToCloud = async (): Promise<PushToCloudOutcome> =>
  api.post<PushToCloudOutcome>(PUSH_ENDPOINT, {});

const fetchJobStatus = async (jobId: string): Promise<PushJobStatus> =>
  api.get<PushJobStatus>(`${PUSH_ENDPOINT}?jobId=${encodeURIComponent(jobId)}`);

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
      {subtitle !== undefined && subtitle.length > 0 ? (
        <p className='text-xs text-muted-foreground'>{subtitle}</p>
      ) : null}
    </div>
  );
}

function LocaleSwitcher({
  activeLocale,
  onLocaleChange,
  publishedLocales,
  untranslatedLocales,
}: {
  activeLocale: MilkbarLocale;
  onLocaleChange: (locale: MilkbarLocale) => void;
  publishedLocales: MilkbarLocale[];
  untranslatedLocales?: Set<MilkbarLocale>;
}): React.JSX.Element {
  return (
    <div className='flex items-center gap-1 rounded-md border border-white/10 bg-white/5 p-1'>
      {MILKBAR_LOCALES.map((locale) => {
        const isPublished = publishedLocales.includes(locale);
        const isUntranslated = locale !== 'en' && (untranslatedLocales?.has(locale) ?? false);
        const localeStatus = { isPublished, isUntranslated };
        return (
          <button
            key={locale}
            type='button'
            onClick={() => onLocaleChange(locale)}
            className={`relative flex items-center gap-1.5 rounded px-3 py-1 text-xs font-semibold uppercase tracking-widest transition-colors ${
              activeLocale === locale
                ? 'bg-white/15 text-white'
                : 'text-muted-foreground hover:text-white'
            }`}
          >
            {locale}
            <span
              className={`inline-block size-1.5 rounded-full ${getLocaleStatusDotClassName(localeStatus)}`}
              title={getLocaleStatusLabel(localeStatus)}
            />
          </button>
        );
      })}
    </div>
  );
}

export function AdminMilkbarDesignersCmsPage(): React.JSX.Element {
  const { toast } = useToast();
  const snapshotQuery = useMilkbarCmsSnapshotQuery();
  const saveSnapshotMutation = useSaveMilkbarCmsSnapshotMutation();
  const inquiryStatusMutation = useUpdateMilkbarInquiryStatusMutation();
  const [activeTab, setActiveTab] = useState<MilkbarCmsTab>('content');
  const [activeLocale, setActiveLocale] = useState<MilkbarLocale>('en');
  const [snapshot, setSnapshot] = useState<MilkbarCmsSnapshot | null>(null);
  const [localizedContent, setLocalizedContent] = useState<MilkbarLocalizedContent>(DEFAULT_MILKBAR_LOCALIZED_CONTENT);
  const [pageSettings, setPageSettings] = useState<MilkbarPageSettings>(DEFAULT_MILKBAR_PAGE_SETTINGS);
  const [projects, setProjects] = useState<MilkbarProjectCmsRecord[]>([]);
  const [services, setServices] = useState<MilkbarServiceCmsRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  const applySnapshot = useCallback((nextSnapshot: MilkbarCmsSnapshot): void => {
    setError(null);
    setSnapshot(nextSnapshot);
    setLocalizedContent(nextSnapshot.localizedContent);
    setPageSettings(nextSnapshot.pageSettings);
    setProjects(nextSnapshot.projects);
    setServices(nextSnapshot.services);
  }, []);

  useEffect(() => {
    if (snapshotQuery.data !== undefined) {
      applySnapshot(snapshotQuery.data);
    }
  }, [applySnapshot, snapshotQuery.data]);

  useEffect(() => {
    if (snapshotQuery.error !== null) {
      setError(toErrorMessage(snapshotQuery.error));
    }
  }, [snapshotQuery.error]);

  const isLoading = snapshotQuery.isLoading && snapshot === null;
  const isRefreshing = snapshotQuery.isFetching;
  const isSaving = saveSnapshotMutation.isPending;

  const saveSnapshot = useCallback(async (): Promise<void> => {
    setError(null);
    try {
      const nextSnapshot = await saveSnapshotMutation.mutateAsync({
        localizedContent,
        pageSettings,
        projects,
        services,
      });
      applySnapshot(nextSnapshot);
      toast('Milkbardesigners CMS saved.', { variant: 'success' });
    } catch (saveError) {
      const message = toErrorMessage(saveError);
      setError(message);
      toast(message, { variant: 'error' });
    }
  }, [
    applySnapshot,
    localizedContent,
    pageSettings,
    projects,
    saveSnapshotMutation,
    services,
    toast,
  ]);

  const handleRefreshClick = useCallback((): void => {
    setError(null);
    void snapshotQuery.refetch().catch((refreshError: unknown) => {
      setError(toErrorMessage(refreshError));
    });
  }, [snapshotQuery]);

  const handleSaveClick = useCallback((): void => {
    saveSnapshot().catch(() => undefined);
  }, [saveSnapshot]);

  // ── Locale-aware content updaters ──────────────────────────────────────────

  const updateLocaleSection = useCallback(
    <K extends keyof MilkbarPageContent>(
      locale: MilkbarLocale,
      section: K,
      patch: Partial<MilkbarPageContent[K]>
    ): void => {
      setLocalizedContent((current) => ({
        ...current,
        [locale]: {
          ...current[locale],
          [section]: { ...(current[locale][section] as object), ...patch },
        },
      }));
    },
    []
  );

  const updateNav = useCallback(
    (patch: Partial<MilkbarPageContent['nav']>) => updateLocaleSection(activeLocale, 'nav', patch),
    [activeLocale, updateLocaleSection]
  );

  const updateNavLink = useCallback(
    (index: number, patch: Partial<MilkbarLinkItem>): void => {
      setLocalizedContent((current) => ({
        ...current,
        [activeLocale]: {
          ...current[activeLocale],
          nav: {
            ...current[activeLocale].nav,
            links: current[activeLocale].nav.links.map((l, i) => i === index ? { ...l, ...patch } : l),
          },
        },
      }));
    },
    [activeLocale]
  );

  const addNavLink = useCallback((): void => {
    setLocalizedContent((current) => ({
      ...current,
      [activeLocale]: {
        ...current[activeLocale],
        nav: {
          ...current[activeLocale].nav,
          links: [...current[activeLocale].nav.links, { label: 'new link', href: '#section' }],
        },
      },
    }));
  }, [activeLocale]);

  const removeNavLink = useCallback((index: number): void => {
    setLocalizedContent((current) => ({
      ...current,
      [activeLocale]: {
        ...current[activeLocale],
        nav: {
          ...current[activeLocale].nav,
          links: current[activeLocale].nav.links.filter((_, i) => i !== index),
        },
      },
    }));
  }, [activeLocale]);

  const updateHero = useCallback(
    (patch: Partial<MilkbarPageContent['hero']>) => updateLocaleSection(activeLocale, 'hero', patch),
    [activeLocale, updateLocaleSection]
  );
  const updateDrawing = useCallback(
    (patch: Partial<MilkbarPageContent['drawing']>) => updateLocaleSection(activeLocale, 'drawing', patch),
    [activeLocale, updateLocaleSection]
  );
  const updatePhilosophy = useCallback(
    (patch: Partial<MilkbarPageContent['philosophy']>) => updateLocaleSection(activeLocale, 'philosophy', patch),
    [activeLocale, updateLocaleSection]
  );
  const updateServicesHeader = useCallback(
    (patch: Partial<MilkbarPageContent['services']>) => updateLocaleSection(activeLocale, 'services', patch),
    [activeLocale, updateLocaleSection]
  );
  const updateProjectsHeader = useCallback(
    (patch: Partial<MilkbarPageContent['projects']>) => updateLocaleSection(activeLocale, 'projects', patch),
    [activeLocale, updateLocaleSection]
  );
  const updateProcess = useCallback(
    (patch: Partial<MilkbarPageContent['process']>) => updateLocaleSection(activeLocale, 'process', patch),
    [activeLocale, updateLocaleSection]
  );
  const updateCaseStudy = useCallback(
    (patch: Partial<MilkbarPageContent['caseStudy']>) => updateLocaleSection(activeLocale, 'caseStudy', patch),
    [activeLocale, updateLocaleSection]
  );

  const updateCaseStudyStat = useCallback(
    (index: number, patch: Partial<MilkbarMetric>): void => {
      setLocalizedContent((current) => {
        const stats = current[activeLocale].caseStudy.stats.map((s, i) =>
          i === index ? { ...s, ...patch } : s
        );
        return {
          ...current,
          [activeLocale]: {
            ...current[activeLocale],
            caseStudy: { ...current[activeLocale].caseStudy, stats },
          },
        };
      });
    },
    [activeLocale]
  );

  const updateQuote = useCallback(
    (patch: Partial<MilkbarPageContent['quote']>) => updateLocaleSection(activeLocale, 'quote', patch),
    [activeLocale, updateLocaleSection]
  );
  const updateCta = useCallback(
    (patch: Partial<MilkbarPageContent['cta']>) => updateLocaleSection(activeLocale, 'cta', patch),
    [activeLocale, updateLocaleSection]
  );
  const updateFooter = useCallback(
    (patch: Partial<MilkbarPageContent['footer']>) => updateLocaleSection(activeLocale, 'footer', patch),
    [activeLocale, updateLocaleSection]
  );

  const updatePrinciple = useCallback(
    (index: number, patch: Partial<MilkbarPrinciple>): void => {
      setLocalizedContent((current) => {
        const principles = current[activeLocale].philosophy.principles.map((p, i) =>
          i === index ? { ...p, ...patch } : p
        );
        return {
          ...current,
          [activeLocale]: {
            ...current[activeLocale],
            philosophy: { ...current[activeLocale].philosophy, principles },
          },
        };
      });
    },
    [activeLocale]
  );

  const updateProcessStep = useCallback(
    (index: number, patch: Partial<MilkbarProcessStep>): void => {
      setLocalizedContent((current) => {
        const steps = current[activeLocale].process.steps.map((s, i) =>
          i === index ? { ...s, ...patch } : s
        );
        return {
          ...current,
          [activeLocale]: {
            ...current[activeLocale],
            process: { ...current[activeLocale].process, steps },
          },
        };
      });
    },
    [activeLocale]
  );

  const updateMetric = useCallback(
    (index: number, patch: Partial<MilkbarMetric>): void => {
      setLocalizedContent((current) => {
        const metrics = current[activeLocale].metrics.map((m, i) =>
          i === index ? { ...m, ...patch } : m
        );
        return { ...current, [activeLocale]: { ...current[activeLocale], metrics } };
      });
    },
    [activeLocale]
  );

  const addMetric = useCallback((): void => {
    setLocalizedContent((current) => ({
      ...current,
      [activeLocale]: {
        ...current[activeLocale],
        metrics: [...current[activeLocale].metrics, { value: '0', suffix: '', label: 'New metric' }],
      },
    }));
  }, [activeLocale]);

  const removeMetric = useCallback((index: number): void => {
    setLocalizedContent((current) => ({
      ...current,
      [activeLocale]: {
        ...current[activeLocale],
        metrics: current[activeLocale].metrics.filter((_, i) => i !== index),
      },
    }));
  }, [activeLocale]);

  const addProcessStep = useCallback((): void => {
    setLocalizedContent((current) => {
      const steps = current[activeLocale].process.steps;
      const next: MilkbarProcessStep = {
        number: `${toRoman(steps.length + 1)}.`,
        title: 'New step',
        description: 'Step description.',
      };
      return {
        ...current,
        [activeLocale]: {
          ...current[activeLocale],
          process: { ...current[activeLocale].process, steps: [...steps, next] },
        },
      };
    });
  }, [activeLocale]);

  const removeProcessStep = useCallback((index: number): void => {
    setLocalizedContent((current) => ({
      ...current,
      [activeLocale]: {
        ...current[activeLocale],
        process: {
          ...current[activeLocale].process,
          steps: current[activeLocale].process.steps.filter((_, i) => i !== index),
        },
      },
    }));
  }, [activeLocale]);

  const addPrinciple = useCallback((): void => {
    setLocalizedContent((current) => {
      const principles = current[activeLocale].philosophy.principles;
      const next: MilkbarPrinciple = {
        number: `${toRoman(principles.length + 1)}.`,
        title: 'New principle',
        emphasis: '- principle',
        description: 'Principle description.',
      };
      return {
        ...current,
        [activeLocale]: {
          ...current[activeLocale],
          philosophy: { ...current[activeLocale].philosophy, principles: [...principles, next] },
        },
      };
    });
  }, [activeLocale]);

  const removePrinciple = useCallback((index: number): void => {
    setLocalizedContent((current) => ({
      ...current,
      [activeLocale]: {
        ...current[activeLocale],
        philosophy: {
          ...current[activeLocale].philosophy,
          principles: current[activeLocale].philosophy.principles.filter((_, i) => i !== index),
        },
      },
    }));
  }, [activeLocale]);

  const addCaseStudyStat = useCallback((): void => {
    setLocalizedContent((current) => ({
      ...current,
      [activeLocale]: {
        ...current[activeLocale],
        caseStudy: {
          ...current[activeLocale].caseStudy,
          stats: [...current[activeLocale].caseStudy.stats, { value: '0', suffix: '', label: 'New stat' }],
        },
      },
    }));
  }, [activeLocale]);

  const removeCaseStudyStat = useCallback((index: number): void => {
    setLocalizedContent((current) => ({
      ...current,
      [activeLocale]: {
        ...current[activeLocale],
        caseStudy: {
          ...current[activeLocale].caseStudy,
          stats: current[activeLocale].caseStudy.stats.filter((_, i) => i !== index),
        },
      },
    }));
  }, [activeLocale]);

  const updateFooterColumnTitle = useCallback(
    (colIndex: number, title: string): void => {
      setLocalizedContent((current) => {
        const columns = current[activeLocale].footer.columns.map((col, i) =>
          i === colIndex ? { ...col, title } : col
        );
        return {
          ...current,
          [activeLocale]: {
            ...current[activeLocale],
            footer: { ...current[activeLocale].footer, columns },
          },
        };
      });
    },
    [activeLocale]
  );

  const updateFooterLink = useCallback(
    (colIndex: number, linkIndex: number, patch: Partial<MilkbarLinkItem>): void => {
      setLocalizedContent((current) => {
        const columns = current[activeLocale].footer.columns.map((col, ci) => {
          if (ci !== colIndex) return col;
          const links = col.links.map((link, li) =>
            li === linkIndex ? { ...link, ...patch } : link
          );
          return { ...col, links };
        });
        return {
          ...current,
          [activeLocale]: {
            ...current[activeLocale],
            footer: { ...current[activeLocale].footer, columns },
          },
        };
      });
    },
    [activeLocale]
  );

  const addFooterLink = useCallback(
    (colIndex: number): void => {
      setLocalizedContent((current) => {
        const columns = current[activeLocale].footer.columns.map((col, ci) =>
          ci === colIndex
            ? { ...col, links: [...col.links, { label: 'New link', href: '#' }] }
            : col
        );
        return {
          ...current,
          [activeLocale]: {
            ...current[activeLocale],
            footer: { ...current[activeLocale].footer, columns },
          },
        };
      });
    },
    [activeLocale]
  );

  const removeFooterLink = useCallback(
    (colIndex: number, linkIndex: number): void => {
      setLocalizedContent((current) => {
        const columns = current[activeLocale].footer.columns.map((col, ci) => {
          if (ci !== colIndex) return col;
          const links = col.links.filter((_, li) => li !== linkIndex);
          return { ...col, links };
        });
        return {
          ...current,
          [activeLocale]: {
            ...current[activeLocale],
            footer: { ...current[activeLocale].footer, columns },
          },
        };
      });
    },
    [activeLocale]
  );

  const addFooterColumn = useCallback((): void => {
    setLocalizedContent((current) => ({
      ...current,
      [activeLocale]: {
        ...current[activeLocale],
        footer: {
          ...current[activeLocale].footer,
          columns: [
            ...current[activeLocale].footer.columns,
            { title: 'New column', links: [{ label: 'Link', href: '#' }] },
          ],
        },
      },
    }));
  }, [activeLocale]);

  const removeFooterColumn = useCallback((colIndex: number): void => {
    setLocalizedContent((current) => ({
      ...current,
      [activeLocale]: {
        ...current[activeLocale],
        footer: {
          ...current[activeLocale].footer,
          columns: current[activeLocale].footer.columns.filter((_, ci) => ci !== colIndex),
        },
      },
    }));
  }, [activeLocale]);

  const updateProject = useCallback(
    (index: number, patch: Partial<MilkbarProjectCmsRecord>): void => {
      setProjects((current) =>
        current.map((project, i) => (i === index ? { ...project, ...patch } : project))
      );
    },
    []
  );

  const updateService = useCallback(
    (index: number, patch: Partial<MilkbarServiceCmsRecord>): void => {
      setServices((current) =>
        current.map((service, i) => (i === index ? { ...service, ...patch } : service))
      );
    },
    []
  );

  // ── Settings updaters ───────────────────────────────────────────────────────

  const updateVisibility = useCallback((patch: Partial<MilkbarSectionVisibility>): void => {
    setPageSettings((current) => ({
      ...current,
      visibility: { ...current.visibility, ...patch },
    }));
  }, []);

  const updateSeo = useCallback((locale: MilkbarLocale, patch: Partial<MilkbarSeoMeta>): void => {
    setPageSettings((current) => ({
      ...current,
      seo: { ...current.seo, [locale]: { ...current.seo[locale], ...patch } },
    }));
  }, []);

  const updateDefaultLocale = useCallback((locale: MilkbarLocale): void => {
    setPageSettings((current) => ({ ...current, defaultLocale: locale }));
  }, []);

  const togglePublishedLocale = useCallback((locale: MilkbarLocale, published: boolean): void => {
    setPageSettings((current) => {
      const next = published
        ? [...new Set([...current.publishedLocales, locale])]
        : current.publishedLocales.filter((l) => l !== locale);
      return { ...current, publishedLocales: next.length > 0 ? next : [locale] };
    });
  }, []);

  const handleInquiryStatusChange = useCallback(
    async (email: string, status: 'pending' | 'contacted'): Promise<void> => {
      try {
        await inquiryStatusMutation.mutateAsync({ email, status });
        await snapshotQuery.refetch();
      } catch (patchError) {
        toast(toErrorMessage(patchError), { variant: 'error' });
      }
    },
    [inquiryStatusMutation, snapshotQuery, toast]
  );

  const untranslatedLocales = useMemo((): Set<MilkbarLocale> => {
    const enJson = JSON.stringify(localizedContent.en);
    return new Set(
      MILKBAR_LOCALES.filter((l) => l !== 'en' && JSON.stringify(localizedContent[l]) === enJson)
    );
  }, [localizedContent]);

  const handleCopyFromEn = useCallback((): void => {
    if (activeLocale === 'en') return;
    setLocalizedContent((current) => ({
      ...current,
      [activeLocale]: { ...current.en },
    }));
    toast(`Copied English content to ${MILKBAR_LOCALE_LABELS[activeLocale]}.`, { variant: 'success' });
  }, [activeLocale, toast]);

  const isDirty = useMemo((): boolean => {
    if (snapshot === null) return false;
    return (
      JSON.stringify(localizedContent) !== JSON.stringify(snapshot.localizedContent) ||
      JSON.stringify(pageSettings) !== JSON.stringify(snapshot.pageSettings) ||
      JSON.stringify(projects) !== JSON.stringify(snapshot.projects) ||
      JSON.stringify(services) !== JSON.stringify(snapshot.services)
    );
  }, [snapshot, localizedContent, pageSettings, projects, services]);

  const handleRevert = useCallback((): void => {
    if (snapshot === null) return;
    applySnapshot(snapshot);
    toast('Reverted to last saved state.', { variant: 'success' });
  }, [snapshot, applySnapshot, toast]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (!isSaving && !isRefreshing) handleSaveClick();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSaving, isRefreshing, handleSaveClick]);

  const headerDescription = useMemo(() => {
    if (activeTab === 'projects') return 'Manage Milkbar project cards and 3D project metadata.';
    if (activeTab === 'services') return 'Manage the practice/service entries shown on the architecture website.';
    if (activeTab === 'inquiries') return 'Review incoming Milkbar website inquiries.';
    if (activeTab === '3d-assets') return 'Upload and manage 3D models that can be assigned to projects.';
    if (activeTab === 'settings') return 'Section visibility, SEO metadata per locale, and publication controls.';
    if (activeTab === 'status') return 'Review Milkbar Mongo source configuration and record counts.';
    return 'Manage Milkbar page copy and section content.';
  }, [activeTab]);

  const activePageContent = localizedContent[activeLocale];

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
        activeTab === '3d-assets' ? null : (
          <div className='flex items-center gap-2'>
            {isDirty ? (
              <span className='flex items-center gap-1.5 text-xs text-amber-400'>
                <span className='inline-block size-1.5 rounded-full bg-amber-400' />
                Unsaved changes
              </span>
            ) : null}
            <Button
              type='button'
              variant='secondary'
              size='sm'
              icon={<RefreshCw className='size-4' />}
              onClick={handleRefreshClick}
              disabled={isRefreshing || isSaving}
            >
              Refresh
            </Button>
            {isDirty ? (
              <Button
                type='button'
                variant='secondary'
                size='sm'
                onClick={handleRevert}
                disabled={isSaving}
              >
                Revert
              </Button>
            ) : null}
            <Button
              type='button'
              variant='solid'
              size='sm'
              icon={<Save className='size-4' />}
              loading={isSaving}
              onClick={handleSaveClick}
              title='Save (⌘S)'
            >
              Save CMS
            </Button>
          </div>
        )
      }
    >
      {error !== null ? (
        <Alert variant='error' title='Milkbardesigners CMS error' description={error} />
      ) : null}
      {isLoading ? (
        <LoadingPanel>Loading Milkbardesigners CMS...</LoadingPanel>
      ) : (
        <div className='space-y-4'>
          {activeTab === 'content' ? (
            <>
              <div className='flex items-center gap-3'>
                <Globe className='size-4 text-muted-foreground' />
                <LocaleSwitcher
                  activeLocale={activeLocale}
                  onLocaleChange={setActiveLocale}
                  publishedLocales={pageSettings.publishedLocales}
                  untranslatedLocales={untranslatedLocales}
                />
                <span className='text-xs text-muted-foreground'>
                  Editing: <span className='font-medium text-white'>{MILKBAR_LOCALE_LABELS[activeLocale]}</span>
                </span>
                {activeLocale !== 'en' ? (
                  <Button
                    type='button'
                    variant='secondary'
                    size='sm'
                    icon={<Copy className='size-3.5' />}
                    onClick={handleCopyFromEn}
                  >
                    Copy from EN
                  </Button>
                ) : null}
              </div>
              <ContentTab
                pageContent={activePageContent}
                updateNav={updateNav}
                updateNavLink={updateNavLink}
                addNavLink={addNavLink}
                removeNavLink={removeNavLink}
                updateHero={updateHero}
                updateDrawing={updateDrawing}
                updatePhilosophy={updatePhilosophy}
                updateServicesHeader={updateServicesHeader}
                updateProjectsHeader={updateProjectsHeader}
                updateProcess={updateProcess}
                updateCaseStudy={updateCaseStudy}
                updateCaseStudyStat={updateCaseStudyStat}
                addCaseStudyStat={addCaseStudyStat}
                removeCaseStudyStat={removeCaseStudyStat}
                updateQuote={updateQuote}
                updateCta={updateCta}
                updateFooter={updateFooter}
                updateFooterColumnTitle={updateFooterColumnTitle}
                addFooterColumn={addFooterColumn}
                removeFooterColumn={removeFooterColumn}
                updateFooterLink={updateFooterLink}
                addFooterLink={addFooterLink}
                removeFooterLink={removeFooterLink}
                updatePrinciple={updatePrinciple}
                addPrinciple={addPrinciple}
                removePrinciple={removePrinciple}
                updateProcessStep={updateProcessStep}
                addProcessStep={addProcessStep}
                removeProcessStep={removeProcessStep}
                updateMetric={updateMetric}
                addMetric={addMetric}
                removeMetric={removeMetric}
              />
            </>
          ) : null}
          {activeTab === 'projects' ? (
            <ProjectsTab
              projects={projects}
              onAdd={() => setProjects((current) => [...current, newProject(current.length)])}
              onRemove={(index) =>
                setProjects((current) => current.filter((_, i) => i !== index))
              }
              onUpdate={updateProject}
              onDuplicate={(index) =>
                setProjects((current) => {
                  const src = current[index];
                  const clone = { ...src, code: `${src.code}-copy`, name: `${src.name} (copy)` };
                  const next = [...current];
                  next.splice(index + 1, 0, clone);
                  return next;
                })
              }
              onMoveUp={(index) =>
                setProjects((current) => {
                  if (index === 0) return current;
                  const next = [...current];
                  [next[index - 1], next[index]] = [next[index], next[index - 1]];
                  return next;
                })
              }
              onMoveDown={(index) =>
                setProjects((current) => {
                  if (index >= current.length - 1) return current;
                  const next = [...current];
                  [next[index], next[index + 1]] = [next[index + 1], next[index]];
                  return next;
                })
              }
            />
          ) : null}
          {activeTab === 'services' ? (
            <ServicesTab
              services={services}
              onAdd={() => setServices((current) => [...current, newService(current.length)])}
              onRemove={(index) =>
                setServices((current) => current.filter((_, i) => i !== index))
              }
              onUpdate={updateService}
              onDuplicate={(index) =>
                setServices((current) => {
                  const src = current[index];
                  const clone = { ...src, code: `${src.code}-copy`, title: `${src.title} (copy)` };
                  const next = [...current];
                  next.splice(index + 1, 0, clone);
                  return next;
                })
              }
              onMoveUp={(index) =>
                setServices((current) => {
                  if (index === 0) return current;
                  const next = [...current];
                  [next[index - 1], next[index]] = [next[index], next[index - 1]];
                  return next;
                })
              }
              onMoveDown={(index) =>
                setServices((current) => {
                  if (index >= current.length - 1) return current;
                  const next = [...current];
                  [next[index], next[index + 1]] = [next[index + 1], next[index]];
                  return next;
                })
              }
            />
          ) : null}
          {activeTab === 'inquiries' ? (
            <InquiriesTab snapshot={snapshot} onStatusChange={handleInquiryStatusChange} />
          ) : null}
          {activeTab === 'settings' ? (
            <SettingsTab
              pageSettings={pageSettings}
              onUpdateVisibility={updateVisibility}
              onUpdateSeo={updateSeo}
              onUpdateDefaultLocale={updateDefaultLocale}
              onTogglePublishedLocale={togglePublishedLocale}
            />
          ) : null}
          {activeTab === '3d-assets' ? <Admin3DAssetsPage uploadStorageProfile='milkbarCms' /> : null}
          {activeTab === 'status' ? <StatusTab snapshot={snapshot} localizedContent={localizedContent} /> : null}
        </div>
      )}
    </AdminPageManagerLayout>
  );
}

function PanelsIcon(): React.JSX.Element {
  return <span className='inline-block size-4 rounded border border-current/60' aria-hidden='true' />;
}

function CollapsibleSection({
  id,
  title,
  subtitle,
  actions,
  open,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  open: boolean;
  onToggle: (id: string) => void;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className='rounded-lg border border-white/10'>
      <div className='flex w-full items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-white/5'>
        <button
          type='button'
          onClick={() => onToggle(id)}
          className='flex min-w-0 flex-1 items-center gap-3 text-left'
          aria-expanded={open}
        >
          <div className='min-w-0'>
            <span className='text-sm font-semibold text-white'>{title}</span>
            {subtitle !== undefined && subtitle.length > 0 ? (
              <span className='ml-2 text-xs text-muted-foreground'>{subtitle}</span>
            ) : null}
          </div>
          <ChevronDown
            className={`size-4 shrink-0 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </button>
        {actions !== undefined && open ? (
          <div className='flex items-center gap-2'>{actions}</div>
        ) : null}
      </div>
      {open ? <div className='space-y-3 border-t border-white/10 p-4'>{children}</div> : null}
    </div>
  );
}

const DRAWING_IMAGE_SLOT_COUNT = 4;

const createDrawingImageSlotValues = (images: string[]): string[] =>
  Array.from({ length: DRAWING_IMAGE_SLOT_COUNT }, (_, index) => images[index]?.trim() ?? '');

const compactDrawingImageSlotValues = (values: string[]): string[] => {
  const next = values.slice(0, DRAWING_IMAGE_SLOT_COUNT).map((value) => value.trim());
  while (next.length > 0 && next[next.length - 1] === '') {
    next.pop();
  }
  return next;
};

const createDrawingImageSelection = (src: string, index: number): ImageFileSelection => ({
  id: `milkbar-drawing-image-${index}-${src}`,
  filepath: src,
  publicUrl: src,
  url: src,
  filename: src.split('/').pop() ?? `drawing-image-${index + 1}`,
});

const createDrawingManagedImageSlot = (
  src: string,
  index: number
): ManagedImageSlot => {
  const trimmed = src.trim();
  if (trimmed.length === 0) return null;
  return {
    type: 'existing',
    data: createDrawingImageSelection(trimmed, index),
    previewUrl: trimmed,
    slotId: `milkbar-drawing-image-slot-${index}`,
  };
};

function DrawingImageSlotsField({
  value,
  onChange,
}: {
  value: string[];
  onChange: (images: string[]) => void;
}): React.JSX.Element {
  const { toast } = useToast();
  const uploadMutation = useUploadCmsMedia();
  const [mediaOpen, setMediaOpen] = useState(false);
  const [activeSlotIndex, setActiveSlotIndex] = useState<number | null>(null);
  const slotValues = useMemo(() => createDrawingImageSlotValues(value), [value]);

  const setSlotValues = useCallback(
    (nextValues: string[]): void => {
      onChange(compactDrawingImageSlotValues(nextValues));
    },
    [onChange]
  );

  const setSlotValue = useCallback(
    (index: number, nextValue: string): void => {
      if (index < 0 || index >= DRAWING_IMAGE_SLOT_COUNT) return;
      const nextValues = createDrawingImageSlotValues(value);
      nextValues[index] = nextValue.trim();
      setSlotValues(nextValues);
    },
    [setSlotValues, value]
  );

  const fillSlotsWithFilepaths = useCallback(
    (filepaths: string[], preferredIndex: number | null): void => {
      const accepted = filepaths
        .map((filepath) => filepath.trim())
        .filter((filepath) => filepath.length > 0);
      if (accepted.length === 0) return;

      const nextValues = createDrawingImageSlotValues(value);
      let searchIndex = preferredIndex ?? 0;
      accepted.forEach((filepath, fileIndex) => {
        const targetIndex =
          preferredIndex !== null && fileIndex === 0
            ? preferredIndex
            : nextValues.findIndex((entry, index) => index >= searchIndex && entry.length === 0);
        if (targetIndex < 0 || targetIndex >= DRAWING_IMAGE_SLOT_COUNT) return;
        nextValues[targetIndex] = filepath;
        searchIndex = targetIndex + 1;
      });
      setSlotValues(nextValues);
    },
    [setSlotValues, value]
  );

  const uploadSlotFile = useCallback(
    async (file: File, index: number): Promise<void> => {
      try {
        const uploaded = await uploadMutation.mutateAsync({
          file,
          folder: MILKBAR_CMS_VISUALISATION_FOLDER,
          storageProfile: 'milkbarCms',
        });
        const filepath = uploaded.filepath.trim();
        if (filepath.length === 0) {
          toast('Upload completed without a media path.', { variant: 'error' });
          return;
        }
        setSlotValue(index, filepath);
        toast('Drawing image uploaded. Save the CMS snapshot to publish it.', {
          variant: 'success',
        });
      } catch (error) {
        toast(toErrorMessage(error), { variant: 'error' });
      }
    },
    [setSlotValue, toast, uploadMutation]
  );

  const controller = useMemo<ProductImageManagerController>(
    () => ({
      imageSlots: slotValues.map(createDrawingManagedImageSlot),
      imageLinks: slotValues,
      imageBase64s: Array.from({ length: DRAWING_IMAGE_SLOT_COUNT }, () => ''),
      setImageLinkAt: setSlotValue,
      setImageBase64At: (): void => {
        // Base64 storage is intentionally not used for arch-web CMS thumbnails.
      },
      handleSlotImageChange: (file: File | null, index: number): void => {
        if (file === null) {
          setSlotValue(index, '');
          return;
        }
        void uploadSlotFile(file, index);
      },
      handleSlotDisconnectImage: (index: number): Promise<void> => {
        setSlotValue(index, '');
        return Promise.resolve();
      },
      setShowFileManager: (show: boolean): void => {
        setActiveSlotIndex(null);
        setMediaOpen(show);
      },
      setShowFileManagerForSlot: (index: number): void => {
        setActiveSlotIndex(index);
        setMediaOpen(true);
      },
      swapImageSlots: (fromIndex: number, toIndex: number): void => {
        const nextValues = createDrawingImageSlotValues(value);
        [nextValues[fromIndex], nextValues[toIndex]] = [nextValues[toIndex] ?? '', nextValues[fromIndex] ?? ''];
        setSlotValues(nextValues);
      },
      setImagesReordering: (): void => {
        // The shared image manager owns visual drag state.
      },
      isSlotImageLocked: (): boolean => uploadMutation.isPending,
      slotImageLockedReason: 'Drawing image upload is in progress.',
      slotLabels: Array.from(
        { length: DRAWING_IMAGE_SLOT_COUNT },
        (_, index) => `Drawing image ${index + 1}`
      ),
    }),
    [setSlotValue, setSlotValues, slotValues, uploadMutation.isPending, uploadSlotFile, value]
  );

  return (
    <FormField
      label='Drawing thumbnails'
      description='Shown below the “drag rooms to reassign programme” hint on arch-web.'
    >
      <div className='space-y-3'>
        <ProductImageManager
          controller={controller}
          externalBaseUrl=''
          chooseFileManagerButtonAriaLabel='Choose existing drawing images'
          chooseFileManagerButtonLabel='Choose from media library'
          onChooseFromFileManager={(): void => {
            setActiveSlotIndex(null);
            setMediaOpen(true);
          }}
          showDragHandle
        />
        <MediaLibraryPanel
          open={mediaOpen}
          onOpenChange={setMediaOpen}
          selectionMode='multiple'
          autoConfirmSelection
          title='Drawing section images'
          uploadButtonLabel='Upload drawing images'
          uploadFolder={MILKBAR_CMS_VISUALISATION_FOLDER}
          storageProfile='milkbarCms'
          onSelect={(filepaths: string[]): void => {
            fillSlotsWithFilepaths(filepaths, activeSlotIndex);
            setMediaOpen(false);
          }}
        />
      </div>
    </FormField>
  );
}

function ContentTab({
  pageContent,
  updateNav,
  updateNavLink,
  addNavLink,
  removeNavLink,
  updateHero,
  updateDrawing,
  updatePhilosophy,
  updateServicesHeader,
  updateProjectsHeader,
  updateProcess,
  updateCaseStudy,
  updateCaseStudyStat,
  addCaseStudyStat,
  removeCaseStudyStat,
  updateQuote,
  updateCta,
  updateFooter,
  updateFooterColumnTitle,
  addFooterColumn,
  removeFooterColumn,
  updateFooterLink,
  addFooterLink,
  removeFooterLink,
  updatePrinciple,
  addPrinciple,
  removePrinciple,
  updateProcessStep,
  addProcessStep,
  removeProcessStep,
  updateMetric,
  addMetric,
  removeMetric,
}: {
  pageContent: MilkbarPageContent;
  updateNav: (patch: Partial<MilkbarPageContent['nav']>) => void;
  updateNavLink: (index: number, patch: Partial<MilkbarLinkItem>) => void;
  addNavLink: () => void;
  removeNavLink: (index: number) => void;
  updateHero: (patch: Partial<MilkbarPageContent['hero']>) => void;
  updateDrawing: (patch: Partial<MilkbarPageContent['drawing']>) => void;
  updatePhilosophy: (patch: Partial<MilkbarPageContent['philosophy']>) => void;
  updateServicesHeader: (patch: Partial<MilkbarPageContent['services']>) => void;
  updateProjectsHeader: (patch: Partial<MilkbarPageContent['projects']>) => void;
  updateProcess: (patch: Partial<MilkbarPageContent['process']>) => void;
  updateCaseStudy: (patch: Partial<MilkbarPageContent['caseStudy']>) => void;
  updateCaseStudyStat: (index: number, patch: Partial<MilkbarMetric>) => void;
  addCaseStudyStat: () => void;
  removeCaseStudyStat: (index: number) => void;
  updateQuote: (patch: Partial<MilkbarPageContent['quote']>) => void;
  updateCta: (patch: Partial<MilkbarPageContent['cta']>) => void;
  updateFooter: (patch: Partial<MilkbarPageContent['footer']>) => void;
  updateFooterColumnTitle: (colIndex: number, title: string) => void;
  addFooterColumn: () => void;
  removeFooterColumn: (colIndex: number) => void;
  updateFooterLink: (colIndex: number, linkIndex: number, patch: Partial<MilkbarLinkItem>) => void;
  addFooterLink: (colIndex: number) => void;
  removeFooterLink: (colIndex: number, linkIndex: number) => void;
  updatePrinciple: (index: number, patch: Partial<MilkbarPrinciple>) => void;
  addPrinciple: () => void;
  removePrinciple: (index: number) => void;
  updateProcessStep: (index: number, patch: Partial<MilkbarProcessStep>) => void;
  addProcessStep: () => void;
  removeProcessStep: (index: number) => void;
  updateMetric: (index: number, patch: Partial<MilkbarMetric>) => void;
  addMetric: () => void;
  removeMetric: (index: number) => void;
}): React.JSX.Element {
  const ALL_SECTIONS = ['nav', 'hero', 'drawing', 'philosophy', 'services', 'projects', 'process', 'metrics', 'caseStudy', 'quote', 'cta', 'footer'] as const;
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(ALL_SECTIONS));

  const toggleSection = useCallback((id: string): void => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }, []);

  const allOpen = openSections.size === ALL_SECTIONS.length;

  return (
    <div className='space-y-3'>
      <div className='flex justify-end'>
        <button
          type='button'
          onClick={() => setOpenSections(allOpen ? new Set() : new Set(ALL_SECTIONS))}
          className='text-xs text-muted-foreground transition-colors hover:text-white'
        >
          {allOpen ? 'Collapse all' : 'Expand all'}
        </button>
      </div>
      <CollapsibleSection
        id='nav'
        title='Navigation'
        subtitle={`${pageContent.nav.links.length} nav links`}
        open={openSections.has('nav')}
        onToggle={toggleSection}
        actions={
          <Button type='button' size='sm' variant='secondary' icon={<Plus className='size-4' />} onClick={addNavLink}>
            Add link
          </Button>
        }
      >
        <div className='grid gap-3 md:grid-cols-2'>
          <FieldInput label='Brand subtitle' value={pageContent.nav.brandSub} onChange={(brandSub) => updateNav({ brandSub })} description='Text after the brand name in the nav.' />
          <FieldInput label='CTA label' value={pageContent.nav.ctaLabel} onChange={(ctaLabel) => updateNav({ ctaLabel })} description='Enquiry CTA button text.' />
        </div>
        <div className='space-y-1.5'>
          {pageContent.nav.links.map((link, index) => (
            <div key={`nav-link-${index}`} className='grid gap-1.5 rounded border border-white/5 bg-white/3 p-2 md:grid-cols-2'>
              <FieldInput label='Label' value={link.label} onChange={(label) => updateNavLink(index, { label })} />
              <div className='flex items-end gap-1.5'>
                <div className='flex-1'>
                  <FieldInput label='Href' value={link.href} onChange={(href) => updateNavLink(index, { href })} />
                </div>
                <button
                  type='button'
                  onClick={() => removeNavLink(index)}
                  className='mb-0.5 flex size-8 shrink-0 items-center justify-center rounded border border-white/10 text-muted-foreground transition-colors hover:border-red-500/40 hover:text-red-400'
                  aria-label='Remove nav link'
                >
                  <Trash2 className='size-3.5' />
                </button>
              </div>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      <CollapsibleSection id='hero' title='Hero' open={openSections.has('hero')} onToggle={toggleSection}>
        <div className='grid gap-3 md:grid-cols-2'>
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
        </div>
        <CmsModel3DField
          label='Hero background 3D model'
          description='Uploads to FastComet /uploads/cms/models and drives the Vercel hero background model.'
          modelId={pageContent.hero.modelAssetId}
          uploadName='Milkbar hero background model'
          tags={['hero']}
          onChange={(modelAssetId) => updateHero({ modelAssetId, modelUrl: undefined })}
        />
      </CollapsibleSection>

      <CollapsibleSection id='drawing' title='Drawing Section' open={openSections.has('drawing')} onToggle={toggleSection}>
        <div className='grid gap-3 md:grid-cols-2'>
          <FieldInput label='Eyebrow' value={pageContent.drawing.eyebrow} onChange={(eyebrow) => updateDrawing({ eyebrow })} />
          <FieldInput label='Title' value={pageContent.drawing.title} onChange={(title) => updateDrawing({ title })} />
          <FieldInput label='Emphasis' value={pageContent.drawing.emphasis} onChange={(emphasis) => updateDrawing({ emphasis })} />
          <FieldInput label='CTA label' value={pageContent.drawing.ctaLabel} onChange={(ctaLabel) => updateDrawing({ ctaLabel })} />
          <FieldTextarea label='Description' value={pageContent.drawing.description} onChange={(description) => updateDrawing({ description })} rows={3} />
          <FieldInput label='Interaction hint' value={pageContent.drawing.hint} onChange={(hint) => updateDrawing({ hint })} />
        </div>
        <CmsModel3DField
          label='Interior section 3D model'
          description='Uploads the Every line carries intent interior model to FastComet /uploads/cms/models.'
          modelId={pageContent.drawing.interiorModelAssetId}
          uploadName='Milkbar Every line carries intent interior model'
          tags={['interior', 'drawing']}
          onChange={(interiorModelAssetId) => updateDrawing({ interiorModelAssetId, interiorModelUrl: undefined })}
        />
        <DrawingImageSlotsField
          value={pageContent.drawing.thumbImages}
          onChange={(thumbImages) => updateDrawing({ thumbImages })}
        />
      </CollapsibleSection>

      <CollapsibleSection id='philosophy' title='Philosophy' open={openSections.has('philosophy')} onToggle={toggleSection}>
        <div className='grid gap-3 md:grid-cols-2'>
          <FieldInput label='Eyebrow' value={pageContent.philosophy.eyebrow} onChange={(eyebrow) => updatePhilosophy({ eyebrow })} />
          <FieldInput label='Title' value={pageContent.philosophy.title} onChange={(title) => updatePhilosophy({ title })} />
          <FieldInput label='Emphasis' value={pageContent.philosophy.emphasis} onChange={(emphasis) => updatePhilosophy({ emphasis })} />
          <FieldInput label='Figure caption' value={pageContent.philosophy.caption} onChange={(caption) => updatePhilosophy({ caption })} />
          <FieldTextarea label='Body' value={pageContent.philosophy.body} onChange={(body) => updatePhilosophy({ body })} rows={3} />
          <FieldTextarea label='Closing line' value={pageContent.philosophy.closing} onChange={(closing) => updatePhilosophy({ closing })} rows={2} />
        </div>

      </CollapsibleSection>

      <CollapsibleSection
        id='philosophy'
        title='Philosophy Principles'
        subtitle={`${pageContent.philosophy.principles.length} principles`}
        open={openSections.has('philosophy')}
        onToggle={toggleSection}
        actions={
          <Button type='button' size='sm' variant='secondary' icon={<Plus className='size-4' />} onClick={addPrinciple}>
            Add
          </Button>
        }
      >
        {pageContent.philosophy.principles.map((principle, index) => (
          <div key={`${principle.number}-${index}`} className='space-y-2 rounded-md border border-white/10 p-3'>
            <div className='flex items-center justify-between gap-2'>
              <span className='text-xs font-medium text-muted-foreground'>Principle {index + 1}</span>
              <Button type='button' variant='destructive' size='sm' icon={<Trash2 className='size-3.5' />} onClick={() => removePrinciple(index)}>
                Remove
              </Button>
            </div>
            <div className='grid gap-3 md:grid-cols-[5rem_minmax(0,1fr)_minmax(0,1fr)]'>
              <FieldInput label='No.' value={principle.number} onChange={(number) => updatePrinciple(index, { number })} />
              <FieldInput label='Title' value={principle.title} onChange={(title) => updatePrinciple(index, { title })} />
              <FieldInput label='Emphasis' value={principle.emphasis} onChange={(emphasis) => updatePrinciple(index, { emphasis })} />
              <div className='md:col-span-3'>
                <FieldTextarea label='Description' value={principle.description} onChange={(description) => updatePrinciple(index, { description })} rows={2} />
              </div>
            </div>
          </div>
        ))}
      </CollapsibleSection>

      <CollapsibleSection id='services' title='Services &amp; Projects Headers' open={openSections.has('services')} onToggle={toggleSection}>
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
      </CollapsibleSection>

      <CollapsibleSection
        id='process'
        title='Process'
        subtitle={`${pageContent.process.steps.length} steps`}
        open={openSections.has('process')}
        onToggle={toggleSection}
        actions={
          <Button type='button' size='sm' variant='secondary' icon={<Plus className='size-4' />} onClick={addProcessStep}>
            Add step
          </Button>
        }
      >
        <div className='grid gap-3 md:grid-cols-2'>
          <FieldInput label='Eyebrow' value={pageContent.process.eyebrow} onChange={(eyebrow) => updateProcess({ eyebrow })} />
          <FieldInput label='Label' value={pageContent.process.label} onChange={(label) => updateProcess({ label })} />
          <FieldInput label='Title' value={pageContent.process.title} onChange={(title) => updateProcess({ title })} />
          <FieldInput label='Emphasis' value={pageContent.process.emphasis} onChange={(emphasis) => updateProcess({ emphasis })} />
        </div>
        {pageContent.process.steps.map((step, index) => (
          <div key={`${step.number}-${index}`} className='space-y-2 rounded-md border border-white/10 p-3'>
            <div className='flex items-center justify-between gap-2'>
              <span className='text-xs font-medium text-muted-foreground'>Step {index + 1}</span>
              <Button type='button' variant='destructive' size='sm' icon={<Trash2 className='size-3.5' />} onClick={() => removeProcessStep(index)}>
                Remove
              </Button>
            </div>
            <div className='grid gap-3 md:grid-cols-[5rem_minmax(0,1fr)]'>
              <FieldInput label='No.' value={step.number} onChange={(number) => updateProcessStep(index, { number })} />
              <FieldInput label='Title' value={step.title} onChange={(title) => updateProcessStep(index, { title })} />
              <div className='md:col-span-2'>
                <FieldTextarea label='Description' value={step.description} onChange={(description) => updateProcessStep(index, { description })} rows={2} />
              </div>
            </div>
          </div>
        ))}
      </CollapsibleSection>

      <CollapsibleSection
        id='metrics'
        title='Metrics'
        subtitle={`${pageContent.metrics.length} headline figures`}
        open={openSections.has('metrics')}
        onToggle={toggleSection}
        actions={
          <Button type='button' size='sm' variant='secondary' icon={<Plus className='size-4' />} onClick={addMetric}>
            Add
          </Button>
        }
      >
        {pageContent.metrics.map((metric, index) => (
          <div key={`${metric.label}-${index}`} className='rounded-md border border-white/10 p-3'>
            <div className='mb-2 flex items-center justify-between gap-2'>
              <span className='text-xs font-medium text-muted-foreground'>Metric {index + 1}</span>
              <Button type='button' variant='destructive' size='sm' icon={<Trash2 className='size-3.5' />} onClick={() => removeMetric(index)}>
                Remove
              </Button>
            </div>
            <div className='grid gap-3 md:grid-cols-[7rem_5rem_minmax(0,1fr)]'>
              <FieldInput label='Value' value={metric.value} onChange={(value) => updateMetric(index, { value })} />
              <FieldInput label='Suffix' value={metric.suffix} onChange={(suffix) => updateMetric(index, { suffix })} />
              <FieldInput label='Label' value={metric.label} onChange={(label) => updateMetric(index, { label })} />
            </div>
          </div>
        ))}
      </CollapsibleSection>

      <CollapsibleSection
        id='caseStudy'
        title='Case Study'
        subtitle={`${pageContent.caseStudy.stats.length} stats`}
        open={openSections.has('caseStudy')}
        onToggle={toggleSection}
        actions={
          <Button type='button' size='sm' variant='secondary' icon={<Plus className='size-4' />} onClick={addCaseStudyStat}>
            Add stat
          </Button>
        }
      >
        <div className='grid gap-3 md:grid-cols-2'>
          <FieldInput label='Eyebrow' value={pageContent.caseStudy.eyebrow} onChange={(eyebrow) => updateCaseStudy({ eyebrow })} />
          <FieldInput label='Label' value={pageContent.caseStudy.label} onChange={(label) => updateCaseStudy({ label })} />
          <FieldInput label='Title' value={pageContent.caseStudy.title} onChange={(title) => updateCaseStudy({ title })} />
          <FieldInput label='Title emphasis' value={pageContent.caseStudy.titleEmphasis} onChange={(titleEmphasis) => updateCaseStudy({ titleEmphasis })} />
          <FieldInput label='Heading' value={pageContent.caseStudy.heading} onChange={(heading) => updateCaseStudy({ heading })} />
          <FieldInput label='Heading emphasis' value={pageContent.caseStudy.headingEmphasis} onChange={(headingEmphasis) => updateCaseStudy({ headingEmphasis })} />
          <div className='md:col-span-2'>
            <FieldTextarea label='Body paragraph' value={pageContent.caseStudy.body} onChange={(body) => updateCaseStudy({ body })} rows={3} />
          </div>
        </div>
        {pageContent.caseStudy.stats.map((stat, index) => (
          <div key={`cs-stat-${index}`} className='rounded-md border border-white/10 p-2'>
            <div className='mb-2 flex items-center justify-between gap-2'>
              <span className='text-xs text-muted-foreground'>Stat {index + 1}</span>
              <Button type='button' variant='destructive' size='sm' icon={<Trash2 className='size-3.5' />} onClick={() => removeCaseStudyStat(index)}>
                Remove
              </Button>
            </div>
            <div className='grid gap-2 md:grid-cols-[6rem_4rem_minmax(0,1fr)]'>
              <FieldInput label='Value' value={stat.value} onChange={(value) => updateCaseStudyStat(index, { value })} />
              <FieldInput label='Suffix' value={stat.suffix} onChange={(suffix) => updateCaseStudyStat(index, { suffix })} />
              <FieldInput label='Label' value={stat.label} onChange={(label) => updateCaseStudyStat(index, { label })} />
            </div>
          </div>
        ))}
      </CollapsibleSection>

      <CollapsibleSection id='quote' title='Quote' open={openSections.has('quote')} onToggle={toggleSection}>
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
            <FieldInput label='Email placeholder' value={pageContent.cta.emailPlaceholder} onChange={(emailPlaceholder) => updateCta({ emailPlaceholder })} />
            <FieldInput label='Submit label' value={pageContent.cta.submitLabel} onChange={(submitLabel) => updateCta({ submitLabel })} />
            <FieldInput label='Loading label' value={pageContent.cta.loadingLabel} onChange={(loadingLabel) => updateCta({ loadingLabel })} />
            <FieldInput label='Success message' value={pageContent.cta.successMessage} onChange={(successMessage) => updateCta({ successMessage })} />
          </FormSection>
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        id='footer'
        title='Footer'
        subtitle={`${pageContent.footer.columns.length} nav columns`}
        open={openSections.has('footer')}
        onToggle={toggleSection}
        actions={
          <Button type='button' size='sm' variant='secondary' icon={<Plus className='size-4' />} onClick={addFooterColumn}>
            Add column
          </Button>
        }
      >
        <div className='grid gap-3 md:grid-cols-2'>
          <FieldInput label='Brand name' value={pageContent.footer.brandName} onChange={(brandName) => updateFooter({ brandName })} />
          <FieldInput label='Copyright' value={pageContent.footer.copyright} onChange={(copyright) => updateFooter({ copyright })} />
          <FieldTextarea label='Address' value={pageContent.footer.address} onChange={(address) => updateFooter({ address })} rows={3} />
          <FieldTextarea label='Tagline' value={pageContent.footer.tagline} onChange={(tagline) => updateFooter({ tagline })} rows={3} />
        </div>
        <div className='grid gap-4 md:grid-cols-3'>
          {pageContent.footer.columns.map((column, ci) => (
            <div key={`col-${ci}`} className='space-y-2 rounded-md border border-white/10 p-3'>
              <div className='flex items-center justify-between gap-2'>
                <FieldInput
                  label={`Column ${ci + 1} heading`}
                  value={column.title}
                  onChange={(title) => updateFooterColumnTitle(ci, title)}
                />
                <button
                  type='button'
                  onClick={() => removeFooterColumn(ci)}
                  className='mt-5 flex size-8 shrink-0 items-center justify-center rounded border border-white/10 text-muted-foreground transition-colors hover:border-red-500/40 hover:text-red-400'
                  aria-label={`Remove column ${ci + 1}`}
                >
                  <Trash2 className='size-3.5' />
                </button>
              </div>
              <div className='space-y-1.5'>
                {column.links.map((link, li) => (
                  <div key={`col-${ci}-link-${li}`} className='grid gap-1.5 rounded border border-white/5 bg-white/3 p-2 md:grid-cols-2'>
                    <FieldInput
                      label='Label'
                      value={link.label}
                      onChange={(label) => updateFooterLink(ci, li, { label })}
                    />
                    <div className='flex items-end gap-1.5'>
                      <div className='flex-1'>
                        <FieldInput
                          label='Href'
                          value={link.href}
                          onChange={(href) => updateFooterLink(ci, li, { href })}
                        />
                      </div>
                      <button
                        type='button'
                        onClick={() => removeFooterLink(ci, li)}
                        className='mb-0.5 flex size-8 shrink-0 items-center justify-center rounded border border-white/10 text-muted-foreground transition-colors hover:border-red-500/40 hover:text-red-400'
                        aria-label='Remove link'
                      >
                        <Trash2 className='size-3.5' />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <Button
                type='button'
                variant='secondary'
                size='sm'
                icon={<Plus className='size-3.5' />}
                onClick={() => addFooterLink(ci)}
              >
                Add link
              </Button>
            </div>
          ))}
        </div>
      </CollapsibleSection>
    </div>
  );
}

function SettingsTab({
  pageSettings,
  onUpdateVisibility,
  onUpdateSeo,
  onUpdateDefaultLocale,
  onTogglePublishedLocale,
}: {
  pageSettings: MilkbarPageSettings;
  onUpdateVisibility: (patch: Partial<MilkbarSectionVisibility>) => void;
  onUpdateSeo: (locale: MilkbarLocale, patch: Partial<MilkbarSeoMeta>) => void;
  onUpdateDefaultLocale: (locale: MilkbarLocale) => void;
  onTogglePublishedLocale: (locale: MilkbarLocale, published: boolean) => void;
}): React.JSX.Element {
  const [seoLocale, setSeoLocale] = useState<MilkbarLocale>('en');

  const SECTION_LABELS: Record<keyof MilkbarSectionVisibility, string> = {
    drawing: 'Drawing — interactive floor plan section',
    philosophy: 'Philosophy — principles and body copy',
    services: 'Services — practice offerings grid',
    projects: 'Projects — built work gallery',
    process: 'Process — four-step engagement flow',
    metrics: 'Metrics — headline numbers strip',
    caseStudy: 'Case Study — Helios Tower compliance case study section',
    quote: 'Quote — studio principle pull-quote',
    cta: 'CTA — email enquiry form',
  };

  return (
    <div className='space-y-4'>
      {/* Section Visibility */}
      <FormSection
        title='Section Visibility'
        subtitle='Toggle which page sections are rendered on the live site.'
      >
        <div className='grid gap-3 sm:grid-cols-2'>
          {(Object.keys(SECTION_LABELS) as (keyof MilkbarSectionVisibility)[]).map((key) => (
            <div
              key={key}
              className='flex items-center justify-between gap-4 rounded-md border border-white/10 p-3'
            >
              <div>
                <div className='text-sm font-medium text-white capitalize'>{key}</div>
                <div className='text-xs text-muted-foreground'>{SECTION_LABELS[key]}</div>
              </div>
              <Switch
                checked={pageSettings.visibility[key]}
                onCheckedChange={(checked) => onUpdateVisibility({ [key]: checked })}
                aria-label={`Toggle ${key} section`}
              />
            </div>
          ))}
        </div>
      </FormSection>

      {/* Locale Publication Controls */}
      <div className='grid gap-4 lg:grid-cols-2'>
        <FormSection title='Default Locale' subtitle='Language served to visitors with no locale preference.'>
          <div className='flex gap-2'>
            {MILKBAR_LOCALES.map((locale) => (
              <button
                key={locale}
                type='button'
                onClick={() => onUpdateDefaultLocale(locale)}
                className={`flex-1 rounded-md border px-3 py-2 text-sm font-semibold uppercase tracking-widest transition-colors ${
                  pageSettings.defaultLocale === locale
                    ? 'border-white/40 bg-white/10 text-white'
                    : 'border-white/10 text-muted-foreground hover:border-white/20 hover:text-white'
                }`}
              >
                {locale}
                <div className='text-[10px] font-normal normal-case tracking-normal text-muted-foreground'>
                  {MILKBAR_LOCALE_LABELS[locale]}
                </div>
              </button>
            ))}
          </div>
        </FormSection>

        <FormSection title='Published Locales' subtitle='Languages visible to the public. At least one must be published.'>
          <div className='space-y-2'>
            {MILKBAR_LOCALES.map((locale) => {
              const isPublished = pageSettings.publishedLocales.includes(locale);
              const isDefault = pageSettings.defaultLocale === locale;
              return (
                <div
                  key={locale}
                  className='flex items-center justify-between gap-4 rounded-md border border-white/10 p-3'
                >
                  <div>
                    <div className='flex items-center gap-2 text-sm font-medium text-white'>
                      <span className='uppercase tracking-widest'>{locale}</span>
                      <span className='text-xs font-normal text-muted-foreground'>{MILKBAR_LOCALE_LABELS[locale]}</span>
                      {isDefault ? (
                        <Badge variant='outline' className='text-[10px]'>default</Badge>
                      ) : null}
                    </div>
                  </div>
                  <Switch
                    checked={isPublished}
                    onCheckedChange={(checked) => onTogglePublishedLocale(locale, checked)}
                    aria-label={`Publish ${MILKBAR_LOCALE_LABELS[locale]}`}
                    disabled={isDefault && isPublished}
                  />
                </div>
              );
            })}
          </div>
          <p className='text-xs text-muted-foreground'>
            The default locale cannot be unpublished.
          </p>
        </FormSection>
      </div>

      {/* SEO Metadata per Locale */}
      <FormSection
        title='SEO Metadata'
        subtitle='Search engine and social metadata per language.'
        actions={
          <div className='flex items-center gap-1 rounded-md border border-white/10 bg-white/5 p-1'>
            {MILKBAR_LOCALES.map((locale) => (
              <button
                key={locale}
                type='button'
                onClick={() => setSeoLocale(locale)}
                className={`rounded px-3 py-1 text-xs font-semibold uppercase tracking-widest transition-colors ${
                  seoLocale === locale
                    ? 'bg-white/15 text-white'
                    : 'text-muted-foreground hover:text-white'
                }`}
              >
                {locale}
              </button>
            ))}
          </div>
        }
      >
        <div className='grid gap-3 md:grid-cols-2'>
          <FieldInput
            label='Page title'
            value={pageSettings.seo[seoLocale].title}
            onChange={(title) => onUpdateSeo(seoLocale, { title })}
            description={`<title> tag — shown in browser tab and search results. ${pageSettings.seo[seoLocale].title.length}/60 chars${pageSettings.seo[seoLocale].title.length > 60 ? ' ⚠ too long' : ''}`}
          />
          <FieldInput
            label='OG title'
            value={pageSettings.seo[seoLocale].ogTitle}
            onChange={(ogTitle) => onUpdateSeo(seoLocale, { ogTitle })}
            description={`Social sharing card headline. ${pageSettings.seo[seoLocale].ogTitle.length}/60 chars${pageSettings.seo[seoLocale].ogTitle.length > 60 ? ' ⚠ too long' : ''}`}
          />
          <FieldTextarea
            label='Meta description'
            value={pageSettings.seo[seoLocale].description}
            onChange={(description) => onUpdateSeo(seoLocale, { description })}
            description={`Search result snippet — aim for 150–160 chars. ${pageSettings.seo[seoLocale].description.length}/160 chars${getMetaDescriptionHint(pageSettings.seo[seoLocale].description.length)}`}
            rows={3}
          />
          <FieldTextarea
            label='OG description'
            value={pageSettings.seo[seoLocale].ogDescription}
            onChange={(ogDescription) => onUpdateSeo(seoLocale, { ogDescription })}
            description={`Social sharing card body text. ${pageSettings.seo[seoLocale].ogDescription.length}/160 chars${pageSettings.seo[seoLocale].ogDescription.length > 160 ? ' ⚠ too long' : ''}`}
            rows={3}
          />
        </div>
      </FormSection>

      {/* SEO Search Preview */}
      <FormSection
        title='Search Result Preview'
        subtitle='Approximate rendering of how this page appears in Google results.'
        actions={
          <div className='flex items-center gap-1 rounded-md border border-white/10 bg-white/5 p-1'>
            {MILKBAR_LOCALES.map((locale) => (
              <button
                key={locale}
                type='button'
                onClick={() => setSeoLocale(locale)}
                className={`rounded px-3 py-1 text-xs font-semibold uppercase tracking-widest transition-colors ${
                  seoLocale === locale ? 'bg-white/15 text-white' : 'text-muted-foreground hover:text-white'
                }`}
              >
                {locale}
              </button>
            ))}
          </div>
        }
      >
        <SeoPreviewCard
          title={pageSettings.seo[seoLocale].title}
          description={pageSettings.seo[seoLocale].description}
          locale={seoLocale}
        />
      </FormSection>
    </div>
  );
}

const MILKBAR_SITE_SLUG: Record<MilkbarLocale, string> = {
  en: 'milkbardesigners.com',
  de: 'milkbardesigners.com/de',
  pl: 'milkbardesigners.com/pl',
};

function SeoPreviewCard({
  title,
  description,
  locale,
}: {
  title: string;
  description: string;
  locale: MilkbarLocale;
}): React.JSX.Element {
  const displayTitle = getSeoDisplayTitle(title);
  const displayDesc = getSeoDisplayDesc(description);
  const displayUrl = MILKBAR_SITE_SLUG[locale];

  return (
    <div className='rounded-lg border border-white/10 bg-white/5 p-4'>
      <p className='mb-1 text-[11px] uppercase tracking-widest text-muted-foreground'>
        Google · {MILKBAR_LOCALE_LABELS[locale]}
      </p>
      <div className='max-w-xl space-y-0.5'>
        <p className='truncate text-[13px] text-muted-foreground'>{displayUrl}</p>
        <p className='text-[18px] font-normal leading-snug text-blue-400 underline decoration-blue-400/50'>
          {displayTitle}
        </p>
        <p className='text-sm leading-relaxed text-muted-foreground'>{displayDesc}</p>
      </div>
    </div>
  );
}

function ModelAssetLabel({ modelId }: { modelId: string }): React.JSX.Element {
  const query = useAsset3DById(modelId);
  const asset = query.data;

  if (asset !== undefined) {
    const name = asset.name !== '' ? asset.name : (asset.filename ?? modelId);
    return (
      <span className='flex min-w-0 items-center gap-1.5 truncate text-xs text-white/70'>
        <Box className='size-3 shrink-0 text-blue-400/70' />
        <span className='truncate'>{name}</span>
      </span>
    );
  }

  return (
    <span className='min-w-0 truncate font-mono text-[10px] text-white/30'>
      {modelId.slice(0, 8)}…
    </span>
  );
}

function ModelAssetLibraryPickerModal({
  title = 'Select 3D Asset from Library',
  confirmLabel = 'Assign Model',
  onSelect,
  onClose,
}: {
  title?: string;
  confirmLabel?: string;
  onSelect: (assetId: string) => void;
  onClose: () => void;
}): React.JSX.Element {
  const [search, setSearch] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<Asset3DRecord | null>(null);
  const [modelError, setModelError] = useState<string | null>(null);

  const assetsQuery = useAssets3D({ search: search.trim().length > 0 ? search.trim() : undefined });
  const assets: Asset3DRecord[] = assetsQuery.data ?? [];
  const isLoading = assetsQuery.isPending;

  const handleAssetClick = useCallback((asset: Asset3DRecord): void => {
    setSelectedAsset(asset);
    setModelError(null);
  }, []);

  const handleConfirm = useCallback((): void => {
    if (selectedAsset === null) return;
    onSelect(selectedAsset.id);
    onClose();
  }, [selectedAsset, onSelect, onClose]);

  const modelUrl = selectedAsset !== null ? `/api/assets3d/${selectedAsset.id}/file` : '';

  return (
    <DetailModal isOpen title={title} onClose={onClose} size='xl'>
      <div className='flex h-[640px] min-h-0 flex-col gap-3'>
        <Input
          placeholder='Search assets…'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className='flex min-h-0 flex-1 gap-4'>
          <div className='flex w-60 shrink-0 flex-col gap-1.5 overflow-y-auto pr-1'>
            {isLoading ? (
              <p className='py-8 text-center text-xs text-muted-foreground'>Loading…</p>
            ) : assets.length === 0 ? (
              <p className='py-8 text-center text-xs text-muted-foreground'>No assets found.</p>
            ) : (
              assets.map((asset) => {
                const displayName = asset.name !== '' ? asset.name : (asset.filename ?? asset.id);
                const isSelected = selectedAsset?.id === asset.id;
                return (
                  <button
                    key={asset.id}
                    type='button'
                    onClick={() => handleAssetClick(asset)}
                    className={`rounded-md border px-3 py-2 text-left transition-colors ${
                      isSelected
                        ? 'border-blue-500/60 bg-blue-500/10 text-white'
                        : 'border-white/10 bg-white/5 text-muted-foreground hover:border-white/30 hover:text-white'
                    }`}
                  >
                    <p className='truncate text-xs font-medium'>{displayName}</p>
                    {asset.categoryId !== null && asset.categoryId !== undefined && asset.categoryId !== '' ? (
                      <p className='mt-0.5 truncate text-[10px] text-blue-400/70'>{asset.categoryId}</p>
                    ) : null}
                    {asset.size !== undefined && asset.size > 0 ? (
                      <p className='mt-0.5 text-[10px] text-white/30'>
                        {asset.size < 1024 * 1024
                          ? `${(asset.size / 1024).toFixed(1)} KB`
                          : `${(asset.size / 1024 / 1024).toFixed(2)} MB`}
                      </p>
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
          <div className='relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-white/10 bg-black/40'>
            {selectedAsset === null ? (
              <div className='flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground'>
                <Box className='size-10 opacity-30' />
                <p className='text-sm'>Select an asset to preview</p>
              </div>
            ) : modelError !== null ? (
              <div className='flex flex-1 flex-col items-center justify-center gap-2 text-red-400'>
                <p className='text-sm'>Failed to load model</p>
                <p className='text-xs text-muted-foreground'>{modelError}</p>
              </div>
            ) : (
              <Viewer3DProvider key={selectedAsset.id}>
                <Viewer3D
                  modelUrl={modelUrl}
                  onError={(err) => setModelError(err.message)}
                  className='h-full w-full flex-1'
                  allowUserControls
                />
              </Viewer3DProvider>
            )}
            {selectedAsset !== null ? (
              <div className='border-t border-white/10 bg-black/20 px-3 py-1.5'>
                <p className='truncate text-xs text-muted-foreground'>
                  {selectedAsset.name !== '' ? selectedAsset.name : (selectedAsset.filename ?? '')}
                </p>
              </div>
            ) : null}
          </div>
        </div>
        <div className='flex items-center justify-end gap-2 border-t border-white/10 pt-3'>
          <Button variant='ghost' size='sm' onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant='solid'
            size='sm'
            disabled={selectedAsset === null}
            onClick={handleConfirm}
            icon={<Library className='size-3.5' />}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </DetailModal>
  );
}

function Model3DPreviewModal({
  modelId,
  title,
  onClose,
}: {
  modelId: string;
  title: string;
  onClose: () => void;
}): React.JSX.Element {
  const [showSettings, setShowSettings] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const modelUrl = `/api/assets3d/${modelId}/file`;

  return (
    <DetailModal isOpen title={`3D Preview — ${title}`} onClose={onClose} size='xl'>
      <Viewer3DProvider>
        <div className='flex h-[600px] min-h-0 flex-col'>
          <div className='relative flex min-h-0 flex-1'>
            <div className={`bg-black/40 ${showSettings ? 'flex-1 lg:w-2/3' : 'w-full flex-1'}`}>
              {modelError !== null ? (
                <div className='flex h-full items-center justify-center text-center text-red-400'>
                  <div>
                    <p>Failed to load 3D model</p>
                    <p className='mt-2 text-sm text-gray-400'>{modelError}</p>
                  </div>
                </div>
              ) : (
                <Viewer3D
                  modelUrl={modelUrl}
                  onLoad={() => {}}
                  onError={(error) => setModelError(error.message)}
                  className='h-full w-full'
                />
              )}
            </div>
            {showSettings ? (
              <div className='absolute bottom-0 right-0 top-0 z-10 w-full border-l border-border/60 bg-card/30 lg:static lg:w-1/3'>
                <Viewer3DSettingsPanel />
              </div>
            ) : null}
          </div>
          <Viewer3DStatusInfo />
          <div className='flex items-center justify-between border-t border-border/60 bg-muted/10 p-2'>
            <Button
              variant={showSettings ? 'secondary' : 'ghost'}
              size='sm'
              onClick={() => setShowSettings((v) => !v)}
              className='h-8 text-xs'
            >
              <Settings2 className='mr-1.5 h-3.5 w-3.5' />
              Settings
            </Button>
            <a href={`/api/assets3d/${modelId}/file`} download>
              <Button variant='outline' size='sm' className='h-8 text-xs'>
                <Download className='mr-1.5 h-3.5 w-3.5' />
                Download
              </Button>
            </a>
          </div>
        </div>
      </Viewer3DProvider>
    </DetailModal>
  );
}

function CmsModel3DField({
  label,
  description,
  modelId,
  uploadName,
  tags,
  onChange,
}: {
  label: string;
  description: string;
  modelId: string | undefined;
  uploadName: string;
  tags: string[];
  onChange: (modelAssetId: string | undefined) => void;
}): React.JSX.Element {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const hasModel = modelId !== undefined && modelId.trim().length > 0;

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
      const file = event.target.files?.[0];
      if (file === undefined) return;
      setUploading(true);
      setUploadProgress(0);
      try {
        const record = await uploadAsset3DFile(
          file,
          {
            name: uploadName,
            category: 'cms',
            tags: ['milkbardesigners', ...tags],
            isPublic: true,
            storageProfile: 'milkbarCms',
          },
          (loaded, total) => {
            if (total !== undefined) {
              setUploadProgress(Math.round((loaded / total) * 100));
            }
          }
        );
        onChange(record.id);
        toast(`3D model uploaded: ${record.filename ?? file.name}`, { variant: 'success' });
      } catch (err) {
        toast(`Upload failed: ${toErrorMessage(err)}`, { variant: 'error' });
      } finally {
        setUploading(false);
        setUploadProgress(null);
        if (fileInputRef.current !== null) {
          fileInputRef.current.value = '';
        }
      }
    },
    [onChange, tags, toast, uploadName]
  );

  return (
    <>
      <div className='rounded-md border border-white/10 bg-white/5 p-3'>
        <div className='mb-2 flex items-start justify-between gap-3'>
          <div className='min-w-0'>
            <p className='flex items-center gap-1.5 text-xs font-medium text-white/80'>
              <Box className='size-3.5 text-blue-400/70' />
              {label}
            </p>
            <p className='mt-1 text-[11px] leading-relaxed text-muted-foreground'>{description}</p>
          </div>
          {hasModel ? <Badge variant='secondary'>Assigned</Badge> : <Badge variant='outline'>Empty</Badge>}
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          {hasModel ? (
            <>
              <ModelAssetLabel modelId={modelId as string} />
              <Button
                type='button'
                size='sm'
                variant='ghost'
                className='h-7 px-2 text-xs'
                icon={<Eye className='size-3.5' />}
                onClick={() => setPreviewOpen(true)}
              >
                Preview
              </Button>
              <Button
                type='button'
                size='sm'
                variant='ghost'
                className='h-7 px-2 text-xs text-red-400 hover:text-red-300'
                icon={<X className='size-3.5' />}
                onClick={() => onChange(undefined)}
              >
                Remove
              </Button>
            </>
          ) : (
            <span className='text-xs text-white/30'>No model attached</span>
          )}
          <input
            ref={fileInputRef}
            type='file'
            accept='.glb,.gltf'
            className='hidden'
            onChange={handleFileChange}
          />
          <Button
            type='button'
            size='sm'
            variant='ghost'
            className='h-7 px-2 text-xs'
            disabled={uploading}
            icon={<Upload className='size-3.5' />}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading
              ? uploadProgress !== null
                ? `${uploadProgress}%`
                : 'Uploading…'
              : hasModel
                ? 'Replace'
                : 'Upload .glb / .gltf'}
          </Button>
          <Button
            type='button'
            size='sm'
            variant={hasModel ? 'ghost' : 'secondary'}
            className='h-7 px-2 text-xs'
            icon={<Library className='size-3.5' />}
            onClick={() => setPickerOpen(true)}
          >
            From Library
          </Button>
        </div>
      </div>
      {previewOpen && hasModel ? (
        <Model3DPreviewModal
          modelId={modelId as string}
          title={label}
          onClose={() => setPreviewOpen(false)}
        />
      ) : null}
      {pickerOpen ? (
        <ModelAssetLibraryPickerModal
          title={`Select ${label}`}
          confirmLabel='Assign Model'
          onSelect={(assetId) => {
            onChange(assetId);
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      ) : null}
    </>
  );
}

function ProjectModel3DSection({
  project,
  projectIndex,
  onUpdate,
}: {
  project: MilkbarProjectCmsRecord;
  projectIndex: number;
  onUpdate: (index: number, patch: Partial<MilkbarProjectCmsRecord>) => void;
}): React.JSX.Element {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [showInlineViewer, setShowInlineViewer] = useState(false);
  const controlsRef = useRef<OrbitControlsHandle | null>(null);

  const hasModel = project.modelAssetId !== undefined && project.modelAssetId !== '';

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
      const file = event.target.files?.[0];
      if (file === undefined) return;
      setUploading(true);
      setUploadProgress(0);
      try {
        const record = await uploadAsset3DFile(
          file,
          {
            name: `${project.code} — ${project.name}`,
            category: 'cms',
            tags: ['milkbardesigners', 'project'],
            isPublic: true,
            storageProfile: 'milkbarCms',
          },
          (loaded, total) => {
            if (total !== undefined) {
              setUploadProgress(Math.round((loaded / total) * 100));
            }
          }
        );
        onUpdate(projectIndex, { modelAssetId: record.id, modelUrl: undefined });
        toast(`3D model uploaded: ${record.filename ?? file.name}`, { variant: 'success' });
      } catch (err) {
        toast(`Upload failed: ${toErrorMessage(err)}`, { variant: 'error' });
      } finally {
        setUploading(false);
        setUploadProgress(null);
        if (fileInputRef.current !== null) {
          fileInputRef.current.value = '';
        }
      }
    },
    [project.code, project.name, projectIndex, onUpdate, toast]
  );

  const handleSyncCamera = useCallback((): void => {
    const ctrl = controlsRef.current;
    if (ctrl === null) return;
    const pos = ctrl.object.position;
    const tgt = ctrl.target;
    onUpdate(projectIndex, {
      cameraPosition: { x: Math.round(pos.x * 100) / 100, y: Math.round(pos.y * 100) / 100, z: Math.round(pos.z * 100) / 100 },
      cameraTarget: { x: Math.round(tgt.x * 100) / 100, y: Math.round(tgt.y * 100) / 100, z: Math.round(tgt.z * 100) / 100 },
    });
    toast('Camera position synced to CMS fields.', { variant: 'success' });
  }, [controlsRef, onUpdate, projectIndex, toast]);

  return (
    <>
      <div className='flex flex-wrap items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2'>
        <Box className='size-4 shrink-0 text-muted-foreground' />
        <span className='text-xs font-medium text-muted-foreground'>3D Model</span>
        {hasModel ? (
          <>
            <ModelAssetLabel modelId={project.modelAssetId as string} />
            <Button
              type='button'
              size='sm'
              variant={showInlineViewer ? 'secondary' : 'ghost'}
              className='h-7 px-2 text-xs'
              icon={<Eye className='size-3.5' />}
              onClick={() => setShowInlineViewer((v) => !v)}
            >
              {showInlineViewer ? 'Hide 3D' : 'Show 3D'}
            </Button>
            <Button
              type='button'
              size='sm'
              variant='ghost'
              className='h-7 px-2 text-xs'
              icon={<Eye className='size-3.5' />}
              onClick={() => setPreviewOpen(true)}
            >
              Full Preview
            </Button>
            <Button
              type='button'
              size='sm'
              variant='ghost'
              className='h-7 px-2 text-xs text-red-400 hover:text-red-300'
              icon={<X className='size-3.5' />}
              onClick={() => {
                onUpdate(projectIndex, { modelAssetId: undefined, modelUrl: undefined });
                setShowInlineViewer(false);
              }}
            >
              Remove
            </Button>
          </>
        ) : (
          <span className='text-xs text-white/30'>No model attached</span>
        )}
        <input
          ref={fileInputRef}
          type='file'
          accept='.glb,.gltf'
          className='hidden'
          onChange={handleFileChange}
        />
        <Button
          type='button'
          size='sm'
          variant='ghost'
          className='h-7 px-2 text-xs'
          disabled={uploading}
          icon={<Upload className='size-3.5' />}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading
            ? uploadProgress !== null
              ? `${uploadProgress}%`
              : 'Uploading…'
            : hasModel
              ? 'Replace'
              : 'Upload .glb / .gltf'}
        </Button>
        <Button
          type='button'
          size='sm'
          variant={hasModel ? 'ghost' : 'secondary'}
          className='h-7 px-2 text-xs'
          icon={<Library className='size-3.5' />}
          onClick={() => setPickerOpen(true)}
        >
          From Library
        </Button>
      </div>
      {showInlineViewer && hasModel ? (
        <div className='overflow-hidden rounded-md border border-white/10 bg-black/40'>
          <Viewer3DProvider key={project.modelAssetId}>
            <div className='relative h-72'>
              <Viewer3D
                modelUrl={`/api/assets3d/${project.modelAssetId as string}/file`}
                settings={{ autoRotate: false, enableContactShadows: true, backgroundColor: '#0d0d14' }}
                className='h-full w-full'
                allowUserControls
                controlsRef={controlsRef}
              />
            </div>
            <div className='flex items-center justify-between border-t border-white/10 bg-black/20 px-3 py-1.5'>
              <span className='text-[10px] text-muted-foreground'>
                Orbit to frame — then sync position to CMS fields
              </span>
              <Button
                type='button'
                size='sm'
                variant='secondary'
                className='h-7 px-2 text-xs'
                icon={<Camera className='size-3.5' />}
                onClick={handleSyncCamera}
              >
                Sync Camera
              </Button>
            </div>
          </Viewer3DProvider>
        </div>
      ) : null}
      {previewOpen && hasModel ? (
        <Model3DPreviewModal
          modelId={project.modelAssetId as string}
          title={project.name.length > 0 ? project.name : project.code}
          onClose={() => setPreviewOpen(false)}
        />
      ) : null}
      {pickerOpen ? (
        <ModelAssetLibraryPickerModal
          title='Select Project 3D Asset from Library'
          confirmLabel='Assign to Project'
          onSelect={(assetId) => {
            onUpdate(projectIndex, { modelAssetId: assetId, modelUrl: undefined });
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      ) : null}
    </>
  );
}

function ProjectsTab({
  projects,
  onAdd,
  onRemove,
  onUpdate,
  onDuplicate,
  onMoveUp,
  onMoveDown,
}: {
  projects: MilkbarProjectCmsRecord[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, patch: Partial<MilkbarProjectCmsRecord>) => void;
  onDuplicate: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
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
            <div className='flex items-center gap-1'>
              <button
                type='button'
                onClick={() => onMoveUp(index)}
                disabled={index === 0}
                className='rounded p-1 text-muted-foreground transition-colors hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-30'
                aria-label='Move project up'
              >
                <ChevronUp className='size-4' />
              </button>
              <button
                type='button'
                onClick={() => onMoveDown(index)}
                disabled={index === projects.length - 1}
                className='rounded p-1 text-muted-foreground transition-colors hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-30'
                aria-label='Move project down'
              >
                <ChevronDown className='size-4' />
              </button>
              <SectionTitle
                title={project.name.length > 0 ? project.name : project.code}
                subtitle={`#${index + 1} · ${project.code}`}
              />
            </div>
            <div className='flex items-center gap-2'>
              <Button type='button' variant='secondary' size='sm' icon={<Copy className='size-4' />} onClick={() => onDuplicate(index)}>
                Duplicate
              </Button>
              <Button type='button' variant='destructive' size='sm' icon={<Trash2 className='size-4' />} onClick={() => onRemove(index)}>
                Remove
              </Button>
            </div>
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
            <FieldInput label='Order' value={project.order} onChange={(order) => onUpdate(index, { order: toOrderNumber(order) })} />
            <div className='md:col-span-2'>
              <FieldTextarea label='Stats' value={linesToText(project.stats)} onChange={(value) => onUpdate(index, { stats: textToLines(value) })} rows={3} description='One stat per line, e.g. "32 floors".' />
            </div>
            <div className='md:col-span-3'>
              <FieldTextarea label='Description' value={project.description} onChange={(description) => onUpdate(index, { description })} rows={3} />
            </div>
          </div>
          <div className='mt-2 grid gap-3 md:grid-cols-6'>
            <div className='md:col-span-6'>
              <span className='mb-1 block text-xs font-medium text-muted-foreground'>3D Viewer — Camera Position (x / y / z)</span>
            </div>
            <FieldInput
              label='Pos X'
              value={project.cameraPosition.x}
              onChange={(x) => onUpdate(index, { cameraPosition: { ...project.cameraPosition, x: toOrderNumber(x) } })}
            />
            <FieldInput
              label='Pos Y'
              value={project.cameraPosition.y}
              onChange={(y) => onUpdate(index, { cameraPosition: { ...project.cameraPosition, y: toOrderNumber(y) } })}
            />
            <FieldInput
              label='Pos Z'
              value={project.cameraPosition.z}
              onChange={(z) => onUpdate(index, { cameraPosition: { ...project.cameraPosition, z: toOrderNumber(z) } })}
            />
            <div className='md:col-span-6'>
              <span className='mb-1 block text-xs font-medium text-muted-foreground'>3D Viewer — Camera Target (x / y / z)</span>
            </div>
            <FieldInput
              label='Tgt X'
              value={project.cameraTarget.x}
              onChange={(x) => onUpdate(index, { cameraTarget: { ...project.cameraTarget, x: toOrderNumber(x) } })}
            />
            <FieldInput
              label='Tgt Y'
              value={project.cameraTarget.y}
              onChange={(y) => onUpdate(index, { cameraTarget: { ...project.cameraTarget, y: toOrderNumber(y) } })}
            />
            <FieldInput
              label='Tgt Z'
              value={project.cameraTarget.z}
              onChange={(z) => onUpdate(index, { cameraTarget: { ...project.cameraTarget, z: toOrderNumber(z) } })}
            />
          </div>
          <ProjectModel3DSection project={project} projectIndex={index} onUpdate={onUpdate} />
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
  onDuplicate,
  onMoveUp,
  onMoveDown,
}: {
  services: MilkbarServiceCmsRecord[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, patch: Partial<MilkbarServiceCmsRecord>) => void;
  onDuplicate: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
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
            <div className='flex items-center gap-1'>
              <button
                type='button'
                onClick={() => onMoveUp(index)}
                disabled={index === 0}
                className='rounded p-1 text-muted-foreground transition-colors hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-30'
                aria-label='Move service up'
              >
                <ChevronUp className='size-4' />
              </button>
              <button
                type='button'
                onClick={() => onMoveDown(index)}
                disabled={index === services.length - 1}
                className='rounded p-1 text-muted-foreground transition-colors hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-30'
                aria-label='Move service down'
              >
                <ChevronDown className='size-4' />
              </button>
              <SectionTitle
                title={service.title.length > 0 ? service.title : service.code}
                subtitle={`#${index + 1} · ${service.code}`}
              />
            </div>
            <div className='flex items-center gap-2'>
              <Button type='button' variant='secondary' size='sm' icon={<Copy className='size-4' />} onClick={() => onDuplicate(index)}>
                Duplicate
              </Button>
              <Button type='button' variant='destructive' size='sm' icon={<Trash2 className='size-4' />} onClick={() => onRemove(index)}>
                Remove
              </Button>
            </div>
          </div>
          <div className='grid gap-3 md:grid-cols-[8rem_minmax(0,1fr)_minmax(0,1fr)_8rem]'>
            <FieldInput label='Code' value={service.code} onChange={(code) => onUpdate(index, { code })} />
            <FieldInput label='Title' value={service.title} onChange={(title) => onUpdate(index, { title })} />
            <FieldInput label='Emphasis word' value={service.emphasis} onChange={(emphasis) => onUpdate(index, { emphasis })} description='Word within title rendered in italic.' />
            <FieldInput label='Order' value={service.order} onChange={(order) => onUpdate(index, { order: toOrderNumber(order) })} />
            <div className='md:col-span-4'>
              <FieldTextarea label='Description' value={service.description} onChange={(description) => onUpdate(index, { description })} rows={3} />
            </div>
          </div>
        </div>
      ))}
    </FormSection>
  );
}

type InquiryFilterStatus = 'all' | 'pending' | 'contacted';

function InquiriesTab({
  snapshot,
  onStatusChange,
}: {
  snapshot: MilkbarCmsSnapshot | null;
  onStatusChange: (email: string, status: 'pending' | 'contacted') => Promise<void>;
}): React.JSX.Element {
  const inquiries = snapshot?.inquiries ?? [];
  const [loadingEmail, setLoadingEmail] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<InquiryFilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const handleToggle = async (email: string, current: string): Promise<void> => {
    const next = current === 'contacted' ? 'pending' : 'contacted';
    setLoadingEmail(email);
    try {
      await onStatusChange(email, next);
    } finally {
      setLoadingEmail(null);
    }
  };

  const filtered = inquiries.filter((i) => {
    if (filterStatus !== 'all' && i.status !== filterStatus) return false;
    if (searchQuery.length > 0 && !i.email.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const pendingCount = inquiries.filter((i) => i.status === 'pending').length;

  return (
    <FormSection
      title='Inquiries'
      subtitle={`${inquiries.length} total · ${pendingCount} pending`}
      actions={
        <Button
          type='button'
          variant='secondary'
          size='sm'
          icon={<Download className='size-4' />}
          onClick={() => exportInquiriesCsv(inquiries)}
          disabled={inquiries.length === 0}
        >
          Export CSV
        </Button>
      }
    >
      <div className='flex flex-wrap items-center gap-2'>
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder='Search by email…'
          className='h-8 w-56 text-sm'
        />
        <div className='flex items-center gap-1 rounded-md border border-white/10 bg-white/5 p-1'>
          {(['all', 'pending', 'contacted'] as InquiryFilterStatus[]).map((s) => (
            <button
              key={s}
              type='button'
              onClick={() => setFilterStatus(s)}
              className={`rounded px-3 py-1 text-xs font-semibold capitalize transition-colors ${
                filterStatus === s ? 'bg-white/15 text-white' : 'text-muted-foreground hover:text-white'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        {filtered.length !== inquiries.length ? (
          <span className='text-xs text-muted-foreground'>{filtered.length} of {inquiries.length} shown</span>
        ) : null}
      </div>
      {filtered.length === 0 ? (
        <p className='text-sm text-muted-foreground'>No inquiries match the current filter.</p>
      ) : (
        <div className='overflow-hidden rounded-md border border-white/10'>
          <table className='w-full text-left text-sm'>
            <thead className='bg-white/5 text-xs uppercase text-muted-foreground'>
              <tr>
                <th className='px-3 py-2'>Email</th>
                <th className='px-3 py-2'>Status</th>
                <th className='px-3 py-2'>Locale</th>
                <th className='px-3 py-2'>Source</th>
                <th className='px-3 py-2'>Created</th>
                <th className='px-3 py-2' aria-label='Actions' />
              </tr>
            </thead>
            <tbody>
              {filtered.map((inquiry) => (
                <tr key={`${inquiry.email}-${inquiry.createdAt}`} className='border-t border-white/10'>
                  <td className='px-3 py-2 text-white'>{inquiry.email}</td>
                  <td className='px-3 py-2'>
                    <Badge variant={inquiry.status === 'contacted' ? 'success' : 'default'}>
                      {inquiry.status}
                    </Badge>
                  </td>
                  <td className='px-3 py-2 text-xs uppercase tracking-widest text-muted-foreground'>{inquiry.locale ?? '—'}</td>
                  <td className='px-3 py-2 text-muted-foreground'>{inquiry.source}</td>
                  <td className='px-3 py-2 text-muted-foreground'>{inquiry.createdAt ?? '-'}</td>
                  <td className='px-3 py-2'>
                    <button
                      type='button'
                      disabled={loadingEmail === inquiry.email}
                      onClick={() => { void handleToggle(inquiry.email, inquiry.status); }}
                      className='rounded border border-white/10 px-2 py-1 text-xs text-muted-foreground transition-colors hover:border-white/30 hover:text-white disabled:opacity-40'
                    >
                      {getInquiryStatusActionLabel(loadingEmail === inquiry.email, inquiry.status)}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </FormSection>
  );
}

const ARCH_WEB_BASE_URL = 'http://localhost:3400';

const CONTENT_SECTION_KEYS = [
  'nav', 'hero', 'drawing', 'philosophy', 'services', 'projects',
  'process', 'caseStudy', 'quote', 'cta', 'footer',
] as const;

const getTranslationPctColor = (pct: number): string => {
  if (pct === 100) return 'text-emerald-400';
  if (pct >= 50) return 'text-amber-400';
  return 'text-rose-400';
};

const getTranslationBarColor = (pct: number): string => {
  if (pct === 100) return 'bg-emerald-500';
  if (pct >= 50) return 'bg-amber-400';
  return 'bg-rose-500';
};

function TranslationCompletenessPanel({
  localizedContent,
}: {
  localizedContent: MilkbarLocalizedContent;
}): React.JSX.Element {
  const nonEnLocales = MILKBAR_LOCALES.filter((l) => l !== 'en');

  return (
    <FormSection
      title='Translation Completeness'
      subtitle='Sections still identical to EN are untranslated.'
    >
      <div className='space-y-3'>
        {nonEnLocales.map((locale) => {
          const sectionStatuses = CONTENT_SECTION_KEYS.map((key) => ({
            key,
            translated: JSON.stringify(localizedContent[locale][key]) !== JSON.stringify(localizedContent.en[key]),
          }));
          const translatedCount = sectionStatuses.filter((s) => s.translated).length;
          const total = sectionStatuses.length;
          const pct = Math.round((translatedCount / total) * 100);

          return (
            <div key={locale} className='rounded-md border border-white/10 p-3 space-y-2'>
              <div className='flex items-center justify-between gap-3'>
                <span className='text-sm font-medium uppercase tracking-widest text-white'>
                  {locale} — {MILKBAR_LOCALE_LABELS[locale]}
                </span>
                <span className={`text-xs font-semibold ${getTranslationPctColor(pct)}`}>
                  {translatedCount}/{total} sections · {pct}%
                </span>
              </div>
              <div className='h-1.5 w-full overflow-hidden rounded-full bg-white/10'>
                <div
                  className={`h-full rounded-full transition-all ${getTranslationBarColor(pct)}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className='flex flex-wrap gap-1.5'>
                {sectionStatuses.map(({ key, translated }) => (
                  <span
                    key={key}
                    className={`rounded px-1.5 py-0.5 text-[10px] font-medium capitalize ${
                      translated
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'bg-white/5 text-muted-foreground'
                    }`}
                    title={translated ? `${key} — translated` : `${key} — same as EN`}
                  >
                    {key}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </FormSection>
  );
}

function StatusTab({
  snapshot,
  localizedContent,
}: {
  snapshot: MilkbarCmsSnapshot | null;
  localizedContent: MilkbarLocalizedContent;
}): React.JSX.Element {
  return (
    <div className='grid gap-4 lg:grid-cols-2'>
      <FormSection
        title='View on Site'
        subtitle='Open the live arch-web at each published locale.'
      >
        {snapshot === null ? (
          <p className='text-sm text-muted-foreground'>Loading&hellip;</p>
        ) : (
          <div className='space-y-2'>
            {snapshot.pageSettings.publishedLocales.map((locale) => (
              <a
                key={locale}
                href={`${ARCH_WEB_BASE_URL}/${locale}`}
                target='_blank'
                rel='noopener noreferrer'
                className='flex items-center justify-between rounded-md border border-white/10 px-3 py-2 text-sm transition-colors hover:border-white/30 hover:bg-white/5'
              >
                <span className='font-medium uppercase tracking-widest text-white'>{locale}</span>
                <span className='text-xs text-muted-foreground'>{ARCH_WEB_BASE_URL}/{locale} ↗</span>
              </a>
            ))}
            {snapshot.pageSettings.publishedLocales.length === 0 ? (
              <p className='text-xs text-muted-foreground'>No published locales — publish at least one locale in Settings.</p>
            ) : null}
          </div>
        )}
      </FormSection>
      <FormSection title='Database Sources'>
        <div className='space-y-3 text-sm'>
          <SourceStatusCard
            title='GeminiTest App local'
            subtitle='Source of truth'
            status={snapshot?.sourceStatus.sourceOfTruth}
          />
          <SourceStatusCard
            title='Milkbardesigners local'
            subtitle='Runtime mirror tested by the website'
            status={snapshot?.sourceStatus.runtimeLocal}
          />
          <SourceStatusCard
            title='Milkbardesigners cloud'
            subtitle='Push target — mirror of local runtime'
            status={snapshot?.sourceStatus.runtimeCloud}
          />
        </div>
      </FormSection>
      <div className='lg:col-span-2'>
        <PushToCloudPanel cloudConfigured={snapshot?.sourceStatus.runtimeCloud.configured === true} />
      </div>
      <FormSection title='Record Counts'>
        <div className='grid gap-3 sm:grid-cols-2'>
          <CountBox label='Source projects' value={snapshot?.counts.sourceOfTruth.projects ?? 0} />
          <CountBox label='Source services' value={snapshot?.counts.sourceOfTruth.services ?? 0} />
          <CountBox label='Runtime projects' value={snapshot?.counts.runtimeLocal.projects ?? 0} />
          <CountBox label='Runtime services' value={snapshot?.counts.runtimeLocal.services ?? 0} />
          <CountBox label='Runtime inquiries' value={snapshot?.counts.runtimeLocal.inquiries ?? 0} />
        </div>
        <p className='text-xs text-muted-foreground'>
          Editable content source:{' '}
          {snapshot?.contentSource === 'runtimeFallback'
            ? 'runtime fallback until the first source-of-truth save'
            : 'GeminiTest App local source of truth'}
        </p>
        <p className='text-xs text-muted-foreground'>
          Last page content update: {snapshot?.updatedAt ?? 'not saved yet'}
        </p>
        {snapshot !== null ? (
          <div className='mt-2 space-y-1'>
            <p className='text-xs font-medium text-white'>Published locales:</p>
            <div className='flex gap-1.5'>
              {MILKBAR_LOCALES.map((locale) => {
                const isPublished = snapshot.pageSettings.publishedLocales.includes(locale);
                const isDefault = snapshot.pageSettings.defaultLocale === locale;
                return (
                  <Badge
                    key={locale}
                    variant={isPublished ? 'success' : 'outline'}
                    className='uppercase'
                  >
                    {locale}{isDefault ? ' ★' : ''}
                  </Badge>
                );
              })}
            </div>
          </div>
        ) : null}
      </FormSection>
      <div className='lg:col-span-2'>
        <TranslationCompletenessPanel localizedContent={localizedContent} />
      </div>
    </div>
  );
}

function SourceStatusCard({
  title,
  subtitle,
  status,
}: {
  title: string;
  subtitle: string;
  status: MilkbarCmsSnapshot['sourceStatus']['sourceOfTruth'] | undefined;
}): React.JSX.Element {
  return (
    <div className='rounded-md border border-white/10 p-3'>
      <div className='flex items-center justify-between gap-3'>
        <div className='font-medium text-white'>{title}</div>
        <Badge variant={status?.configured === true ? 'success' : 'outline'}>
          {status?.configured === true ? 'Configured' : 'Not configured'}
        </Badge>
      </div>
      <div className='mt-1 text-xs text-muted-foreground'>{subtitle}</div>
      <div className='mt-2 text-muted-foreground'>{status?.uriLabel ?? 'Not configured'}</div>
      <div className='mt-1 text-xs text-muted-foreground'>DB: {status?.dbName ?? '-'}</div>
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

type PushPhase = 'idle' | 'enqueuing' | 'active' | 'done' | 'error';

type LiveProgress = {
  step: number;
  total: number;
  phase: string;
  message: string;
};

const PUSH_STEPS_TOTAL = 4;

const getPushProgressPct = (progress: LiveProgress | null): number => {
  if (!progress) return 0;
  return Math.round((progress.step / PUSH_STEPS_TOTAL) * 100);
};

function PushProgressBar({ pct }: { pct: number }): React.JSX.Element {
  return (
    <div className='h-1 w-full overflow-hidden rounded-full bg-white/10'>
      <div
        className='h-full rounded-full bg-emerald-500 transition-all duration-500'
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function PushToCloudPanel({
  cloudConfigured,
}: {
  cloudConfigured: boolean;
}): React.JSX.Element {
  const { toast } = useToast();
  const [phase, setPhase] = useState<PushPhase>('idle');
  const [lastOutcome, setLastOutcome] = useState<PushToCloudOutcome | null>(null);
  const [progress, setProgress] = useState<LiveProgress | null>(null);
  const [finalResult, setFinalResult] = useState<PushToCloudOutcome['result'] | null>(null);
  const [failedReason, setFailedReason] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeJobId = useRef<string | null>(null);

  const stopPoll = useCallback(() => {
    if (pollRef.current !== null) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startJobPoll = useCallback((jobId: string) => {
    stopPoll();
    activeJobId.current = jobId;
    pollRef.current = setInterval(() => {
      void fetchJobStatus(jobId).then((res) => {
        const js = res.jobStatus;
        if (!js) return;

        if (js.progress) setProgress(js.progress);

        if (js.state === 'completed') {
          stopPoll();
          setProgress({ step: PUSH_STEPS_TOTAL, total: PUSH_STEPS_TOTAL, phase: 'done', message: 'Sync complete' });
          if (js.result) setFinalResult(js.result);
          setPhase('done');
        } else if (js.state === 'failed') {
          stopPoll();
          setFailedReason(js.failedReason ?? 'Job failed');
          setPhase('error');
          toast({ title: 'Push failed', description: js.failedReason ?? 'Job failed in queue', variant: 'destructive' });
        }
      }).catch(() => { /* transient — keep polling */ });
    }, 800);
  }, [stopPoll, toast]);

  useEffect(() => () => stopPoll(), [stopPoll]);

  const handlePush = useCallback(async () => {
    if (!cloudConfigured) return;
    setPhase('enqueuing');
    setLastOutcome(null);
    setProgress(null);
    setFinalResult(null);
    setFailedReason(null);
    try {
      const outcome = await triggerPushToCloud();
      setLastOutcome(outcome);
      if (!outcome.ok) {
        setPhase('error');
        setFailedReason(outcome.error ?? 'Unknown error');
        toast({ title: 'Push failed', description: outcome.error ?? 'Unknown error', variant: 'destructive' });
        return;
      }
      if (outcome.mode === 'queue' && outcome.jobId) {
        setPhase('active');
        startJobPoll(outcome.jobId);
      } else {
        // inline — result is immediate
        setProgress({ step: PUSH_STEPS_TOTAL, total: PUSH_STEPS_TOTAL, phase: 'done', message: 'Sync complete (inline)' });
        if (outcome.result) setFinalResult(outcome.result);
        setPhase('done');
        toast({ title: 'Push complete', description: `${outcome.result?.projectCount ?? 0} projects, ${outcome.result?.serviceCount ?? 0} services.` });
      }
    } catch (err) {
      setPhase('error');
      const msg = err instanceof Error ? err.message : String(err);
      setFailedReason(msg);
      toast({ title: 'Push failed', description: msg, variant: 'destructive' });
    }
  }, [cloudConfigured, startJobPoll, toast]);

  const isRunning = phase === 'enqueuing' || phase === 'active';
  const pct = getPushProgressPct(progress);

  return (
    <FormSection
      title='Push to Cloud'
      subtitle='Mirror the local runtime database to the cloud runtime database via Redis queue.'
    >
      <div className='space-y-4'>
        {!cloudConfigured ? (
          <p className='text-xs text-muted-foreground'>
            Cloud runtime is not configured. Set <code>ARCH_MONGODB_CLOUD_URI</code> and{' '}
            <code>ARCH_MONGODB_CLOUD_DB</code> to enable this action.
          </p>
        ) : null}

        <div className='flex items-center gap-3'>
          <Button
            onClick={() => { void handlePush(); }}
            disabled={!cloudConfigured || isRunning}
            size='sm'
          >
            <Upload className='mr-2 h-3.5 w-3.5' />
            {phase === 'enqueuing' ? 'Enqueuing…' : phase === 'active' ? 'Pushing…' : 'Push to Cloud'}
          </Button>
          {phase === 'done' ? <Badge variant='success'>Done</Badge> : null}
          {phase === 'error' ? <Badge variant='destructive'>Failed</Badge> : null}
        </div>

        {(isRunning || phase === 'done' || phase === 'error') && progress !== null ? (
          <div className='space-y-2 rounded-md border border-white/10 p-3'>
            <div className='flex items-center justify-between text-xs'>
              <span className='text-white'>{progress.message}</span>
              <span className='tabular-nums text-muted-foreground'>{progress.step}/{progress.total}</span>
            </div>
            <PushProgressBar pct={pct} />
          </div>
        ) : null}

        {isRunning && progress === null ? (
          <div className='space-y-2 rounded-md border border-white/10 p-3'>
            <div className='flex items-center justify-between text-xs'>
              <span className='animate-pulse text-muted-foreground'>
                {phase === 'enqueuing' ? 'Waiting for worker…' : 'Starting…'}
              </span>
              <span className='tabular-nums text-muted-foreground'>0/{PUSH_STEPS_TOTAL}</span>
            </div>
            <PushProgressBar pct={0} />
          </div>
        ) : null}

        {phase === 'done' && finalResult !== null ? (
          <div className='rounded-md border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-1 text-xs'>
            <div className='font-medium text-emerald-400'>Sync complete</div>
            <div className='text-muted-foreground'>
              {finalResult.projectCount} projects · {finalResult.serviceCount} services · {finalResult.updatedAt}
            </div>
            {lastOutcome?.jobId ? (
              <div className='text-muted-foreground font-mono'>job: {lastOutcome.jobId}</div>
            ) : null}
          </div>
        ) : null}

        {phase === 'error' && failedReason !== null ? (
          <div className='rounded-md border border-rose-500/20 bg-rose-500/5 p-3 text-xs text-rose-400'>
            {failedReason}
          </div>
        ) : null}

        <p className='text-xs text-muted-foreground'>
          Copies <code>page_content</code>, <code>projects</code>, and <code>services</code> from local
          runtime to cloud. Runs as a BullMQ job when Redis is available; falls back to inline otherwise.
        </p>
      </div>
    </FormSection>
  );
}
