'use client';

/* eslint-disable complexity, max-lines, max-lines-per-function */

import { Download, Eye, Save } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useRouter } from 'nextjs-toploader/app';
import React, { startTransition, useCallback, useEffect, useMemo, useState } from 'react';

import { AdminFilemakerBreadcrumbs } from '@/shared/ui/admin.public';
import {
  FormActions,
  FormField,
  FormSection,
} from '@/shared/ui/forms-and-actions.public';
import { SectionHeader } from '@/shared/ui/navigation-and-layout.public';
import { Badge, Button, Input, useToast } from '@/shared/ui/primitives.public';
import { withCsrfHeaders } from '@/shared/lib/security/csrf-client';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import { CvBlockPicker } from '../components/cv-builder/CvBlockPicker';
import { CvBlockSettingsPanel } from '../components/cv-builder/CvBlockSettingsPanel';
import { CvLayerPanel } from '../components/cv-builder/CvLayerPanel';
import { compileCvBlocksToHtml } from '../components/cv-builder/compile-cv-blocks';
import type { CvBlock } from '../components/cv-builder/cv-block-model';
import { normalizeCvBlocks } from '../components/cv-builder/cv-block-model';
import { openFilemakerCvPdfPreview } from '../cv-pdf-preview';
import type { FilemakerCv, FilemakerCvStatus } from '../filemaker-cv.types';
import { decodeRouteParam, formatTimestamp } from './filemaker-page-utils';

type CvDetailState = {
  cv: FilemakerCv | null;
  error: string | null;
  isLoading: boolean;
};

const STATUS_OPTIONS: Array<{ label: string; value: FilemakerCvStatus }> = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
];

const readDownloadFilename = (response: Response, fallback: string): string => {
  const contentDisposition = response.headers.get('Content-Disposition') ?? '';
  const quoted = /filename="([^"]+)"/i.exec(contentDisposition);
  if (quoted?.[1] !== undefined && quoted[1].length > 0) return quoted[1];
  const unquoted = /filename=([^;]+)/i.exec(contentDisposition);
  const unquotedFilename = unquoted?.[1]?.trim() ?? '';
  return unquotedFilename.length > 0 ? unquotedFilename : fallback;
};

const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

const firstBlockId = (blocks: CvBlock[]): string | null => blocks[0]?.id ?? null;

const loadCv = async (cvId: string, signal: AbortSignal): Promise<FilemakerCv> => {
  const response = await fetch(`/api/filemaker/cvs/${encodeURIComponent(cvId)}`, { signal });
  if (!response.ok) throw new Error(`Failed to load CV (${response.status}).`);
  const payload = (await response.json()) as { cv: FilemakerCv };
  return payload.cv;
};

