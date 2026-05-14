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

const LOGO_ENDPOINT = '/api/v2/products/pages/logo';
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
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewUrl = useLogoPreviewUrl(logo?.logoUrl ?? '', selectedFile);

  const loadLogo = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const nextLogo = await fetchLogo();
      setLogo(nextLogo);
      setLogoAlt(nextLogo.logoAlt);
    } catch (loadError: unknown) { setError(toErrorMessage(loadError)); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => {
    loadLogo().catch(() => undefined);
  }, [loadLogo]);

  const handleUploadClick = useCallback((): void => {
    if (selectedFile === null) { setError('Choose a logo file first.'); return; }
    setIsSaving(true);
    setError(null);
    uploadLogo(selectedFile, logoAlt)
      .then((nextLogo) => {
        setLogo(nextLogo); setLogoAlt(nextLogo.logoAlt); setSelectedFile(null);
        if (fileInputRef.current !== null) fileInputRef.current.value = '';
        toast('Logo saved and mirrored.', { variant: 'success' });
      })
      .catch((saveError: unknown) => {
        const message = toErrorMessage(saveError);
        setError(message);
        toast(message, { variant: 'error' });
      })
      .finally(() => setIsSaving(false));
  }, [logoAlt, selectedFile, toast]);

  return {
    error,
    fileInputRef,
    handleFileChange: (event) => setSelectedFile(event.target.files?.[0] ?? null),
    handleRefreshClick: () => {
      loadLogo().catch(() => undefined);
    },
    handleUploadClick,
    isLoading,
    isSaving,
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
