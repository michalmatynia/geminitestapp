export type Product = {
  id: string;
  slug: string;
  /** Full raw name — may contain pipe-separated segments. */
  name: string;
  /** First pipe-segment — human-readable display name. Falls back to `name`. */
  shortName?: string;
  /** Second pipe-segment — size description, e.g. "Adjustable Size". Detail page only. */
  sizeInfo?: string;
  /** Third pipe-segment — material, e.g. "Metal". Detail page only. */
  material?: string;
  /** Fifth pipe-segment — lore/setting shown as a badge, e.g. "Warhammer 40k". */
  lore?: string;
  category: string;
  collectionSlug: string;
  price: number;
  priceDisplay: string;
  currencyCode?: string;
  tag?: string;
  gradient: string;
  gradientAlt?: string;
  imageUrl?: string;
  imageUrls?: string[];
  description: string;
  details: string[];
  care: string[];
  sizes: string[];
  isNew?: boolean;
  isSoldOut?: boolean;
};

export const PRODUCTS: Product[] = [
  {
    id: '001',
    slug: 'amphora-vessel',
    name: 'Amphora Vessel',
    category: 'Objects',
    collectionSlug: 'objects',
    price: 680,
    priceDisplay: '€ 680',
    tag: 'New',
    gradient: 'linear-gradient(155deg, #D4C5B5 0%, #A89282 50%, #8C7868 100%)',
    gradientAlt: 'linear-gradient(135deg, #C4B4A2 0%, #9E8A78 100%)',
    imageUrl: '/uploads/products/SWOSTO016/1775854993653-1-47c8cd31d3a8f17432ef1197b4d3b552.png',
    description:
      'Hand-thrown in Limoges by ceramicist Hélène Morin, the Amphora Vessel references the proportions of ancient storage pottery while holding a distinctly contemporary silence. Each piece carries its maker\'s fingerprints in the clay.',
    details: [
      'Hand-thrown stoneware',
      'Natural ash glaze',
      'H 38 cm / Ø 16 cm',
      'Suitable for dry use',
      'Each piece unique — slight variations are inherent',
    ],
    care: [
      'Wipe with a dry cloth',
      'Avoid prolonged contact with water',
      'Do not place in dishwasher',
    ],
    sizes: [],
    isNew: true,
  },
  {
    id: '002',
    slug: 'linen-overshirt',
    name: 'Linen Overshirt',
    category: 'Womenswear',
    collectionSlug: 'womenswear',
    price: 320,
    priceDisplay: '€ 320',
    gradient: 'linear-gradient(155deg, #E8DFCF 0%, #CEC0AD 100%)',
    gradientAlt: 'linear-gradient(135deg, #DDD2C0 0%, #C8BAA8 100%)',
    imageUrl: '/uploads/products/KEYCHA823/1776868315397-1-37c0703e0ff3c0b8caa98dafdf0f6842.png',
    description:
      'Cut from stone-washed Belgian linen, this overshirt softens with every wash. The boxy silhouette works equally as a layer or worn alone. Mother-of-pearl buttons from a Normandy workshop.',
    details: [
      '100% Belgian linen, stone-washed',
      'Mother-of-pearl buttons',
      'Patch chest pocket',
      'Relaxed boxy fit — model wears size S',
      'Made in Portugal',
    ],
    care: [
      'Machine wash 30°C gentle cycle',
      'Do not tumble dry',
      'Iron on reverse while damp',
      'Becomes softer with each wash',
    ],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
  },
  {
    id: '003',
    slug: 'cognac-tote',
    name: 'Cognac Tote',
    category: 'Accessories',
    collectionSlug: 'accessories',
    price: 490,
    priceDisplay: '€ 490',
    tag: 'Last pieces',
    gradient: 'linear-gradient(155deg, #7A4B28 0%, #5A3318 100%)',
    gradientAlt: 'linear-gradient(135deg, #8B5E3C 0%, #6B4328 100%)',
    imageUrl: '/uploads/products/KEYCHA1434/6bf12b67-9d85-435c-8ebe-3cba78301ea9.png',
    description:
      'Full-grain vegetable-tanned leather from the Périgord. The tote develops a rich patina over years of use — we consider it finished when you do. Hand-stitched in Toulouse by a three-generation atelier.',
    details: [
      'Full-grain vegetable-tanned cowhide',
      'Saddle-stitched with linen thread',
      'Interior: unbleached linen lining',
      'H 34 cm × W 42 cm × D 12 cm',
      'Load capacity approx. 8 kg',
      'Made in France',
    ],
    care: [
      'Apply leather conditioner every 3–6 months',
      'Store stuffed with tissue when not in use',
      'Allow to dry naturally if wet',
      'Patina will develop naturally with use',
    ],
    sizes: [],
  },
  {
    id: '004',
    slug: 'obsidian-coat',
    name: 'Obsidian Coat',
    category: 'Menswear',
    collectionSlug: 'menswear',
    price: 1240,
    priceDisplay: '€ 1,240',
    tag: 'Limited',
    gradient: 'linear-gradient(155deg, #2A2522 0%, #1A1612 100%)',
    gradientAlt: 'linear-gradient(135deg, #222020 0%, #181512 100%)',
    imageUrl: '/uploads/products/KEYCHA1050/ec622b1e-5ab7-411b-bda8-c0e690854721.png',
    description:
      'Double-faced wool from a Biella mill that has been weaving since 1742. The coat is constructed without lining — a single layer of cloth with edges rolled and hand-finished. Wear it indefinitely.',
    details: [
      '100% Biella wool, double-faced',
      'Unlined — hand-finished edges',
      'Horn buttons',
      'Single-breasted, peak lapel',
      'Made to order — allow 3–4 weeks',
      'Made in Italy',
    ],
    care: [
      'Dry clean only',
      'Steam rather than press',
      'Hang on a wide wooden hanger',
      'Brush after each wear',
    ],
    sizes: ['44', '46', '48', '50', '52', '54'],
  },
  {
    id: '005',
    slug: 'marble-dish-set',
    name: 'Marble Dish Set',
    category: 'Objects',
    collectionSlug: 'objects',
    price: 180,
    priceDisplay: '€ 180',
    gradient: 'linear-gradient(155deg, #D0CAC4 0%, #B0A89E 100%)',
    gradientAlt: 'linear-gradient(135deg, #C8C2BC 0%, #A8A09A 100%)',
    imageUrl: '/uploads/products/KEYCHA649/1775926504575-1-b9bcdc00188ed8276a183ea7dd312589.png',
    description:
      'Carved from a single block of Carrara marble, each dish set contains two serving pieces and a catch-all tray. The veining in each set is entirely unique — quarried by the same family for four generations.',
    details: [
      'Carrara marble, hand-carved',
      'Set of 3: two dishes (Ø 14 cm) + tray (20 × 12 cm)',
      'Thickness approx. 2 cm',
      'No two sets identical',
    ],
    care: [
      'Wipe with a damp cloth, dry immediately',
      'Avoid acidic substances (lemon, vinegar)',
      'Do not place in dishwasher',
      'Re-oil with mineral oil occasionally',
    ],
    sizes: [],
  },
  {
    id: '006',
    slug: 'sand-wool-scarf',
    name: 'Sand Wool Scarf',
    category: 'Accessories',
    collectionSlug: 'accessories',
    price: 145,
    priceDisplay: '€ 145',
    tag: 'New',
    gradient: 'linear-gradient(155deg, #D9C9A8 0%, #BFA880 100%)',
    gradientAlt: 'linear-gradient(135deg, #D4C4A4 0%, #BAAA80 100%)',
    imageUrl: '/uploads/products/KEYCHA1262/90d91407-941b-4d54-8616-0e05810c4e7b.png',
    description:
      'Woven from undyed Shetland wool on a century-old jacquard loom in the Outer Hebrides. The natural lanolin gives warmth without weight. A piece that improves with age and cold weather.',
    details: [
      '100% undyed Shetland wool',
      '200 × 70 cm',
      'Fringed ends',
      'Weight: 280g',
      'Made in Scotland',
    ],
    care: [
      'Hand wash cold or dry clean',
      'Reshape while damp and dry flat',
      'Use a wool-specific detergent',
    ],
    sizes: [],
    isNew: true,
  },
  {
    id: '007',
    slug: 'clay-pendant-light',
    name: 'Clay Pendant Light',
    category: 'Objects',
    collectionSlug: 'objects',
    price: 540,
    priceDisplay: '€ 540',
    gradient: 'linear-gradient(155deg, #C4A882 0%, #A08060 100%)',
    gradientAlt: 'linear-gradient(135deg, #C0A280 0%, #9C7C5A 100%)',
    imageUrl: '/uploads/products/KEYCHA682/1776864978623-1-68e47a3939c0197b860bfbc4f737aff8.png',
    description:
      'Wheel-thrown terracotta, bisque-fired to hold its pale, porous surface. The form diffuses light in a warm amber ring. Designed by Ryo Sato for Stargater\'s Objects collection, wired with braided cotton cord.',
    details: [
      'Wheel-thrown terracotta',
      'Ø 28 cm, H 22 cm',
      'Cotton braided cord, 2m',
      'E27 fitting (bulb not included)',
      'Max 60W / LED compatible',
    ],
    care: [
      'Dust with a dry soft brush',
      'Do not use wet cloth',
    ],
    sizes: [],
  },
  {
    id: '008',
    slug: 'walnut-tray',
    name: 'Walnut Serving Tray',
    category: 'Objects',
    collectionSlug: 'objects',
    price: 220,
    priceDisplay: '€ 220',
    gradient: 'linear-gradient(155deg, #5C3D2A 0%, #3E2618 100%)',
    gradientAlt: 'linear-gradient(135deg, #5C3D2A 0%, #3E2618 100%)',
    imageUrl: '/uploads/products/WALACC113/1776865063561-1-690e066b5bf4fed272118bb1248be008.png',
    description:
      'Carved from a single plank of American black walnut, each tray is finished with three coats of food-safe hard oil. The grain pattern is unrepeatable — one tree, many trays, each different.',
    details: [
      'Solid American black walnut',
      '45 × 28 × 3 cm',
      'Food-safe hard oil finish',
      'Hand-routed handles',
      'Made in Denmark',
    ],
    care: [
      'Oil with food-safe oil every few months',
      'Avoid prolonged soaking',
      'Do not place in dishwasher',
    ],
    sizes: [],
  },
];

export const COLLECTIONS = [
  { slug: 'womenswear', label: 'Womenswear', count: 284 },
  { slug: 'menswear', label: 'Menswear', count: 196 },
  { slug: 'objects', label: 'Objects', count: 142 },
  { slug: 'accessories', label: 'Accessories', count: 89 },
];

export function getProduct(slug: string): Product | undefined {
  return PRODUCTS.find((p) => p.slug === slug);
}

export function getProductsByCollection(collectionSlug: string): Product[] {
  return PRODUCTS.filter((p) => p.collectionSlug === collectionSlug);
}
