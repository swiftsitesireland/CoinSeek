import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';

async function imageToBase64(uri) {
  return FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
}

function validateCoin(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid coin response');
  const str  = (v, fallback = '') => (typeof v === 'string' ? v.slice(0, 500) : fallback);
  const num  = (v, fallback = 0)  => (Number.isFinite(Number(v)) ? Number(v) : fallback);
  return {
    name:        str(raw.name,        'Unknown Coin'),
    country:     str(raw.country,     'Unknown'),
    year:        num(raw.year,        0),
    denomination:str(raw.denomination,''),
    composition: str(raw.composition, ''),
    mintMark:    str(raw.mintMark,    ''),
    weight:      str(raw.weight,      ''),
    diameter:    str(raw.diameter,    ''),
    rarity:      str(raw.rarity,      'common'),
    condition:   str(raw.condition,   ''),
    confidence:  num(raw.confidence,  0),
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

    if (error) throw new Error(error.message || 'Edge function error');
    if (!data?.coin) throw new Error('No coin data returned');

    const validated = validateCoin(data.coin);
    const coin = {
      id: `ai_${crypto.randomUUID()}`,
      imageUrl: null,
      ...validated,
    };

    return {
      coin,
      confidence: validated.confidence || 85,
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
