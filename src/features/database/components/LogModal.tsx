"use client";

import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Button } from "@/shared/ui/button";

type LogModalProps = {
  content: string;
  onClose: () => void;
};

export const LogModal = ({ content, onClose }: LogModalProps) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
    <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-gray-900 p-6 shadow-lg">
      <h2 className="mb-4 text-xl font-bold">Operation Log</h2>
      <SyntaxHighlighter language="bash" style={atomDark}>
        {content}
      </SyntaxHighlighter>
      <div className="mt-6 text-right">
        <Button onClick={onClose}>Close</Button>
      </div>
    </div>
  </div>
);
