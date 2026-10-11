import { z } from 'zod';

export const BoundingBoxSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  w: z.number().min(0).max(1),
  h: z.number().min(0).max(1),
});

export const ExtractedFieldItemSchema = z.object({
  fieldKey: z.string(),
  label: z.string(),
  fieldValue: z.string(),
  normalizedValue: z.string().optional(),
  confidence: z.number().min(0).max(1),
  pageNumber: z.number().int().min(1),
  bbox: BoundingBoxSchema,
  category: z.string(),
});

export const DocumentExtractionResultSchema = z.object({
  documentType: z.string(),
  fileName: z.string(),
  pageCount: z.number().int().min(1),
  summary: z.string(),
  overallConfidence: z.number().min(0).max(1),
  fields: z.array(ExtractedFieldItemSchema),
});

export type DocumentExtractionResult = z.infer<typeof DocumentExtractionResultSchema>;
export type ExtractedFieldItem = z.infer<typeof ExtractedFieldItemSchema>;
