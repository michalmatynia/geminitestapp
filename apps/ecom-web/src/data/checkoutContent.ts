/* eslint-disable @typescript-eslint/strict-boolean-expressions,complexity,max-lines,max-lines-per-function,max-params */

export type CheckoutStepKey = 'information' | 'shipping' | 'payment';

export interface CheckoutStepContent {
  key: CheckoutStepKey;
  label: string;
}

export interface CheckoutFieldContent {
  id: string;
  label: string;
  type?: string;
  placeholder: string;
  half?: boolean;
  maxLength?: number;
  monospace?: boolean;
}

export type CheckoutShippingCarrier = 'manual' | 'inpost';

export interface CheckoutShippingMethodContent {
  id: string;
  label: string;
  detail: string;
  price: number;
  priceLabel: string;
  businessDaysMin: number;
  businessDaysMax: number;
  carrier?: CheckoutShippingCarrier;
  service?: string;
  requiresPickupPoint?: boolean;
}

export interface ShippingZone {
  id: string;
  label: string;
  countries: string[];
  methods: CheckoutShippingMethodContent[];
}

export interface CheckoutSummaryContent {
  title: string;
  emptyBagLabel: string;
  promoAppliedSuffix: string;
  removePromoLabel: string;
  promoToggleLabel: string;
  promoPlaceholder: string;
  promoApplyLabel: string;
  promoInvalidLabel: string;
  subtotalLabel: string;
  discountLabel: string;
  shippingLabel: string;
  freeLabel: string;
  totalLabel: string;
}

export interface CheckoutContent {
  brandText: string;
  stepAriaLabel: string;
  steps: CheckoutStepContent[];
  informationTitle: string;
  informationFields: CheckoutFieldContent[];
  returnToBagLabel: string;
  returnToBagHref: string;
  continueToShippingLabel: string;
  shippingTitle: string;
  deliveryRecapLabel: string;
  deliveryAddressFallback: string;
  changeLabel: string;
  shippingMethods: CheckoutShippingMethodContent[];
  shippingZones: ShippingZone[];
  freeShippingThreshold: number;
  freeShippingMethodId: string;
  freeShippingBannerLabel: string;
  backLabel: string;
  continueToPaymentLabel: string;
  paymentTitle: string;
  securityNote: string;
  paymentFields: CheckoutFieldContent[];
  billingSameLabel: string;
  addItemsFirstLabel: string;
  placeOrderLabel: string;
  orderPlacedToastTitle: string;
  orderPlacedToastMessage: string;
  confirmationTitle: string;
  confirmationBodyPrefix: string;
  confirmationEmailFallback: string;
  confirmationBodySuffix: string;
  continueShoppingLabel: string;
  continueShoppingHref: string;
  trackOrderLabel: string;
  confirmationQuote: string;
  orderSummary: CheckoutSummaryContent;
}

export interface CheckoutContentValidationResult {
  content: CheckoutContent;
  errors: string[];
}

const EU_COUNTRIES = [
  'Austria',
  'Belgium',
  'Bulgaria',
  'Croatia',
  'Cyprus',
  'Czechia',
  'Denmark',
  'Estonia',
  'Finland',
  'France',
  'Germany',
  'Greece',
  'Hungary',
  'Ireland',
  'Italy',
  'Latvia',
  'Lithuania',
  'Luxembourg',
  'Malta',
  'Netherlands',
  'Portugal',
  'Romania',
  'Slovakia',
  'Slovenia',
  'Spain',
  'Sweden',
];

