import { Button } from '@/shared/ui/button';
import {
  applyAllSupplierData,
  applyTextFieldValue,
} from './ProductScan1688ApplyPanel.actions';
import { ProductScan1688ImageUrlsSection } from './ProductScan1688ApplyPanel.images';
import { ProductScan1688SupplierLinksSection } from './ProductScan1688ApplyPanel.links';
import { ProductScan1688PriceCommentSection } from './ProductScan1688ApplyPanel.price';
import type { ProductScan1688ApplyModel } from './ProductScan1688ApplyPanel.types';

type ProductScan1688ApplyPanelViewProps = {
  model: ProductScan1688ApplyModel;
};

export function ProductScan1688ApplyPanelView(
  props: ProductScan1688ApplyPanelViewProps
): React.JSX.Element {
  const { model } = props;
  return (
    <div className='space-y-2 rounded-md border border-border/50 bg-background/70 px-3 py-3'>
      <ProductScan1688ApplyHeader model={model} />
      <ProductScan1688EvaluationBanner model={model} />
      <ProductScan1688SupplierNameSection model={model} />
      <ProductScan1688SupplierLinksSection model={model} />
      <ProductScan1688PriceCommentSection model={model} />
      <ProductScan1688ImageUrlsSection model={model} />
    </div>
  );
}

function ProductScan1688ApplyHeader(props: ProductScan1688ApplyPanelViewProps): React.JSX.Element {
  const { model } = props;
  return (
    <div className='flex flex-wrap items-center justify-between gap-2'>
      <div className='space-y-1'>
        <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
          Apply to product form
        </p>
        <p className='text-xs text-muted-foreground'>
          {model.blockActions
            ? 'Apply actions blocked by AI rejection'
            : `${model.pendingActionCount} pending supplier update${model.pendingActionCount === 1 ? '' : 's'}`}
        </p>
      </div>
      {model.blockActions === false ? (
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={() => applyAllSupplierData(model)}
          className='h-7 px-2 text-xs'
        >
          Apply All Supplier Data
        </Button>
      ) : null}
    </div>
  );
}

function ProductScan1688EvaluationBanner(
  props: ProductScan1688ApplyPanelViewProps
): React.JSX.Element | null {
  const { evaluationBanner } = props.model;
  if (evaluationBanner === null) return null;

  return (
    <div className={`rounded-md border px-3 py-2 text-sm ${resolveBannerClassName(evaluationBanner.tone)}`}>
      <p className='font-medium'>{evaluationBanner.label}</p>
      <p className='mt-1 text-xs'>{evaluationBanner.detail}</p>
    </div>
  );
}

const resolveBannerClassName = (tone: 'destructive' | 'warning'): string => {
  if (tone === 'destructive') return 'border-destructive/40 bg-destructive/5 text-destructive';
  return 'border-amber-500/40 bg-amber-500/5 text-amber-200';
};

function ProductScan1688SupplierNameSection(
  props: ProductScan1688ApplyPanelViewProps
): React.JSX.Element | null {
  const { model } = props;
  if (model.blockActions || model.supplierName === null) return null;

  return (
    <div className='flex flex-wrap items-start justify-between gap-3'>
      <div className='min-w-0 space-y-1'>
        <p className='text-sm font-medium text-foreground'>Supplier name</p>
        <p className='text-xs text-muted-foreground'>Current: {model.currentSupplierName ?? 'Not set'}</p>
        <p className='text-xs text-muted-foreground'>1688: {model.supplierName}</p>
      </div>
      <Button
        type='button'
        variant='outline'
        size='sm'
        disabled={model.actions.canApplySupplierName === false}
        onClick={() => applyTextFieldValue(model, 'supplierName', model.supplierName)}
        className='h-7 px-2 text-xs'
      >
        Use Supplier Name
      </Button>
    </div>
  );
}
