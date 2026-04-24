import { Badge, Button } from '@/shared/ui/primitives.public';
import { Trash2 } from 'lucide-react';
import { formatSelectorRegistryRoleLabel } from '@/shared/lib/browser-execution/selector-registry-roles';

export function ProbeClusterView({ cluster, onPromote, onPromoteAndArchive, onReject, isReadOnly }: any) {
  return (
    <div className='space-y-4 rounded-lg border border-border bg-background/40 p-4'>
      <div className='flex items-center justify-between'>
        <div className='space-y-1'>
          <h3 className='text-sm font-semibold'>{cluster.label}</h3>
          <div className='flex gap-2'>
            <Badge variant='outline'>{cluster.sessionCount} sessions</Badge>
            {cluster.roleSignature.map((role: string) => (
              <Badge key={role} variant='secondary'>{formatSelectorRegistryRoleLabel(role) ?? role}</Badge>
            ))}
          </div>
        </div>
        <div className='flex gap-2'>
          <Button size='sm' variant='outline' onClick={onPromote} disabled={isReadOnly}>Promote Ready</Button>
          <Button size='sm' variant='outline' onClick={onPromoteAndArchive} disabled={isReadOnly}>Promote & Archive</Button>
          <Button size='sm' variant='ghost' onClick={onReject} className='text-rose-500'><Trash2 className='size-4' /></Button>
        </div>
      </div>
    </div>
  );
}
