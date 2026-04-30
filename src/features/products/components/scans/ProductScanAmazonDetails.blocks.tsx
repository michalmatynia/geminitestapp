import { CopyButton } from '@/shared/ui/copy-button';
import { hasText, resolveDetailFields } from './ProductScanAmazonDetails.format';
import type { DetailField } from './ProductScanAmazonDetails.types';

export function FieldGroup(props: {
  fields: DetailField[];
  title: string;
}): React.JSX.Element | null {
  const fields = resolveDetailFields(props.fields);
  if (fields.length === 0) return null;

  return (
    <div className='space-y-2'>
      <h5 className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
        {props.title}
      </h5>
      <dl className='grid gap-2 sm:grid-cols-2'>
        {fields.map((field) => (
          <div
            key={`${props.title}-${field.label}`}
            className='rounded-md border border-border/50 bg-background/70 px-3 py-2'
          >
            <div className='flex items-start justify-between gap-2'>
              <dt className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
                {field.label}
              </dt>
              <CopyButton
                value={field.value}
                ariaLabel={`Copy ${field.label}`}
                size='sm'
                className='h-6 px-2 text-[11px]'
                showText
              />
            </div>
            <dd className='mt-1 text-sm'>{field.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function TextBlock(props: {
  title: string;
  value: string | null | undefined;
}): React.JSX.Element | null {
  if (hasText(props.value) === false) return null;

  const trimmedValue = props.value.trim();
  return (
    <div className='space-y-2'>
      <div className='flex items-center justify-between gap-2'>
        <h5 className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
          {props.title}
        </h5>
        <CopyButton
          value={trimmedValue}
          ariaLabel={`Copy ${props.title}`}
          size='sm'
          className='h-6 px-2 text-[11px]'
          showText
        />
      </div>
      <div className='rounded-md border border-border/50 bg-background/70 px-3 py-2'>
        <p className='whitespace-pre-wrap text-sm'>{trimmedValue}</p>
      </div>
    </div>
  );
}
