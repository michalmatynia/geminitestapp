import type {
  CheckoutContent,
  CheckoutShippingMethodContent,
  ShippingZone,
} from '@/data/checkoutContent';
import type { EcomLocale } from '@/lib/locales';
import type { InpostPoint, ShippingCarrier } from '@/lib/orders';

export type ShippingProviderAvailability = Partial<Record<ShippingCarrier, boolean>>;

function normalizeCountry(value: string): string {
  return value.trim().toLowerCase();
}

export function isPolandShippingCountry(country: string): boolean {
  const normalized = normalizeCountry(country);
  return normalized === 'poland' || normalized === 'pl' || normalized === 'polska';
}

export function filterShippingMethodsForCountry(
  methods: CheckoutShippingMethodContent[],
  country: string,
): CheckoutShippingMethodContent[] {
  if (isPolandShippingCountry(country)) return methods;
  return methods.filter((method) => method.carrier !== 'inpost');
}

export function filterShippingMethodsForProviderAvailability(
  methods: CheckoutShippingMethodContent[],
  availability: ShippingProviderAvailability,
): CheckoutShippingMethodContent[] {
  const availableMethods = methods.filter((method) => {
    const carrier = method.carrier ?? 'manual';
    return availability[carrier] !== false;
  });

  return methods.length > 0 && availableMethods.length === 0
    ? methods
    : availableMethods;
}

function addBusinessDays(start: Date, days: number): Date {
  const date = new Date(start);
  date.setHours(12, 0, 0, 0);

  let remaining = Math.max(0, Math.round(days));
  while (remaining > 0) {
    date.setDate(date.getDate() + 1);
    const day = date.getDay();
    if (day !== 0 && day !== 6) remaining -= 1;
  }

  return date;
}

function formatRangeDate(date: Date, locale: EcomLocale, includeMonth: boolean): string {
  return new Intl.DateTimeFormat(locale === 'pl' ? 'pl-PL' : 'en-GB', {
    day: 'numeric',
    ...(includeMonth ? { month: 'short' as const } : {}),
  }).format(date);
}

export function getZoneForCountry(zones: ShippingZone[], country: string): ShippingZone | null {
  const normalizedCountry = normalizeCountry(country);
  if (normalizedCountry.length === 0) return null;

  let catchAll: ShippingZone | null = null;

  for (const zone of zones) {
    if (zone.countries.length === 0) {
      catchAll = zone;
      continue;
    }
    if (zone.countries.some((zoneCountry) => normalizeCountry(zoneCountry) === normalizedCountry)) {
      return zone;
    }
  }

  return catchAll;
}

export function calcDeliveryRange(min: number, max: number, locale: EcomLocale): string {
  const safeMin = Math.max(1, Math.round(min));
  const safeMax = Math.max(safeMin, Math.round(max));
  const start = new Date();
  const startDate = addBusinessDays(start, safeMin);
  const endDate = addBusinessDays(start, safeMax);
  const outputLocale = locale === 'pl' ? 'pl-PL' : 'en-GB';

  if (startDate.toDateString() === endDate.toDateString()) {
    return new Intl.DateTimeFormat(outputLocale, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }).format(startDate);
  }

  const sameMonth = startDate.getMonth() === endDate.getMonth()
    && startDate.getFullYear() === endDate.getFullYear();
  return `${formatRangeDate(startDate, locale, !sameMonth)}-${formatRangeDate(endDate, locale, true)}`;
}

export function applyFreeThreshold(
  methods: CheckoutShippingMethodContent[],
  subtotal: number,
  threshold: number,
  methodId: string,
): CheckoutShippingMethodContent[] {
  if (threshold <= 0 || subtotal < threshold) return methods;

  return methods.map((method) => (
    method.id === methodId
      ? { ...method, price: 0 }
      : method
  ));
}

export type CheckoutShippingSelectionInput = {
  content: CheckoutContent;
  country: string;
  subtotal: number;
  methodId?: string;
  methodLabel: string;
  service?: string;
  carrier: ShippingCarrier;
  price: number;
  inpostPoint: InpostPoint | null;
  providerAvailability?: ShippingProviderAvailability;
};

export type CheckoutShippingSelection = {
  method: CheckoutShippingMethodContent;
  shippingMethod: string;
  shippingPrice: number;
  shippingCarrier: ShippingCarrier;
  shippingService: string;
};

