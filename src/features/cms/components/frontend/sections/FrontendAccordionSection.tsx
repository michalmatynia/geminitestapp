"use client";

import React, { useState } from "react";
import type { BlockInstance } from "../../../types/page-builder";
import { FrontendBlockRenderer } from "./FrontendBlockRenderer";
import { getSectionStyles } from "../theme-styles";

interface FrontendAccordionSectionProps {
  settings: Record<string, unknown>;
  blocks: BlockInstance[];
}

export function FrontendAccordionSection({ settings, blocks }: FrontendAccordionSectionProps): React.ReactNode {
  const sectionStyles = getSectionStyles(settings);

  // Group blocks into pairs: Heading + Text = one accordion item
  const items: { heading: BlockInstance; text?: BlockInstance }[] = [];
  let i = 0;
  while (i < blocks.length) {
    const current = blocks[i];
    if (!current) { i += 1; continue; }
    if (current.type === "Heading") {
      const next = blocks[i + 1];
      if (next && next.type === "Text") {
        items.push({ heading: current, text: next });
        i += 2;
      } else {
        items.push({ heading: current });
        i += 1;
      }
    } else {
      i += 1;
    }
  }

  if (items.length === 0) {
    return (
      <section style={sectionStyles}>
        <div className="container mx-auto px-4 md:px-6">
          <p className="text-gray-500 text-center py-8">Add Heading and Text blocks to create accordion items</p>
        </div>
      </section>
    );
  }

  return (
    <section style={sectionStyles}>
      <div className="container mx-auto max-w-3xl px-4 md:px-6">
        <div className="divide-y divide-gray-700/50">
          {items.map((item: { heading: BlockInstance; text?: BlockInstance }, index: number) => (
            <AccordionItem key={item.heading.id} item={item} defaultOpen={index === 0} />
          ))}
        </div>
      </div>
    </section>
  );
}

function AccordionItem({
  item,
  defaultOpen,
}: {
  item: { heading: BlockInstance; text?: BlockInstance };
  defaultOpen: boolean;
}): React.ReactNode {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="py-4">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between text-left"
      >
        <FrontendBlockRenderer block={item.heading} />
        <span className="ml-4 shrink-0 text-gray-400 text-xl">{isOpen ? "−" : "+"}</span>
      </button>
      {isOpen && item.text && (
        <div className="mt-3">
          <FrontendBlockRenderer block={item.text} />
        </div>
      )}
    </div>
  );
}
