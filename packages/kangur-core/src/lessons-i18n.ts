import type { KangurLessonComponentId } from '@kangur/contracts';

import {
  getLocalizedKangurCoreLessonTitle,
  normalizeKangurCoreLocale,
  type KangurCoreLocale,
} from './profile-i18n';
import type { KangurPortableLessonBody } from './lesson-content';
import type { KangurPortableLesson } from './lessons';

type LocalizedLessonDescriptionMap = Partial<Record<KangurLessonComponentId, Record<KangurCoreLocale, string>>>;

const KANGUR_PORTABLE_LESSON_DESCRIPTIONS: LocalizedLessonDescriptionMap = {
  clock: {
    de: 'Stunden, Minuten und volle Uhrzeit auf einer analogen Uhr.',
    en: 'Hours, minutes, and full time on an analog clock.',
    pl: 'Odczytuj godziny z zegara analogowego',
  },
  calendar: {
    de: 'Tage, Monate, Daten und Jahreszeiten.',
    en: 'Days, months, dates, and seasons.',
    pl: 'Dni, miesiące, daty i pory roku',
  },
  adding: {
    de: 'Einstellige, zweistellige Addition und ein Ballspiel.',
    en: 'Single-digit, double-digit, and a ball game.',
    pl: 'Jednocyfrowe, dwucyfrowe i gra z pilkami!',
  },
  subtracting: {
    de: 'Einstellige, zweistellige Subtraktion und Reste.',
    en: 'Single-digit, double-digit, and remainders.',
    pl: 'Jednocyfrowe, dwucyfrowe i reszta',
  },
  multiplication: {
    de: 'Einmaleins und Strategien zur Multiplikation.',
    en: 'Times tables and multiplication strategies.',
    pl: 'Tabliczka mnozenia i algorytmy',
  },
  division: {
    de: 'Grundlagen der Division und Reste.',
    en: 'Basic division and remainders.',
    pl: 'Proste dzielenie i reszta z dzielenia',
  },
  geometry_basics: {
    de: 'Punkte, Strecken, Seiten und Winkel.',
    en: 'Points, segments, sides, and angles.',
    pl: 'Punkt, odcinek, bok i kat',
  },
  geometry_shapes: {
    de: 'Lerne Formen und zeichne sie im Spiel.',
    en: 'Learn shapes and draw them in the game.',
    pl: 'Poznaj figury i narysuj je w grze',
  },
  geometry_symmetry: {
    de: 'Symmetrieachsen und Spiegelungen.',
    en: 'Lines of symmetry and mirror reflections.',
    pl: 'Os symetrii i odbicia lustrzane',
  },
  geometry_perimeter: {
    de: 'Berechne Seitenlaengen Schritt fuer Schritt.',
    en: 'Calculate side lengths step by step.',
    pl: 'Liczenie dlugosci bokow krok po kroku',
  },
  logical_thinking: {
    de: 'Ordnung, Regeln und Beobachtung.',
    en: 'Order, rules, and observation.',
    pl: 'Wprowadzenie do wzorcow, klasyfikacji i analogii',
  },
  logical_patterns: {
    de: 'Wiederkehrende Folgen und Rhythmen.',
    en: 'Recurring sequences and rhythms.',
    pl: 'Odkryj zasady kryjace sie w ciagach i wzorcach',
  },
  logical_classification: {
    de: 'Gruppieren, sortieren und das unpassende Element finden.',
    en: 'Group, sort, and find the odd one out.',
    pl: 'Grupuj, sortuj i znajdz intruza',
  },
  logical_reasoning: {
    de: 'Wenn... dann... Schritt fuer Schritt denken.',
    en: 'If... then... think step by step.',
    pl: 'Jesli... to... - mysl krok po kroku',
  },
  logical_analogies: {
    de: 'Finde dieselbe Beziehung in einem neuen Kontext.',
    en: 'Find the same relationship in a new context.',
    pl: 'Znajdz te sama relacje w nowym kontekscie',
  },
};

const ENGLISH_PORTABLE_LESSON_BODIES: Partial<
  Record<KangurLessonComponentId, KangurPortableLessonBody>
