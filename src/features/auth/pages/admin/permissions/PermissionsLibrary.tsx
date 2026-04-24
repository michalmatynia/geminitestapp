import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button } from '@/shared/ui/primitives.public';
import { insetPanelVariants } from '@/shared/ui/navigation-and-layout.public';
import type { AuthPermission } from '@/features/auth/utils/auth-management';

export function PermissionsLibrary({
  permissions,
  onRemove,
}: {
  permissions: AuthPermission[];
  onRemove: (id: string) => void;
}) {
  return (
    <Card className='bg-card border-border'>
      <CardHeader>
        <CardTitle className='text-white text-lg'>Permissions Library</CardTitle>
        <CardDescription className='text-gray-500'>Create and manage permission keys.</CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='space-y-3'>
          {permissions.map((p) => (
            <div key={p.id} className={`${insetPanelVariants({ radius: 'compact', padding: 'sm' })} border-border`}>
              <div className='flex items-start justify-between gap-3'>
                <div>
                  <div className='text-sm font-semibold text-white'>{p.name}</div>
                  <div className='text-xs text-gray-400'>{p.id}</div>
                  {p.description && <div className='text-xs text-gray-500 mt-1'>{p.description}</div>}
                </div>
                <Button variant='ghost' size='sm' onClick={() => onRemove(p.id)} className='text-xs text-red-200'>Remove</Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
