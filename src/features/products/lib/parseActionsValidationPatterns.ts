import type {
  CreateProductValidationPatternInput,
  ProductValidationPattern,
  ProductValidationSemanticState,
} from '@/shared/contracts/products/validation';
import { LATEST_PRODUCT_VALIDATION_SEMANTIC_STATE_VERSION } from '@/shared/contracts/products/validation';

export const PRODUCT_PARSE_ACTIONS_TRADERA_PRESET_TYPE = 'parse-actions-tradera';
export const PRODUCT_PARSE_ACTIONS_TRADERA_OPERATION = 'parse_marketplace_listing_text';
export const PRODUCT_PARSE_ACTIONS_TRADERA_PRESET_ID = 'products.parse-actions.tradera.v1';
export const PRODUCT_PARSE_ACTIONS_TRADERA_MAX_ROWS = 500;

export const PRODUCT_PARSE_ACTIONS_TRADERA_PATTERN_IDS = {
  row: 'parse-actions.tradera.row',
  headerStatus: 'parse-actions.tradera.header-status',
  price: 'parse-actions.tradera.price',
  repeatedTitle: 'parse-actions.tradera.repeated-title',
} as const;

export type ProductParseActionsTraderaPatternRole =
  keyof typeof PRODUCT_PARSE_ACTIONS_TRADERA_PATTERN_IDS;

export type ProductParseActionsTraderaPatternSet = Record<
  ProductParseActionsTraderaPatternRole,
  ProductValidationPattern
>;

type ProductParseActionsTraderaPatternPayloadDefinition = {
  role: ProductParseActionsTraderaPatternRole;
  label: string;
  regex: string;
  flags: string | null;
  sequence: number;
  maxExecutions?: number;
};

export const PRODUCT_PARSE_ACTIONS_TRADERA_PATTERN_DEFINITIONS: readonly ProductParseActionsTraderaPatternPayloadDefinition[] =
  [
    {
      role: 'row',
      label: 'Parse Actions: Tradera listing row',
      regex:
        '(?<headerLine>[^\\n]*?)(?:(?<status>Closed|Active|Ended|Hidden))?[ \\t]*\\n' +
        '[ \\t]*Object\\s+no\\.\\s*(?<objectNumber>\\d+)' +
        '(?<body>[\\s\\S]*?)' +
        '(?=\\n[^\\n]*?(?:Closed|Active|Ended|Hidden)?[ \\t]*\\n[ \\t]*Object\\s+no\\.|\\n[ \\t]*Previous\\b|$)',
      flags: 'gi',
      sequence: 10,
      maxExecutions: PRODUCT_PARSE_ACTIONS_TRADERA_MAX_ROWS,
    },
    {
      role: 'headerStatus',
      label: 'Parse Actions: Tradera title status suffix',
      regex: '^(?<title>.+?)(?<status>Closed|Active|Ended|Hidden)[ \\t]*$',
      flags: 'i',
      sequence: 20,
    },
    {
      role: 'price',
      label: 'Parse Actions: Tradera price line',
      regex:
        '^[ \\t]*(?!Shipping\\b)(?<rawPrice>.*?\\b(?<currency>[A-Z]{3})[ \\t]*(?<amount>[0-9]+(?:[.,][0-9]+)?).*?)[ \\t]*$',
      flags: 'im',
      sequence: 30,
    },
    {
      role: 'repeatedTitle',
      label: 'Parse Actions: Tradera repeated title line',
      regex:
        '^[ \\t]*(?!(?:Shipping\\b|Buy now\\b|Restart\\b|Hide\\b|Previous\\b|Next\\b|Per page\\b|' +
        'Listings\\b|Auctions\\b|Bids\\b|Filter\\b|Active\\b|Ended\\b|Hidden\\b|Select multiple\\b|' +
        '\\||\\d+(?:[ \\t]*\\|[ \\t]*\\d+)*$|\\d{1,2}[ \\t]+[A-Za-z]{3}\\b|[A-Z]{3}[ \\t]*\\d))' +
        '(?<title>.+\\S)[ \\t]*$',
      flags: 'im',
      sequence: 40,
    },
  ];

const buildParseActionSemanticState = (
  role: ProductParseActionsTraderaPatternRole
): ProductValidationSemanticState => ({
  version: LATEST_PRODUCT_VALIDATION_SEMANTIC_STATE_VERSION,
  presetId: PRODUCT_PARSE_ACTIONS_TRADERA_PRESET_ID,
  operation: PRODUCT_PARSE_ACTIONS_TRADERA_OPERATION,
  sourceField: 'marketplaceText',
  targetField: 'parsedRows',
  tags: ['parse_actions', 'tradera', role],
  metadata: {
    marketplace: 'tradera',
    parserPatternId: PRODUCT_PARSE_ACTIONS_TRADERA_PATTERN_IDS[role],
    parserPatternRole: role,
    fieldValidation: 'disabled',
  },
});

