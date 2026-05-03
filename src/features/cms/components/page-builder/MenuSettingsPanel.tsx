'use client';

import { FormSection } from '@/shared/ui/forms-and-actions.public';
import { SectionHeader } from '@/shared/ui/navigation-and-layout.public';
import { useMenuSettingsController } from './menu-settings/useMenuSettingsController';
import { MenuEditor } from './menu-settings/MenuEditor';
import { MenuSectionContainer } from './menu-settings/MenuSectionContainer';
import { MENU_SECTIONS } from './menu-settings/menu-constants';

export function MenuSettingsPanel({ showHeader = true }: { showHeader?: boolean } = {}): React.JSX.Element {
  const ctrl = useMenuSettingsController();

  return (
    <div className='flex min-h-0 flex-1 flex-col'>
      {showHeader && (
        <SectionHeader title='Menu settings' subtitle='Configure page navigation.' size='xs' className='p-3 border-b border-border' />
      )}
      <div className='flex-1 overflow-y-auto p-3 space-y-3'>
        <FormSection title='Menu scope' variant='subtle' className='p-3'>
           {/* Scope selector logic here */}
        </FormSection>
        {MENU_SECTIONS.map((section) => (
          <MenuSectionContainer 
            key={section} 
            title={section} 
            isOpen={ctrl.openSections.has(section)} 
            onToggle={() => {
                const next = new Set(ctrl.openSections);
                next.has(section) ? next.delete(section) : next.add(section);
                ctrl.setOpenSections(next);
            }}
          >
            {section === 'Menu Items' ? (
              <MenuEditor 
                settings={ctrl.settings} 
                updateMenuItem={ctrl.updateMenuItem} 
                removeMenuItem={(id) => ctrl.setUserSettings(prev => ({ ...prev!, items: prev!.items.filter(i => i.id !== id) }))}
                addMenuItem={() => ctrl.setUserSettings(prev => ({ ...prev!, items: [...prev!.items, { id: String(Date.now()), label: 'New', url: '/' }] }))}
              />
            ) : (
                <div className='text-xs text-gray-500'>Settings configured for {section}</div>
            )}
          </MenuSectionContainer>
        ))}
      </div>
    </div>
  );
}
