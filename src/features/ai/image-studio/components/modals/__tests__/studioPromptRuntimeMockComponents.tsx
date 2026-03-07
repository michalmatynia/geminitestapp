import React from 'react';

export function MockStudioActionButtonRow({
  actions,
}: {
  actions: Array<{
    key: string;
    label: string;
    onClick: () => void;
    disabled?: boolean;
  }>;
}): React.JSX.Element {
  return (
    <div>
      {actions.map((action) => (
        <button key={action.key} type='button' onClick={action.onClick} disabled={action.disabled}>
          {action.label}
        </button>
      ))}
    </div>
  );
}

export function MockStudioPromptTextSection({
  id = 'prompt-text',
  label,
  onValueChange,
  value,
}: {
  id?: string;
  label: string;
  onValueChange: (value: string) => void;
  value: string;
}): React.JSX.Element {
  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <textarea id={id} value={value} onChange={(event) => onValueChange(event.target.value)} />
    </div>
  );
}
