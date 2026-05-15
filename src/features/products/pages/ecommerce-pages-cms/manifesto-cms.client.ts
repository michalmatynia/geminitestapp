'use client';

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

import { api } from '@/shared/lib/api-client';
import type { SingleQuery } from '@/shared/contracts/ui/queries';
import { createMutationV2, createSingleQueryV2 } from '@/shared/lib/query-factories-v2';
import { useToast } from '@/shared/ui/primitives.public';

export type ManifestoState = {
  backgroundImageUrl: string;
  body: string;
  cloudConfigured: boolean;
  cloudMirrored?: boolean;
  ctaHref: string;
  ctaLabel: string;
  eyebrow: string;
  quoteEmphasis: string;
  quotePrefix: string;
  quoteSuffix: string;
  updatedAt: string | null;
  updatedBy: string | null;
};

type ManifestoResponse = {
  ok: boolean;
  manifesto: ManifestoState;
};

type ManifestoBackgroundUploadResponse = {
  ok: boolean;
  image: {
    filename: string;
    localPublicPath: string;
    mimetype: string;
    remoteUrl: string;
    size: number;
  };
};

type ManifestoBackgroundImage = ManifestoBackgroundUploadResponse['image'];

export type ManifestoField = keyof Pick<
  ManifestoState,
  | 'backgroundImageUrl'
  | 'body'
  | 'ctaHref'
  | 'ctaLabel'
  | 'eyebrow'
  | 'quoteEmphasis'
  | 'quotePrefix'
  | 'quoteSuffix'
>;

export type ManifestoController = {
  backgroundFileInputRef: React.RefObject<HTMLInputElement | null>;
  error: string | null;
  handleBackgroundFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleRefreshClick: () => void;
  handleSaveClick: () => void;
  handleUploadBackgroundClick: () => void;
  isLoading: boolean;
  isSaving: boolean;
  isUploadingBackground: boolean;
  manifesto: ManifestoState | null;
  selectedBackgroundFile: File | null;
  updateField: (field: ManifestoField, value: string) => void;
};

const MANIFESTO_ENDPOINT = '/api/v2/products/pages/manifesto';
const MANIFESTO_BACKGROUND_ENDPOINT = '/api/v2/products/pages/manifesto/background';
const MANIFESTO_QUERY_KEY = ['products', 'ecommerce-pages-cms', 'manifesto'] as const;
const MANIFESTO_BACKGROUND_UPLOAD_MUTATION_KEY = [
  'products',
  'ecommerce-pages-cms',
  'manifesto',
  'background',
  'upload',
] as const;

const DEFAULT_MANIFESTO_STATE: ManifestoState = {
  backgroundImageUrl: '',
  body:
    'We source and curate officially licensed collectibles from the anime, gaming and film worlds — so every piece in your collection carries real meaning.',
  cloudConfigured: false,
  ctaHref: '/products',
  ctaLabel: 'Explore The Cache',
  eyebrow: 'The Collector\'s Creed',
  quoteEmphasis: 'a piece you can hold',
  quotePrefix: 'Every universe deserves',
  quoteSuffix: '.',
  updatedAt: null,
  updatedBy: null,
};

const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const fetchManifesto = async (): Promise<ManifestoState> => {
  const response = await api.get<ManifestoResponse>(MANIFESTO_ENDPOINT);
  return response.manifesto;
};

const saveManifesto = async (manifesto: ManifestoState): Promise<ManifestoState> => {
  const response = await api.put<ManifestoResponse>(
    MANIFESTO_ENDPOINT,
    { manifesto },
    { timeout: 120_000 }
  );
  return response.manifesto;
};

const uploadManifestoBackground = async (
  file: File
): Promise<ManifestoBackgroundImage> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post<ManifestoBackgroundUploadResponse>(
    MANIFESTO_BACKGROUND_ENDPOINT,
    formData,
    { timeout: 120_000 }
  );
  return response.image;
};

type ManifestoStateSetter = Dispatch<SetStateAction<ManifestoState | null>>;
type ErrorSetter = Dispatch<SetStateAction<string | null>>;

const useManifestoQuery = (): SingleQuery<ManifestoState> =>
  createSingleQueryV2({
    id: 'ecommerce-pages-manifesto',
    queryKey: MANIFESTO_QUERY_KEY,
    queryFn: fetchManifesto,
    meta: {
      source: 'products.ecommercePagesCms.manifesto.load',
      operation: 'detail',
      resource: 'products.ecommerce-pages-cms.manifesto',
      domain: 'products',
      description: 'Loads ecommerce CMS Collector Creed content.',
      tags: ['products', 'ecommerce', 'cms', 'manifesto'],
    },
  });

const useManifestoData = (): {
  error: string | null;
  isLoading: boolean;
  loadManifesto: () => Promise<void>;
  manifesto: ManifestoState | null;
  setError: ErrorSetter;
  setManifesto: ManifestoStateSetter;
} => {
  const [manifesto, setManifesto] = useState<ManifestoState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const manifestoQuery = useManifestoQuery();

  const loadManifesto = useCallback(async (): Promise<void> => {
    setError(null);
    await manifestoQuery.refetch();
  }, [manifestoQuery]);

  useEffect(() => {
    if (manifestoQuery.data === undefined) return;
    setManifesto(manifestoQuery.data);
  }, [manifestoQuery.data]);

  return {
    error: error ?? (manifestoQuery.error ? toErrorMessage(manifestoQuery.error) : null),
    isLoading: manifestoQuery.isLoading,
    loadManifesto,
    manifesto,
    setError,
    setManifesto,
  };
};

