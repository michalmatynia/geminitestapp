export type KangurAvatarOption = {
  id: string;
  label: string;
  src: string;
};

export const KANGUR_AVATAR_OPTIONS: KangurAvatarOption[] = [
  {
    id: 'star-fox',
    label: 'Gwiazdny lis',
    src: '/avatars/kangur/star-fox.svg',
  },
  {
    id: 'orbit-owl',
    label: 'Orbitalna sowa',
    src: '/avatars/kangur/orbit-owl.svg',
  },
  {
    id: 'pixel-panda',
    label: 'Pikselowa panda',
    src: '/avatars/kangur/pixel-panda.svg',
  },
  {
    id: 'reef-turtle',
    label: 'Rafowy zolw',
    src: '/avatars/kangur/reef-turtle.svg',
  },
  {
    id: 'sky-koala',
    label: 'Niebianska koala',
    src: '/avatars/kangur/sky-koala.svg',
  },
];

export const getKangurAvatarById = (
  avatarId: string | null | undefined
): KangurAvatarOption | null => {
  if (!avatarId) {
    return null;
  }
  return KANGUR_AVATAR_OPTIONS.find((option) => option.id === avatarId) ?? null;
};

