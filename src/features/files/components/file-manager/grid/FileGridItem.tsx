import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Badge, Button, Card } from '@/shared/ui/primitives.public';
import { type ExpandedImageFile } from '@/shared/contracts/products/drafts';
import { resolveFolder } from './FileGridUtils';

export const FileGridItem = ({
  file,
  isSelected,
  mode,
  onView,
  onDelete,
  onToggleSelect,
}: {
  file: ExpandedImageFile;
  isSelected: boolean;
  mode: 'view' | 'select';
  onView: (file: ExpandedImageFile) => void;
  onDelete: (id: string) => Promise<void>;
  onToggleSelect: (file: { id: string; filepath: string }) => void;
}): React.JSX.Element => (
  <Card
    className={cn(
      'relative border-2 transition-all cursor-pointer overflow-hidden',
      isSelected ? 'border-blue-500 bg-blue-500/5' : 'border-transparent hover:border-gray-700'
    )}
    onClick={() => (mode === 'select' ? onToggleSelect({ id: file.id, filepath: file.filepath }) : onView(file))}
  >
    <Badge variant='neutral' className='absolute left-2 top-2 bg-gray-900/80 text-[10px] font-bold uppercase tracking-wide z-10'>
      {resolveFolder(file.filepath)}
    </Badge>
    <div className='aspect-square relative w-full'>
      <Image src={file.filepath} alt={file.filename} fill className='object-cover' />
    </div>
    <div className='p-2'>
      <p className='text-center text-sm truncate font-medium' title={file.filename}>{file.filename}</p>
      {(file.tags ?? []).length > 0 && (
        <div className='mt-1 flex flex-wrap justify-center gap-1'>
          {(file.tags ?? []).slice(0, 3).map((tag: string) => (
            <Badge key={tag} variant='neutral' className='bg-card/70 text-[10px] font-normal'>#{tag}</Badge>
          ))}
        </div>
      )}
      <div className='mt-1 text-center text-xs text-gray-400'>
        {file.products.map(({ product }: { product: { id: string; name: string } }) => (
          <Link key={product.id} href={`/admin/products/${product.id}/edit`} className='hover:underline block truncate' onClick={(e) => e.stopPropagation()}>
            {product.name}
          </Link>
        ))}
      </div>
      <div className='mt-2 flex justify-center gap-2'>
        <Button variant='secondary' size='sm' className='h-7 px-2 text-[11px]' onClick={(e) => { e.stopPropagation(); onView(file); }}>View</Button>
        <Button variant='destructive' size='sm' className='h-7 px-2 text-[11px]' onClick={(e) => { e.stopPropagation(); void onDelete(file.id); }}>Delete</Button>
      </div>
    </div>
  </Card>
);

const cn = (...args: (string | undefined | null | false)[]) => args.filter(Boolean).join(' ');