> = {
  adding: {
    introduction:
      'Addition means joining two groups together to see how many there are in total. In the mobile app we already bring over the real lesson content, just without the games.',
    sections: [
      {
        id: 'basics',
        title: 'Addition basics',
        description:
          'Start with simply combining groups. A good habit is to begin with the larger number and count on from there.',
        example: {
          label: 'Example',
          equation: '2 + 3 = 5',
          explanation: 'You have 2 apples, add 3 more, and now you can see 5 altogether.',
        },
        reminders: [
          'Addition answers the question: how many are there altogether?',
          'With small numbers you can count on your fingers or in your head.',
        ],
      },
      {
        id: 'cross-ten',
        title: 'Crossing 10',
        description:
          'When the sum goes past 10, it is easiest to complete 10 first and only then add what is left.',
        example: {
          label: 'Example',
          equation: '7 + 5 = 12',
          explanation: 'First 7 + 3 = 10, then add the remaining 2 to get 12.',
        },
        reminders: [
          'Look for pairs that make 10.',
          'Split the second number into two parts if that makes the calculation easier.',
        ],
      },
      {
        id: 'two-digit',
        title: 'Two-digit addition',
        description:
          'With two-digit numbers, split tens and ones apart. That gives you a stable method instead of guessing.',
        example: {
          label: 'Example',
          equation: '24 + 13 = 37',
          explanation: '20 + 10 = 30 and 4 + 3 = 7. At the end you combine 30 and 7.',
        },
        reminders: [
          'Separate tens from ones.',
          'Combine the parts into one final result.',
        ],
      },
      {
        id: 'remember',
        title: 'Remember',
        description:
          'A few rules speed up counting and help you avoid mistakes in the next exercises.',
        reminders: [
          'The order does not matter: 3 + 5 = 5 + 3.',
          'Adding zero changes nothing: 7 + 0 = 7.',
          'When you go past 10, complete the full ten first.',
        ],
      },
    ],
    practiceNote:
      'The interactive addition games still stay on the web side for now. This mobile screen already brings the learning flow and lesson content, but not the games yet.',
  },
  subtracting: {
    introduction:
      'Subtraction means taking part away from a group and checking how much is left. The mobile version already includes the main lesson content, but not the game yet.',
    sections: [
      {
        id: 'basics',
        title: 'Subtraction basics',
        description:
          'When subtracting, you move back from the starting number or check how much is missing to reach the result.',
        example: {
          label: 'Example',
          equation: '5 - 2 = 3',
          explanation: 'You have 5 apples, take 2 away, and 3 remain.',
        },
        reminders: [
          'Subtraction answers the question: how many are left?',
          'You can count backwards on a number line.',
        ],
      },
      {
        id: 'cross-ten',
        title: 'Crossing 10',
        description:
          'When you need to cross 10, split the number you subtract into two parts: first go down to 10, then subtract the rest.',
        example: {
          label: 'Example',
          equation: '13 - 5 = 8',
          explanation: 'First 13 - 3 = 10, then 10 - 2 = 8.',
        },
        reminders: [
          'Split 5 into 3 and 2 if that gets you to a full ten.',
          'Going down to 10 makes the second step easier.',
        ],
      },
      {
        id: 'two-digit',
        title: 'Two-digit subtraction',
        description:
          'Just like in addition, it helps to treat tens and ones separately.',
        example: {
          label: 'Example',
          equation: '47 - 23 = 24',
          explanation: '40 - 20 = 20 and 7 - 3 = 4. At the end you combine 20 and 4.',
        },
        reminders: [
          'Work out the tens first.',
          'Then subtract the ones and combine the result.',
        ],
      },
      {
        id: 'remember',
        title: 'Remember',
        description:
          'Subtraction has a few rules that are easy to confuse with addition, so it helps to practise them on purpose.',
        reminders: [
          'Subtraction is not commutative: 7 - 3 is not the same as 3 - 7.',
          'Subtracting zero changes nothing: 8 - 0 = 8.',
          'You can check the result with addition: 5 + 3 = 8, so 8 - 3 = 5.',
        ],
      },
    ],
    practiceNote:
      'The subtraction game will be connected later. At this stage the mobile screen already provides the correct sequence of explanations and examples.',
  },
  multiplication: {
    introduction:
      'Multiplication is a faster way to write repeated addition. In the mobile version we first bring over the meaning of the operation, the key times-table facts, and the tricks you need before practice.',
    sections: [
      {
        id: 'intro',
        title: 'What multiplication means',
        description:
          'Multiplication shows how many there are altogether when several groups have the same number of items.',
        example: {
          label: 'Example',
          equation: '3 × 4 = 12',
          explanation: 'You have 3 groups of 4 items, so 4 + 4 + 4. Altogether that makes 12.',
        },
        reminders: [
          'Multiplication is short for adding the same number again and again.',
          'The first number can mean the number of groups and the second the number of items in each group.',
        ],
      },
      {
        id: 'table-23',
        title: 'Times tables × 2 and × 3',
        description:
          'Start by practising the simplest rows. These two come back very often in later exercises.',
        example: {
          label: 'Example',
          equation: '6 × 2 = 12 and 5 × 3 = 15',
          explanation:
            'With × 2 you double the number, and with × 3 you add the same number three times.',
        },
        reminders: [
          'Multiplying by 2 means doubling.',
          'For × 3 you can double first and then add one more equal group.',
        ],
      },
      {
        id: 'table-45',
        title: 'Times tables × 4 and × 5',
        description:
          'It helps to connect × 4 and × 5 with simple observations about even numbers and number endings.',
        example: {
          label: 'Example',
          equation: '7 × 5 = 35',
          explanation:
            'Results for × 5 end with 0 or 5, and 4 × a number means doubling and then doubling again.',
        },
        reminders: [
          'Multiplying by 4 means two doubles in a row.',
          'Multiplying by 5 leads to answers ending in 0 or 5.',
        ],
      },
      {
        id: 'remember',
        title: 'Remember',
        description:
          'A few rules make multiplication faster and help you check whether an answer makes sense.',
        reminders: [
          'Multiplying by 1 keeps the number the same.',
          'Multiplying by 10 adds a zero at the end.',
          'The order does not matter: 3 × 4 = 4 × 3.',
        ],
      },
    ],
    practiceNote:
      'This topic already has its first mobile practice. After reading the lesson, you can go straight into multiplication training.',
  },
  division: {
    introduction:
      'Division means sharing equally into groups. In the mobile version we first bring over the main lesson content: the meaning of division, its link to multiplication, and remainders.',
    sections: [
      {
        id: 'intro',
        title: 'What division means',
        description:
          'In division, you ask how many items go into each group when the split has to be equal.',
        example: {
          label: 'Example',
          equation: '6 ÷ 2 = 3',
          explanation: 'You have 6 cookies and share them equally between 2 people, so each gets 3.',
        },
        reminders: [
          'Division means equal sharing.',
          'The answer tells you how many items go into one group.',
        ],
      },
      {
        id: 'inverse',
        title: 'Division and multiplication',
        description:
          'Multiplication and division are inverse operations, so knowing the times tables helps a lot with division.',
        example: {
          label: 'Example',
          equation: '12 ÷ 4 = 3',
          explanation: 'Since 4 × 3 = 12, 12 ÷ 4 must equal 3.',
        },
        reminders: [
          'If you know 4 × 3 = 12, you also know 12 ÷ 4 = 3 and 12 ÷ 3 = 4.',
          'In harder division tasks, first recall the matching multiplication fact.',
        ],
      },
      {
        id: 'remainder',
        title: 'Remainders',
        description:
          'Not every division can be done without a remainder. Then some items stay outside the equal groups.',
        example: {
          label: 'Example',
          equation: '7 ÷ 2 = 3 remainder 1',
          explanation: 'You can give 3 items to each of 2 groups, and 1 item is left over.',
        },
        reminders: [
          'The remainder is always smaller than the divisor.',
          'Check the result: quotient × divisor + remainder = starting number.',
        ],
      },
      {
        id: 'remember',
        title: 'Remember',
        description:
          'A few simple rules help you quickly check whether a division answer makes sense.',
        reminders: [
          'Any number divided by 1 stays the same.',
          'A number divided by itself equals 1.',
          'Zero divided by any non-zero number equals 0.',
        ],
      },
    ],
    practiceNote:
      'The division game still remains on the web side. The mobile screen already gives you the full learning scaffold before practice.',
  },
  clock: {
    introduction:
      'The clock lesson has three stages: hours, minutes, and combining both hands. On mobile we bring over this learning sequence without the interactive clock exercise.',
    sections: [
      {
        id: 'hours',
        title: 'Hours and the short hand',
        description:
          'First learn to read only the short hand. It shows what hour it is.',
        example: {
          label: 'Example',
          equation: '9:00',
          explanation:
            'If the short hand points to 9 and you ignore the minutes, you read the full hour as nine o clock.',
        },
        reminders: [
          'The short hand shows the hours.',
          'On full hours, focus on it first.',
        ],
      },
      {
        id: 'minutes',
        title: 'Minutes and the long hand',
        description:
          'The long hand shows minutes. Each next number on the clock face means another 5 minutes.',
        example: {
          label: 'Example',
          equation: '7 × 5 = 35 minutes',
          explanation: 'When the long hand points to 7, you read 35 minutes.',
        },
        reminders: [
          '3 means 15 minutes, 6 means 30 minutes, and 9 means 45 minutes.',
          'Remember that the numbers move in jumps of 5 minutes.',
        ],
      },
      {
        id: 'combined',
        title: 'Hours and minutes together',
        description:
          'At the end, combine the hour from the short hand with the minutes from the long hand.',
        example: {
          label: 'Example',
          equation: '8:30',
          explanation: 'The short hand shows 8 and the long hand shows 30 minutes, so you read 8:30.',
        },
        reminders: [
          'Read the hour first and only then the minutes.',
          '5:15 is quarter past 5 and 5:45 is quarter to 6.',
        ],
      },
    ],
    practiceNote:
      'The interactive clock exercise will be connected later. At this stage the mobile screen already recreates the full lesson order needed before practice.',
  },
  calendar: {
    introduction:
      'A calendar helps organize time: days of the week, months, dates, and seasons. On mobile we bring over the main learning structure without the interactive game.',
    sections: [
      {
        id: 'intro',
        title: 'What a calendar is',
        description:
          'A calendar is a way to write down and read time in days, weeks, months, and years.',
        example: {
          label: 'Example',
          equation: '1 week = 7 days',
          explanation:
            'Every week has the same 7 days, and months and years arrange them into a bigger plan of time.',
        },
        reminders: [
          'A year has 12 months.',
          'A week has 7 days.',
        ],
      },
      {
        id: 'days',
        title: 'Days of the week',
        description:
          'It helps to know the order of the days because that makes it easier to tell what was yesterday, what is today, and what will be tomorrow.',
        example: {
          label: 'Example',
          equation: 'Monday -> Tuesday -> Wednesday',
          explanation:
            'If today is Tuesday, then yesterday was Monday and tomorrow will be Wednesday.',
        },
        reminders: [
          'After Friday comes Saturday, and after Saturday comes Sunday.',
          'Saturday and Sunday usually make the weekend.',
        ],
      },
      {
        id: 'months',
        title: 'Months and seasons',
        description:
          'Each month has its own name and number of days. Months also group into four seasons.',
        example: {
          label: 'Example',
          equation: 'March, April, May = spring',
          explanation:
            'You can group months not only by order, but also by seasons, which makes them easier to remember.',
        },
        reminders: [
          'Most months have 30 or 31 days.',
          'February usually has 28 days.',
        ],
      },
      {
        id: 'date',
        title: 'How to read a date',
        description:
          'You write a date in the order day, month, year. It is useful to say it aloud and to read it in digits too.',
        example: {
          label: 'Example',
          equation: '15/03/2025',
          explanation:
            'You can also read it as: the fifteenth of March, two thousand twenty-five.',
        },
        reminders: [
          'Read the day first, then the month, and the year at the end.',
          'The number form and the spoken form should mean the same date.',
        ],
      },
    ],
    practiceNote:
      'The interactive calendar game still remains on the web side. On mobile you already have the full set of basics needed for later practice.',
  },
  geometry_basics: {
    introduction:
      'Geometry basics teach you to look at shapes as sets of points, segments, sides, and angles. In the mobile app we bring over the key ideas you need before more interactive exercises.',
    sections: [
      {
        id: 'intro',
        title: 'What geometry studies',
        description:
          'Geometry describes shapes, position, and size. Instead of only calculating a result, you look at how a figure is built and what elements it contains.',
        example: {
          label: 'Example',
          equation: 'point A, segment AB, triangle ABC',
          explanation:
            'These are three different geometric objects: a single point, part of a line, and a full figure made from several elements.',
        },
        reminders: [
          'Geometry helps you name and compare figures.',
          'One figure can be made from several simpler elements.',
        ],
      },
      {
        id: 'point-line-segment',
        title: 'Point, line, and segment',
        description:
          'A point marks an exact place. A line can continue forever in both directions, while a segment has two ends and its length can be measured.',
        example: {
          label: 'Example',
          equation: 'A •      A-----B',
          explanation:
            'Point A shows only a location, while segment AB has a start, an end, and a specific length.',
        },
        reminders: [
          'A point has no length or width.',
          'A segment is the part of a line between two points.',
        ],
      },
      {
        id: 'sides-angles',
        title: 'Sides and angles',
        description:
          'A side is a straight part of a figure, and an angle appears where two sides meet. These ideas help you describe how a figure is built.',
        example: {
          label: 'Example',
          equation: 'A triangle has 3 sides and 3 angles',
          explanation:
            'Each corner of the triangle creates an angle, and the segments between the corners are the sides.',
        },
        reminders: [
          'The number of sides often helps you recognize a figure.',
          'Angles show how the sides are positioned relative to one another.',
        ],
      },
      {
        id: 'remember',
        title: 'Remember',
        description:
          'These basic ideas come back in almost every later geometry lesson, so it is worth fixing them early.',
        reminders: [
          'A point marks a place.',
          'A segment has two ends and can be measured.',
          'Sides and angles help describe a figure.',
        ],
      },
    ],
    practiceNote:
      'The more interactive geometry workshops still remain on the web side. On mobile you already have the vocabulary and lesson order needed before further practice.',
  },
  geometry_shapes: {
    introduction:
      'Geometric shapes differ by the number of sides, the number of angles, and whether their edges are straight or curved. This lesson organizes the most important shapes and their features.',
    sections: [
      {
        id: 'basic-shapes',
        title: 'Common shapes',
        description:
          'Start by recognizing the main shapes: triangle, square, rectangle, and circle. Each one has features that are easy to notice.',
        example: {
          label: 'Example',
          equation: 'triangle / square / rectangle / circle',
          explanation:
            'A triangle has 3 sides, a square and a rectangle have 4 sides, and a circle has no sides or corners.',
        },
        reminders: [
          'First count the sides or notice that the figure is round.',
          'Corners help you distinguish shapes with straight edges.',
        ],
      },
      {
        id: 'quadrilaterals',
        title: 'Square and rectangle',
        description:
          'A square and a rectangle both belong to the family of four-sided shapes, but they are not identical. Both have four right angles, yet the square has all sides equal.',
        example: {
          label: 'Example',
          equation: 'square: 4 equal sides / rectangle: 2 pairs of equal sides',
          explanation:
            'If all sides have the same length, it is a square. If only opposite sides match, it is a rectangle.',
        },
        reminders: [
          'A square is a special kind of rectangle.',
          'Side lengths help you tell similar figures apart.',
        ],
      },
      {
        id: 'curved-shapes',
        title: 'Circle, oval, and other shapes',
        description:
          'Not every figure has straight edges. You can recognize a circle and an oval by their smooth outline, and a rhombus by its four sides and its slanted look.',
        example: {
          label: 'Example',
          equation: 'circle ≠ oval',
          explanation:
            'A circle stays the same in every direction, while an oval is more stretched. Neither figure has corners.',
        },
        reminders: [
          'No corners is an important clue for circles and ovals.',
          'A rhombus has 4 equal sides, but it does not need right angles.',
        ],
      },
      {
        id: 'remember',
        title: 'Remember',
        description:
          'When you identify a shape, it is best to compare several features at once instead of relying only on the name or general look.',
        reminders: [
          'Count sides and corners.',
          'Check whether sides are equal and whether there are right angles.',
          'Notice whether the figure has straight or curved edges.',
        ],
      },
    ],
    practiceNote:
      'The drawing game for shapes still remains on the web side. This mobile lesson already gives you the structure for recognizing and comparing shapes.',
  },
  geometry_symmetry: {
    introduction:
      'Symmetry helps you see when a figure is made from two matching halves. This matters both when you look at shapes and when you try to draw them.',
    sections: [
      {
        id: 'intro',
        title: 'What symmetry is',
        description:
          'A figure is symmetrical when you can divide it so that one part matches the other like a mirror image.',
        example: {
          label: 'Example',
          equation: '🦋',
          explanation:
            'The butterfly wings on the left and right look alike, so it is easy to notice symmetry.',
        },
        reminders: [
          'Symmetry does not mean that everything looks the same from every side.',
          'You are looking for two halves that match after folding or reflecting.',
        ],
      },
      {
        id: 'axis',
        title: 'Line of symmetry',
        description:
          'A line of symmetry divides a figure into two matching parts. Sometimes it is vertical, sometimes horizontal, and sometimes diagonal.',
        example: {
          label: 'Example',
          equation: 'square: 4 lines of symmetry',
          explanation:
            'A square has a vertical line, a horizontal line, and two diagonal lines because each of them still splits the figure into matching halves.',
        },
        reminders: [
          'Not every figure has only one line of symmetry.',
          'If the two parts do not match after folding, that line is not a symmetry line.',
        ],
      },
      {
        id: 'mirror',
        title: 'Mirror reflection',
        description:
          'In a mirror reflection, every point on one side of the line has a partner on the other side at the same distance.',
        example: {
          label: 'Example',
          equation: '● | ●',
          explanation:
            'Two points on opposite sides of the line are symmetrical if they are equally far from the mirror line.',
        },
        reminders: [
          'A reflection does not move a figure randomly. It flips it around the line.',
          'The distance from the line must match on both sides.',
        ],
      },
      {
        id: 'remember',
        title: 'Remember',
        description:
          'The best way to check symmetry is to look for a possible axis and compare matching points or sides.',
        reminders: [
          'First mark a possible symmetry line.',
          'Then compare the left and right or top and bottom parts.',
          'If one side does not match, there is no symmetry around that line.',
        ],
      },
    ],
    practiceNote:
      'Interactive mirror exercises still remain on the web side. On mobile you can already practise the reasoning needed to find lines of symmetry.',
  },
  geometry_perimeter: {
    introduction:
      'Perimeter is the total distance around a figure. This lesson teaches you to add side lengths step by step and check whether the result makes sense.',
    sections: [
      {
        id: 'intro',
        title: 'What perimeter is',
        description:
          'You get the perimeter of a figure by adding the lengths of all its sides. It is like walking all the way around the shape and measuring the whole route.',
        example: {
          label: 'Example',
          equation: '3 cm + 2 cm + 3 cm + 2 cm = 10 cm',
          explanation:
            'You add each side of the rectangle and get the total length of the figure border.',
        },
        reminders: [
          'Perimeter is the sum of all sides.',
          'The answer should use the same unit as the side lengths.',
        ],
      },
      {
        id: 'rectangles',
        title: 'Rectangles and squares',
        description:
          'In a rectangle, opposite sides are equal, and in a square all sides are equal. That makes it easier to plan your addition.',
        example: {
          label: 'Example',
          equation: 'square 4 cm + 4 cm + 4 cm + 4 cm = 16 cm',
          explanation:
            'If all sides are the same, you can repeat the same length instead of finding a new value each time.',
        },
        reminders: [
          'A rectangle often has two pairs of equal sides.',
          'A square has the same length on all four sides.',
        ],
      },
      {
        id: 'step-by-step',
        title: 'Counting step by step',
        description:
          'The safest method is to write down all side lengths in order and only then add the numbers. That lowers the risk of skipping a side.',
        example: {
          label: 'Example',
          equation: '5 cm + 1 cm + 2 cm + 1 cm + 5 cm + 2 cm',
          explanation:
            'With a more complex figure, you move around the edge one side at a time until you return to the start.',
        },
        reminders: [
          'Do not skip any side.',
          'Start in one place and move around the figure in a fixed direction.',
        ],
      },
      {
        id: 'remember',
        title: 'Remember',
        description:
          'Perimeter is easy to calculate when you check every side carefully and keep track of the units.',
        reminders: [
          'Add every side exactly once.',
          'Check that the result has the correct unit.',
          'In equal-sided figures you can reuse the repeated length.',
        ],
      },
    ],
    practiceNote:
      'The mobile lesson already organizes the way to calculate perimeter, but richer drawing tasks still remain on the web side.',
  },
  logical_thinking: {
    introduction:
      'Logical thinking helps you organize information, find rules, and draw conclusions step by step. It is a shared foundation for puzzles, maths, and everyday problem solving.',
    sections: [
      {
        id: 'intro',
        title: 'What logical thinking is',
        description:
          'It is the skill of looking for order and checking whether an answer really follows from the facts instead of chance.',
        example: {
          label: 'Example',
          equation: 'If all cats have four legs and Muffin is a cat...',
          explanation:
            '...then you can conclude that Muffin has four legs. The conclusion follows from the given facts.',
        },
        reminders: [
          'Look for the rule, not only for a single example.',
          'A good answer should be explainable.',
        ],
      },
      {
        id: 'patterns',
        title: 'Patterns and sequences',
        description:
          'Logical thinking often begins with noticing a repeating arrangement or a constant change.',
        example: {
          label: 'Example',
          equation: '2, 4, 6, 8, ?',
          explanation: 'Each step increases the number by 2, so the next element is 10.',
        },
        reminders: [
          'Look for a fixed difference or a repeating group of elements.',
          'A pattern can involve numbers, colours, shapes, or all of them together.',
        ],
      },
      {
        id: 'classification',
        title: 'Classification and the odd one out',
        description:
          'Sometimes you need to arrange items into groups by a shared feature, and sometimes you need to find the one item that does not fit.',
        example: {
          label: 'Example',
          equation: '🍎 🍌 🥕 🍇',
          explanation: 'The odd one out is 🥕 because the others are fruit and it is a vegetable.',
        },
        reminders: [
          'First name the shared feature of the group.',
          'The item that does not fit breaks the same rule that links the rest.',
        ],
      },
      {
        id: 'reasoning',
        title: 'If... then...',
        description:
          'Reasoning means connecting known facts and checking what follows from them.',
        example: {
          label: 'Example',
          equation: 'If a number is even, it is divisible by 2. Is 6 even?',
          explanation: 'Yes. Since 6 is even, the rule tells you it is divisible by 2.',
        },
        reminders: [
          'First identify the condition, then check whether it fits the case.',
          'Do not guess. Show which step leads to the answer.',
        ],
      },
    ],
    practiceNote:
      'These lessons prepare you for the next logical tasks. On mobile we start with shared rules and examples, and the more interactive exercises will come later.',
  },
  logical_patterns: {
    introduction:
      'Patterns and sequences teach you to predict the next step from a rule. This is one of the most important skills in logical and mathematical tasks.',
    sections: [
      {
        id: 'visual-patterns',
        title: 'Colour and shape patterns',
        description:
          'The easiest patterns rely on a repeating group of symbols, colours, or shapes.',
        example: {
          label: 'Example',
          equation: '🔴 🔵 🔴 🔵 🔴 ?',
          explanation: 'The red-blue pattern repeats, so the missing element is 🔵.',
        },
        reminders: [
          'Find the smallest part that repeats.',
          'Check whether the same rule works from start to finish.',
        ],
      },
      {
        id: 'arithmetic-sequences',
        title: 'Sequences with a fixed difference',
        description:
          'In arithmetic sequences, every next element changes by the same amount.',
        example: {
          label: 'Example',
          equation: '5, 10, 15, 20, ?',
          explanation: 'Each step adds 5, so the next element is 25.',
        },
        reminders: [
          'Subtract neighbouring numbers and check whether the difference stays the same.',
          'If the difference does not fit, look for another kind of rule.',
        ],
      },
      {
        id: 'geometric-sequences',
        title: 'Sequences with a fixed ratio',
        description:
          'Some sequences do not add the same number. Instead, they multiply by the same value each time.',
        example: {
          label: 'Example',
          equation: '1, 2, 4, 8, 16, ?',
          explanation: 'Each element is twice as large as the previous one, so the next is 32.',
        },
        reminders: [
          'Divide one term by the previous one and check whether the ratio repeats.',
          'Fast growth often means multiplication, not addition.',
        ],
      },
      {
        id: 'strategy',
        title: 'How to search for the rule',
        description:
          'When the pattern is not obvious, it helps to use a short checklist instead of guessing.',
        example: {
          label: 'Example',
          equation: '3, 6, 12, 24, ?',
          explanation:
            'First check differences, then ratios. Here each step multiplies by 2, so the answer is 48.',
        },
        reminders: [
          'Check differences first, then ratios, and only then relations among several earlier elements.',
          'Confirm the rule on all known elements, not just the first two.',
        ],
      },
    ],
    practiceNote:
      'The mobile screen already gives you a real introduction to patterns and sequences. The next logic topics can build on the same way of thinking.',
  },
  logical_classification: {
    introduction:
      'Classification means grouping elements by a shared feature. It is one of the simplest and most important ways to organize information.',
    sections: [
      {
        id: 'intro',
        title: 'What classification is',
        description:
          'To classify correctly, you first need to name the feature that connects the elements in one group.',
        example: {
          label: 'Example',
          equation: '🍎 🍌 🍇 🍓',
          explanation: 'These items can be placed in one fruit group because they share the same category.',
        },
        reminders: [
          'You can group by colour, shape, size, category, or a number property.',
          'First decide on the feature, then build the groups.',
        ],
      },
      {
        id: 'many-features',
        title: 'Several features at once',
        description:
          'Sometimes one feature is not enough, and you have to look at colour, size, or another extra property at the same time.',
        example: {
          label: 'Example',
          equation: 'big red / big blue / small red / small blue',
          explanation: 'Here each group is created by combining two features: size and colour.',
        },
        reminders: [
          'Each extra feature increases the number of possible groups.',
          'Describe groups precisely so you do not mix different criteria.',
        ],
      },
      {
        id: 'intruder',
        title: 'Find the odd one out',
        description:
          'Odd-one-out tasks check whether you understand the group rule and can point to the element that breaks it.',
        example: {
          label: 'Example',
          equation: '2, 4, 7, 8, 10',
          explanation: 'The odd one out is 7 because the other numbers are even and 7 is odd.',
        },
        reminders: [
          'First identify the shared feature of most elements.',
          'The odd one out does not fit the rule, and you should be able to explain why.',
        ],
      },
      {
        id: 'venn',
        title: 'Venn diagram and summary',
        description:
          'A Venn diagram helps show what belongs to one group, another group, or both at the same time.',
        example: {
          label: 'Example',
          equation: 'sport / music / both',
          explanation: 'The overlap shows the elements that fit two categories at once.',
        },
        reminders: [
          'The overlap is the intersection of two sets.',
          'Classification organizes information and makes later reasoning easier.',
        ],
      },
    ],
    practiceNote:
      'The mobile version already gives you the full line of thinking needed for classification tasks, even if richer interactions still stay on the web side.',
  },
  logical_reasoning: {
    introduction:
      'Logical reasoning means moving from known facts to new conclusions. Instead of guessing, you rely on rules and check what follows from them.',
    sections: [
      {
        id: 'intro',
        title: 'What reasoning is',
        description:
          'Reasoning can go from the general rule to a specific case, or from many observations to a more general idea.',
        example: {
          label: 'Example',
          equation: 'All dogs bark. Rex is a dog.',
          explanation: 'From these two facts, it follows that Rex barks.',
        },
        reminders: [
          'Deduction moves from a general rule to a concrete case.',
          'A good conclusion must rely on what you really know.',
        ],
      },
      {
        id: 'if-then',
        title: 'If... then...',
        description:
          'Conditional sentences connect a condition with a consequence and are a basic tool of logical thinking.',
        example: {
          label: 'Example',
          equation: 'If a number is even, it is divisible by 2.',
          explanation: 'Since 8 is even, the rule tells you that 8 is divisible by 2.',
        },
        reminders: [
          'Do not confuse a rule with its reverse.',
          'First check whether the condition is satisfied.',
        ],
      },
      {
        id: 'quantifiers',
        title: 'All, some, none',
        description:
          'Quantifiers show how widely a statement applies and what you need to watch out for when drawing conclusions.',
        example: {
          label: 'Example',
          equation: 'Some cats are ginger.',
          explanation: 'That does not mean every cat is ginger. The statement only applies to part of the group.',
        },
        reminders: [
          'All means every case.',
          'Some means only part of the cases.',
          'None means there is no exception at all.',
        ],
      },
      {
        id: 'puzzles',
        title: 'Puzzles step by step',
        description:
          'In more complex tasks, you need to combine several clues, remove impossible options, and keep checking whether the solution still fits.',
        example: {
          label: 'Example',
          equation: 'There are three houses: red, blue, green...',
          explanation:
            'Solving a puzzle means writing down certain facts and systematically ruling out what is impossible.',
        },
        reminders: [
          'Start with direct facts.',
          'Eliminating wrong options often leads you to the right answer.',
        ],
      },
    ],
    practiceNote:
      'This topic prepares you for harder logic puzzles. On mobile we first bring over the way of thinking itself and the structure for solving problems.',
  },
  logical_analogies: {
    introduction:
      'An analogy means finding the same relationship in two different pairs. It is not about surface similarity, but about the same type of connection.',
    sections: [
      {
        id: 'intro',
        title: 'What an analogy is',
        description:
          'In an analogy, you ask: what relationship connects the first pair, and how can I transfer it to the second pair?',
        example: {
          label: 'Example',
          equation: 'Bird : fly = fish : ?',
          explanation: 'The relationship is creature and way of moving, so the answer is swim.',
        },
        reminders: [
          'First name the relationship in the first pair.',
          'Only then look for the element that rebuilds the same relationship.',
        ],
      },
      {
        id: 'verbal',
        title: 'Word analogies',
        description:
          'Word analogies can rely on opposites, function, part and whole, or a typical action.',
        example: {
          label: 'Example',
          equation: 'Scissors : cutting = pencil : ?',
          explanation: 'This is a tool -> function relationship, so the answer is writing.',
        },
        reminders: [
          'Finding the type of relationship matters more than the words themselves.',
          'Opposites and function are two very common kinds of analogy.',
        ],
      },
      {
        id: 'numbers-shapes',
        title: 'Number and shape analogies',
        description:
          'In number or visual analogies, the same operation changes numbers, directions, colours, or the number of elements.',
        example: {
          label: 'Example',
          equation: '2 : 4 = 5 : ?',
          explanation: 'The relationship is multiplying by 2, so the missing answer is 10.',
        },
        reminders: [
          'With numbers, check addition, subtraction, multiplication, and division.',
          'With shapes, look for rotation, size, colour, and the number of elements.',
        ],
      },
      {
        id: 'cause-whole',
        title: 'Part-whole and cause-effect',
        description:
          'Many analogies are based on one element belonging to another, or on something causing a certain effect.',
        example: {
          label: 'Example',
          equation: 'Page : book = brick : ?',
          explanation: 'This is a part -> whole relationship, so the answer is wall or building.',
        },
        reminders: [
          'Part-whole is a very common pattern in analogy tasks.',
          'Cause-effect asks what produces a given result.',
        ],
      },
    ],
    practiceNote:
      'Analogies teach you to carry a rule into a new context. That makes them a good bridge between simple patterns and harder logical reasoning.',
  },
};

