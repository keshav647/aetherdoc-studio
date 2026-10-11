import { ByokConfig } from './types';

export interface DetectedAiProvider {
  id: 'gemini' | 'openai' | 'anthropic' | 'groq' | 'openrouter' | 'xai' | 'local';
  name: string;
  shortLabel: string;
  model: string;
  badgeColor: string;
}

// Cache verified Gemini model per API key prefix so we only query once
const verifiedGeminiModelsCache = new Map<string, string[]>();

/**
 * Sanitizes any pasted API key:
 * - If the user pasted a Gemini key (`AIzaSy...`) into an input that already contained text
 *   (concatenating two keys), extracts the last valid `AIza[0-9A-Za-z_-]{33,42}` token.
 * - Strips accidental quotes, `Bearer `, or whitespace.
 */
export function sanitizeAndExtractApiKey(rawKey?: string): string {
  const trimmed = (rawKey || '')
    .trim()
    .replace(/^['"]+|['"]+$/g, '')
    .replace(/^Bearer\s+/i, '')
    .trim();

  if (!trimmed) return '';

  // If a Google Gemini key (AIza...) appears anywhere in the string, extract the latest valid token
  const geminiMatches = trimmed.match(/AIza[0-9A-Za-z_-]{33,42}/g);
  if (geminiMatches && geminiMatches.length > 0) {
    return geminiMatches[geminiMatches.length - 1];
  }

  return trimmed.replace(/\s+/g, '');
}

/**
 * Queries our server-side `/api/gemini` endpoint to discover and verify the exact
 * Gemini model enabled for this API key.
 */
export async function discoverAvailableGeminiModels(apiKey: string): Promise<string[]> {
  const cleanKey = sanitizeAndExtractApiKey(apiKey);
  if (!cleanKey) return [];

  const cacheKey = cleanKey.slice(0, 16);
  if (verifiedGeminiModelsCache.has(cacheKey)) {
    return verifiedGeminiModelsCache.get(cacheKey)!;
  }

  try {
    const res = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'verify',
        apiKey: cleanKey,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.ok && data.model) {
        const list =
          Array.isArray(data.availableModels) && data.availableModels.length > 0
            ? [data.model, ...data.availableModels.filter((m: string) => m !== data.model)]
            : [data.model];
        verifiedGeminiModelsCache.set(cacheKey, list);
        return list;
      }
    }
  } catch {
    // Fall through
  }

  return ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest'];
}

/**
 * Automatically detects the AI provider from the API key format.
 * Supports Google Gemini (AIza...), OpenAI (sk-...), Anthropic Claude (sk-ant-...),
 * Groq LPU (gsk_...), OpenRouter (sk-or-...), and xAI Grok (xai-...).
 */
export function detectAiProviderFromKey(rawKey?: string): DetectedAiProvider {
  const key = sanitizeAndExtractApiKey(rawKey);
  if (!key) {
    return {
      id: 'local',
      name: 'Local Document Engine',
      shortLabel: 'Local Scan',
      model: 'PDF.js + Structural Section Parser',
      badgeColor: 'text-slate-300 border-white/15 bg-white/[0.04]',
    };
  }

  if (key.startsWith('sk-ant-')) {
    return {
      id: 'anthropic',
      name: 'Anthropic Claude',
      shortLabel: 'Claude AI',
      model: 'claude-3-5-sonnet-latest',
      badgeColor: 'text-amber-300 border-amber-400/35 bg-amber-500/15',
    };
  }

  if (key.startsWith('gsk_')) {
    return {
      id: 'groq',
      name: 'Groq Cloud LPU',
      shortLabel: 'Groq AI',
      model: 'llama-3.3-70b-versatile',
      badgeColor: 'text-sky-300 border-sky-400/35 bg-sky-500/15',
    };
  }

  if (key.startsWith('sk-or-')) {
    return {
      id: 'openrouter',
      name: 'OpenRouter Universal',
      shortLabel: 'OpenRouter',
      model: 'google/gemini-2.5-flash',
      badgeColor: 'text-purple-300 border-purple-400/35 bg-purple-500/15',
    };
  }

  if (key.startsWith('xai-')) {
    return {
      id: 'xai',
      name: 'xAI Grok',
      shortLabel: 'xAI Grok',
      model: 'grok-2-latest',
      badgeColor: 'text-indigo-300 border-indigo-400/35 bg-indigo-500/15',
    };
  }

  if (key.startsWith('sk-')) {
    return {
      id: 'openai',
      name: 'OpenAI',
      shortLabel: 'OpenAI GPT-4o',
      model: 'gpt-4o-mini',
      badgeColor: 'text-emerald-300 border-emerald-400/35 bg-emerald-500/15',
    };
  }

  // Default & explicit `AIza...` keys -> Google Gemini
  const cached = verifiedGeminiModelsCache.get(key.slice(0, 16));
  return {
    id: 'gemini',
    name: 'Google Gemini',
    shortLabel: 'Google Gemini',
    model: cached?.[0] || 'gemini-2.5-flash',
    badgeColor: 'text-emerald-300 border-emerald-400/35 bg-emerald-500/15',
  };
}

export function getActiveKeyFromConfig(byokConfig: ByokConfig): string {
  const candidates = [
    byokConfig.llmApiKey,
    byokConfig.geminiApiKey,
    byokConfig.openaiApiKey,
  ]
    .map((k) => sanitizeAndExtractApiKey(k))
    .filter(Boolean);

  return candidates[0] || '';
}
