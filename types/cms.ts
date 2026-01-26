export interface Block {
  id: string;
  name: string;
  content: string;
}

export interface PageComponent {
  type: string;
  content: Record<string, unknown>;
}

export interface Page {
  id: string;
  name: string;
  components: PageComponent[];
}
