'use client';

/* eslint-disable max-lines, max-lines-per-function, complexity -- Composite admin list/editor screen mirrors the product-list management surface. */

import {
  Check,
  Eye,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
} from 'lucide-react';
import {
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from 'react';

import { AdminProductsPageLayout } from '@/shared/ui/admin-products-page-layout';
import { AppErrorBoundary } from '@/shared/ui/AppErrorBoundary';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { api } from '@/shared/lib/api-client';
import { cn } from '@/shared/utils/ui-utils';
import {
  PATTERN_CATEGORIES,
  PATTERN_CATEGORY_LABELS,
  PATTERN_FORMATS,
  PATTERN_LICENSE_IDS,
  PATTERN_MOTIFS,
  type PatternCategory,
  type PatternDeleteResponse,
  type PatternFormat,
  type PatternLicense,
  type PatternLicenseId,
  type PatternListResponse,
  type PatternMotif,
  type PatternPreview,
  type PatternProduct,
  type PatternStatus,
} from '@/features/patterns/types';

type AdminPatternsPageViewProps = {
  initialPatterns: PatternProduct[];
  initialError: string | null;
  databaseName: string;
  databaseUri: string;
};

type PatternFormState = {
  id: string;
  slug: string;
  name: string;
  collection: string;
  edition: string;
  category: PatternCategory;
  description: string;
  tagsText: string;
  formats: PatternFormat[];
  repeatSize: string;
  fileSize: string;
  updatedAt: string;
  featured: boolean;
  status: PatternStatus;
  preview: PatternPreview;
  defaultLicense: PatternLicenseId;
  licensePrices: Record<PatternLicenseId, number>;
};

type EditorMode = 'creating' | 'editing';

type PageMessage = {
  type: 'success' | 'error' | 'info';
  text: string;
};

const DEFAULT_LICENSES: Record<PatternLicenseId, PatternLicense> = {
  personal: {
    id: 'personal',
    label: 'Personal',
    price: 29,
    summary: 'Single personal project or private reference archive.',
  },
  studio: {
    id: 'studio',
    label: 'Studio',
    price: 89,
    summary: 'Commercial work for one studio or client.',
  },
  extended: {
    id: 'extended',
    label: 'Extended',
    price: 189,
    summary: 'Reusable product, packaging, and campaign assets.',
  },
};

const DEFAULT_PREVIEW: PatternPreview = {
  motif: 'grid',
  paper: '#f7f0e3',
  ink: '#1f1f1d',
  accent: '#c44f2f',
  density: 6,
};

const STATUS_OPTIONS: PatternStatus[] = ['published', 'draft'];
const FILTER_STATUS_OPTIONS: Array<PatternStatus | 'all'> = ['all', 'published', 'draft'];

const selectClassName =
  'h-10 w-full rounded-md border border-foreground/10 bg-background px-3 text-sm text-foreground outline-none transition-colors focus-visible:border-foreground/30 focus-visible:ring-2 focus-visible:ring-ring/40';

const textareaClassName =
  'min-h-24 w-full rounded-md border border-foreground/10 bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus-visible:border-foreground/30 focus-visible:ring-2 focus-visible:ring-ring/40';

const numberInputClassName =
  'h-9 w-full rounded-md border border-foreground/10 bg-background px-2 text-sm text-foreground outline-none transition-colors focus-visible:border-foreground/30 focus-visible:ring-2 focus-visible:ring-ring/40';

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

const getPatternLicense = (
  pattern: PatternProduct,
  licenseId: PatternLicenseId
): PatternLicense =>
  pattern.licenses.find((license) => license.id === licenseId) ?? DEFAULT_LICENSES[licenseId];

const createLicensePriceState = (
  pattern?: PatternProduct
): Record<PatternLicenseId, number> => ({
  personal: pattern ? getPatternLicense(pattern, 'personal').price : DEFAULT_LICENSES.personal.price,
  studio: pattern ? getPatternLicense(pattern, 'studio').price : DEFAULT_LICENSES.studio.price,
  extended: pattern ? getPatternLicense(pattern, 'extended').price : DEFAULT_LICENSES.extended.price,
});

const createEmptyPatternForm = (seed = 'new-pattern'): PatternFormState => {
  const seedSlug = slugify(seed);
  const slug = seedSlug.length > 0 ? seedSlug : 'new-pattern';
  return {
    id: `pattern-${slug}`,
    slug,
    name: 'New pattern',
    collection: 'Pattern archive',
    edition: 'Digital vector repeat',
    category: 'editorial',
    description: 'Downloadable vector repeat pattern.',
    tagsText: '',
    formats: ['SVG', 'PDF'],
    repeatSize: '24 x 24 cm',
    fileSize: '4 MB',
    updatedAt: '',
    featured: false,
    status: 'draft',
    preview: DEFAULT_PREVIEW,
    defaultLicense: 'studio',
    licensePrices: createLicensePriceState(),
  };
};

const toFormState = (pattern: PatternProduct): PatternFormState => ({
  id: pattern.id,
  slug: pattern.slug,
  name: pattern.name,
  collection: pattern.collection,
  edition: pattern.edition,
  category: pattern.category,
  description: pattern.description,
  tagsText: pattern.tags.join(', '),
  formats: pattern.formats,
  repeatSize: pattern.repeatSize,
  fileSize: pattern.fileSize,
  updatedAt: pattern.updatedAt,
  featured: pattern.featured,
  status: pattern.status,
  preview: pattern.preview,
  defaultLicense: pattern.defaultLicense,
  licensePrices: createLicensePriceState(pattern),
});

const toPatternPayload = (draft: PatternFormState): PatternProduct => ({
  id: draft.id.trim(),
  slug: (() => {
    const draftSlug = slugify(draft.slug);
    if (draftSlug.length > 0) return draftSlug;
    const nameSlug = slugify(draft.name);
    return nameSlug.length > 0 ? nameSlug : draft.id.trim();
  })(),
  name: draft.name.trim(),
  collection: draft.collection.trim(),
  edition: draft.edition.trim(),
  category: draft.category,
  description: draft.description.trim(),
  tags: draft.tagsText
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0),
  formats: draft.formats.length > 0 ? draft.formats : ['SVG'],
  repeatSize: draft.repeatSize.trim(),
  fileSize: draft.fileSize.trim(),
  updatedAt: draft.updatedAt,
  featured: draft.featured,
  status: draft.status,
  preview: draft.preview,
  defaultLicense: draft.defaultLicense,
  licenses: PATTERN_LICENSE_IDS.map((licenseId) => ({
    ...DEFAULT_LICENSES[licenseId],
    price: Math.max(0, Math.round(draft.licensePrices[licenseId])),
  })),
});

