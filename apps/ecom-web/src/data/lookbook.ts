export interface Editorial {
  id: string;
  issue: string;
  title: string;
  subtitle: string;
  season: string;
  gradient: string;
  textColor: string;
  productSlug: string;
}

export const EDITORIALS: Editorial[] = [
  {
    id: 'spring-26-earth',
    issue: '01',
    title: 'Earth & Hand',
    subtitle: 'The ceramics of coastal Brittany — a study in patience and clay',
    season: 'Spring 2026',
    gradient: 'linear-gradient(145deg, #d4a574 0%, #a0714f 35%, #5c3d2e 75%, #2c1a10 100%)',
    textColor: '#f5e6d3',
    productSlug: 'amphora-vessel',
  },
  {
    id: 'spring-26-linen',
    issue: '02',
    title: 'The Weight of Light',
    subtitle: 'Belgian linen, washed and worn into grace over many seasons',
    season: 'Spring 2026',
    gradient: 'linear-gradient(160deg, #e8ddd0 0%, #c4b5a0 50%, #9a8878 100%)',
    textColor: '#2a1f17',
    productSlug: 'linen-overshirt',
  },
  {
    id: 'spring-26-cognac',
    issue: '03',
    title: 'Tanneries of Millau',
    subtitle: 'Portrait of a French leather dynasty in its fifth generation',
    season: 'Spring 2026',
    gradient: 'linear-gradient(135deg, #8b4513 0%, #5d2e0c 40%, #3d1a08 100%)',
    textColor: '#f0c89a',
    productSlug: 'cognac-tote',
  },
  {
    id: 'aw-25-obsidian',
    issue: '04',
    title: 'Dark Study',
    subtitle: 'The obsidian palette, for the long months of indoor light',
    season: 'Autumn / Winter 2025',
    gradient: 'linear-gradient(170deg, #1a1a2e 0%, #16213e 40%, #0f3460 70%, #533483 100%)',
    textColor: '#e8e0f0',
    productSlug: 'obsidian-coat',
  },
  {
    id: 'aw-25-marble',
    issue: '05',
    title: 'White & Vein',
    subtitle: 'Carrara marble as the foundation of the table as ritual',
    season: 'Autumn / Winter 2025',
    gradient: 'linear-gradient(135deg, #f0efea 0%, #dddbd4 30%, #c8c5bc 60%, #b4b0a8 100%)',
    textColor: '#1a1816',
    productSlug: 'marble-dish-set',
  },
  {
    id: 'aw-25-wool',
    issue: '06',
    title: 'Outer Hebrides',
    subtitle: 'A journey to the islands where the wool for our scarves is born',
    season: 'Autumn / Winter 2025',
    gradient: 'linear-gradient(125deg, #b5a898 0%, #8a7c6e 35%, #6b5f52 65%, #4a3f35 100%)',
    textColor: '#f0ebe5',
    productSlug: 'sand-wool-scarf',
  },
  {
    id: 'ss-25-clay',
    issue: '07',
    title: 'By Candlelight',
    subtitle: 'Handmade clay pendants for rooms that prefer shadow to bright light',
    season: 'Spring / Summer 2025',
    gradient: 'linear-gradient(150deg, #f0d5b0 0%, #d4a060 40%, #a06830 75%, #7a4820 100%)',
    textColor: '#1a0f08',
    productSlug: 'clay-pendant-light',
  },
  {
    id: 'ss-25-walnut',
    issue: '08',
    title: 'Morning Ritual',
    subtitle: 'The tray as the frame of the day, in American black walnut',
    season: 'Spring / Summer 2025',
    gradient: 'linear-gradient(140deg, #8B6914 0%, #6B5010 40%, #4A380D 70%, #2C200A 100%)',
    textColor: '#f5e8c8',
    productSlug: 'walnut-tray',
  },
];
