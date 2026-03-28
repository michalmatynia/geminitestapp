import type { KangurLessonComponentId } from '@kangur/contracts';

import type { KangurPortableLessonBody } from './lesson-content';

export const ENGLISH_PORTABLE_LESSON_BODIES_LOGIC: Partial<Record<KangurLessonComponentId, KangurPortableLessonBody>> = {
  "logical_thinking": {
    "introduction": "Logical thinking helps you organize information, find rules, and draw conclusions step by step. It is a shared foundation for puzzles, maths, and everyday problem solving.",
    "sections": [
      {
        "id": "intro",
        "title": "What logical thinking is",
        "description": "It is the skill of looking for order and checking whether an answer really follows from the facts instead of chance.",
        "example": {
          "label": "Example",
          "equation": "If all cats have four legs and Muffin is a cat...",
          "explanation": "...then you can conclude that Muffin has four legs. The conclusion follows from the given facts."
        },
        "reminders": [
          "Look for the rule, not only for a single example.",
          "A good answer should be explainable."
        ]
      },
      {
        "id": "patterns",
        "title": "Patterns and sequences",
        "description": "Logical thinking often begins with noticing a repeating arrangement or a constant change.",
        "example": {
          "label": "Example",
          "equation": "2, 4, 6, 8, ?",
          "explanation": "Each step increases the number by 2, so the next element is 10."
        },
        "reminders": [
          "Look for a fixed difference or a repeating group of elements.",
          "A pattern can involve numbers, colours, shapes, or all of them together."
        ]
      },
      {
        "id": "classification",
        "title": "Classification and the odd one out",
        "description": "Sometimes you need to arrange items into groups by a shared feature, and sometimes you need to find the one item that does not fit.",
        "example": {
          "label": "Example",
          "equation": "🍎 🍌 🥕 🍇",
          "explanation": "The odd one out is 🥕 because the others are fruit and it is a vegetable."
        },
        "reminders": [
          "First name the shared feature of the group.",
          "The item that does not fit breaks the same rule that links the rest."
        ]
      },
      {
        "id": "reasoning",
        "title": "If... then...",
        "description": "Reasoning means connecting known facts and checking what follows from them.",
        "example": {
          "label": "Example",
          "equation": "If a number is even, it is divisible by 2. Is 6 even?",
          "explanation": "Yes. Since 6 is even, the rule tells you it is divisible by 2."
        },
        "reminders": [
          "First identify the condition, then check whether it fits the case.",
          "Do not guess. Show which step leads to the answer."
        ]
      }
    ],
    "practiceNote": "These lessons prepare you for the next logical tasks. On mobile we start with shared rules and examples, and the more interactive exercises will come later."
  },
  "logical_patterns": {
    "introduction": "Patterns and sequences teach you to predict the next step from a rule. This is one of the most important skills in logical and mathematical tasks.",
    "sections": [
      {
        "id": "visual-patterns",
        "title": "Colour and shape patterns",
        "description": "The easiest patterns rely on a repeating group of symbols, colours, or shapes.",
        "example": {
          "label": "Example",
          "equation": "🔴 🔵 🔴 🔵 🔴 ?",
          "explanation": "The red-blue pattern repeats, so the missing element is 🔵."
        },
        "reminders": [
          "Find the smallest part that repeats.",
          "Check whether the same rule works from start to finish."
        ]
      },
      {
        "id": "arithmetic-sequences",
        "title": "Sequences with a fixed difference",
        "description": "In arithmetic sequences, every next element changes by the same amount.",
        "example": {
          "label": "Example",
          "equation": "5, 10, 15, 20, ?",
          "explanation": "Each step adds 5, so the next element is 25."
        },
        "reminders": [
          "Subtract neighbouring numbers and check whether the difference stays the same.",
          "If the difference does not fit, look for another kind of rule."
        ]
      },
      {
        "id": "geometric-sequences",
        "title": "Sequences with a fixed ratio",
        "description": "Some sequences do not add the same number. Instead, they multiply by the same value each time.",
        "example": {
          "label": "Example",
          "equation": "1, 2, 4, 8, 16, ?",
          "explanation": "Each element is twice as large as the previous one, so the next is 32."
        },
        "reminders": [
          "Divide one term by the previous one and check whether the ratio repeats.",
          "Fast growth often means multiplication, not addition."
        ]
      },
      {
        "id": "strategy",
        "title": "How to search for the rule",
        "description": "When the pattern is not obvious, it helps to use a short checklist instead of guessing.",
        "example": {
          "label": "Example",
          "equation": "3, 6, 12, 24, ?",
          "explanation": "First check differences, then ratios. Here each step multiplies by 2, so the answer is 48."
        },
        "reminders": [
          "Check differences first, then ratios, and only then relations among several earlier elements.",
          "Confirm the rule on all known elements, not just the first two."
        ]
      }
    ],
    "practiceNote": "The mobile screen already gives you a real introduction to patterns and sequences. The next logic topics can build on the same way of thinking."
  },
  "logical_classification": {
    "introduction": "Classification means grouping elements by a shared feature. It is one of the simplest and most important ways to organize information.",
    "sections": [
      {
        "id": "intro",
        "title": "What classification is",
        "description": "To classify correctly, you first need to name the feature that connects the elements in one group.",
        "example": {
          "label": "Example",
          "equation": "🍎 🍌 🍇 🍓",
          "explanation": "These items can be placed in one fruit group because they share the same category."
        },
        "reminders": [
          "You can group by colour, shape, size, category, or a number property.",
          "First decide on the feature, then build the groups."
        ]
      },
      {
        "id": "many-features",
        "title": "Several features at once",
        "description": "Sometimes one feature is not enough, and you have to look at colour, size, or another extra property at the same time.",
        "example": {
          "label": "Example",
          "equation": "big red / big blue / small red / small blue",
          "explanation": "Here each group is created by combining two features: size and colour."
        },
        "reminders": [
          "Each extra feature increases the number of possible groups.",
          "Describe groups precisely so you do not mix different criteria."
        ]
      },
      {
        "id": "intruder",
        "title": "Find the odd one out",
        "description": "Odd-one-out tasks check whether you understand the group rule and can point to the element that breaks it.",
        "example": {
          "label": "Example",
          "equation": "2, 4, 7, 8, 10",
          "explanation": "The odd one out is 7 because the other numbers are even and 7 is odd."
        },
        "reminders": [
          "First identify the shared feature of most elements.",
          "The odd one out does not fit the rule, and you should be able to explain why."
        ]
      },
      {
        "id": "venn",
        "title": "Venn diagram and summary",
        "description": "A Venn diagram helps show what belongs to one group, another group, or both at the same time.",
        "example": {
          "label": "Example",
          "equation": "sport / music / both",
          "explanation": "The overlap shows the elements that fit two categories at once."
        },
        "reminders": [
          "The overlap is the intersection of two sets.",
          "Classification organizes information and makes later reasoning easier."
        ]
      }
    ],
    "practiceNote": "The mobile version already gives you the full line of thinking needed for classification tasks, even if richer interactions still stay on the web side."
  },
  "logical_reasoning": {
    "introduction": "Logical reasoning means moving from known facts to new conclusions. Instead of guessing, you rely on rules and check what follows from them.",
    "sections": [
      {
        "id": "intro",
        "title": "What reasoning is",
        "description": "Reasoning can go from the general rule to a specific case, or from many observations to a more general idea.",
        "example": {
          "label": "Example",
          "equation": "All dogs bark. Rex is a dog.",
          "explanation": "From these two facts, it follows that Rex barks."
        },
        "reminders": [
          "Deduction moves from a general rule to a concrete case.",
          "A good conclusion must rely on what you really know."
        ]
      },
      {
        "id": "if-then",
        "title": "If... then...",
        "description": "Conditional sentences connect a condition with a consequence and are a basic tool of logical thinking.",
        "example": {
          "label": "Example",
          "equation": "If a number is even, it is divisible by 2.",
          "explanation": "Since 8 is even, the rule tells you that 8 is divisible by 2."
        },
        "reminders": [
          "Do not confuse a rule with its reverse.",
          "First check whether the condition is satisfied."
        ]
      },
      {
        "id": "quantifiers",
        "title": "All, some, none",
        "description": "Quantifiers show how widely a statement applies and what you need to watch out for when drawing conclusions.",
        "example": {
          "label": "Example",
          "equation": "Some cats are ginger.",
          "explanation": "That does not mean every cat is ginger. The statement only applies to part of the group."
        },
        "reminders": [
          "All means every case.",
          "Some means only part of the cases.",
          "None means there is no exception at all."
        ]
      },
      {
        "id": "puzzles",
        "title": "Puzzles step by step",
        "description": "In more complex tasks, you need to combine several clues, remove impossible options, and keep checking whether the solution still fits.",
        "example": {
          "label": "Example",
          "equation": "There are three houses: red, blue, green...",
          "explanation": "Solving a puzzle means writing down certain facts and systematically ruling out what is impossible."
        },
        "reminders": [
          "Start with direct facts.",
          "Eliminating wrong options often leads you to the right answer."
        ]
      }
    ],
    "practiceNote": "This topic prepares you for harder logic puzzles. On mobile we first bring over the way of thinking itself and the structure for solving problems."
  },
  "logical_analogies": {
    "introduction": "An analogy means finding the same relationship in two different pairs. It is not about surface similarity, but about the same type of connection.",
    "sections": [
      {
        "id": "intro",
        "title": "What an analogy is",
        "description": "In an analogy, you ask: what relationship connects the first pair, and how can I transfer it to the second pair?",
        "example": {
          "label": "Example",
          "equation": "Bird : fly = fish : ?",
          "explanation": "The relationship is creature and way of moving, so the answer is swim."
        },
        "reminders": [
          "First name the relationship in the first pair.",
          "Only then look for the element that rebuilds the same relationship."
        ]
      },
      {
        "id": "verbal",
        "title": "Word analogies",
        "description": "Word analogies can rely on opposites, function, part and whole, or a typical action.",
        "example": {
          "label": "Example",
          "equation": "Scissors : cutting = pencil : ?",
          "explanation": "This is a tool -> function relationship, so the answer is writing."
        },
        "reminders": [
          "Finding the type of relationship matters more than the words themselves.",
          "Opposites and function are two very common kinds of analogy."
        ]
      },
      {
        "id": "numbers-shapes",
        "title": "Number and shape analogies",
        "description": "In number or visual analogies, the same operation changes numbers, directions, colours, or the number of elements.",
        "example": {
          "label": "Example",
          "equation": "2 : 4 = 5 : ?",
          "explanation": "The relationship is multiplying by 2, so the missing answer is 10."
        },
        "reminders": [
          "With numbers, check addition, subtraction, multiplication, and division.",
          "With shapes, look for rotation, size, colour, and the number of elements."
        ]
      },
      {
        "id": "cause-whole",
        "title": "Part-whole and cause-effect",
        "description": "Many analogies are based on one element belonging to another, or on something causing a certain effect.",
        "example": {
          "label": "Example",
          "equation": "Page : book = brick : ?",
          "explanation": "This is a part -> whole relationship, so the answer is wall or building."
        },
        "reminders": [
          "Part-whole is a very common pattern in analogy tasks.",
          "Cause-effect asks what produces a given result."
        ]
      }
    ],
    "practiceNote": "Analogies teach you to carry a rule into a new context. That makes them a good bridge between simple patterns and harder logical reasoning."
  }
};

