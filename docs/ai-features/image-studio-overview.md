---
owner: 'AI Platform Team'
last_reviewed: '2026-03-21'
status: 'active'
doc_type: 'feature-guide'
feature: 'image-studio'
---

# Image Studio — Feature Overview

Image Studio is a comprehensive AI-powered image generation and manipulation platform with multi-project workspaces, mask-based generation, shape tools, prompt engineering, batch processing, and automatic object layout detection.

## Feature Overview

Image Studio enables visual content creation at scale:

- **Projects**: Separate workspaces with independent settings and asset libraries
- **Slots**: Image containers with associated masks and prompts
- **Masks**: Shape-based regions for targeted image generation
- **Prompts**: Reusable, optimized prompts with variables and templates
- **Batch Generation**: Process multiple images simultaneously
- **Object Detection**: Automatic boundary and layout detection
- **Real-time Monitoring**: Live generation status and progress

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  Image Studio System                                │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Admin Pages                                       │
│  ├─ AdminImageStudioPage (main workspace)          │
│  ├─ AdminImageStudioPromptsPage (prompt library)   │
│  ├─ AdminImageStudioSettingsPage (config)          │
│  └─ AdminImageStudioUiPresetsPage (UI presets)     │
│                                                     │
│  Context Layer (6 Domain Contexts)                 │
│  ├─ SettingsContext (studio config, generation)    │
│  ├─ ProjectsContext (project CRUD)                 │
│  ├─ SlotsContext (image containers, history)       │
│  ├─ MaskingContext (mask tools, shapes)            │
│  ├─ PromptContext (prompt templates, variables)    │
│  └─ GenerationContext (batch jobs, status)         │
│                                                     │
│  Components (50+)                                  │
│  ├─ Canvas (main editing area)                     │
│  ├─ Shape Tools (rectangle, circle, freehand)      │
│  ├─ Property Panels (mask, prompt, generation)     │
│  ├─ History Panel (previous generations)           │
│  └─ Analysis Tools (layout detection, optimization)│
│                                                     │
│  Server-Side Processing                            │
│  ├─ Image processing (resize, compress)            │
│  ├─ Layout detection (boundaries, objects)         │
│  ├─ Canvas scaling (auto-adapt to canvas)          │
│  └─ Thumbnail generation                           │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Core Concepts

### Projects

Each project is an independent workspace:

```
Project: "Product Photography"
├─ Settings
│  ├─ Model: Stable Diffusion
│  ├─ Default resolution: 1024x1024
│  └─ Auto-scaling enabled
├─ Assets
│  ├─ Base images (reference photos)
│  ├─ Generated slots (outputs)
│  └─ Prompts (reusable templates)
└─ History (all generations)
```

**Project Record**:
```typescript
interface ImageStudioProject {
  id: string;
  name: string;
  description?: string;

  settings: {
    modelId: string;
    defaultResolution: { width: number; height: number };
    autoScaling: boolean;
    qualityLevel: 'fast' | 'balanced' | 'high';
  };

  assets: {
    baseImages: ImageAsset[];
    slots: ImageSlot[];
  };

  createdAt: Date;
  updatedAt: Date;
}
```

### Slots

Image containers representing a generated or base image:

```
Slot: "Product Hero Image"
├─ Base image: product_photo.png (reference)
├─ Mask: Rectangle (only modify background)
├─ Prompt: "Modern office background, clean..."
├─ Variations: [generated_1.png, generated_2.png]
└─ Metadata: Size, created date, generation params
```

**Slot Record**:
```typescript
interface ImageSlot {
  id: string;
  projectId: string;
  title: string;

  baseImage?: {
    url: string;
    width: number;
    height: number;
  };

  mask?: MaskDefinition;
  prompt?: PromptDefinition;

  generations: {
    imageUrl: string;
    timestamp: Date;
    generationParams: Record<string, unknown>;
  }[];

  selectedGenerationIndex: number;
}
```

### Masks

Shape-based regions that define what to generate:

