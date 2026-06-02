import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';

// supabase.functions.invoke() collapses every non-2xx into the opaque message
// "Edge Function returned a non-2xx status code". The real status and JSON body
// live on error.context (a Response). Extract them so callers can tell a 429
// scan-limit from a 400/500, and so failures are actually diagnosable.
//
// We duck-type on error.context rather than `instanceof FunctionsHttpError`:
// bundling can produce duplicate @supabase/supabase-js copies, so instanceof
// against our imported class is unreliable.
async function describeFunctionError(error) {
  const ctx = error?.context;
  if (ctx && typeof ctx.status === 'number') {
    const status = ctx.status;
    let detail = '';
    try {
      const body = await ctx.clone().json();
      detail = body?.error || JSON.stringify(body);
    } catch {
      try { detail = await ctx.clone().text(); } catch { /* ignore */ }
    }
    const e = new Error(`[${status}] ${detail || error.message}`);
    e.status = status;
    return e;
  }
  return new Error(error?.message || 'Edge function error');
}

async function imageToBase64(uri) {
  return FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
}

function validateCoin(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid coin response');
  const str  = (v, fallback = '') => (typeof v === 'string' ? v.slice(0, 600) : fallback);
  const num  = (v, fallback = 0)  => (Number.isFinite(Number(v)) ? Number(v) : fallback);
  const numN = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);
  const tags = Array.isArray(raw.tags)
    ? raw.tags.slice(0, 20).map(t => (typeof t === 'string' ? t.slice(0, 50) : '')).filter(Boolean)
    : [];
  return {
    name:        str(raw.name,        'Unknown Coin'),
    country:     str(raw.country,     'Unknown'),
    year:        num(raw.year,        0),
    denomination:str(raw.denomination,''),
    composition: str(raw.composition, ''),
    mintMark:    str(raw.mintMark,    ''),
    mint:        str(raw.mint,        ''),
    weight:      str(raw.weight,      ''),
    diameter:    str(raw.diameter,    ''),
    rarity:      str(raw.rarity,      'common'),
    condition:   str(raw.condition,   ''),
    confidence:  num(raw.confidence,  0),
    mintCount:   numN(raw.mintCount),
    description: str(raw.description, ''),
    obverse:     str(raw.obverse,     ''),
    reverse:     str(raw.reverse,     ''),
    designer:    str(raw.designer,    ''),
    series:      str(raw.series,      ''),
    tags,
    estimatedValue: {
      low:  num(raw.estimatedValue?.low,  0),
      mid:  num(raw.estimatedValue?.mid,  0),
      high: num(raw.estimatedValue?.high, 0),
    },
  };
}

export async function identifyCoin(frontUri, backUri) {
  try {
    const frontBase64 = await imageToBase64(frontUri);
    const backBase64  = backUri ? await imageToBase64(backUri) : null;

    const { data, error } = await supabase.functions.invoke('identify-coin', {
      body: { frontBase64, ...(backBase64 ? { backBase64 } : {}) },
    });

    if (error) throw await describeFunctionError(error);
    if (!data?.coin) throw new Error('No coin data returned');

    const validated = validateCoin(data.coin);
    const coin = {
      // React Native (Hermes) has no global `crypto`, so crypto.randomUUID()
      // throws. This id is only a local history key, not security-sensitive, so
      // a timestamp + random suffix is sufficient and dependency-free.
      id: `ai_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`,
      imageUrl: null,
      ...validated,
    };

    return {
      coin,
      confidence: validated.confidence || 85,
      scansRemaining: typeof data.scansRemaining === 'number' ? data.scansRemaining : null,
      analysisDetails: {
        edgeDetection: 'Coin outline analyzed by Gemini Vision',
        surfaceAnalysis: `Condition estimated: ${coin.condition}`,
        inscriptionMatch: `${coin.name} identified`,
        metalDetection: (coin.composition || '').split(',')[0],
        sizeEstimate: coin.diameter || 'unknown',
      },
      alternativeMatches: [],
    };
  } catch (err) {
    // VULN-10: never silently fall back to mock data — that would hide real errors
    // and let users believe they are getting AI results when they are not.
    logger.error('[coinIdentification] identify failed:', err.message);
    throw err;
  }
}

export async function getCoinValueTrends(_coinId) {
  // Real market data requires a paid numismatic price API.
  // Returning null prevents fabricated charts being shown to paying users.
  return null;
}

export async function assessPhotoQuality(_imageUri) {
  // Client-side pixel analysis is not yet implemented.
  // Return a neutral "ready" state so users are not misled by a random score.
  return {
    score: null,
    rating: 'ready',
    issues: [],
    suggestions: ['Place coin on a dark background', 'Hold camera 6–8 inches from coin'],
  };
}