export function AdminFilemakerCvEditPage(): React.JSX.Element {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const routePersonId = useMemo(() => decodeRouteParam(params['personId']), [params]);
  const cvId = useMemo(() => decodeRouteParam(params['cvId']), [params]);
  const [state, setState] = useState<CvDetailState>({
    cv: null,
    error: null,
    isLoading: true,
  });
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<FilemakerCvStatus>('draft');
  const [blocks, setBlocks] = useState<CvBlock[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setState({ cv: null, error: null, isLoading: true });
    loadCv(cvId, controller.signal)
      .then((cv: FilemakerCv): void => {
        const normalizedBlocks = normalizeCvBlocks(cv.bodyBlocks);
        setState({ cv, error: null, isLoading: false });
        setTitle(cv.title);
        setStatus(cv.status);
        setBlocks(normalizedBlocks);
        setSelectedBlockId(firstBlockId(normalizedBlocks));
      })
      .catch((error: unknown): void => {
        if (controller.signal.aborted) return;
        logClientError(error);
        setState({
          cv: null,
          error: error instanceof Error ? error.message : 'Failed to load CV.',
          isLoading: false,
        });
        setTitle('');
        setStatus('draft');
        setBlocks([]);
        setSelectedBlockId(null);
      });
    return () => {
      controller.abort();
    };
  }, [cvId]);

  const previewHtml = useMemo(
    () =>
      compileCvBlocksToHtml(blocks, {
        highlightedTechnologyTerms: state.cv?.highlightTechnologyTerms ?? [],
      }),
    [blocks, state.cv?.highlightTechnologyTerms]
  );
  const personId = state.cv?.personId ?? routePersonId;

  const applyLoadedCv = useCallback((cv: FilemakerCv): void => {
    const normalizedBlocks = normalizeCvBlocks(cv.bodyBlocks);
    setState({ cv, error: null, isLoading: false });
    setTitle(cv.title);
    setStatus(cv.status);
    setBlocks(normalizedBlocks);
    setSelectedBlockId((current) => current ?? firstBlockId(normalizedBlocks));
  }, []);

  const persistCurrentCv = useCallback(async (): Promise<FilemakerCv> => {
    if (state.cv === null) throw new Error('CV is not loaded.');
    const response = await fetch(`/api/filemaker/cvs/${encodeURIComponent(state.cv.id)}`, {
      method: 'PATCH',
      headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        bodyBlocks: blocks,
        status,
        title,
      }),
    });
    if (!response.ok) throw new Error(`Failed to save CV (${response.status}).`);
    const payload = (await response.json()) as { cv: FilemakerCv };
    applyLoadedCv(payload.cv);
    return payload.cv;
  }, [applyLoadedCv, blocks, state.cv, status, title]);

  const handleBackToPerson = useCallback((): void => {
    startTransition(() => {
      router.push(`/admin/filemaker/persons/${encodeURIComponent(personId)}`);
    });
  }, [personId, router]);

  const handleSave = useCallback(async (): Promise<void> => {
    if (state.cv === null) return;
    setIsSaving(true);
    try {
      await persistCurrentCv();
      toast('CV saved.', { variant: 'success' });
    } catch (error: unknown) {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to save CV.', { variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  }, [persistCurrentCv, state.cv, toast]);

  const handlePreviewPdf = useCallback((): void => {
    try {
      openFilemakerCvPdfPreview(previewHtml);
    } catch (error: unknown) {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to preview CV PDF.', {
        variant: 'error',
      });
    }
  }, [previewHtml, toast]);

  const handleExportPdf = useCallback(async (): Promise<void> => {
    if (state.cv === null) return;
    setIsExporting(true);
    try {
      const savedCv = await persistCurrentCv();
      const response = await fetch('/api/filemaker/cvs/export-pdf', {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ cvId: savedCv.id }),
      });
      if (!response.ok) throw new Error(`Failed to export CV (${response.status}).`);
      const fallbackTitle = savedCv.title.trim().length > 0 ? savedCv.title : savedCv.id;
      const filename = readDownloadFilename(response, `${fallbackTitle}.pdf`);
      downloadBlob(await response.blob(), filename);
      toast('CV PDF exported.', { variant: 'success' });
    } catch (error: unknown) {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to export CV PDF.', {
        variant: 'error',
      });
    } finally {
      setIsExporting(false);
    }
  }, [persistCurrentCv, state.cv, toast]);

  if (state.cv === null) {
    return (
      <div className='page-section-compact space-y-6'>
        <SectionHeader
          title='CV Creator'
          description={state.isLoading ? 'Loading CV.' : state.error ?? 'CV not found.'}
          eyebrow={
            <AdminFilemakerBreadcrumbs
              parent={{ label: 'Persons', href: '/admin/filemaker/persons' }}
              current='CV Creator'
              className='mb-2'
            />
          }
          actions={<FormActions onCancel={handleBackToPerson} cancelText='Back to Person' />}
        />
      </div>
    );
  }

  return (
    <div className='page-section-compact space-y-6'>
      <SectionHeader
        title='CV Creator'
        description={`Linked to ${state.cv.personName}.`}
        eyebrow={
          <AdminFilemakerBreadcrumbs
            parent={{ label: 'Persons', href: '/admin/filemaker/persons' }}
            current='CV Creator'
            className='mb-2'
          />
        }
        actions={
          <FormActions
            onCancel={handleBackToPerson}
            onSave={() => {
              void handleSave();
            }}
            cancelText='Back to Person'
            saveText='Save CV'
            isSaving={isSaving}
            saveIcon={<Save className='size-3.5' />}
          >
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={handlePreviewPdf}
              className='gap-2'
            >
              <Eye className='size-3.5' />
              Preview PDF
            </Button>
            <Button
              type='button'
              variant='outline'
              size='sm'
              disabled={isExporting}
              loading={isExporting}
              loadingText='Exporting...'
              onClick={() => {
                void handleExportPdf();
              }}
              className='gap-2'
            >
              {!isExporting ? <Download className='size-3.5' /> : null}
              Export PDF
            </Button>
          </FormActions>
        }
      />

      <div className='flex flex-wrap gap-2'>
        <Badge variant='outline' className='text-[10px]'>
          Status: {state.cv.status}
        </Badge>
        <Badge variant='outline' className='text-[10px]'>
          Updated: {formatTimestamp(state.cv.updatedAt)}
        </Badge>
      </div>

      <FormSection title='CV Details' className='space-y-4 p-4'>
        <div className='grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]'>
          <FormField label='Title'>
            <Input
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
              }}
              className='h-9'
            />
          </FormField>
          <FormField label='Status'>
            <select
              value={status}
              onChange={(event: React.ChangeEvent<HTMLSelectElement>): void => {
                const nextStatus = event.target.value;
                if (
                  nextStatus === 'draft' ||
                  nextStatus === 'published' ||
                  nextStatus === 'archived'
                ) {
                  setStatus(nextStatus);
                }
              }}
              aria-label='CV status'
              className='h-9 w-full rounded-md border border-foreground/10 bg-transparent px-3 py-2 text-sm text-foreground/90 transition-colors focus:border-foreground/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2'
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FormField>
        </div>
      </FormSection>

      <FormSection title='Builder' className='space-y-4 p-4'>
        <CvBlockPicker
          blocks={blocks}
          selectedBlockId={selectedBlockId}
          onChange={setBlocks}
          onSelectBlock={setSelectedBlockId}
        />
        <div className='grid gap-3 lg:grid-cols-[260px_minmax(0,1fr)_320px]'>
          <CvLayerPanel
            blocks={blocks}
            onChange={setBlocks}
            selectedBlockId={selectedBlockId}
            onSelectBlock={setSelectedBlockId}
            className='rounded-md border border-border/60 bg-card/20 p-2'
          />
          <div className='rounded-md border border-border/60 bg-card/20 p-2'>
            <div className='mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400'>
              Preview
            </div>
            <iframe
              title='CV preview'
              srcDoc={previewHtml}
              className='h-[760px] w-full rounded border border-border/40 bg-white'
            />
          </div>
          <CvBlockSettingsPanel
            blocks={blocks}
            selectedBlockId={selectedBlockId}
            onChange={setBlocks}
            onSelectBlock={setSelectedBlockId}
          />
        </div>
      </FormSection>
    </div>
  );
}
