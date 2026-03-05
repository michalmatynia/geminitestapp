export type AdminMenuLayoutNodeSemantic = 'link' | 'group';

export type AdminMenuLayoutNodeEntry = {
  id: string;
  label: string;
  semantic: AdminMenuLayoutNodeSemantic;
  href: string | null;
  isBuiltIn: boolean;
};
