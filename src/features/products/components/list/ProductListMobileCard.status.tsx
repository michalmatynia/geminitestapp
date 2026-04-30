'use client';

import type React from 'react';
import { Archive } from 'lucide-react';

import { Badge } from '@/shared/ui/badge';

import { ProductListActivityPill } from './ProductListActivityPill';
import { ProductListStatusIcons } from './ProductListStatusIcons';
import type { ProductListMobileCardViewProps } from './ProductListMobileCards.types';

type ProductListMobileCardStatusProps = Pick<
  ProductListMobileCardViewProps,
  'product' | 'rowRuntime' | 'model'
>;

type ProductListRuntimeFeedback = Pick<
  ProductListMobileCardStatusProps['rowRuntime'],
  'productAiRunFeedback' | 'productScanRunFeedback'
>;

type ProductListRuntimeWithOptionalFeedback = ProductListMobileCardStatusProps['rowRuntime'] & {
  productAiRunFeedback?: ProductListRuntimeFeedback['productAiRunFeedback'];
  productScanRunFeedback?: ProductListRuntimeFeedback['productScanRunFeedback'];
};

const resolveRuntimeFeedback = (
  rowRuntime: ProductListMobileCardStatusProps['rowRuntime']
): ProductListRuntimeFeedback => {
  const runtime = rowRuntime as ProductListRuntimeWithOptionalFeedback;

  return {
    productAiRunFeedback: runtime.productAiRunFeedback ?? null,
    productScanRunFeedback: runtime.productScanRunFeedback ?? null,
  };
};

function ArchivedBadge(): React.JSX.Element {
  return (
    <Badge variant='removed' icon={<Archive className='size-3' />}>
      Archived
    </Badge>
  );
}

function ProductListStatusIconSet({
  model,
}: Pick<ProductListMobileCardStatusProps, 'model'>): React.JSX.Element {
  return (
    <ProductListStatusIcons
      importSource={model.importSource}
      hasMarketplaceCopy={model.hasMarketplaceCopy}
      hasEnglishTitle={model.hasEnglishTitle}
      hasEnglishDescription={model.hasEnglishDescription}
      hasPolishTitle={model.hasPolishTitle}
      hasPolishDescription={model.hasPolishDescription}
    />
  );
}

function ProductListRunFeedbackPills({
  productAiRunFeedback,
  productScanRunFeedback,
}: ProductListRuntimeFeedback): React.JSX.Element {
  return (
    <>
      {productAiRunFeedback !== null ? (
        <ProductListActivityPill
          config={{
            kind: 'trigger-button',
            label: productAiRunFeedback.label,
            variant: productAiRunFeedback.variant,
            badgeClassName: productAiRunFeedback.badgeClassName,
            className: 'ml-0',
          }}
        />
      ) : null}
      {productScanRunFeedback !== null ? (
        <ProductListActivityPill
          config={{
            kind: 'scan',
            label: productScanRunFeedback.label,
            variant: productScanRunFeedback.variant,
            badgeClassName: productScanRunFeedback.badgeClassName,
            className: 'ml-0',
          }}
        />
      ) : null}
    </>
  );
}

export function ProductListMobileCardStatus({
  product,
  rowRuntime,
  model,
}: ProductListMobileCardStatusProps): React.JSX.Element | null {
  const runtimeFeedback = resolveRuntimeFeedback(rowRuntime);
  const hasRuntimeFeedback =
    runtimeFeedback.productAiRunFeedback !== null ||
    runtimeFeedback.productScanRunFeedback !== null;

  if (product.archived !== true && model.hasStatusIcons === false && hasRuntimeFeedback === false) {
    return null;
  }

  return (
    <div data-product-list-status-icons className='mt-1 flex flex-wrap items-center gap-2'>
      <ProductListStatusIconSet model={model} />
      {product.archived === true ? <ArchivedBadge /> : null}
      <ProductListRunFeedbackPills {...runtimeFeedback} />
    </div>
  );
}
