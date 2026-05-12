import type { Story } from './stories';

export const STORIES_PART_1: Story[] = [
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
    }
];

