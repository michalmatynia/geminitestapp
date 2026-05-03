'use client';

import { useState } from 'react';

function LiveScripterFixtureShell({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <main
      style={{
        position: 'relative',
        margin: 0,
        minHeight: '1800px',
        width: '1280px',
        background: '#ffffff',
        color: '#0f172a',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {children}
    </main>
  );
}

function LiveScripterFixtureHeading(): React.JSX.Element {
  return (
    <h1
      id='fixture-title'
      style={{
        position: 'absolute',
        left: '40px',
        top: '32px',
        margin: 0,
        fontSize: '32px',
        fontWeight: 700,
      }}
    >
      Live Scripter Fixture
    </h1>
  );
}

function LiveScripterFixtureAction({
  onClick,
}: {
  onClick: () => void;
}): React.JSX.Element {
  return (
    <button
      id='fixture-action'
      data-testid='fixture-action'
      type='button'
      onClick={onClick}
      style={{
        position: 'absolute',
        left: '40px',
        top: '120px',
        width: '180px',
        height: '48px',
        border: 'none',
        borderRadius: '8px',
        background: '#2563eb',
        color: '#ffffff',
        fontSize: '16px',
        fontWeight: 600,
        cursor: 'pointer',
      }}
    >
      Fixture action
    </button>
  );
}

function LiveScripterFixtureInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}): React.JSX.Element {
  return (
    <>
      <label
        htmlFor='fixture-input'
        style={{
          position: 'absolute',
          left: '40px',
          top: '220px',
          fontSize: '14px',
          fontWeight: 600,
        }}
      >
        Fixture input
      </label>

      <input
        id='fixture-input'
        data-testid='fixture-input'
        type='text'
        aria-label='Fixture input'
        placeholder='Type here'
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={{
          position: 'absolute',
          left: '40px',
          top: '248px',
          width: '280px',
          height: '44px',
          border: '1px solid #94a3b8',
          borderRadius: '8px',
          padding: '0 12px',
          fontSize: '16px',
          boxSizing: 'border-box',
        }}
      />
    </>
  );
}

function LiveScripterFixtureStatus({
  status,
}: {
  status: string;
}): React.JSX.Element {
  return (
    <p
      id='fixture-status'
      role='status'
      style={{
        position: 'absolute',
        left: '40px',
        top: '332px',
        margin: 0,
        fontSize: '16px',
        color: '#334155',
      }}
    >
      {status}
    </p>
  );
}

export function LiveScripterFixtureClient(): React.JSX.Element {
  const [status, setStatus] = useState('idle');
  const [value, setValue] = useState('');

  return (
    <LiveScripterFixtureShell>
      <LiveScripterFixtureHeading />
      <LiveScripterFixtureAction onClick={() => setStatus('clicked')} />
      <LiveScripterFixtureInput value={value} onChange={setValue} />
      <LiveScripterFixtureStatus status={status} />
    </LiveScripterFixtureShell>
  );
}
