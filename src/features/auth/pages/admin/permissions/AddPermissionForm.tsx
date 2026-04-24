import { useState } from 'react';
import { Button, Input, FormField } from '@/shared/ui/primitives.public';

export function AddPermissionForm({ onAdd }: { onAdd: (id: string, name: string, desc: string) => void }) {
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  const handleAdd = () => {
    onAdd(id, name, desc);
    setId(''); setName(''); setDesc('');
  };

  return (
    <div className='rounded-md border border-border bg-card/40 p-4 space-y-3'>
      <div className='text-sm font-semibold text-white'>Add Permission</div>
      <FormField label='Name'><Input value={name} onChange={(e) => setName(e.target.value)} placeholder='Manage products' size='sm' /></FormField>
      <FormField label='Permission ID'><Input value={id} onChange={(e) => setId(e.target.value)} placeholder='products.manage' size='sm' /></FormField>
      <FormField label='Description'><Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder='Describe...' size='sm' /></FormField>
      <Button onClick={handleAdd} size='sm' className='w-full'>Add Permission</Button>
    </div>
  );
}
