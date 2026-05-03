'use client';

import { Check, Copy } from 'lucide-react';
import * as React from 'react';
import { useState } from 'react';

import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import { Button } from './button';

type CopyButtonProps = {
  value: string;
  className?: string;
  variant?: 'ghost' | 'outline' | 'secondary';
  size?: 'sm' | 'icon' | 'default';
  timeout?: number;
  showText?: boolean;
  disabled?: boolean | undefined;
  children?: React.ReactNode;
  ariaLabel?: string;
};

export function CopyButton(props: CopyButtonProps): React.JSX.Element {
  const {
    value,
    className = '',
    variant = 'ghost',
    size = 'icon',
    timeout = 2000,
    showText = false,
    disabled,
    children,
    ariaLabel,
  } = props;

  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent): Promise<void> => {
    e.stopPropagation();
    if (!value) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        // Fallback for non-secure contexts
        const textArea = document.createElement('textarea');
        textArea.value = value;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), timeout);
    } catch (err) {
      logClientCatch(err, { source: 'CopyButton', action: 'copyToClipboard' });
    }
  };

  return (
    <Button
      type='button'
      variant={variant}
      size={showText ? 'default' : size}
      onClick={(e: React.MouseEvent): void => {
        void handleCopy(e);
      }}
      className={className}
      disabled={disabled}
      aria-label={ariaLabel}
      title={isCopied ? 'Copied!' : 'Copy to clipboard'}
    >
      {children ?? (
        <>
          {isCopied ? (
            <Check className={showText ? 'mr-2 h-4 w-4' : 'h-4 w-4'} aria-hidden='true' />
          ) : (
            <Copy className={showText ? 'mr-2 h-4 w-4' : 'h-4 w-4'} aria-hidden='true' />
          )}
          {showText && (isCopied ? 'Copied' : 'Copy')}
        </>
      )}
    </Button>
  );
}
