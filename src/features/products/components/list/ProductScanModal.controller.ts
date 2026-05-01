'use client';

import { useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/shared/ui/toast';

import { useProductScan1688SessionRefresh } from './ProductScanModal.1688-session';
import { useProductScanModalActions } from './ProductScanModal.actions';
import { PRODUCT_SCAN_MODAL_CONFIG } from './ProductScanModal.constants';
import { useProductScanModalData } from './ProductScanModal.data';
import { useProductScanModalLifecycle } from './ProductScanModal.lifecycle';
import { useAmazonSelectorProfileOptions } from './ProductScanModal.options';
import { useProductScanModalRefs } from './ProductScanModal.refs';
import { useProductScanModalRowRefs } from './ProductScanModal.row-sync';
import { useProductScanModalState } from './ProductScanModal.state';
import type { ProductScanModalProps } from './ProductScanModal.types';
import type { ProductScanModalViewProps } from './ProductScanModal.view';

type ProductScanModalController = ProductScanModalViewProps & Record<string, unknown>;

export const useProductScanModalController = (
  props: ProductScanModalProps
): ProductScanModalController => {
  const { productIds, products } = props;
  const provider = props.provider ?? 'amazon';
  const modalConfig = PRODUCT_SCAN_MODAL_CONFIG[provider];
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const refs = useProductScanModalRefs(toast);
  const state = useProductScanModalState();
  const session = useProductScan1688SessionRefresh({ queryClient, toast });
  const data = useProductScanModalData({
    amazonSelectorProfile: state.amazonSelectorProfile,
    productIds,
    products,
    provider,
    refreshed1688ConnectionIds: session.refreshed1688ConnectionIds,
  });
  const context = {
    ...props,
    ...refs,
    ...state,
    ...session,
    ...data,
    missingBatchResultMessage: `${modalConfig.resultTypeLabel} scan request did not return a result for this product.`,
    missingScanRecordMessage: `${modalConfig.resultTypeLabel} scan record could not be refreshed.`,
    modalConfig,
    provider,
    queryClient,
    toast,
    untrackableActiveScanMessage: `${modalConfig.resultTypeLabel} scan request returned an active scan without a trackable scan id.`,
  };
  useProductScanModalRowRefs(context);
  const actions = useProductScanModalActions(context);
  useProductScanModalLifecycle({ ...context, ...actions });
  const amazonSelectorProfileOptions = useAmazonSelectorProfileOptions(
    state.amazonSelectorProfile,
    data.amazonSelectorRegistryQuery.data?.profiles
  );

  return {
    ...props,
    ...state,
    ...session,
    ...data,
    ...actions,
    amazonSelectorProfileOptions,
    formBindings: data.productFormBindings,
    modalConfig,
    provider,
    supplierFormBindings: data.productSupplier1688FormBindings,
  };
};
