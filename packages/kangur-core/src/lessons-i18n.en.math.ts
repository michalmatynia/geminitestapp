import type { KangurLessonComponentId } from '@kangur/contracts/kangur-lesson-constants';

import type { KangurPortableLessonBody } from './lesson-content';

export const ENGLISH_PORTABLE_LESSON_BODIES_MATH: Partial<Record<KangurLessonComponentId, KangurPortableLessonBody>> = {
  "clock": {
    "introduction": "The clock lesson has three stages: hours, minutes, and combining both hands. On mobile we bring over this learning sequence without the interactive clock exercise.",
    "sections": [
      {
        "id": "hours",
        "title": "Hours and the short hand",
        "description": "First learn to read only the short hand. It shows what hour it is.",
        "example": {
          "label": "Example",
          "equation": "9:00",
          "explanation": "If the short hand points to 9 and you ignore the minutes, you read the full hour as nine o clock."
        },
        "reminders": [
          "The short hand shows the hours.",
          "On full hours, focus on it first."
        ]
      },
      {
        "id": "minutes",
        "title": "Minutes and the long hand",
        "description": "The long hand shows minutes. Each next number on the clock face means another 5 minutes.",
        "example": {
          "label": "Example",
          "equation": "7 × 5 = 35 minutes",
          "explanation": "When the long hand points to 7, you read 35 minutes."
        },
        "reminders": [
          "3 means 15 minutes, 6 means 30 minutes, and 9 means 45 minutes.",
          "Remember that the numbers move in jumps of 5 minutes."
        ]
      },
      {
        "id": "combined",
        "title": "Hours and minutes together",
        "description": "At the end, combine the hour from the short hand with the minutes from the long hand.",
        "example": {
          "label": "Example",
          "equation": "8:30",
          "explanation": "The short hand shows 8 and the long hand shows 30 minutes, so you read 8:30."
        },
        "reminders": [
          "Read the hour first and only then the minutes.",
          "5:15 is quarter past 5 and 5:45 is quarter to 6."
        ]
      }
    ],
    "practiceNote": "The interactive clock exercise will be connected later. At this stage the mobile screen already recreates the full lesson order needed before practice."
  },
  "calendar": {
    "introduction": "A calendar helps organize time: days of the week, months, dates, and seasons. On mobile we bring over the main learning structure without the interactive game.",
    "sections": [
      {
        "id": "intro",
        "title": "What a calendar is",
        "description": "A calendar is a way to write down and read time in days, weeks, months, and years.",
        "example": {
          "label": "Example",
          "equation": "1 week = 7 days",
          "explanation": "Every week has the same 7 days, and months and years arrange them into a bigger plan of time."
        },
        "reminders": [
          "A year has 12 months.",
          "A week has 7 days."
        ]
      },
      {
        "id": "days",
        "title": "Days of the week",
        "description": "It helps to know the order of the days because that makes it easier to tell what was yesterday, what is today, and what will be tomorrow.",
        "example": {
          "label": "Example",
          "equation": "Monday -> Tuesday -> Wednesday",
          "explanation": "If today is Tuesday, then yesterday was Monday and tomorrow will be Wednesday."
        },
        "reminders": [
          "After Friday comes Saturday, and after Saturday comes Sunday.",
          "Saturday and Sunday usually make the weekend."
        ]
      },
      {
        "id": "months",
        "title": "Months and seasons",
        "description": "Each month has its own name and number of days. Months also group into four seasons.",
        "example": {
          "label": "Example",
          "equation": "March, April, May = spring",
          "explanation": "You can group months not only by order, but also by seasons, which makes them easier to remember."
        },
        "reminders": [
          "Most months have 30 or 31 days.",
          "February usually has 28 days."
        ]
      },
      {
        "id": "date",
        "title": "How to read a date",
        "description": "You write a date in the order day, month, year. It is useful to say it aloud and to read it in digits too.",
        "example": {
          "label": "Example",
          "equation": "15/03/2025",
          "explanation": "You can also read it as: the fifteenth of March, two thousand twenty-five."
        },
        "reminders": [
          "Read the day first, then the month, and the year at the end.",
          "The number form and the spoken form should mean the same date."
        ]
      }
    ],
    "practiceNote": "The interactive calendar game still remains on the web side. On mobile you already have the full set of basics needed for later practice."
  },
  "adding": {
    "introduction": "Addition means joining two groups together to see how many there are in total. In the mobile app we already bring over the real lesson content, just without the games.",
    "sections": [
      {
        "id": "basics",
        "title": "Addition basics",
        "description": "Start with simply combining groups. A good habit is to begin with the larger number and count on from there.",
        "example": {
          "label": "Example",
          "equation": "2 + 3 = 5",
          "explanation": "You have 2 apples, add 3 more, and now you can see 5 altogether."
        },
        "reminders": [
          "Addition answers the question: how many are there altogether?",
          "With small numbers you can count on your fingers or in your head."
        ]
      },
      {
        "id": "cross-ten",
        "title": "Crossing 10",
        "description": "When the sum goes past 10, it is easiest to complete 10 first and only then add what is left.",
        "example": {
          "label": "Example",
          "equation": "7 + 5 = 12",
          "explanation": "First 7 + 3 = 10, then add the remaining 2 to get 12."
        },
        "reminders": [
          "Look for pairs that make 10.",
          "Split the second number into two parts if that makes the calculation easier."
        ]
      },
      {
        "id": "two-digit",
        "title": "Two-digit addition",
        "description": "With two-digit numbers, split tens and ones apart. That gives you a stable method instead of guessing.",
        "example": {
          "label": "Example",
          "equation": "24 + 13 = 37",
          "explanation": "20 + 10 = 30 and 4 + 3 = 7. At the end you combine 30 and 7."
        },
        "reminders": [
          "Separate tens from ones.",
          "Combine the parts into one final result."
        ]
      },
      {
        "id": "remember",
        "title": "Remember",
        "description": "A few rules speed up counting and help you avoid mistakes in the next exercises.",
        "reminders": [
          "The order does not matter: 3 + 5 = 5 + 3.",
          "Adding zero changes nothing: 7 + 0 = 7.",
          "When you go past 10, complete the full ten first."
        ]
      }
    ],
    "practiceNote": "The interactive addition games still stay on the web side for now. This mobile screen already brings the learning flow and lesson content, but not the games yet."
  },
  "subtracting": {
    "introduction": "Subtraction means taking part away from a group and checking how much is left. The mobile version already includes the main lesson content, but not the game yet.",
    "sections": [
      {
        "id": "basics",
        "title": "Subtraction basics",
        "description": "When subtracting, you move back from the starting number or check how much is missing to reach the result.",
        "example": {
          "label": "Example",
          "equation": "5 - 2 = 3",
          "explanation": "You have 5 apples, take 2 away, and 3 remain."
        },
        "reminders": [
          "Subtraction answers the question: how many are left?",
          "You can count backwards on a number line."
        ]
      },
      {
        "id": "cross-ten",
        "title": "Crossing 10",
        "description": "When you need to cross 10, split the number you subtract into two parts: first go down to 10, then subtract the rest.",
        "example": {
          "label": "Example",
          "equation": "13 - 5 = 8",
          "explanation": "First 13 - 3 = 10, then 10 - 2 = 8."
        },
        "reminders": [
          "Split 5 into 3 and 2 if that gets you to a full ten.",
          "Going down to 10 makes the second step easier."
        ]
      },
      {
        "id": "two-digit",
        "title": "Two-digit subtraction",
        "description": "Just like in addition, it helps to treat tens and ones separately.",
        "example": {
          "label": "Example",
          "equation": "47 - 23 = 24",
          "explanation": "40 - 20 = 20 and 7 - 3 = 4. At the end you combine 20 and 4."
        },
        "reminders": [
          "Work out the tens first.",
          "Then subtract the ones and combine the result."
        ]
      },
      {
        "id": "remember",
        "title": "Remember",
        "description": "Subtraction has a few rules that are easy to confuse with addition, so it helps to practise them on purpose.",
        "reminders": [
          "Subtraction is not commutative: 7 - 3 is not the same as 3 - 7.",
          "Subtracting zero changes nothing: 8 - 0 = 8.",
          "You can check the result with addition: 5 + 3 = 8, so 8 - 3 = 5."
        ]
      }
    ],
    "practiceNote": "The subtraction game will be connected later. At this stage the mobile screen already provides the correct sequence of explanations and examples."
  },
  "multiplication": {
    "introduction": "Multiplication is a faster way to write repeated addition. In the mobile version we first bring over the meaning of the operation, the key times-table facts, and the tricks you need before practice.",
    "sections": [
      {
        "id": "intro",
        "title": "What multiplication means",
        "description": "Multiplication shows how many there are altogether when several groups have the same number of items.",
        "example": {
          "label": "Example",
          "equation": "3 × 4 = 12",
          "explanation": "You have 3 groups of 4 items, so 4 + 4 + 4. Altogether that makes 12."
        },
        "reminders": [
          "Multiplication is short for adding the same number again and again.",
          "The first number can mean the number of groups and the second the number of items in each group."
        ]
      },
      {
        "id": "table-23",
        "title": "Times tables × 2 and × 3",
        "description": "Start by practising the simplest rows. These two come back very often in later exercises.",
        "example": {
          "label": "Example",
          "equation": "6 × 2 = 12 and 5 × 3 = 15",
          "explanation": "With × 2 you double the number, and with × 3 you add the same number three times."
        },
        "reminders": [
          "Multiplying by 2 means doubling.",
          "For × 3 you can double first and then add one more equal group."
        ]
      },
      {
        "id": "table-45",
        "title": "Times tables × 4 and × 5",
        "description": "It helps to connect × 4 and × 5 with simple observations about even numbers and number endings.",
        "example": {
          "label": "Example",
          "equation": "7 × 5 = 35",
          "explanation": "Results for × 5 end with 0 or 5, and 4 × a number means doubling and then doubling again."
        },
        "reminders": [
          "Multiplying by 4 means two doubles in a row.",
          "Multiplying by 5 leads to answers ending in 0 or 5."
        ]
      },
      {
        "id": "remember",
        "title": "Remember",
        "description": "A few rules make multiplication faster and help you check whether an answer makes sense.",
        "reminders": [
          "Multiplying by 1 keeps the number the same.",
          "Multiplying by 10 adds a zero at the end.",
          "The order does not matter: 3 × 4 = 4 × 3."
        ]
      }
    ],
    "practiceNote": "This topic already has its first mobile practice. After reading the lesson, you can go straight into multiplication training."
  },
  "division": {
    "introduction": "Division means sharing equally into groups. In the mobile version we first bring over the main lesson content: the meaning of division, its link to multiplication, and remainders.",
    "sections": [
      {
        "id": "intro",
        "title": "What division means",
        "description": "In division, you ask how many items go into each group when the split has to be equal.",
        "example": {
          "label": "Example",
          "equation": "6 ÷ 2 = 3",
          "explanation": "You have 6 cookies and share them equally between 2 people, so each gets 3."
        },
        "reminders": [
          "Division means equal sharing.",
          "The answer tells you how many items go into one group."
        ]
      },
      {
        "id": "inverse",
        "title": "Division and multiplication",
        "description": "Multiplication and division are inverse operations, so knowing the times tables helps a lot with division.",
        "example": {
          "label": "Example",
          "equation": "12 ÷ 4 = 3",
          "explanation": "Since 4 × 3 = 12, 12 ÷ 4 must equal 3."
        },
        "reminders": [
          "If you know 4 × 3 = 12, you also know 12 ÷ 4 = 3 and 12 ÷ 3 = 4.",
          "In harder division tasks, first recall the matching multiplication fact."
        ]
      },
      {
        "id": "remainder",
        "title": "Remainders",
        "description": "Not every division can be done without a remainder. Then some items stay outside the equal groups.",
        "example": {
          "label": "Example",
          "equation": "7 ÷ 2 = 3 remainder 1",
          "explanation": "You can give 3 items to each of 2 groups, and 1 item is left over."
        },
        "reminders": [
          "The remainder is always smaller than the divisor.",
          "Check the result: quotient × divisor + remainder = starting number."
        ]
      },
      {
        "id": "remember",
        "title": "Remember",
        "description": "A few simple rules help you quickly check whether a division answer makes sense.",
        "reminders": [
          "Any number divided by 1 stays the same.",
          "A number divided by itself equals 1.",
          "Zero divided by any non-zero number equals 0."
        ]
      }
    ],
    "practiceNote": "The division game still remains on the web side. The mobile screen already gives you the full learning scaffold before practice."
  },
  "geometry_basics": {
    "introduction": "Geometry basics teach you to look at shapes as sets of points, segments, sides, and angles. In the mobile app we bring over the key ideas you need before more interactive exercises.",
    "sections": [
      {
        "id": "intro",
        "title": "What geometry studies",
        "description": "Geometry describes shapes, position, and size. Instead of only calculating a result, you look at how a figure is built and what elements it contains.",
        "example": {
          "label": "Example",
          "equation": "point A, segment AB, triangle ABC",
          "explanation": "These are three different geometric objects: a single point, part of a line, and a full figure made from several elements."
        },
        "reminders": [
          "Geometry helps you name and compare figures.",
          "One figure can be made from several simpler elements."
        ]
      },
      {
        "id": "point-line-segment",
        "title": "Point, line, and segment",
        "description": "A point marks an exact place. A line can continue forever in both directions, while a segment has two ends and its length can be measured.",
        "example": {
          "label": "Example",
          "equation": "A •      A-----B",
          "explanation": "Point A shows only a location, while segment AB has a start, an end, and a specific length."
        },
        "reminders": [
          "A point has no length or width.",
          "A segment is the part of a line between two points."
        ]
      },
      {
        "id": "sides-angles",
        "title": "Sides and angles",
        "description": "A side is a straight part of a figure, and an angle appears where two sides meet. These ideas help you describe how a figure is built.",
        "example": {
          "label": "Example",
          "equation": "A triangle has 3 sides and 3 angles",
          "explanation": "Each corner of the triangle creates an angle, and the segments between the corners are the sides."
        },
        "reminders": [
          "The number of sides often helps you recognize a figure.",
          "Angles show how the sides are positioned relative to one another."
        ]
      },
      {
        "id": "remember",
        "title": "Remember",
        "description": "These basic ideas come back in almost every later geometry lesson, so it is worth fixing them early.",
        "reminders": [
          "A point marks a place.",
          "A segment has two ends and can be measured.",
          "Sides and angles help describe a figure."
        ]
      }
    ],
    "practiceNote": "The more interactive geometry workshops still remain on the web side. On mobile you already have the vocabulary and lesson order needed before further practice."
  },
  "geometry_shapes": {
    "introduction": "Geometric shapes differ by the number of sides, the number of angles, and whether their edges are straight or curved. This lesson organizes the most important shapes and their features.",
    "sections": [
      {
        "id": "basic-shapes",
        "title": "Common shapes",
        "description": "Start by recognizing the main shapes: triangle, square, rectangle, and circle. Each one has features that are easy to notice.",
        "example": {
          "label": "Example",
          "equation": "triangle / square / rectangle / circle",
          "explanation": "A triangle has 3 sides, a square and a rectangle have 4 sides, and a circle has no sides or corners."
        },
        "reminders": [
          "First count the sides or notice that the figure is round.",
          "Corners help you distinguish shapes with straight edges."
        ]
      },
      {
        "id": "quadrilaterals",
        "title": "Square and rectangle",
        "description": "A square and a rectangle both belong to the family of four-sided shapes, but they are not identical. Both have four right angles, yet the square has all sides equal.",
        "example": {
          "label": "Example",
          "equation": "square: 4 equal sides / rectangle: 2 pairs of equal sides",
          "explanation": "If all sides have the same length, it is a square. If only opposite sides match, it is a rectangle."
        },
        "reminders": [
          "A square is a special kind of rectangle.",
          "Side lengths help you tell similar figures apart."
        ]
      },
      {
        "id": "curved-shapes",
        "title": "Circle, oval, and other shapes",
        "description": "Not every figure has straight edges. You can recognize a circle and an oval by their smooth outline, and a rhombus by its four sides and its slanted look.",
        "example": {
          "label": "Example",
          "equation": "circle ≠ oval",
          "explanation": "A circle stays the same in every direction, while an oval is more stretched. Neither figure has corners."
        },
        "reminders": [
          "No corners is an important clue for circles and ovals.",
          "A rhombus has 4 equal sides, but it does not need right angles."
        ]
      },
      {
        "id": "remember",
        "title": "Remember",
        "description": "When you identify a shape, it is best to compare several features at once instead of relying only on the name or general look.",
        "reminders": [
          "Count sides and corners.",
          "Check whether sides are equal and whether there are right angles.",
          "Notice whether the figure has straight or curved edges."
        ]
      }
    ],
    "practiceNote": "The drawing game for shapes still remains on the web side. This mobile lesson already gives you the structure for recognizing and comparing shapes."
  },
  "geometry_symmetry": {
    "introduction": "Symmetry helps you see when a figure is made from two matching halves. This matters both when you look at shapes and when you try to draw them.",
    "sections": [
      {
        "id": "intro",
        "title": "What symmetry is",
        "description": "A figure is symmetrical when you can divide it so that one part matches the other like a mirror image.",
        "example": {
          "label": "Example",
          "equation": "🦋",
          "explanation": "The butterfly wings on the left and right look alike, so it is easy to notice symmetry."
        },
        "reminders": [
          "Symmetry does not mean that everything looks the same from every side.",
          "You are looking for two halves that match after folding or reflecting."
        ]
      },
      {
        "id": "axis",
        "title": "Line of symmetry",
        "description": "A line of symmetry divides a figure into two matching parts. Sometimes it is vertical, sometimes horizontal, and sometimes diagonal.",
        "example": {
          "label": "Example",
          "equation": "square: 4 lines of symmetry",
          "explanation": "A square has a vertical line, a horizontal line, and two diagonal lines because each of them still splits the figure into matching halves."
        },
        "reminders": [
          "Not every figure has only one line of symmetry.",
          "If the two parts do not match after folding, that line is not a symmetry line."
        ]
      },
      {
        "id": "mirror",
        "title": "Mirror reflection",
        "description": "In a mirror reflection, every point on one side of the line has a partner on the other side at the same distance.",
        "example": {
          "label": "Example",
          "equation": "● | ●",
          "explanation": "Two points on opposite sides of the line are symmetrical if they are equally far from the mirror line."
        },
        "reminders": [
          "A reflection does not move a figure randomly. It flips it around the line.",
          "The distance from the line must match on both sides."
        ]
      },
      {
        "id": "remember",
        "title": "Remember",
        "description": "The best way to check symmetry is to look for a possible axis and compare matching points or sides.",
        "reminders": [
          "First mark a possible symmetry line.",
          "Then compare the left and right or top and bottom parts.",
          "If one side does not match, there is no symmetry around that line."
        ]
      }
    ],
    "practiceNote": "Interactive mirror exercises still remain on the web side. On mobile you can already practise the reasoning needed to find lines of symmetry."
  },
  "geometry_perimeter": {
    "introduction": "Perimeter is the total distance around a figure. This lesson teaches you to add side lengths step by step and check whether the result makes sense.",
    "sections": [
      {
        "id": "intro",
        "title": "What perimeter is",
        "description": "You get the perimeter of a figure by adding the lengths of all its sides. It is like walking all the way around the shape and measuring the whole route.",
        "example": {
          "label": "Example",
          "equation": "3 cm + 2 cm + 3 cm + 2 cm = 10 cm",
          "explanation": "You add each side of the rectangle and get the total length of the figure border."
        },
        "reminders": [
          "Perimeter is the sum of all sides.",
          "The answer should use the same unit as the side lengths."
        ]
      },
      {
        "id": "rectangles",
        "title": "Rectangles and squares",
        "description": "In a rectangle, opposite sides are equal, and in a square all sides are equal. That makes it easier to plan your addition.",
        "example": {
          "label": "Example",
          "equation": "square 4 cm + 4 cm + 4 cm + 4 cm = 16 cm",
          "explanation": "If all sides are the same, you can repeat the same length instead of finding a new value each time."
        },
        "reminders": [
          "A rectangle often has two pairs of equal sides.",
          "A square has the same length on all four sides."
        ]
      },
      {
        "id": "step-by-step",
        "title": "Counting step by step",
        "description": "The safest method is to write down all side lengths in order and only then add the numbers. That lowers the risk of skipping a side.",
        "example": {
          "label": "Example",
          "equation": "5 cm + 1 cm + 2 cm + 1 cm + 5 cm + 2 cm",
          "explanation": "With a more complex figure, you move around the edge one side at a time until you return to the start."
        },
        "reminders": [
          "Do not skip any side.",
          "Start in one place and move around the figure in a fixed direction."
        ]
      },
      {
        "id": "remember",
        "title": "Remember",
        "description": "Perimeter is easy to calculate when you check every side carefully and keep track of the units.",
        "reminders": [
          "Add every side exactly once.",
          "Check that the result has the correct unit.",
          "In equal-sided figures you can reuse the repeated length."
        ]
      }
    ],
    "practiceNote": "The mobile lesson already organizes the way to calculate perimeter, but richer drawing tasks still remain on the web side."
  }
};

