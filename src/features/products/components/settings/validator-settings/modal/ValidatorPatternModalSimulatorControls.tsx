'use client';

import React from 'react';

import type {
  ValidatorPatternSimulatorInput,
  ValidatorSettingsController,
} from '@/shared/contracts/products/drafts';
import { FormField } from '@/shared/ui/form-section';
import { Input } from '@/shared/ui/input';
import { SelectSimple } from '@/shared/ui/select-simple';
import { Textarea } from '@/shared/ui/textarea';

const VALIDATION_SCOPE_OPTIONS = [
  { value: 'draft_template', label: 'Draft Template' },
  { value: 'product_create', label: 'Product Create' },
  { value: 'product_edit', label: 'Product Edit' },
] as const;

type SimulatorControlsProps = Pick<
  ValidatorSettingsController,
  | 'simulatorScope'
  | 'setSimulatorScope'
  | 'simulatorValues'
  | 'setSimulatorValue'
  | 'simulatorCategoryFixtures'
  | 'setSimulatorCategoryFixtures'
> & {
  simulatorInputs: ValidatorPatternSimulatorInput[];
  target: string;
  categoryFixturesLabel: string;
  categoryFixturesDescription: string;
  categoryFixturesPlaceholder: string;
};

function ValidationScopeField(props: {
  simulatorScope: ValidatorSettingsController['simulatorScope'];
  setSimulatorScope: ValidatorSettingsController['setSimulatorScope'];
}): React.JSX.Element {
  return (
    <FormField label='Validation Scope'>
      <SelectSimple
        size='sm'
        value={props.simulatorScope}
        onValueChange={(value: string): void =>
          props.setSimulatorScope(value as ValidatorSettingsController['simulatorScope'])
        }
        options={[...VALIDATION_SCOPE_OPTIONS]}
        ariaLabel='Validation Scope'
        title='Validation Scope'
      />
    </FormField>
  );
}

function SimulatorInputField(props: {
  input: ValidatorPatternSimulatorInput;
  value: string;
  setSimulatorValue: ValidatorSettingsController['setSimulatorValue'];
}): React.JSX.Element {
  return (
    <FormField label={props.input.label}>
      <Input
        className='h-9'
        value={props.value}
        onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
          props.setSimulatorValue(props.input.key, event.target.value)
        }
        placeholder={props.input.placeholder}
        aria-label={props.input.label}
        title={props.input.label}
      />
    </FormField>
  );
}

function CategoryFixturesField(props: {
  label: string;
  description: string;
  placeholder: string;
  value: string;
  setValue: ValidatorSettingsController['setSimulatorCategoryFixtures'];
}): React.JSX.Element {
  return (
    <FormField label={props.label} description={props.description}>
      <Textarea
        className='min-h-[88px] font-mono text-[12px]'
        value={props.value}
        onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
          props.setValue(event.target.value)
        }
        placeholder={props.placeholder}
        aria-label={props.label}
        title={props.label}
      />
    </FormField>
  );
}

export function ValidatorPatternModalSimulatorControls(
  props: SimulatorControlsProps
): React.JSX.Element {
  return (
    <>
      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
        <ValidationScopeField
          simulatorScope={props.simulatorScope}
          setSimulatorScope={props.setSimulatorScope}
        />
        {props.simulatorInputs.map((input) => (
          <SimulatorInputField
            key={input.key}
            input={input}
            value={props.simulatorValues[input.key] ?? ''}
            setSimulatorValue={props.setSimulatorValue}
          />
        ))}
      </div>

      {props.target === 'category' ? (
        <CategoryFixturesField
          label={props.categoryFixturesLabel}
          description={props.categoryFixturesDescription}
          placeholder={props.categoryFixturesPlaceholder}
          value={props.simulatorCategoryFixtures}
          setValue={props.setSimulatorCategoryFixtures}
        />
      ) : null}
    </>
  );
}