const sortPatterns = (patterns: PatternProduct[]): PatternProduct[] =>
  [...patterns].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'published' ? -1 : 1;
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

const upsertPattern = (
  patterns: PatternProduct[],
  savedPattern: PatternProduct
): PatternProduct[] =>
  sortPatterns([
    ...patterns.filter((pattern) => pattern.id !== savedPattern.id),
    savedPattern,
  ]);

const formatUpdatedAt = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not saved yet';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}): React.JSX.Element {
  return (
    <label className={cn('grid gap-1.5 text-sm font-medium text-foreground', className)}>
      <span className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
        {label}
      </span>
      {children}
    </label>
  );
}

function PatternPreviewSwatch({
  preview,
  name,
}: {
  preview: PatternPreview;
  name: string;
}): React.JSX.Element {
  const density = Math.max(3, Math.min(10, preview.density));
  const indexes = Array.from({ length: density }, (_entry, index) => index);
  const spacing = 100 / (density + 1);

  return (
    <svg
      viewBox='0 0 100 100'
      role='img'
      aria-label={`${name} pattern preview`}
      className='aspect-square w-full rounded-md border border-border bg-card'
    >
      <rect width='100' height='100' fill={preview.paper} />
      {preview.motif === 'grid'
        ? indexes.map((index) => {
            const position = (index + 1) * spacing;
            return (
              <g key={position}>
                <line x1={position} y1='0' x2={position} y2='100' stroke={preview.ink} strokeWidth='0.9' opacity='0.45' />
                <line x1='0' y1={position} x2='100' y2={position} stroke={preview.ink} strokeWidth='0.9' opacity='0.45' />
              </g>
            );
          })
        : null}
      {preview.motif === 'wave'
        ? indexes.map((index) => {
            const y = (index + 1) * spacing;
            return (
              <path
                key={y}
                d={`M0 ${y} C 18 ${y - 10}, 32 ${y + 10}, 50 ${y} S 82 ${y - 10}, 100 ${y}`}
                fill='none'
                stroke={preview.ink}
                strokeWidth='1.6'
                opacity='0.72'
              />
            );
          })
        : null}
      {preview.motif === 'arches'
        ? indexes.map((index) => {
            const x = (index + 0.5) * spacing;
            return (
              <path
                key={x}
                d={`M${x - 6} 82 V48 A6 6 0 0 1 ${x + 6} 48 V82`}
                fill='none'
                stroke={index % 2 === 0 ? preview.ink : preview.accent}
                strokeWidth='2'
              />
            );
          })
        : null}
      {preview.motif === 'botanical-trace'
        ? indexes.map((index) => {
            const x = (index + 1) * spacing;
            return (
              <g key={x} opacity='0.8'>
                <path d={`M${x} 88 C${x - 8} 62 ${x + 8} 44 ${x} 18`} fill='none' stroke={preview.ink} strokeWidth='1.2' />
                <ellipse cx={x - 5} cy={42} rx='6' ry='11' fill='none' stroke={preview.accent} strokeWidth='1.4' transform={`rotate(-24 ${x - 5} 42)`} />
                <ellipse cx={x + 5} cy={58} rx='6' ry='11' fill='none' stroke={preview.accent} strokeWidth='1.4' transform={`rotate(24 ${x + 5} 58)`} />
              </g>
            );
          })
        : null}
      {preview.motif !== 'grid' && preview.motif !== 'wave' && preview.motif !== 'arches' && preview.motif !== 'botanical-trace'
        ? indexes.map((index) => {
            const x = ((index * 23) % 86) + 7;
            const y = ((index * 37) % 86) + 7;
            return (
              <circle
                key={`${x}-${y}`}
                cx={x}
                cy={y}
                r={preview.motif === 'terrazzo' ? 4 + (index % 3) : 3}
                fill={index % 2 === 0 ? preview.ink : preview.accent}
                opacity='0.7'
              />
            );
          })
        : null}
      <rect x='8' y='8' width='84' height='84' fill='none' stroke={preview.accent} strokeWidth='1.2' opacity='0.5' />
    </svg>
  );
}