export const CHECKOUT_CONTENT_DEFAULTS: CheckoutContent = {
  brandText: 'STARGATER',
  stepAriaLabel: 'Checkout steps',
  steps: [
    { key: 'information', label: 'Information' },
    { key: 'shipping', label: 'Shipping' },
    { key: 'payment', label: 'Payment' },
  ],
  informationTitle: 'Contact & Delivery',
  informationFields: [
    { id: 'email', label: 'Email address', type: 'email', placeholder: 'you@example.com' },
    { id: 'firstName', label: 'First name', placeholder: 'Marie', half: true },
    { id: 'lastName', label: 'Last name', placeholder: 'Curie', half: true },
    { id: 'address', label: 'Address', placeholder: '12 Rue de Rivoli' },
    { id: 'apartment', label: 'Apartment / suite (optional)', placeholder: 'Floor 3' },
    { id: 'city', label: 'City', placeholder: 'Paris', half: true },
    { id: 'postcode', label: 'Postcode', placeholder: '75001', half: true },
    { id: 'country', label: 'Country', placeholder: 'France' },
    { id: 'phone', label: 'Phone (optional)', type: 'tel', placeholder: '+33 6 12 34 56 78' },
  ],
  returnToBagLabel: 'Return to bag',
  returnToBagHref: '/',
  continueToShippingLabel: 'Continue to shipping',
  shippingTitle: 'Shipping method',
  deliveryRecapLabel: 'Delivering to',
  deliveryAddressFallback: '-',
  changeLabel: 'Change',
  shippingMethods: [
    { id: 'standard', label: 'Standard Delivery', detail: '5-7 business days', price: 0, priceLabel: 'Free', businessDaysMin: 5, businessDaysMax: 7 },
    { id: 'express', label: 'Express Delivery', detail: '2-3 business days', price: 18, priceLabel: '€ 18', businessDaysMin: 2, businessDaysMax: 3 },
    { id: 'overnight', label: 'Overnight', detail: 'Next business day before 12:00', price: 35, priceLabel: '€ 35', businessDaysMin: 1, businessDaysMax: 1 },
  ],
  shippingZones: [
    {
      id: 'domestic',
      label: 'Poland',
      countries: ['Poland'],
      methods: [
        { id: 'standard', label: 'Standard', detail: '2-3 business days', price: 0, priceLabel: 'Free', businessDaysMin: 2, businessDaysMax: 3 },
        {
          id: 'inpost-locker',
          label: 'InPost Parcel Locker',
          detail: 'Pickup at selected parcel locker, 1-2 business days',
          price: 4,
          priceLabel: '€ 4',
          businessDaysMin: 1,
          businessDaysMax: 2,
          carrier: 'inpost',
          service: 'inpost_locker_standard',
          requiresPickupPoint: true,
        },
        { id: 'express', label: 'Express', detail: 'Next business day', price: 12, priceLabel: '€ 12', businessDaysMin: 1, businessDaysMax: 1 },
      ],
    },
    {
      id: 'eu',
      label: 'European Union',
      countries: EU_COUNTRIES,
      methods: [
        { id: 'standard', label: 'Standard', detail: '3-5 business days', price: 0, priceLabel: 'Free', businessDaysMin: 3, businessDaysMax: 5 },
        { id: 'express', label: 'Express', detail: '2-3 business days', price: 18, priceLabel: '€ 18', businessDaysMin: 2, businessDaysMax: 3 },
      ],
    },
    {
      id: 'international',
      label: 'International',
      countries: [],
      methods: [
        { id: 'standard', label: 'Standard', detail: '7-14 business days', price: 15, priceLabel: '€ 15', businessDaysMin: 7, businessDaysMax: 14 },
        { id: 'express', label: 'Express', detail: '3-5 business days', price: 35, priceLabel: '€ 35', businessDaysMin: 3, businessDaysMax: 5 },
      ],
    },
  ],
  freeShippingThreshold: 60,
  freeShippingMethodId: 'standard',
  freeShippingBannerLabel: 'Add {amount} more for free shipping',
  backLabel: 'Back',
  continueToPaymentLabel: 'Continue to payment',
  paymentTitle: 'Payment',
  securityNote: 'All transactions are secure and encrypted with SSL',
  paymentFields: [
    { id: 'cardNumber', label: 'Card number', placeholder: '1234 5678 9012 3456', maxLength: 19, monospace: true },
    { id: 'cardName', label: 'Name on card', placeholder: 'Marie Curie' },
    { id: 'expiry', label: 'Expiry date', placeholder: 'MM / YY', maxLength: 7, half: true, monospace: true },
    { id: 'securityCode', label: 'Security code', placeholder: 'CVV', maxLength: 4, half: true, monospace: true },
  ],
  billingSameLabel: 'Billing address same as delivery',
  addItemsFirstLabel: 'Add items first',
  placeOrderLabel: 'Place order',
  orderPlacedToastTitle: 'Order placed!',
  orderPlacedToastMessage: 'A confirmation has been sent to your email.',
  confirmationTitle: 'Order confirmed',
  confirmationBodyPrefix: 'Thank you. Your order has been received and is being prepared. You will receive a confirmation at',
  confirmationEmailFallback: 'your email',
  confirmationBodySuffix: '.',
  continueShoppingLabel: 'Continue shopping',
  continueShoppingHref: '/',
  trackOrderLabel: 'Track order',
  confirmationQuote: '"Objects of enduring beauty - made to last."',
  orderSummary: {
    title: 'Order Summary',
    emptyBagLabel: 'No items in bag',
    promoAppliedSuffix: 'applied',
    removePromoLabel: 'Remove',
    promoToggleLabel: 'Have a promo code?',
    promoPlaceholder: 'Enter code',
    promoApplyLabel: 'Apply',
    promoInvalidLabel: 'Invalid promo code',
    subtotalLabel: 'Subtotal',
    discountLabel: 'Discount',
    shippingLabel: 'Shipping',
    freeLabel: 'Free',
    totalLabel: 'Total',
  },
};