export type CheckoutShippingSelectionResult =
  | { ok: true; selection: CheckoutShippingSelection }
  | { ok: false; error: string };

function checkoutShippingService(method: CheckoutShippingMethodContent): string {
  return method.service ?? method.id;
}

function normalizeSelectionToken(value: string | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function findCheckoutShippingMethod(
  methods: CheckoutShippingMethodContent[],
  input: CheckoutShippingSelectionInput,
): CheckoutShippingMethodContent | undefined {
  const methodId = normalizeSelectionToken(input.methodId);
  const service = normalizeSelectionToken(input.service);
  const label = normalizeSelectionToken(input.methodLabel);

  return methods.find((method) => {
    const candidateId = normalizeSelectionToken(method.id);
    const candidateService = normalizeSelectionToken(checkoutShippingService(method));
    const candidateLabel = normalizeSelectionToken(method.label);
    return (methodId !== '' && candidateId === methodId)
      || (service !== '' && candidateService === service)
      || (label !== '' && candidateLabel === label);
  });
}

type ShippingSelectionValidator = (
  method: CheckoutShippingMethodContent,
  input: CheckoutShippingSelectionInput,
) => string | null;

const validateShippingCarrier: ShippingSelectionValidator = (method, input) => {
  const shippingCarrier = method.carrier ?? 'manual';
  if (input.carrier !== shippingCarrier) return 'Selected shipping method is invalid.';
  return null;
};

const validateShippingService: ShippingSelectionValidator = (method, input) => {
  const submittedService = input.service?.trim() ?? '';
  if (submittedService !== '' && submittedService !== checkoutShippingService(method)) {
    return 'Selected shipping service is invalid.';
  }
  return null;
};

const validateInpostPoint: ShippingSelectionValidator = (method, input) => {
  const shippingCarrier = method.carrier ?? 'manual';
  if (shippingCarrier === 'inpost' && input.inpostPoint === null) return 'An InPost pickup point is required';
  return null;
};

const validateInpostCountry: ShippingSelectionValidator = (method, input) => {
  const shippingCarrier = method.carrier ?? 'manual';
  if (shippingCarrier === 'inpost' && !isPolandShippingCountry(input.country)) {
    return 'InPost parcel locker delivery is available only in Poland';
  }
  return null;
};

const validateShippingPrice: ShippingSelectionValidator = (method, input) => {
  if (input.price !== method.price) return 'Shipping price is invalid.';
  return null;
};

const SHIPPING_SELECTION_VALIDATORS: ShippingSelectionValidator[] = [
  validateShippingCarrier,
  validateShippingService,
  validateInpostPoint,
  validateInpostCountry,
  validateShippingPrice,
];

function shippingSelectionValidationError(
  method: CheckoutShippingMethodContent,
  input: CheckoutShippingSelectionInput,
): string | null {
  for (const validate of SHIPPING_SELECTION_VALIDATORS) {
    const error = validate(method, input);
    if (error !== null) return error;
  }
  return null;
}

export function resolveCheckoutShippingSelection(
  input: CheckoutShippingSelectionInput,
): CheckoutShippingSelectionResult {
  const zone = getZoneForCountry(input.content.shippingZones, input.country);
  const rawMethods = zone !== null ? zone.methods : input.content.shippingMethods;
  const countryMethods = filterShippingMethodsForCountry(rawMethods, input.country);
  const providerMethods = filterShippingMethodsForProviderAvailability(
    countryMethods,
    input.providerAvailability ?? {}
  );
  const methods = applyFreeThreshold(
    providerMethods,
    input.subtotal,
    input.content.freeShippingThreshold,
    input.content.freeShippingMethodId,
  );
  const method = findCheckoutShippingMethod(methods, input);
  if (method === undefined) {
    return { ok: false, error: 'Selected shipping method is not available for this address.' };
  }

  const validationError = shippingSelectionValidationError(method, input);
  if (validationError !== null) return { ok: false, error: validationError };

  const shippingCarrier = method.carrier ?? 'manual';
  const shippingService = checkoutShippingService(method);
  return {
    ok: true,
    selection: {
      method,
      shippingMethod: method.label,
      shippingPrice: method.price,
      shippingCarrier,
      shippingService,
    },
  };
}
