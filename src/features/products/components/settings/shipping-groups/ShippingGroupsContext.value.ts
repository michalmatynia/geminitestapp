import type { ShippingGroupHandlers } from './ShippingGroupsContext.handlers';
import type { ShippingGroupsStateValue } from './ShippingGroupsContext.types';

type ShippingGroupsStateValueInput = Omit<
  ShippingGroupsStateValue,
  keyof ShippingGroupHandlers | 'redundantModalRuleSummary'
> &
  ShippingGroupHandlers;

export const composeShippingGroupsStateValue = (
  input: ShippingGroupsStateValueInput
): ShippingGroupsStateValue => ({
  ...input,
  redundantModalRuleSummary: null,
});
