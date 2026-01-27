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

export interface PageSummary {
  id: string;
  name: string;
  slugs: PageSlugLink[];
}

export interface Page {
  id: string;
  name: string;
  components: PageComponent[];
  slugs?: PageSlugLink[];
}

export interface Slug {
  id: string;
  slug: string;
  createdAt?: string;
  isDefault?: boolean;
}
