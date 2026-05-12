import { FormSection } from '@/shared/ui/forms-and-actions.public';
import { Badge } from '@/shared/ui/primitives.public';

type EnginePolicy = {
  provider: 'mongodb' | 'redis';
};

export function EngineStatusPanel({
  policy,
}: {
  policy: EnginePolicy;
}): React.JSX.Element {
  return (
    <FormSection title='Engine Status' className='p-4'>
      <div className='flex items-center gap-3'>
        <div className='text-sm text-gray-400'>Current active engine:</div>
        <Badge variant='outline' className='text-emerald-400'>{policy.provider}</Badge>
      </div>
    </FormSection>
  );
}
