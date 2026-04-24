import { Button } from '@/shared/ui/primitives.public';

export function PreviewButtons({
  onPreview,
}: {
  onPreview: (variant: 'success' | 'error' | 'info') => void;
}) {
  return (
    <>
      <Button variant='outline' onClick={() => onPreview('success')} size='sm'>
        Preview Success
      </Button>
      <Button variant='outline' onClick={() => onPreview('info')} size='sm'>
        Preview Info
      </Button>
      <Button variant='outline' onClick={() => onPreview('error')} size='sm'>
        Preview Error
      </Button>
    </>
  );
}
