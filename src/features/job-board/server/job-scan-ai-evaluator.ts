import 'server-only';

import { z } from 'zod';

import {
  jobContractTypeSchema,
  jobExperienceLevelSchema,
  jobWorkModeSchema,
  type JobScanEvaluation,
} from '@/shared/contracts/job-board';
import { runBrainChatCompletion } from '@/shared/lib/ai-brain/server-runtime-client';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const DEFAULT_MODEL_ID = 'claude-haiku-4-5-20251001';

const aiCompanyPartialSchema = z.object({
  name: z.string().nullable().optional(),
  nip: z.string().nullable().optional(),
  domain: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  industry: z.string().nullable().optional(),
  size: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  addressLine: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  postalCode: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
});

const aiSalarySchema = z
  .object({
    min: z.number().nullable().optional(),
    max: z.number().nullable().optional(),
    currency: z.string().nullable().optional(),
    period: z.string().nullable().optional(),
    raw: z.string().nullable().optional(),
  })
  .nullable()
  .optional();

const aiListingPartialSchema = z.object({
  title: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  contractType: jobContractTypeSchema.nullable().optional(),
  workMode: jobWorkModeSchema.nullable().optional(),
  experienceLevel: jobExperienceLevelSchema.nullable().optional(),
  city: z.string().nullable().optional(),
  region: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  salary: aiSalarySchema,
  requirements: z.array(z.string()).max(50).optional(),
  responsibilities: z.array(z.string()).max(50).optional(),
  benefits: z.array(z.string()).max(50).optional(),
  technologies: z.array(z.string()).max(50).optional(),
  applyUrl: z.string().nullable().optional(),
  postedAt: z.string().nullable().optional(),
  expiresAt: z.string().nullable().optional(),
});

export const jobScanAiResponseSchema = z.object({
  company: aiCompanyPartialSchema.nullable(),
  listing: aiListingPartialSchema.nullable(),
  confidence: z.number().min(0).max(1).nullable(),
});
export type JobScanAiResponse = z.infer<typeof jobScanAiResponseSchema>;

const SYSTEM_PROMPT = `You extract structured company and job-listing data from a job-board page (e.g. pracuj.pl).
Return ONLY a JSON object that matches this shape (use null for unknown fields, never invent values):
{
  "company": { "name": string|null, "nip": string|null, "domain": string|null, "website": string|null,
               "industry": string|null, "size": string|null, "description": string|null,
               "addressLine": string|null, "city": string|null, "postalCode": string|null, "country": string|null },
  "listing": { "title": string|null, "description": string|null,
               "contractType": "employment"|"b2b"|"mandate"|"contract_of_specific_task"|"internship"|"unknown"|null,
               "workMode": "onsite"|"remote"|"hybrid"|"unknown"|null,
               "experienceLevel": "intern"|"junior"|"mid"|"senior"|"expert"|"manager"|"unknown"|null,
               "city": string|null, "region": string|null, "country": string|null,
               "salary": { "min": number|null, "max": number|null, "currency": string|null,
                           "period": "monthly"|"hourly"|"yearly"|null, "raw": string|null } | null,
               "requirements": string[], "responsibilities": string[], "benefits": string[],
               "technologies": string[], "applyUrl": string|null,
               "postedAt": ISO-8601-string|null, "expiresAt": ISO-8601-string|null },
  "confidence": number between 0 and 1
}
Rules:
- Salary numbers must be plain numbers in the listed currency (no formatting).
- Polish NIP is exactly 10 digits — extract only if you can see one.
- contractType "employment" = "umowa o pracę", "b2b" = "kontrakt B2B", "mandate" = "umowa zlecenie".
- Output JSON only, no markdown, no comments.`;

const MAX_INPUT_CHARS = 80_000;

export const evaluateJobPageWithAi = async (input: {
  sourceUrl: string;
  pageContent: string;
  modelId?: string;
}): Promise<JobScanEvaluation> => {
  const modelId = input.modelId ?? DEFAULT_MODEL_ID;
  const truncated = input.pageContent.slice(0, MAX_INPUT_CHARS);
  const evaluatedAt = new Date().toISOString();

  try {
    const completion = await runBrainChatCompletion({
      modelId,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Source URL: ${input.sourceUrl}\n\nPage content (HTML or text):\n\n${truncated}`,
        },
      ],
      temperature: 0,
      maxTokens: 4096,
      jsonMode: true,
    });

    const jsonText = extractJsonObject(completion.text);
    const parsed = jobScanAiResponseSchema.parse(JSON.parse(jsonText));

    return {
      company: parsed.company ?? null,
      listing: parsed.listing
        ? {
            ...parsed.listing,
            requirements: parsed.listing.requirements ?? [],
            responsibilities: parsed.listing.responsibilities ?? [],
            benefits: parsed.listing.benefits ?? [],
            technologies: parsed.listing.technologies ?? [],
          }
        : null,
      confidence: parsed.confidence,
      modelId: completion.modelId,
      error: null,
      evaluatedAt,
    };
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'job-scans.ai-evaluator',
      action: 'evaluateJobPageWithAi',
      sourceUrl: input.sourceUrl,
    });
    return {
      company: null,
      listing: null,
      confidence: null,
      modelId,
      error: error instanceof Error ? error.message : String(error),
      evaluatedAt,
    };
  }
};

const extractJsonObject = (text: string): string => {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1]!.trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
};
