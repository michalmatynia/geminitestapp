'use client';

import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

import type { ModalStateProps } from '@/shared/types/modal-props';
import { ContentDisplayModal } from '@/shared/ui/templates';

interface LogModalProps extends ModalStateProps {
  content: string;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  onSuccess?: () => void;
}

export const LogModal = ({ 
  isOpen, 
  onClose, 
  content, 
  title = 'Operation Log',
  size = 'md',
}: LogModalProps): React.JSX.Element | null => {
  if (!isOpen) return null;

  return (
    <ContentDisplayModal
      open={isOpen}
      onClose={onClose}
      title={title}
      size={size}
    >
      <SyntaxHighlighter
        language='bash'
        style={atomDark}
        customStyle={{
          margin: 0,
          borderRadius: '0.5rem',
          fontSize: '0.875rem',
        }}
      >
        {content}
      </SyntaxHighlighter>
    </ContentDisplayModal>
  );
};
