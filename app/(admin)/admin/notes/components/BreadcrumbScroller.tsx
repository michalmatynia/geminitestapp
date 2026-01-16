"use client";

import React, { useState, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function BreadcrumbScroller({
  backgroundColor,
  children,
}: {
  backgroundColor: string;
  children: React.ReactNode;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScrollLeft = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < maxScrollLeft - 1);
  }, []);

  React.useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => updateScrollState();
    el.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    return () => {
      el.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [updateScrollState]);

  const handleScroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const offset = direction === "left" ? -140 : 140;
    el.scrollBy({ left: offset, behavior: "smooth" });
  };

  return (
    <div
      className="relative -mx-4 -mb-4 rounded-b-lg"
      style={{ backgroundColor }}
    >
      {canScrollLeft && (
        <button
          type="button"
          aria-label="Scroll breadcrumb left"
          onClick={() => handleScroll("left")}
          className="absolute left-1 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/20 p-1 text-gray-700 hover:bg-black/30"
        >
          <ChevronLeft size={12} />
        </button>
      )}
      {canScrollRight && (
        <button
          type="button"
          aria-label="Scroll breadcrumb right"
          onClick={() => handleScroll("right")}
          className="absolute right-1 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/20 p-1 text-gray-700 hover:bg-black/30"
        >
          <ChevronRight size={12} />
        </button>
      )}
      <div
        ref={scrollRef}
        className="flex items-center gap-1 overflow-x-auto px-5 py-2 pb-3 text-[10px] text-gray-700 scrollbar-hidden"
      >
        {children}
      </div>
    </div>
  );
}