| Mask Type | Use Case | Example |
|-----------|----------|---------|
| **Rectangle** | Regular areas | Background, product zone |
| **Circle** | Product highlights | Focus areas, thumbnails |
| **Freehand** | Complex shapes | Custom regions, artistic |
| **Full Canvas** | Complete image | Fresh generation |

**Mask Definition**:
```typescript
interface MaskDefinition {
  type: 'rectangle' | 'circle' | 'freehand' | 'full';
  bounds: { x: number; y: number; width: number; height: number };
  feathering?: number;  // Smooth edges
  opacity?: number;     // Blend strength
}
```

### Prompts

Reusable prompt templates with variables:

```
Prompt Template: "Product Photography"

Text: "A {color} {product} in a {setting},
       professional photography,
       soft lighting, {style}"

Variables:
- color: ["red", "blue", "black", "white"]
- product: ["watch", "phone", "camera"]
- setting: ["office", "studio", "outdoor"]
- style: ["minimal", "detailed", "artistic"]

Optimization:
- Temperature: 0.7
- Max tokens: 256
- Focus on quality over speed
```

**Prompt Record**:
```typescript
interface PromptDefinition {
  id: string;
  title: string;
  text: string;

  variables: {
    name: string;
    type: 'text' | 'select' | 'number';
    options?: string[];
    default?: string;
  }[];

  optimization: {
    temperature: number;
    maxTokens: number;
    qualityMode: boolean;
  };

  tags: string[];
}
```

### Generation

Multi-step image generation process:

```
1. User clicks "Generate"
2. System validates:
   - Prompt is complete
   - Mask is valid
   - Canvas size within limits
3. Creates generation job:
   - Queue it for processing
   - Start monitoring
4. Backend processing:
   - Apply mask to base image
   - Send to AI model
   - Post-process output
   - Generate thumbnail
5. Return result:
   - Display in slot
   - Add to history
   - Enable download
```

**Generation Record**:
```typescript
interface GenerationJob {
  id: string;
  slotId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';

  input: {
    prompt: string;
    mask: MaskDefinition;
    baseImageUrl?: string;
    resolution: { width: number; height: number };
  };

  output?: {
    imageUrl: string;
    thumbnailUrl: string;
    metadata: Record<string, unknown>;
  };

  error?: string;

  createdAt: Date;
  completedAt?: Date;
}
```

---

## Typical Workflows

### Creating a Product Image Variant

```
1. Create project "Summer Products"
2. Upload base product photo
3. Create slot "Product on Beach"
4. Draw mask (keep product, replace background)
5. Write prompt: "Beach setting, sunny, sand texture"
6. Click Generate
7. Review result
8. If good: Download or generate variant
9. If not: Adjust prompt, regenerate
```

### Batch Processing

```
1. Create 3 slots: red_version, blue_version, black_version
2. Create variations prompt: "{color} product..."
3. Select all 3 slots
4. Click "Batch Generate"
5. Monitor progress (3/10 complete...)
6. Download all variants
```

### Using Object Detection

```
1. Upload product photo
2. Run "Detect Objects"
3. System identifies: product (center), background (edges), shadow (bottom)
4. Suggests masks: "Keep product, modify background?"
5. Create mask automatically
6. Generate with suggested mask
```

### Prompt Optimization

```
1. Create base prompt: "product photo"
2. Note generation time: 45 seconds
3. Switch to "Fast" quality mode
4. Regenerate: 15 seconds (acceptable)
5. Save optimized version
```

---

## Key Components

### Canvas
- Visual editing area with zoom and pan
- Real-time mask preview
- Layer support (base image, mask, generated)
- Undo/redo stack

### Shape Tools
- **Rectangle Tool**: Click-drag to create
- **Circle Tool**: Click center, drag radius
- **Freehand Tool**: Draw custom shape
- **Selection Tool**: Modify existing masks

### Property Panels
- **Mask Panel**: Properties (feathering, opacity)
- **Prompt Panel**: Text editor with variables
- **Generation Panel**: Model, quality, resolution settings
- **History Panel**: Previous generations, variants

