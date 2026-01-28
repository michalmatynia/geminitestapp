"use client";

import { Button, AppModal } from "@/shared/ui";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/esm/styles/prism";


type LogModalProps = {
  content: string;
  onClose: () => void;
};

export const LogModal = ({ content, onClose }: LogModalProps) => (
  <AppModal
    open={true}
    onOpenChange={(open) => !open && onClose()}
    title="Operation Log"
  >
    <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-gray-900 p-6 shadow-lg">
      <h2 className="mb-4 text-xl font-bold">Operation Log</h2>
      <SyntaxHighlighter language="bash" style={atomDark}>
        {content}
      </SyntaxHighlighter>
      <div className="mt-6 text-right">
        <Button onClick={onClose}>Close</Button>
      </div>
    </div>
  </AppModal>
);
