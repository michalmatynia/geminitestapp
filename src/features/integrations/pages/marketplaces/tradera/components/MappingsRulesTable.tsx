'use client';

import { Trash2 } from 'lucide-react';
import React from 'react';

import type { TraderaParameterMapperRule } from '@/shared/contracts/integrations/tradera-parameter-mapper';
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/primitives.public';
import { buildCategoryOptionLabel } from './tradera-mapping-utils';

export interface MappingsRulesTableProps {
  rules: TraderaParameterMapperRule[];
  ruleStatuses: Map<string, { label: string; tone: 'default' | 'warning' }>;
  onReview: (rule: TraderaParameterMapperRule) => void;
  onDelete: (ruleId: string) => Promise<void>;
  isDeleting: boolean;
}

export function MappingsRulesTable({
  rules,
  ruleStatuses,
  onReview,
  onDelete,
  isDeleting,
}: MappingsRulesTableProps): React.JSX.Element {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tradera Category</TableHead>
          <TableHead>Field</TableHead>
          <TableHead>Product Parameter</TableHead>
          <TableHead>Source Value</TableHead>
          <TableHead>Target Option</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className='w-[120px] text-right'>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rules.map((rule) => {
          const ruleStatus = ruleStatuses.get(rule.id) ?? {
            label: 'Unknown',
            tone: 'warning' as const,
          };

          return (
            <TableRow key={rule.id}>
              <TableCell className='align-top'>
                {buildCategoryOptionLabel(rule)}
              </TableCell>
              <TableCell className='align-top'>{rule.fieldLabel}</TableCell>
              <TableCell className='align-top'>
                <div>{rule.parameterName}</div>
                <div className='text-xs text-muted-foreground'>
                  {rule.parameterCatalogId}
                </div>
              </TableCell>
              <TableCell className='align-top'>{rule.sourceValue}</TableCell>
              <TableCell className='align-top'>{rule.targetOptionLabel}</TableCell>
              <TableCell
                className={
                  ruleStatus.tone === 'warning'
                    ? 'align-top text-sm text-amber-600'
                    : 'align-top text-sm text-muted-foreground'
                }
              >
                {ruleStatus.label}
              </TableCell>
              <TableCell className='text-right align-top'>
                <div className='flex justify-end gap-2'>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => onReview(rule)}
                  >
                    Review
                  </Button>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => void onDelete(rule.id)}
                    loading={isDeleting}
                  >
                    <Trash2 className='h-4 w-4' />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
