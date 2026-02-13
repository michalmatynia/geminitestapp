import { TabsList, TabsTrigger } from '@/shared/ui';

import { useIntegrationModalViewContext } from './IntegrationModalViewContext';

export function IntegrationTabsList(): React.JSX.Element {
  const {
    showAllegroConsole,
    showBaseConsole,
    showPlaywright,
  } = useIntegrationModalViewContext();

  const colsClass =
    showPlaywright || showAllegroConsole || showBaseConsole ? 'grid-cols-5' : 'grid-cols-4';

  return (
    <TabsList className={`grid w-full ${colsClass}`}>
      <TabsTrigger value='connections'>Connections</TabsTrigger>
      <TabsTrigger value='settings'>Settings</TabsTrigger>
      {showAllegroConsole && <TabsTrigger value='allegro-api'>Allegro API</TabsTrigger>}
      {showBaseConsole && <TabsTrigger value='base-api'>Base API</TabsTrigger>}
      <TabsTrigger value='price-sync'>Price Sync</TabsTrigger>
      <TabsTrigger value='inventory-sync'>Inventory Sync</TabsTrigger>
      {showPlaywright && <TabsTrigger value='playwright'>Playwright</TabsTrigger>}
    </TabsList>
  );
}
