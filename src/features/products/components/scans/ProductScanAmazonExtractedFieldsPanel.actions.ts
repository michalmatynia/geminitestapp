import type {
  ProductScanAmazonFormBindings,
  ScanAttributeMapping,
} from './ProductScanAmazonExtractedFieldsPanel.types';

export const applyMatchedAttributeMappings = (
  mappings: ScanAttributeMapping[],
  formBindings: ProductScanAmazonFormBindings
): void => {
  const parameterValueCount = formBindings.parameterValues.length;
  let queuedParameterAdds = 0;

  for (const mapping of mappings) {
    if (mapping.targetType === 'parameter') {
      queuedParameterAdds = applyParameterMapping(
        mapping,
        formBindings,
        parameterValueCount,
        queuedParameterAdds
      );
      continue;
    }
    if (mapping.targetType === 'custom_field_text') {
      formBindings.setTextValue(mapping.targetId, mapping.value);
      continue;
    }
    applyCheckboxSetMapping(mapping, formBindings);
  }
};

const applyParameterMapping = (
  mapping: Extract<ScanAttributeMapping, { targetType: 'parameter' }>,
  formBindings: ProductScanAmazonFormBindings,
  parameterValueCount: number,
  queuedParameterAdds: number
): number => {
  const existingIndex = formBindings.parameterValues.findIndex(
    (entry) => entry.parameterId === mapping.targetId
  );
  if (existingIndex >= 0) {
    formBindings.updateParameterValue(existingIndex, mapping.value);
    return queuedParameterAdds;
  }

  const nextIndex = parameterValueCount + queuedParameterAdds;
  formBindings.addParameterValue();
  formBindings.updateParameterId(nextIndex, mapping.targetId);
  formBindings.updateParameterValue(nextIndex, mapping.value);
  return queuedParameterAdds + 1;
};

const applyCheckboxSetMapping = (
  mapping: Extract<ScanAttributeMapping, { targetType: 'custom_field_checkbox_set' }>,
  formBindings: ProductScanAmazonFormBindings
): void => {
  const targetField = formBindings.customFields.find((field) => field.id === mapping.targetId);
  if (targetField?.type !== 'checkbox_set') return;

  const currentSelectedOptionIds =
    formBindings.customFieldValues.find((entry) => entry.fieldId === mapping.targetId)
      ?.selectedOptionIds ?? [];
  const currentSelectedOptionIdSet = new Set(currentSelectedOptionIds);
  const targetOptionIdSet = new Set(mapping.targetOptionIds);
  for (const option of targetField.options) {
    const shouldBeChecked = targetOptionIdSet.has(option.id);
    if (currentSelectedOptionIdSet.has(option.id) !== shouldBeChecked) {
      formBindings.toggleSelectedOption(mapping.targetId, option.id, shouldBeChecked);
    }
  }
};
