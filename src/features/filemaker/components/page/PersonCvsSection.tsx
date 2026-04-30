'use client';

/* eslint-disable complexity, max-lines, max-lines-per-function */

import { Download, ExternalLink, Eye, FileText, Loader2, Plus } from 'lucide-react';
import React, { startTransition, useCallback, useEffect, useMemo, useState } from 'react';

import { FormSection } from '@/shared/ui/forms-and-actions.public';
import { Badge, Button, Card, useToast } from '@/shared/ui/primitives.public';
import { withCsrfHeaders } from '@/shared/lib/security/csrf-client';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import { compileCvBlocksToHtml } from '../cv-builder/compile-cv-blocks';
import { useAdminFilemakerPersonEditPageStateContext } from '../../context/AdminFilemakerPersonEditPageContext';
import { openFilemakerCvPdfPreview } from '../../cv-pdf-preview';
import {
  buildDefaultFilemakerCvBlocks,
  resolveFilemakerCvPersonName,
  type FilemakerCvProfileSeed,
} from '../../cv-defaults';
import type { CvBlock } from '../cv-builder/cv-block-model';
import type { FilemakerCv } from '../../filemaker-cv.types';
import { formatTimestamp } from '../../pages/filemaker-page-utils';

type CvListState = {
  cvs: FilemakerCv[];
  error: string | null;
  isLoading: boolean;
};

type CvCreatePayload = {
  bodyBlocks: CvBlock[];
  personId: string;
  title: string;
};

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

const formatCvTitle = (cv: FilemakerCv): string => {
  const title = cv.title.trim();
  return title.length > 0 ? title : `${cv.personName} CV`;
};

