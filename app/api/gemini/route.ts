import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

export const runtime = 'nodejs';

type AiProviderId = 'gemini' | 'openai' | 'anthropic' | 'groq' | 'openrouter' | 'xai';

const CACHE_FILE_PATH = path.join(os.tmpdir(), 'aetherdoc_gemini_verified_models_v3.json');

const globalForAi = globalThis as unknown as {
  __aetherdocGeminiModelsCacheV3?: Map<string, string[]>;
};

const verifiedGeminiModelsCache =
  globalForAi.__aetherdocGeminiModelsCacheV3 ??
  (globalForAi.__aetherdocGeminiModelsCacheV3 = new Map<string, string[]>());

function readDiskModelCache(cacheKey: string): string[] | null {
  try {
    if (fs.existsSync(CACHE_FILE_PATH)) {
      const raw = fs.readFileSync(CACHE_FILE_PATH, 'utf8');
      const parsed = JSON.parse(raw) as Record<string, string[]>;
      const list = parsed[cacheKey];
      if (Array.isArray(list) && list.length > 0) {
        return list;
      }
    }
  } catch {
    // Ignore disk cache read errors
  }
  return null;
}

function writeDiskModelCache(cacheKey: string, models: string[]): void {
  try {
    let existing: Record<string, string[]> = {};
    if (fs.existsSync(CACHE_FILE_PATH)) {
      existing = JSON.parse(fs.readFileSync(CACHE_FILE_PATH, 'utf8')) as Record<string, string[]>;
    }
    existing[cacheKey] = models;
    fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(existing), 'utf8');
  } catch {
    // Ignore disk cache write errors
  }
}

/**
 * Sanitizes any API key (Gemini, OpenAI, Anthropic, Groq, OpenRouter, xAI).
 */
