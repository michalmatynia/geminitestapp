"use client";

import { useContext } from "react";
import { ProductFormContext } from "@/lib/context/ProductFormContext";

export default function DebugPanel() {
  // Directly use the context to avoid throwing an error when it's not available.
  const context = useContext(ProductFormContext);

  // If the context is not found, it means we are not on a page with the ProductFormProvider.
  // In this case, we render nothing.
  if (!context) {
    return null;
  }

  // A function to handle circular references in the context for JSON.stringify
  const getCircularReplacer = () => {
    const seen = new WeakSet();
    return (key: any, value: any) => {
      if (typeof value === "object" && value !== null) {
        if (seen.has(value)) {
          return; // Omit circular reference
        }
        seen.add(value);
      }
      return value;
    };
  };

  return (
    <div className="fixed bottom-0 right-0 bg-gray-800 text-white p-4 rounded-tl-lg shadow-lg max-w-lg max-h-96 overflow-auto z-50">
      <h3 className="text-lg font-bold mb-2">Product Form Debug Panel</h3>
      <pre className="text-xs">
        {JSON.stringify(context, getCircularReplacer(), 2)}
      </pre>
    </div>
  );
}