### Analysis Tools
- **Layout Detection**: Identify objects and boundaries
- **Color Analysis**: Extract dominant colors
- **Composition Analyzer**: Rule-of-thirds, balance

---

## Key Files

### Pages
- `src/features/ai/image-studio/pages/AdminImageStudioPageView.tsx` — Main workspace
- `src/features/ai/image-studio/pages/AdminImageStudioPromptsPage.tsx` — Prompt library
- `src/features/ai/image-studio/pages/AdminImageStudioSettingsPage.tsx` — Studio settings
- `src/features/ai/image-studio/pages/AdminImageStudioUiPresetsPage.tsx` — UI presets

### Context (6 domain contexts)
- `src/features/ai/image-studio/context/ImageStudioProvider.tsx` — Root provider
- `src/features/ai/image-studio/context/SettingsContext.tsx`
- `src/features/ai/image-studio/context/ProjectsContext.tsx`
- `src/features/ai/image-studio/context/SlotsContext.tsx`
- `src/features/ai/image-studio/context/MaskingContext.tsx`
- `src/features/ai/image-studio/context/PromptContext.tsx`
- `src/features/ai/image-studio/context/GenerationContext.tsx`

### Components (50+)
- `src/features/ai/image-studio/components/` — Full component library
  - Canvas and tools
  - Property panels
  - History and preview
  - Analysis tools

### Server-Side
- `src/features/ai/image-studio/server/` — Image processing, detection, scaling

### Utilities
- `src/features/ai/image-studio/utils/` — 15+ helper modules

---

## Integration Points

### With Chatbot
- Ask chatbot for prompt ideas
- Reference generated images in conversations
- Use chat history as generation inspiration

### With Agent Creator
- Use agent personas in generation prompts
- Create persona-branded image sets

### With Insights
- Track generation trends
- Analyze popular prompts
- Monitor generation success rates

---

## Performance Optimization

### Canvas Rendering
- Virtual scrolling for large projects
- Lazy loading of thumbnails
- WebGL acceleration for transformations

### Generation
- Batch processing with queue management
- Automatic scaling based on load
- Progressive JPEG delivery
- Thumbnail pre-generation

### Storage
- Image compression (90% quality default)
- Automatic cleanup of old variants
- CDN distribution for delivery

---

## Common Tasks

### Create a Project
```tsx
const { createProject } = useProjectsActions();

await createProject({
  name: 'Summer Campaign',
  description: 'Product photos for summer launch',
  modelId: 'stable-diffusion-xl',
});
```

### Generate an Image
```tsx
const { generateImage } = useGenerationActions();

await generateImage({
  slotId: 'slot-123',
  prompt: 'Product on beach, sunset lighting',
  mask: {
    type: 'rectangle',
    bounds: { x: 0, y: 0, width: 512, height: 512 },
  },
  resolution: { width: 1024, height: 1024 },
});
```

### Detect Objects
```tsx
const { detectObjects } = useMaskingActions();

const detected = await detectObjects(baseImageUrl);
// Returns: { objects: [...], suggestedMasks: [...] }
```

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Generation too slow | Quality mode enabled, large image | Switch to balanced mode, reduce size |
| Bad image quality | Poor prompt, wrong mask | Refine prompt, adjust mask feathering |
| Memory error | Canvas too large | Reduce resolution, close unused projects |
| Mask not working | Invalid bounds, zero size | Check mask coordinates, redraw |

---

## Next Steps

1. **Project Management**: Creating and organizing projects
2. **Mask Techniques**: Advanced masking for professional results
3. **Prompt Engineering**: Crafting effective prompts
4. **Batch Workflows**: Processing multiple images efficiently
5. **Object Detection**: Using AI to auto-detect image regions

---

**Last Updated:** 2026-03-21
**Status:** Comprehensive feature overview
**Related Docs:** AI Features README, Image Studio improvement plan, Canvas tools guide

