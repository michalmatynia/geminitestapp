export type PageStatus = "draft" | "published" | "scheduled";

export interface Block {
  id: string;
  name: string;
  content: unknown;
}

export interface BlockForm {
  id: string;
  name: string;
  content: string;
}

export interface PageComponent {
  type: string;
  content: Record<string, unknown>;
}

export interface PageSlugLink {
  slug: {
    slug: string;
  };
}

export interface PageSeoData {
  seoTitle?: string;
  seoDescription?: string;
  seoOgImage?: string;
  seoCanonical?: string;
  robotsMeta?: string;
}

export interface PageSummary {
  id: string;
  name: string;
  status: PageStatus;
  slugs: PageSlugLink[];
}

export interface Page {
  id: string;
  name: string;
  status: PageStatus;
  publishedAt?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoOgImage?: string;
  seoCanonical?: string;
  robotsMeta?: string;
  components: PageComponent[];
  slugs?: PageSlugLink[];
}

export interface Slug {
  id: string;
  slug: string;
  createdAt?: string;
  isDefault?: boolean;
}

export * from "./page-builder";
