import React from "react";
import type { BlockInstance } from "../../../types/page-builder";
import { FrontendBlockRenderer } from "./FrontendBlockRenderer";
import { getSectionStyles } from "../theme-styles";

interface FrontendNewsletterSectionProps {
  settings: Record<string, unknown>;
  blocks: BlockInstance[];
}

export function FrontendNewsletterSection({ settings, blocks }: FrontendNewsletterSectionProps): React.ReactNode {
  const sectionStyles = getSectionStyles(settings);
  const buttonText = (settings["buttonText"] as string) || "Subscribe";
  const placeholder = (settings["placeholder"] as string) || "Enter your email";

  return (
    <section style={sectionStyles}>
      <div className="container mx-auto max-w-2xl px-4 md:px-6 text-center">
        {blocks.length > 0 && (
          <div className="mb-6 space-y-4">
            {blocks.map((block: BlockInstance) => (
              <FrontendBlockRenderer key={block.id} block={block} />
            ))}
          </div>
        )}
        <form
          onSubmit={(e: React.FormEvent) => e.preventDefault()}
          className="flex flex-col gap-3 sm:flex-row sm:gap-0"
        >
          <input
            type="email"
            placeholder={placeholder}
            className="flex-1 rounded-md border border-gray-600 bg-gray-800/50 px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:rounded-r-none"
            readOnly
          />
          <button
            type="submit"
            className="rounded-md bg-white px-6 py-3 text-sm font-semibold text-gray-900 transition hover:bg-gray-200 sm:rounded-l-none"
          >
            {buttonText}
          </button>
        </form>
      </div>
    </section>
  );
}