export function AdminPatternsPageView({
  initialPatterns,
  initialError,
  databaseName,
  databaseUri,
}: AdminPatternsPageViewProps): React.JSX.Element {
  const [patterns, setPatterns] = useState<PatternProduct[]>(() => sortPatterns(initialPatterns));
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<PatternCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<PatternStatus | 'all'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(initialPatterns[0]?.id ?? null);
  const [mode, setMode] = useState<EditorMode>(initialPatterns.length === 0 ? 'creating' : 'editing');
  const [draft, setDraft] = useState<PatternFormState>(() =>
    initialPatterns[0] ? toFormState(initialPatterns[0]) : createEmptyPatternForm()
  );
  const [message, setMessage] = useState<PageMessage | null>(
    initialError !== null && initialError.length > 0 ? { type: 'error', text: initialError } : null
  );
  const [busy, setBusy] = useState(false);

  const visiblePatterns = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return patterns.filter((pattern) => {
      const matchesCategory = categoryFilter === 'all' || pattern.category === categoryFilter;
      const matchesStatus = statusFilter === 'all' || pattern.status === statusFilter;
      const searchableText = [
        pattern.name,
        pattern.slug,
        pattern.collection,
        pattern.edition,
        pattern.description,
        pattern.category,
        ...pattern.tags,
      ]
        .join(' ')
        .toLowerCase();
      return matchesCategory && matchesStatus && searchableText.includes(normalizedQuery);
    });
  }, [categoryFilter, patterns, query, statusFilter]);

  const publishedCount = patterns.filter((pattern) => pattern.status === 'published').length;
  const draftCount = patterns.length - publishedCount;
  const selectedPattern = selectedId !== null
    ? patterns.find((pattern) => pattern.id === selectedId) ?? null
    : null;

  const updateDraft = <K extends keyof PatternFormState>(
    key: K,
    value: PatternFormState[K]
  ): void => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const updatePreview = <K extends keyof PatternPreview>(
    key: K,
    value: PatternPreview[K]
  ): void => {
    setDraft((current) => ({
      ...current,
      preview: { ...current.preview, [key]: value },
    }));
  };

  const updateLicensePrice = (licenseId: PatternLicenseId, value: string): void => {
    const parsed = Number(value);
    setDraft((current) => ({
      ...current,
      licensePrices: {
        ...current.licensePrices,
        [licenseId]: Number.isFinite(parsed) ? parsed : 0,
      },
    }));
  };

  const toggleFormat = (format: PatternFormat): void => {
    setDraft((current) => {
      const hasFormat = current.formats.includes(format);
      return {
        ...current,
        formats: hasFormat
          ? current.formats.filter((entry) => entry !== format)
          : [...current.formats, format],
      };
    });
  };

  const selectPattern = (pattern: PatternProduct): void => {
    setSelectedId(pattern.id);
    setDraft(toFormState(pattern));
    setMode('editing');
    setMessage(null);
  };

  const startCreate = (): void => {
    const nextDraft = createEmptyPatternForm(`new-pattern-${Date.now()}`);
    setSelectedId(null);
    setDraft(nextDraft);
    setMode('creating');
    setMessage({ type: 'info', text: 'Draft a new pattern, then save it to the local database.' });
  };

  const refreshPatterns = async (): Promise<void> => {
    setBusy(true);
    setMessage(null);
    try {
      const response = await api.get<PatternListResponse>('/api/v2/patterns');
      const nextPatterns = sortPatterns(response.patterns);
      setPatterns(nextPatterns);
      const nextSelected = selectedId !== null
        ? nextPatterns.find((pattern) => pattern.id === selectedId) ?? nextPatterns[0] ?? null
        : nextPatterns[0] ?? null;
      if (nextSelected) {
        setSelectedId(nextSelected.id);
        setDraft(toFormState(nextSelected));
        setMode('editing');
      } else {
        setSelectedId(null);
        setDraft(createEmptyPatternForm());
        setMode('creating');
      }
      setMessage({ type: 'success', text: 'Patterns refreshed from local MongoDB.' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Unable to refresh patterns.',
      });
    } finally {
      setBusy(false);
    }
  };

  const saveDraft = async (): Promise<void> => {
    const payload = toPatternPayload(draft);
    if (payload.id.length === 0 || payload.slug.length === 0 || payload.name.length === 0) {
      setMessage({ type: 'error', text: 'Pattern name, ID, and slug are required.' });
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const response =
        mode === 'creating'
          ? await api.post<{ pattern: PatternProduct }>('/api/v2/patterns', payload)
          : await api.put<{ pattern: PatternProduct }>(
              `/api/v2/patterns/${encodeURIComponent(payload.id)}`,
              payload
            );

      setPatterns((current) => upsertPattern(current, response.pattern));
      setSelectedId(response.pattern.id);
      setDraft(toFormState(response.pattern));
      setMode('editing');
      setMessage({ type: 'success', text: 'Pattern saved to the local MongoDB catalog.' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Unable to save pattern.',
      });
    } finally {
      setBusy(false);
    }
  };

  const deleteSelectedPattern = async (): Promise<void> => {
    if (mode !== 'editing' || selectedPattern === null) return;
    const confirmed = window.confirm(`Delete pattern "${selectedPattern.name}" from MongoDB?`);
    if (!confirmed) return;

    setBusy(true);
    setMessage(null);
    try {
      await api.delete<PatternDeleteResponse>(
        `/api/v2/patterns/${encodeURIComponent(selectedPattern.id)}`
      );
      const nextPatterns = patterns.filter((pattern) => pattern.id !== selectedPattern.id);
      const nextSelected = nextPatterns[0] ?? null;
      setPatterns(nextPatterns);
      if (nextSelected) {
        setSelectedId(nextSelected.id);
        setDraft(toFormState(nextSelected));
        setMode('editing');
      } else {
        setSelectedId(null);
        setDraft(createEmptyPatternForm());
        setMode('creating');
      }
      setMessage({ type: 'success', text: 'Pattern deleted from the local catalog.' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Unable to delete pattern.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    saveDraft().catch(() => undefined);
  };

  const headerActions = (
    <div className='flex flex-wrap items-center gap-2'>
      <Button
        type='button'
        variant='outline'
        icon={<RefreshCw className='size-4' aria-hidden='true' />}
        loading={busy}
        onClick={() => {
          refreshPatterns().catch(() => undefined);
        }}
      >
        Refresh
      </Button>
      <Button
        type='button'
        variant='solid'
        icon={<Plus className='size-4' aria-hidden='true' />}
        onClick={startCreate}
      >
        Add pattern
      </Button>
    </div>
  );

  return (
    <AdminProductsPageLayout
      title='Patterns'
      current='Patterns'
      description='Manage downloadable vector patterns and the categories used by the presentation catalog.'
      headerActions={headerActions}
    >
      <AppErrorBoundary source='patterns.AdminPatternsPageView'>
        <div className='grid gap-4 xl:grid-cols-[minmax(0,1fr)_430px]'>
          <section className='rounded-lg border border-border bg-card/70 p-4 shadow-sm'>
            <div className='flex flex-wrap items-center justify-between gap-3'>
              <div>
                <p className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
                  Local MongoDB
                </p>
                <h2 className='text-lg font-semibold text-foreground'>{databaseName}</h2>
                <p className='mt-1 text-xs text-muted-foreground'>{databaseUri}</p>
              </div>
              <div className='grid grid-cols-3 gap-2 text-center text-xs'>
                <div className='rounded-md border border-border bg-background/60 px-3 py-2'>
                  <div className='text-lg font-semibold text-foreground'>{patterns.length}</div>
                  <div className='text-muted-foreground'>total</div>
                </div>
                <div className='rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-2'>
                  <div className='text-lg font-semibold text-emerald-500'>{publishedCount}</div>
                  <div className='text-muted-foreground'>published</div>
                </div>
                <div className='rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2'>
                  <div className='text-lg font-semibold text-amber-500'>{draftCount}</div>
                  <div className='text-muted-foreground'>drafts</div>
                </div>
              </div>
            </div>

            <div className='mt-4 grid gap-3 lg:grid-cols-[minmax(220px,1fr)_180px]'>
              <div className='relative'>
                <Search className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' aria-hidden='true' />
                <Input
                  value={query}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
                  placeholder='Search patterns'
                  className='pl-9'
                  aria-label='Search patterns'
                />
              </div>
              <select
                className={selectClassName}
                value={statusFilter}
                onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                  setStatusFilter(event.target.value as PatternStatus | 'all')
                }
                aria-label='Filter by status'
              >
                {FILTER_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status === 'all' ? 'All statuses' : status}
                  </option>
                ))}
              </select>
            </div>

            <div className='mt-3 flex flex-wrap gap-2'>
              <Button
                type='button'
                size='sm'
                variant={categoryFilter === 'all' ? 'solid' : 'outline'}
                onClick={() => setCategoryFilter('all')}
              >
                All categories
              </Button>
              {PATTERN_CATEGORIES.map((category) => (
                <Button
                  key={category}
                  type='button'
                  size='sm'
                  variant={categoryFilter === category ? 'solid' : 'outline'}
                  onClick={() => setCategoryFilter(category)}
                >
                  {PATTERN_CATEGORY_LABELS[category]}
                </Button>
              ))}
            </div>

            {message ? (
              <div
                className={cn(
                  'mt-4 rounded-md border px-3 py-2 text-sm',
                  message.type === 'error' && 'border-red-500/30 bg-red-500/10 text-red-500',
                  message.type === 'success' && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500',
                  message.type === 'info' && 'border-sky-500/30 bg-sky-500/10 text-sky-500'
                )}
              >
                {message.text}
              </div>
            ) : null}

            <div className='mt-4 overflow-hidden rounded-lg border border-border'>
              <div className='max-h-[620px] overflow-auto'>
                <table className='w-full min-w-[760px] text-left text-sm'>
                  <thead className='sticky top-0 z-10 bg-muted/80 text-xs uppercase tracking-wide text-muted-foreground backdrop-blur'>
                    <tr>
                      <th className='w-16 px-3 py-3'>Preview</th>
                      <th className='px-3 py-3'>Pattern</th>
                      <th className='px-3 py-3'>Category</th>
                      <th className='px-3 py-3'>Status</th>
                      <th className='px-3 py-3'>Price</th>
                      <th className='px-3 py-3'>Updated</th>
                      <th className='px-3 py-3 text-right'>Action</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-border bg-background/40'>
                    {visiblePatterns.map((pattern) => (
                      <tr
                        key={pattern.id}
                        className={cn(
                          'transition-colors hover:bg-muted/40',
                          selectedId === pattern.id && 'bg-muted/60'
                        )}
                      >
                        <td className='px-3 py-3'>
                          <div className='w-11'>
                            <PatternPreviewSwatch preview={pattern.preview} name={pattern.name} />
                          </div>
                        </td>
                        <td className='px-3 py-3'>
                          <button
                            type='button'
                            className='text-left'
                            aria-label={`Edit ${pattern.name}`}
                            onClick={() => selectPattern(pattern)}
                          >
                            <span className='block font-semibold text-foreground'>{pattern.name}</span>
                            <span className='block text-xs text-muted-foreground'>{pattern.slug}</span>
                          </button>
                        </td>
                        <td className='px-3 py-3 text-muted-foreground'>
                          {PATTERN_CATEGORY_LABELS[pattern.category]}
                        </td>
                        <td className='px-3 py-3'>
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs',
                              pattern.status === 'published'
                                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500'
                                : 'border-amber-500/30 bg-amber-500/10 text-amber-500'
                            )}
                          >
                            {pattern.status === 'published' ? <Eye className='size-3' aria-hidden='true' /> : <Pencil className='size-3' aria-hidden='true' />}
                            {pattern.status}
                          </span>
                        </td>
                        <td className='px-3 py-3 text-muted-foreground'>
                          {money.format(getPatternLicense(pattern, pattern.defaultLicense).price)}
                        </td>
                        <td className='px-3 py-3 text-muted-foreground'>
                          {formatUpdatedAt(pattern.updatedAt)}
                        </td>
                        <td className='px-3 py-3 text-right'>
                          <Button
                            type='button'
                            size='sm'
                            variant='outline'
                            icon={<Pencil className='size-3.5' aria-hidden='true' />}
                            onClick={() => selectPattern(pattern)}
                          >
                            Edit
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {visiblePatterns.length === 0 ? (
                      <tr>
                        <td colSpan={7} className='px-3 py-10 text-center text-muted-foreground'>
                          No patterns match the current filters.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <form
            onSubmit={handleSubmit}
            className='rounded-lg border border-border bg-card/70 p-4 shadow-sm xl:sticky xl:top-24 xl:max-h-[calc(100vh-7rem)] xl:overflow-auto'
          >
            <div className='flex items-start justify-between gap-3'>
              <div>
                <p className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
                  {mode === 'creating' ? 'New pattern' : 'Edit pattern'}
                </p>
                <h2 className='mt-1 text-xl font-semibold text-foreground'>{draft.name}</h2>
                <p className='mt-1 text-xs text-muted-foreground'>
                  {mode === 'editing' ? `Saved ${formatUpdatedAt(draft.updatedAt)}` : 'Not saved yet'}
                </p>
              </div>
              <div className='flex gap-2'>
                <Button
                  type='button'
                  size='icon'
                  variant='outline'
                  aria-label='Delete selected pattern'
                  title='Delete selected pattern'
                  disabled={mode !== 'editing' || selectedPattern === null || busy}
                  onClick={() => {
                    deleteSelectedPattern().catch(() => undefined);
                  }}
                >
                  <Trash2 className='size-4' aria-hidden='true' />
                </Button>
                <Button
                  type='submit'
                  variant='solid'
                  icon={<Save className='size-4' aria-hidden='true' />}
                  loading={busy}
                >
                  Save
                </Button>
              </div>
            </div>

            <div className='mt-4'>
              <PatternPreviewSwatch preview={draft.preview} name={draft.name} />
            </div>

            <div className='mt-4 grid gap-3 sm:grid-cols-2'>
              <Field label='Name' className='sm:col-span-2'>
                <Input
                  value={draft.name}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    updateDraft('name', event.target.value)
                  }
                  placeholder='Pattern name'
                />
              </Field>
              <Field label='Pattern ID'>
                <Input value={draft.id} disabled={mode === 'editing'} onChange={(event) => updateDraft('id', event.target.value)} />
              </Field>
              <Field label='Slug'>
                <Input
                  value={draft.slug}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    updateDraft('slug', event.target.value)
                  }
                />
              </Field>
              <Field label='Collection'>
                <Input
                  value={draft.collection}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    updateDraft('collection', event.target.value)
                  }
                />
              </Field>
              <Field label='Edition'>
                <Input
                  value={draft.edition}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    updateDraft('edition', event.target.value)
                  }
                />
              </Field>
              <Field label='Category'>
                <select
                  value={draft.category}
                  className={selectClassName}
                  onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                    updateDraft('category', event.target.value as PatternCategory)
                  }
                >
                  {PATTERN_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {PATTERN_CATEGORY_LABELS[category]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label='Status'>
                <select
                  value={draft.status}
                  className={selectClassName}
                  onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                    updateDraft('status', event.target.value as PatternStatus)
                  }
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label='Description' className='sm:col-span-2'>
                <textarea
                  aria-label='Pattern description'
                  value={draft.description}
                  className={textareaClassName}
                  onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                    updateDraft('description', event.target.value)
                  }
                />
              </Field>
              <Field label='Tags' className='sm:col-span-2'>
                <Input
                  value={draft.tagsText}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    updateDraft('tagsText', event.target.value)
                  }
                  placeholder='tile, print, interior'
                />
              </Field>
              <Field label='Repeat size'>
                <Input
                  value={draft.repeatSize}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    updateDraft('repeatSize', event.target.value)
                  }
                />
              </Field>
              <Field label='File size'>
                <Input
                  value={draft.fileSize}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    updateDraft('fileSize', event.target.value)
                  }
                />
              </Field>
            </div>

            <div className='mt-5 rounded-lg border border-border bg-background/45 p-3'>
              <div className='flex items-center justify-between gap-3'>
                <h3 className='text-sm font-semibold text-foreground'>Formats</h3>
                <label className='inline-flex items-center gap-2 text-xs text-muted-foreground'>
                  <input
                    aria-label='Featured pattern'
                    type='checkbox'
                    checked={draft.featured}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      updateDraft('featured', event.target.checked)
                    }
                  />
                  Featured
                </label>
              </div>
              <div className='mt-3 flex flex-wrap gap-2'>
                {PATTERN_FORMATS.map((format) => (
                  <Button
                    key={format}
                    type='button'
                    size='sm'
                    variant={draft.formats.includes(format) ? 'solid' : 'outline'}
                    icon={draft.formats.includes(format) ? <Check className='size-3.5' aria-hidden='true' /> : undefined}
                    onClick={() => toggleFormat(format)}
                  >
                    {format}
                  </Button>
                ))}
              </div>
            </div>

            <div className='mt-5 rounded-lg border border-border bg-background/45 p-3'>
              <h3 className='text-sm font-semibold text-foreground'>Licenses</h3>
              <div className='mt-3 grid gap-3'>
                {PATTERN_LICENSE_IDS.map((licenseId) => (
                  <div key={licenseId} className='grid grid-cols-[1fr_110px] items-end gap-3'>
                    <label className='inline-flex items-center gap-2 text-sm text-foreground'>
                      <input
                        aria-label={`Use ${DEFAULT_LICENSES[licenseId].label} as default license`}
                        type='radio'
                        name='defaultLicense'
                        checked={draft.defaultLicense === licenseId}
                        onChange={() => updateDraft('defaultLicense', licenseId)}
                      />
                      <span>{DEFAULT_LICENSES[licenseId].label}</span>
                    </label>
                    <input
                      type='number'
                      min='0'
                      step='1'
                      className={numberInputClassName}
                      value={draft.licensePrices[licenseId]}
                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        updateLicensePrice(licenseId, event.target.value)
                      }
                      aria-label={`${DEFAULT_LICENSES[licenseId].label} price`}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className='mt-5 rounded-lg border border-border bg-background/45 p-3'>
              <h3 className='text-sm font-semibold text-foreground'>Preview</h3>
              <div className='mt-3 grid gap-3 sm:grid-cols-2'>
                <Field label='Motif'>
                  <select
                    value={draft.preview.motif}
                    className={selectClassName}
                    onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                      updatePreview('motif', event.target.value as PatternMotif)
                    }
                  >
                    {PATTERN_MOTIFS.map((motif) => (
                      <option key={motif} value={motif}>
                        {motif}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label='Density'>
                  <input
                    aria-label='Pattern preview density'
                    type='range'
                    min='3'
                    max='10'
                    value={draft.preview.density}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      updatePreview('density', Number(event.target.value))
                    }
                  />
                </Field>
                <Field label='Paper'>
                  <Input
                    type='color'
                    value={draft.preview.paper}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      updatePreview('paper', event.target.value)
                    }
                  />
                </Field>
                <Field label='Ink'>
                  <Input
                    type='color'
                    value={draft.preview.ink}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      updatePreview('ink', event.target.value)
                    }
                  />
                </Field>
                <Field label='Accent' className='sm:col-span-2'>
                  <Input
                    type='color'
                    value={draft.preview.accent}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      updatePreview('accent', event.target.value)
                    }
                  />
                </Field>
              </div>
            </div>
          </form>
        </div>
      </AppErrorBoundary>
    </AdminProductsPageLayout>
  );
}
