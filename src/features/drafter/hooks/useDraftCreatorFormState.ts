'use client';

import { useState } from 'react';

import type { ProductDraftKind, ProductDraftOpenFormTab } from '@/shared/contracts/products';
import {
  DEFAULT_ICON_COLOR,
  type DraftCreatorBaseState,
  type IconColorMode,
  type IdentifierType,
} from './useDraftCreatorForm.types';

export const useDraftCreatorBaseState = (): DraftCreatorBaseState => {
  const [name, setName] = useState(''); const [draftKind, setDraftKindState] = useState<ProductDraftKind>('standard');
  const [draftKindDirty, setDraftKindDirty] = useState(false); const [scrapeProfileId, setScrapeProfileIdState] = useState<string | null>(null);
  const [scrapeProfileDirty, setScrapeProfileDirty] = useState(false); const [description, setDescription] = useState('');
  const [sku, setSku] = useState(''); const [identifierType, setIdentifierType] = useState<IdentifierType>('ean');
  const [ean, setEan] = useState(''); const [gtin, setGtin] = useState(''); const [asin, setAsin] = useState('');
  const [nameEn, setNameEn] = useState(''); const [namePl, setNamePl] = useState(''); const [nameDe, setNameDe] = useState('');
  const [descEn, setDescEn] = useState(''); const [descPl, setDescPl] = useState(''); const [descDe, setDescDe] = useState('');
  const [weight, setWeight] = useState(''); const [sizeLength, setSizeLength] = useState(''); const [sizeWidth, setSizeWidth] = useState('');
  const [length, setLength] = useState(''); const [price, setPrice] = useState(''); const [supplierName, setSupplierName] = useState('');
  const [supplierLink, setSupplierLink] = useState(''); const [priceComment, setPriceComment] = useState(''); const [stock, setStock] = useState('');
  const [baseProductId, setBaseProductId] = useState(''); const [activeState, setActiveState] = useState(true);
  const [validatorEnabled, setValidatorEnabled] = useState(true); const [formatterEnabled, setFormatterEnabled] = useState(false);
  const [icon, setIcon] = useState<string | null>(null); const [iconColorMode, setIconColorMode] = useState<IconColorMode>('theme');
  const [iconColor, setIconColor] = useState(DEFAULT_ICON_COLOR); const [openProductFormTab, setOpenProductFormTab] = useState<ProductDraftOpenFormTab>('general');
  const [isIconLibraryOpen, setIsIconLibraryOpen] = useState(false); const [selectedCatalogIds, setSelectedCatalogIds] = useState<string[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null); const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedProducerIds, setSelectedProducerIds] = useState<string[]>([]);
  return { name, setName, draftKind, setDraftKindState, draftKindDirty, setDraftKindDirty, scrapeProfileId, setScrapeProfileIdState, scrapeProfileDirty, setScrapeProfileDirty, description, setDescription, sku, setSku, identifierType, setIdentifierType, ean, setEan, gtin, setGtin, asin, setAsin, nameEn, setNameEn, namePl, setNamePl, nameDe, setNameDe, descEn, setDescEn, descPl, setDescPl, descDe, setDescDe, weight, setWeight, sizeLength, setSizeLength, sizeWidth, setSizeWidth, length, setLength, price, setPrice, supplierName, setSupplierName, supplierLink, setSupplierLink, priceComment, setPriceComment, stock, setStock, baseProductId, setBaseProductId, activeState, setActiveState, validatorEnabled, setValidatorEnabled, formatterEnabled, setFormatterEnabled, icon, setIcon, iconColorMode, setIconColorMode, iconColor, setIconColor, openProductFormTab, setOpenProductFormTab, isIconLibraryOpen, setIsIconLibraryOpen, selectedCatalogIds, setSelectedCatalogIds, selectedCategoryId, setSelectedCategoryId, selectedTagIds, setSelectedTagIds, selectedProducerIds, setSelectedProducerIds };
};
