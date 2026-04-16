import { z } from 'zod';

import type { ApiRouteHandler } from '@/shared/contracts/ui/api';
import { notFoundError } from '@/shared/errors/app-error';
import { optionalTrimmedQueryString } from '@/shared/lib/api/query-schema';

type OptionalTrimmedQueryField = 'connectionId' | 'inventoryId';

type RouteHandlers = {
  GET: ApiRouteHandler;
  POST: ApiRouteHandler;
};

type SettingQuerySchema<Field extends OptionalTrimmedQueryField> = z.ZodObject<
  Record<Field, ReturnType<typeof optionalTrimmedQueryString>>
>;

const buildSettingQuerySchema = <Field extends OptionalTrimmedQueryField>(
  fields: readonly Field[]
): SettingQuerySchema<Field> =>
  z.object(
    Object.fromEntries(fields.map((field) => [field, optionalTrimmedQueryString()])) as Record<
      Field,
      ReturnType<typeof optionalTrimmedQueryString>
    >
  );

const baseSettingQuerySchema = buildSettingQuerySchema(['connectionId', 'inventoryId']);
const connectionSettingQuerySchema = buildSettingQuerySchema(['connectionId']);

const resolveSettingRouteHandlers = (
  settingGroup: string,
  handlersBySetting: Record<string, RouteHandlers>,
  setting: string
): RouteHandlers => {
  const handlers = handlersBySetting[setting];
  if (handlers) {
    return handlers;
  }

  throw notFoundError(`Unknown ${settingGroup} setting: ${setting}`);
};

export { baseSettingQuerySchema, buildSettingQuerySchema, connectionSettingQuerySchema, resolveSettingRouteHandlers };
export type { RouteHandlers };
