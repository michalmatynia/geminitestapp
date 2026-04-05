import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

import type { EntityModalProps } from '@/shared/contracts/ui';
import { AppModal } from '@/shared/ui/feedback.public';

interface LogModalProps extends EntityModalProps<string> {
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const LogModal = (props: LogModalProps): React.JSX.Element | null => {
  const { isOpen, onClose, item: content, title = 'Operation Log', size = 'md' } = props;

  if (!isOpen || content === undefined) return null;

  return (
    <AppModal
      open={isOpen}
      onOpenChange={(open: boolean): void => {
        if (!open) onClose();
      }}
      title={title}
      size={size}
    >
      <div className='max-h-[60vh] overflow-y-auto'>
        <SyntaxHighlighter
          language='bash'
          style={atomDark}
          customStyle={{
            margin: 0,
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
          }}
        >
          {content || ''}
        </SyntaxHighlighter>
      </div>
    </AppModal>
  );
};
