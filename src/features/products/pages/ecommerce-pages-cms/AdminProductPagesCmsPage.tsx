'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ImageIcon } from 'lucide-react';

import { BackgroundSettingsCard } from './BackgroundSettingsCard';
import { CollectionCardsEditorCard } from './CollectionCardsEditorCard';
import { EcommerceDataSyncPanel } from './EcommerceDataSyncPanel';
import { EcommerceDiscountCouponsPanel } from './EcommerceDiscountCouponsPanel';
import { EcommerceProviderSettingsPanel } from './EcommerceProviderSettingsPanel';
import { EditorialArticlesEditorCard } from './EditorialArticlesEditorCard';
import { LogoPreviewCard, LogoUploadCard, type LogoController } from './LogoCmsCards';
import { ManifestoCmsCard } from './ManifestoCmsCard';
import { useBackgroundSettingsController } from './background-cms.client';
import { useCollectionCardsController } from './collection-cards-cms.client';
import { useEditorialArticlesController } from './editorial-articles-cms.client';
import { useManifestoController } from './manifesto-cms.client';
import { api } from '@/shared/lib/api-client';
import type { MutationResult, SingleQuery } from '@/shared/contracts/ui/queries';
import { useMutationV2, useSingleQueryV2 } from '@/shared/lib/query-factories-v2';
import { AdminProductsPageLayout } from '@/shared/ui/admin-products-page-layout';
import { useToast } from '@/shared/ui/primitives.public';

type LogoState = {
  logoUrl: string;
  logoAlt: string;
  updatedAt: string | null;
  updatedBy: string | null;
  cloudConfigured: boolean;
  cloudMirrored?: boolean;
  localPublicPath?: string;
  remoteUrl?: string;
};

type LogoResponse = {
  ok: boolean;
  logo: LogoState;
};

type LogoUploadVariables = {
  file: File;
  logoAlt: string;
};

type LogoUploadMutationOptions = {
  resetFileInput: () => void;
  setError: (error: string | null) => void;
  setLogo: (logo: LogoState | null) => void;
  setLogoAlt: (logoAlt: string) => void;
  setSelectedFile: (file: File | null) => void;
  toast: ReturnType<typeof useToast>['toast'];
};

const LOGO_ENDPOINT = '/api/v2/products/pages/logo';
const LOGO_QUERY_KEY = ['products', 'ecommerce-pages-cms', 'logo'] as const;
const ECOMMERCE_PAGE_TABS = [
  { label: 'CMS Content', value: 'content' },
  { label: 'Discount Coupons', value: 'discount-coupons' },
  { label: 'Provider Settings', value: 'provider-settings' },
  { label: 'Data Synchronisation', value: 'data-sync' },
] as const;

type EcommercePageTab = (typeof ECOMMERCE_PAGE_TABS)[number]['value'];

const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const getPageTitle = (activeTab: EcommercePageTab): string => {
  if (activeTab === 'data-sync') return 'Data Synchronisation';
  if (activeTab === 'discount-coupons') return 'Discount Coupons';
  if (activeTab === 'provider-settings') return 'Provider Settings';
  return 'Pages';
};

const getPageDescription = (activeTab: EcommercePageTab): string => {
  if (activeTab === 'data-sync') return 'Push Products source data into ecommerce databases.';
  if (activeTab === 'discount-coupons') return 'Manage ecommerce discount coupons for checkout.';
  if (activeTab === 'provider-settings') return 'Configure ecommerce payment and shipping providers.';
  return 'Manage ecommerce storefront CMS content from Products.';
};

const fetchLogo = async (): Promise<LogoState> => {
  const response = await api.get<LogoResponse>(LOGO_ENDPOINT);
  return response.logo;
};

const uploadLogo = async (file: File, logoAlt: string): Promise<LogoState> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('alt', logoAlt);
  const response = await api.post<LogoResponse>(LOGO_ENDPOINT, formData, { timeout: 120_000 });
  return response.logo;
};

const useLogoCmsQuery = (): SingleQuery<LogoState> =>
  useSingleQueryV2({
    id: 'ecommerce-pages-logo',
    queryKey: LOGO_QUERY_KEY,
    queryFn: fetchLogo,
    meta: {
      source: 'products.ecommercePagesCms.logo.load',
      operation: 'detail',
      resource: 'products.ecommerce-pages-cms.logo',
      domain: 'products',
      description: 'Loads ecommerce CMS logo settings.',
      tags: ['products', 'ecommerce', 'cms', 'logo'],
    },
  });

const useLogoUploadMutation = ({
  resetFileInput,
  setError,
  setLogo,
  setLogoAlt,
  setSelectedFile,
  toast,
}: LogoUploadMutationOptions): MutationResult<LogoState, LogoUploadVariables> =>
  useMutationV2<LogoState, LogoUploadVariables>({
    mutationKey: ['products', 'ecommerce-pages-cms', 'logo', 'upload'],
    mutationFn: ({ file, logoAlt }: LogoUploadVariables): Promise<LogoState> =>
      uploadLogo(file, logoAlt),
    onSuccess: (nextLogo: LogoState): void => {
      setLogo(nextLogo);
      setLogoAlt(nextLogo.logoAlt);
      setSelectedFile(null);
      resetFileInput();
      toast('Logo saved and mirrored.', { variant: 'success' });
    },
    onError: (saveError: Error): void => {
      const message = toErrorMessage(saveError);
      setError(message);
      toast(message, { variant: 'error' });
    },
    invalidateKeys: [LOGO_QUERY_KEY],
    meta: {
      source: 'products.ecommercePagesCms.logo.upload',
      operation: 'update',
      resource: 'products.ecommerce-pages-cms.logo',
      domain: 'products',
      description: 'Uploads and mirrors ecommerce CMS logo settings.',
      errorPresentation: 'toast',
      tags: ['products', 'ecommerce', 'cms', 'logo', 'upload'],
    },
  });