const GERMAN_PORTABLE_LESSON_BODIES: Partial<
  Record<KangurLessonComponentId, KangurPortableLessonBody>
> = {
  adding: {
    introduction:
      'Addition bedeutet, zwei Gruppen zusammenzufuehren, um zu sehen, wie viele es insgesamt sind. In der mobilen App bringen wir den echten Lektionstext schon mit, nur noch ohne Spiele.',
    sections: [
      {
        id: 'basics',
        title: 'Grundlagen der Addition',
        description:
          'Beginne mit dem einfachen Zusammenlegen von Gruppen. Eine gute Gewohnheit ist es, mit der groesseren Zahl zu starten und dann weiterzuzuzaehlen.',
        example: {
          label: 'Beispiel',
          equation: '2 + 3 = 5',
          explanation: 'Du hast 2 Aepfel, legst 3 dazu und siehst dann insgesamt 5.',
        },
        reminders: [
          'Addition beantwortet die Frage: Wie viel ist zusammen da?',
          'Bei kleinen Zahlen kannst du an den Fingern oder im Kopf zaehlen.',
        ],
      },
      {
        id: 'cross-ten',
        title: 'Ueber 10 hinaus',
        description:
          'Wenn die Summe ueber 10 geht, ist es am einfachsten, zuerst bis 10 zu ergaenzen und dann den Rest dazuzurechnen.',
        example: {
          label: 'Beispiel',
          equation: '7 + 5 = 12',
          explanation: 'Zuerst 7 + 3 = 10, dann addierst du die restlichen 2 und bekommst 12.',
        },
        reminders: [
          'Suche nach Paaren, die zusammen 10 ergeben.',
          'Teile die zweite Zahl in zwei Teile, wenn das die Rechnung leichter macht.',
        ],
      },
      {
        id: 'two-digit',
        title: 'Zweistellige Addition',
        description:
          'Bei zweistelligen Zahlen trennst du Zehner und Einer. Das ist eine stabile Methode statt zu raten.',
        example: {
          label: 'Beispiel',
          equation: '24 + 13 = 37',
          explanation: '20 + 10 = 30 und 4 + 3 = 7. Am Ende verbindest du 30 und 7.',
        },
        reminders: [
          'Trenne Zehner von Einern.',
          'Fuehre die Teile am Ende zu einem Ergebnis zusammen.',
        ],
      },
      {
        id: 'remember',
        title: 'Merke dir',
        description:
          'Ein paar Regeln beschleunigen das Rechnen und helfen dir, Fehler in den naechsten Aufgaben zu vermeiden.',
        reminders: [
          'Die Reihenfolge spielt keine Rolle: 3 + 5 = 5 + 3.',
          'Null veraendert nichts: 7 + 0 = 7.',
          'Wenn du ueber 10 gehst, ergaenze zuerst zum vollen Zehner.',
        ],
      },
    ],
    practiceNote:
      'Die interaktiven Additionsspiele bleiben vorerst noch auf der Web-Seite. Dieser mobile Screen bringt aber schon den Lernfluss und den Lektionstext mit.',
  },
  subtracting: {
    introduction:
      'Subtraktion bedeutet, einen Teil aus einer Gruppe wegzunehmen und zu pruefen, wie viel uebrig bleibt. Die mobile Version enthaelt schon den Hauptteil der Lektion, aber noch nicht das Spiel.',
    sections: [
      {
        id: 'basics',
        title: 'Grundlagen der Subtraktion',
        description:
          'Beim Subtrahieren gehst du von der Startzahl rueckwaerts oder pruefst, wie viel bis zum Ergebnis fehlt.',
        example: {
          label: 'Beispiel',
          equation: '5 - 2 = 3',
          explanation: 'Du hast 5 Aepfel, nimmst 2 weg und es bleiben 3.',
        },
        reminders: [
          'Subtraktion beantwortet die Frage: Wie viel bleibt uebrig?',
          'Du kannst auf einer Zahlengeraden rueckwaerts zaehlen.',
        ],
      },
      {
        id: 'cross-ten',
        title: 'Ueber 10 zurueck',
        description:
          'Wenn du ueber 10 zurueckgehen musst, teile die abzuziehende Zahl in zwei Teile: erst bis 10, dann den Rest.',
        example: {
          label: 'Beispiel',
          equation: '13 - 5 = 8',
          explanation: 'Zuerst 13 - 3 = 10, danach 10 - 2 = 8.',
        },
        reminders: [
          'Teile die 5 in 3 und 2, wenn du so zuerst den vollen Zehner erreichst.',
          'Der Schritt bis 10 macht den zweiten Teil leichter.',
        ],
      },
      {
        id: 'two-digit',
        title: 'Zweistellige Subtraktion',
        description:
          'Genauso wie bei der Addition hilft es, Zehner und Einer getrennt zu betrachten.',
        example: {
          label: 'Beispiel',
          equation: '47 - 23 = 24',
          explanation: '40 - 20 = 20 und 7 - 3 = 4. Am Ende verbindest du 20 und 4.',
        },
        reminders: [
          'Rechne zuerst die Zehner.',
          'Danach subtrahierst du die Einer und setzt das Ergebnis zusammen.',
        ],
      },
      {
        id: 'remember',
        title: 'Merke dir',
        description:
          'Bei der Subtraktion gibt es einige Regeln, die man leicht mit der Addition verwechselt. Deshalb lohnt sich bewusstes Ueben.',
        reminders: [
          'Subtraktion ist nicht vertauschbar: 7 - 3 ist nicht dasselbe wie 3 - 7.',
          'Null wegnehmen veraendert nichts: 8 - 0 = 8.',
          'Du kannst das Ergebnis mit Addition pruefen: 5 + 3 = 8, also 8 - 3 = 5.',
        ],
      },
    ],
    practiceNote:
      'Das Subtraktionsspiel wird spaeter angeschlossen. In diesem Stadium gibt der mobile Screen aber schon die richtige Folge von Erklaerungen und Beispielen.',
  },
  multiplication: {
    introduction:
      'Multiplikation ist eine schnellere Schreibweise fuer wiederholte Addition. In der mobilen Version bringen wir zuerst den Sinn der Operation, die wichtigsten Reihen des Einmaleins und die noetigen Tricks vor der Uebung mit.',
    sections: [
      {
        id: 'intro',
        title: 'Was Multiplizieren bedeutet',
        description:
          'Multiplikation zeigt, wie viel insgesamt da ist, wenn mehrere Gruppen gleich viele Elemente enthalten.',
        example: {
          label: 'Beispiel',
          equation: '3 × 4 = 12',
          explanation:
            'Du hast 3 Gruppen mit je 4 Elementen, also 4 + 4 + 4. Zusammen ergibt das 12.',
        },
        reminders: [
          'Multiplikation ist die Kurzform fuer das wiederholte Addieren derselben Zahl.',
          'Die erste Zahl kann die Anzahl der Gruppen bedeuten, die zweite die Anzahl der Elemente pro Gruppe.',
        ],
      },
      {
        id: 'table-23',
        title: 'Einmaleins × 2 und × 3',
        description:
          'Uebe zuerst die einfachsten Reihen. Diese beiden tauchen in spaeteren Aufgaben sehr oft wieder auf.',
        example: {
          label: 'Beispiel',
          equation: '6 × 2 = 12 und 5 × 3 = 15',
          explanation:
            'Bei × 2 verdoppelst du die Zahl, und bei × 3 addierst du dieselbe Zahl dreimal.',
        },
        reminders: [
          'Mit 2 multiplizieren heisst verdoppeln.',
          'Bei × 3 kannst du erst verdoppeln und dann noch eine gleiche Gruppe addieren.',
        ],
      },
      {
        id: 'table-45',
        title: 'Einmaleins × 4 und × 5',
        description:
          'Es hilft, × 4 und × 5 mit einfachen Beobachtungen ueber gerade Zahlen und Endziffern zu verbinden.',
        example: {
          label: 'Beispiel',
          equation: '7 × 5 = 35',
          explanation:
            'Ergebnisse von × 5 enden auf 0 oder 5, und 4 × eine Zahl bedeutet doppeln und noch einmal doppeln.',
        },
        reminders: [
          'Mit 4 multiplizieren sind zwei Verdopplungen hintereinander.',
          'Mit 5 multiplizieren fuehrt zu Ergebnissen mit 0 oder 5 am Ende.',
        ],
      },
      {
        id: 'remember',
        title: 'Merke dir',
        description:
          'Ein paar Regeln machen die Multiplikation schneller und helfen dir zu pruefen, ob ein Ergebnis sinnvoll ist.',
        reminders: [
          'Mit 1 multiplizieren laesst die Zahl unveraendert.',
          'Mit 10 multiplizieren haengt eine Null an.',
          'Die Reihenfolge spielt keine Rolle: 3 × 4 = 4 × 3.',
        ],
      },
    ],
    practiceNote:
      'Zu diesem Thema gibt es bereits das erste mobile Training. Nach der Lektion kannst du direkt in die Multiplikationsuebung wechseln.',
  },
  division: {
    introduction:
      'Division bedeutet gleichmaessiges Verteilen in Gruppen. In der mobilen Version bringen wir zuerst den Hauptteil der Lektion mit: den Sinn der Division, die Verbindung zur Multiplikation und den Rest.',
    sections: [
      {
        id: 'intro',
        title: 'Was Dividieren bedeutet',
        description:
          'Bei der Division fragst du, wie viele Elemente in jede Gruppe kommen, wenn die Aufteilung gleich sein soll.',
        example: {
          label: 'Beispiel',
          equation: '6 ÷ 2 = 3',
          explanation:
            'Du hast 6 Kekse und teilst sie gleichmaessig auf 2 Personen auf, also bekommt jede 3.',
        },
        reminders: [
          'Division bedeutet gleichmaessiges Verteilen.',
          'Das Ergebnis sagt dir, wie viele Elemente in eine Gruppe kommen.',
        ],
      },
      {
        id: 'inverse',
        title: 'Division und Multiplikation',
        description:
          'Multiplikation und Division sind Umkehroperationen. Deshalb hilft das Einmaleins sehr beim Dividieren.',
        example: {
          label: 'Beispiel',
          equation: '12 ÷ 4 = 3',
          explanation: 'Weil 4 × 3 = 12 gilt, muss 12 ÷ 4 gleich 3 sein.',
        },
        reminders: [
          'Wenn du 4 × 3 = 12 kennst, kennst du auch 12 ÷ 4 = 3 und 12 ÷ 3 = 4.',
          'Bei schwierigeren Divisionen erinnere dich zuerst an die passende Multiplikation.',
        ],
      },
      {
        id: 'remainder',
        title: 'Rest bei der Division',
        description:
          'Nicht jede Division geht ohne Rest auf. Dann bleiben einige Elemente ausserhalb der gleich grossen Gruppen uebrig.',
        example: {
          label: 'Beispiel',
          equation: '7 ÷ 2 = 3 Rest 1',
          explanation: 'Du kannst 2 Gruppen je 3 geben, und 1 Element bleibt uebrig.',
        },
        reminders: [
          'Der Rest ist immer kleiner als der Divisor.',
          'Pruefe das Ergebnis: Quotient × Divisor + Rest = Ausgangszahl.',
        ],
      },
      {
        id: 'remember',
        title: 'Merke dir',
        description:
          'Ein paar einfache Regeln helfen dir schnell zu pruefen, ob ein Divisionsergebnis sinnvoll ist.',
        reminders: [
          'Jede Zahl geteilt durch 1 bleibt gleich.',
          'Eine Zahl geteilt durch sich selbst ergibt 1.',
          'Null geteilt durch eine von null verschiedene Zahl ergibt 0.',
        ],
      },
    ],
    practiceNote:
      'Das Divisionsspiel bleibt noch auf der Web-Seite. Der mobile Screen gibt dir aber schon das vollstaendige Lern-Geruest vor der Uebung.',
  },
  clock: {
    introduction:
      'Die Uhrenlektion besteht aus drei Schritten: Stunden, Minuten und dem Zusammenspiel beider Zeiger. Auf mobile bringen wir diese Lernreihenfolge ohne die interaktive Uhrenuebung mit.',
    sections: [
      {
        id: 'hours',
        title: 'Stunden und der kurze Zeiger',
        description:
          'Lerne zuerst, nur den kurzen Zeiger zu lesen. Er zeigt die Stunde an.',
        example: {
          label: 'Beispiel',
          equation: '9:00',
          explanation:
            'Wenn der kurze Zeiger auf 9 steht und du die Minuten ignorierst, liest du die volle Stunde neun Uhr ab.',
        },
        reminders: [
          'Der kurze Zeiger ist fuer die Stunden da.',
          'Bei vollen Stunden schaust du zuerst nur auf ihn.',
        ],
      },
      {
        id: 'minutes',
        title: 'Minuten und der lange Zeiger',
        description:
          'Der lange Zeiger zeigt die Minuten. Jede naechste Zahl auf dem Zifferblatt steht fuer weitere 5 Minuten.',
        example: {
          label: 'Beispiel',
          equation: '7 × 5 = 35 Minuten',
          explanation: 'Wenn der lange Zeiger auf 7 steht, liest du 35 Minuten.',
        },
        reminders: [
          '3 bedeutet 15 Minuten, 6 bedeutet 30 Minuten und 9 bedeutet 45 Minuten.',
          'Die Zahlen springen immer in 5-Minuten-Schritten.',
        ],
      },
      {
        id: 'combined',
        title: 'Stunden und Minuten zusammen',
        description:
          'Am Ende verbindest du die Stunde vom kurzen Zeiger mit den Minuten vom langen Zeiger.',
        example: {
          label: 'Beispiel',
          equation: '8:30',
          explanation:
            'Der kurze Zeiger zeigt 8 und der lange 30 Minuten, also liest du 8:30.',
        },
        reminders: [
          'Lies zuerst die Stunde und dann die Minuten.',
          '5:15 ist Viertel nach 5 und 5:45 ist Viertel vor 6.',
        ],
      },
    ],
    practiceNote:
      'Die interaktive Uhrenuebung wird spaeter angeschlossen. In diesem Stadium bildet der mobile Screen aber schon die komplette Lernreihenfolge fuer die Uebung ab.',
  },
  calendar: {
    introduction:
      'Ein Kalender hilft dabei, Zeit zu ordnen: Wochentage, Monate, Daten und Jahreszeiten. Auf mobile bringen wir die Hauptstruktur der Lektion ohne das interaktive Spiel mit.',
    sections: [
      {
        id: 'intro',
        title: 'Was ein Kalender ist',
        description:
          'Ein Kalender ist eine Art, Zeit in Tagen, Wochen, Monaten und Jahren aufzuschreiben und zu lesen.',
        example: {
          label: 'Beispiel',
          equation: '1 Woche = 7 Tage',
          explanation:
            'Jede Woche hat dieselben 7 Tage, und Monate und Jahre ordnen sie zu einem groesseren Zeitplan.',
        },
        reminders: [
          'Ein Jahr hat 12 Monate.',
          'Eine Woche hat 7 Tage.',
        ],
      },
      {
        id: 'days',
        title: 'Wochentage',
        description:
          'Es hilft, die Reihenfolge der Tage zu kennen. So weisst du leichter, was gestern war, was heute ist und was morgen kommt.',
        example: {
          label: 'Beispiel',
          equation: 'Montag -> Dienstag -> Mittwoch',
          explanation:
            'Wenn heute Dienstag ist, dann war gestern Montag und morgen ist Mittwoch.',
        },
        reminders: [
          'Auf Freitag folgt Samstag, und auf Samstag folgt Sonntag.',
          'Samstag und Sonntag sind meistens das Wochenende.',
        ],
      },
      {
        id: 'months',
        title: 'Monate und Jahreszeiten',
        description:
          'Jeder Monat hat einen eigenen Namen und eine bestimmte Anzahl von Tagen. Monate lassen sich auch zu vier Jahreszeiten ordnen.',
        example: {
          label: 'Beispiel',
          equation: 'Maerz, April, Mai = Fruehling',
          explanation:
            'Monate lassen sich nicht nur nach Reihenfolge, sondern auch nach Jahreszeiten gruppieren. Das macht sie leichter merkbar.',
        },
        reminders: [
          'Die meisten Monate haben 30 oder 31 Tage.',
          'Der Februar hat normalerweise 28 Tage.',
        ],
      },
      {
        id: 'date',
        title: 'Wie man ein Datum liest',
        description:
          'Ein Datum schreibst du in der Reihenfolge Tag, Monat, Jahr. Es ist gut, es sowohl gesprochen als auch in Ziffern lesen zu koennen.',
        example: {
          label: 'Beispiel',
          equation: '15/03/2025',
          explanation:
            'Du kannst es auch so lesen: der fuenfzehnte Maerz zweitausendfuenfundzwanzig.',
        },
        reminders: [
          'Lies zuerst den Tag, dann den Monat und am Ende das Jahr.',
          'Die Zahlenschreibweise und die gesprochene Form muessen dasselbe Datum meinen.',
        ],
      },
    ],
    practiceNote:
      'Das interaktive Kalenderspiel bleibt noch auf der Web-Seite. Auf mobile hast du aber schon den vollen Satz an Grundlagen fuer spaetere Uebung.',
  },
  geometry_basics: {
    introduction:
      'Die Grundlagen der Geometrie lehren dich, Figuren als Kombination von Punkten, Strecken, Seiten und Winkeln zu sehen. In der mobilen App bringen wir die wichtigsten Begriffe und Beobachtungen vor interaktiveren Uebungen mit.',
    sections: [
      {
        id: 'intro',
        title: 'Womit sich Geometrie beschaeftigt',
        description:
          'Geometrie beschreibt Formen, Lage und Groesse. Statt nur ein Ergebnis zu berechnen, schaust du darauf, wie eine Figur aufgebaut ist und aus welchen Elementen sie besteht.',
        example: {
          label: 'Beispiel',
          equation: 'Punkt A, Strecke AB, Dreieck ABC',
          explanation:
            'Das sind drei verschiedene geometrische Objekte: ein einzelner Punkt, ein Teil einer Linie und eine ganze Figur aus mehreren Elementen.',
        },
        reminders: [
          'Geometrie hilft dir, Figuren zu benennen und zu vergleichen.',
          'Eine Figur kann aus mehreren einfacheren Elementen bestehen.',
        ],
      },
      {
        id: 'point-line-segment',
        title: 'Punkt, Gerade und Strecke',
        description:
          'Ein Punkt markiert eine genaue Stelle. Eine Gerade kann in beide Richtungen unbegrenzt weiterlaufen, waehrend eine Strecke zwei Enden hat und gemessen werden kann.',
        example: {
          label: 'Beispiel',
          equation: 'A •      A-----B',
          explanation:
            'Punkt A zeigt nur einen Ort, waehrend die Strecke AB einen Anfang, ein Ende und eine konkrete Laenge hat.',
        },
        reminders: [
          'Ein Punkt hat keine Laenge und keine Breite.',
          'Eine Strecke ist der Teil einer Geraden zwischen zwei Punkten.',
        ],
      },
      {
        id: 'sides-angles',
        title: 'Seiten und Winkel',
        description:
          'Eine Seite ist ein gerader Teil einer Figur, und ein Winkel entsteht dort, wo zwei Seiten zusammenkommen. Damit kannst du beschreiben, wie eine Figur gebaut ist.',
        example: {
          label: 'Beispiel',
          equation: 'Ein Dreieck hat 3 Seiten und 3 Winkel',
          explanation:
            'Jede Ecke des Dreiecks bildet einen Winkel, und die Strecken zwischen den Ecken sind die Seiten.',
        },
        reminders: [
          'Die Anzahl der Seiten hilft oft beim Erkennen einer Figur.',
          'Winkel zeigen, wie die Seiten zueinander stehen.',
        ],
      },
      {
        id: 'remember',
        title: 'Merke dir',
        description:
          'Diese Grundideen kommen in fast jeder spaeteren Geometriestunde wieder vor, deshalb lohnt es sich, sie frueh zu festigen.',
        reminders: [
          'Ein Punkt markiert eine Stelle.',
          'Eine Strecke hat zwei Enden und kann gemessen werden.',
          'Seiten und Winkel helfen dir, eine Figur zu beschreiben.',
        ],
      },
    ],
    practiceNote:
      'Interaktivere Geometrie-Workshops bleiben noch auf der Web-Seite. Auf mobile hast du aber schon den Wortschatz und die Reihenfolge der Ideen fuer die weitere Uebung.',
  },
  geometry_shapes: {
    introduction:
      'Geometrische Formen unterscheiden sich durch die Anzahl ihrer Seiten, die Anzahl ihrer Winkel und dadurch, ob ihre Raender gerade oder rund sind. Diese Lektion ordnet die wichtigsten Formen und ihre Merkmale.',
    sections: [
      {
        id: 'basic-shapes',
        title: 'Hauefige Formen',
        description:
          'Zu Beginn solltest du die wichtigsten Formen erkennen: Dreieck, Quadrat, Rechteck und Kreis. Jede davon hat gut sichtbare Merkmale.',
        example: {
          label: 'Beispiel',
          equation: 'Dreieck / Quadrat / Rechteck / Kreis',
          explanation:
            'Ein Dreieck hat 3 Seiten, Quadrat und Rechteck haben 4 Seiten, und ein Kreis hat weder Seiten noch Ecken.',
        },
        reminders: [
          'Zaehle zuerst die Seiten oder erkenne, dass die Figur rund ist.',
          'Ecken helfen dir, Figuren mit geraden Raendern zu unterscheiden.',
        ],
      },
      {
        id: 'quadrilaterals',
        title: 'Quadrat und Rechteck',
        description:
          'Quadrat und Rechteck gehoeren beide zur Familie der Vierecke, sind aber nicht identisch. Beide haben vier rechte Winkel, doch beim Quadrat sind alle Seiten gleich lang.',
        example: {
          label: 'Beispiel',
          equation: 'Quadrat: 4 gleich lange Seiten / Rechteck: 2 Paare gleich langer Seiten',
          explanation:
            'Wenn alle Seiten gleich lang sind, ist es ein Quadrat. Wenn nur gegenueberliegende Seiten gleich lang sind, ist es ein Rechteck.',
        },
        reminders: [
          'Ein Quadrat ist eine besondere Art von Rechteck.',
          'Seitenlaengen helfen dir, aehnliche Figuren zu unterscheiden.',
        ],
      },
      {
        id: 'curved-shapes',
        title: 'Kreis, Oval und andere Formen',
        description:
          'Nicht jede Figur hat gerade Raender. Kreis und Oval erkennst du an der glatten Linie, und eine Raute an ihren vier Seiten und der schraegen Form.',
        example: {
          label: 'Beispiel',
          equation: 'Kreis ≠ Oval',
          explanation:
            'Ein Kreis ist in jede Richtung gleich, waehrend ein Oval laenger gezogen ist. Beide Figuren haben keine Ecken.',
        },
        reminders: [
          'Keine Ecken ist ein wichtiges Merkmal bei Kreis und Oval.',
          'Eine Raute hat 4 gleich lange Seiten, aber keine rechten Winkel noetig.',
        ],
      },
      {
        id: 'remember',
        title: 'Merke dir',
        description:
          'Beim Erkennen von Formen ist es am besten, mehrere Merkmale gleichzeitig zu vergleichen statt nur auf den Namen oder den ersten Eindruck zu schauen.',
        reminders: [
          'Zaehle Seiten und Ecken.',
          'Pruefe, ob Seiten gleich lang sind und ob rechte Winkel vorkommen.',
          'Achte darauf, ob die Figur gerade oder runde Raender hat.',
        ],
      },
    ],
    practiceNote:
      'Das Zeichenspiel fuer Formen bleibt noch auf der Web-Seite. Die mobile Lektion gibt dir aber schon die Struktur zum Erkennen und Vergleichen von Formen.',
  },
  geometry_symmetry: {
    introduction:
      'Symmetrie hilft dir zu erkennen, wann eine Figur aus zwei passenden Haelften besteht. Das ist wichtig, wenn du Formen betrachtest und wenn du sie selbst zeichnest.',
    sections: [
      {
        id: 'intro',
        title: 'Was Symmetrie ist',
        description:
          'Eine Figur ist symmetrisch, wenn du sie so teilen kannst, dass eine Haelfte zur anderen wie ein Spiegelbild passt.',
        example: {
          label: 'Beispiel',
          equation: '🦋',
          explanation:
            'Die Schmetterlingsfluegel links und rechts sehen aehnlich aus, deshalb ist die Symmetrie leicht zu erkennen.',
        },
        reminders: [
          'Symmetrie bedeutet nicht, dass alles von jeder Seite gleich aussieht.',
          'Du suchst zwei Haelften, die nach Falten oder Spiegeln zusammenpassen.',
        ],
      },
      {
        id: 'axis',
        title: 'Symmetrieachse',
        description:
          'Eine Symmetrieachse teilt eine Figur in zwei passende Teile. Manchmal ist sie senkrecht, manchmal waagerecht und manchmal diagonal.',
        example: {
          label: 'Beispiel',
          equation: 'Quadrat: 4 Symmetrieachsen',
          explanation:
            'Ein Quadrat hat eine senkrechte, eine waagerechte und zwei diagonale Achsen, weil jede davon die Figur in passende Haelften teilt.',
        },
        reminders: [
          'Nicht jede Figur hat nur eine Symmetrieachse.',
          'Wenn die Haelften nach dem Falten nicht passen, ist die Linie keine Symmetrieachse.',
        ],
      },
      {
        id: 'mirror',
        title: 'Spiegelung',
        description:
          'Bei einer Spiegelung hat jeder Punkt auf der einen Seite der Achse einen passenden Punkt auf der anderen Seite im gleichen Abstand.',
        example: {
          label: 'Beispiel',
          equation: '● | ●',
          explanation:
            'Zwei Punkte auf beiden Seiten der Achse sind symmetrisch, wenn ihr Abstand zur Spiegelachse gleich ist.',
        },
        reminders: [
          'Eine Spiegelung verschiebt die Figur nicht zufaellig, sondern kippt sie an der Achse um.',
          'Der Abstand zur Achse muss auf beiden Seiten gleich sein.',
        ],
      },
      {
        id: 'remember',
        title: 'Merke dir',
        description:
          'Am besten pruefst du Symmetrie, indem du eine moegliche Achse suchst und passende Punkte oder Seiten vergleichst.',
        reminders: [
          'Markiere zuerst eine moegliche Symmetrieachse.',
          'Vergleiche dann die linke und rechte oder obere und untere Haelfte.',
          'Wenn eine Seite nicht passt, gibt es keine Symmetrie zu dieser Achse.',
        ],
      },
    ],
    practiceNote:
      'Interaktive Spiegelaufgaben bleiben noch auf der Web-Seite. Auf mobile kannst du aber schon die Denkweise zum Finden von Symmetrieachsen ueben.',
  },
  geometry_perimeter: {
    introduction:
      'Der Umfang ist die gesamte Strecke rund um eine Figur. Diese Lektion zeigt dir, wie du Seitenlaengen Schritt fuer Schritt addierst und pruefst, ob das Ergebnis sinnvoll ist.',
    sections: [
      {
        id: 'intro',
        title: 'Was Umfang ist',
        description:
          'Den Umfang einer Figur bekommst du, indem du die Laengen aller Seiten addierst. Das ist so, als wuerdest du einmal ganz um die Figur herumgehen und die ganze Strecke messen.',
        example: {
          label: 'Beispiel',
          equation: '3 cm + 2 cm + 3 cm + 2 cm = 10 cm',
          explanation:
            'Du addierst jede Seite des Rechtecks und erhaeltst die gesamte Randlaenge der Figur.',
        },
        reminders: [
          'Der Umfang ist die Summe aller Seiten.',
          'Das Ergebnis sollte dieselbe Einheit wie die Seitenlaengen haben.',
        ],
      },
      {
        id: 'rectangles',
        title: 'Rechtecke und Quadrate',
        description:
          'Beim Rechteck sind gegenueberliegende Seiten gleich lang, beim Quadrat sind alle Seiten gleich lang. Das macht das Addieren einfacher planbar.',
        example: {
          label: 'Beispiel',
          equation: 'Quadrat 4 cm + 4 cm + 4 cm + 4 cm = 16 cm',
          explanation:
            'Wenn alle Seiten gleich lang sind, kannst du dieselbe Zahl wiederholen, statt jedes Mal einen neuen Wert zu suchen.',
        },
        reminders: [
          'Ein Rechteck hat oft zwei Paare gleich langer Seiten.',
          'Ein Quadrat hat auf allen vier Seiten dieselbe Laenge.',
        ],
      },
      {
        id: 'step-by-step',
        title: 'Schritt fuer Schritt rechnen',
        description:
          'Am sichersten ist es, alle Seitenlaengen in der richtigen Reihenfolge aufzuschreiben und erst danach zu addieren. So sinkt das Risiko, eine Seite zu vergessen.',
        example: {
          label: 'Beispiel',
          equation: '5 cm + 1 cm + 2 cm + 1 cm + 5 cm + 2 cm',
          explanation:
            'Bei einer komplexeren Figur gehst du den Rand Seite fuer Seite ab, bis du wieder am Startpunkt ankommst.',
        },
        reminders: [
          'Lass keine Seite aus.',
          'Beginne an einer Stelle und gehe in einer festen Richtung um die Figur herum.',
        ],
      },
      {
        id: 'remember',
        title: 'Merke dir',
        description:
          'Der Umfang ist leicht zu berechnen, wenn du jede Seite genau einmal beachtest und auf die Einheiten achtest.',
        reminders: [
          'Addiere jede Seite genau einmal.',
          'Pruefe, ob das Ergebnis die richtige Einheit hat.',
          'Bei Figuren mit gleichen Seiten kannst du die wiederholte Laenge nutzen.',
        ],
      },
    ],
    practiceNote:
      'Die mobile Lektion ordnet bereits den Weg zum Rechnen des Umfangs, aber reichere Zeichenaufgaben bleiben noch auf der Web-Seite.',
  },
  logical_thinking: {
    introduction:
      'Logisches Denken hilft dir, Informationen zu ordnen, Regeln zu finden und Schritt fuer Schritt Schlussfolgerungen zu ziehen. Es ist eine gemeinsame Grundlage fuer Raetsel, Mathematik und alltaegliches Problemlosen.',
    sections: [
      {
        id: 'intro',
        title: 'Was logisches Denken ist',
        description:
          'Es ist die Faehigkeit, nach Ordnung zu suchen und zu pruefen, ob eine Antwort wirklich aus den Angaben folgt und nicht nur aus Zufall.',
        example: {
          label: 'Beispiel',
          equation: 'Wenn alle Katzen vier Beine haben und Minka eine Katze ist...',
          explanation:
            '...dann kannst du schliessen, dass Minka vier Beine hat. Die Schlussfolgerung folgt aus den gegebenen Informationen.',
        },
        reminders: [
          'Suche nach der Regel, nicht nur nach einem einzelnen Beispiel.',
          'Eine gute Antwort sollte sich begruenden lassen.',
        ],
      },
      {
        id: 'patterns',
        title: 'Muster und Folgen',
        description:
          'Logisches Denken beginnt oft damit, eine Wiederholung oder eine konstante Veraenderung zu erkennen.',
        example: {
          label: 'Beispiel',
          equation: '2, 4, 6, 8, ?',
          explanation: 'Jeder Schritt erhoeht die Zahl um 2, also ist das naechste Element 10.',
        },
        reminders: [
          'Suche nach einer festen Differenz oder einer sich wiederholenden Gruppe von Elementen.',
          'Ein Muster kann Zahlen, Farben, Formen oder alles zusammen betreffen.',
        ],
      },
      {
        id: 'classification',
        title: 'Klassifikation und Ausreisser',
        description:
          'Manchmal musst du Elemente nach einer gemeinsamen Eigenschaft gruppieren, und manchmal das eine Element finden, das nicht passt.',
        example: {
          label: 'Beispiel',
          equation: '🍎 🍌 🥕 🍇',
          explanation:
            'Der Ausreisser ist 🥕, weil die anderen Elemente Obst sind und dies ein Gemuese ist.',
        },
        reminders: [
          'Benenne zuerst die gemeinsame Eigenschaft der Gruppe.',
          'Das unpassende Element verletzt dieselbe Regel, die den Rest verbindet.',
        ],
      },
      {
        id: 'reasoning',
        title: 'Wenn... dann...',
        description:
          'Schlussfolgern bedeutet, bekannte Fakten zu verbinden und zu pruefen, was daraus folgt.',
        example: {
          label: 'Beispiel',
          equation: 'Wenn eine Zahl gerade ist, ist sie durch 2 teilbar. Ist 6 gerade?',
          explanation: 'Ja. Weil 6 gerade ist, sagt die Regel, dass sie durch 2 teilbar ist.',
        },
        reminders: [
          'Bestimme zuerst die Bedingung und pruefe dann, ob sie auf den Fall passt.',
          'Rate nicht. Zeige, aus welchem Schritt die Antwort folgt.',
        ],
      },
    ],
    practiceNote:
      'Diese Lektionen bereiten auf die naechsten logischen Aufgaben vor. Auf mobile beginnen wir mit gemeinsamen Regeln und Beispielen, waehrend interaktivere Uebungen spaeter folgen.',
  },
  logical_patterns: {
    introduction:
      'Muster und Folgen lehren dich, den naechsten Schritt aus einer Regel vorherzusagen. Das ist eine der wichtigsten Faehigkeiten in logischen und mathematischen Aufgaben.',
    sections: [
      {
        id: 'visual-patterns',
        title: 'Farb- und Formmuster',
        description:
          'Die einfachsten Muster beruhen auf einer wiederholten Gruppe von Symbolen, Farben oder Formen.',
        example: {
          label: 'Beispiel',
          equation: '🔴 🔵 🔴 🔵 🔴 ?',
          explanation: 'Das rot-blaue Muster wiederholt sich, also ist das fehlende Element 🔵.',
        },
        reminders: [
          'Finde den kleinsten Teil, der sich wiederholt.',
          'Pruefe, ob dieselbe Regel vom Anfang bis zum Ende gilt.',
        ],
      },
      {
        id: 'arithmetic-sequences',
        title: 'Folgen mit fester Differenz',
        description:
          'In arithmetischen Folgen veraendert sich jedes naechste Element um denselben Wert.',
        example: {
          label: 'Beispiel',
          equation: '5, 10, 15, 20, ?',
          explanation: 'Jeder Schritt addiert 5, also ist das naechste Element 25.',
        },
        reminders: [
          'Subtrahiere benachbarte Zahlen und pruefe, ob die Differenz gleich bleibt.',
          'Wenn die Differenz nicht passt, suche nach einer anderen Regelart.',
        ],
      },
      {
        id: 'geometric-sequences',
        title: 'Folgen mit festem Verhaeltnis',
        description:
          'Manche Folgen addieren nicht immer dieselbe Zahl, sondern multiplizieren jedes Mal mit demselben Wert.',
        example: {
          label: 'Beispiel',
          equation: '1, 2, 4, 8, 16, ?',
          explanation: 'Jedes Element ist doppelt so gross wie das vorige, also ist das naechste 32.',
        },
        reminders: [
          'Teile ein Glied durch das vorige und pruefe, ob sich das Verhaeltnis wiederholt.',
          'Schnelles Wachstum bedeutet oft Multiplikation und nicht Addition.',
        ],
      },
      {
        id: 'strategy',
        title: 'Wie man die Regel sucht',
        description:
          'Wenn das Muster nicht sofort klar ist, hilft eine kurze Checkliste besser als Raten.',
        example: {
          label: 'Beispiel',
          equation: '3, 6, 12, 24, ?',
          explanation:
            'Pruefe zuerst Differenzen und dann Verhaeltnisse. Hier wird in jedem Schritt mit 2 multipliziert, also ist die Antwort 48.',
        },
        reminders: [
          'Pruefe zuerst Differenzen, dann Verhaeltnisse und erst danach Beziehungen mehrerer frueherer Elemente.',
          'Bestaetige die Regel an allen bekannten Elementen, nicht nur an den ersten beiden.',
        ],
      },
    ],
    practiceNote:
      'Der mobile Screen gibt dir bereits eine echte Einfuehrung in Muster und Folgen. Die naechsten Logikthemen koennen auf derselben Denkweise aufbauen.',
  },
  logical_classification: {
    introduction:
      'Klassifikation bedeutet, Elemente nach einer gemeinsamen Eigenschaft zu gruppieren. Das ist eine der einfachsten und wichtigsten Methoden, Informationen zu ordnen.',
    sections: [
      {
        id: 'intro',
        title: 'Was Klassifikation ist',
        description:
          'Um richtig zu klassifizieren, musst du zuerst die Eigenschaft benennen, die die Elemente in einer Gruppe verbindet.',
        example: {
          label: 'Beispiel',
          equation: '🍎 🍌 🍇 🍓',
          explanation:
            'Diese Elemente koennen zu einer Obstgruppe gehoeren, weil sie dieselbe Kategorie teilen.',
        },
        reminders: [
          'Du kannst nach Farbe, Form, Groesse, Kategorie oder einer Zahleneigenschaft gruppieren.',
          'Lege zuerst die Eigenschaft fest und bilde dann die Gruppen.',
        ],
      },
      {
        id: 'many-features',
        title: 'Mehrere Eigenschaften zugleich',
        description:
          'Manchmal reicht eine Eigenschaft nicht aus, und du musst gleichzeitig auf Farbe, Groesse oder eine weitere Eigenschaft achten.',
        example: {
          label: 'Beispiel',
          equation: 'gross rot / gross blau / klein rot / klein blau',
          explanation: 'Hier entsteht jede Gruppe aus der Kombination zweier Eigenschaften: Groesse und Farbe.',
        },
        reminders: [
          'Jede zusaetzliche Eigenschaft vergroessert die Zahl moeglicher Gruppen.',
          'Beschreibe Gruppen genau, damit du keine Kriterien vermischst.',
        ],
      },
      {
        id: 'intruder',
        title: 'Finde den Ausreisser',
        description:
          'Aufgaben mit einem Ausreisser pruefen, ob du die Gruppenregel verstehst und auf das Element zeigen kannst, das sie bricht.',
        example: {
          label: 'Beispiel',
          equation: '2, 4, 7, 8, 10',
          explanation: 'Der Ausreisser ist 7, weil die anderen Zahlen gerade sind und 7 ungerade ist.',
        },
        reminders: [
          'Bestimme zuerst die gemeinsame Eigenschaft der meisten Elemente.',
          'Der Ausreisser passt nicht zur Regel, und du solltest erklaeren koennen, warum.',
        ],
      },
      {
        id: 'venn',
        title: 'Venn-Diagramm und Zusammenfassung',
        description:
          'Ein Venn-Diagramm zeigt, was zu einer Gruppe, zu einer anderen Gruppe oder zu beiden zugleich gehoert.',
        example: {
          label: 'Beispiel',
          equation: 'Sport / Musik / beides',
          explanation: 'Die Ueberlappung zeigt die Elemente, die zu zwei Kategorien zugleich passen.',
        },
        reminders: [
          'Die Ueberlappung ist die Schnittmenge zweier Mengen.',
          'Klassifikation ordnet Informationen und erleichtert spaeteres Schlussfolgern.',
        ],
      },
    ],
    practiceNote:
      'Die mobile Version gibt dir bereits die ganze Denkspur fuer Klassifikationsaufgaben, auch wenn reichere Interaktionen noch auf der Web-Seite bleiben.',
  },
  logical_reasoning: {
    introduction:
      'Logisches Schlussfolgern bedeutet, von bekannten Fakten zu neuen Ergebnissen zu gelangen. Statt zu raten, stuetzt du dich auf Regeln und pruefst, was daraus folgt.',
    sections: [
      {
        id: 'intro',
        title: 'Was Schlussfolgern ist',
        description:
          'Schlussfolgern kann von der allgemeinen Regel zum Einzelfall gehen oder von vielen Beobachtungen zu einer allgemeineren Vermutung.',
        example: {
          label: 'Beispiel',
          equation: 'Alle Hunde bellen. Rex ist ein Hund.',
          explanation: 'Aus diesen beiden Informationen folgt, dass Rex bellt.',
        },
        reminders: [
          'Deduktion geht von einer allgemeinen Regel zu einem konkreten Fall.',
          'Eine gute Schlussfolgerung muss sich auf das stuetzen, was du wirklich weisst.',
        ],
      },
      {
        id: 'if-then',
        title: 'Wenn... dann...',
        description:
          'Bedingungssaetze verbinden eine Bedingung mit einer Folge und sind ein grundlegendes Werkzeug des logischen Denkens.',
        example: {
          label: 'Beispiel',
          equation: 'Wenn eine Zahl gerade ist, ist sie durch 2 teilbar.',
          explanation: 'Weil 8 gerade ist, sagt die Regel, dass 8 durch 2 teilbar ist.',
        },
        reminders: [
          'Verwechsle eine Regel nicht mit ihrer Umkehrung.',
          'Pruefe zuerst, ob die Bedingung erfuellt ist.',
        ],
      },
      {
        id: 'quantifiers',
        title: 'Alle, einige, keine',
        description:
          'Quantoren zeigen, wie weit eine Aussage gilt und worauf du beim Ziehen von Schlussfolgerungen achten musst.',
        example: {
          label: 'Beispiel',
          equation: 'Einige Katzen sind rot.',
          explanation:
            'Das bedeutet nicht, dass jede Katze rot ist. Die Aussage betrifft nur einen Teil der Katzen.',
        },
        reminders: [
          'Alle bedeutet jeder Fall.',
          'Einige bedeutet nur ein Teil der Faelle.',
          'Keine bedeutet, dass es ueberhaupt keine Ausnahme gibt.',
        ],
      },
      {
        id: 'puzzles',
        title: 'Raetsel Schritt fuer Schritt',
        description:
          'Bei komplexeren Aufgaben musst du mehrere Hinweise verbinden, unmoegliche Optionen streichen und immer wieder pruefen, ob die Loesung noch passt.',
        example: {
          label: 'Beispiel',
          equation: 'Es gibt drei Haeuser: rot, blau, gruen...',
          explanation:
            'Ein Raetsel loest du, indem du sichere Fakten notierst und systematisch ausschliesst, was unmoeglich ist.',
        },
        reminders: [
          'Beginne mit direkten Fakten.',
          'Das Ausschliessen falscher Optionen fuehrt oft zur richtigen Antwort.',
        ],
      },
    ],
    practiceNote:
      'Dieses Thema bereitet dich auf schwierigere Logikraetsel vor. Auf mobile bringen wir zuerst die Denkweise selbst und die Struktur zum Loesen von Problemen mit.',
  },
  logical_analogies: {
    introduction:
      'Eine Analogie bedeutet, dieselbe Beziehung in zwei verschiedenen Paaren zu finden. Es geht nicht um aeuessere Aehnlichkeit, sondern um dieselbe Art von Verbindung.',
    sections: [
      {
        id: 'intro',
        title: 'Was eine Analogie ist',
        description:
          'Bei einer Analogie fragst du: Welche Beziehung verbindet das erste Paar, und wie uebertrage ich sie auf das zweite Paar?',
        example: {
          label: 'Beispiel',
          equation: 'Vogel : fliegen = Fisch : ?',
          explanation: 'Die Beziehung ist Lebewesen und Fortbewegungsart, also lautet die Antwort schwimmen.',
        },
        reminders: [
          'Benenne zuerst die Beziehung im ersten Paar.',
          'Suche erst danach das Element, das dieselbe Beziehung wiederherstellt.',
        ],
      },
      {
        id: 'verbal',
        title: 'Wortanalogien',
        description:
          'Wortanalogien koennen auf Gegensaetzen, Funktionen, Teil und Ganzem oder einer typischen Handlung beruhen.',
        example: {
          label: 'Beispiel',
          equation: 'Schere : schneiden = Bleistift : ?',
          explanation: 'Das ist eine Werkzeug -> Funktion-Beziehung, also lautet die Antwort schreiben.',
        },
        reminders: [
          'Die Art der Beziehung ist wichtiger als die Woerter selbst.',
          'Gegensatz und Funktion sind zwei sehr haeufige Analogiearten.',
        ],
      },
      {
        id: 'numbers-shapes',
        title: 'Zahlen- und Formanalogien',
        description:
          'Bei Zahlen- oder Bildanalogien veraendert dieselbe Operation Zahlen, Richtungen, Farben oder die Anzahl der Elemente.',
        example: {
          label: 'Beispiel',
          equation: '2 : 4 = 5 : ?',
          explanation: 'Die Beziehung ist Multiplikation mit 2, also ist die fehlende Antwort 10.',
        },
        reminders: [
          'Bei Zahlen pruefst du Addition, Subtraktion, Multiplikation und Division.',
          'Bei Formen achtest du auf Drehung, Groesse, Farbe und Anzahl der Elemente.',
        ],
      },
      {
        id: 'cause-whole',
        title: 'Teil-Ganzes und Ursache-Wirkung',
        description:
          'Viele Analogien beruhen darauf, dass ein Element zu einem anderen gehoert oder etwas eine bestimmte Wirkung ausloest.',
        example: {
          label: 'Beispiel',
          equation: 'Seite : Buch = Ziegel : ?',
          explanation: 'Das ist eine Teil -> Ganzes-Beziehung, also lautet die Antwort Mauer oder Gebaeude.',
        },
        reminders: [
          'Teil-Ganzes ist ein sehr haeufiges Muster in Analogieaufgaben.',
          'Ursache-Wirkung fragt danach, was ein bestimmtes Ergebnis ausloest.',
        ],
      },
    ],
    practiceNote:
      'Analogien lehren dich, eine Regel in einen neuen Kontext zu uebertragen. Das macht sie zu einer guten Bruecke zwischen einfachen Mustern und schwierigeren Schlussfolgerungen.',
  },
};