const TEXT_LIMITS = {
  short: 120,
  medium: 240,
  long: 900,
};

const ALLOWED_STEP_KEYS = new Set<CheckoutStepKey>(['information', 'shipping', 'payment']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(
  source: Record<string, unknown>,
  key: string,
  fallback: string,
  maxLength: number,
  errors: string[],
  path: string,
): string {
  const value = source[key];
  if (value === null) return fallback;
  if (typeof value !== 'string') {
    errors.push(`${path} must be text.`);
    return fallback;
  }

  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    errors.push(`${path} must be ${maxLength} characters or fewer.`);
    return fallback;
  }

  return trimmed;
}

function readBoolean(source: Record<string, unknown>, key: string, fallback: boolean, errors: string[], path: string): boolean {
  const value = source[key];
  if (value === null) return fallback;
  if (typeof value !== 'boolean') {
    errors.push(`${path} must be true or false.`);
    return fallback;
  }
  return value;
}

function readOptionalNumber(
  source: Record<string, unknown>,
  key: string,
  fallback: number | undefined,
  errors: string[],
  path: string,
): number | undefined {
  const value = source[key];
  if (value === null) return fallback;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    errors.push(`${path} must be a non-negative number.`);
    return fallback;
  }
  return Math.round(value);
}

function readNumber(source: Record<string, unknown>, key: string, fallback: number, errors: string[], path: string): number {
  return readOptionalNumber(source, key, fallback, errors, path) ?? fallback;
}

function readPositiveInteger(source: Record<string, unknown>, key: string, fallback: number, errors: string[], path: string): number {
  const value = source[key];
  if (value === null) return fallback;
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value) || value < 1) {
    errors.push(`${path} must be a positive integer.`);
    return fallback;
  }
  return value;
}

function readStringList(input: unknown, fallback: string[], maxItems: number, errors: string[], path: string): string[] {
  if (input === null) return fallback;
  if (!Array.isArray(input)) {
    errors.push(`${path} must be a list.`);
    return fallback;
  }
  if (input.length > maxItems) {
    errors.push(`${path} can contain at most ${maxItems} items.`);
    return fallback;
  }

  const values: string[] = [];
  for (const [index, item] of input.entries()) {
    if (typeof item !== 'string') {
      errors.push(`${path}.${index} must be text.`);
      return fallback;
    }
    const trimmed = item.trim();
    if (trimmed) values.push(trimmed);
  }

  return values;
}

function readShippingCarrier(
  source: Record<string, unknown>,
  fallback: CheckoutShippingCarrier,
  errors: string[],
  path: string,
): CheckoutShippingCarrier {
  const value = source['carrier'];
  if (value === null) return fallback;
  if (value === 'manual' || value === 'inpost') return value;
  errors.push(`${path} must be manual or inpost.`);
  return fallback;
}

