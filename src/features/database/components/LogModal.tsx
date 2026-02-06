'use client';

import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

import { AppModal } from '@/shared/ui';


type LogModalProps = {
  content: string;
  onClose: () => void;
};

export const LogModal = ({ content, onClose }: LogModalProps): React.JSX.Element => (
  <AppModal
    open={true}
    onClose={onClose}
    title="Operation Log"
    size="md"
  >
    <SyntaxHighlighter 
      language="bash" 
      style={atomDark}
      customStyle={{
        margin: 0,
        borderRadius: '0.5rem',
        fontSize: '0.875rem'
      }}
    >
      {content}
    </SyntaxHighlighter>
  </AppModal>
);