function sanitizeUniversalApiKey(raw: string): string {
  const trimmed = (raw || '')
    .trim()
    .replace(/^["']+|["']+$/g, '')
    .replace(/^Bearer\s+/i, '')
    .trim();

  if (!trimmed) return '';

  const geminiMatches = Array.from(trimmed.matchAll(/AIza[0-9A-Za-z_-]{33,42}/g));
  if (geminiMatches.length > 0) {
    return geminiMatches[geminiMatches.length - 1][0];
  }

  return trimmed.replace(/\s+/g, '');
}

function detectProviderOnServer(apiKey: string, explicitProvider?: string): AiProviderId {
  if (
    explicitProvider === 'openai' ||
    explicitProvider === 'anthropic' ||
    explicitProvider === 'groq' ||
    explicitProvider === 'openrouter' ||
    explicitProvider === 'xai' ||
    explicitProvider === 'gemini'
  ) {
    return explicitProvider;
  }
  if (apiKey.startsWith('sk-ant-')) return 'anthropic';
  if (apiKey.startsWith('gsk_')) return 'groq';
  if (apiKey.startsWith('sk-or-')) return 'openrouter';
  if (apiKey.startsWith('xai-')) return 'xai';
  if (apiKey.startsWith('sk-')) return 'openai';
  return 'gemini';
}

/**
 * Resolves the exact list of Gemini models enabled for this API key via Google's
 * `/v1beta/models` metadata list so `:generateContent` NEVER hits a 404 Not Found.
 */
async function resolveVerifiedGeminiModels(
  apiKey: string,
  forceRefresh = false
): Promise<{
  models: string[];
  error?: string;
}> {
  const cacheKey = apiKey.slice(0, 20);

  if (!forceRefresh) {
    const memCached = verifiedGeminiModelsCache.get(cacheKey);
    if (memCached && memCached.length > 0) {
      return { models: memCached };
    }
    const diskCached = readDiskModelCache(cacheKey);
    if (diskCached && diskCached.length > 0) {
      verifiedGeminiModelsCache.set(cacheKey, diskCached);
      return { models: diskCached };
    }
  }

  try {
    const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(
      apiKey
    )}`;
    const listRes = await fetch(listUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!listRes.ok) {
      const errData = await listRes.json().catch(() => ({}));
      const errMsg =
        errData?.error?.message || `Gemini API key rejected (HTTP ${listRes.status})`;
      return { models: [], error: errMsg };
    }

    const listData = await listRes.json();
    const rawModels: Array<{
      name?: string;
      supportedGenerationMethods?: string[];
    }> = Array.isArray(listData?.models) ? listData.models : [];

    const validTextModels = rawModels
      .filter(
        (m) =>
          typeof m.name === 'string' &&
          Array.isArray(m.supportedGenerationMethods) &&
          m.supportedGenerationMethods.includes('generateContent')
      )
      .map((m) => m.name!.replace(/^models\//, ''))
      .filter(
        (name) =>
          name.startsWith('gemini-') &&
          !/(-tts|-image|-live|-transcribe|embedding|imagen|veo|aqa|robotics|computer-use|audio|thinking|exp)/i.test(
            name
          )
      );

    // Preferred real production Gemini Flash models in priority order
    const priorityOrder = [
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
      'gemini-2.0-flash',
      'gemini-2.0-flash-lite',
      'gemini-flash-latest',
      'gemini-1.5-flash',
    ];

    const orderedVerified: string[] = [];
    for (const preferred of priorityOrder) {
      if (validTextModels.includes(preferred)) {
        orderedVerified.push(preferred);
      }
    }

    for (const m of validTextModels) {
      if (!orderedVerified.includes(m) && /flash/i.test(m)) {
        orderedVerified.push(m);
      }
    }

    if (orderedVerified.length === 0) {
      if (validTextModels.length > 0) {
        orderedVerified.push(validTextModels[0]);
      } else {
        orderedVerified.push('gemini-2.5-flash', 'gemini-2.0-flash');
      }
    }

    verifiedGeminiModelsCache.set(cacheKey, orderedVerified);
    writeDiskModelCache(cacheKey, orderedVerified);

    return { models: orderedVerified };
  } catch {
    return {
      models: ['gemini-2.5-flash', 'gemini-2.0-flash'],
    };
  }
}

/**
 * Recovers complete field objects from a partially truncated JSON response
 * so even if an LLM hits max_tokens mid-response, all extracted fields still succeed.
 */
function recoverTruncatedJson(raw: string): Record<string, unknown> | null {
  const docTypeMatch = raw.match(/"document_type"\s*:\s*"([^"]+)"/);
  const vendorMatch = raw.match(/"vendor_or_entity"\s*:\s*"([^"]+)"/);

  const fieldsIdx = raw.indexOf('"fields"');
  const searchRegion = fieldsIdx !== -1 ? raw.slice(fieldsIdx) : raw;
  const arrayStart = searchRegion.indexOf('[');
  if (arrayStart === -1) return null;

  const content = searchRegion.slice(arrayStart + 1);
  const recoveredFields: Record<string, unknown>[] = [];

  let depth = 0;
  let objStart = -1;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (ch === '{') {
      if (depth === 0) objStart = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && objStart !== -1) {
        const candidateObjStr = content.slice(objStart, i + 1);
        try {
          const parsedItem = JSON.parse(candidateObjStr) as Record<string, unknown>;
          if (parsedItem && (parsedItem.key || parsedItem.label || parsedItem.value)) {
            recoveredFields.push(parsedItem);
          }
        } catch {
          // Skip malformed item
        }
        objStart = -1;
      }
    }
  }

  if (recoveredFields.length > 0) {
    return {
      document_type: docTypeMatch?.[1],
      vendor_or_entity: vendorMatch?.[1],
      fields: recoveredFields,
    };
  }

  return null;
}

/**
 * Safely parses JSON from any LLM output (Gemini, OpenAI, Claude, Groq, OpenRouter)
 * even if wrapped in markdown fences, preceded by conversational text, or truncated.
 */
function parseJsonSafely(rawText: string): Record<string, unknown> | null {
  const cleaned = rawText
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) {
      return { fields: parsed };
    }
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, unknown>;
    }
  } catch {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const slice = cleaned.slice(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(slice) as Record<string, unknown>;
      } catch {
        const deComma = slice.replace(/,\s*([}\]])/g, '$1');
        try {
          return JSON.parse(deComma) as Record<string, unknown>;
        } catch {
          // Fall through to truncated JSON recovery
        }
      }
    }
  }

  return recoverTruncatedJson(cleaned);
}

/**
 * Normalizes any valid JSON structure returned by any AI provider into
 * `{ document_type, vendor_or_entity, fields: [...] }`.
 */
function normalizeExtractedPayload(parsedObj: Record<string, unknown>): {
  document_type?: string;
  vendor_or_entity?: string;
  fields: Array<{
    key: string;
    label: string;
    value: unknown;
    category: string;
    confidence: number;
    page_number?: number;
  }>;
} {
  const rawList =
    (Array.isArray(parsedObj.fields) && parsedObj.fields) ||
    (Array.isArray(parsedObj.extracted_fields) && parsedObj.extracted_fields) ||
    (Array.isArray(parsedObj.data) && parsedObj.data) ||
    (Array.isArray(parsedObj.sections) && parsedObj.sections) ||
    null;

  if (rawList && rawList.length > 0) {
    const normalizedFields = rawList.map((item: Record<string, unknown>, idx: number) => {
      const rawPage = item.page_number ?? item.page ?? item.pageNumber;
      const parsedPage =
        typeof rawPage === 'number' && !isNaN(rawPage) && rawPage >= 1
          ? Math.round(rawPage)
          : typeof rawPage === 'string' && /^\d+$/.test(rawPage.trim())
          ? parseInt(rawPage.trim(), 10)
          : undefined;

      return {
        key: String(item.key || item.field_key || item.id || `field_${idx + 1}`),
        label: String(item.label || item.field_label || item.name || item.title || `Field ${idx + 1}`),
        value: item.value ?? item.field_value ?? item.content ?? item.text ?? '',
        category: String(item.category || item.section || 'General Information').trim() || 'General Information',
        confidence: typeof item.confidence === 'number' ? item.confidence : 0.96,
        ...(parsedPage ? { page_number: parsedPage } : {}),
      };
    });
    return {
      document_type: typeof parsedObj.document_type === 'string' ? parsedObj.document_type : undefined,
      vendor_or_entity:
        typeof parsedObj.vendor_or_entity === 'string'
          ? parsedObj.vendor_or_entity
          : typeof parsedObj.vendor_name === 'string'
          ? parsedObj.vendor_name
          : undefined,
      fields: normalizedFields,
    };
  }

  // Fallback if the LLM returned a flat key-value JSON object
  const entries = Object.entries(parsedObj).filter(
    ([k, v]) => k !== 'document_type' && k !== 'vendor_or_entity' && v !== null && v !== undefined
  );
  return {
    document_type: typeof parsedObj.document_type === 'string' ? parsedObj.document_type : undefined,
    vendor_or_entity:
      typeof parsedObj.vendor_or_entity === 'string' ? parsedObj.vendor_or_entity : undefined,
    fields: entries.map(([k, v], idx) => ({
      key: k,
      label: k
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase()),
      value: v,
      category: idx < 2 ? 'Document Overview' : idx === 2 ? 'Key Terms & Compliance' : 'Extracted Details',
      confidence: 0.96,
    })),
  };
}

/**
 * Calls Google Gemini `:generateContent` with `thinkingBudget: 0` (for 2.5 models) and `maxOutputTokens: 8192`
 * so thinking never consumes the JSON output token budget.
 */
async function callGeminiModelOnce(
  apiKey: string,
  modelName: string,
  requestParts: Record<string, unknown>[],
  useThinkingConfig: boolean
): Promise<{
  ok: boolean;
  status: number;
  rawJsonText?: string;
  error?: string;
}> {
  const genUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(
    apiKey
  )}`;

  const generationConfig: Record<string, unknown> = {
    temperature: 0.1,
    maxOutputTokens: 8192,
    responseMimeType: 'application/json',
  };

  if (useThinkingConfig && modelName.includes('2.5')) {
    generationConfig.thinkingConfig = { thinkingBudget: 0 };
  }

  const response = await fetch(genUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: requestParts }],
      generationConfig,
    }),
  });

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}));
    const errMsg =
      errJson?.error?.message || `Model ${modelName} returned HTTP ${response.status}`;
    return { ok: false, status: response.status, error: errMsg };
  }

  const data = await response.json();
  const candidateParts: Array<{ text?: string; thought?: boolean }> =
    data?.candidates?.[0]?.content?.parts || [];

  const nonThoughtTexts = candidateParts
    .filter((p) => !p.thought && typeof p.text === 'string' && p.text.trim().length > 0)
    .map((p) => p.text!.trim());

  const rawJsonText =
    nonThoughtTexts.find((t) => t.includes('{')) ||
    nonThoughtTexts.join('\n') ||
    candidateParts.map((p) => p.text || '').join('\n');

  if (!rawJsonText) {
    return {
      ok: false,
      status: 200,
      error: `Model ${modelName} returned an empty response.`,
    };
  }

  return { ok: true, status: 200, rawJsonText };
}

