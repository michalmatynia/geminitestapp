---
owner: 'AI Paths Team'
last_reviewed: '2026-03-09'
status: 'active'
doc_type: 'runbook'
scope: 'feature:ai-paths'
canonical: true
---

# Description Inference v3 Lite -> Longform Ecommerce (UI-only)

## Outcome

- Keep your current strong factual inference behavior.
- Expand outputs to full ecommerce descriptions (target 140-220 words).
- Add an automatic quality gate so short/vague outputs regenerate.

## Exact variable map from your export

These are the placeholders present in your current description path exports (`path_f9z4de`, `path_iabe2o`):

- `{{title}}`
- `{{images}}`
- `{{bundle.content_en}}` (existing description)
- `{{bundle.productId}}`
- `{{bundle}}` (full parsed payload bundle)

## Step 1: Duplicate path

1. Open Admin -> AI Paths.
2. Find `Description Inference v3 Lite`.
3. Duplicate/Clone path.
4. Rename to `Description Inference v3 Longform Ecommerce`.
5. Keep the original path unchanged for A/B comparison.

## Step 2: Update main generation prompt (Draft node)

Use this exact prompt in your existing prompt node (tailored to your exported fields):

```txt
You are an ecommerce copywriter. Write a compelling, accurate product description using ONLY the provided product data.

Requirements:
- Length: 140-220 words.
- Format: 3 short paragraphs.
- Paragraph 1: Hook + what the product is.
- Paragraph 2: 3-5 concrete benefits tied to product attributes.
- Paragraph 3: Practical use cases + buyer-oriented close.
- Mention specific attributes when available (material, dimensions, compatibility, capacity, finish, included items, care).
- Focus on benefits, clarity, and conversion intent.

Hard rules:
- Do not invent specifications, certifications, warranties, or claims not present in input.
- Do not use placeholder text.
- Do not output fewer than 140 words.
- Avoid generic filler and repeated phrases.

Input data:
Title: {{title}}
Images: {{images}}
Existing description: {{bundle.content_en}}
Product ID: {{bundle.productId}}
Full product bundle JSON: {{bundle}}
```

## Step 3: Enforce structure in UI output template

If your node supports response format instructions, append:

```txt
Return plain text only in this exact structure:
[Paragraph 1]

[Paragraph 2]

[Paragraph 3]
```

This stabilizes length and makes outputs consistently scannable for ecommerce.

## Step 4: Expand input context mapping

In the parser/mapper nodes before generation, ensure these paths are available to prompt context:

- `product.name`
- `product.brand`
- `product.category`
- `product.shortDescription`
- `product.attributes`
- `product.materials`
- `product.dimensions`
- `product.compatibility`
- `product.includedItems`
- `product.care`
- `product.useCase`

If any field is missing in your schema, keep it in prompt anyway; missing variables should resolve blank and not break run.

## Step 5: Add style constraints (UI settings)

In the generation node advanced instructions, add:

- `Tone: confident, vivid, customer-focused`
- `Reading level: plain, clear, non-technical unless product requires it`
- `Forbidden behavior: hype-only claims, unverifiable superlatives, hallucinated specs`
- `Repetition control: avoid repeating same adjective/phrase`

## Step 6: Add second-pass expansion node

Add a second `model` node after draft output.

Input: `{{result}}`

Prompt:

```txt
You are editing ecommerce copy.
Expand and improve the draft below while preserving factual accuracy.

Targets:
- Final length: 160-240 words.
- Keep 3 short paragraphs.
- Increase specificity and buyer value.
- Tie benefits to explicit product details when available.
- Keep it natural and non-repetitive.

Hard constraints:
- Keep all factual statements grounded in provided data.
- Do not add unsupported specs or guarantees.
- Do not output fewer than 160 words.

Draft:
{{result}}

Source data (truth reference):
Title: {{title}}
Images: {{images}}
Existing description: {{bundle.content_en}}
Product ID: {{bundle.productId}}
Full product bundle JSON: {{bundle}}
```

Output key: `longDescriptionCandidate`

## Step 7: Add quality-check gate (UI-only path nodes)

Create a QA branch after `longDescriptionCandidate`:

1. `template` node (`qaPrompt`) with:

```txt
Evaluate the candidate ecommerce description against rules. Return strict JSON only:
{"pass": boolean, "reasons": string[], "wordCount": number}

Rules:
1) wordCount >= 160
2) Includes concrete benefits (not only generic adjectives)
3) Includes at least one practical use-case
4) No unsupported factual claims based on source data

Candidate:
{{longDescriptionCandidate}}

Source data:
Title: {{title}}
Images: {{images}}
Existing description: {{bundle.content_en}}
Product ID: {{bundle.productId}}
Full product bundle JSON: {{bundle}}
```

2. `model` node runs `qaPrompt`, outputs `qaResultRaw`.
3. `parser` node extracts:
   - `qa.pass`
   - `qa.wordCount`
   - `qa.reasons`
4. `gate` node:
   - If `qa.pass == true` -> continue to save `longDescriptionCandidate`.
   - If `qa.pass == false` -> route to regenerate node (reuse Step 6 prompt with stricter instruction line: `Fix all QA failures: {{qa.reasons}}`), then run QA once again.

Keep retry cap at 1-2 loops to avoid runaway runs.

## Step 8: A/B test setup

1. Keep both paths active:
   - Control: `Description Inference v3 Lite`
   - Variant: `Description Inference v3 Longform Ecommerce`
2. Run both on the same 20-50 representative SKUs.
3. Score each result with the CSV in:
   - `docs/ai-paths/description-ab-scorecard.csv`

## Step 9: Tuning rules (quick iteration)

Use this failure-to-fix map:

- Too short -> raise minimum words in both prompts by +20 and keep 3 paragraphs.
- Too generic -> add rule: `Use at least 3 concrete attributes from source data when available.`
- Too repetitive -> add rule: `Do not reuse the same adjective more than once.`
- Hallucinations -> tighten with `If detail is absent in source data, omit it.`

Do only one change per iteration so you can attribute impact.

## Step 10: Gradual rollout

1. Start with 1-2 product categories.
2. Monitor:
   - Pass rate at QA gate
   - Average word count
   - Manual edit rate after generation
   - Rejection/hallucination incidents
3. If stable for 3-5 days, expand to all categories and set longform path as default trigger.

## Definition of done checklist

- [ ] Path duplicated and renamed.
- [ ] Draft prompt updated (Step 2).
- [ ] Structure enforcement added (Step 3).
- [ ] Input mappings expanded (Step 4).
- [ ] Style constraints set (Step 5).
- [ ] Expansion node added (Step 6).
- [ ] QA gate + single retry loop active (Step 7).
- [ ] A/B test completed on >= 20 SKUs (Step 8).
- [ ] One to three tuning iterations documented (Step 9).
- [ ] Category rollout completed (Step 10).