function isAllowedHref(value: string): boolean {
  if (value.startsWith('/') && !value.startsWith('//')) return true;
  if (value.startsWith('#')) return true;

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function readHref(source: Record<string, unknown>, key: string, fallback: string, errors: string[], path: string): string {
  const value = readString(source, key, fallback, TEXT_LIMITS.medium, errors, path);
  if (!value) return fallback;
  if (!isAllowedHref(value)) {
    errors.push(`${path} must be an internal path, anchor, or http(s) URL.`);
    return fallback;
  }
  return value;
}

function readSteps(input: unknown, fallback: CheckoutStepContent[], errors: string[]): CheckoutStepContent[] {
  if (input === null) return fallback;
  if (!Array.isArray(input)) {
    errors.push('steps must be a list.');
    return fallback;
  }

  const steps: CheckoutStepContent[] = [];
  for (const [index, item] of input.entries()) {
    const fallbackStep = fallback[index] ?? fallback[0];
    if (!isRecord(item)) {
      errors.push('steps items must be objects.');
      return fallback;
    }
    const key = readString(item, 'key', fallbackStep.key, TEXT_LIMITS.short, errors, `steps.${index}.key`);
    if (!ALLOWED_STEP_KEYS.has(key as CheckoutStepKey)) {
      errors.push(`steps.${index}.key is not supported.`);
      return fallback;
    }
    steps.push({
      key: key as CheckoutStepKey,
      label: readString(item, 'label', fallbackStep.label, TEXT_LIMITS.short, errors, `steps.${index}.label`),
    });
  }

  return steps.length > 0 ? steps : fallback;
}

function readFields(input: unknown, fallback: CheckoutFieldContent[], maxItems: number, errors: string[], path: string): CheckoutFieldContent[] {
  if (input === null) return fallback;
  if (!Array.isArray(input)) {
    errors.push(`${path} must be a list.`);
    return fallback;
  }

  const fields: CheckoutFieldContent[] = [];
  for (const [index, item] of input.entries()) {
    const fallbackField = fallback[index] ?? { id: '', label: '', placeholder: '' };
    if (!isRecord(item)) {
      errors.push(`${path} items must be objects.`);
      return fallback;
    }
    fields.push({
      id: readString(item, 'id', fallbackField.id, TEXT_LIMITS.short, errors, `${path}.${index}.id`),
      label: readString(item, 'label', fallbackField.label, TEXT_LIMITS.short, errors, `${path}.${index}.label`),
      type: readString(item, 'type', fallbackField.type ?? 'text', TEXT_LIMITS.short, errors, `${path}.${index}.type`),
      placeholder: readString(item, 'placeholder', fallbackField.placeholder, TEXT_LIMITS.short, errors, `${path}.${index}.placeholder`),
      half: readBoolean(item, 'half', fallbackField.half ?? false, errors, `${path}.${index}.half`),
      maxLength: readOptionalNumber(item, 'maxLength', fallbackField.maxLength, errors, `${path}.${index}.maxLength`),
      monospace: readBoolean(item, 'monospace', fallbackField.monospace ?? false, errors, `${path}.${index}.monospace`),
    });
  }

  if (fields.length > maxItems) {
    errors.push(`${path} can contain at most ${maxItems} items.`);
    return fallback;
  }

  return fields.length > 0 ? fields : fallback;
}

function readShippingMethods(
  input: unknown,
  fallback: CheckoutShippingMethodContent[],
  errors: string[],
  path = 'shippingMethods',
): CheckoutShippingMethodContent[] {
  if (input === null) return fallback;
  if (!Array.isArray(input)) {
    errors.push(`${path} must be a list.`);
    return fallback;
  }

  const methods: CheckoutShippingMethodContent[] = [];
  for (const [index, item] of input.entries()) {
    const fallbackMethod = fallback[index] ?? {
      id: '',
      label: '',
      detail: '',
      price: 0,
      priceLabel: '',
      businessDaysMin: 3,
      businessDaysMax: 5,
    };
    if (!isRecord(item)) {
      errors.push(`${path} items must be objects.`);
      return fallback;
    }
    const businessDaysMin = readPositiveInteger(
      item,
      'businessDaysMin',
      fallbackMethod.businessDaysMin,
      errors,
      `${path}.${index}.businessDaysMin`,
    );
    const businessDaysMax = readPositiveInteger(
      item,
      'businessDaysMax',
      fallbackMethod.businessDaysMax,
      errors,
      `${path}.${index}.businessDaysMax`,
    );
    if (businessDaysMax < businessDaysMin) {
      errors.push(`${path}.${index}.businessDaysMax must be greater than or equal to businessDaysMin.`);
      return fallback;
    }
    const carrier = readShippingCarrier(item, fallbackMethod.carrier ?? 'manual', errors, `${path}.${index}.carrier`);
    const service = readString(item, 'service', fallbackMethod.service ?? '', TEXT_LIMITS.short, errors, `${path}.${index}.service`);
    const requiresPickupPoint = readBoolean(
      item,
      'requiresPickupPoint',
      fallbackMethod.requiresPickupPoint ?? false,
      errors,
      `${path}.${index}.requiresPickupPoint`,
    );
    const method: CheckoutShippingMethodContent = {
      id: readString(item, 'id', fallbackMethod.id, TEXT_LIMITS.short, errors, `${path}.${index}.id`),
      label: readString(item, 'label', fallbackMethod.label, TEXT_LIMITS.short, errors, `${path}.${index}.label`),
      detail: readString(item, 'detail', fallbackMethod.detail, TEXT_LIMITS.medium, errors, `${path}.${index}.detail`),
      price: readNumber(item, 'price', fallbackMethod.price, errors, `${path}.${index}.price`),
      priceLabel: readString(item, 'priceLabel', fallbackMethod.priceLabel, TEXT_LIMITS.short, errors, `${path}.${index}.priceLabel`),
      businessDaysMin,
      businessDaysMax,
    };
    if (carrier !== 'manual' || fallbackMethod.carrier) method.carrier = carrier;
    if (service) method.service = service;
    if (requiresPickupPoint || fallbackMethod.requiresPickupPoint) method.requiresPickupPoint = requiresPickupPoint;
    methods.push(method);
  }

  if (methods.length > 8) {
    errors.push(`${path} can contain at most 8 items.`);
    return fallback;
  }

  return methods.length > 0 ? methods : fallback;
}

function readShippingZones(input: unknown, fallback: ShippingZone[], errors: string[]): ShippingZone[] {
  if (input === null) return fallback;
  if (!Array.isArray(input)) {
    errors.push('shippingZones must be a list.');
    return fallback;
  }
  if (input.length > 10) {
    errors.push('shippingZones can contain at most 10 zones.');
    return fallback;
  }

  const zones: ShippingZone[] = [];
  for (const [index, item] of input.entries()) {
    const fallbackZone = fallback[index] ?? {
      id: '',
      label: '',
      countries: [],
      methods: CHECKOUT_CONTENT_DEFAULTS.shippingMethods,
    };
    if (!isRecord(item)) {
      errors.push('shippingZones items must be objects.');
      return fallback;
    }
    zones.push({
      id: readString(item, 'id', fallbackZone.id, TEXT_LIMITS.short, errors, `shippingZones.${index}.id`),
      label: readString(item, 'label', fallbackZone.label, TEXT_LIMITS.short, errors, `shippingZones.${index}.label`),
      countries: readStringList(
        item['countries'],
        fallbackZone.countries,
        80,
        errors,
        `shippingZones.${index}.countries`,
      ),
      methods: readShippingMethods(
        item['methods'],
        fallbackZone.methods,
        errors,
        `shippingZones.${index}.methods`,
      ),
    });
  }

  return zones;
}

function readSummary(input: unknown, errors: string[]): CheckoutSummaryContent {
  const root = isRecord(input) ? input : {};
  const fallback = CHECKOUT_CONTENT_DEFAULTS.orderSummary;
  return {
    title: readString(root, 'title', fallback.title, TEXT_LIMITS.short, errors, 'orderSummary.title'),
    emptyBagLabel: readString(root, 'emptyBagLabel', fallback.emptyBagLabel, TEXT_LIMITS.short, errors, 'orderSummary.emptyBagLabel'),
    promoAppliedSuffix: readString(root, 'promoAppliedSuffix', fallback.promoAppliedSuffix, TEXT_LIMITS.short, errors, 'orderSummary.promoAppliedSuffix'),
    removePromoLabel: readString(root, 'removePromoLabel', fallback.removePromoLabel, TEXT_LIMITS.short, errors, 'orderSummary.removePromoLabel'),
    promoToggleLabel: readString(root, 'promoToggleLabel', fallback.promoToggleLabel, TEXT_LIMITS.short, errors, 'orderSummary.promoToggleLabel'),
    promoPlaceholder: readString(root, 'promoPlaceholder', fallback.promoPlaceholder, TEXT_LIMITS.short, errors, 'orderSummary.promoPlaceholder'),
    promoApplyLabel: readString(root, 'promoApplyLabel', fallback.promoApplyLabel, TEXT_LIMITS.short, errors, 'orderSummary.promoApplyLabel'),
    promoInvalidLabel: readString(root, 'promoInvalidLabel', fallback.promoInvalidLabel, TEXT_LIMITS.short, errors, 'orderSummary.promoInvalidLabel'),
    subtotalLabel: readString(root, 'subtotalLabel', fallback.subtotalLabel, TEXT_LIMITS.short, errors, 'orderSummary.subtotalLabel'),
    discountLabel: readString(root, 'discountLabel', fallback.discountLabel, TEXT_LIMITS.short, errors, 'orderSummary.discountLabel'),
    shippingLabel: readString(root, 'shippingLabel', fallback.shippingLabel, TEXT_LIMITS.short, errors, 'orderSummary.shippingLabel'),
    freeLabel: readString(root, 'freeLabel', fallback.freeLabel, TEXT_LIMITS.short, errors, 'orderSummary.freeLabel'),
    totalLabel: readString(root, 'totalLabel', fallback.totalLabel, TEXT_LIMITS.short, errors, 'orderSummary.totalLabel'),
  };
}

export function validateCheckoutContent(input: unknown): CheckoutContentValidationResult {
  const errors: string[] = [];
  const root = isRecord(input) ? input : {};

  const content: CheckoutContent = {
    brandText: readString(root, 'brandText', CHECKOUT_CONTENT_DEFAULTS.brandText, TEXT_LIMITS.short, errors, 'brandText'),
    stepAriaLabel: readString(root, 'stepAriaLabel', CHECKOUT_CONTENT_DEFAULTS.stepAriaLabel, TEXT_LIMITS.short, errors, 'stepAriaLabel'),
    steps: readSteps(root['steps'], CHECKOUT_CONTENT_DEFAULTS.steps, errors),
    informationTitle: readString(root, 'informationTitle', CHECKOUT_CONTENT_DEFAULTS.informationTitle, TEXT_LIMITS.short, errors, 'informationTitle'),
    informationFields: readFields(root['informationFields'], CHECKOUT_CONTENT_DEFAULTS.informationFields, 16, errors, 'informationFields'),
    returnToBagLabel: readString(root, 'returnToBagLabel', CHECKOUT_CONTENT_DEFAULTS.returnToBagLabel, TEXT_LIMITS.short, errors, 'returnToBagLabel'),
    returnToBagHref: readHref(root, 'returnToBagHref', CHECKOUT_CONTENT_DEFAULTS.returnToBagHref, errors, 'returnToBagHref'),
    continueToShippingLabel: readString(
      root,
      'continueToShippingLabel',
      CHECKOUT_CONTENT_DEFAULTS.continueToShippingLabel,
      TEXT_LIMITS.short,
      errors,
      'continueToShippingLabel',
    ),
    shippingTitle: readString(root, 'shippingTitle', CHECKOUT_CONTENT_DEFAULTS.shippingTitle, TEXT_LIMITS.short, errors, 'shippingTitle'),
    deliveryRecapLabel: readString(root, 'deliveryRecapLabel', CHECKOUT_CONTENT_DEFAULTS.deliveryRecapLabel, TEXT_LIMITS.short, errors, 'deliveryRecapLabel'),
    deliveryAddressFallback: readString(
      root,
      'deliveryAddressFallback',
      CHECKOUT_CONTENT_DEFAULTS.deliveryAddressFallback,
      TEXT_LIMITS.short,
      errors,
      'deliveryAddressFallback',
    ),
    changeLabel: readString(root, 'changeLabel', CHECKOUT_CONTENT_DEFAULTS.changeLabel, TEXT_LIMITS.short, errors, 'changeLabel'),
    shippingMethods: readShippingMethods(root['shippingMethods'], CHECKOUT_CONTENT_DEFAULTS.shippingMethods, errors),
    shippingZones: readShippingZones(root['shippingZones'], CHECKOUT_CONTENT_DEFAULTS.shippingZones, errors),
    freeShippingThreshold: readNumber(
      root,
      'freeShippingThreshold',
      CHECKOUT_CONTENT_DEFAULTS.freeShippingThreshold,
      errors,
      'freeShippingThreshold',
    ),
    freeShippingMethodId: readString(
      root,
      'freeShippingMethodId',
      CHECKOUT_CONTENT_DEFAULTS.freeShippingMethodId,
      TEXT_LIMITS.short,
      errors,
      'freeShippingMethodId',
    ),
    freeShippingBannerLabel: readString(
      root,
      'freeShippingBannerLabel',
      CHECKOUT_CONTENT_DEFAULTS.freeShippingBannerLabel,
      TEXT_LIMITS.short,
      errors,
      'freeShippingBannerLabel',
    ),
    backLabel: readString(root, 'backLabel', CHECKOUT_CONTENT_DEFAULTS.backLabel, TEXT_LIMITS.short, errors, 'backLabel'),
    continueToPaymentLabel: readString(
      root,
      'continueToPaymentLabel',
      CHECKOUT_CONTENT_DEFAULTS.continueToPaymentLabel,
      TEXT_LIMITS.short,
      errors,
      'continueToPaymentLabel',
    ),
    paymentTitle: readString(root, 'paymentTitle', CHECKOUT_CONTENT_DEFAULTS.paymentTitle, TEXT_LIMITS.short, errors, 'paymentTitle'),
    securityNote: readString(root, 'securityNote', CHECKOUT_CONTENT_DEFAULTS.securityNote, TEXT_LIMITS.medium, errors, 'securityNote'),
    paymentFields: readFields(root['paymentFields'], CHECKOUT_CONTENT_DEFAULTS.paymentFields, 10, errors, 'paymentFields'),
    billingSameLabel: readString(root, 'billingSameLabel', CHECKOUT_CONTENT_DEFAULTS.billingSameLabel, TEXT_LIMITS.short, errors, 'billingSameLabel'),
    addItemsFirstLabel: readString(root, 'addItemsFirstLabel', CHECKOUT_CONTENT_DEFAULTS.addItemsFirstLabel, TEXT_LIMITS.short, errors, 'addItemsFirstLabel'),
    placeOrderLabel: readString(root, 'placeOrderLabel', CHECKOUT_CONTENT_DEFAULTS.placeOrderLabel, TEXT_LIMITS.short, errors, 'placeOrderLabel'),
    orderPlacedToastTitle: readString(
      root,
      'orderPlacedToastTitle',
      CHECKOUT_CONTENT_DEFAULTS.orderPlacedToastTitle,
      TEXT_LIMITS.short,
      errors,
      'orderPlacedToastTitle',
    ),
    orderPlacedToastMessage: readString(
      root,
      'orderPlacedToastMessage',
      CHECKOUT_CONTENT_DEFAULTS.orderPlacedToastMessage,
      TEXT_LIMITS.medium,
      errors,
      'orderPlacedToastMessage',
    ),
    confirmationTitle: readString(root, 'confirmationTitle', CHECKOUT_CONTENT_DEFAULTS.confirmationTitle, TEXT_LIMITS.short, errors, 'confirmationTitle'),
    confirmationBodyPrefix: readString(
      root,
      'confirmationBodyPrefix',
      CHECKOUT_CONTENT_DEFAULTS.confirmationBodyPrefix,
      TEXT_LIMITS.medium,
      errors,
      'confirmationBodyPrefix',
    ),
    confirmationEmailFallback: readString(
      root,
      'confirmationEmailFallback',
      CHECKOUT_CONTENT_DEFAULTS.confirmationEmailFallback,
      TEXT_LIMITS.short,
      errors,
      'confirmationEmailFallback',
    ),
    confirmationBodySuffix: readString(
      root,
      'confirmationBodySuffix',
      CHECKOUT_CONTENT_DEFAULTS.confirmationBodySuffix,
      TEXT_LIMITS.short,
      errors,
      'confirmationBodySuffix',
    ),
    continueShoppingLabel: readString(
      root,
      'continueShoppingLabel',
      CHECKOUT_CONTENT_DEFAULTS.continueShoppingLabel,
      TEXT_LIMITS.short,
      errors,
      'continueShoppingLabel',
    ),
    continueShoppingHref: readHref(root, 'continueShoppingHref', CHECKOUT_CONTENT_DEFAULTS.continueShoppingHref, errors, 'continueShoppingHref'),
    trackOrderLabel: readString(root, 'trackOrderLabel', CHECKOUT_CONTENT_DEFAULTS.trackOrderLabel, TEXT_LIMITS.short, errors, 'trackOrderLabel'),
    confirmationQuote: readString(
      root,
      'confirmationQuote',
      CHECKOUT_CONTENT_DEFAULTS.confirmationQuote,
      TEXT_LIMITS.medium,
      errors,
      'confirmationQuote',
    ),
    orderSummary: readSummary(root['orderSummary'], errors),
  };

  if (!content.freeShippingMethodId.trim()) {
    errors.push('freeShippingMethodId must not be empty.');
  }

  return { content, errors };
}

export function normalizeCheckoutContent(input: unknown): CheckoutContent {
  return validateCheckoutContent(input).content;
}
