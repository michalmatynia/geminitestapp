import type { ProductScanModalConfig, ProductScanModalProvider } from './ProductScanModal.types';

export const PRODUCT_SCAN_MODAL_CONFIG: Record<ProductScanModalProvider, ProductScanModalConfig> = {
  amazon: {
    batchEndpoint: '/api/v2/products/scans/amazon/batch',
    batchFailureMessage: 'Failed to enqueue Amazon candidate searches.',
    batchLabel: 'Amazon candidate searches',
    modalTitle: 'Amazon Google Lens Candidate Search',
    noQueuedMessage: 'No Amazon candidate searches were queued.',
    openResultLabel: 'Open Amazon Result',
    preparingLabel: 'Preparing Amazon candidate searches...',
    refreshFailureMessage: 'Failed to refresh Amazon candidate searches.',
    resultStatusLabel: 'Amazon candidate search',
    resultTypeLabel: 'Amazon',
  },
  '1688': {
    batchEndpoint: '/api/v2/products/scans/1688/batch',
    batchFailureMessage: 'Failed to enqueue 1688 supplier scans.',
    batchLabel: '1688 scans',
    modalTitle: '1688 Supplier Reverse Image Scan',
    noQueuedMessage: 'No 1688 supplier scans were queued.',
    openResultLabel: 'Open 1688 Result',
    preparingLabel: 'Preparing 1688 supplier scans...',
    refreshFailureMessage: 'Failed to refresh 1688 supplier scans.',
    resultStatusLabel: '1688 supplier reverse image scan',
    resultTypeLabel: '1688',
  },
};

export const CUSTOM_AMAZON_IMAGE_SEARCH_PAGE_VALUE = '__custom__';

export const AMAZON_IMAGE_SEARCH_PAGE_OPTIONS = [
  { value: '', label: 'Built-in Google Lens direct upload' },
  { value: 'https://lens.google.com/?hl=en', label: 'Google Lens direct upload' },
  { value: 'https://images.google.com/?hl=en', label: 'Google Images legacy page' },
  { value: 'https://www.google.com/imghp?hl=en', label: 'Google Images homepage' },
  { value: CUSTOM_AMAZON_IMAGE_SEARCH_PAGE_VALUE, label: 'Custom URL' },
] as const;
