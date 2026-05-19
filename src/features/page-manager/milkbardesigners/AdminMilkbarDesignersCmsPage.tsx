'use client';

/* eslint-disable max-lines, max-lines-per-function, complexity */

import { Box, ChevronDown, ChevronUp, Copy, Download, Eye, EyeOff, Folder, FolderOpen, Globe, GripVertical, Library, MoreVertical, Plus, RefreshCw, RotateCcw, Save, Settings2, Trash2, Upload, XIcon } from 'lucide-react';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Admin3DAssetsPage } from '@/features/viewer3d/admin.public';
import { MediaLibraryPanel } from '@/features/cms/components/page-builder/MediaLibraryPanel';
import { useUploadCmsMedia } from '@/features/cms/hooks/useCmsQueries';
import {
  convertMilkbarModelLinkToAsset3D,
  deleteAsset3DById,
  uploadAsset3DFile,
  uploadMilkbarAsset3DToFastComet,
} from '@/features/viewer3d/api';
import { useAsset3DById, useAssets3D } from '@/features/viewer3d/hooks/useAsset3dQueries';
import type { ImageFileSelection } from '@/shared/contracts/files';
import type { ManagedImageSlot } from '@/shared/contracts/image-slots';
import type { ProductImageManagerController } from '@/shared/contracts/product-image-manager';
import type { Asset3DRecord, Viewer3DState } from '@/shared/contracts/viewer3d';
import { Viewer3D } from '@/features/viewer3d/components/Viewer3D';
import { Viewer3DSettingsPanel } from '@/features/viewer3d/components/Viewer3DSettingsPanel';
import { Viewer3DStatusInfo } from '@/features/viewer3d/components/Viewer3DStatusInfo';
import { Viewer3DProvider, useViewer3DActions } from '@/features/viewer3d/context/Viewer3DContext';
import { DetailModal } from '@/shared/ui/templates/modals';

