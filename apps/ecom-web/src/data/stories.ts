export type Story = {
  id: string;
  slug: string;
  category: string;
  title: string;
  subtitle: string;
  excerpt: string;
  readTime: string;
  date: string;
  gradient: string;
  accentColor: string;
  textColor: string;
  tags: string[];
  body: { type: 'paragraph' | 'pull-quote' | 'heading' | 'caption'; text: string }[];
  relatedSlugs: string[];
};

export const STORIES: Story[] = [
  {
    id: '001',
    slug: 'last-weavers-of-bruges',
    category: 'Craft',
    title: 'The Last Weavers of Bruges',
    subtitle: 'Inside the workshop where 600-year-old loom techniques meet contemporary design',
    excerpt:
      'Inside the workshop where 600-year-old loom techniques meet contemporary design. A conversation with the three remaining masters of Flemish linen weaving.',
    readTime: '7 min',
    date: 'April 2026',
    gradient: 'linear-gradient(145deg, #2C4A3E 0%, #1A3028 100%)',
    accentColor: '#5A9E7A',
    textColor: '#E8F0EC',
    tags: ['Craft', 'Belgium', 'Linen', 'Heritage'],
    body: [
      {
        type: 'paragraph',
        text: 'The workshop is on a narrow canal street, three floors above the water. There is no sign. You learn the address from someone who learned it from someone else. Inside, the air smells of wet flax and machine oil — a particular combination that has not changed in six centuries.',
      },
      {
        type: 'pull-quote',
        text: '"The loom does not care what century it is. It only knows tension, thread, and time."',
      },
      {
        type: 'paragraph',
        text: 'Hendrik De Wolf is sixty-three. His father learned weaving here; his grandfather before that. He is one of three men in Belgium who can still operate a traditional Flemish draw loom — a machine that requires two operators and four hands to produce a single centimetre of cloth per hour.',
      },
      {
        type: 'heading',
        text: 'Why linen, why here',
      },
      {
        type: 'paragraph',
        text: 'The River Lys, which runs south of Bruges into France, once processed more flax than any waterway in Europe. The water had a particular mineral quality that rotted the stalk away perfectly, leaving only the long bast fibres. The word "linen" itself likely comes from the Latin for the Lys region. The trade built the city.',
      },
      {
        type: 'paragraph',
        text: 'By 1950, industrial mills in France and Belgium could produce in a day what Hendrik\'s loom makes in a month. By 1980, most traditional workshops had closed. By 2000, there were perhaps a dozen weavers left who understood the draw loom system. Today, there are three.',
      },
      {
        type: 'pull-quote',
        text: '"Each piece we make carries a specific tension signature. No machine can replicate it. The cloth remembers the maker\'s hands."',
      },
      {
        type: 'paragraph',
        text: 'Stargater began working with Hendrik\'s workshop in 2022, after our founder spent three days watching him weave before asking whether he would consider a small production run. The answer, after some consideration, was yes — provided we agreed never to rush an order and never to ask him to simplify a pattern.',
      },
      {
        type: 'heading',
        text: 'The next generation',
      },
      {
        type: 'paragraph',
        text: 'There is an apprentice now — a twenty-eight-year-old from Ghent named Lore, who left a career in graphic design to learn the draw loom. Hendrik says she has good hands and an unusual patience. She will be ready in three more years. The continuity is not guaranteed, but it is possible.',
      },
      {
        type: 'caption',
        text: 'The Stargater Linen Overshirt is woven in this workshop. Each piece requires approximately fourteen hours of loom time.',
      },
    ],
    relatedSlugs: ['origin-of-cognac-leather', 'sand-wool-outer-hebrides'],
  },
  {
    id: '002',
    slug: 'origin-of-cognac-leather',
    category: 'Material',
    title: 'On the Origin of Cognac Leather',
    subtitle: 'Why the finest leather in the world still comes from a town of 22,000 people',
    excerpt:
      'Why the finest leather in the world still comes from a town of 22,000 people in south-west France. The answer is in the water, the bark, and the patience of the tanners.',
    readTime: '5 min',
    date: 'March 2026',
    gradient: 'linear-gradient(145deg, #6B4328 0%, #4A2D18 100%)',
    accentColor: '#C4703F',
    textColor: '#F0E4D8',
    tags: ['Material', 'France', 'Leather', 'Tanning'],
    body: [
      {
        type: 'paragraph',
        text: 'Périgord is best known for its truffles and its foie gras. But for those who work with leather, the region is significant for a different reason: the bark of the oak trees that grow on its limestone hillsides has a particular tannin concentration that produces, over eighteen months of processing, a hide unlike any other.',
      },
      {
        type: 'pull-quote',
        text: '"Chrome tanning takes two days. Vegetable tanning takes two years. That gap is not a problem to solve. It is the product."',
      },
      {
        type: 'paragraph',
        text: 'The Garonne family has been tanning leather in Ribérac since 1887. The current patriarch, Étienne, is the fourth generation. His son works alongside him. The fifth generation is learning.',
      },
      {
        type: 'heading',
        text: 'The pit method',
      },
      {
        type: 'paragraph',
        text: 'The hides arrive from a single abattoir forty kilometres south. They are salted for preservation, then soaked for ten days to rehydrate. After liming — a process that removes the hair and opens the fibre structure — they enter a sequence of pits filled with progressively stronger tannin solutions made from ground oak bark and river water.',
      },
      {
        type: 'paragraph',
        text: 'The pits are below ground level, covered with wooden boards when not in use. The smell is earthy, faintly sweet, nothing like what people expect leather to smell. The hides spend between twelve and eighteen months in this sequence — moved from pit to pit as concentration increases — before emerging as finished leather.',
      },
      {
        type: 'pull-quote',
        text: '"Our hides are in those pits for longer than most modern tanneries have existed."',
      },
      {
        type: 'paragraph',
        text: 'The result is a leather with a firmness and density that softens specifically in response to use. It does not crack. It does not peel. It develops a patina that is entirely individual — responding to the particular chemistry of the person who carries it.',
      },
      {
        type: 'caption',
        text: 'The Stargater Cognac Tote uses full-grain leather from the Garonne tannery. Each bag is hand-stitched in Toulouse.',
      },
    ],
    relatedSlugs: ['last-weavers-of-bruges', 'a-table-stays-in-the-family'],
  },
  {
    id: '003',
    slug: 'a-table-stays-in-the-family',
    category: 'Object',
    title: 'A Table Stays in the Family',
    subtitle: 'The design philosophy of making furniture that outlasts its maker',
    excerpt:
      'The design philosophy of making furniture that outlasts its maker. A conversation with Danish furniture maker Lars Bundgaard on material honesty and the ethics of lasting things.',
    readTime: '6 min',
    date: 'February 2026',
    gradient: 'linear-gradient(145deg, #3A3530 0%, #252220 100%)',
    accentColor: '#8B7355',
    textColor: '#EDE8E0',
    tags: ['Object', 'Denmark', 'Furniture', 'Design'],
    body: [
      {
        type: 'paragraph',
        text: 'Lars Bundgaard has a rule: he will not make anything that cannot be repaired. Not should not be repaired. Cannot. Every joint is mechanical, not chemical. Every surface is finished with oil, not lacquer. If a piece breaks — in twenty years, or a hundred — someone can fix it.',
      },
      {
        type: 'pull-quote',
        text: '"A piece of furniture that cannot be repaired is just slow rubbish. It takes thirty years to get to the landfill instead of three, but it gets there."',
      },
      {
        type: 'paragraph',
        text: 'He works from a workshop in Aarhus that he built himself over three summers. The building is warm, heavily insulated, smells of walnut shavings and linseed oil. He has two workbenches, a small collection of hand planes, and a bandsaw that is older than he is.',
      },
      {
        type: 'heading',
        text: 'Against designed obsolescence',
      },
      {
        type: 'paragraph',
        text: 'Lars made his first table at eighteen for his parents\' kitchen. They still eat at it. It has been refinished twice. One leg was replaced — he did it himself, in an afternoon — after a move damaged it. "The table is forty-one years old," he says. "If I had bought a table from a flat-pack shop, we would be on our fifth or sixth one by now. Think about what that means for the planet."',
      },
      {
        type: 'paragraph',
        text: 'His pieces are expensive — considerably more than the mass-market alternatives. He does not apologise for this. He makes the cost-per-year argument with quiet patience: a table that lasts a hundred years and costs three thousand euros costs thirty euros per year. A table that costs three hundred euros and lasts ten years costs the same — and fills a landfill.',
      },
      {
        type: 'pull-quote',
        text: '"The cheap option is almost never cheap. You are borrowing quality from the future and paying with the planet."',
      },
      {
        type: 'caption',
        text: 'The Stargater Walnut Serving Tray is made in collaboration with Lars Bundgaard\'s workshop. Each piece is signed and dated by its maker.',
      },
    ],
    relatedSlugs: ['origin-of-cognac-leather', 'clay-and-the-wheel'],
  },
  {
    id: '004',
    slug: 'sand-wool-outer-hebrides',
    category: 'Material',
    title: 'The Wool That Survived the Atlantic',
    subtitle: 'How Shetland sheep and century-old looms produce the most weather-resistant cloth on earth',
    excerpt:
      'How Shetland sheep, salt wind, and century-old jacquard looms produce the most weather-resistant cloth in the world. A winter visit to the Outer Hebrides.',
    readTime: '8 min',
    date: 'January 2026',
    gradient: 'linear-gradient(145deg, #4A5A6A 0%, #2C3A48 100%)',
    accentColor: '#7A9AB0',
    textColor: '#E8EEF4',
    tags: ['Material', 'Scotland', 'Wool', 'Textiles'],
    body: [
      {
        type: 'paragraph',
        text: 'The sheep on Harris have a harder life than most. The island\'s western edge faces the full weight of the North Atlantic without shelter. The grass is thin and salt-bitten. The winters are long, dark, and wet. The sheep have adapted over centuries: their fleece is dense, waxy, and grows in two distinct layers — an outer layer of long kemps that shed water, an inner layer of fine fibres that trap heat.',
      },
      {
        type: 'pull-quote',
        text: '"The animal designed this. We just figured out how to use it."',
      },
      {
        type: 'paragraph',
        text: 'The mill at Shawbost is one of four still operating on the island. Its oldest loom dates to 1923. The weaver who runs it, Catriona MacLeod, inherited her position from her mother, who inherited it from hers. The loom has been repaired so many times that almost nothing original remains — but the pattern of repairs is itself a kind of history.',
      },
      {
        type: 'heading',
        text: 'The lanolin question',
      },
      {
        type: 'paragraph',
        text: 'Most commercial wool processing removes the lanolin — the natural wax secreted by the sheep — because it makes the yarn harder to dye and adds weight. Harris Tweed and the finest Shetland wools retain much of it. This is why the cloth repels water rather than absorbing it, and why it develops that particular warmth-without-weight that synthetic fibres cannot replicate.',
      },
      {
        type: 'paragraph',
        text: 'Stargater\'s Sand Wool Scarf is woven from Shetland yarns that have been stone-washed — a process that softens the fibre without removing the lanolin — and left in their natural, undyed state. The colour is the colour of the sheep.',
      },
      {
        type: 'caption',
        text: 'Photography taken in February 2026 on the Isle of Lewis. Our thanks to Catriona MacLeod and the Shawbost Mill.',
      },
    ],
    relatedSlugs: ['last-weavers-of-bruges', 'clay-and-the-wheel'],
  },
  {
    id: '005',
    slug: 'clay-and-the-wheel',
    category: 'Maker',
    title: 'Clay and the Wheel',
    subtitle: 'Ceramicist Hélène Morin on the ethics of imperfection',
    excerpt:
      'Ceramicist Hélène Morin on the ethics of imperfection, the politics of the handmade, and why the fingerprints stay in the clay.',
    readTime: '5 min',
    date: 'December 2025',
    gradient: 'linear-gradient(145deg, #8B6B4A 0%, #5C4230 100%)',
    accentColor: '#C4895A',
    textColor: '#F0E8DC',
    tags: ['Maker', 'France', 'Ceramics', 'Interview'],
    body: [
      {
        type: 'paragraph',
        text: 'Hélène Morin\'s studio is in a converted stable outside Limoges. She works alone. There is no music while she throws — she says she needs to listen to the clay, which sounds mystical until you watch her, and then it doesn\'t.',
      },
      {
        type: 'pull-quote',
        text: '"Perfection in ceramics is a machine problem. My job is to do something a machine cannot."',
      },
      {
        type: 'paragraph',
        text: 'She trained at the Limoges ceramics school for four years, then worked in a production studio for three more before concluding that she did not want to make the same thing a thousand times. Now she makes each piece once.',
      },
      {
        type: 'heading',
        text: 'On leaving the fingerprints',
      },
      {
        type: 'paragraph',
        text: '"There is a pressure in contemporary craft to remove the evidence of the hand," she tells us. "To sand things smooth, to make sure the joins are invisible, to produce something that looks — from a distance — like it could have been made by a machine. I find this a strange goal. Why make something by hand and then try to hide it?"',
      },
      {
        type: 'paragraph',
        text: 'Her Amphora Vessel, made for Stargater, has deliberate asymmetry at the lip. The wall thickness varies. There is a fingerprint pressed into the base — not a stamp, an actual print, left during the throwing process. "That is me," she says. "That print will exist in that piece for longer than I will exist. I find that comforting."',
      },
      {
        type: 'caption',
        text: 'The Stargater Amphora Vessel is available in one edition of 40 pieces per year. Each is signed and numbered by Hélène.',
      },
    ],
    relatedSlugs: ['a-table-stays-in-the-family', 'last-weavers-of-bruges'],
  },
  {
    id: '006',
    slug: 'the-slow-season',
    category: 'Philosophy',
    title: 'The Slow Season',
    subtitle: 'An argument for buying less and keeping more',
    excerpt:
      'An argument for buying less, keeping more, and treating the objects in your life as collaborators rather than consumables. The case for the considered purchase.',
    readTime: '4 min',
    date: 'November 2025',
    gradient: 'linear-gradient(145deg, #C4B8A8 0%, #9C9080 100%)',
    accentColor: '#7A6E60',
    textColor: '#1C1812',
    tags: ['Philosophy', 'Sustainability', 'Consumption'],
    body: [
      {
        type: 'paragraph',
        text: 'We believe the most sustainable object is one that is never replaced. The most ethical purchase is one made with the intention of permanence. This is not nostalgia, or anti-modernism, or a luxury position that ignores economic reality. It is a proposition that every object deserves more thought than we currently give it.',
      },
      {
        type: 'pull-quote',
        text: '"Buy one. Use it for thirty years. Give it to someone."',
      },
      {
        type: 'paragraph',
        text: 'The fashion industry produces approximately 92 million tonnes of textile waste per year. The majority of garments purchased today will be discarded within twelve months. This is not a supply problem — the supply is responding to demand. The demand is for cheapness and novelty, priced so low that disposal becomes rational.',
      },
      {
        type: 'heading',
        text: 'A different accounting',
      },
      {
        type: 'paragraph',
        text: 'What if we thought about cost differently? Not the upfront price, but the cost per wear, cost per year, or cost per decade. A coat that costs €1,200 and lasts twenty years costs €60 per year. A coat that costs €80 and lasts two years costs €40 per year — cheaper, but it produces ten times as much waste over the same period.',
      },
      {
        type: 'paragraph',
        text: 'Stargater makes things for the second calculation. We make them well enough that the cost per decade looks reasonable. We design them to avoid fashion cycles so they do not require replacing simply because the aesthetic has moved on.',
      },
      {
        type: 'pull-quote',
        text: '"The objects you live with should be witnesses to your life — accumulating meaning, not just wear."',
      },
      {
        type: 'paragraph',
        text: 'This is not a sermon. It is an invitation. Come slowly. Choose carefully. Buy the thing you will still want in fifteen years. That is what we are trying to make.',
      },
    ],
    relatedSlugs: ['a-table-stays-in-the-family', 'clay-and-the-wheel'],
  },
];

export function getStory(slug: string): Story | undefined {
  return STORIES.find((s) => s.slug === slug);
}
