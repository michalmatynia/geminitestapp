import { TabsList, TabsTrigger } from '@/shared/ui';

import { useIntegrationModalViewContext } from './IntegrationModalViewContext';

export function IntegrationTabsList(): React.JSX.Element {
  const {
    showAllegroConsole,
    showBaseConsole,
    showPlaywright,
  } = useIntegrationModalViewContext();

  const tabs = [
    { value: 'connections', label: 'Connections' },
    { value: 'settings', label: 'Settings' },
    { value: 'allegro-api', label: 'Allegro API', show: showAllegroConsole },
    { value: 'base-api', label: 'Base API', show: showBaseConsole },
    { value: 'price-sync', label: 'Price Sync' },
    { value: 'inventory-sync', label: 'Inventory Sync' },
    { value: 'playwright', label: 'Playwright', show: showPlaywright },
  ].filter(t => t.show !== false);

  return (
    <TabsList 
      className='grid w-full' 
      style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
    >
      {tabs.map(tab => (
        <TabsTrigger key={tab.value} value={tab.value}>
          {tab.label}
        </TabsTrigger>
      ))}
    </TabsList>
  );
}
