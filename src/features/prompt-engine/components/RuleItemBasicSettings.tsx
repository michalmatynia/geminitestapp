import React from 'react';

import type { PromptValidationRule, PromptValidationScope } from '@/shared/lib/prompt-engine/settings';
import { FormField, MultiSelect, SelectSimple } from '@/shared/ui/forms-and-actions.public';
import { Input, Textarea } from '@/shared/ui/primitives.public';

import {
  compileRegex,
  normalizeRuleKind,
  normalizeRuleScopes,
  SCOPE_OPTIONS,
} from './rule-item-utils';
import { useRuleItemContext } from './context/RuleItemContext';
import { usePromptEngineActions } from '../context/PromptEngineContext';
import { RULE_KIND_OPTIONS, RULE_SEVERITY_OPTIONS } from './RuleItem.constants';

type RuleKindChangeHandler = (value: string) => void;
type RuleTextHandler = (value: string) => void;

const getRegexStatus = (rule: PromptValidationRule | null): ReturnType<typeof compileRegex> => {
  if (rule?.kind !== 'regex') return null;
  return compileRegex(rule.pattern, rule.flags);
};

const getRegexErrorMessage = (status: ReturnType<typeof compileRegex> | null): string => {
  if (!status || status.ok) return '';
  if (typeof status.error !== 'string') return '';
  return status.error;
};

type RuleItemKindFieldProps = {
  ruleKind: PromptValidationRule['kind'];
  onValueChange: RuleKindChangeHandler;
};

function RuleItemKindField({ ruleKind, onValueChange }: RuleItemKindFieldProps): React.JSX.Element {
  return (
    <FormField label='Kind'>
      <SelectSimple
        size='sm'
        value={ruleKind}
        onValueChange={onValueChange}
        options={RULE_KIND_OPTIONS}
        ariaLabel='Kind'
        title='Kind'
      />
    </FormField>
  );
}

type RuleItemSeverityFieldProps = {
  severity: PromptValidationRule['severity'];
  onValueChange: (value: string) => void;
};

function RuleItemSeverityField({
  severity,
  onValueChange,
}: RuleItemSeverityFieldProps): React.JSX.Element {
  return (
    <FormField label='Severity'>
      <SelectSimple
        size='sm'
        value={severity}
        onValueChange={onValueChange}
        options={RULE_SEVERITY_OPTIONS}
        ariaLabel='Severity'
        title='Severity'
      />
    </FormField>
  );
}

type RuleItemInputFieldProps = {
  label: string;
  className?: string;
  value: string;
  ariaLabel: string;
  title: string;
  onChange: RuleTextHandler;
  isTextarea?: boolean;
  textAreaClassName?: string;
};

function RuleItemInputField({
  label,
  className = '',
  value,
  ariaLabel,
  title,
  onChange,
  isTextarea = false,
  textAreaClassName = '',
}: RuleItemInputFieldProps): React.JSX.Element {
  if (isTextarea) {
    return (
      <FormField label={label} className='md:col-span-4'>
        <Textarea
          className={textAreaClassName}
          value={value}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void => onChange(event.target.value)}
          aria-label={ariaLabel}
          title={title}
        />
      </FormField>
    );
  }
  return (
    <FormField label={label} className={className}>
      <Input
        className='h-8'
        value={value}
        onChange={(event: React.ChangeEvent<HTMLInputElement>): void => onChange(event.target.value)}
        aria-label={ariaLabel}
        title={title}
      />
    </FormField>
  );
}

type RuleItemRegexFieldsProps = {
  pattern: string;
  flags: string;
  onPatternChange: RuleTextHandler;
  onFlagsChange: RuleTextHandler;
};

function RuleItemRegexFields({
  pattern,
  flags,
  onPatternChange,
  onFlagsChange,
}: RuleItemRegexFieldsProps): React.JSX.Element {
  return (
    <>
      <RuleItemInputField
        label='Pattern'
        className='md:col-span-3'
        value={pattern}
        ariaLabel='Pattern'
        title='Pattern'
        onChange={onPatternChange}
      />
      <RuleItemInputField
        label='Flags'
        value={flags}
        ariaLabel='Flags'
        title='Flags'
        onChange={onFlagsChange}
      />
    </>
  );
}

type RuleItemScopesFieldProps = {
  appliesToScopes: PromptValidationScope[];
  onScopesChange: (values: string[]) => void;
};

function RuleItemScopesField({
  appliesToScopes,
  onScopesChange,
}: RuleItemScopesFieldProps): React.JSX.Element {
  return (
    <FormField label='Validation Scopes' className='md:col-span-4'>
      <MultiSelect
        options={SCOPE_OPTIONS}
        selected={appliesToScopes}
        onChange={onScopesChange}
        placeholder='All scopes'
        searchPlaceholder='Search scope...'
        emptyMessage='No scope found.'
      />
    </FormField>
  );
}

type RuleItemKindAndSeveritySectionProps = {
  ruleKind: PromptValidationRule['kind'];
  ruleSeverity: PromptValidationRule['severity'];
  onKindChange: RuleKindChangeHandler;
  onSeverityChange: (value: string) => void;
};

function RuleItemKindAndSeveritySection({
  ruleKind,
  ruleSeverity,
  onKindChange,
  onSeverityChange,
}: RuleItemKindAndSeveritySectionProps): React.JSX.Element {
  return (
    <>
      <RuleItemKindField ruleKind={ruleKind} onValueChange={onKindChange} />
      <RuleItemSeverityField severity={ruleSeverity} onValueChange={onSeverityChange} />
    </>
  );
}

type RuleItemTextSectionProps = {
  ruleId: string;
  ruleTitle: string;
  ruleDescription: string | null;
  ruleMessage: string;
  onIdChange: (value: string) => void;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onMessageChange: (value: string) => void;
};

