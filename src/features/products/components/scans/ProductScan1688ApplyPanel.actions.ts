import type {
  ProductScan1688ApplyField,
  ProductScan1688ApplyModel,
} from './ProductScan1688ApplyPanel.types';

export const applyTextFieldValue = (
  model: ProductScan1688ApplyModel,
  field: ProductScan1688ApplyField,
  value: string | null
): void => {
  if (value === null) return;
  model.formBindings.applyTextField(field, value);
};

export const applyAllSupplierData = (model: ProductScan1688ApplyModel): void => {
  if (model.actions.canApplySupplierName) {
    applyTextFieldValue(model, 'supplierName', model.supplierName);
  }
  if (model.actions.canApplySupplierLink) {
    applyTextFieldValue(model, 'supplierLink', model.supplierLink);
  }
  applyPreferredPriceComment(model);
  if (model.actions.canAppendImageUrls) {
    appendImageUrls(model);
  }
};

const applyPreferredPriceComment = (model: ProductScan1688ApplyModel): void => {
  if (model.actions.canApplyDetailedPriceComment) {
    applyTextFieldValue(model, 'priceComment', model.detailedPriceComment);
    return;
  }
  if (model.actions.canApplyPriceComment) {
    applyTextFieldValue(model, 'priceComment', model.priceComment);
  }
};

export const appendImageUrls = (model: ProductScan1688ApplyModel): void => {
  const { imageState } = model;
  imageState.nextAppendedImageLinkSlots.forEach((value, index) => {
    model.formBindings.setImageLinkAt?.(index, value);
    if (shouldClearBase64Slot(model, value, index)) {
      model.formBindings.setImageBase64At?.(index, '');
    }
  });
};

const shouldClearBase64Slot = (
  model: ProductScan1688ApplyModel,
  value: string,
  index: number
): boolean => {
  const { currentImageBase64Slots, currentImageLinkSlots } = model.imageState;
  return value !== currentImageLinkSlots[index] || currentImageBase64Slots[index] !== '';
};

export const replaceImageUrls = (model: ProductScan1688ApplyModel): void => {
  model.imageState.nextReplacedImageLinkSlots.forEach((value, index) => {
    model.formBindings.setImageLinkAt?.(index, value);
    model.formBindings.setImageBase64At?.(index, '');
  });
};
