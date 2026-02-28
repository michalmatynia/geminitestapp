

import React from 'react';

interface ChatMessageContentProps {
  content: string;
}

export function ChatMessageContent({ content }: ChatMessageContentProps): React.JSX.Element {
  const renderInline = (text: string): React.ReactNode[] => {
    const parts = text.split('**');
    return parts.map(
      (part: string, index: number): React.ReactNode =>
        index % 2 === 1 ? <strong key={index}>{part}</strong> : <span key={index}>{part}</span>
    );
  };

  const lines = content.split('\n');
  const blocks: React.ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = (key: string): void => {
    if (listItems.length === 0) return;
    blocks.push(
      <ul key={key} className='list-disc space-y-1 pl-5'>
        {listItems.map(
          (item: string, index: number): React.JSX.Element => (
            <li key={`${key}-item-${index}`}>{renderInline(item)}</li>
          )
        )}
      </ul>
    );
    listItems = [];
  };

  lines.forEach((line: string, index: number): void => {
    const trimmed: string = line.trim();
    if (!trimmed) {
      flushList(`list-${index}`);
      blocks.push(<div key={`spacer-${index}`} className='h-2' />);
      return;
    }

    if (trimmed.startsWith('### ')) {
      flushList(`list-${index}`);
      blocks.push(
        <h3 key={`h3-${index}`} className='text-sm font-semibold text-white'>
          {renderInline(trimmed.slice(4))}
        </h3>
      );
      return;
    }

    if (trimmed.startsWith('## ')) {
      flushList(`list-${index}`);
      blocks.push(
        <h2 key={`h2-${index}`} className='text-base font-semibold text-white'>
          {renderInline(trimmed.slice(3))}
        </h2>
      );
      return;
    }

    if (trimmed.startsWith('# ')) {
      flushList(`list-${index}`);
      blocks.push(
        <h1 key={`h1-${index}`} className='text-lg font-semibold text-white'>
          {renderInline(trimmed.slice(2))}
        </h1>
      );
      return;
    }

    if (trimmed.startsWith('- ')) {
      listItems.push(trimmed.slice(2));
      return;
    }

    flushList(`list-${index}`);
    blocks.push(
      <p key={`p-${index}`} className='leading-relaxed text-slate-100'>
        {renderInline(trimmed)}
      </p>
    );
  });

  flushList('list-final');
  return <div className='space-y-2'>{blocks}</div>;
}
