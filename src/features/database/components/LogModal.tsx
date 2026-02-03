"use client";

import { Button, SharedModal } from "@/shared/ui";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/esm/styles/prism";


type LogModalProps = {
  content: string;
  onClose: () => void;
};

export const LogModal = ({ content, onClose }: LogModalProps): React.JSX.Element => (
  <SharedModal
    open={true}
    onClose={onClose}
    title="Operation Log"
    size="md"
    footer={<Button onClick={onClose}>Close</Button>}
  >
    <SyntaxHighlighter language="bash" style={atomDark}>
      {content}
    </SyntaxHighlighter>
  </SharedModal>
);