const useManifestoSaveAction = (input: {
  manifesto: ManifestoState | null;
  setError: ErrorSetter;
  setManifesto: ManifestoStateSetter;
}): Pick<ManifestoController, 'handleSaveClick' | 'isSaving'> => {
  const { toast } = useToast();
  const saveMutation = createMutationV2<ManifestoState, ManifestoState>({
    mutationKey: ['products', 'ecommerce-pages-cms', 'manifesto', 'save'],
    mutationFn: saveManifesto,
    onSuccess: (nextManifesto: ManifestoState): void => {
      input.setManifesto(nextManifesto);
      toast('Collector Creed saved and mirrored.', { variant: 'success' });
    },
    onError: (saveError: Error): void => {
      const message = toErrorMessage(saveError);
      input.setError(message);
      toast(message, { variant: 'error' });
    },
    invalidateKeys: [MANIFESTO_QUERY_KEY],
    meta: {
      source: 'products.ecommercePagesCms.manifesto.save',
      operation: 'update',
      resource: 'products.ecommerce-pages-cms.manifesto',
      domain: 'products',
      description: 'Saves and mirrors ecommerce CMS Collector Creed content.',
      errorPresentation: 'toast',
      tags: ['products', 'ecommerce', 'cms', 'manifesto'],
    },
  });

  const handleSaveClick = useCallback((): void => {
    input.setError(null);
    saveMutation.mutate(input.manifesto ?? DEFAULT_MANIFESTO_STATE);
  }, [input, saveMutation]);

  return { handleSaveClick, isSaving: saveMutation.isPending };
};

const useManifestoBackgroundUploadAction = (input: {
  resetBackgroundFileInput: () => void;
  selectedBackgroundFile: File | null;
  setError: ErrorSetter;
  setSelectedBackgroundFile: Dispatch<SetStateAction<File | null>>;
  updateField: ManifestoController['updateField'];
}): Pick<ManifestoController, 'handleUploadBackgroundClick' | 'isUploadingBackground'> => {
  const { toast } = useToast();
  const uploadMutation = createMutationV2<ManifestoBackgroundImage, File>({
    mutationKey: MANIFESTO_BACKGROUND_UPLOAD_MUTATION_KEY,
    mutationFn: uploadManifestoBackground,
    onSuccess: (image: ManifestoBackgroundImage): void => {
      input.updateField('backgroundImageUrl', image.remoteUrl);
      input.setSelectedBackgroundFile(null);
      input.resetBackgroundFileInput();
      toast('Background uploaded. Save Collector Creed to publish it.', { variant: 'success' });
    },
    onError: (uploadError: Error): void => {
      const message = toErrorMessage(uploadError);
      input.setError(message);
      toast(message, { variant: 'error' });
    },
    meta: {
      source: 'products.ecommercePagesCms.manifesto.background.upload',
      operation: 'update',
      resource: 'products.ecommerce-pages-cms.manifesto-background',
      domain: 'products',
      description: 'Uploads ecommerce CMS Collector Creed background media.',
      errorPresentation: 'toast',
      tags: ['products', 'ecommerce', 'cms', 'manifesto', 'background'],
    },
  });

  const handleUploadBackgroundClick = useCallback((): void => {
    if (input.selectedBackgroundFile === null) {
      input.setError('Choose a Collector Creed background image first.');
      return;
    }
    input.setError(null);
    uploadMutation.mutate(input.selectedBackgroundFile);
  }, [input, uploadMutation]);

  return { handleUploadBackgroundClick, isUploadingBackground: uploadMutation.isPending };
};

export const useManifestoController = (): ManifestoController => {
  const data = useManifestoData();
  const backgroundFileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedBackgroundFile, setSelectedBackgroundFile] = useState<File | null>(null);
  const resetBackgroundFileInput = useCallback((): void => {
    if (backgroundFileInputRef.current !== null) backgroundFileInputRef.current.value = '';
  }, []);

  const updateField = useCallback((field: ManifestoField, value: string): void => {
    data.setManifesto((current) => ({
      ...(current ?? DEFAULT_MANIFESTO_STATE),
      [field]: value,
    }));
  }, [data]);
  const saveAction = useManifestoSaveAction(data);
  const uploadAction = useManifestoBackgroundUploadAction({
    resetBackgroundFileInput,
    selectedBackgroundFile,
    setError: data.setError,
    setSelectedBackgroundFile,
    updateField,
  });

  return {
    backgroundFileInputRef,
    error: data.error,
    handleBackgroundFileChange: (event) =>
      setSelectedBackgroundFile(event.target.files?.[0] ?? null),
    handleRefreshClick: () => {
      data.loadManifesto().catch(() => undefined);
    },
    handleSaveClick: saveAction.handleSaveClick,
    handleUploadBackgroundClick: uploadAction.handleUploadBackgroundClick,
    isLoading: data.isLoading,
    isSaving: saveAction.isSaving,
    isUploadingBackground: uploadAction.isUploadingBackground,
    manifesto: data.manifesto ?? DEFAULT_MANIFESTO_STATE,
    selectedBackgroundFile,
    updateField,
  };
};
