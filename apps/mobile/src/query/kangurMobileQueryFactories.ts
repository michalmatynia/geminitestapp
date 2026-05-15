import type { QueryKey, UseQueryResult } from '@tanstack/react-query';

import {
  useMutationV2,
  useSingleQueryV2,
  type MutationFactoryV2Config,
  type SingleQueryConfigV2,
} from '@/shared/lib/query-factories-v2';
import type { MutationResult } from '@/shared/contracts/ui/queries';
import type { TanstackFactoryMeta } from '@/shared/lib/tanstack-factory-v2.types';

type KangurMobileFactoryMetaInput = Omit<TanstackFactoryMeta, 'domain' | 'samplingRate'> &
  Partial<Pick<TanstackFactoryMeta, 'domain' | 'samplingRate'>>;

type KangurMobileQueryConfig<
  TData,
  TTransformedData = TData,
  TQueryKey extends QueryKey = QueryKey,
> = Omit<SingleQueryConfigV2<TData, TTransformedData, TQueryKey>, 'meta'> & {
  meta: KangurMobileFactoryMetaInput;
};

type KangurMobileMutationConfig<
  TData,
  TVariables,
  TContext = unknown,
  TError = Error,
> = Omit<MutationFactoryV2Config<TData, TVariables, TError, TContext>, 'meta'> & {
  meta: KangurMobileFactoryMetaInput;
};

const toKangurMobileFactoryMeta = (
  meta: KangurMobileFactoryMetaInput,
): TanstackFactoryMeta => ({
  ...meta,
  domain: meta.domain ?? 'kangur',
  samplingRate: meta.samplingRate ?? 0,
});

export function useKangurMobileQueryV2<
  TData,
  TTransformedData = TData,
  TQueryKey extends QueryKey = QueryKey,
>(
  config: KangurMobileQueryConfig<TData, TTransformedData, TQueryKey>,
): UseQueryResult<TTransformedData, Error> {
  return useSingleQueryV2<TData, TTransformedData, TQueryKey>({
    ...config,
    meta: toKangurMobileFactoryMeta(config.meta),
  });
}

export function useKangurMobileMutationV2<
  TData,
  TVariables,
  TContext = unknown,
  TError = Error,
>(
  config: KangurMobileMutationConfig<TData, TVariables, TContext, TError>,
): MutationResult<TData, TVariables, TError> {
  return useMutationV2<TData, TVariables, TContext, TError>({
    ...config,
    meta: toKangurMobileFactoryMeta(config.meta),
  });
}