export function PersonCvsSection(): React.JSX.Element {
  const {
    editableAddresses,
    database,
    emails,
    linkedAnyTexts,
    linkedContracts,
    linkedDocuments,
    linkedOccupations,
    person,
    personDraft,
    phoneNumbers,
    router,
    websites,
  } = useAdminFilemakerPersonEditPageStateContext();
  const { toast } = useToast();
  const [state, setState] = useState<CvListState>({
    cvs: [],
    error: null,
    isLoading: true,
  });
  const [isCreating, setIsCreating] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isExportingGeneratedPdf, setIsExportingGeneratedPdf] = useState(false);
  const [exportingCvId, setExportingCvId] = useState<string | null>(null);

  const personId = person?.id ?? '';
  const personName = useMemo(
    () =>
      person !== null
        ? resolveFilemakerCvPersonName({
            firstName: personDraft.firstName ?? person.firstName,
            lastName: personDraft.lastName ?? person.lastName,
          })
        : 'Person',
    [person, personDraft.firstName, personDraft.lastName]
  );

  useEffect(() => {
    if (personId.length === 0) {
      setState({ cvs: [], error: null, isLoading: false });
      return undefined;
    }
    const controller = new AbortController();
    setState((current) => ({ ...current, error: null, isLoading: true }));
    fetch(`/api/filemaker/cvs?personId=${encodeURIComponent(personId)}`, {
      signal: controller.signal,
    })
      .then(async (response: Response): Promise<{ cvs: FilemakerCv[] }> => {
        if (!response.ok) throw new Error(`Failed to load CVs (${response.status}).`);
        return (await response.json()) as { cvs: FilemakerCv[] };
      })
      .then((response: { cvs: FilemakerCv[] }): void => {
        setState({ cvs: response.cvs, error: null, isLoading: false });
      })
      .catch((error: unknown): void => {
        if (controller.signal.aborted) return;
        logClientError(error);
        setState({
          cvs: [],
          error: error instanceof Error ? error.message : 'Failed to load CVs.',
          isLoading: false,
        });
      });
    return () => {
      controller.abort();
    };
  }, [personId]);

  const openCv = useCallback(
    (cv: FilemakerCv): void => {
      startTransition(() => {
        router.push(
          `/admin/filemaker/persons/${encodeURIComponent(cv.personId)}/cvs/${encodeURIComponent(cv.id)}`
        );
      });
    },
    [router]
  );

  const buildCvSeedPerson = useCallback((): FilemakerCvProfileSeed['person'] | null => {
    if (person === null) return null;
    return {
      firstName: personDraft.firstName ?? person.firstName,
      lastName: personDraft.lastName ?? person.lastName,
      city: personDraft.city ?? person.city,
      country: personDraft.country ?? person.country,
      phoneNumbers: personDraft.phoneNumbers ?? person.phoneNumbers,
      linkedinUrl: personDraft.linkedinUrl ?? person.linkedinUrl ?? '',
      githubUrl: personDraft.githubUrl ?? person.githubUrl ?? '',
      languageSkills: personDraft.languageSkills ?? person.languageSkills ?? [],
      profileEducation: personDraft.profileEducation ?? person.profileEducation ?? [],
      profileJobExperience: personDraft.profileJobExperience ?? person.profileJobExperience ?? [],
      cvHeadline: personDraft.cvHeadline ?? person.cvHeadline ?? '',
      cvProfessionalSummary: personDraft.cvProfessionalSummary ?? person.cvProfessionalSummary ?? '',
      cvCoreStrengths: personDraft.cvCoreStrengths ?? person.cvCoreStrengths ?? [],
      cvSelectedTechnicalEnvironment:
        personDraft.cvSelectedTechnicalEnvironment ?? person.cvSelectedTechnicalEnvironment ?? [],
    };
  }, [person, personDraft]);

  const buildCvCreatePayloadFromProfile = useCallback((): CvCreatePayload => {
    if (person === null) throw new Error('Person is not loaded.');
    const seedPerson = buildCvSeedPerson();
    if (seedPerson === null) throw new Error('Person profile is not loaded.');
    const bodyBlocks = buildDefaultFilemakerCvBlocks({
      addresses: editableAddresses,
      anyTexts: linkedAnyTexts,
      contracts: linkedContracts,
      documents: linkedDocuments,
      emails,
      lexiconTerms: database.lexiconTerms,
      lexiconValidationPatterns: database.lexiconValidationPatterns,
      occupations: linkedOccupations,
      person: seedPerson,
      phoneNumbers,
      websites,
    });
    return {
      bodyBlocks,
      personId: person.id,
      title: `${personName} CV`,
    };
  }, [
    buildCvSeedPerson,
    database.lexiconTerms,
    database.lexiconValidationPatterns,
    editableAddresses,
    emails,
    linkedAnyTexts,
    linkedContracts,
    linkedDocuments,
    linkedOccupations,
    person,
    personName,
    phoneNumbers,
    websites,
  ]);

  const createCv = useCallback(async (input: CvCreatePayload): Promise<FilemakerCv> => {
    const response = await fetch('/api/filemaker/cvs', {
      method: 'POST',
      headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        bodyBlocks: input.bodyBlocks,
        personId: input.personId,
        title: input.title,
      }),
    });
    if (!response.ok) throw new Error(`Failed to create CV (${response.status}).`);
    const payload = (await response.json()) as { cv: FilemakerCv };
    setState((current: CvListState): CvListState => ({
      ...current,
      cvs: [
        payload.cv,
        ...current.cvs.filter((existing: FilemakerCv): boolean => existing.id !== payload.cv.id),
      ],
      error: null,
      isLoading: false,
    }));
    return payload.cv;
  }, []);

  const createCvFromProfile = useCallback(async (): Promise<FilemakerCv> => {
    return createCv(buildCvCreatePayloadFromProfile());
  }, [buildCvCreatePayloadFromProfile, createCv]);

  const handleCreateCv = useCallback(async (): Promise<void> => {
    setIsCreating(true);
    try {
      const cv = await createCvFromProfile();
      toast('CV created.', { variant: 'success' });
      openCv(cv);
    } catch (error: unknown) {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to create CV.', {
        variant: 'error',
      });
    } finally {
      setIsCreating(false);
    }
  }, [createCvFromProfile, openCv, toast]);

  const previewCvPdf = useCallback(
    (cv: Pick<FilemakerCv, 'bodyBlocks' | 'highlightTechnologyTerms'>): void => {
      openFilemakerCvPdfPreview(
        compileCvBlocksToHtml(cv.bodyBlocks, {
          highlightedTechnologyTerms: cv.highlightTechnologyTerms ?? [],
        })
      );
    },
    []
  );

  const exportCvPdf = useCallback(async (cv: FilemakerCv): Promise<void> => {
    const response = await fetch('/api/filemaker/cvs/export-pdf', {
      method: 'POST',
      headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ cvId: cv.id }),
    });
    if (!response.ok) throw new Error(`Failed to export CV (${response.status}).`);
    const filename = readDownloadFilename(response, `${formatCvTitle(cv)}.pdf`);
    downloadBlob(await response.blob(), filename);
  }, []);

  const handleExportPdf = useCallback(
    async (cv: FilemakerCv): Promise<void> => {
      setExportingCvId(cv.id);
      try {
        await exportCvPdf(cv);
        toast('CV PDF exported.', { variant: 'success' });
      } catch (error: unknown) {
        logClientError(error);
        toast(error instanceof Error ? error.message : 'Failed to export CV PDF.', {
          variant: 'error',
        });
      } finally {
        setExportingCvId(null);
      }
    },
    [exportCvPdf, toast]
  );

  const handleGeneratePdf = useCallback(async (): Promise<void> => {
    setIsGeneratingPdf(true);
    try {
      const payload = buildCvCreatePayloadFromProfile();
      previewCvPdf({ bodyBlocks: payload.bodyBlocks });
      await createCv(payload);
      toast('CV PDF preview opened.', { variant: 'success' });
    } catch (error: unknown) {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to generate CV PDF.', {
        variant: 'error',
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [buildCvCreatePayloadFromProfile, createCv, previewCvPdf, toast]);

  const handleGenerateAndExportPdf = useCallback(async (): Promise<void> => {
    setIsExportingGeneratedPdf(true);
    try {
      const payload = buildCvCreatePayloadFromProfile();
      const cv = await createCv(payload);
      await exportCvPdf(cv);
      toast('CV PDF exported.', { variant: 'success' });
    } catch (error: unknown) {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to export CV PDF.', {
        variant: 'error',
      });
    } finally {
      setIsExportingGeneratedPdf(false);
    }
  }, [buildCvCreatePayloadFromProfile, createCv, exportCvPdf, toast]);

  const handlePreviewPdf = useCallback(
    (cv: FilemakerCv): void => {
      try {
        previewCvPdf(cv);
      } catch (error: unknown) {
        logClientError(error);
        toast(error instanceof Error ? error.message : 'Failed to preview CV PDF.', {
          variant: 'error',
        });
      }
    },
    [previewCvPdf, toast]
  );

  const actions = (
    <div className='flex flex-wrap items-center gap-2'>
      <Button
        type='button'
        variant='default'
        size='sm'
        disabled={isCreating || isGeneratingPdf || isExportingGeneratedPdf || person === null}
        loading={isGeneratingPdf}
        loadingText='Generating...'
        onClick={() => {
          void handleGeneratePdf();
        }}
        className='gap-2'
      >
        {!isGeneratingPdf ? <Eye className='size-3.5' /> : null}
        Generate PDF CV
      </Button>
      <Button
        type='button'
        variant='outline'
        size='sm'
        disabled={isCreating || isGeneratingPdf || isExportingGeneratedPdf || person === null}
        loading={isExportingGeneratedPdf}
        loadingText='Exporting...'
        onClick={() => {
          void handleGenerateAndExportPdf();
        }}
        className='gap-2'
      >
        {!isExportingGeneratedPdf ? <Download className='size-3.5' /> : null}
        Export PDF CV
      </Button>
      <Button
        type='button'
        variant='outline'
        size='sm'
        disabled={isCreating || isGeneratingPdf || isExportingGeneratedPdf || person === null}
        loading={isCreating}
        loadingText='Creating...'
        onClick={() => {
          void handleCreateCv();
        }}
        className='gap-2'
      >
        {!isCreating ? <Plus className='size-3.5' /> : null}
        New CV
      </Button>
    </div>
  );

  let content: React.ReactNode;
  if (state.isLoading) {
    content = (
      <div className='flex items-center gap-2 text-xs text-gray-500'>
        <Loader2 className='size-3.5 animate-spin' />
        Loading CVs.
      </div>
    );
  } else if (state.error !== null) {
    content = <div className='text-xs text-red-300'>{state.error}</div>;
  } else if (state.cvs.length === 0) {
    content = <div className='text-xs text-gray-500'>No CVs linked yet.</div>;
  } else {
    content = (
      <div className='grid gap-2 sm:grid-cols-2'>
        {state.cvs.map((cv: FilemakerCv) => (
          <Card key={cv.id} variant='subtle-compact' className='bg-card/20'>
            <div className='flex items-start justify-between gap-3 p-3'>
              <div className='flex min-w-0 gap-2'>
                <FileText className='mt-0.5 size-3.5 shrink-0 text-emerald-300' />
                <div className='min-w-0'>
                  <div className='truncate text-sm font-semibold text-white'>
                    {formatCvTitle(cv)}
                  </div>
                  <div className='truncate text-[10px] text-gray-600'>
                    Updated: {formatTimestamp(cv.updatedAt)}
                  </div>
                  {cv.bodyBlocksEditable === false ||
                  (cv.tailoringScope !== null && cv.tailoringScope !== undefined) ? (
                    <div className='mt-1 truncate text-[10px] text-emerald-300/80'>
                      Scoped tailored CV
                      {cv.sourceCvTitle !== null &&
                      cv.sourceCvTitle !== undefined &&
                      cv.sourceCvTitle.trim().length > 0
                        ? ` based on ${cv.sourceCvTitle}`
                        : cv.sourceCvRecordId !== null &&
                            cv.sourceCvRecordId !== undefined &&
                            cv.sourceCvRecordId.trim().length > 0 &&
                            cv.sourceCvRecordId !== 'profile-fields-only'
                          ? ` based on ${cv.sourceCvRecordId}`
                          : ''}
                    </div>
                  ) : null}
                </div>
              </div>
              <div className='flex shrink-0 items-center gap-2'>
                {cv.bodyBlocksEditable === false ||
                (cv.tailoringScope !== null && cv.tailoringScope !== undefined) ? (
                  <Badge variant='secondary' className='h-5 text-[10px]'>
                    Tailored
                  </Badge>
                ) : null}
                {(cv.bodyBlocksEditable === false ||
                  (cv.tailoringScope !== null && cv.tailoringScope !== undefined)) &&
                cv.sourceCvRecordId !== null &&
                cv.sourceCvRecordId !== undefined &&
                cv.sourceCvRecordId !== 'profile-fields-only' &&
                cv.sourceCvRecordId !== cv.id ? (
                  <Button
                    type='button'
                    variant='outline'
                    size='icon'
                    className='size-7'
                    aria-label={`Open source CV for ${formatCvTitle(cv)}`}
                    title={`Open source CV for ${formatCvTitle(cv)}`}
                    onClick={() => {
                      const sourceCv = state.cvs.find(
                        (candidate: FilemakerCv): boolean => candidate.id === cv.sourceCvRecordId
                      );
                      if (sourceCv !== undefined) {
                        openCv(sourceCv);
                        return;
                      }
                      openCv({
                        ...cv,
                        id: cv.sourceCvRecordId ?? cv.id,
                        title: cv.sourceCvTitle ?? cv.sourceCvRecordId ?? cv.title,
                      });
                    }}
                  >
                    <FileText className='size-3.5' />
                  </Button>
                ) : null}
                <Badge variant='outline' className='h-5 text-[10px]'>
                  {cv.status}
                </Badge>
                <Button
                  type='button'
                  variant='outline'
                  size='icon'
                  className='size-7'
                  aria-label={`Preview ${formatCvTitle(cv)} PDF`}
                  title={`Preview ${formatCvTitle(cv)} PDF`}
                  onClick={() => {
                    handlePreviewPdf(cv);
                  }}
                >
                  <Eye className='size-3.5' />
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  size='icon'
                  className='size-7'
                  aria-label={`Export ${formatCvTitle(cv)} PDF`}
                  title={`Export ${formatCvTitle(cv)} PDF`}
                  disabled={exportingCvId === cv.id}
                  onClick={() => {
                    void handleExportPdf(cv);
                  }}
                >
                  {exportingCvId === cv.id ? (
                    <Loader2 className='size-3.5 animate-spin' />
                  ) : (
                    <Download className='size-3.5' />
                  )}
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  size='icon'
                  className='size-7'
                  aria-label={`Open ${formatCvTitle(cv)}`}
                  title={`Open ${formatCvTitle(cv)}`}
                  onClick={() => {
                    openCv(cv);
                  }}
                >
                  <ExternalLink className='size-3.5' />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <FormSection title='CVs' actions={actions} className='space-y-2 p-4'>
      {content}
    </FormSection>
  );
}
