import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Input, Label, Checkbox } from '@/shared/ui/primitives.public';
import { FormField } from '@/shared/ui/forms-and-actions.public';
import type { AuthRole, AuthPermission } from '@/features/auth/utils/auth-management';

export function RoleEditor({
  roles,
  permissions,
  onRemove,
  onFieldChange,
  onTogglePermission,
}: {
  roles: AuthRole[];
  permissions: AuthPermission[];
  onRemove: (id: string) => void;
  onFieldChange: (roleId: string, field: 'name' | 'description' | 'level', val: string) => void;
  onTogglePermission: (roleId: string, pId: string) => void;
}): React.JSX.Element {
  return (
    <Card className='bg-card border-border'>
      <CardHeader>
        <CardTitle className='text-white text-lg'>Roles</CardTitle>
        <CardDescription className='text-gray-500'>Assign permission bundles.</CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        {roles.map((role) => (
          <div key={role.id} className='rounded-md border border-border bg-card/40 p-4 space-y-3'>
            <div className='flex items-start justify-between gap-3'>
              <div className='space-y-3 flex-1'>
                <FormField label='Name'><Input value={role.name} onChange={(e) => onFieldChange(role.id, 'name', e.target.value)} size='sm' /></FormField>
                <FormField label='Description'><Input value={role.description ?? ''} onChange={(e) => onFieldChange(role.id, 'description', e.target.value)} size='sm' /></FormField>
                <FormField label='Level'><Input type='number' value={role.level ?? 0} onChange={(e) => onFieldChange(role.id, 'level', e.target.value)} size='sm' /></FormField>
              </div>
              <Button variant='ghost' size='xs' onClick={() => onRemove(role.id)} className='text-red-400'>Remove</Button>
            </div>
            <div className='grid gap-2 sm:grid-cols-2 pt-2 border-t border-border/20'>
              {permissions.map((p) => (
                <Label key={p.id} className='flex items-start gap-2 text-xs text-gray-300'>
                  <Checkbox checked={role.permissions.includes(p.id)} onCheckedChange={() => onTogglePermission(role.id, p.id)} />
                  <div className='flex flex-col'><span className='font-semibold'>{p.name}</span><span className='text-[10px] text-gray-500'>{p.id}</span></div>
                </Label>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
