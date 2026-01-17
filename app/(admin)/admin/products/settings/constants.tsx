import React, { ReactNode } from "react";
import { ProductDbProvider } from "@/types/products";

export const settingSections = [
  "Categories",
  "Price Groups",
  "Catalogs",
  "Data Source",
  "Internationalization",
] as const;

export const productDbOptions: Array<{
  value: ProductDbProvider;
  label: string;
  description: string;
}> = [
  {
    value: "prisma",
    label: "Postgres (Prisma)",
    description: "Default relational storage for product data.",
  },
  {
    value: "mongodb",
    label: "MongoDB",
    description: "Document storage for product data.",
  },
];

export const countryCodeOptions = [
  { code: "PL", name: "Poland" },
  { code: "DE", name: "Germany" },
  { code: "GB", name: "United Kingdom" },
  { code: "SE", name: "Sweden" },
  { code: "US", name: "United States" },
];

export const countryFlagMap: Record<string, ReactNode> = {
  PL: (
    <svg viewBox="0 0 24 16" aria-hidden="true" className="w-6 h-4">
      <rect width="24" height="8" fill="#ffffff" />
      <rect y="8" width="24" height="8" fill="#dc143c" />
    </svg>
  ),
  DE: (
    <svg viewBox="0 0 24 16" aria-hidden="true" className="w-6 h-4">
      <rect width="24" height="5.33" fill="#000000" />
      <rect y="5.33" width="24" height="5.33" fill="#dd0000" />
      <rect y="10.66" width="24" height="5.34" fill="#ffce00" />
    </svg>
  ),
  GB: (
    <svg viewBox="0 0 24 16" aria-hidden="true" className="w-6 h-4">
      <rect width="24" height="16" fill="#012169" />
      <path d="M0 0L24 16M24 0L0 16" stroke="#ffffff" strokeWidth="3" />
      <path d="M0 0L24 16M24 0L0 16" stroke="#c8102e" strokeWidth="1.5" />
      <rect x="10" width="4" height="16" fill="#ffffff" />
      <rect y="6" width="24" height="4" fill="#ffffff" />
      <rect x="11" width="2" height="16" fill="#c8102e" />
      <rect y="7" width="24" height="2" fill="#c8102e" />
    </svg>
  ),
  SE: (
    <svg viewBox="0 0 24 16" aria-hidden="true" className="w-6 h-4">
      <rect width="24" height="16" fill="#005293" />
      <rect x="6" width="4" height="16" fill="#fecb00" />
      <rect y="6" width="24" height="4" fill="#fecb00" />
    </svg>
  ),
  US: (
    <svg viewBox="0 0 24 16" aria-hidden="true" className="w-6 h-4">
      <rect width="24" height="16" fill="#ffffff" />
      <g fill="#b22234">
        <rect y="0" width="24" height="2" />
        <rect y="4" width="24" height="2" />
        <rect y="8" width="24" height="2" />
        <rect y="12" width="24" height="2" />
      </g>
      <rect width="10" height="8" fill="#3c3b6e" />
    </svg>
  ),
};
