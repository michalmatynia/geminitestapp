import { Button } from '@/shared/ui/primitives.public';
import { SaveIcon } from 'lucide-react';

export function SaveSelectionButton({
  isDirty,
  isPending,
  onClick,
}: {
  isDirty: boolean;
  isPending: boolean;
  onClick: () => void;
}): React.ReactNode {
  let buttonLabel = 'Saved';
  if (isPending) {
    buttonLabel = 'Saving...';
  } else if (isDirty) {
    buttonLabel = 'Save Selection';
  }
  const showSaveIcon = !isPending && isDirty;

  return (
    <Button
      onClick={onClick}
      disabled={isPending || !isDirty}
      variant='solid'
      className='min-w-[140px]'
    >
      {showSaveIcon ? <SaveIcon className='mr-2 size-4' /> : null}
      {buttonLabel}
    </Button>
  );
}
