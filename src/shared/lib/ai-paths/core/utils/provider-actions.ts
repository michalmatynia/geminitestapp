import type { DatabaseAction, DatabaseActionCategory } from '@/shared/contracts/ai-paths';
import type { AppProviderValue as DbActionProvider } from '@/shared/contracts/system';
import type { LabeledOptionDto } from '@/shared/contracts/ui';

export type DbActionProviderSelection = 'auto' | 'mongodb' | undefined;
export type { DbActionProvider };

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

const CATEGORY_OPTIONS: LabeledOptionDto<DatabaseActionCategory>[] = [
  { value: 'create', label: 'Create' },
  { value: 'read', label: 'Read' },
  { value: 'update', label: 'Update' },
  { value: 'delete', label: 'Delete' },
  { value: 'aggregate', label: 'Aggregate' },
];

const ACTION_OPTIONS_BY_CATEGORY: Record<DatabaseActionCategory, ProviderActionOption[]> = {
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
};

export const resolveDbActionProvider = (
  requestedProvider: DbActionProviderSelection,
  fallbackProvider: DbActionProvider
): DbActionProvider =>
  requestedProvider === 'mongodb' ? requestedProvider : fallbackProvider;

export const getActionCategoryForAction = (action: DatabaseAction): DatabaseActionCategory =>
  ACTION_CATEGORY_BY_ACTION[action];

export const isProviderActionCategorySupported = (
  _provider: DbActionProvider,
  category: DatabaseActionCategory
): boolean => CATEGORY_OPTIONS.some((option) => option.value === category);

export const getProviderActionCategoryOptions = (
  _provider: DbActionProvider
): LabeledOptionDto<DatabaseActionCategory>[] => CATEGORY_OPTIONS;

export const getProviderActionOptions = (
  _provider: DbActionProvider,
  category: DatabaseActionCategory
): ProviderActionOption[] => ACTION_OPTIONS_BY_CATEGORY[category] ?? [];

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
