'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus, RefreshCw, Trash2 } from 'lucide-react';

import { isTraderaBrowserIntegrationSlug } from '@/features/integrations/constants/slugs';
import { useIntegrationConnections, useIntegrations } from '@/features/integrations/hooks/useIntegrationQueries';
import { useUpsertConnection } from '@/features/integrations/hooks/useIntegrationMutations';
import { useIntegrationCatalogs } from '@/features/integrations/hooks/useIntegrationProductQueries';
import {
  useFetchTraderaParameterMapperCatalogMutation,
  useTraderaParameterMapperParameters,
} from '@/features/integrations/hooks/useTraderaParameterMapper';
import { useExternalCategories } from '@/features/integrations/hooks/useMarketplaceQueries';
import {
  buildTraderaParameterMapperFieldKey,
  parseTraderaParameterMapperCatalogJson,
  parseTraderaParameterMapperRulesJson,
  serializeTraderaParameterMapperRules,
} from '@/features/integrations/services/tradera-listing/parameter-mapper';
import type { Integration } from '@/shared/contracts/integrations/base';
import type { IntegrationConnection } from '@/shared/contracts/integrations/connections';
import type { ExternalCategory } from '@/shared/contracts/integrations/listings';
import type {
  TraderaParameterMapperCatalogEntry,
  TraderaParameterMapperRule,
} from '@/shared/contracts/integrations/tradera-parameter-mapper';
import type { CatalogRecord } from '@/shared/contracts/products/catalogs';
import type { ProductParameter } from '@/shared/contracts/products/parameters';
import {
  CompactEmptyState,
  LoadingState,
  SectionHeader,
  UI_GRID_RELAXED_CLASSNAME,
  UI_GRID_ROOMY_CLASSNAME,
} from '@/shared/ui/navigation-and-layout.public';
import { FormField, SelectSimple } from '@/shared/ui/forms-and-actions.public';
import {
  Alert,
  Button,
  Card,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  useToast,
} from '@/shared/ui/primitives.public';

type MapperTab = 'mappings' | 'catalogs';

const buildCategoryOptionLabel = (category: {
  externalCategoryPath?: string | null;
  externalCategoryName?: string | null;
  path?: string | null;
  name?: string | null;
}): string =>
  (
    category.externalCategoryPath ??
    category.path ??
    category.externalCategoryName ??
    category.name ??
    ''
  ).trim();

