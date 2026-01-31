import type { SectionInstance, BlockInstance, PageZone } from "../../types/page-builder";

// ---------------------------------------------------------------------------
// ID generation (separate counter to avoid collisions with builder IDs)
// ---------------------------------------------------------------------------

let templateId = 9000;
function tid(): string {
  return `tpl-${templateId++}`;
}

function block(type: string, settings: Record<string, unknown>, blocks?: BlockInstance[]): BlockInstance {
  return { id: tid(), type, settings, ...(blocks ? { blocks } : {}) };
}

function section(type: string, settings: Record<string, unknown>, blocks: BlockInstance[], zone: PageZone = "template"): SectionInstance {
  return { id: tid(), type, zone, settings, blocks };
}

// ---------------------------------------------------------------------------
// Template definitions
// ---------------------------------------------------------------------------

export interface SectionTemplate {
  name: string;
  description: string;
  category: string;
  zones?: PageZone[];
  create: () => SectionInstance;
}

export const SECTION_TEMPLATES: SectionTemplate[] = [
  {
    name: "Hero with CTA",
    description: "Full-width hero banner with heading, text, and call-to-action button",
    category: "Hero",
    zones: ["template"],
    create: () =>
      section(
        "Hero",
        { imageHeight: "large", colorScheme: "scheme-1", paddingTop: 36, paddingBottom: 36 },
        [
          block("Heading", { headingText: "Welcome to Our Site", headingSize: "large" }),
          block("Text", { textContent: "Discover what makes us different. We deliver quality and innovation." }),
          block("Button", { buttonLabel: "Get Started", buttonLink: "#", buttonStyle: "solid" }),
        ]
      ),
  },
  {
    name: "Image + Text Intro",
    description: "Side-by-side image and text introduction section",
    category: "Content",
    zones: ["template"],
    create: () =>
      section(
        "ImageWithText",
        {
          imageHeight: "medium",
          desktopImageWidth: "medium",
          desktopImagePlacement: "image-first",
          desktopContentPosition: "middle",
          desktopContentAlignment: "left",
          contentLayout: "no-overlap",
          colorScheme: "scheme-3",
          containerColorScheme: "scheme-1",
          imageBehavior: "none",
          paddingTop: 36,
          paddingBottom: 36,
        },
        [
          block("Heading", { headingText: "About Us", headingSize: "medium" }),
          block("Text", { textContent: "Learn more about our mission and the team behind the product." }),
        ]
      ),
  },
  {
    name: "FAQ Section",
    description: "Accordion with pre-filled frequently asked questions",
    category: "Content",
    zones: ["template"],
    create: () =>
      section(
        "Accordion",
        { colorScheme: "scheme-1", paddingTop: 36, paddingBottom: 36 },
        [
          block("Heading", { headingText: "What is your return policy?", headingSize: "small" }),
          block("Text", { textContent: "You can return any item within 30 days of purchase for a full refund." }),
          block("Heading", { headingText: "How long does shipping take?", headingSize: "small" }),
          block("Text", { textContent: "Standard shipping takes 5-7 business days. Express shipping is available." }),
          block("Heading", { headingText: "Do you offer support?", headingSize: "small" }),
          block("Text", { textContent: "Yes, our support team is available 24/7 via email and live chat." }),
        ]
      ),
  },
  {
    name: "Testimonials Grid",
    description: "Three-column grid of customer testimonials",
    category: "Social Proof",
    zones: ["template"],
    create: () =>
      section(
        "Testimonials",
        { layout: "grid", columns: 3, colorScheme: "scheme-1", paddingTop: 36, paddingBottom: 36 },
        [
          block("Text", { textContent: "This product changed the way we work. Highly recommended!" }),
          block("Text", { textContent: "Outstanding quality and customer service. Five stars." }),
          block("Text", { textContent: "We saw a 40% improvement in productivity after switching." }),
        ]
      ),
  },
  {
    name: "Newsletter Signup",
    description: "Email signup section with heading and description",
    category: "Lead Capture",
    zones: ["template"],
    create: () =>
      section(
        "Newsletter",
        {
          buttonText: "Subscribe",
          placeholder: "Enter your email address",
          colorScheme: "scheme-2",
          paddingTop: 48,
          paddingBottom: 48,
        },
        [
          block("Heading", { headingText: "Stay in the Loop", headingSize: "medium" }),
          block("Text", { textContent: "Get the latest news and updates delivered to your inbox." }),
        ]
      ),
  },
  {
    name: "Contact Us",
    description: "Contact form with name, email, and message fields",
    category: "Lead Capture",
    zones: ["template"],
    create: () =>
      section(
        "ContactForm",
        {
          fields: "name,email,message",
          submitText: "Send Message",
          successMessage: "Thank you! We will get back to you soon.",
          colorScheme: "scheme-1",
          paddingTop: 36,
          paddingBottom: 36,
        },
        []
      ),
  },
];

export function getTemplatesByCategory(zone?: PageZone): Record<string, SectionTemplate[]> {
  const grouped: Record<string, SectionTemplate[]> = {};
  const templates = zone
    ? SECTION_TEMPLATES.filter((tpl: SectionTemplate) => !tpl.zones || tpl.zones.includes(zone))
    : SECTION_TEMPLATES;
  for (const tpl of templates) {
    if (!grouped[tpl.category]) grouped[tpl.category] = [];
    grouped[tpl.category]!.push(tpl);
  }
  return grouped;
}
