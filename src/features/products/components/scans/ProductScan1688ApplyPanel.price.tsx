import { Button } from '@/shared/ui/button';
import { applyTextFieldValue } from './ProductScan1688ApplyPanel.actions';
import type { ProductScan1688ApplyModel } from './ProductScan1688ApplyPanel.types';

type ProductScan1688ApplySectionProps = {
  model: ProductScan1688ApplyModel;
};

export function ProductScan1688PriceCommentSection(
  props: ProductScan1688ApplySectionProps
): React.JSX.Element | null {
  const { model } = props;
  if (model.blockActions || hasPriceContent(model) === false) return null;

  return (
    <div className='flex flex-wrap items-start justify-between gap-3'>
      <ProductScan1688PriceCommentSummary model={model} />
      <ProductScan1688PriceCommentActions model={model} />
    </div>
  );
}

const hasPriceContent = (model: ProductScan1688ApplyModel): boolean =>
  model.priceComment !== null || model.supplierPriceTiers.length > 0;

function ProductScan1688PriceCommentSummary(
  props: ProductScan1688ApplySectionProps
): React.JSX.Element {
  const { model } = props;
  return (
    <div className='min-w-0 space-y-1'>
      <p className='text-sm font-medium text-foreground'>Price comment</p>
      <p className='text-xs text-muted-foreground'>Current: {model.currentPriceComment ?? 'Not set'}</p>
      {model.priceComment !== null ? (
        <p className='text-xs text-muted-foreground'>Summary: {model.priceComment}</p>
      ) : null}
      <ProductScan1688PriceTierList tiers={model.supplierPriceTiers} />
    </div>
  );
}

function ProductScan1688PriceTierList(props: { tiers: string[] }): React.JSX.Element | null {
  if (props.tiers.length === 0) return null;
  return (
    <div className='space-y-1 pt-1'>
      <p className='text-xs text-muted-foreground'>Extracted price tiers:</p>
      <ul className='space-y-1 text-xs text-muted-foreground'>
        {props.tiers.slice(0, 4).map((tierValue, index) => (
          <li key={`${tierValue}-${index}`} className='flex flex-wrap items-center gap-2'>
            <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5'>
              Tier {index + 1}
            </span>
            <span>{tierValue}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProductScan1688PriceCommentActions(
  props: ProductScan1688ApplySectionProps
): React.JSX.Element {
  const { model } = props;
  return (
    <div className='flex flex-wrap gap-2'>
      {model.priceComment !== null ? <ProductScan1688PriceSummaryButton model={model} /> : null}
      {model.detailedPriceComment !== null ? <ProductScan1688FullPriceButton model={model} /> : null}
      {model.supplierPriceTiers.slice(0, 4).map((tierValue, index) => (
        <ProductScan1688PriceTierButton
          key={`${tierValue}-${index}`}
          index={index}
          model={model}
          tierValue={tierValue}
        />
      ))}
    </div>
  );
}

function ProductScan1688PriceSummaryButton(
  props: ProductScan1688ApplySectionProps
): React.JSX.Element {
  const { model } = props;
  return (
    <Button
      type='button'
      variant='outline'
      size='sm'
      disabled={model.actions.canApplyPriceComment === false}
      onClick={() => applyTextFieldValue(model, 'priceComment', model.priceComment)}
      className='h-7 px-2 text-xs'
    >
      Use Price Summary
    </Button>
  );
}

function ProductScan1688FullPriceButton(
  props: ProductScan1688ApplySectionProps
): React.JSX.Element {
  const { model } = props;
  return (
    <Button
      type='button'
      variant='outline'
      size='sm'
      disabled={model.actions.canApplyDetailedPriceComment === false}
      onClick={() => applyTextFieldValue(model, 'priceComment', model.detailedPriceComment)}
      className='h-7 px-2 text-xs'
    >
      Use Full Price Breakdown
    </Button>
  );
}

function ProductScan1688PriceTierButton(props: {
  index: number;
  model: ProductScan1688ApplyModel;
  tierValue: string;
}): React.JSX.Element {
  const { index, model, tierValue } = props;
  return (
    <Button
      type='button'
      variant='outline'
      size='sm'
      disabled={tierValue === model.currentPriceComment}
      onClick={() => applyTextFieldValue(model, 'priceComment', tierValue)}
      className='h-7 px-2 text-xs'
    >
      Use Tier {index + 1}
    </Button>
  );
}