const PORTABLE_LESSON_BODIES_BY_LOCALE: Partial<
  Record<KangurCoreLocale, Partial<Record<KangurLessonComponentId, KangurPortableLessonBody>>>
> = {
  de: GERMAN_PORTABLE_LESSON_BODIES,
  en: ENGLISH_PORTABLE_LESSON_BODIES,
};

export const getLocalizedKangurPortableLesson = (
  lesson: KangurPortableLesson,
  locale?: string | null | undefined,
): KangurPortableLesson => {
  const normalizedLocale = normalizeKangurCoreLocale(locale);

  return {
    ...lesson,
    title: getLocalizedKangurCoreLessonTitle(lesson.componentId, normalizedLocale, lesson.title),
    description:
      KANGUR_PORTABLE_LESSON_DESCRIPTIONS[lesson.componentId]?.[normalizedLocale] ??
      lesson.description,
  };
};

export const localizeKangurPortableLessonBody = (
  componentId: KangurLessonComponentId,
  body: KangurPortableLessonBody | null,
  locale?: string | null | undefined,
): KangurPortableLessonBody | null => {
  if (!body) {
    return null;
  }

  const normalizedLocale = normalizeKangurCoreLocale(locale);
  if (normalizedLocale === 'pl') {
    return body;
  }

  return PORTABLE_LESSON_BODIES_BY_LOCALE[normalizedLocale]?.[componentId] ?? body;
};
