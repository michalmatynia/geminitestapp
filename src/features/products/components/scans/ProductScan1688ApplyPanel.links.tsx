import { Button } from '@/shared/ui/button';
import { applyTextFieldValue } from './ProductScan1688ApplyPanel.actions';
import type { ProductScan1688ApplyModel } from './ProductScan1688ApplyPanel.types';

type ProductScan1688ApplySectionProps = {
  model: ProductScan1688ApplyModel;
};

export function ProductScan1688SupplierLinksSection(
  props: ProductScan1688ApplySectionProps
): React.JSX.Element | null {
  const { model } = props;
  if (model.blockActions || model.supplierLink === null) return null;

  const showStoreLink = model.supplierStoreLink !== null;
  const showProductLink = model.supplierProductLink !== null;
  const showSupplierFallback = model.supplierProductLink === null && model.supplierStoreLink !== null;
  return (
    <div className='flex flex-wrap items-start justify-between gap-3'>
      <ProductScan1688SupplierLinkSummary model={model} />
      <div className='flex flex-wrap gap-2'>
        {showProductLink ? <ProductScan1688ProductLinkButton model={model} /> : null}
        {showStoreLink && model.supplierStoreLink !== model.supplierProductLink ? (
          <ProductScan1688StoreLinkButton model={model} />
        ) : null}
        {showSupplierFallback ? <ProductScan1688SupplierLinkButton model={model} /> : null}
      </div>
    </div>
  );
}

function ProductScan1688SupplierLinkSummary(
  props: ProductScan1688ApplySectionProps
): React.JSX.Element {
  const { model } = props;
  return (
    <div className='min-w-0 space-y-1'>
      <p className='text-sm font-medium text-foreground'>Supplier links</p>
      <p className='text-xs text-muted-foreground'>Current: {model.currentSupplierLink ?? 'Not set'}</p>
      {model.supplierProductLink !== null ? (
        <p className='break-all text-xs text-muted-foreground'>
          Product page: {model.supplierProductLink}
        </p>
      ) : null}
      {model.supplierStoreLink !== null ? (
        <p className='break-all text-xs text-muted-foreground'>
          Store page: {model.supplierStoreLink}
        </p>
      ) : null}
    </div>
  );
}

function ProductScan1688ProductLinkButton(
  props: ProductScan1688ApplySectionProps
): React.JSX.Element {
  const { model } = props;
  return (
    <Button
      type='button'
      variant='outline'
      size='sm'
      disabled={model.actions.canApplySupplierProductLink === false}
      onClick={() => applyTextFieldValue(model, 'supplierLink', model.supplierProductLink)}
      className='h-7 px-2 text-xs'
    >
      Use Product Link
    </Button>
  );
}

function ProductScan1688StoreLinkButton(
  props: ProductScan1688ApplySectionProps
): React.JSX.Element {
  const { model } = props;
  return (
    <Button
      type='button'
      variant='outline'
      size='sm'
      disabled={model.actions.canApplySupplierStoreLink === false}
      onClick={() => applyTextFieldValue(model, 'supplierLink', model.supplierStoreLink)}
      className='h-7 px-2 text-xs'
    >
      Use Store Link
    </Button>
  );
}

function ProductScan1688SupplierLinkButton(
  props: ProductScan1688ApplySectionProps
): React.JSX.Element {
  const { model } = props;
  return (
    <Button
      type='button'
      variant='outline'
      size='sm'
      disabled={model.actions.canApplySupplierLink === false}
      onClick={() => applyTextFieldValue(model, 'supplierLink', model.supplierStoreLink)}
      className='h-7 px-2 text-xs'
    >
      Use Supplier Link
    </Button>
  );
}