const useLogoPreviewUrl = (logoUrl: string, selectedFile: File | null): string => {
  const previewUrl = useMemo(() => {
    if (selectedFile === null) return logoUrl;
    return URL.createObjectURL(selectedFile);
  }, [logoUrl, selectedFile]);

  useEffect(() => {
    return () => {
      if (previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  return previewUrl;
};

const usePagesCmsLogoController = (): LogoController => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [logo, setLogo] = useState<LogoState | null>(null);
  const [logoAlt, setLogoAlt] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const logoQuery = useLogoCmsQuery();
  const resetFileInput = useCallback((): void => {
    if (fileInputRef.current !== null) fileInputRef.current.value = '';
  }, []);
  const uploadMutation = useLogoUploadMutation({
    resetFileInput,
    setError,
    setLogo,
    setLogoAlt,
    setSelectedFile,
    toast,
  });
  const previewUrl = useLogoPreviewUrl(logo?.logoUrl ?? '', selectedFile);

  useEffect(() => {
    if (logoQuery.data === undefined) return;
    setLogo(logoQuery.data);
    setLogoAlt(logoQuery.data.logoAlt);
  }, [logoQuery.data]);

  const handleUploadClick = useCallback((): void => {
    if (selectedFile === null) { setError('Choose a logo file first.'); return; }
    setError(null);
    uploadMutation.mutate({ file: selectedFile, logoAlt });
  }, [logoAlt, selectedFile, uploadMutation]);

  return {
    error: error ?? (logoQuery.error ? toErrorMessage(logoQuery.error) : null),
    fileInputRef,
    handleFileChange: (event) => setSelectedFile(event.target.files?.[0] ?? null),
    handleRefreshClick: () => {
      setError(null);
      void logoQuery.refetch();
    },
    handleUploadClick,
    isLoading: logoQuery.isLoading,
    isSaving: uploadMutation.isPending,
    logo,
    logoAlt,
    previewUrl,
    selectedFile,
    setLogoAlt,
  };
};

export function AdminProductPagesCmsPage(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<EcommercePageTab>('content');
  const logoController = usePagesCmsLogoController();
  const backgroundController = useBackgroundSettingsController();
  const manifestoController = useManifestoController();
  const collectionCardsController = useCollectionCardsController();
  const editorialArticlesController = useEditorialArticlesController();
  const handleTabChange = useCallback((value: string): void => {
    if (
      value === 'content' ||
      value === 'discount-coupons' ||
      value === 'provider-settings' ||
      value === 'data-sync'
    ) {
      setActiveTab(value);
    }
  }, []);

  return (
    <AdminProductsPageLayout
      title={getPageTitle(activeTab)}
      current='Pages'
      description={getPageDescription(activeTab)}
      icon={<ImageIcon className='size-4' />}
      tabs={{
        activeTab,
        onTabChange: handleTabChange,
        tabsList: [...ECOMMERCE_PAGE_TABS],
      }}
    >
      {activeTab === 'data-sync' && <EcommerceDataSyncPanel />}
      {activeTab === 'discount-coupons' && <EcommerceDiscountCouponsPanel />}
      {activeTab === 'provider-settings' && <EcommerceProviderSettingsPanel />}
      {activeTab === 'content' && (
        <PagesCmsContentTab
          backgroundController={backgroundController}
          collectionCardsController={collectionCardsController}
          editorialArticlesController={editorialArticlesController}
          logoController={logoController}
          manifestoController={manifestoController}
        />
      )}
    </AdminProductsPageLayout>
  );
}

export default AdminProductPagesCmsPage;

function PagesCmsContentTab({
  backgroundController,
  collectionCardsController,
  editorialArticlesController,
  logoController,
  manifestoController,
}: {
  backgroundController: ReturnType<typeof useBackgroundSettingsController>;
  collectionCardsController: ReturnType<typeof useCollectionCardsController>;
  editorialArticlesController: ReturnType<typeof useEditorialArticlesController>;
  logoController: LogoController;
  manifestoController: ReturnType<typeof useManifestoController>;
}): React.JSX.Element {
  return (
    <div className='space-y-4'>
      <div className='grid gap-4 xl:grid-cols-[minmax(0,28rem)_minmax(0,1fr)]'>
        <LogoUploadCard controller={logoController} />
        <LogoPreviewCard controller={logoController} />
      </div>
      <BackgroundSettingsCard controller={backgroundController} />
      <ManifestoCmsCard controller={manifestoController} />
      <CollectionCardsEditorCard controller={collectionCardsController} />
      <EditorialArticlesEditorCard controller={editorialArticlesController} />
    </div>
  );
}