export const buildTraderaParseActionValidationPatternPayload = (
  definition: ProductParseActionsTraderaPatternPayloadDefinition
): CreateProductValidationPatternInput => ({
  label: definition.label,
  target: 'description',
  locale: null,
  regex: definition.regex,
  flags: definition.flags,
  message: `${definition.label}.`,
  severity: 'warning',
  enabled: true,
  replacementEnabled: false,
  replacementAutoApply: false,
  skipNoopReplacementProposal: true,
  replacementValue: null,
  replacementFields: [],
  runtimeEnabled: false,
  runtimeType: 'none',
  runtimeConfig: null,
  postAcceptBehavior: 'revalidate',
  validationDebounceMs: 0,
  sequenceGroupId: null,
  sequenceGroupLabel: null,
  sequenceGroupDebounceMs: 0,
  sequence: definition.sequence,
  chainMode: 'continue',
  maxExecutions: definition.maxExecutions ?? 1,
  passOutputToNext: true,
  launchEnabled: false,
  launchSourceMode: 'current_field',
  launchSourceField: null,
  launchOperator: 'equals',
  launchValue: null,
  launchFlags: null,
  appliesToScopes: ['draft_template', 'product_create', 'product_edit'],
  replacementAppliesToScopes: ['draft_template', 'product_create', 'product_edit'],
  launchAppliesToScopes: ['draft_template', 'product_create', 'product_edit'],
  semanticState: buildParseActionSemanticState(definition.role),
});

export const buildTraderaParseActionValidationPatternPayloads =
  (): CreateProductValidationPatternInput[] =>
    PRODUCT_PARSE_ACTIONS_TRADERA_PATTERN_DEFINITIONS.map(
      buildTraderaParseActionValidationPatternPayload
    );

const readSemanticMetadataString = (
  pattern: ProductValidationPattern,
  key: string
): string | null => {
  const value = pattern.semanticState?.metadata?.[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
};

export const readTraderaParseActionPatternRole = (
  pattern: ProductValidationPattern
): ProductParseActionsTraderaPatternRole | null => {
  const role = readSemanticMetadataString(pattern, 'parserPatternRole');
  if (role === 'row' || role === 'headerStatus' || role === 'price' || role === 'repeatedTitle') {
    return role;
  }

  const parserPatternId = readSemanticMetadataString(pattern, 'parserPatternId');
  const entry = Object.entries(PRODUCT_PARSE_ACTIONS_TRADERA_PATTERN_IDS).find(
    ([, id]: [string, string]): boolean => id === parserPatternId
  );
  return (entry?.[0] as ProductParseActionsTraderaPatternRole | undefined) ?? null;
};

export const isTraderaParseActionValidationPattern = (
  pattern: ProductValidationPattern
): boolean =>
  pattern.semanticState?.operation === PRODUCT_PARSE_ACTIONS_TRADERA_OPERATION &&
  readSemanticMetadataString(pattern, 'marketplace') === 'tradera' &&
  readTraderaParseActionPatternRole(pattern) !== null;

export const isTraderaParseActionValidationPatternRole = (
  pattern: ProductValidationPattern,
  role: ProductParseActionsTraderaPatternRole
): boolean =>
  isTraderaParseActionValidationPattern(pattern) &&
  readTraderaParseActionPatternRole(pattern) === role;

const groupTraderaParseActionPatternsByRole = (
  patterns: ProductValidationPattern[]
): Map<ProductParseActionsTraderaPatternRole, ProductValidationPattern> => {
  const byRole = new Map<ProductParseActionsTraderaPatternRole, ProductValidationPattern>();
  for (const pattern of patterns) {
    if (!isTraderaParseActionValidationPattern(pattern)) continue;
    const role = readTraderaParseActionPatternRole(pattern);
    if (role === null || byRole.has(role)) continue;
    byRole.set(role, pattern);
  }
  return byRole;
};

export const selectTraderaParseActionValidationPatterns = (
  patterns: ProductValidationPattern[]
): ProductParseActionsTraderaPatternSet | null => {
  const byRole = groupTraderaParseActionPatternsByRole(patterns);
  const row = byRole.get('row');
  const headerStatus = byRole.get('headerStatus');
  const price = byRole.get('price');
  const repeatedTitle = byRole.get('repeatedTitle');
  if (
    row === undefined ||
    headerStatus === undefined ||
    price === undefined ||
    repeatedTitle === undefined
  ) {
    return null;
  }

  return { row, headerStatus, price, repeatedTitle };
};
