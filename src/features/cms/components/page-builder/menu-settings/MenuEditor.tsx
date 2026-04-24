import { Button, Input } from '@/shared/ui/primitives.public';
import { Trash2, Plus } from 'lucide-react';
import type { MenuItem, MenuSettings } from '@/shared/contracts/cms-menu';

export function MenuEditor({ settings, updateMenuItem, removeMenuItem, addMenuItem }: { 
    settings: MenuSettings, 
    updateMenuItem: (id: string, field: 'label' | 'url' | 'imageUrl', value: string) => void,
    removeMenuItem: (id: string) => void,
    addMenuItem: () => void 
}): React.JSX.Element {
  return (
    <div className='space-y-2'>
      {settings.items.map((item: MenuItem) => (
        <div key={item.id} className='flex items-start gap-1.5 rounded-md border border-border/60 bg-card/30 p-2'>
          <div className='flex-1 space-y-1.5'>
            <Input value={item.label} onChange={(e) => updateMenuItem(item.id, 'label', e.target.value)} size='sm' placeholder='Label' />
            <Input value={item.url} onChange={(e) => updateMenuItem(item.id, 'url', e.target.value)} size='sm' placeholder='URL' />
          </div>
          <Button variant='ghost' size='sm' onClick={() => removeMenuItem(item.id)} className='text-red-400'>
            <Trash2 className='size-3.5' />
          </Button>
        </div>
      ))}
      <Button size='sm' variant='outline' className='w-full text-xs' onClick={addMenuItem}>
        <Plus className='mr-1.5 size-3.5' /> Add menu item
      </Button>
    </div>
  );
}
