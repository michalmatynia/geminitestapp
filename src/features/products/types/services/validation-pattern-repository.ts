import type {
  ProductValidationChainMode,
  ProductValidationDenyBehavior,
  ProductValidationInstanceDenyBehaviorMap,
  ProductValidationInstanceScope,
  ProductValidationLaunchScopeBehavior,
  ProductValidationLaunchOperator,
  ProductValidationLaunchSourceMode,
  ProductValidationPostAcceptBehavior,
  ProductValidationRuntimeType,
  ProductValidationPattern,
  ProductValidationSeverity,
  ProductValidationTarget,
} from '@/shared/types/domain/products';

export type CreateProductValidationPatternInput = {
  label: string;
  target: ProductValidationTarget;
  locale?: string | null;
  regex: string;
  flags?: string | null;
  message: string;
  severity?: ProductValidationSeverity | null;
  enabled?: boolean;
  replacementEnabled?: boolean;
  replacementAutoApply?: boolean;
  skipNoopReplacementProposal?: boolean;
  replacementValue?: string | null;
  replacementFields?: string[];
  replacementAppliesToScopes?: ProductValidationInstanceScope[];
  runtimeEnabled?: boolean;
  runtimeType?: ProductValidationRuntimeType;
  runtimeConfig?: string | null;
  postAcceptBehavior?: ProductValidationPostAcceptBehavior;
  denyBehaviorOverride?: ProductValidationDenyBehavior | null;
  validationDebounceMs?: number;
  sequenceGroupId?: string | null;
  sequenceGroupLabel?: string | null;
  sequenceGroupDebounceMs?: number;
  sequence?: number | null;
  chainMode?: ProductValidationChainMode;
  maxExecutions?: number;
  passOutputToNext?: boolean;
  launchEnabled?: boolean;
  launchAppliesToScopes?: ProductValidationInstanceScope[];
  launchScopeBehavior?: ProductValidationLaunchScopeBehavior;
  launchSourceMode?: ProductValidationLaunchSourceMode;
  launchSourceField?: string | null;
  launchOperator?: ProductValidationLaunchOperator;
  launchValue?: string | null;
  launchFlags?: string | null;
  appliesToScopes?: ProductValidationInstanceScope[];
};

export type UpdateProductValidationPatternInput = {
  label?: string;
  target?: ProductValidationTarget;
  locale?: string | null;
  regex?: string;
  flags?: string | null;
  message?: string;
  severity?: ProductValidationSeverity;
  enabled?: boolean;
  replacementEnabled?: boolean;
  replacementAutoApply?: boolean;
  skipNoopReplacementProposal?: boolean;
  replacementValue?: string | null;
  replacementFields?: string[];
  replacementAppliesToScopes?: ProductValidationInstanceScope[];
  runtimeEnabled?: boolean;
  runtimeType?: ProductValidationRuntimeType;
  runtimeConfig?: string | null;
  postAcceptBehavior?: ProductValidationPostAcceptBehavior;
  denyBehaviorOverride?: ProductValidationDenyBehavior | null;
  validationDebounceMs?: number;
  sequenceGroupId?: string | null;
  sequenceGroupLabel?: string | null;
  sequenceGroupDebounceMs?: number;
  sequence?: number | null;
  chainMode?: ProductValidationChainMode;
  maxExecutions?: number;
  passOutputToNext?: boolean;
  launchEnabled?: boolean;
  launchAppliesToScopes?: ProductValidationInstanceScope[];
  launchScopeBehavior?: ProductValidationLaunchScopeBehavior;
  launchSourceMode?: ProductValidationLaunchSourceMode;
  launchSourceField?: string | null;
  launchOperator?: ProductValidationLaunchOperator;
  launchValue?: string | null;
  launchFlags?: string | null;
  appliesToScopes?: ProductValidationInstanceScope[];
};

export type ProductValidationPatternRepository = {
  listPatterns(): Promise<ProductValidationPattern[]>;
  getPatternById(id: string): Promise<ProductValidationPattern | null>;
  createPattern(data: CreateProductValidationPatternInput): Promise<ProductValidationPattern>;
  updatePattern(id: string, data: UpdateProductValidationPatternInput): Promise<ProductValidationPattern>;
  deletePattern(id: string): Promise<void>;
  getEnabledByDefault(): Promise<boolean>;
  setEnabledByDefault(enabled: boolean): Promise<boolean>;
  getInstanceDenyBehavior(): Promise<ProductValidationInstanceDenyBehaviorMap>;
  setInstanceDenyBehavior(
    value: ProductValidationInstanceDenyBehaviorMap
  ): Promise<ProductValidationInstanceDenyBehaviorMap>;
};