import {
  DEFAULT_MILKBAR_LOCALIZED_CONTENT,
  DEFAULT_MILKBAR_PAGE_CONTENT,
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
import {
  clearMilkbarCmsEditorDraft,
  compactDrawingImageSlotValues,
  createDrawingImageSlotValues,
  DRAWING_IMAGE_SLOT_COUNT,
  fillDrawingImageSlotValues,
  readMilkbarCmsEditorDraft,
  setDrawingImageSlotValue,
  swapDrawingImageSlotValues,
  writeMilkbarCmsEditorDraft,
} from './milkbar-cms-editor-state';
import {
  getDrawingImageLinkValue,
  toLocalMilkbarCmsMediaPreviewUrl,
} from './milkbar-cms-media-routing';
import type { MutationResult, SingleQuery } from '@/shared/contracts/ui/queries';
import { api } from '@/shared/lib/api-client';
import {
  MILKBAR_CMS_VISUALISATION_FOLDER,
  type FileStorageProfile,
} from '@/shared/lib/files/constants';
import { useMutationV2, useSingleQueryV2 } from '@/shared/lib/query-factories-v2';
import { AdminPageManagerLayout } from '@/shared/ui/admin.public';
import { Alert, Badge, Button, DropdownMenuItem, Input, Switch, Textarea, useToast } from '@/shared/ui/primitives.public';
import { ActionMenu, FormField, FormSection } from '@/shared/ui/forms-and-actions.public';
import { ProductImageManager } from '@/shared/ui/image-slot-manager';
import { LoadingPanel } from '@/shared/ui/navigation-and-layout.public';
import { Tooltip as ProductListTooltip } from '@/shared/ui/tooltip';

const ENDPOINT = '/api/v2/page-manager/milkbardesigners';
const PUSH_ENDPOINT = '/api/v2/page-manager/milkbardesigners/push-to-cloud';
const MILKBAR_CMS_SNAPSHOT_QUERY_KEY = ['page-manager', 'milkbardesigners', 'snapshot'] as const;
const MILKBAR_MODEL_PREVIEW_INITIAL_VIEWER_STATE = {
  renderMode: 'solid',
  backgroundColor: '#111827',
  enableContactShadows: true,
} satisfies Partial<Viewer3DState>;

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

const CONTENT_FOLDER_ALL_SECTIONS = ['nav', 'hero', 'drawing', 'philosophy', 'services', 'process', 'metrics', 'caseStudy', 'quote', 'footer'] as const;
const CONTENT_FOLDER_DEFAULT_ORDER = ['hero', 'drawing', 'philosophy', 'services', 'process', 'metrics', 'caseStudy', 'quote', 'footer'] as const;

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

function swapInArray<T>(arr: T[], i: number, j: number): T[] {
  if (i < 0 || j < 0 || i >= arr.length || j >= arr.length) return arr;
  const next = [...arr];
  const source = next[i] as T;
  const target = next[j] as T;
  [next[i], next[j]] = [target, source];
  return next;
}

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

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readRecordValue = (value: unknown): Record<string, unknown> =>
  isPlainObject(value) ? value : {};

const readStringValue = (value: unknown, fallback: string): string =>
  typeof value === 'string' ? value : fallback;

const readOptionalStringValue = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value : undefined;

const readStringArrayValue = (value: unknown, fallback: string[]): string[] => {
  const source = Array.isArray(value) ? value : fallback;
  return source.filter((entry): entry is string => typeof entry === 'string');
};

const normalizeMilkbarLinks = (
  value: unknown,
  fallback: MilkbarLinkItem[]
): MilkbarLinkItem[] => {
  const source = Array.isArray(value) ? value : fallback;
  return source
    .map((entry, index) => {
      const record = readRecordValue(entry);
      const fallbackItem = fallback[index] ?? { label: '', href: '' };
      return {
        label: readStringValue(record['label'], fallbackItem.label),
        href: readStringValue(record['href'], fallbackItem.href),
      };
    })
    .filter((entry) => entry.label.length > 0 || entry.href.length > 0);
};

const normalizeMilkbarMetrics = (
  value: unknown,
  fallback: MilkbarMetric[]
): MilkbarMetric[] => {
  const source = Array.isArray(value) ? value : fallback;
  return source.map((entry, index) => {
    const record = readRecordValue(entry);
    const fallbackItem = fallback[index] ?? { value: '', suffix: '', label: '' };
    return {
      value: readStringValue(record['value'], fallbackItem.value),
      suffix: readStringValue(record['suffix'], fallbackItem.suffix),
      label: readStringValue(record['label'], fallbackItem.label),
    };
  });
};

const normalizeMilkbarPrinciples = (
  value: unknown,
  fallback: MilkbarPrinciple[]
): MilkbarPrinciple[] => {
  const source = Array.isArray(value) ? value : fallback;
  return source.map((entry, index) => {
    const record = readRecordValue(entry);
    const fallbackItem =
      fallback[index] ?? { number: '', title: '', emphasis: '', description: '' };
    return {
      number: readStringValue(record['number'], fallbackItem.number),
      title: readStringValue(record['title'], fallbackItem.title),
      emphasis: readStringValue(record['emphasis'], fallbackItem.emphasis),
      description: readStringValue(record['description'], fallbackItem.description),
    };
  });
};

const normalizeMilkbarProcessSteps = (
  value: unknown,
  fallback: MilkbarProcessStep[]
): MilkbarProcessStep[] => {
  const source = Array.isArray(value) ? value : fallback;
  return source.map((entry, index) => {
    const record = readRecordValue(entry);
    const fallbackItem = fallback[index] ?? { number: '', title: '', description: '' };
    return {
      number: readStringValue(record['number'], fallbackItem.number),
      title: readStringValue(record['title'], fallbackItem.title),
      description: readStringValue(record['description'], fallbackItem.description),
    };
  });
};

const normalizeMilkbarFooterColumns = (
  value: unknown,
  fallback: MilkbarPageContent['footer']['columns']
): MilkbarPageContent['footer']['columns'] => {
  const source = Array.isArray(value) ? value : fallback;
  return source.map((entry, index) => {
    const record = readRecordValue(entry);
    const fallbackItem = fallback[index] ?? { title: '', links: [] };
    return {
      title: readStringValue(record['title'], fallbackItem.title),
      links: normalizeMilkbarLinks(record['links'], fallbackItem.links),
    };
  });
};

const normalizeMilkbarPageContentForClient = (
  value: unknown,
  fallback: MilkbarPageContent = DEFAULT_MILKBAR_PAGE_CONTENT
): MilkbarPageContent => {
  const content = readRecordValue(value);
  const nav = readRecordValue(content['nav']);
  const hero = readRecordValue(content['hero']);
  const drawing = readRecordValue(content['drawing']);
  const philosophy = readRecordValue(content['philosophy']);
  const services = readRecordValue(content['services']);
  const projects = readRecordValue(content['projects']);
  const process = readRecordValue(content['process']);
  const caseStudy = readRecordValue(content['caseStudy']);
  const quote = readRecordValue(content['quote']);
  const cta = readRecordValue(content['cta']);
  const footer = readRecordValue(content['footer']);

  return {
    nav: {
      brandSub: readStringValue(nav['brandSub'], fallback.nav.brandSub),
      links: normalizeMilkbarLinks(nav['links'], fallback.nav.links),
      ctaLabel: readStringValue(nav['ctaLabel'], fallback.nav.ctaLabel),
    },
    hero: {
      location: readStringValue(hero['location'], fallback.hero.location),
      indexLabel: readStringValue(hero['indexLabel'], fallback.hero.indexLabel),
      titleLines: readStringArrayValue(hero['titleLines'], fallback.hero.titleLines),
      lede: readStringValue(hero['lede'], fallback.hero.lede),
      primaryCtaLabel: readStringValue(hero['primaryCtaLabel'], fallback.hero.primaryCtaLabel),
      secondaryCtaLabel: readStringValue(
        hero['secondaryCtaLabel'],
        fallback.hero.secondaryCtaLabel
      ),
      modelAssetId: readOptionalStringValue(hero['modelAssetId']),
      modelUrl: readOptionalStringValue(hero['modelUrl']),
    },
    drawing: {
      eyebrow: readStringValue(drawing['eyebrow'], fallback.drawing.eyebrow),
      title: readStringValue(drawing['title'], fallback.drawing.title),
      emphasis: readStringValue(drawing['emphasis'], fallback.drawing.emphasis),
      description: readStringValue(drawing['description'], fallback.drawing.description),
      ctaLabel: readStringValue(drawing['ctaLabel'], fallback.drawing.ctaLabel),
      hint: readStringValue(drawing['hint'], fallback.drawing.hint),
      thumbImages: readStringArrayValue(drawing['thumbImages'], fallback.drawing.thumbImages),
      asset3dProjectCodes: readStringArrayValue(
        drawing['asset3dProjectCodes'],
        fallback.drawing.asset3dProjectCodes
      ),
      interiorModelAssetId: readOptionalStringValue(drawing['interiorModelAssetId']),
      interiorModelUrl: readOptionalStringValue(drawing['interiorModelUrl']),
    },
    philosophy: {
      eyebrow: readStringValue(philosophy['eyebrow'], fallback.philosophy.eyebrow),
      title: readStringValue(philosophy['title'], fallback.philosophy.title),
      emphasis: readStringValue(philosophy['emphasis'], fallback.philosophy.emphasis),
      body: readStringValue(philosophy['body'], fallback.philosophy.body),
      closing: readStringValue(philosophy['closing'], fallback.philosophy.closing),
      caption: readStringValue(philosophy['caption'], fallback.philosophy.caption),
      principles: normalizeMilkbarPrinciples(
        philosophy['principles'],
        fallback.philosophy.principles
      ),
    },
    services: {
      eyebrow: readStringValue(services['eyebrow'], fallback.services.eyebrow),
      label: readStringValue(services['label'], fallback.services.label),
      title: readStringValue(services['title'], fallback.services.title),
      emphasis: readStringValue(services['emphasis'], fallback.services.emphasis),
    },
    projects: {
      eyebrow: readStringValue(projects['eyebrow'], fallback.projects.eyebrow),
      label: readStringValue(projects['label'], fallback.projects.label),
      title: readStringValue(projects['title'], fallback.projects.title),
      emphasis: readStringValue(projects['emphasis'], fallback.projects.emphasis),
      projectsViewMode: ((): 'solid' | 'wireframe' | 'edges' => {
        const val = projects['projectsViewMode'];
        if (val === 'solid' || val === 'wireframe' || val === 'edges') return val;
        return fallback.projects.projectsViewMode;
      })(),
    },
    process: {
      eyebrow: readStringValue(process['eyebrow'], fallback.process.eyebrow),
      label: readStringValue(process['label'], fallback.process.label),
      title: readStringValue(process['title'], fallback.process.title),
      emphasis: readStringValue(process['emphasis'], fallback.process.emphasis),
      steps: normalizeMilkbarProcessSteps(process['steps'], fallback.process.steps),
    },
    metrics: normalizeMilkbarMetrics(content['metrics'], fallback.metrics),
    caseStudy: {
      eyebrow: readStringValue(caseStudy['eyebrow'], fallback.caseStudy.eyebrow),
      label: readStringValue(caseStudy['label'], fallback.caseStudy.label),
      title: readStringValue(caseStudy['title'], fallback.caseStudy.title),
      titleEmphasis: readStringValue(
        caseStudy['titleEmphasis'],
        fallback.caseStudy.titleEmphasis
      ),
      heading: readStringValue(caseStudy['heading'], fallback.caseStudy.heading),
      headingEmphasis: readStringValue(
        caseStudy['headingEmphasis'],
        fallback.caseStudy.headingEmphasis
      ),
      body: readStringValue(caseStudy['body'], fallback.caseStudy.body),
      stats: normalizeMilkbarMetrics(caseStudy['stats'], fallback.caseStudy.stats),
      projectCode: readOptionalStringValue(caseStudy['projectCode']),
    },
    quote: {
      eyebrow: readStringValue(quote['eyebrow'], fallback.quote.eyebrow),
      text: readStringValue(quote['text'], fallback.quote.text),
      emphasis: readStringValue(quote['emphasis'], fallback.quote.emphasis),
      attribution: readStringValue(quote['attribution'], fallback.quote.attribution),
    },
    cta: {
      title: readStringValue(cta['title'], fallback.cta.title),
      emphasis: readStringValue(cta['emphasis'], fallback.cta.emphasis),
      description: readStringValue(cta['description'], fallback.cta.description),
      emailPlaceholder: readStringValue(
        cta['emailPlaceholder'],
        fallback.cta.emailPlaceholder
      ),
      submitLabel: readStringValue(cta['submitLabel'], fallback.cta.submitLabel),
      loadingLabel: readStringValue(cta['loadingLabel'], fallback.cta.loadingLabel),
      successMessage: readStringValue(cta['successMessage'], fallback.cta.successMessage),
      note: readStringValue(cta['note'], fallback.cta.note),
    },
    footer: {
      brandName: readStringValue(footer['brandName'], fallback.footer.brandName),
      address: readStringValue(footer['address'], fallback.footer.address),
      tagline: readStringValue(footer['tagline'], fallback.footer.tagline),
      columns: normalizeMilkbarFooterColumns(footer['columns'], fallback.footer.columns),
      copyright: readStringValue(footer['copyright'], fallback.footer.copyright),
    },
  };
};

const normalizeMilkbarLocalizedContentForClient = (
  value: unknown
): MilkbarLocalizedContent => {
  const source = readRecordValue(value);
  return {
    en: normalizeMilkbarPageContentForClient(
      source['en'],
      DEFAULT_MILKBAR_LOCALIZED_CONTENT.en
    ),
    de: normalizeMilkbarPageContentForClient(
      source['de'],
      DEFAULT_MILKBAR_LOCALIZED_CONTENT.de
    ),
    pl: normalizeMilkbarPageContentForClient(
      source['pl'],
      DEFAULT_MILKBAR_LOCALIZED_CONTENT.pl
    ),
  };
};

const isMilkbarLocaleValue = (value: unknown): value is MilkbarLocale =>
  typeof value === 'string' && MILKBAR_LOCALES.includes(value as MilkbarLocale);

const normalizeMilkbarSeoForClient = (
  value: unknown
): MilkbarPageSettings['seo'] => {
  const seo = readRecordValue(value);
  const normalizeLocaleSeo = (locale: MilkbarLocale): MilkbarSeoMeta => {
    const localeSeo = readRecordValue(seo[locale]);
    const fallbackSeo = DEFAULT_MILKBAR_PAGE_SETTINGS.seo[locale];
    return {
      title: readStringValue(localeSeo['title'], fallbackSeo.title),
      description: readStringValue(localeSeo['description'], fallbackSeo.description),
      ogTitle: readStringValue(localeSeo['ogTitle'], fallbackSeo.ogTitle),
      ogDescription: readStringValue(
        localeSeo['ogDescription'],
        fallbackSeo.ogDescription
      ),
    };
  };

  return {
    en: normalizeLocaleSeo('en'),
    de: normalizeLocaleSeo('de'),
    pl: normalizeLocaleSeo('pl'),
  };
};

const normalizeMilkbarPageSettingsForClient = (value: unknown): MilkbarPageSettings => {
  const settings = readRecordValue(value);
  const visibility = readRecordValue(settings['visibility']);
  const publishedLocales = readStringArrayValue(
    settings['publishedLocales'],
    DEFAULT_MILKBAR_PAGE_SETTINGS.publishedLocales
  ).filter(isMilkbarLocaleValue);
  const defaultLocale = isMilkbarLocaleValue(settings['defaultLocale'])
    ? settings['defaultLocale']
    : DEFAULT_MILKBAR_PAGE_SETTINGS.defaultLocale;

  return {
    visibility: {
      drawing:
        typeof visibility['drawing'] === 'boolean'
          ? visibility['drawing']
          : DEFAULT_MILKBAR_PAGE_SETTINGS.visibility.drawing,
      philosophy:
        typeof visibility['philosophy'] === 'boolean'
          ? visibility['philosophy']
          : DEFAULT_MILKBAR_PAGE_SETTINGS.visibility.philosophy,
      services:
        typeof visibility['services'] === 'boolean'
          ? visibility['services']
          : DEFAULT_MILKBAR_PAGE_SETTINGS.visibility.services,
      projects:
        typeof visibility['projects'] === 'boolean'
          ? visibility['projects']
          : DEFAULT_MILKBAR_PAGE_SETTINGS.visibility.projects,
      process:
        typeof visibility['process'] === 'boolean'
          ? visibility['process']
          : DEFAULT_MILKBAR_PAGE_SETTINGS.visibility.process,
      metrics:
        typeof visibility['metrics'] === 'boolean'
          ? visibility['metrics']
          : DEFAULT_MILKBAR_PAGE_SETTINGS.visibility.metrics,
      caseStudy:
        typeof visibility['caseStudy'] === 'boolean'
          ? visibility['caseStudy']
          : DEFAULT_MILKBAR_PAGE_SETTINGS.visibility.caseStudy,
      quote:
        typeof visibility['quote'] === 'boolean'
          ? visibility['quote']
          : DEFAULT_MILKBAR_PAGE_SETTINGS.visibility.quote,
      cta:
        typeof visibility['cta'] === 'boolean'
          ? visibility['cta']
          : DEFAULT_MILKBAR_PAGE_SETTINGS.visibility.cta,
    },
    seo: normalizeMilkbarSeoForClient(settings['seo']),
    defaultLocale,
    publishedLocales: publishedLocales.length > 0 ? publishedLocales : [defaultLocale],
    contactEmail: readStringValue(
      settings['contactEmail'],
      DEFAULT_MILKBAR_PAGE_SETTINGS.contactEmail
    ),
  };
};

const normalizeRecordArray = <T,>(value: unknown): T[] =>
  Array.isArray(value) ? value.filter(isPlainObject).map((entry) => entry as T) : [];

const normalizeMilkbarCmsSnapshotForClient = (
  nextSnapshot: MilkbarCmsSnapshot
): MilkbarCmsSnapshot => ({
  ...nextSnapshot,
  localizedContent: normalizeMilkbarLocalizedContentForClient(
    nextSnapshot.localizedContent
  ),
  pageSettings: normalizeMilkbarPageSettingsForClient(nextSnapshot.pageSettings),
  projects: normalizeRecordArray<MilkbarProjectCmsRecord>(nextSnapshot.projects),
  services: normalizeRecordArray<MilkbarServiceCmsRecord>(nextSnapshot.services),
});

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

const getModelUploadButtonLabel = (
  uploading: boolean,
  uploadProgress: number | null,
  hasModel: boolean
): string => {
  if (uploading) {
    return uploadProgress !== null ? `${uploadProgress}%` : 'Uploading...';
  }
  return hasModel ? 'Replace' : 'Upload .glb / .gltf';
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
type PushToCloudResultSummary = NonNullable<PushToCloudOutcome['result']>;

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
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  description?: string;
  placeholder?: string;
  type?: React.HTMLInputTypeAttribute;
}): React.JSX.Element {
  return (
    <FormField label={label} description={description}>
      <Input
        type={type}
        value={String(value)}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
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
  const draftHydratedRef = useRef(false);
  const latestEditorPayloadRef = useRef<MilkbarCmsSavePayload>({
    localizedContent,
    pageSettings,
    projects,
    services,
  });
  const latestSavedSnapshotRef = useRef<MilkbarCmsSnapshot | null>(null);

  latestEditorPayloadRef.current = {
    localizedContent,
    pageSettings,
    projects,
    services,
  };

  const rememberSavedSnapshot = useCallback((nextSnapshot: MilkbarCmsSnapshot): MilkbarCmsSnapshot => {
    const normalizedSnapshot = normalizeMilkbarCmsSnapshotForClient(nextSnapshot);
    setError(null);
    setSnapshot(normalizedSnapshot);
    latestSavedSnapshotRef.current = normalizedSnapshot;
    return normalizedSnapshot;
  }, []);

  const applySnapshot = useCallback((nextSnapshot: MilkbarCmsSnapshot): void => {
    const normalizedSnapshot = rememberSavedSnapshot(nextSnapshot);
    setLocalizedContent(normalizedSnapshot.localizedContent);
    setPageSettings(normalizedSnapshot.pageSettings);
    setProjects(normalizedSnapshot.projects);
    setServices(normalizedSnapshot.services);
    latestEditorPayloadRef.current = {
      localizedContent: normalizedSnapshot.localizedContent,
      pageSettings: normalizedSnapshot.pageSettings,
      projects: normalizedSnapshot.projects,
      services: normalizedSnapshot.services,
    };
  }, [rememberSavedSnapshot]);

  useEffect(() => {
    if (snapshotQuery.data !== undefined) {
      const draft = draftHydratedRef.current ? readMilkbarCmsEditorDraft() : null;
      if (draft !== null && draft.snapshotUpdatedAt === snapshotQuery.data.updatedAt) {
        return;
      }
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

  const persistSnapshotPayload = useCallback(
    async (
      payload: MilkbarCmsSavePayload,
      options: { hydrateEditor?: boolean } = {}
    ): Promise<MilkbarCmsSnapshot> => {
      setError(null);
      try {
        const nextSnapshot = await saveSnapshotMutation.mutateAsync(payload);
        if (options.hydrateEditor === true) {
          applySnapshot(nextSnapshot);
        } else {
          rememberSavedSnapshot(nextSnapshot);
        }
        return nextSnapshot;
      } catch (saveError) {
        const message = toErrorMessage(saveError);
        setError(message);
        throw saveError;
      }
    },
    [applySnapshot, rememberSavedSnapshot, saveSnapshotMutation]
  );

  const saveSnapshot = useCallback(async (): Promise<void> => {
    try {
      await persistSnapshotPayload(latestEditorPayloadRef.current, { hydrateEditor: true });
      toast('Milkbardesigners CMS saved.', { variant: 'success' });
    } catch (saveError) {
      const message = toErrorMessage(saveError);
      toast(message, { variant: 'error' });
    }
  }, [persistSnapshotPayload, toast]);

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

  // ── Move (reorder) handlers ──────────────────────────────────────────────────

  const moveNavLink = useCallback((from: number, to: number): void => {
    setLocalizedContent((current) => ({
      ...current,
      [activeLocale]: {
        ...current[activeLocale],
        nav: { ...current[activeLocale].nav, links: swapInArray(current[activeLocale].nav.links, from, to) },
      },
    }));
  }, [activeLocale]);

  const movePrinciple = useCallback((from: number, to: number): void => {
    setLocalizedContent((current) => ({
      ...current,
      [activeLocale]: {
        ...current[activeLocale],
        philosophy: {
          ...current[activeLocale].philosophy,
          principles: swapInArray(current[activeLocale].philosophy.principles, from, to),
        },
      },
    }));
  }, [activeLocale]);

  const moveProcessStep = useCallback((from: number, to: number): void => {
    setLocalizedContent((current) => ({
      ...current,
      [activeLocale]: {
        ...current[activeLocale],
        process: {
          ...current[activeLocale].process,
          steps: swapInArray(current[activeLocale].process.steps, from, to),
        },
      },
    }));
  }, [activeLocale]);

  const moveMetric = useCallback((from: number, to: number): void => {
    setLocalizedContent((current) => ({
      ...current,
      [activeLocale]: {
        ...current[activeLocale],
        metrics: swapInArray(current[activeLocale].metrics, from, to),
      },
    }));
  }, [activeLocale]);

  const moveCaseStudyStat = useCallback((from: number, to: number): void => {
    setLocalizedContent((current) => ({
      ...current,
      [activeLocale]: {
        ...current[activeLocale],
        caseStudy: {
          ...current[activeLocale].caseStudy,
          stats: swapInArray(current[activeLocale].caseStudy.stats, from, to),
        },
      },
    }));
  }, [activeLocale]);

  const moveFooterColumn = useCallback((from: number, to: number): void => {
    setLocalizedContent((current) => ({
      ...current,
      [activeLocale]: {
        ...current[activeLocale],
        footer: {
          ...current[activeLocale].footer,
          columns: swapInArray(current[activeLocale].footer.columns, from, to),
        },
      },
    }));
  }, [activeLocale]);

  const moveFooterLink = useCallback((colIndex: number, from: number, to: number): void => {
    setLocalizedContent((current) => {
      const columns = current[activeLocale].footer.columns.map((col, ci) => {
        if (ci !== colIndex) return col;
        return { ...col, links: swapInArray(col.links, from, to) };
      });
      return {
        ...current,
        [activeLocale]: { ...current[activeLocale], footer: { ...current[activeLocale].footer, columns } },
      };
    });
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

  const updateContactEmail = useCallback((contactEmail: string): void => {
    setPageSettings((current) => ({ ...current, contactEmail }));
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

  useEffect(() => {
    if (snapshot === null || !draftHydratedRef.current) return;
    if (!isDirty) {
      clearMilkbarCmsEditorDraft();
      return;
    }
    writeMilkbarCmsEditorDraft({
      payload: {
        localizedContent,
        pageSettings,
        projects,
        services,
      },
      snapshotUpdatedAt: snapshot.updatedAt,
      updatedAt: new Date().toISOString(),
    });
  }, [isDirty, localizedContent, pageSettings, projects, services, snapshot]);

  useEffect(() => {
    if (snapshot === null || draftHydratedRef.current) return;
    draftHydratedRef.current = true;
    const draft = readMilkbarCmsEditorDraft();
    if (draft === null) return;
    if (draft.snapshotUpdatedAt !== snapshot.updatedAt) {
      clearMilkbarCmsEditorDraft();
      return;
    }
    setLocalizedContent(
      normalizeMilkbarLocalizedContentForClient(draft.payload.localizedContent)
    );
    setPageSettings(normalizeMilkbarPageSettingsForClient(draft.payload.pageSettings));
    setProjects(normalizeRecordArray<MilkbarProjectCmsRecord>(draft.payload.projects));
    setServices(normalizeRecordArray<MilkbarServiceCmsRecord>(draft.payload.services));
    toast('Restored unsaved Milkbardesigners CMS draft.', { variant: 'info' });
  }, [snapshot, toast]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent): void => {
      event.preventDefault();
      Reflect.set(event, 'returnValue', '');
    };
    if (isDirty) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }
    return () => {
      if (isDirty) {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      }
    };
  }, [isDirty]);

  const handleRevert = useCallback((): void => {
    if (snapshot === null) return;
    clearMilkbarCmsEditorDraft();
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
              <ContentFolderTree
                pageContent={activePageContent}
                projects={projects}
                updateNav={updateNav}
                updateNavLink={updateNavLink}
                addNavLink={addNavLink}
                removeNavLink={removeNavLink}
                moveNavLink={moveNavLink}
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
                moveCaseStudyStat={moveCaseStudyStat}
                updateQuote={updateQuote}
                updateCta={updateCta}
                updateFooter={updateFooter}
                updateFooterColumnTitle={updateFooterColumnTitle}
                addFooterColumn={addFooterColumn}
                removeFooterColumn={removeFooterColumn}
                moveFooterColumn={moveFooterColumn}
                updateFooterLink={updateFooterLink}
                addFooterLink={addFooterLink}
                removeFooterLink={removeFooterLink}
                moveFooterLink={moveFooterLink}
                updatePrinciple={updatePrinciple}
                addPrinciple={addPrinciple}
                removePrinciple={removePrinciple}
                movePrinciple={movePrinciple}
                updateProcessStep={updateProcessStep}
                addProcessStep={addProcessStep}
                removeProcessStep={removeProcessStep}
                moveProcessStep={moveProcessStep}
                updateMetric={updateMetric}
                addMetric={addMetric}
                removeMetric={removeMetric}
                moveMetric={moveMetric}
                sectionVisibility={pageSettings.visibility}
                onUpdateVisibility={updateVisibility}
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
                  if (src === undefined) return current;
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
                  const target = next[index];
                  const previous = next[index - 1];
                  if (target === undefined || previous === undefined) return current;
                  next[index - 1] = target;
                  next[index] = previous;
                  return next;
                })
              }
              onMoveDown={(index) =>
                setProjects((current) => {
                  if (index >= current.length - 1) return current;
                  const next = [...current];
                  const target = next[index];
                  const nextItem = next[index + 1];
                  if (target === undefined || nextItem === undefined) return current;
                  next[index] = nextItem;
                  next[index + 1] = target;
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
                  if (src === undefined) return current;
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
                  const target = next[index];
                  const previous = next[index - 1];
                  if (target === undefined || previous === undefined) return current;
                  next[index - 1] = target;
                  next[index] = previous;
                  return next;
                })
              }
              onMoveDown={(index) =>
                setServices((current) => {
                  if (index >= current.length - 1) return current;
                  const next = [...current];
                  const target = next[index];
                  const nextItem = next[index + 1];
                  if (target === undefined || nextItem === undefined) return current;
                  next[index] = nextItem;
                  next[index + 1] = target;
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
              onUpdateContactEmail={updateContactEmail}
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

// ─── Master folder tree components ───────────────────────────────────────────

function SectionFolderRow({
  id,
  title,
  subtitle,
  open,
  onToggle,
  actions,
  children,
  isDraggable = false,
  isDragging = false,
  onDragHandleMouseDown,
  visibilityOn,
  onToggleVisibility,
}: {
  id: string;
  title: string;
  subtitle?: string;
  open: boolean;
  onToggle: (id: string) => void;
  actions?: React.ReactNode;
  children: React.ReactNode;
  isDraggable?: boolean;
  isDragging?: boolean;
  onDragHandleMouseDown?: () => void;
  visibilityOn?: boolean;
  onToggleVisibility?: () => void;
}): React.JSX.Element {
  return (
    <div className={`rounded-lg border transition-opacity ${open ? 'border-white/20' : 'border-white/10'} ${isDragging ? 'opacity-40' : ''}`}>
      <div
        className={`flex items-center gap-1 px-2 py-2.5 transition-colors ${open ? 'bg-white/5' : 'hover:bg-white/5'}`}
      >
        {isDraggable ? (
          <GripVertical
            className='size-4 shrink-0 cursor-grab text-muted-foreground/25 transition-colors hover:text-muted-foreground/60 active:cursor-grabbing'
            onMouseDown={onDragHandleMouseDown}
          />
        ) : (
          <div className='size-4 shrink-0' />
        )}
        <button
          type='button'
          onClick={() => onToggle(id)}
          className='flex min-w-0 flex-1 items-center gap-2.5 px-1 text-left'
          aria-expanded={open}
        >
          {open ? (
            <FolderOpen className='size-4 shrink-0 text-amber-400/80' />
          ) : (
            <Folder className={`size-4 shrink-0 ${visibilityOn === false ? 'text-muted-foreground/30' : 'text-muted-foreground/70'}`} />
          )}
          <span className={`text-sm font-medium ${visibilityOn === false ? 'text-muted-foreground/50' : 'text-white'}`}>{title}</span>
          {visibilityOn === false ? (
            <span className='shrink-0 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-500/70'>hidden</span>
          ) : null}
          {subtitle !== undefined && subtitle.length > 0 ? (
            <span className='text-xs text-muted-foreground'>{subtitle}</span>
          ) : null}
          <ChevronDown
            className={`ml-auto size-3.5 shrink-0 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </button>
        {onToggleVisibility !== undefined ? (
          <button
            type='button'
            onClick={(e) => { e.stopPropagation(); onToggleVisibility(); }}
            className={`flex size-6 shrink-0 items-center justify-center rounded transition-colors hover:bg-white/10 ${visibilityOn === false ? 'text-muted-foreground/30 hover:text-muted-foreground' : 'text-muted-foreground/60 hover:text-white'}`}
            title={visibilityOn === false ? 'Section hidden on live site — click to show' : 'Section visible on live site — click to hide'}
            aria-label={visibilityOn === false ? 'Show section' : 'Hide section'}
          >
            {visibilityOn === false ? <EyeOff className='size-3.5' /> : <Eye className='size-3.5' />}
          </button>
        ) : null}
        {actions !== undefined && open ? (
          <div className='flex shrink-0 items-center gap-1.5 pr-1'>{actions}</div>
        ) : null}
      </div>
      {open ? (
        <div className='space-y-3 border-t border-white/10 p-4'>
          {visibilityOn === false ? (
            <div className='flex items-center gap-2 rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2'>
              <EyeOff className='size-3.5 shrink-0 text-amber-500/60' />
              <span className='text-xs text-amber-500/70'>This section is hidden on the live site. Changes are saved but not displayed to visitors.</span>
            </div>
          ) : null}
          {children}
        </div>
      ) : null}
    </div>
  );
}

function SubFolderRow({
  title,
  count,
  open,
  onToggle,
  actions,
  children,
}: {
  title: string;
  count?: number;
  open: boolean;
  onToggle: () => void;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className='rounded border border-white/8 bg-white/[0.02]'>
      <div className='flex items-center justify-between gap-2 px-2.5 py-2 transition-colors hover:bg-white/5'>
        <button
          type='button'
          onClick={onToggle}
          className='flex min-w-0 flex-1 items-center gap-2 text-left'
          aria-expanded={open}
        >
          {open ? (
            <FolderOpen className='size-3.5 shrink-0 text-amber-400/50' />
          ) : (
            <Folder className='size-3.5 shrink-0 text-muted-foreground/50' />
          )}
          <span className='text-xs font-medium text-muted-foreground'>{title}</span>
          {count !== undefined ? (
            <span className='rounded bg-white/10 px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground/70'>
              {count}
            </span>
          ) : null}
          <ChevronDown
            className={`ml-auto size-3 shrink-0 text-muted-foreground/50 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </button>
        {actions !== undefined ? (
          <div className='flex shrink-0 items-center gap-1'>{actions}</div>
        ) : null}
      </div>
      {open && children !== undefined ? (
        <div className='border-t border-white/8 px-2.5 py-2 space-y-1.5'>{children}</div>
      ) : null}
    </div>
  );
}

function SubItemMoveButtons({
  index,
  total,
  onMoveUp,
  onMoveDown,
}: {
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
}): React.JSX.Element {
  return (
    <div className='flex items-center'>
      <button
        type='button'
        onClick={onMoveUp}
        disabled={index === 0}
        className='flex size-6 items-center justify-center rounded text-muted-foreground/60 transition-colors hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-20'
        aria-label='Move up'
      >
        <ChevronUp className='size-3' />
      </button>
      <button
        type='button'
        onClick={onMoveDown}
        disabled={index >= total - 1}
        className='flex size-6 items-center justify-center rounded text-muted-foreground/60 transition-colors hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-20'
        aria-label='Move down'
      >
        <ChevronDown className='size-3' />
      </button>
    </div>
  );
}

const getAsset3DMetadataString = (
  asset: Asset3DRecord | undefined,
  key: string
): string | null => {
  const value = asset?.metadata?.[key];
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const isMilkbarFastCometAsset = (asset: Asset3DRecord | undefined): boolean => {
  if (getAsset3DMetadataString(asset, 'storageProfile') !== 'milkbarCms') return false;
  const storageSource = getAsset3DMetadataString(asset, 'storageSource');
  const uploadStatus = getAsset3DMetadataString(asset, 'fastCometUploadStatus');
  const filepath = asset?.filepath?.trim() ?? '';
  const fileUrl = asset?.fileUrl?.trim() ?? '';
  return (
    storageSource === 'fastcomet' ||
    uploadStatus === 'completed' ||
    /^https?:\/\//i.test(filepath) ||
    /^https?:\/\//i.test(fileUrl)
  );
};

const getModelUrlDisplayName = (modelUrl: string): string => {
  const trimmed = modelUrl.trim();
  if (trimmed.length === 0) return '3D model URL';
  try {
    const parsed = new URL(trimmed, 'https://milkbar.local');
    const filename = decodeURIComponent(parsed.pathname.split('/').filter(Boolean).pop() ?? '');
    return filename.length > 0 ? filename : trimmed;
  } catch {
    const filename = trimmed.split('/').filter(Boolean).pop() ?? '';
    return filename.length > 0 ? filename : trimmed;
  }
};

const isMilkbarModelUrl = (modelUrl: string | undefined): boolean =>
  modelUrl?.includes('/uploads/cms/models/') === true;

const isMilkbarFastCometModelUrl = (modelUrl: string | undefined): boolean => {
  const trimmed = modelUrl?.trim() ?? '';
  if (!/^https?:\/\//i.test(trimmed)) return false;
  return isMilkbarModelUrl(trimmed);
};

type Model3DSlotViewMode = 'upload' | 'link' | 'fastcomet';
type Model3DSlotSources = {
  fastCometUrl: string;
  linkUrl: string;
  uploadUrl: string;
};

const MILKBAR_MODEL_PUBLIC_PATH_PREFIX = '/uploads/cms/models/';
const DEFAULT_MILKBAR_FASTCOMET_PUBLIC_BASE_URL = 'https://uploads.milkbardesigners.com';

const model3DSlotViewModeLabels: Record<Model3DSlotViewMode, string> = {
  upload: 'Upload',
  link: 'Link',
  fastcomet: 'FastComet',
};

const model3DSlotViewModeOptions: Model3DSlotViewMode[] = ['upload', 'link', 'fastcomet'];

const resolveModel3DSlotViewModeLabel = (mode: Model3DSlotViewMode | undefined): string =>
  model3DSlotViewModeLabels[mode ?? 'upload'];

const trimText = (value: string | undefined | null): string => value?.trim() ?? '';

const getMilkbarFastCometModelBaseUrl = (): string => {
  const configured =
    process.env['NEXT_PUBLIC_MILKBAR_FASTCOMET_PUBLIC_BASE_URL'] ??
    process.env['NEXT_PUBLIC_MILKBAR_FASTCOMET_BASE_URL'] ??
    '';
  const trimmed = configured.trim();
  return trimmed.length > 0 ? trimmed.replace(/\/+$/, '') : DEFAULT_MILKBAR_FASTCOMET_PUBLIC_BASE_URL;
};

const joinPublicUrl = (baseUrl: string, publicPath: string): string =>
  `${baseUrl.replace(/\/+$/, '')}/${publicPath.replace(/^\/+/, '')}`;

const toMilkbarModelPublicPath = (value: string | undefined | null): string | null => {
  const trimmed = trimText(value);
  if (trimmed.length === 0) return null;
  const markerIndex = trimmed.indexOf(MILKBAR_MODEL_PUBLIC_PATH_PREFIX);
  if (markerIndex >= 0) {
    return trimmed.slice(markerIndex).split(/[?#]/)[0] ?? null;
  }
  try {
    const parsed = new URL(trimmed, 'https://milkbar.local');
    return parsed.pathname.startsWith(MILKBAR_MODEL_PUBLIC_PATH_PREFIX) ? parsed.pathname : null;
  } catch {
    return null;
  }
};

const getAsset3DModelPublicPath = (asset: Asset3DRecord | undefined): string | null => {
  if (asset === undefined) return null;
  const candidates = [
    getAsset3DMetadataString(asset, 'publicPath'),
    getAsset3DMetadataString(asset, 'localPublicPath'),
    asset.filepath,
    asset.fileUrl,
  ];
  for (const candidate of candidates) {
    const publicPath = toMilkbarModelPublicPath(candidate);
    if (publicPath !== null) return publicPath;
  }
  return null;
};

const resolveFastCometModelUrl = (publicPath: string | null): string =>
  publicPath === null ? '' : joinPublicUrl(getMilkbarFastCometModelBaseUrl(), publicPath);

const resolveModel3DSlotSources = ({
  assetId,
  asset,
  modelUrl,
  isMissing,
}: {
  assetId: string;
  asset: Asset3DRecord | undefined;
  modelUrl: string;
  isMissing: boolean;
}): Model3DSlotSources => {
  const assignedAssetId = assetId.trim();
  const assignedModelUrl = modelUrl.trim();
  const assetPublicPath = getAsset3DModelPublicPath(asset);
  const modelPublicPath = toMilkbarModelPublicPath(assignedModelUrl);
  const publicPath = assetPublicPath ?? modelPublicPath;
  const canUseFastCometSource =
    publicPath !== null &&
    (assignedAssetId.length === 0 ||
      asset === undefined ||
      isMilkbarFastCometAsset(asset) ||
      isMilkbarFastCometModelUrl(assignedModelUrl));
  let uploadUrl = publicPath ?? '';
  if (uploadUrl.length === 0 && assignedAssetId.length > 0 && !isMissing) {
    uploadUrl = `/api/assets3d/${encodeURIComponent(assignedAssetId)}/file`;
  }
  return {
    uploadUrl,
    linkUrl: assignedModelUrl.length > 0 && modelPublicPath === null ? assignedModelUrl : '',
    fastCometUrl: canUseFastCometSource ? resolveFastCometModelUrl(publicPath) : '',
  };
};

const isModel3DSlotViewModeDisabled = (
  mode: Model3DSlotViewMode,
  sources: Model3DSlotSources
): boolean => {
  if (mode === 'upload') return sources.uploadUrl.length === 0;
  if (mode === 'link') return sources.linkUrl.length === 0;
  return sources.fastCometUrl.length === 0;
};

const resolveEffectiveModel3DSlotViewMode = (
  requestedMode: Model3DSlotViewMode,
  sources: Model3DSlotSources
): Model3DSlotViewMode => {
  if (!isModel3DSlotViewModeDisabled(requestedMode, sources)) return requestedMode;
  return model3DSlotViewModeOptions.find((mode) => !isModel3DSlotViewModeDisabled(mode, sources)) ?? 'upload';
};

const getModel3DSlotPreviewUrl = (
  mode: Model3DSlotViewMode,
  sources: Model3DSlotSources
): string => {
  if (mode === 'upload') return sources.uploadUrl;
  if (mode === 'link') return sources.linkUrl;
  return sources.fastCometUrl;
};

type Model3DSlotStatusTone = 'success' | 'pending' | 'failure';
type Model3DSlotSourceIndicator = {
  colorClass: string;
  hasValue: boolean;
  label: string;
  name: string;
  status: string;
};

const model3DSlotStatusToneClass: Record<Model3DSlotStatusTone, string> = {
  success: 'border-emerald-400/70 bg-emerald-500/15 text-emerald-100',
  pending: 'border-amber-400/70 bg-amber-500/15 text-amber-100',
  failure: 'border-rose-400/70 bg-rose-500/15 text-rose-100',
};

const getModel3DSourceBadgeTooltip = (
  indicator: Pick<Model3DSlotSourceIndicator, 'label' | 'name' | 'status'>
): string => `Badge: ${indicator.name} (${indicator.label})\nStatus: ${indicator.status}`;

const resolveModel3DUploadBadgeStatus = ({
  hasAssetId,
  isMissing,
  isResolving,
  isUploading,
}: {
  hasAssetId: boolean;
  isMissing: boolean;
  isResolving: boolean;
  isUploading: boolean;
}): string => {
  if (isMissing) return 'Missing asset';
  if (isUploading) return 'Uploading';
  if (isResolving) return 'Resolving asset';
  if (hasAssetId) return 'Assigned';
  return 'No upload or library asset';
};

const resolveModel3DLinkBadgeStatus = ({
  hasModelUrl,
  isFastComet,
}: {
  hasModelUrl: boolean;
  isFastComet: boolean;
}): string => {
  if (!hasModelUrl) return 'No linked URL';
  return isFastComet ? 'Stored as FastComet link' : 'Linked';
};

const resolveModel3DFastCometBadgeStatus = ({
  isFastComet,
  isUploading,
}: {
  isFastComet: boolean;
  isUploading: boolean;
}): string => {
  if (isUploading) return 'Uploading';
  if (isFastComet) return 'Available';
  return 'Not uploaded';
};

function Model3DSlotSourceBadges({
  hasAssetId,
  hasModelUrl,
  isFastComet,
  isUploading,
  isMissing = false,
  isResolving = false,
}: {
  hasAssetId: boolean;
  hasModelUrl: boolean;
  isFastComet: boolean;
  isUploading: boolean;
  isMissing?: boolean;
  isResolving?: boolean;
}): React.JSX.Element {
  let uploadTone: Model3DSlotStatusTone = 'success';
  if (isMissing) {
    uploadTone = 'failure';
  } else if (isUploading || isResolving) {
    uploadTone = 'pending';
  }
  const uploadStatus = resolveModel3DUploadBadgeStatus({
    hasAssetId,
    isMissing,
    isResolving,
    isUploading,
  });
  const linkStatus = resolveModel3DLinkBadgeStatus({ hasModelUrl, isFastComet });
  const fastCometStatus = resolveModel3DFastCometBadgeStatus({ isFastComet, isUploading });
  const indicators: Model3DSlotSourceIndicator[] = [
    {
      colorClass: model3DSlotStatusToneClass[uploadTone],
      hasValue: hasAssetId || isUploading,
      label: 'U',
      name: 'Upload or local model',
      status: uploadStatus,
    },
    {
      colorClass: model3DSlotStatusToneClass.pending,
      hasValue: hasModelUrl && !isFastComet,
      label: 'L',
      name: 'Linked model URL',
      status: linkStatus,
    },
    {
      colorClass: model3DSlotStatusToneClass[isUploading ? 'pending' : 'success'],
      hasValue: isFastComet || isUploading,
      label: 'F',
      name: 'FastComet model',
      status: fastCometStatus,
    },
  ];

  return (
    <div className='flex w-full items-center justify-center gap-1 text-[10px] text-gray-400'>
      {indicators.map((indicator) => (
        <ProductListTooltip
          key={indicator.label}
          content={getModel3DSourceBadgeTooltip(indicator)}
          className='inline-flex shrink-0'
          maxWidth='220px'
        >
          <span
            className={`cursor-help rounded-full border px-1 ${
              indicator.hasValue ? indicator.colorClass : 'border-gray-600 text-gray-500'
            }`}
          >
            {indicator.label}
          </span>
        </ProductListTooltip>
      ))}
    </div>
  );
}

const createDrawingImageSelection = (src: string, index: number): ImageFileSelection => {
  const previewUrl = toLocalMilkbarCmsMediaPreviewUrl(src);
  return {
    id: `milkbar-drawing-image-${index}-${src}`,
    filepath: previewUrl,
    publicUrl: previewUrl,
    url: previewUrl,
    filename: src.split('/').pop() ?? `drawing-image-${index + 1}`,
  };
};

const createDrawingManagedImageSlot = (
  src: string,
  index: number
): ManagedImageSlot => {
  const trimmed = src.trim();
  if (trimmed.length === 0) return null;
  return {
    type: 'existing',
    data: createDrawingImageSelection(trimmed, index),
    previewUrl: toLocalMilkbarCmsMediaPreviewUrl(trimmed),
    slotId: `milkbar-drawing-image-slot-${index}`,
  };
};

function DrawingImageSlotsField({
  value,
  onChange,
}: {
  value: string[];
  onChange: (images: string[]) => void | Promise<void>;
}): React.JSX.Element {
  const { toast } = useToast();
  const uploadMutation = useUploadCmsMedia();
  const [mediaOpen, setMediaOpen] = useState(false);
  const [activeSlotIndex, setActiveSlotIndex] = useState<number | null>(null);
  const slotValues = useMemo(() => createDrawingImageSlotValues(value), [value]);
  const slotImageLinks = useMemo(
    () => slotValues.map(getDrawingImageLinkValue),
    [slotValues]
  );
  const slotValuesRef = useRef(slotValues);
  slotValuesRef.current = slotValues;

  const setSlotValues = useCallback(
    async (nextValues: string[]): Promise<void> => {
      const compactedValues = compactDrawingImageSlotValues(nextValues);
      slotValuesRef.current = createDrawingImageSlotValues(compactedValues);
      await onChange(compactedValues);
    },
    [onChange]
  );

  const setSlotValue = useCallback(
    async (index: number, nextValue: string): Promise<void> => {
      const nextValues = setDrawingImageSlotValue(slotValuesRef.current, index, nextValue);
      if (nextValues === null) return;
      await setSlotValues(nextValues);
    },
    [setSlotValues]
  );

  const fillSlotsWithFilepaths = useCallback(
    async (filepaths: string[], preferredIndex: number | null): Promise<void> => {
      const nextValues = fillDrawingImageSlotValues(slotValuesRef.current, filepaths, preferredIndex);
      if (nextValues === null) return;
      await setSlotValues(nextValues);
    },
    [setSlotValues]
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
        await setSlotValue(index, filepath);
        toast('Drawing image uploaded locally. Save CMS to publish it to FastComet.', {
          variant: 'success',
        });
      } catch (error) {
        toast(`Drawing image upload/save failed: ${toErrorMessage(error)}`, { variant: 'error' });
      }
    },
    [setSlotValue, toast, uploadMutation]
  );

  const controller = useMemo<ProductImageManagerController>(
    () => ({
      imageSlots: slotValues.map(createDrawingManagedImageSlot),
      imageLinks: slotImageLinks,
      imageBase64s: Array.from({ length: DRAWING_IMAGE_SLOT_COUNT }, () => ''),
      setImageLinkAt: (index: number, nextValue: string): void => {
        void setSlotValue(index, nextValue);
      },
      setImageBase64At: (): void => {
        // Base64 storage is intentionally not used for arch-web CMS thumbnails.
      },
      handleSlotImageChange: (file: File | null, index: number): void => {
        if (file === null) {
          void setSlotValue(index, '').catch((error: unknown) => {
            toast(`Drawing image clear failed: ${toErrorMessage(error)}`, { variant: 'error' });
          });
          return;
        }
        void uploadSlotFile(file, index);
      },
      handleSlotDisconnectImage: (index: number): Promise<void> => {
        return setSlotValue(index, '');
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
        const nextValues = swapDrawingImageSlotValues(slotValuesRef.current, fromIndex, toIndex);
        void setSlotValues(nextValues);
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
    [
      setSlotValue,
      setSlotValues,
      slotImageLinks,
      slotValues,
      toast,
      uploadMutation.isPending,
      uploadSlotFile,
    ]
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
            fillSlotsWithFilepaths(filepaths, activeSlotIndex)
              .then(() => {
                toast('Drawing images assigned locally. Save CMS to publish them to FastComet.', { variant: 'success' });
              })
              .catch((error: unknown) => {
                toast(`Drawing image assignment failed: ${toErrorMessage(error)}`, { variant: 'error' });
              });
            setMediaOpen(false);
          }}
        />
      </div>
    </FormField>
  );
}

// ─── Drawing Project Slots Field ─────────────────────────────────────────────

const hasProjectModelSource = (project: MilkbarProjectCmsRecord): boolean =>
  (typeof project.modelAssetId === 'string' && project.modelAssetId.trim().length > 0) ||
  (typeof project.modelUrl === 'string' && project.modelUrl.trim().length > 0);

function DrawingProjectSlotsField({
  projects,
  value,
  onChange,
}: {
  projects: MilkbarProjectCmsRecord[];
  value: string[];
  onChange: (codes: string[]) => void;
}): React.JSX.Element {
  const selectedCodes = Array.isArray(value) ? value : [];
  const projectItems = Array.isArray(projects) ? projects : [];

  const toggle = useCallback(
    (code: string) => {
      onChange(
        selectedCodes.includes(code)
          ? selectedCodes.filter((c) => c !== code)
          : [...selectedCodes, code]
      );
    },
    [selectedCodes, onChange]
  );

  const projectsWithModel = projectItems.filter(hasProjectModelSource);
  const projectsWithoutModel = projectItems.filter((project) => !hasProjectModelSource(project));

  if (projectItems.length === 0) {
    return (
      <p className='text-xs text-muted-foreground'>
        No projects found. Add projects in the Projects tab first.
      </p>
    );
  }

  return (
    <div className='space-y-1.5'>
      <p className='text-xs text-muted-foreground'>
        Select which project models appear in the Drawing section viewer. Only projects with an uploaded 3D model are selectable.
      </p>
      {projectsWithModel.map((project) => {
        const checked = selectedCodes.includes(project.code);
        return (
          <label
            key={project.code}
            className='flex cursor-pointer items-center gap-3 rounded-md border border-white/10 px-3 py-2 hover:bg-white/5'
          >
            <input
              type='checkbox'
              className='size-4 accent-amber-400'
              checked={checked}
              aria-label={`Show ${project.name} in the Drawing section`}
              onChange={() => { toggle(project.code); }}
            />
            <span className='flex-1 min-w-0'>
              <span className='block text-sm font-medium text-white'>{project.name}</span>
              <span className='block text-xs text-muted-foreground'>{project.code} · {project.projectType} · {project.city}</span>
            </span>
            {checked && (
              <span className='shrink-0 rounded bg-amber-400/20 px-1.5 py-0.5 text-xs font-medium text-amber-300'>active</span>
            )}
          </label>
        );
      })}
      {projectsWithoutModel.map((project) => (
        <div
          key={project.code}
          className='flex items-center gap-3 rounded-md border border-white/5 px-3 py-2 opacity-40'
        >
          <input
            type='checkbox'
            className='size-4'
            disabled
            checked={false}
            readOnly
            aria-label={`${project.name} has no model uploaded`}
          />
          <span className='flex-1 min-w-0'>
            <span className='block text-sm text-white/60'>{project.name}</span>
            <span className='block text-xs text-muted-foreground'>{project.code} · {project.projectType} · {project.city}</span>
          </span>
          <span className='shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-xs text-white/40'>no model</span>
        </div>
      ))}
    </div>
  );
}

// ─── Content Folder Tree ─────────────────────────────────────────────────────

function ContentFolderTree({
  pageContent,
  projects,
  updateNav,
  updateNavLink,
  addNavLink,
  removeNavLink,
  moveNavLink,
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
  moveCaseStudyStat,
  updateQuote,
  updateCta,
  updateFooter,
  updateFooterColumnTitle,
  addFooterColumn,
  removeFooterColumn,
  moveFooterColumn,
  updateFooterLink,
  addFooterLink,
  removeFooterLink,
  moveFooterLink,
  updatePrinciple,
  addPrinciple,
  removePrinciple,
  movePrinciple,
  updateProcessStep,
  addProcessStep,
  removeProcessStep,
  moveProcessStep,
  updateMetric,
  addMetric,
  removeMetric,
  moveMetric,
  sectionVisibility,
  onUpdateVisibility,
}: {
  pageContent: MilkbarPageContent;
  projects: MilkbarProjectCmsRecord[];
  updateNav: (patch: Partial<MilkbarPageContent['nav']>) => void;
  updateNavLink: (index: number, patch: Partial<MilkbarLinkItem>) => void;
  addNavLink: () => void;
  removeNavLink: (index: number) => void;
  moveNavLink: (from: number, to: number) => void;
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
  moveCaseStudyStat: (from: number, to: number) => void;
  updateQuote: (patch: Partial<MilkbarPageContent['quote']>) => void;
  updateCta: (patch: Partial<MilkbarPageContent['cta']>) => void;
  updateFooter: (patch: Partial<MilkbarPageContent['footer']>) => void;
  updateFooterColumnTitle: (colIndex: number, title: string) => void;
  addFooterColumn: () => void;
  removeFooterColumn: (colIndex: number) => void;
  moveFooterColumn: (from: number, to: number) => void;
  updateFooterLink: (colIndex: number, linkIndex: number, patch: Partial<MilkbarLinkItem>) => void;
  addFooterLink: (colIndex: number) => void;
  removeFooterLink: (colIndex: number, linkIndex: number) => void;
  moveFooterLink: (colIndex: number, from: number, to: number) => void;
  updatePrinciple: (index: number, patch: Partial<MilkbarPrinciple>) => void;
  addPrinciple: () => void;
  removePrinciple: (index: number) => void;
  movePrinciple: (from: number, to: number) => void;
  updateProcessStep: (index: number, patch: Partial<MilkbarProcessStep>) => void;
  addProcessStep: () => void;
  removeProcessStep: (index: number) => void;
  moveProcessStep: (from: number, to: number) => void;
  updateMetric: (index: number, patch: Partial<MilkbarMetric>) => void;
  addMetric: () => void;
  removeMetric: (index: number) => void;
  moveMetric: (from: number, to: number) => void;
  sectionVisibility: MilkbarSectionVisibility;
  onUpdateVisibility: (patch: Partial<MilkbarSectionVisibility>) => void;
}): React.JSX.Element {
  const ALL_SECTIONS = CONTENT_FOLDER_ALL_SECTIONS;
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [openSubFolders, setOpenSubFolders] = useState<Set<string>>(new Set());

  const toggleSection = useCallback((id: string): void => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }, []);

  const toggleSubFolder = useCallback((id: string): void => {
    setOpenSubFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }, []);

  const allOpen = openSections.size === ALL_SECTIONS.length;

  const sectionDragArmedRef = useRef<string | null>(null);

  const [sectionOrder, setSectionOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('milkbar-section-order');
      if (saved !== null && saved.trim().length > 0) {
        const parsed = JSON.parse(saved) as unknown;
        if (Array.isArray(parsed) && parsed.every((x): x is string => typeof x === 'string') && parsed.length === CONTENT_FOLDER_DEFAULT_ORDER.length) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return [...CONTENT_FOLDER_DEFAULT_ORDER];
  });
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  useEffect(() => {
    try { localStorage.setItem('milkbar-section-order', JSON.stringify(sectionOrder)); } catch { /* ignore */ }
  }, [sectionOrder]);

  useEffect(() => {
    const clearArmed = (): void => { sectionDragArmedRef.current = null; };
    window.addEventListener('mouseup', clearArmed);
    return () => window.removeEventListener('mouseup', clearArmed);
  }, []);

  const drawingThumbImages = Array.isArray(pageContent.drawing.thumbImages)
    ? pageContent.drawing.thumbImages
    : [];
  const drawingAsset3dProjectCodes = Array.isArray(pageContent.drawing.asset3dProjectCodes)
    ? pageContent.drawing.asset3dProjectCodes
    : [];
  const drawingThumbCount = drawingThumbImages.filter(Boolean).length;
  const drawingAsset3dProjectCount = drawingAsset3dProjectCodes.length;

  return (
    <div className='space-y-1.5'>
      <div className='flex items-center justify-between pb-1'>
        <span className='text-xs text-muted-foreground'>
          {openSections.size} of {ALL_SECTIONS.length} sections open
        </span>
        <div className='flex items-center gap-3'>
          {sectionOrder.join(',') !== CONTENT_FOLDER_DEFAULT_ORDER.join(',') && (
            <button
              type='button'
              onClick={() => setSectionOrder([...CONTENT_FOLDER_DEFAULT_ORDER])}
              className='text-xs text-muted-foreground/60 transition-colors hover:text-muted-foreground'
            >
              Reset order
            </button>
          )}
          <button
            type='button'
            onClick={() => setOpenSections(allOpen ? new Set() : new Set(ALL_SECTIONS))}
            className='text-xs text-muted-foreground transition-colors hover:text-white'
          >
            {allOpen ? 'Collapse all' : 'Expand all'}
          </button>
        </div>
      </div>
      {/* Navigation — always first, not draggable */}
      <SectionFolderRow
        id='nav'
        title='Navigation'
        subtitle={`${pageContent.nav.links.length} links`}
        open={openSections.has('nav')}
        onToggle={toggleSection}
      >
        <div className='grid gap-3 md:grid-cols-2'>
          <FieldInput label='Brand subtitle' value={pageContent.nav.brandSub} onChange={(brandSub) => updateNav({ brandSub })} description='Text after the brand name in the nav.' />
          <FieldInput label='CTA label' value={pageContent.nav.ctaLabel} onChange={(ctaLabel) => updateNav({ ctaLabel })} description='Enquiry CTA button text.' />
        </div>
        <SubFolderRow
          title='Nav Links'
          count={pageContent.nav.links.length}
          open={openSubFolders.has('nav-links')}
          onToggle={() => toggleSubFolder('nav-links')}
          actions={
            <Button type='button' size='sm' variant='secondary' icon={<Plus className='size-3.5' />} onClick={addNavLink}>
              Add
            </Button>
          }
        >
          {pageContent.nav.links.map((link, index) => (
            <div key={`nav-link-${index}`} className='flex items-start gap-2'>
              <SubItemMoveButtons
                index={index}
                total={pageContent.nav.links.length}
                onMoveUp={() => moveNavLink(index, index - 1)}
                onMoveDown={() => moveNavLink(index, index + 1)}
              />
              <div className='flex-1 grid gap-1.5 rounded border border-white/5 bg-white/3 p-2 md:grid-cols-2'>
                <FieldInput label='Label' value={link.label} onChange={(label) => updateNavLink(index, { label })} />
                <FieldInput label='Href' value={link.href} onChange={(href) => updateNavLink(index, { href })} />
              </div>
              <button
                type='button'
                onClick={() => removeNavLink(index)}
                className='mt-5 flex size-6 shrink-0 items-center justify-center rounded border border-white/10 text-muted-foreground transition-colors hover:border-red-500/40 hover:text-red-400'
                aria-label='Remove nav link'
              >
                <Trash2 className='size-3' />
              </button>
            </div>
          ))}
        </SubFolderRow>
      </SectionFolderRow>

      {/* Draggable sections — rendered in sectionOrder */}
      {sectionOrder.map((sectionId, i) => {
        const isDragging = draggedSectionId === sectionId;
        return (
          <Fragment key={sectionId}>
            {dropIndex === i && draggedSectionId !== null && (
              <div className='mx-1 h-0.5 rounded-full bg-blue-500/70' />
            )}
            <div
              draggable
              onDragStart={(e) => {
                if (sectionDragArmedRef.current !== sectionId) { e.preventDefault(); return; }
                const { dataTransfer } = e;
                dataTransfer.effectAllowed = 'move';
                setDraggedSectionId(sectionId);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                const { dataTransfer } = e;
                dataTransfer.dropEffect = 'move';
                const rect = e.currentTarget.getBoundingClientRect();
                setDropIndex(e.clientY < rect.top + rect.height / 2 ? i : i + 1);
              }}
              onDrop={() => {
                if (draggedSectionId === null || dropIndex === null) return;
                setSectionOrder((prev) => {
                  const fromIdx = prev.indexOf(draggedSectionId);
                  if (fromIdx === -1) return prev;
                  const adjusted = dropIndex > fromIdx ? dropIndex - 1 : dropIndex;
                  if (fromIdx === adjusted) return prev;
                  const next = [...prev];
                  next.splice(fromIdx, 1);
                  next.splice(adjusted, 0, draggedSectionId);
                  return next;
                });
                setDraggedSectionId(null);
                setDropIndex(null);
              }}
              onDragEnd={() => {
                setDraggedSectionId(null);
                setDropIndex(null);
                sectionDragArmedRef.current = null;
              }}
            >
              {sectionId === 'hero' && (
                <SectionFolderRow
                  id='hero'
                  title='Hero'
                  open={openSections.has('hero')}
                  onToggle={toggleSection}
                  isDraggable
                  isDragging={isDragging}
                  onDragHandleMouseDown={() => { sectionDragArmedRef.current = 'hero'; }}
                >
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
                    modelUrl={pageContent.hero.modelUrl}
                    uploadName='Milkbar hero background model'
                    tags={['hero']}
                    onChange={(modelAssetId) => updateHero({ modelAssetId, modelUrl: undefined })}
                    onClearLink={() => updateHero({ modelUrl: undefined })}
                    onClearUpload={() => updateHero({ modelAssetId: undefined })}
                  />
                </SectionFolderRow>
              )}
              {sectionId === 'drawing' && (
                <SectionFolderRow
                  id='drawing'
                  title='Drawing Section'
                  subtitle={`${drawingThumbCount} thumbnails · ${drawingAsset3dProjectCount} 3D`}
                  open={openSections.has('drawing')}
                  onToggle={toggleSection}
                  isDraggable
                  isDragging={isDragging}
                  onDragHandleMouseDown={() => { sectionDragArmedRef.current = 'drawing'; }}
                  visibilityOn={sectionVisibility.drawing}
                  onToggleVisibility={() => onUpdateVisibility({ drawing: !sectionVisibility.drawing })}
                >
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
                    modelUrl={pageContent.drawing.interiorModelUrl}
                    uploadName='Milkbar Every line carries intent interior model'
                    tags={['interior', 'drawing']}
                    onChange={(interiorModelAssetId) => updateDrawing({ interiorModelAssetId, interiorModelUrl: undefined })}
                    onClearLink={() => updateDrawing({ interiorModelUrl: undefined })}
                    onClearUpload={() => updateDrawing({ interiorModelAssetId: undefined })}
                  />
                  <SubFolderRow
                    title='Drawing Thumbnails'
                    count={drawingThumbCount}
                    open={openSubFolders.has('drawing-thumbs')}
                    onToggle={() => toggleSubFolder('drawing-thumbs')}
                  >
                    <DrawingImageSlotsField
                      value={drawingThumbImages}
                      onChange={(thumbImages) => {
                        updateDrawing({ thumbImages });
                        return undefined;
                      }}
                    />
                  </SubFolderRow>
                  <SubFolderRow
                    title='Drawing 3D — Project Models'
                    count={drawingAsset3dProjectCount}
                    open={openSubFolders.has('drawing-3d')}
                    onToggle={() => toggleSubFolder('drawing-3d')}
                  >
                    <DrawingProjectSlotsField
                      projects={projects}
                      value={drawingAsset3dProjectCodes}
                      onChange={(asset3dProjectCodes) => updateDrawing({ asset3dProjectCodes })}
                    />
                  </SubFolderRow>
                </SectionFolderRow>
              )}
              {sectionId === 'philosophy' && (
                <SectionFolderRow
                  id='philosophy'
                  title='Philosophy'
                  subtitle={`${pageContent.philosophy.principles.length} principles`}
                  open={openSections.has('philosophy')}
                  onToggle={toggleSection}
                  isDraggable
                  isDragging={isDragging}
                  onDragHandleMouseDown={() => { sectionDragArmedRef.current = 'philosophy'; }}
                  visibilityOn={sectionVisibility.philosophy}
                  onToggleVisibility={() => onUpdateVisibility({ philosophy: !sectionVisibility.philosophy })}
                >
                  <div className='grid gap-3 md:grid-cols-2'>
                    <FieldInput label='Eyebrow' value={pageContent.philosophy.eyebrow} onChange={(eyebrow) => updatePhilosophy({ eyebrow })} />
                    <FieldInput label='Title' value={pageContent.philosophy.title} onChange={(title) => updatePhilosophy({ title })} />
                    <FieldInput label='Emphasis' value={pageContent.philosophy.emphasis} onChange={(emphasis) => updatePhilosophy({ emphasis })} />
                    <FieldInput label='Figure caption' value={pageContent.philosophy.caption} onChange={(caption) => updatePhilosophy({ caption })} />
                    <FieldTextarea label='Body' value={pageContent.philosophy.body} onChange={(body) => updatePhilosophy({ body })} rows={3} />
                    <FieldTextarea label='Closing line' value={pageContent.philosophy.closing} onChange={(closing) => updatePhilosophy({ closing })} rows={2} />
                  </div>
                  <SubFolderRow
                    title='Principles'
                    count={pageContent.philosophy.principles.length}
                    open={openSubFolders.has('principles')}
                    onToggle={() => toggleSubFolder('principles')}
                    actions={
                      <Button type='button' size='sm' variant='secondary' icon={<Plus className='size-3.5' />} onClick={addPrinciple}>
                        Add
                      </Button>
                    }
                  >
                    {pageContent.philosophy.principles.map((principle, index) => (
                      <div key={`${principle.number}-${index}`} className='flex items-start gap-2'>
                        <SubItemMoveButtons
                          index={index}
                          total={pageContent.philosophy.principles.length}
                          onMoveUp={() => movePrinciple(index, index - 1)}
                          onMoveDown={() => movePrinciple(index, index + 1)}
                        />
                        <div className='flex-1 space-y-2 rounded-md border border-white/10 p-3'>
                          <div className='flex items-center justify-between gap-2'>
                            <span className='text-xs font-medium text-muted-foreground'>{principle.number} Principle {index + 1}</span>
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
                      </div>
                    ))}
                  </SubFolderRow>
                </SectionFolderRow>
              )}
              {sectionId === 'services' && (
                <SectionFolderRow
                  id='services'
                  title='Services &amp; Projects'
                  open={openSections.has('services')}
                  onToggle={toggleSection}
                  isDraggable
                  isDragging={isDragging}
                  onDragHandleMouseDown={() => { sectionDragArmedRef.current = 'services'; }}
                  visibilityOn={sectionVisibility.services || sectionVisibility.projects}
                  onToggleVisibility={() => {
                    const next = !(sectionVisibility.services || sectionVisibility.projects);
                    onUpdateVisibility({ services: next, projects: next });
                  }}
                >
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
                      <div className='col-span-full'>
                        <p className='text-xs font-medium text-neutral-400 mb-2'>Card View Mode</p>
                        <div className='flex gap-4'>
                          {(['edges', 'wireframe', 'solid'] as const).map((mode) => (
                            <label key={mode} className='flex items-center gap-2 cursor-pointer'>
                              <input
                                type='radio'
                                name='projectsViewMode'
                                value={mode}
                                checked={pageContent.projects.projectsViewMode === mode}
                                onChange={() => updateProjectsHeader({ projectsViewMode: mode })}
                                className='accent-white'
                                aria-label={`${mode} mode`}
                              />
                              <span className='text-sm capitalize'>{mode}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </FormSection>
                  </div>
                </SectionFolderRow>
              )}
              {sectionId === 'process' && (
                <SectionFolderRow
                  id='process'
                  title='Process'
                  subtitle={`${pageContent.process.steps.length} steps`}
                  open={openSections.has('process')}
                  onToggle={toggleSection}
                  isDraggable
                  isDragging={isDragging}
                  onDragHandleMouseDown={() => { sectionDragArmedRef.current = 'process'; }}
                  visibilityOn={sectionVisibility.process}
                  onToggleVisibility={() => onUpdateVisibility({ process: !sectionVisibility.process })}
                >
                  <div className='grid gap-3 md:grid-cols-2'>
                    <FieldInput label='Eyebrow' value={pageContent.process.eyebrow} onChange={(eyebrow) => updateProcess({ eyebrow })} />
                    <FieldInput label='Label' value={pageContent.process.label} onChange={(label) => updateProcess({ label })} />
                    <FieldInput label='Title' value={pageContent.process.title} onChange={(title) => updateProcess({ title })} />
                    <FieldInput label='Emphasis' value={pageContent.process.emphasis} onChange={(emphasis) => updateProcess({ emphasis })} />
                  </div>
                  <SubFolderRow
                    title='Process Steps'
                    count={pageContent.process.steps.length}
                    open={openSubFolders.has('steps')}
                    onToggle={() => toggleSubFolder('steps')}
                    actions={
                      <Button type='button' size='sm' variant='secondary' icon={<Plus className='size-3.5' />} onClick={addProcessStep}>
                        Add
                      </Button>
                    }
                  >
                    {pageContent.process.steps.map((step, index) => (
                      <div key={`${step.number}-${index}`} className='flex items-start gap-2'>
                        <SubItemMoveButtons
                          index={index}
                          total={pageContent.process.steps.length}
                          onMoveUp={() => moveProcessStep(index, index - 1)}
                          onMoveDown={() => moveProcessStep(index, index + 1)}
                        />
                        <div className='flex-1 space-y-2 rounded-md border border-white/10 p-3'>
                          <div className='flex items-center justify-between gap-2'>
                            <span className='text-xs font-medium text-muted-foreground'>{step.number} Step {index + 1}</span>
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
                      </div>
                    ))}
                  </SubFolderRow>
                </SectionFolderRow>
              )}
              {sectionId === 'metrics' && (
                <SectionFolderRow
                  id='metrics'
                  title='Metrics'
                  subtitle={`${pageContent.metrics.length} headline figures`}
                  open={openSections.has('metrics')}
                  onToggle={toggleSection}
                  isDraggable
                  isDragging={isDragging}
                  onDragHandleMouseDown={() => { sectionDragArmedRef.current = 'metrics'; }}
                  visibilityOn={sectionVisibility.metrics}
                  onToggleVisibility={() => onUpdateVisibility({ metrics: !sectionVisibility.metrics })}
                >
                  <SubFolderRow
                    title='Metric Items'
                    count={pageContent.metrics.length}
                    open={openSubFolders.has('metrics')}
                    onToggle={() => toggleSubFolder('metrics')}
                    actions={
                      <Button type='button' size='sm' variant='secondary' icon={<Plus className='size-3.5' />} onClick={addMetric}>
                        Add
                      </Button>
                    }
                  >
                    {pageContent.metrics.map((metric, index) => (
                      <div key={`${metric.label}-${index}`} className='flex items-start gap-2'>
                        <SubItemMoveButtons
                          index={index}
                          total={pageContent.metrics.length}
                          onMoveUp={() => moveMetric(index, index - 1)}
                          onMoveDown={() => moveMetric(index, index + 1)}
                        />
                        <div className='flex-1 rounded-md border border-white/10 p-3'>
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
                      </div>
                    ))}
                  </SubFolderRow>
                </SectionFolderRow>
              )}
              {sectionId === 'caseStudy' && (
                <SectionFolderRow
                  id='caseStudy'
                  title='Case Study'
                  subtitle={`${pageContent.caseStudy.stats.length} stats`}
                  open={openSections.has('caseStudy')}
                  onToggle={toggleSection}
                  isDraggable
                  isDragging={isDragging}
                  onDragHandleMouseDown={() => { sectionDragArmedRef.current = 'caseStudy'; }}
                  visibilityOn={sectionVisibility.caseStudy}
                  onToggleVisibility={() => onUpdateVisibility({ caseStudy: !sectionVisibility.caseStudy })}
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
                  <FormField label='2D View — Source Project' description='The 2D view in this case study comes directly from the uploaded model of the selected project.'>
                    <select
                      className='w-full rounded-md border border-white/20 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-400'
                      value={pageContent.caseStudy.projectCode ?? ''}
                      onChange={(e) => updateCaseStudy({ projectCode: e.target.value.length > 0 ? e.target.value : undefined })}
                    >
                      <option value=''>— none —</option>
                      {projects.filter(hasProjectModelSource).map((p) => (
                        <option key={p.code} value={p.code}>{p.name} ({p.code})</option>
                      ))}
                      {projects.filter((p) => !hasProjectModelSource(p)).length > 0 && (
                        <optgroup label='No model uploaded'>
                          {projects.filter((p) => !hasProjectModelSource(p)).map((p) => (
                            <option key={p.code} value={p.code} disabled>{p.name} ({p.code})</option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                    {typeof pageContent.caseStudy.projectCode === 'string' && pageContent.caseStudy.projectCode.length > 0 && (
                      <p className='mt-1 text-xs text-amber-300/80'>
                        Using model from project: <span className='font-medium'>{pageContent.caseStudy.projectCode}</span>
                      </p>
                    )}
                  </FormField>
                  <SubFolderRow
                    title='Case Study Stats'
                    count={pageContent.caseStudy.stats.length}
                    open={openSubFolders.has('cs-stats')}
                    onToggle={() => toggleSubFolder('cs-stats')}
                    actions={
                      <Button type='button' size='sm' variant='secondary' icon={<Plus className='size-3.5' />} onClick={addCaseStudyStat}>
                        Add
                      </Button>
                    }
                  >
                    {pageContent.caseStudy.stats.map((stat, index) => (
                      <div key={`cs-stat-${index}`} className='flex items-start gap-2'>
                        <SubItemMoveButtons
                          index={index}
                          total={pageContent.caseStudy.stats.length}
                          onMoveUp={() => moveCaseStudyStat(index, index - 1)}
                          onMoveDown={() => moveCaseStudyStat(index, index + 1)}
                        />
                        <div className='flex-1 rounded-md border border-white/10 p-2'>
                          <div className='mb-1.5 flex items-center justify-between gap-2'>
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
                      </div>
                    ))}
                  </SubFolderRow>
                </SectionFolderRow>
              )}
              {sectionId === 'quote' && (
                <SectionFolderRow
                  id='quote'
                  title='Quote &amp; CTA'
                  open={openSections.has('quote')}
                  onToggle={toggleSection}
                  isDraggable
                  isDragging={isDragging}
                  onDragHandleMouseDown={() => { sectionDragArmedRef.current = 'quote'; }}
                  visibilityOn={sectionVisibility.quote || sectionVisibility.cta}
                  onToggleVisibility={() => {
                    const next = !(sectionVisibility.quote || sectionVisibility.cta);
                    onUpdateVisibility({ quote: next, cta: next });
                  }}
                >
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
                </SectionFolderRow>
              )}
              {sectionId === 'footer' && (
                <SectionFolderRow
                  id='footer'
                  title='Footer'
                  subtitle={`${pageContent.footer.columns.length} nav columns`}
                  open={openSections.has('footer')}
                  onToggle={toggleSection}
                  isDraggable
                  isDragging={isDragging}
                  onDragHandleMouseDown={() => { sectionDragArmedRef.current = 'footer'; }}
                >
                  <div className='grid gap-3 md:grid-cols-2'>
                    <FieldInput label='Brand name' value={pageContent.footer.brandName} onChange={(brandName) => updateFooter({ brandName })} />
                    <FieldInput label='Copyright' value={pageContent.footer.copyright} onChange={(copyright) => updateFooter({ copyright })} />
                    <FieldTextarea label='Address' value={pageContent.footer.address} onChange={(address) => updateFooter({ address })} rows={3} />
                    <FieldTextarea label='Tagline' value={pageContent.footer.tagline} onChange={(tagline) => updateFooter({ tagline })} rows={3} />
                  </div>
                  <SubFolderRow
                    title='Footer Columns'
                    count={pageContent.footer.columns.length}
                    open={openSubFolders.has('footer-cols')}
                    onToggle={() => toggleSubFolder('footer-cols')}
                    actions={
                      <Button type='button' size='sm' variant='secondary' icon={<Plus className='size-3.5' />} onClick={addFooterColumn}>
                        Add
                      </Button>
                    }
                  >
                    {pageContent.footer.columns.map((column, ci) => (
                      <div key={`col-${ci}`} className='flex items-start gap-2'>
                        <SubItemMoveButtons
                          index={ci}
                          total={pageContent.footer.columns.length}
                          onMoveUp={() => moveFooterColumn(ci, ci - 1)}
                          onMoveDown={() => moveFooterColumn(ci, ci + 1)}
                        />
                        <div className='flex-1 space-y-2 rounded-md border border-white/10 p-3'>
                          <div className='flex items-center gap-2'>
                            <div className='flex-1'>
                              <FieldInput
                                label={`Column ${ci + 1} heading`}
                                value={column.title}
                                onChange={(title) => updateFooterColumnTitle(ci, title)}
                              />
                            </div>
                            <button
                              type='button'
                              onClick={() => removeFooterColumn(ci)}
                              className='mt-5 flex size-7 shrink-0 items-center justify-center rounded border border-white/10 text-muted-foreground transition-colors hover:border-red-500/40 hover:text-red-400'
                              aria-label={`Remove column ${ci + 1}`}
                            >
                              <Trash2 className='size-3.5' />
                            </button>
                          </div>
                          <SubFolderRow
                            title='Links'
                            count={column.links.length}
                            open={openSubFolders.has(`footer-col-${ci}-links`)}
                            onToggle={() => toggleSubFolder(`footer-col-${ci}-links`)}
                            actions={
                              <Button type='button' size='sm' variant='secondary' icon={<Plus className='size-3.5' />} onClick={() => addFooterLink(ci)}>
                                Add
                              </Button>
                            }
                          >
                            {column.links.map((link, li) => (
                              <div key={`col-${ci}-link-${li}`} className='flex items-start gap-2'>
                                <SubItemMoveButtons
                                  index={li}
                                  total={column.links.length}
                                  onMoveUp={() => moveFooterLink(ci, li, li - 1)}
                                  onMoveDown={() => moveFooterLink(ci, li, li + 1)}
                                />
                                <div className='flex-1 grid gap-1.5 rounded border border-white/5 bg-white/3 p-2 md:grid-cols-2'>
                                  <FieldInput label='Label' value={link.label} onChange={(label) => updateFooterLink(ci, li, { label })} />
                                  <FieldInput label='Href' value={link.href} onChange={(href) => updateFooterLink(ci, li, { href })} />
                                </div>
                                <button
                                  type='button'
                                  onClick={() => removeFooterLink(ci, li)}
                                  className='mt-5 flex size-6 shrink-0 items-center justify-center rounded border border-white/10 text-muted-foreground transition-colors hover:border-red-500/40 hover:text-red-400'
                                  aria-label='Remove link'
                                >
                                  <Trash2 className='size-3' />
                                </button>
                              </div>
                            ))}
                          </SubFolderRow>
                        </div>
                      </div>
                    ))}
                  </SubFolderRow>
                </SectionFolderRow>
              )}
            </div>
          </Fragment>
        );
      })}
      {dropIndex === sectionOrder.length && draggedSectionId !== null && (
        <div className='mx-1 h-0.5 rounded-full bg-blue-500/70' />
      )}
    </div>
  );
}

function SettingsTab({
  pageSettings,
  onUpdateVisibility,
  onUpdateSeo,
  onUpdateDefaultLocale,
  onUpdateContactEmail,
  onTogglePublishedLocale,
}: {
  pageSettings: MilkbarPageSettings;
  onUpdateVisibility: (patch: Partial<MilkbarSectionVisibility>) => void;
  onUpdateSeo: (locale: MilkbarLocale, patch: Partial<MilkbarSeoMeta>) => void;
  onUpdateDefaultLocale: (locale: MilkbarLocale) => void;
  onUpdateContactEmail: (contactEmail: string) => void;
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

      <FormSection
        title='Contact Form Delivery'
        subtitle='Recipient stored in the Milkbar architecture database and used by the live contact form.'
      >
        <FieldInput
          label='Contact email'
          type='email'
          value={pageSettings.contactEmail}
          placeholder='hello@milkbar.studio'
          onChange={onUpdateContactEmail}
          description='Messages submitted through the public contact form are delivered to this address.'
        />
      </FormSection>

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

function ModelAssetLibraryPickerModal({
  title = 'Select 3D Asset from Library',
  confirmLabel = 'Assign Model',
  storageProfileFilter,
  onSelect,
  onClose,
}: {
  title?: string;
  confirmLabel?: string;
  storageProfileFilter?: FileStorageProfile;
  onSelect: (assetId: string) => void;
  onClose: () => void;
}): React.JSX.Element {
  const [search, setSearch] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<Asset3DRecord | null>(null);
  const [modelError, setModelError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const assetsQuery = useAssets3D({
    search: search.trim().length > 0 ? search.trim() : undefined,
    ...(storageProfileFilter !== undefined ? { storageProfile: storageProfileFilter } : {}),
  });
  const assets: Asset3DRecord[] = assetsQuery.data ?? [];
  const isLoading = assetsQuery.isPending;

  const handleAssetClick = useCallback((asset: Asset3DRecord): void => {
    setSelectedAsset(asset);
    setModelError(null);
    setShowSettings(false);
  }, []);

  const handleConfirm = useCallback((): void => {
    if (selectedAsset === null) return;
    onSelect(selectedAsset.id);
    onClose();
  }, [selectedAsset, onSelect, onClose]);

  const modelUrl = selectedAsset !== null ? `/api/assets3d/${selectedAsset.id}/file` : '';
  const assetListContent = (() => {
    if (isLoading) {
      return <p className='py-8 text-center text-xs text-muted-foreground'>Loading...</p>;
    }
    if (assets.length === 0) {
      return <p className='py-8 text-center text-xs text-muted-foreground'>No assets found.</p>;
    }
    return assets.map((asset) => {
      const displayName = asset.name !== '' ? asset.name : (asset.filename ?? asset.id);
      const isSelected = selectedAsset?.id === asset.id;
      const categoryId = asset.categoryId;
      const assetSize = asset.size ?? 0;
      const assetSizeLabel =
        assetSize < 1024 * 1024
          ? `${(assetSize / 1024).toFixed(1)} KB`
          : `${(assetSize / 1024 / 1024).toFixed(2)} MB`;

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
          {categoryId !== null && categoryId !== '' ? (
            <p className='mt-0.5 truncate text-[10px] text-blue-400/70'>{categoryId}</p>
          ) : null}
          {assetSize > 0 ? (
            <p className='mt-0.5 text-[10px] text-white/30'>{assetSizeLabel}</p>
          ) : null}
        </button>
      );
    });
  })();
  const previewContent = (() => {
    if (selectedAsset === null) {
      return (
        <div className='flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground'>
          <Box className='size-10 opacity-30' />
          <p className='text-sm'>Select an asset to preview</p>
        </div>
      );
    }
    if (modelError !== null) {
      return (
        <div className='flex flex-1 flex-col items-center justify-center gap-2 text-red-400'>
          <p className='text-sm'>Failed to load model</p>
          <p className='text-xs text-muted-foreground'>{modelError}</p>
        </div>
      );
    }
    return (
      <Viewer3DProvider key={selectedAsset.id} initialState={MILKBAR_MODEL_PREVIEW_INITIAL_VIEWER_STATE}>
        <div className='relative flex min-h-0 flex-1'>
          <div className={`bg-black/40 ${showSettings ? 'flex-1 lg:w-2/3' : 'w-full flex-1'}`}>
            <Viewer3D
              modelUrl={modelUrl}
              onError={(err) => setModelError(err.message)}
              className='h-full w-full'
              allowUserControls
            />
          </div>
          {showSettings ? (
            <div className='absolute bottom-0 right-0 top-0 z-10 w-full border-l border-border/60 bg-card/30 lg:static lg:w-1/3'>
              <Viewer3DSettingsPanel />
            </div>
          ) : null}
        </div>
        <Model3DPreviewFooter
          downloadName={selectedAsset.filename ?? (selectedAsset.name !== '' ? selectedAsset.name : 'asset')}
          resolvedModelUrl={modelUrl}
          showSettings={showSettings}
          onToggleSettings={() => setShowSettings((value) => !value)}
        />
        <Viewer3DStatusInfo />
      </Viewer3DProvider>
    );
  })();

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
            {assetListContent}
          </div>
          <div className='relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-white/10 bg-black/40'>
            {previewContent}
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

function Model3DPreviewFooter({
  downloadName,
  resolvedModelUrl,
  showSettings,
  onToggleSettings,
}: {
  downloadName: string;
  resolvedModelUrl: string;
  showSettings: boolean;
  onToggleSettings: () => void;
}): React.JSX.Element {
  const { resetSettings } = useViewer3DActions();

  return (
    <div className='flex items-center justify-between border-t border-border/60 bg-muted/10 p-2'>
      <div className='flex items-center gap-2'>
        <Button
          variant='ghost'
          size='sm'
          onClick={resetSettings}
          title='Reset settings'
          className='h-8 w-8 p-0'
          aria-label='Reset settings'
        >
          <RotateCcw className='h-4 w-4' />
        </Button>
        <Button
          variant={showSettings ? 'secondary' : 'ghost'}
          size='sm'
          onClick={onToggleSettings}
          className='h-8 text-xs'
        >
          <Settings2 className='mr-1.5 h-3.5 w-3.5' />
          Settings
          {showSettings ? (
            <ChevronUp className='ml-1.5 h-3.5 w-3.5' />
          ) : (
            <ChevronDown className='ml-1.5 h-3.5 w-3.5' />
          )}
        </Button>
      </div>
      {resolvedModelUrl.length > 0 ? (
        <a href={resolvedModelUrl} download={downloadName}>
          <Button variant='outline' size='sm' className='h-8 text-xs'>
            <Download className='mr-1.5 h-3.5 w-3.5' />
            Download
          </Button>
        </a>
      ) : (
        <Button variant='outline' size='sm' className='h-8 text-xs' disabled>
          <Download className='mr-1.5 h-3.5 w-3.5' />
          Download
        </Button>
      )}
    </div>
  );
}

function Model3DPreviewModal({
  modelId,
  modelUrl,
  title,
  onClose,
}: {
  modelId?: string;
  modelUrl?: string;
  title: string;
  onClose: () => void;
}): React.JSX.Element {
  const [showSettings, setShowSettings] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const assignedModelId = modelId?.trim() ?? '';
  const assignedModelUrl = modelUrl?.trim() ?? '';
  let resolvedModelUrl = '';
  if (assignedModelUrl.length > 0) {
    resolvedModelUrl = assignedModelUrl;
  } else if (assignedModelId.length > 0) {
    resolvedModelUrl = `/api/assets3d/${encodeURIComponent(assignedModelId)}/file`;
  }
  useEffect(() => {
    setModelError(null);
  }, [resolvedModelUrl]);
  const downloadName = getModelUrlDisplayName(resolvedModelUrl);
  let previewContent: React.JSX.Element;
  if (resolvedModelUrl.length === 0) {
    previewContent = (
      <div className='flex h-full items-center justify-center text-center text-muted-foreground'>
        <p>No 3D model selected</p>
      </div>
    );
  } else if (modelError !== null) {
    previewContent = (
      <div className='flex h-full items-center justify-center text-center text-red-400'>
        <div>
          <p>Failed to load 3D model</p>
          <p className='mt-2 text-sm text-gray-400'>{modelError}</p>
        </div>
      </div>
    );
  } else {
    previewContent = (
      <Viewer3D
        modelUrl={resolvedModelUrl}
        onLoad={() => {}}
        onError={(error) => setModelError(error.message)}
        className='h-full w-full'
      />
    );
  }

  return (
    <DetailModal isOpen title={`3D Preview — ${title}`} onClose={onClose} size='xl'>
      <Viewer3DProvider key={resolvedModelUrl} initialState={MILKBAR_MODEL_PREVIEW_INITIAL_VIEWER_STATE}>
        <div className='flex h-[600px] min-h-0 flex-col'>
          <div className='relative flex min-h-0 flex-1'>
            <div className={`bg-black/40 ${showSettings ? 'flex-1 lg:w-2/3' : 'w-full flex-1'}`}>
              {previewContent}
            </div>
            {showSettings ? (
              <div className='absolute bottom-0 right-0 top-0 z-10 w-full border-l border-border/60 bg-card/30 lg:static lg:w-1/3'>
                <Viewer3DSettingsPanel />
              </div>
            ) : null}
          </div>
          <Model3DPreviewFooter
            downloadName={downloadName}
            resolvedModelUrl={resolvedModelUrl}
            showSettings={showSettings}
            onToggleSettings={() => setShowSettings((value) => !value)}
          />
          <Viewer3DStatusInfo />
        </div>
      </Viewer3DProvider>
    </DetailModal>
  );
}

function CmsModel3DField({
  label,
  description,
  modelId,
  modelUrl,
  uploadName,
  tags,
  onChange,
  onClearLink,
  onClearUpload,
}: {
  label: string;
  description: string;
  modelId: string | undefined;
  modelUrl?: string | undefined;
  uploadName: string;
  tags: string[];
  onChange: (modelAssetId: string | undefined) => void | Promise<void>;
  onClearLink?: () => void | Promise<void>;
  onClearUpload?: () => void | Promise<void>;
}): React.JSX.Element {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [viewMode, setViewMode] = useState<Model3DSlotViewMode>('upload');
  const [slotAction, setSlotAction] = useState<'clear-upload' | 'convert-link' | 'fastcomet' | null>(null);
  const assignedModelId = modelId?.trim() ?? '';
  const assignedModelUrl = modelUrl?.trim() ?? '';
  const hasModelId = assignedModelId.length > 0;
  const hasModelUrl = assignedModelUrl.length > 0;
  const hasModel = hasModelId || hasModelUrl;

  const assetQuery = useAsset3DById(hasModelId ? assignedModelId : null);
  const asset = assetQuery.data;
  const isMissing = assetQuery.isError;
  const isResolving = hasModelId && asset === undefined && !isMissing;
  const modelSlotSources = resolveModel3DSlotSources({
    assetId: assignedModelId,
    asset,
    modelUrl: assignedModelUrl,
    isMissing,
  });
  const effectiveViewMode = resolveEffectiveModel3DSlotViewMode(viewMode, modelSlotSources);
  const activePreviewModelUrl = getModel3DSlotPreviewUrl(effectiveViewMode, modelSlotSources);
  const hasLocalModelSource = modelSlotSources.uploadUrl.length > 0;
  const hasLinkedModelSource = modelSlotSources.linkUrl.length > 0;
  const hasFastCometSource = modelSlotSources.fastCometUrl.length > 0;
  const isActionRunning = uploading || slotAction !== null;

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
            ...(hasModelId ? { replaceAssetId: assignedModelId } : {}),
          },
          (loaded, total) => {
            if (total !== undefined) {
              setUploadProgress(Math.round((loaded / total) * 100));
            }
          }
        );
        await onChange(record.id);
        toast(`3D model uploaded locally. Save CMS to publish it to FastComet: ${record.filename ?? file.name}`, { variant: 'success' });
      } catch (err) {
        toast(`3D model upload/save failed: ${toErrorMessage(err)}`, { variant: 'error' });
      } finally {
        setUploading(false);
        setUploadProgress(null);
        if (fileInputRef.current !== null) {
          fileInputRef.current.value = '';
        }
      }
    },
    [assignedModelId, hasModelId, onChange, tags, toast, uploadName]
  );

  const handleConvertLinkToFile = useCallback(async (): Promise<void> => {
    if (modelSlotSources.linkUrl.length === 0) return;
    setSlotAction('convert-link');
    try {
      const record = await convertMilkbarModelLinkToAsset3D({
        name: uploadName,
        tags: ['milkbardesigners', ...tags],
        url: modelSlotSources.linkUrl,
      });
      await onChange(record.id);
      setViewMode('upload');
      toast(`3D model downloaded locally. Save CMS to publish it to FastComet: ${record.filename ?? record.name}`, { variant: 'success' });
    } catch (error) {
      toast(`Link conversion failed: ${toErrorMessage(error)}`, { variant: 'error' });
    } finally {
      setSlotAction(null);
    }
  }, [modelSlotSources.linkUrl, onChange, tags, toast, uploadName]);

  const handleUploadToFastComet = useCallback(async (): Promise<void> => {
    if (!hasModelId || hasFastCometSource) return;
    setSlotAction('fastcomet');
    try {
      const record = await uploadMilkbarAsset3DToFastComet(assignedModelId);
      await assetQuery.refetch();
      await onChange(assignedModelId);
      setViewMode('fastcomet');
      toast(`3D model uploaded to FastComet. Save CMS to publish the updated reference: ${record.filename ?? record.name}`, { variant: 'success' });
    } catch (error) {
      toast(`FastComet upload failed: ${toErrorMessage(error)}`, { variant: 'error' });
    } finally {
      setSlotAction(null);
    }
  }, [assetQuery, assignedModelId, hasFastCometSource, hasModelId, onChange, toast]);

  const handleClearLink = useCallback(async (): Promise<void> => {
    try {
      await onClearLink?.();
      setViewMode(hasLocalModelSource ? 'upload' : 'link');
      toast('3D model link cleared locally. Save CMS to publish the change.', { variant: 'success' });
    } catch (error) {
      toast(`Clear link failed: ${toErrorMessage(error)}`, { variant: 'error' });
    }
  }, [hasLocalModelSource, onClearLink, toast]);

  const handleClearUpload = useCallback(async (): Promise<void> => {
    if (!hasModelId) return;
    const confirmed = typeof window === 'undefined'
      ? true
      : window.confirm('Delete this uploaded 3D model from the local folder and FastComet server when present? This cannot be undone.');
    if (!confirmed) return;
    setSlotAction('clear-upload');
    try {
      if (!isMissing) {
        await deleteAsset3DById(assignedModelId);
      }
      if (onClearUpload !== undefined) {
        await onClearUpload();
      } else {
        await onChange(undefined);
      }
      setViewMode(hasModelUrl ? 'link' : 'upload');
      toast('3D model upload deleted from local storage and FastComet when present. Save CMS to publish the change.', { variant: 'success' });
    } catch (error) {
      toast(`Delete upload failed: ${toErrorMessage(error)}`, { variant: 'error' });
    } finally {
      setSlotAction(null);
    }
  }, [assignedModelId, hasModelId, hasModelUrl, isMissing, onChange, onClearUpload, toast]);

  const assetName = asset !== undefined && asset.name.trim().length > 0
    ? asset.name
    : (asset?.filename ?? null);
  let modelDisplayName = getModelUrlDisplayName(assignedModelUrl);
  if (hasModelId) {
    modelDisplayName = assetName ?? assignedModelId;
  }
  if (isMissing) {
    modelDisplayName = 'Missing 3D asset';
  }
  const modelViewTrigger = uploading
    ? getModelUploadButtonLabel(uploading, uploadProgress, hasModel)
    : `View: ${resolveModel3DSlotViewModeLabel(effectiveViewMode)}`;

  const thumbnailContent = hasModel ? (
    <div className='flex h-full w-full flex-col items-center justify-center gap-1 px-1'>
      <Box className={`h-6 w-6 shrink-0 ${hasModelId ? 'text-blue-400/60' : 'text-emerald-400/60'}`} />
      <span className='line-clamp-2 w-full text-center text-[9px] leading-tight text-white/40'>
        {modelDisplayName}
      </span>
    </div>
  ) : (
    <button
      type='button'
      aria-label={`Upload ${label}`}
      className='flex h-full w-full flex-col items-center justify-center gap-1 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
      disabled={isActionRunning}
      onClick={() => fileInputRef.current?.click()}
    >
      <Box className='h-6 w-6 text-gray-500' />
      <span className='text-[10px] text-gray-500'>Upload</span>
    </button>
  );

  return (
    <>
      <FormField label={label} description={description}>
        {/* Image-slot-style top bar: view pill + ⋮ menu */}
        <div className='flex w-full items-center justify-center gap-1'>
          <ActionMenu
            variant='outline'
            size='sm'
            triggerClassName='h-6 px-2 text-[10px]'
            trigger={modelViewTrigger}
            ariaLabel='Select model source view'
            className='min-w-[140px]'
          >
            {model3DSlotViewModeOptions.map((mode) => (
              <DropdownMenuItem
                key={mode}
                disabled={isActionRunning || isModel3DSlotViewModeDisabled(mode, modelSlotSources)}
                onClick={() => setViewMode(mode)}
              >
                {model3DSlotViewModeLabels[mode]}
              </DropdownMenuItem>
            ))}
          </ActionMenu>
          <ActionMenu
            variant='ghost'
            size='icon'
            triggerClassName='h-6 w-6'
            trigger={<MoreVertical className='h-3.5 w-3.5' />}
            ariaLabel='Model slot actions'
            className='min-w-[160px]'
          >
            <DropdownMenuItem disabled={isActionRunning} onClick={() => fileInputRef.current?.click()}>
              Upload Model
            </DropdownMenuItem>
            <DropdownMenuItem disabled={isActionRunning} onClick={() => setPickerOpen(true)}>
              Choose from Library
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!hasLinkedModelSource || isActionRunning}
              onClick={() => {
                handleConvertLinkToFile().catch(() => undefined);
              }}
            >
              {slotAction === 'convert-link' ? 'Converting link...' : 'Convert link to File'}
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!hasModelId || !hasLocalModelSource || hasFastCometSource || isActionRunning}
              onClick={() => {
                handleUploadToFastComet().catch(() => undefined);
              }}
            >
              {slotAction === 'fastcomet' ? 'Uploading to FastComet...' : 'Upload to FastComet'}
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!hasModelUrl || isActionRunning}
              onClick={() => {
                handleClearLink().catch(() => undefined);
              }}
            >
              Clear link
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!hasModelId || isActionRunning}
              onClick={() => {
                handleClearUpload().catch(() => undefined);
              }}
            >
              {slotAction === 'clear-upload' ? 'Clearing upload...' : 'Clear upload'}
            </DropdownMenuItem>
          </ActionMenu>
        </div>

        {/* Centred thumbnail */}
        <div className='mt-1 flex w-full items-center justify-center'>
          <div className='relative h-24 w-24 overflow-hidden rounded-md border-2 border bg-gray-800'>
            {thumbnailContent}
            {hasModelId ? (
              <Button
                type='button'
                variant='destructive'
                size='icon'
                className='absolute right-0 top-0 z-10 h-6 w-6 rounded-full'
                aria-label={`Delete uploaded 3D model from ${label}`}
                title='Delete uploaded model from local storage and FastComet'
                disabled={isActionRunning}
                onClick={(event) => {
                  event.stopPropagation();
                  handleClearUpload().catch(() => undefined);
                }}
              >
                <XIcon className='h-4 w-4' />
              </Button>
            ) : null}
            <div className='absolute bottom-0 left-0 flex items-center overflow-hidden rounded-tr-md bg-gray-900/80 text-[10px] text-gray-400'>
              {hasModel ? (
                <Button
                  variant='ghost'
                  size='xs'
                  onClick={() => setPreviewOpen(true)}
                  className='h-5 w-6 rounded-none p-0 text-gray-300 hover:bg-white/10 hover:text-white'
                  disabled={activePreviewModelUrl.length === 0 || isActionRunning}
                  aria-label={`Open 3D preview for ${label}`}
                  title='Open 3D preview (modal)'
                >
                  <Eye className='size-3' />
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        <div className='mt-1'>
          <Model3DSlotSourceBadges
            hasAssetId={hasLocalModelSource}
            hasModelUrl={hasLinkedModelSource}
            isFastComet={hasFastCometSource}
            isUploading={uploading}
            isMissing={isMissing && !hasLocalModelSource}
            isResolving={isResolving && !hasLocalModelSource}
          />
        </div>

        <input
          ref={fileInputRef}
          type='file'
          accept='.glb,.gltf'
          aria-label={`${label} model file`}
          className='hidden'
          onChange={(event) => {
            void handleFileChange(event);
          }}
        />
      </FormField>
      {previewOpen && activePreviewModelUrl.length > 0 ? (
        <Model3DPreviewModal
          modelUrl={activePreviewModelUrl}
          title={label}
          onClose={() => setPreviewOpen(false)}
        />
      ) : null}
      {pickerOpen ? (
        <ModelAssetLibraryPickerModal
          title={`Select ${label}`}
          confirmLabel='Assign Model'
          storageProfileFilter='milkbarCms'
          onSelect={(assetId) => {
            void Promise.resolve(onChange(assetId))
              .then(() => {
                toast('3D model assigned locally. Save CMS to publish it to FastComet.', { variant: 'success' });
              })
              .catch((error: unknown) => {
                toast(`3D model assignment failed: ${toErrorMessage(error)}`, { variant: 'error' });
              });
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      ) : null}
    </>
  );
}

function ProjectModel3DField({
  project,
  projectIndex,
  onUpdate,
}: {
  project: MilkbarProjectCmsRecord;
  projectIndex: number;
  onUpdate: (
    index: number,
    patch: Partial<MilkbarProjectCmsRecord>
  ) => void;
}): React.JSX.Element {
  const projectCode = project.code.trim();
  const projectName = project.name.trim();
  const modelLabel = projectName.length > 0 ? `${projectName} 3D model` : 'Project 3D model';
  const uploadName = projectName.length > 0
    ? `${projectCode.length > 0 ? `${projectCode} - ` : ''}${projectName}`
    : `Milkbar project ${projectIndex + 1} model`;
  const tags = projectCode.length > 0 ? ['project', projectCode] : ['project'];

  return (
    <CmsModel3DField
      label={modelLabel}
      description='Project model upload uses the same 3D asset slot component as the Page Content tab.'
      modelId={project.modelAssetId}
      modelUrl={project.modelUrl}
      uploadName={uploadName}
      tags={tags}
      onChange={(modelAssetId) => onUpdate(projectIndex, { modelAssetId, modelUrl: undefined })}
      onClearLink={() => onUpdate(projectIndex, { modelUrl: undefined })}
      onClearUpload={() => onUpdate(projectIndex, { modelAssetId: undefined })}
    />
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
          <ProjectModel3DField
            project={project}
            projectIndex={index}
            onUpdate={onUpdate}
          />
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

  const handleToggle = async (email: string, current: 'pending' | 'contacted'): Promise<void> => {
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
              {filtered.map((inquiry) => {
                const status = inquiry.status === 'contacted' ? 'contacted' : 'pending';
                return (
                  <tr key={`${inquiry.email}-${inquiry.createdAt}`} className='border-t border-white/10'>
                    <td className='px-3 py-2 text-white'>{inquiry.email}</td>
                    <td className='px-3 py-2'>
                      <Badge variant={status === 'contacted' ? 'success' : 'default'}>
                        {status}
                      </Badge>
                    </td>
                    <td className='px-3 py-2 text-xs uppercase tracking-widest text-muted-foreground'>{inquiry.locale ?? '—'}</td>
                    <td className='px-3 py-2 text-muted-foreground'>{inquiry.source}</td>
                    <td className='px-3 py-2 text-muted-foreground'>{inquiry.createdAt ?? '-'}</td>
                    <td className='px-3 py-2'>
                      <button
                        type='button'
                        disabled={loadingEmail === inquiry.email}
                        onClick={() => { void handleToggle(inquiry.email, status); }}
                        className='rounded border border-white/10 px-2 py-1 text-xs text-muted-foreground transition-colors hover:border-white/30 hover:text-white disabled:opacity-40'
                      >
                        {getInquiryStatusActionLabel(loadingEmail === inquiry.email, status)}
                      </button>
                    </td>
                  </tr>
                );
              })}
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
  const [finalResult, setFinalResult] = useState<PushToCloudResultSummary | null>(null);
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
          toast(`Push failed: ${js.failedReason ?? 'Job failed in queue'}`, { variant: 'error' });
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
        toast(`Push failed: ${outcome.error ?? 'Unknown error'}`, { variant: 'error' });
        return;
      }
      if (outcome.mode === 'queue' && outcome.jobId !== null && outcome.jobId.length > 0) {
        setPhase('active');
        startJobPoll(outcome.jobId);
      } else {
        // inline — result is immediate
        setProgress({ step: PUSH_STEPS_TOTAL, total: PUSH_STEPS_TOTAL, phase: 'done', message: 'Sync complete (inline)' });
        if (outcome.result !== undefined) setFinalResult(outcome.result);
        setPhase('done');
        toast(`Push complete: ${outcome.result?.projectCount ?? 0} projects, ${outcome.result?.serviceCount ?? 0} services.`, { variant: 'success' });
      }
    } catch (err) {
      setPhase('error');
      const msg = err instanceof Error ? err.message : String(err);
      setFailedReason(msg);
      toast(`Push failed: ${msg}`, { variant: 'error' });
    }
  }, [cloudConfigured, startJobPoll, toast]);

  const isRunning = phase === 'enqueuing' || phase === 'active';
  const pct = getPushProgressPct(progress);
  const pushButtonLabel = (() => {
    if (phase === 'enqueuing') return 'Enqueuing...';
    if (phase === 'active') return 'Pushing...';
    return 'Push to Cloud';
  })();
  const lastJobId = lastOutcome?.jobId ?? '';

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
            {pushButtonLabel}
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
            {lastJobId.length > 0 ? (
              <div className='text-muted-foreground font-mono'>job: {lastJobId}</div>
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
