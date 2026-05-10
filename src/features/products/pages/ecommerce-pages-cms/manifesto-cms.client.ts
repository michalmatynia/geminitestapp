'use client';

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

import { api } from '@/shared/lib/api-client';
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
): Promise<ManifestoBackgroundUploadResponse['image']> => {
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

const useManifestoData = (): {
  error: string | null;
  isLoading: boolean;
  loadManifesto: () => Promise<void>;
  manifesto: ManifestoState | null;
  setError: ErrorSetter;
  setManifesto: ManifestoStateSetter;
} => {
  const [manifesto, setManifesto] = useState<ManifestoState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadManifesto = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      setManifesto(await fetchManifesto());
    } catch (loadError: unknown) {
      setError(toErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadManifesto().catch(() => undefined);
  }, [loadManifesto]);

  return { error, isLoading, loadManifesto, manifesto, setError, setManifesto };
};

const useManifestoSaveAction = (input: {
  manifesto: ManifestoState | null;
  setError: ErrorSetter;
  setManifesto: ManifestoStateSetter;
}): Pick<ManifestoController, 'handleSaveClick' | 'isSaving'> => {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveClick = useCallback((): void => {
    setIsSaving(true);
    input.setError(null);
    saveManifesto(input.manifesto ?? DEFAULT_MANIFESTO_STATE)
      .then((nextManifesto) => {
        input.setManifesto(nextManifesto);
        toast('Collector Creed saved and mirrored.', { variant: 'success' });
      })
      .catch((saveError: unknown) => {
        const message = toErrorMessage(saveError);
        input.setError(message);
        toast(message, { variant: 'error' });
      })
      .finally(() => setIsSaving(false));
  }, [input, toast]);

  return { handleSaveClick, isSaving };
};

const useManifestoBackgroundUploadAction = (input: {
  backgroundFileInputRef: React.RefObject<HTMLInputElement | null>;
  selectedBackgroundFile: File | null;
  setError: ErrorSetter;
  setSelectedBackgroundFile: Dispatch<SetStateAction<File | null>>;
  updateField: ManifestoController['updateField'];
}): Pick<ManifestoController, 'handleUploadBackgroundClick' | 'isUploadingBackground'> => {
  const { toast } = useToast();
  const [isUploadingBackground, setIsUploadingBackground] = useState(false);

  const handleUploadBackgroundClick = useCallback((): void => {
    if (input.selectedBackgroundFile === null) {
      input.setError('Choose a Collector Creed background image first.');
      return;
    }
    setIsUploadingBackground(true);
    input.setError(null);
    uploadManifestoBackground(input.selectedBackgroundFile)
      .then((image) => {
        input.updateField('backgroundImageUrl', image.remoteUrl);
        input.setSelectedBackgroundFile(null);
        const fileInput = input.backgroundFileInputRef.current;
        if (fileInput !== null) {
          fileInput.value = '';
        }
        toast('Background uploaded. Save Collector Creed to publish it.', { variant: 'success' });
      })
      .catch((uploadError: unknown) => {
        const message = toErrorMessage(uploadError);
        input.setError(message);
        toast(message, { variant: 'error' });
      })
      .finally(() => setIsUploadingBackground(false));
  }, [input, toast]);

  return { handleUploadBackgroundClick, isUploadingBackground };
};

export const useManifestoController = (): ManifestoController => {
  const data = useManifestoData();
  const backgroundFileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedBackgroundFile, setSelectedBackgroundFile] = useState<File | null>(null);

  const updateField = useCallback((field: ManifestoField, value: string): void => {
    data.setManifesto((current) => ({
      ...(current ?? DEFAULT_MANIFESTO_STATE),
      [field]: value,
    }));
  }, [data]);
  const saveAction = useManifestoSaveAction(data);
  const uploadAction = useManifestoBackgroundUploadAction({
    backgroundFileInputRef,
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