/**
 * Handles OpenAI, Groq, OpenRouter, and Anthropic Claude extraction on the server side.
 */
async function extractWithNonGeminiProvider(
  provider: Exclude<AiProviderId, 'gemini'>,
  apiKey: string,
  prompt: string,
  mimeType?: string,
  base64Data?: string
): Promise<{
  ok: boolean;
  modelUsed: string;
  parsed?: ReturnType<typeof normalizeExtractedPayload>;
  error?: string;
}> {
  if (provider === 'anthropic') {
    const model = 'claude-3-5-sonnet-latest';
    const userContent: Record<string, unknown>[] = [];
    if (base64Data && mimeType && mimeType.startsWith('image/')) {
      userContent.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: mimeType,
          data: base64Data,
        },
      });
    }
    userContent.push({
      type: 'text',
      text: `${prompt}\n\nIMPORTANT: Respond with ONLY a valid JSON object matching the required schema.`,
    });

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 3072,
        temperature: 0.1,
        messages: [{ role: 'user', content: userContent }],
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const rawText = data?.content?.[0]?.text || '';
      const parsedObj = parseJsonSafely(rawText);
      if (parsedObj) {
        const normalized = normalizeExtractedPayload(parsedObj);
        if (normalized.fields.length > 0) {
          return { ok: true, modelUsed: model, parsed: normalized };
        }
      }
    }

    return { ok: false, modelUsed: model, error: 'Anthropic extraction failed.' };
  }

  // OpenAI, Groq, OpenRouter, or xAI Grok
  const endpoint =
    provider === 'groq'
      ? 'https://api.groq.com/openai/v1/chat/completions'
      : provider === 'openrouter'
      ? 'https://openrouter.ai/api/v1/chat/completions'
      : provider === 'xai'
      ? 'https://api.x.ai/v1/chat/completions'
      : 'https://api.openai.com/v1/chat/completions';

  const model =
    provider === 'groq'
      ? 'llama-3.3-70b-versatile'
      : provider === 'openrouter'
      ? 'google/gemini-2.5-flash'
      : provider === 'xai'
      ? 'grok-2-latest'
      : 'gpt-4o-mini';

  const userContent: Record<string, unknown>[] = [];
  if (
    base64Data &&
    mimeType &&
    mimeType.startsWith('image/') &&
    provider !== 'groq' &&
    provider !== 'xai'
  ) {
    userContent.push({
      type: 'text',
      text: `${prompt}\n\nRespond ONLY with valid JSON.`,
    });
    userContent.push({
      type: 'image_url',
      image_url: { url: `data:${mimeType};base64,${base64Data}` },
    });
  } else {
    userContent.push({
      type: 'text',
      text: `${prompt}\n\nRespond ONLY with valid JSON.`,
    });
  }

  const requestBody: Record<string, unknown> = {
    model,
    temperature: 0.1,
    max_tokens: 3072,
    messages: [
      {
        role: 'system',
        content:
          'You are an enterprise document extraction AI. Always output valid JSON containing {"document_type", "vendor_or_entity", "fields": [...]}.',
      },
      { role: 'user', content: userContent },
    ],
  };

  if (provider === 'openai') {
    requestBody.response_format = { type: 'json_object' };
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (res.ok) {
    const data = await res.json();
    const rawText = data?.choices?.[0]?.message?.content || '';
    if (rawText) {
      const parsedObj = parseJsonSafely(rawText);
      if (parsedObj) {
        const normalized = normalizeExtractedPayload(parsedObj);
        if (normalized.fields.length > 0) {
          return { ok: true, modelUsed: model, parsed: normalized };
        }
      }
    }
  }

  return {
    ok: false,
    modelUsed: model,
    error: `${provider} extraction failed.`,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      action,
      apiKey: rawKey,
      provider: explicitProvider,
      prompt,
      mimeType,
      base64Data,
      parts: explicitParts,
    } = body as {
      action: 'verify' | 'extract' | 'clear_cache';
      apiKey?: string;
      provider?: string;
      prompt?: string;
      mimeType?: string;
      base64Data?: string;
      parts?: Record<string, unknown>[];
    };

    if (action === 'clear_cache') {
      verifiedGeminiModelsCache.clear();
      try {
        if (fs.existsSync(CACHE_FILE_PATH)) {
          fs.unlinkSync(CACHE_FILE_PATH);
        }
      } catch {
        // Ignore unlink errors
      }
      return NextResponse.json({
        ok: true,
        message: 'Server AI model cache cleared.',
      });
    }

    const apiKey = sanitizeUniversalApiKey(rawKey || '');
    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: 'Missing AI API key' },
        { status: 400 }
      );
    }

    const provider = detectProviderOnServer(apiKey, explicitProvider);

    // 1. VERIFY ACTION (Supports Gemini, OpenAI, Anthropic, Groq, OpenRouter, xAI)
    if (action === 'verify') {
      if (provider === 'gemini') {
        const resolved = await resolveVerifiedGeminiModels(apiKey, true);
        if (resolved.models.length === 0 || resolved.error) {
          return NextResponse.json({
            ok: false,
            error: resolved.error || 'Could not verify Gemini API key.',
          });
        }
        return NextResponse.json({
          ok: true,
          provider: 'gemini',
          cleanKey: apiKey,
          model: resolved.models[0],
          modelUsed: resolved.models[0],
          availableModels: resolved.models,
        });
      }

      if (provider === 'openai' || provider === 'groq' || provider === 'xai') {
        const modelsUrl =
          provider === 'groq'
            ? 'https://api.groq.com/openai/v1/models'
            : provider === 'xai'
            ? 'https://api.x.ai/v1/models'
            : 'https://api.openai.com/v1/models';
        const res = await fetch(modelsUrl, {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!res.ok) {
          const label =
            provider === 'groq' ? 'Groq' : provider === 'xai' ? 'xAI Grok' : 'OpenAI';
          return NextResponse.json({
            ok: false,
            error: `${label} API key rejected (HTTP ${res.status})`,
          });
        }
        const defaultModel =
          provider === 'groq'
            ? 'llama-3.3-70b-versatile'
            : provider === 'xai'
            ? 'grok-2-latest'
            : 'gpt-4o-mini';
        return NextResponse.json({
          ok: true,
          provider,
          cleanKey: apiKey,
          model: defaultModel,
          modelUsed: defaultModel,
          availableModels: [defaultModel],
        });
      }

      if (provider === 'openrouter') {
        const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!res.ok) {
          return NextResponse.json({
            ok: false,
            error: `OpenRouter API key rejected (HTTP ${res.status})`,
          });
        }
        return NextResponse.json({
          ok: true,
          provider: 'openrouter',
          cleanKey: apiKey,
          model: 'google/gemini-2.5-flash',
          modelUsed: 'google/gemini-2.5-flash',
          availableModels: ['google/gemini-2.5-flash'],
        });
      }

      if (provider === 'anthropic') {
        const res = await fetch('https://api.anthropic.com/v1/models', {
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
        });
        if (!res.ok) {
          return NextResponse.json({
            ok: false,
            error: `Anthropic API key rejected (HTTP ${res.status})`,
          });
        }
        return NextResponse.json({
          ok: true,
          provider: 'anthropic',
          cleanKey: apiKey,
          model: 'claude-3-5-sonnet-latest',
          modelUsed: 'claude-3-5-sonnet-latest',
          availableModels: ['claude-3-5-sonnet-latest'],
        });
      }
    }

    // 2. EXTRACT ACTION FOR NON-GEMINI PROVIDERS (OpenAI, Anthropic, Groq, OpenRouter, xAI)
    if (provider !== 'gemini') {
      const nonGeminiRes = await extractWithNonGeminiProvider(
        provider,
        apiKey,
        prompt || '',
        mimeType,
        base64Data
      );
      if (nonGeminiRes.ok && nonGeminiRes.parsed) {
        return NextResponse.json({
          ok: true,
          provider,
          model: nonGeminiRes.modelUsed,
          modelUsed: nonGeminiRes.modelUsed,
          parsed: nonGeminiRes.parsed,
          result: nonGeminiRes.parsed,
        });
      }
      return NextResponse.json({
        ok: false,
        provider,
        error: nonGeminiRes.error || 'AI extraction failed.',
      });
    }

    // 3. EXTRACT ACTION FOR GOOGLE GEMINI — With multi-model fallback across verified models
    const resolved = await resolveVerifiedGeminiModels(apiKey, false);
    if (resolved.models.length === 0 || resolved.error) {
      return NextResponse.json({
        ok: false,
        error: resolved.error || 'Invalid Gemini API key.',
      });
    }

    const requestParts: Record<string, unknown>[] =
      Array.isArray(explicitParts) && explicitParts.length > 0
        ? explicitParts
        : [{ text: prompt || '' }];

    if (!explicitParts && base64Data && mimeType) {
      requestParts.push({
        inline_data: {
          mime_type: mimeType,
          data: base64Data,
        },
      });
    }

    let lastError = 'Gemini extraction failed.';
    for (const modelName of resolved.models.slice(0, 3)) {
      const attempt = await callGeminiModelOnce(apiKey, modelName, requestParts, true);

      if (attempt.ok && attempt.rawJsonText) {
        const parsedObj = parseJsonSafely(attempt.rawJsonText);
        if (parsedObj) {
          const normalized = normalizeExtractedPayload(parsedObj);
          if (normalized.fields.length > 0) {
            return NextResponse.json({
              ok: true,
              provider: 'gemini',
              model: modelName,
              modelUsed: modelName,
              parsed: normalized,
              result: normalized,
            });
          }
        }
      }
      if (attempt.error) {
        lastError = attempt.error;
      }
    }

    return NextResponse.json({
      ok: false,
      error: lastError,
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: err instanceof Error ? err.message : 'Unexpected server error',
    });
  }
}