const createRuleId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `tradera-param-rule-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
};

const sortRules = (rules: TraderaParameterMapperRule[]): TraderaParameterMapperRule[] =>
  rules
    .slice()
    .sort(
      (left, right) =>
        new Date(right.updatedAt ?? 0).getTime() - new Date(left.updatedAt ?? 0).getTime()
    );

export default function TraderaParameterMappingPage(): React.JSX.Element {
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<MapperTab>('mappings');
  const [selectedConnectionId, setSelectedConnectionId] = useState('');
  const [selectedCatalogId, setSelectedCatalogId] = useState('');
  const [selectedCatalogParameterId, setSelectedCatalogParameterId] = useState('');
  const [selectedMappingCategoryId, setSelectedMappingCategoryId] = useState('');
  const [selectedMappingFieldId, setSelectedMappingFieldId] = useState('');
  const [selectedFetchCategoryId, setSelectedFetchCategoryId] = useState('');
  const [sourceValue, setSourceValue] = useState('');
  const [targetOptionLabel, setTargetOptionLabel] = useState('');

  const integrationsQuery = useIntegrations();
  const catalogsQuery = useIntegrationCatalogs();
  const upsertConnectionMutation = useUpsertConnection();
  const fetchCatalogMutation = useFetchTraderaParameterMapperCatalogMutation();

  const traderaIntegration = useMemo(
    (): Integration | null =>
      integrationsQuery.data?.find((integration) => isTraderaBrowserIntegrationSlug(integration.slug)) ??
      null,
    [integrationsQuery.data]
  );

  const connectionsQuery = useIntegrationConnections(traderaIntegration?.id, {
    enabled: Boolean(traderaIntegration?.id),
  });

  useEffect(() => {
    const requestedConnectionId = searchParams.get('connectionId')?.trim() ?? '';
    if (selectedConnectionId) {
      return;
    }

    const availableConnections = connectionsQuery.data ?? [];
    if (requestedConnectionId) {
      const requestedExists = availableConnections.some(
        (connection) => connection.id === requestedConnectionId
      );
      if (requestedExists) {
        setSelectedConnectionId(requestedConnectionId);
        return;
      }
    }

    if (availableConnections[0]?.id) {
      setSelectedConnectionId(availableConnections[0].id);
    }
  }, [connectionsQuery.data, searchParams, selectedConnectionId]);

  const selectedConnection = useMemo(
    (): IntegrationConnection | null =>
      connectionsQuery.data?.find((connection) => connection.id === selectedConnectionId) ?? null,
    [connectionsQuery.data, selectedConnectionId]
  );

  const externalCategoriesQuery = useExternalCategories(selectedConnectionId);
  const externalCategories = useMemo(
    (): ExternalCategory[] => externalCategoriesQuery.data ?? [],
    [externalCategoriesQuery.data]
  );
  const leafExternalCategories = useMemo(
    (): ExternalCategory[] =>
      externalCategories.filter((category) => category.isLeaf !== false && category.externalId.trim()),
    [externalCategories]
  );

  const parameterCatalogEntries = useMemo(
    (): TraderaParameterMapperCatalogEntry[] =>
      parseTraderaParameterMapperCatalogJson(selectedConnection?.traderaParameterMapperCatalogJson),
    [selectedConnection?.traderaParameterMapperCatalogJson]
  );
  const parameterMapperRules = useMemo(
    (): TraderaParameterMapperRule[] =>
      parseTraderaParameterMapperRulesJson(selectedConnection?.traderaParameterMapperRulesJson),
    [selectedConnection?.traderaParameterMapperRulesJson]
  );

  const mappingCategories = useMemo(() => {
    const byCategoryId = new Map<
      string,
      {
        externalCategoryId: string;
        externalCategoryName: string;
        externalCategoryPath: string | null;
      }
    >();

    parameterCatalogEntries.forEach((entry) => {
      if (byCategoryId.has(entry.externalCategoryId)) return;
      byCategoryId.set(entry.externalCategoryId, {
        externalCategoryId: entry.externalCategoryId,
        externalCategoryName: entry.externalCategoryName,
        externalCategoryPath: entry.externalCategoryPath ?? null,
      });
    });

    return Array.from(byCategoryId.values()).sort((left, right) =>
      buildCategoryOptionLabel(left).localeCompare(buildCategoryOptionLabel(right))
    );
  }, [parameterCatalogEntries]);

  useEffect(() => {
    if (!mappingCategories.length) {
      setSelectedMappingCategoryId('');
      return;
    }

    const currentExists = mappingCategories.some(
      (category) => category.externalCategoryId === selectedMappingCategoryId
    );
    if (!currentExists) {
      setSelectedMappingCategoryId(mappingCategories[0]?.externalCategoryId ?? '');
    }
  }, [mappingCategories, selectedMappingCategoryId]);

  const mappingFieldEntries = useMemo(
    (): TraderaParameterMapperCatalogEntry[] =>
      parameterCatalogEntries.filter(
        (entry) => entry.externalCategoryId === selectedMappingCategoryId
      ),
    [parameterCatalogEntries, selectedMappingCategoryId]
  );

  useEffect(() => {
    if (!mappingFieldEntries.length) {
      setSelectedMappingFieldId('');
      return;
    }

    const currentExists = mappingFieldEntries.some((entry) => entry.id === selectedMappingFieldId);
    if (!currentExists) {
      setSelectedMappingFieldId(mappingFieldEntries[0]?.id ?? '');
    }
  }, [mappingFieldEntries, selectedMappingFieldId]);

  useEffect(() => {
    const catalogs = catalogsQuery.data ?? [];
    if (!catalogs.length) {
      setSelectedCatalogId('');
      return;
    }

    const currentExists = catalogs.some((catalog) => catalog.id === selectedCatalogId);
    if (!currentExists) {
      const defaultCatalog = catalogs.find((catalog) => catalog.isDefault) ?? catalogs[0] ?? null;
      setSelectedCatalogId(defaultCatalog?.id ?? '');
    }
  }, [catalogsQuery.data, selectedCatalogId]);

  const selectedCatalog = useMemo(
    (): CatalogRecord | null =>
      catalogsQuery.data?.find((catalog) => catalog.id === selectedCatalogId) ?? null,
    [catalogsQuery.data, selectedCatalogId]
  );

  const parametersQuery = useTraderaParameterMapperParameters(selectedCatalogId || null);
  const parameters = useMemo(
    (): ProductParameter[] => parametersQuery.data ?? [],
    [parametersQuery.data]
  );

  useEffect(() => {
    if (!parameters.length) {
      setSelectedCatalogParameterId('');
      return;
    }

    const currentExists = parameters.some((parameter) => parameter.id === selectedCatalogParameterId);
    if (!currentExists) {
      setSelectedCatalogParameterId(parameters[0]?.id ?? '');
    }
  }, [parameters, selectedCatalogParameterId]);

  useEffect(() => {
    if (!leafExternalCategories.length) {
      setSelectedFetchCategoryId('');
      return;
    }

    const currentExists = leafExternalCategories.some(
      (category) => category.externalId === selectedFetchCategoryId
    );
    if (!currentExists) {
      setSelectedFetchCategoryId(leafExternalCategories[0]?.externalId ?? '');
    }
  }, [leafExternalCategories, selectedFetchCategoryId]);

  const selectedMappingField = useMemo(
    (): TraderaParameterMapperCatalogEntry | null =>
      mappingFieldEntries.find((entry) => entry.id === selectedMappingFieldId) ?? null,
    [mappingFieldEntries, selectedMappingFieldId]
  );
  const selectedParameter = useMemo(
    (): ProductParameter | null =>
      parameters.find((parameter) => parameter.id === selectedCatalogParameterId) ?? null,
    [parameters, selectedCatalogParameterId]
  );

  const handlePersistRules = async (nextRules: TraderaParameterMapperRule[]): Promise<void> => {
    if (!selectedConnection || !traderaIntegration) {
      return;
    }

    await upsertConnectionMutation.mutateAsync({
      integrationId: traderaIntegration.id,
      connectionId: selectedConnection.id,
      payload: {
        name: selectedConnection.name,
        traderaParameterMapperRulesJson: serializeTraderaParameterMapperRules(nextRules),
      },
    });
  };

  const handleAddRule = async (): Promise<void> => {
    if (!selectedConnection || !selectedCatalog || !selectedParameter || !selectedMappingField) {
      toast('Select a Tradera field, catalog, and product parameter before saving a rule.', {
        variant: 'error',
      });
      return;
    }

    const normalizedSourceValue = sourceValue.trim();
    if (!normalizedSourceValue) {
      toast('Enter the product parameter value that should trigger this mapping.', {
        variant: 'error',
      });
      return;
    }

    const normalizedTargetOption = targetOptionLabel.trim();
    if (!normalizedTargetOption) {
      toast('Choose the Tradera dropdown option to apply.', {
        variant: 'error',
      });
      return;
    }

    const now = new Date().toISOString();
    const existingRuleIndex = parameterMapperRules.findIndex(
      (rule) =>
        rule.externalCategoryId === selectedMappingField.externalCategoryId &&
        rule.fieldKey === selectedMappingField.fieldKey &&
        rule.parameterId === selectedParameter.id &&
        rule.parameterCatalogId === selectedCatalog.id &&
        rule.sourceValue.trim().toLowerCase() === normalizedSourceValue.toLowerCase()
    );

    const nextRule: TraderaParameterMapperRule = {
      id:
        existingRuleIndex >= 0
          ? parameterMapperRules[existingRuleIndex]?.id ?? createRuleId()
          : createRuleId(),
      externalCategoryId: selectedMappingField.externalCategoryId,
      externalCategoryName: selectedMappingField.externalCategoryName,
      externalCategoryPath: selectedMappingField.externalCategoryPath ?? null,
      fieldLabel: selectedMappingField.fieldLabel,
      fieldKey:
        selectedMappingField.fieldKey || buildTraderaParameterMapperFieldKey(selectedMappingField.fieldLabel),
      parameterId: selectedParameter.id,
      parameterName: selectedParameter.name_en || selectedParameter.name || selectedParameter.id,
      parameterCatalogId: selectedCatalog.id,
      sourceValue: normalizedSourceValue,
      targetOptionLabel: normalizedTargetOption,
      isActive: true,
      createdAt:
        existingRuleIndex >= 0
          ? parameterMapperRules[existingRuleIndex]?.createdAt ?? now
          : now,
      updatedAt: now,
    };

    const nextRules =
      existingRuleIndex >= 0
        ? sortRules(
            parameterMapperRules.map((rule, index) =>
              index === existingRuleIndex ? nextRule : rule
            )
          )
        : sortRules([nextRule, ...parameterMapperRules]);

    try {
      await handlePersistRules(nextRules);
      setSourceValue('');
      toast('Tradera parameter mapping saved.', { variant: 'success' });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to save mapping rule.', {
        variant: 'error',
      });
    }
  };

  const handleDeleteRule = async (ruleId: string): Promise<void> => {
    try {
      const nextRules = parameterMapperRules.filter((rule) => rule.id !== ruleId);
      await handlePersistRules(nextRules);
      toast('Tradera parameter mapping removed.', { variant: 'success' });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to remove mapping rule.', {
        variant: 'error',
      });
    }
  };

  const handleFetchCatalog = async (externalCategoryId: string): Promise<void> => {
    if (!selectedConnection) {
      return;
    }

    try {
      const result = await fetchCatalogMutation.mutateAsync({
        connectionId: selectedConnection.id,
        externalCategoryId,
      });
      await connectionsQuery.refetch();
      toast(result.message, {
        variant: result.entries.length > 0 ? 'success' : 'info',
      });
      if (result.entries[0]?.externalCategoryId) {
        setSelectedMappingCategoryId(result.entries[0].externalCategoryId);
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to fetch Tradera field catalog.', {
        variant: 'error',
      });
    }
  };

  const connectionOptions = useMemo(
    () =>
      (connectionsQuery.data ?? []).map((connection) => ({
        value: connection.id,
        label: connection.name,
      })),
    [connectionsQuery.data]
  );
  const mappingCategoryOptions = useMemo(
    () =>
      mappingCategories.map((category) => ({
        value: category.externalCategoryId,
        label: buildCategoryOptionLabel(category),
      })),
    [mappingCategories]
  );
  const mappingFieldOptions = useMemo(
    () =>
      mappingFieldEntries.map((entry) => ({
        value: entry.id,
        label: entry.fieldLabel,
      })),
    [mappingFieldEntries]
  );
  const fetchCategoryOptions = useMemo(
    () =>
      leafExternalCategories.map((category) => ({
        value: category.externalId,
        label: buildCategoryOptionLabel(category),
      })),
    [leafExternalCategories]
  );
  const catalogOptions = useMemo(
    () =>
      (catalogsQuery.data ?? []).map((catalog) => ({
        value: catalog.id,
        label: catalog.name,
      })),
    [catalogsQuery.data]
  );
  const parameterOptions = useMemo(
    () =>
      parameters.map((parameter) => ({
        value: parameter.id,
        label: parameter.name_en || parameter.name || parameter.id,
      })),
    [parameters]
  );
  const targetOptionChoices = useMemo(
    () =>
      (selectedMappingField?.optionLabels ?? []).map((optionLabel) => ({
        value: optionLabel,
        label: optionLabel,
      })),
    [selectedMappingField?.optionLabels]
  );

  const isLoadingConnections =
    integrationsQuery.isLoading || (Boolean(traderaIntegration?.id) && connectionsQuery.isLoading);

  if (isLoadingConnections) {
    return <LoadingState message='Loading Tradera parameter mapper…' />;
  }

  if (!traderaIntegration) {
    return (
      <div className='page-section'>
        <CompactEmptyState
          title='Tradera integration unavailable'
          description='Create a browser Tradera integration first to configure additional listing-field mappings.'
        />
      </div>
    );
  }

  if ((connectionsQuery.data ?? []).length === 0) {
    return (
      <div className='page-section space-y-6'>
        <SectionHeader
          title='Tradera Parameter Mapper'
          description='Map category-specific Tradera dropdown fields to product parameters.'
        />
        <CompactEmptyState
          title='No Tradera connections'
          description='Add a browser Tradera connection before configuring parameter mappings.'
        />
      </div>
    );
  }

  return (
    <div className='page-section space-y-6'>
      <SectionHeader
        title='Tradera Parameter Mapper'
        description='Map category-specific Tradera dropdown fields like Jewellery Material to product parameter values, and manage the fetched dropdown catalogs per Tradera category.'
      />

      <Card variant='subtle' padding='lg' className='bg-card/40'>
        <div className={UI_GRID_RELAXED_CLASSNAME}>
          <FormField
            label='Tradera Connection'
            description='Mappings and fetched field catalogs are saved per browser Tradera connection.'
          >
            <SelectSimple
              value={selectedConnectionId}
              onValueChange={setSelectedConnectionId}
              options={connectionOptions}
              ariaLabel='Tradera connection'
              title='Tradera connection'
            />
          </FormField>
          <div className='rounded-lg border border-border/60 bg-background/20 p-4 text-sm text-muted-foreground'>
            <div className='font-medium text-foreground'>{selectedConnection?.name ?? 'No connection selected'}</div>
            <div className='mt-1'>
              {parameterMapperRules.length} mapping rule{parameterMapperRules.length === 1 ? '' : 's'}.
            </div>
            <div>
              {parameterCatalogEntries.length} fetched field catalog entr
              {parameterCatalogEntries.length === 1 ? 'y' : 'ies'}.
            </div>
          </div>
        </div>
      </Card>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as MapperTab)}>
        <TabsList className='grid w-full max-w-md grid-cols-2'>
          <TabsTrigger value='mappings'>Mappings</TabsTrigger>
          <TabsTrigger value='catalogs'>Field Catalogs</TabsTrigger>
        </TabsList>

        <TabsContent value='mappings' className='mt-6 space-y-6'>
          <Card variant='subtle' padding='lg' className='bg-card/40'>
            <div className='space-y-6'>
              <div className={UI_GRID_ROOMY_CLASSNAME + ' md:grid-cols-2 xl:grid-cols-3'}>
                <FormField
                  label='Tradera Category'
                  description='Only categories with fetched Tradera dropdown catalogs can be mapped here.'
                >
                  <SelectSimple
                    value={selectedMappingCategoryId}
                    onValueChange={setSelectedMappingCategoryId}
                    options={mappingCategoryOptions}
                    ariaLabel='Mapped Tradera category'
                    title='Mapped Tradera category'
                    disabled={mappingCategoryOptions.length === 0}
                  />
                </FormField>

                <FormField label='Additional Tradera Field'>
                  <SelectSimple
                    value={selectedMappingFieldId}
                    onValueChange={setSelectedMappingFieldId}
                    options={mappingFieldOptions}
                    ariaLabel='Tradera field'
                    title='Tradera field'
                    disabled={mappingFieldOptions.length === 0}
                  />
                </FormField>

                <FormField label='Product Catalog'>
                  <SelectSimple
                    value={selectedCatalogId}
                    onValueChange={setSelectedCatalogId}
                    options={catalogOptions}
                    ariaLabel='Product catalog'
                    title='Product catalog'
                    disabled={catalogOptions.length === 0}
                  />
                </FormField>

                <FormField label='Product Parameter'>
                  <SelectSimple
                    value={selectedCatalogParameterId}
                    onValueChange={setSelectedCatalogParameterId}
                    options={parameterOptions}
                    ariaLabel='Product parameter'
                    title='Product parameter'
                    disabled={!selectedCatalogId || parameterOptions.length === 0}
                  />
                </FormField>

                <FormField
                  label='When Product Value Equals'
                  description='Exact matching is used for the current v1 rule engine.'
                >
                  <Input
                    value={sourceValue}
                    onChange={(event) => setSourceValue(event.target.value)}
                    placeholder='Metal'
                    aria-label='Source value'
                    title='Source value'
                  />
                </FormField>

                <FormField label='Select Tradera Option'>
                  <SelectSimple
                    value={targetOptionLabel}
                    onValueChange={setTargetOptionLabel}
                    options={targetOptionChoices}
                    ariaLabel='Tradera option'
                    title='Tradera option'
                    disabled={targetOptionChoices.length === 0}
                  />
                </FormField>
              </div>

              {mappingCategoryOptions.length === 0 ? (
                <Alert variant='info'>
                  Fetch at least one Tradera field catalog in the <strong>Field Catalogs</strong> tab
                  before creating mapping rules.
                </Alert>
              ) : null}

              <div className='flex justify-end'>
                <Button
                  onClick={() => void handleAddRule()}
                  loading={upsertConnectionMutation.isPending}
                  disabled={!selectedMappingField || !selectedParameter}
                >
                  <Plus className='mr-2 h-4 w-4' />
                  Save Rule
                </Button>
              </div>
            </div>
          </Card>

          <Card variant='subtle' padding='lg' className='bg-card/40'>
            {parameterMapperRules.length === 0 ? (
              <CompactEmptyState
                title='No mapping rules yet'
                description='Create a rule to map a product parameter value to a Tradera dropdown option.'
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tradera Category</TableHead>
                    <TableHead>Field</TableHead>
                    <TableHead>Product Parameter</TableHead>
                    <TableHead>Source Value</TableHead>
                    <TableHead>Target Option</TableHead>
                    <TableHead className='w-[120px] text-right'>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parameterMapperRules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell className='align-top'>
                        {buildCategoryOptionLabel(rule)}
                      </TableCell>
                      <TableCell className='align-top'>{rule.fieldLabel}</TableCell>
                      <TableCell className='align-top'>
                        <div>{rule.parameterName}</div>
                        <div className='text-xs text-muted-foreground'>{rule.parameterCatalogId}</div>
                      </TableCell>
                      <TableCell className='align-top'>{rule.sourceValue}</TableCell>
                      <TableCell className='align-top'>{rule.targetOptionLabel}</TableCell>
                      <TableCell className='text-right align-top'>
                        <Button
                          variant='ghost'
                          size='sm'
                          onClick={() => void handleDeleteRule(rule.id)}
                          loading={upsertConnectionMutation.isPending}
                        >
                          <Trash2 className='h-4 w-4' />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value='catalogs' className='mt-6 space-y-6'>
          <Card variant='subtle' padding='lg' className='bg-card/40'>
            <div className='space-y-6'>
              <div className={UI_GRID_RELAXED_CLASSNAME}>
                <FormField
                  label='Tradera Category'
                  description='Select a leaf Tradera category and fetch the current additional dropdown fields exposed by the listing form.'
                >
                  <SelectSimple
                    value={selectedFetchCategoryId}
                    onValueChange={setSelectedFetchCategoryId}
                    options={fetchCategoryOptions}
                    ariaLabel='Fetch Tradera category'
                    title='Fetch Tradera category'
                    disabled={fetchCategoryOptions.length === 0}
                  />
                </FormField>
                <div className='flex items-end justify-end'>
                  <Button
                    variant='outline'
                    onClick={() => void handleFetchCatalog(selectedFetchCategoryId)}
                    loading={fetchCatalogMutation.isPending}
                    disabled={!selectedFetchCategoryId}
                  >
                    <RefreshCw className='mr-2 h-4 w-4' />
                    Fetch / Refetch Dropdowns
                  </Button>
                </div>
              </div>

              {externalCategoriesQuery.isLoading ? (
                <LoadingState message='Loading Tradera categories…' />
              ) : null}
            </div>
          </Card>

          <Card variant='subtle' padding='lg' className='bg-card/40'>
            {parameterCatalogEntries.length === 0 ? (
              <CompactEmptyState
                title='No fetched field catalogs'
                description='Fetch a Tradera category above to capture its additional dropdown fields and options.'
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tradera Category</TableHead>
                    <TableHead>Field</TableHead>
                    <TableHead>Available Options</TableHead>
                    <TableHead>Fetched</TableHead>
                    <TableHead className='w-[140px] text-right'>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parameterCatalogEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className='align-top'>
                        {buildCategoryOptionLabel(entry)}
                      </TableCell>
                      <TableCell className='align-top'>{entry.fieldLabel}</TableCell>
                      <TableCell className='align-top'>
                        <div className='line-clamp-3 text-sm'>
                          {entry.optionLabels.length > 0
                            ? entry.optionLabels.join(', ')
                            : 'No visible options detected'}
                        </div>
                      </TableCell>
                      <TableCell className='align-top text-sm text-muted-foreground'>
                        {new Date(entry.fetchedAt).toLocaleString()}
                      </TableCell>
                      <TableCell className='text-right align-top'>
                        <Button
                          variant='ghost'
                          size='sm'
                          onClick={() => void handleFetchCatalog(entry.externalCategoryId)}
                          loading={
                            fetchCatalogMutation.isPending &&
                            fetchCatalogMutation.variables?.externalCategoryId === entry.externalCategoryId
                          }
                        >
                          <RefreshCw className='mr-2 h-4 w-4' />
                          Refetch
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
