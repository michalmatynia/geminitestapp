import { useState } from 'react';
import { Button, Input } from '@/shared/ui/primitives.public';
import { FormField } from '@/shared/ui/forms-and-actions.public';

export function AddRoleForm({ onAdd }: { onAdd: (name: string, desc: string) => void }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  const handleAdd = () => {
    onAdd(name, desc);
    setName(''); setDesc('');
  };

  return (
    <div className='rounded-md border border-border bg-card/40 p-4 space-y-3'>
      <div className='text-sm font-semibold text-white'>Add Role</div>
      <FormField label='Role name'><Input value={name} onChange={(e) => setName(e.target.value)} placeholder='Editor' size='sm' /></FormField>
      <FormField label='Description'><Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder='Manage content...' size='sm' /></FormField>
      <Button onClick={handleAdd} size='sm' className='w-full'>Add Role</Button>
    </div>
  );
}
