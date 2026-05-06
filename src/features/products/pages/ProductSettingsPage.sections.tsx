import type { JSX, ReactNode } from 'react';

import { CatalogsSettings } from '@/features/products/components/settings/catalogs/CatalogsSettings';
import { CategoriesSettings } from '@/features/products/components/settings/CategoriesSettings';
import { CustomFieldsSettings } from '@/features/products/components/settings/CustomFieldsSettings';
import { ParametersSettings } from '@/features/products/components/settings/parameters/ParametersSettings';
import { PriceGroupsSettings } from '@/features/products/components/settings/pricing/PriceGroupsSettings';
import { ProductImageRoutingSettings } from '@/features/products/components/settings/ProductImageRoutingSettings';
import { ShippingGroupsSettings } from '@/features/products/components/settings/ShippingGroupsSettings';
import { TagsSettings } from '@/features/products/components/settings/TagsSettings';
import { ValidatorDefaultPanel } from '@/features/products/components/settings/validator-settings/ValidatorDefaultPanel';
import { ValidatorDocsTooltipsProvider } from '@/features/products/components/settings/validator-settings/ValidatorDocsTooltips';
import { ValidatorSettings } from '@/features/products/components/settings/ValidatorSettings';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { UI_GRID_ROOMY_CLASSNAME } from '@/shared/ui/layout';

import { settingSections } from './ProductSettingsConstants';
import { ProductDefaultsForm } from './product-settings/ProductDefaultsForm';
import { ProductLabelingSettings } from './product-settings/ProductLabelingSettings';
import { ProductTraderaConnectionSettings } from './product-settings/ProductTraderaConnectionSettings';
import { TaxationSettingsPanel } from './product-settings/TaxationSettingsPanel';
import { useProductSettingsController } from './product-settings/useProductSettingsController';
import type {
  ProductSettingsCustomFieldsProps,
  ProductSettingsParametersProps,
  ProductSettingsSection,
} from './ProductSettingsPage.types';

type ProductSettingsPanelProps = {
  customFieldsProps: ProductSettingsCustomFieldsProps;
  parametersProps: ProductSettingsParametersProps;
  internationalizationSettingsSlot?: ReactNode;
  productSyncSettingsSlot?: ReactNode;
};

type ProductSettingsSectionsLayoutProps = ProductSettingsPanelProps & {
  activeSection: ProductSettingsSection;
  onSectionChange: (section: ProductSettingsSection) => void;
};

type ProductSettingsSectionPanel = (props: ProductSettingsPanelProps) => JSX.Element;

const renderSlotOrFallback = (slot: ReactNode, fallback: ReactNode): ReactNode => slot ?? fallback;

const ProductDefaultsSettingsSection = (): JSX.Element => {
  const ctrl = useProductSettingsController();

  return (
    <div className='space-y-6'>
      <ProductDefaultsForm
        settings={ctrl.settings}
        onUpdate={ctrl.handleUpdate}
        onSave={ctrl.saveSettings}
        isSaving={ctrl.isSaving}
      />
      <ProductTraderaConnectionSettings />
      <ProductLabelingSettings settings={ctrl.settings} onUpdate={ctrl.handleUpdate} />
      <TaxationSettingsPanel settings={ctrl.settings} onUpdate={ctrl.handleUpdate} />
    </div>
  );
};

const CustomFieldsPanel = (props: ProductSettingsPanelProps): JSX.Element => (
  <CustomFieldsSettings {...props.customFieldsProps} />
);

const ParametersPanel = (props: ProductSettingsPanelProps): JSX.Element => (
  <ParametersSettings {...props.parametersProps} />
);

const SyncSettingsPanel = (props: ProductSettingsPanelProps): JSX.Element => (
  <>{renderSlotOrFallback(props.productSyncSettingsSlot, <div>Product Sync Settings is not available.</div>)}</>
);

const ValidatorPanel = (): JSX.Element => (
  <ValidatorDocsTooltipsProvider>
    <div className='space-y-5'>
      <ValidatorDefaultPanel />
      <ValidatorSettings />
    </div>
  </ValidatorDocsTooltipsProvider>
);

const InternationalizationPanel = (props: ProductSettingsPanelProps): JSX.Element => (
  <>
    {renderSlotOrFallback(
      props.internationalizationSettingsSlot,
      <div>Internationalization Settings is not available.</div>
    )}
  </>
);

const SECTION_PANELS = {
  Categories: (): JSX.Element => <CategoriesSettings />,
  'Shipping Groups': (): JSX.Element => <ShippingGroupsSettings />,
  Tags: (): JSX.Element => <TagsSettings />,
  'Custom Fields': CustomFieldsPanel,
  Parameters: ParametersPanel,
  'Price Groups': (): JSX.Element => <PriceGroupsSettings />,
  Catalogs: (): JSX.Element => <CatalogsSettings />,
  Defaults: ProductDefaultsSettingsSection,
  'Sync Settings': SyncSettingsPanel,
  'Images & Studio': (): JSX.Element => <ProductImageRoutingSettings />,
  Validator: ValidatorPanel,
  Internationalization: InternationalizationPanel,
} satisfies Record<ProductSettingsSection, ProductSettingsSectionPanel>;

export const ProductSettingsSectionsLayout = ({
  activeSection,
  onSectionChange,
  ...panelProps
}: ProductSettingsSectionsLayoutProps): JSX.Element => {
  const ActivePanel = SECTION_PANELS[activeSection];

  return (
    <div className={`${UI_GRID_ROOMY_CLASSNAME} md:grid-cols-[240px_1fr]`}>
      <Card variant='subtle' padding='md' className='border-border/60 bg-card/40'>
        <div className='flex flex-col gap-2'>
          {settingSections.map((section) => (
            <Button
              size='xs'
              key={section}
              variant={activeSection === section ? 'secondary' : 'ghost'}
              onClick={(): void => onSectionChange(section)}
              className='justify-start px-3 py-2 text-left text-sm'
            >
              {section}
            </Button>
          ))}
        </div>
      </Card>

      <Card variant='subtle' padding='lg' className='border-border/60 bg-card/40'>
        <ActivePanel {...panelProps} />
      </Card>
    </div>
  );
};
