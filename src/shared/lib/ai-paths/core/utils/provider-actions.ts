import type { DatabaseAction, DatabaseActionCategory } from '@/shared/contracts/ai-paths';
import type { AppProviderValue as DbActionProvider } from '@/shared/contracts/system';
import type { LabeledOptionDto } from '@/shared/contracts/ui';

export type { DbActionProvider };
export type DbActionProviderSelection = 'auto' | DbActionProvider | undefined;

export type ProviderActionOption = LabeledOptionDto<DatabaseAction>;

const ACTION_CATEGORY_BY_ACTION: Record<DatabaseAction, DatabaseActionCategory> = {
  insertOne: 'create',
  insertMany: 'create',
  find: 'read',
  findOne: 'read',
  countDocuments: 'read',
  distinct: 'read',
  aggregate: 'aggregate',
  updateOne: 'update',
  updateMany: 'update',
  replaceOne: 'update',
  findOneAndUpdate: 'update',
  deleteOne: 'delete',
  deleteMany: 'delete',
  findOneAndDelete: 'delete',
};

const CATEGORY_OPTIONS_BY_PROVIDER: Record<
  DbActionProvider,
  LabeledOptionDto<DatabaseActionCategory>[]
> = {
  mongodb: [
    { value: 'create', label: 'Create' },
    { value: 'read', label: 'Read' },
    { value: 'update', label: 'Update' },
    { value: 'delete', label: 'Delete' },
    { value: 'aggregate', label: 'Aggregate' },
  ],
  prisma: [
    { value: 'create', label: 'Create' },
    { value: 'read', label: 'Read' },
    { value: 'update', label: 'Update' },
    { value: 'delete', label: 'Delete' },
  ],
};

const ACTION_OPTIONS_BY_PROVIDER: Record<
  DbActionProvider,
  Record<DatabaseActionCategory, ProviderActionOption[]>
> = {
  mongodb: {
    create: [
      { value: 'insertOne', label: 'insertOne' },
      { value: 'insertMany', label: 'insertMany' },
    ],
    read: [
      { value: 'find', label: 'find' },
      { value: 'findOne', label: 'findOne' },
      { value: 'countDocuments', label: 'countDocuments' },
      { value: 'distinct', label: 'distinct' },
    ],
    update: [
      { value: 'updateOne', label: 'updateOne' },
      { value: 'updateMany', label: 'updateMany' },
      { value: 'replaceOne', label: 'replaceOne' },
      { value: 'findOneAndUpdate', label: 'findOneAndUpdate' },
    ],
    delete: [
      { value: 'deleteOne', label: 'deleteOne' },
      { value: 'deleteMany', label: 'deleteMany' },
      { value: 'findOneAndDelete', label: 'findOneAndDelete' },
    ],
    aggregate: [{ value: 'aggregate', label: 'aggregate' }],
  },
  prisma: {
    create: [
      { value: 'insertOne', label: 'create' },
      { value: 'insertMany', label: 'createMany' },
    ],
    read: [
      { value: 'find', label: 'findMany' },
      { value: 'findOne', label: 'findFirst' },
      { value: 'countDocuments', label: 'count' },
      { value: 'distinct', label: 'distinct' },
    ],
    update: [
      { value: 'updateOne', label: 'update' },
      { value: 'updateMany', label: 'updateMany' },
    ],
    delete: [
      { value: 'deleteOne', label: 'delete' },
      { value: 'deleteMany', label: 'deleteMany' },
    ],
    aggregate: [],
  },
};

const PRISMA_UNSUPPORTED_ACTION_MESSAGES: Partial<Record<DatabaseAction, string>> = {
  aggregate:
    'Prisma provider does not support "aggregate" in this node. Switch provider to MongoDB for pipeline aggregation.',
  replaceOne:
    'Prisma provider does not support "replaceOne". Use "update" / "updateMany" with explicit fields.',
  findOneAndUpdate:
    'Prisma provider does not support "findOneAndUpdate". Use "update" and query the record separately if needed.',
  findOneAndDelete:
    'Prisma provider does not support "findOneAndDelete". Use "delete" and query the record separately if needed.',
};

export const resolveDbActionProvider = (
  requestedProvider: DbActionProviderSelection,
  fallbackProvider: DbActionProvider
): DbActionProvider =>
  requestedProvider === 'mongodb' || requestedProvider === 'prisma'
    ? requestedProvider
    : fallbackProvider;

export const getActionCategoryForAction = (action: DatabaseAction): DatabaseActionCategory =>
  ACTION_CATEGORY_BY_ACTION[action];

export const isProviderActionCategorySupported = (
  provider: DbActionProvider,
  category: DatabaseActionCategory
): boolean => CATEGORY_OPTIONS_BY_PROVIDER[provider].some((option) => option.value === category);

export const getProviderActionCategoryOptions = (
  provider: DbActionProvider
): LabeledOptionDto<DatabaseActionCategory>[] => CATEGORY_OPTIONS_BY_PROVIDER[provider];

export const getProviderActionOptions = (
  provider: DbActionProvider,
  category: DatabaseActionCategory
): ProviderActionOption[] => ACTION_OPTIONS_BY_PROVIDER[provider][category] ?? [];

export const isProviderActionSupported = (
  provider: DbActionProvider,
  action: DatabaseAction
): boolean => {
  const category = getActionCategoryForAction(action);
  return getProviderActionOptions(provider, category).some((option) => option.value === action);
};

export const getProviderSpecificActionLabel = (
  provider: DbActionProvider,
  action: DatabaseAction
): string => {
  const category = getActionCategoryForAction(action);
  const option = getProviderActionOptions(provider, category).find(
    (candidate) => candidate.value === action
  );
  return option?.label ?? action;
};

export const getUnsupportedProviderActionMessage = (
  provider: DbActionProvider,
  action: DatabaseAction
): string | null => {
  if (isProviderActionSupported(provider, action)) return null;
  if (provider === 'prisma') {
    return (
      PRISMA_UNSUPPORTED_ACTION_MESSAGES[action] ??
      `Prisma provider does not support "${action}" in this node.`
    );
  }
  return `MongoDB provider does not support "${action}" in this node.`;
};

export const getDefaultProviderAction = (
  provider: DbActionProvider,
  category: DatabaseActionCategory,
  single = false
): DatabaseAction => {
  const options = getProviderActionOptions(provider, category);
  if (category === 'read' && single) {
    const singleOption = options.find((option) => option.value === 'findOne');
    if (singleOption) return singleOption.value;
  }
  return options[0]?.value ?? 'find';
};

export const resolveProviderAction = (
  provider: DbActionProvider,
  category: DatabaseActionCategory,
  preferredAction: DatabaseAction | null | undefined,
  single = false
): DatabaseAction => {
  if (
    preferredAction &&
    getActionCategoryForAction(preferredAction) === category &&
    isProviderActionSupported(provider, preferredAction)
  ) {
    return preferredAction;
  }
  return getDefaultProviderAction(provider, category, single);
};
