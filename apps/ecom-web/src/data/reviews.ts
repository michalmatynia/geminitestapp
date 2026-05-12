export interface Review {
  id: string;
  author: string;
  location: string;
  date: string;
  rating: number;
  title: string;
  body: string;
  verified: boolean;
}

export const REVIEWS: Record<string, Review[]> = {
  'amphora-vessel': [
    {
      id: 'r001',
      author: 'Sophie L.',
      location: 'Paris, France',
      date: 'March 2026',
      rating: 5,
      title: 'A piece I will keep forever',
      body: 'The weight of this vessel is extraordinary — substantial but not heavy. The ash glaze has an almost mineral quality that changes with the light. Hélène\'s fingerprints are literally visible in the clay near the base. It arrived wrapped in linen and now sits on my kitchen shelf as the most beautiful thing in the room.',
      verified: true,
    },
    {
      id: 'r002',
      author: 'Marco V.',
      location: 'Milan, Italy',
      date: 'January 2026',
      rating: 5,
      title: 'Even better in person',
      body: 'The photographs do not do justice to how present this object is. It creates a kind of stillness in the room around it. I bought the second one for my mother.',
      verified: true,
    },
    {
      id: 'r003',
      author: 'Ingrid K.',
      location: 'Stockholm, Sweden',
      date: 'December 2025',
      rating: 4,
      title: 'Beautiful, arrived later than expected',
      body: 'The vessel is absolutely stunning — the glaze has incredible depth. Only giving 4 stars because the shipping took 10 days rather than the expected 5. When it arrived, it was worth the wait.',
      verified: true,
    },
  ],
  'linen-overshirt': [
    {
      id: 'r004',
      author: 'Clara M.',
      location: 'Berlin, Germany',
      date: 'April 2026',
      rating: 5,
      title: 'My favourite garment this season',
      body: 'I\'ve owned a lot of linen but nothing like this. The stone-washing has eliminated any stiffness — it moved like it had been lived in for years on the first wear. The cut is generous in the best way; I wear it over a slip dress and alone.',
      verified: true,
    },
    {
      id: 'r005',
      author: 'Amara D.',
      location: 'Amsterdam, Netherlands',
      date: 'February 2026',
      rating: 5,
      title: 'Gets better every wash',
      body: 'Third wash in and it is even softer than when I received it. The mother-of-pearl buttons are a beautiful detail. Sized up to M for an oversized fit — perfect.',
      verified: true,
    },
  ],
  'cognac-tote': [
    {
      id: 'r006',
      author: 'Élise B.',
      location: 'Lyon, France',
      date: 'March 2026',
      rating: 5,
      title: 'A bag I will carry for twenty years',
      body: 'The leather arrived with a slightly waxy smell that has since faded into something warm and pleasant. The saddle stitching is impeccable — I can see the care in every millimetre. Already developing a honey patina on the corners after 6 weeks of daily use.',
      verified: true,
    },
    {
      id: 'r007',
      author: 'Thomas R.',
      location: 'Bordeaux, France',
      date: 'January 2026',
      rating: 5,
      title: 'The only bag I own now',
      body: 'Bought this as a gift for my partner, who then refused to let me borrow it. Size is perfect for a laptop plus all daily essentials. The structure holds without a frame.',
      verified: true,
    },
  ],
  'obsidian-coat': [
    {
      id: 'r008',
      author: 'James F.',
      location: 'London, UK',
      date: 'November 2025',
      rating: 5,
      title: 'Worth every single penny',
      body: 'The double-faced wool is unlike anything I have encountered in ready-to-wear. The coat is constructed without lining — a single layer of cloth with edges rolled and hand-finished. Wear it indefinitely.',
      verified: true,
    },
    {
      id: 'r009',
      author: 'Pieter V.',
      location: 'Antwerp, Belgium',
      date: 'October 2025',
      rating: 5,
      title: 'Nothing else in my wardrobe compares',
      body: 'I wore this in rain, in wind, and in a Stockholm winter. The wool repels water to a remarkable degree. The hand-finished edges are extraordinarily clean. This is what clothing should be.',
      verified: true,
    },
  ],
  'marble-dish-set': [
    {
      id: 'r010',
      author: 'Anna S.',
      location: 'Copenhagen, Denmark',
      date: 'February 2026',
      rating: 5,
      title: 'The veining is extraordinary',
      body: 'My set has a dramatic grey vein running diagonally across all three pieces — it looks like a single stone was cut in three. I use the dishes for jewellery and keys; the larger tray holds candles. Objects of genuine beauty.',
      verified: true,
    },
  ],
  'sand-wool-scarf': [
    {
      id: 'r011',
      author: 'Nora A.',
      location: 'Edinburgh, Scotland',
      date: 'December 2025',
      rating: 5,
      title: 'From the islands to my wardrobe',
      body: 'I live near where this wool comes from. Seeing it transformed into something this refined is genuinely moving. The weight is perfect — warm without bulk. The undyed colour is a pale gold that goes with everything.',
      verified: true,
    },
    {
      id: 'r012',
      author: 'Olga P.',
      location: 'Warsaw, Poland',
      date: 'January 2026',
      rating: 5,
      title: 'A gift for life',
      body: 'Bought this for my mother\'s birthday. She hasn\'t taken it off. The fringed ends are beautifully finished and the colour is exactly as shown. Second purchase incoming for myself.',
      verified: true,
    },
  ],
  'clay-pendant-light': [
    {
      id: 'r013',
      author: 'Yuki M.',
      location: 'Amsterdam, Netherlands',
      date: 'March 2026',
      rating: 5,
      title: 'Transforms the room completely',
      body: 'I replaced a modern pendant with this in my dining room. The warm amber ring of light it creates during dinner is unlike any other shade I\'ve owned. The terracotta surface has a beautiful irregularity up close.',
      verified: true,
    },
  ],
  'walnut-tray': [
    {
      id: 'r014',
      author: 'Henri D.',
      location: 'Brussels, Belgium',
      date: 'April 2026',
      rating: 5,
      title: 'Morning ritual, elevated',
      body: 'Coffee, cup, and this tray. Nothing else on the kitchen counter. The grain pattern in mine runs in a beautiful swirl from the centre outward — I understand what they mean about each one being unique. The hard oil finish is silky to the touch.',
      verified: true,
    },
    {
      id: 'r015',
      author: 'Fiona C.',
      location: 'Dublin, Ireland',
      date: 'February 2026',
      rating: 4,
      title: 'Beautiful object, slight wait',
      body: 'The tray is genuinely gorgeous. Lost one star because the estimated delivery was optimistic by about a week. But unpacking it was worth any wait — it arrived wrapped in Japanese tissue paper.',
      verified: true,
    },
  ],
};

export function getReviews(slug: string): Review[] {
  return REVIEWS[slug] ?? [];
}

export function getAverageRating(slug: string): number {
  const reviews = getReviews(slug);
  if (reviews.length === 0) return 0;
  return Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10;
}

export function getRatingDistribution(slug: string): Record<number, number> {
  const reviews = getReviews(slug);
  const dist: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach((r) => { dist[r.rating] = (dist[r.rating] ?? 0) + 1; });
  return dist;
}
