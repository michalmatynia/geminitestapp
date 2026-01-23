"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import MissingImagePlaceholder from "@/components/ui/missing-image-placeholder";

interface ProductImageCellProps {
  imageUrl: string | null;
  productName: string;
}

const PREVIEW_SIZE = 194; // 216 * 0.9 = 194.4 (10% smaller from 216)
const OFFSET = 12;

export const ProductImageCell = React.memo(function ProductImageCell({
  imageUrl,
  productName,
}: ProductImageCellProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const pendingPosRef = useRef({ x: 0, y: 0 });

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    pendingPosRef.current = { x: e.clientX, y: e.clientY };
    if (rafRef.current !== null) return;
    rafRef.current = window.requestAnimationFrame(() => {
      setMousePos(pendingPosRef.current);
      rafRef.current = null;
    });
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  if (!imageUrl) {
    return <MissingImagePlaceholder className="size-16" />;
  }

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={() => setShowPreview(true)}
      onMouseLeave={() => setShowPreview(false)}
      onMouseMove={handleMouseMove}
    >
      <Image
        src={imageUrl}
        alt={productName}
        width={64}
        height={64}
        className="size-16 rounded-md object-cover cursor-pointer transition-opacity hover:opacity-80"
        style={{ width: "auto", height: "auto" }}
      />

      {showPreview && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: `${mousePos.x - PREVIEW_SIZE - OFFSET}px`,
            top: `${mousePos.y - PREVIEW_SIZE - OFFSET}px`,
          }}
        >
          <div className="bg-gray-950 rounded-lg overflow-hidden shadow-2xl border border-gray-600">
            <Image
              src={imageUrl}
              alt={productName}
              width={PREVIEW_SIZE}
              height={PREVIEW_SIZE}
              className="rounded-lg object-cover"
              style={{ width: "auto", height: "auto" }}
              priority
              quality={90}
            />
          </div>
        </div>
      )}
    </div>
  );
});