function RuleItemTextSection({
  ruleId,
  ruleTitle,
  ruleDescription,
  ruleMessage,
  onIdChange,
  onTitleChange,
  onDescriptionChange,
  onMessageChange,
}: RuleItemTextSectionProps): React.JSX.Element {
  return (
    <>
      <RuleItemInputField
        label='Rule ID'
        className='md:col-span-2'
        value={ruleId}
        ariaLabel='Rule ID'
        title='Rule ID'
        onChange={onIdChange}
      />
      <RuleItemInputField
        label='Title'
        className='md:col-span-2'
        value={ruleTitle}
        ariaLabel='Title'
        title='Title'
        onChange={onTitleChange}
      />
      <RuleItemInputField
        label='Description'
        className='md:col-span-2'
        value={ruleDescription ?? ''}
        ariaLabel='Description'
        title='Description'
        onChange={onDescriptionChange}
      />
      <RuleItemInputField
        label='Message'
        isTextarea
        textAreaClassName='min-h-[72px] text-[12px]'
        value={ruleMessage}
        ariaLabel='Message'
        title='Message'
        onChange={onMessageChange}
      />
    </>
  );
}

type RuleItemBasicSettingsContentProps = {
  rule: PromptValidationRule;
  appliesToScopes: PromptValidationScope[];
  showRegexError: boolean;
  regexErrorMessage: string;
  onKindChange: RuleKindChangeHandler;
  onSeverityChange: (value: string) => void;
  onIdChange: (value: string) => void;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onMessageChange: (value: string) => void;
  onPatternChange: RuleTextHandler;
  onFlagsChange: RuleTextHandler;
  onScopesChange: (values: string[]) => void;
};

function RuleItemBasicSettingsContent({
  rule,
  appliesToScopes,
  showRegexError,
  regexErrorMessage,
  onKindChange,
  onSeverityChange,
  onIdChange,
  onTitleChange,
  onDescriptionChange,
  onMessageChange,
  onPatternChange,
  onFlagsChange,
  onScopesChange,
}: RuleItemBasicSettingsContentProps): React.JSX.Element {
  return (
    <div className='grid gap-3 md:grid-cols-4'>
      <RuleItemKindAndSeveritySection
        ruleKind={rule.kind}
        ruleSeverity={rule.severity}
        onKindChange={onKindChange}
        onSeverityChange={onSeverityChange}
      />
      <RuleItemTextSection
        ruleId={rule.id}
        ruleTitle={rule.title}
        ruleDescription={rule.description}
        ruleMessage={rule.message}
        onIdChange={onIdChange}
        onTitleChange={onTitleChange}
        onDescriptionChange={onDescriptionChange}
        onMessageChange={onMessageChange}
      />
      {rule.kind === 'regex' ? (
        <RuleItemRegexFields
          pattern={rule.pattern}
          flags={rule.flags}
          onPatternChange={onPatternChange}
          onFlagsChange={onFlagsChange}
        />
      ) : null}
      {showRegexError ? <div className='md:col-span-4 text-xs text-red-300'>Regex error: {regexErrorMessage}</div> : null}
      <RuleItemScopesField
        appliesToScopes={appliesToScopes}
        onScopesChange={onScopesChange}
      />
    </div>
  );
}

export function RuleItemBasicSettings(): React.JSX.Element | null {
  const { draft, rule, patchRule } = useRuleItemContext();
  const { handleRuleTextChange } = usePromptEngineActions();

  if (!rule) return null;

  const appliesToScopes = normalizeRuleScopes(rule.appliesToScopes);
  const regexStatus = getRegexStatus(rule);
  const regexErrorMessage = getRegexErrorMessage(regexStatus);
  const showRegexError = regexStatus?.ok === false;

  const handleKindChange = (value: string): void => {
    const nextKind = normalizeRuleKind(value);
    if (nextKind === rule.kind) return;
      if (nextKind === 'regex') {
        const nextRule: PromptValidationRule = {
          ...rule,
          kind: 'regex',
          pattern: '^$',
        flags: 'mi',
      };
      handleRuleTextChange(draft.uid, JSON.stringify(nextRule, null, 2));
        return;
      }

      const { pattern, flags, ...nextRule } = rule;
      handleRuleTextChange(
        draft.uid,
        JSON.stringify(
        {
          ...nextRule,
          kind: 'params_object',
        },
        null,
        2
      )
    );
  };

  const handleSeverityChange = (value: string): void => {
    if (value !== 'error' && value !== 'warning' && value !== 'info') return;
    patchRule({ severity: value });
  };

  const handleScopesChange = (values: string[]): void => {
    patchRule({
      appliesToScopes: normalizeRuleScopes(values as PromptValidationScope[]),
    });
  };

  const handleDescriptionChange = (value: string): void => {
    const normalized = value.trim();
    patchRule({ description: normalized === '' ? null : normalized });
  };

  return (
    <RuleItemBasicSettingsContent
      rule={rule}
      appliesToScopes={appliesToScopes}
      showRegexError={showRegexError}
      regexErrorMessage={regexErrorMessage}
      onKindChange={handleKindChange}
      onSeverityChange={handleSeverityChange}
      onIdChange={(value: string): void => patchRule({ id: value })}
      onTitleChange={(value: string): void => patchRule({ title: value })}
      onDescriptionChange={handleDescriptionChange}
      onMessageChange={(value: string): void => patchRule({ message: value })}
      onPatternChange={(value: string): void => patchRule({ pattern: value })}
      onFlagsChange={(value: string): void => patchRule({ flags: value })}
      onScopesChange={handleScopesChange}
    />
  );
}
