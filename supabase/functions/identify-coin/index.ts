import { createClient } from 'npm:@supabase/supabase-js@2';
import { checkRateLimit, rateLimitResponse } from '../_shared/rateLimiter.ts';
import {
  readBodyWithLimit, safeParseJson, badRequest,
  payloadTooLarge, internalError, buildCorsHeaders,
} from '../_shared/validate.ts';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

// VULN-04: 10 MB limit — two base64 images won't exceed this; prevents oversized blobs
const IMAGE_BODY_LIMIT = 10_485_760;

const PROMPT = `You are an expert numismatist. Analyze these coin images (front and back if provided).

Return ONLY valid JSON with NO markdown, no code block, no extra text:
{
  "name": "Full official coin name",
  "country": "Country of origin",
  "year": number (negative for BC, e.g. -27 for 27 BC),
  "denomination": "Face value string (e.g. $1, 10¢, 1 Franc)",
  "composition": "Metal composition (e.g. 90% Silver, 10% Copper)",
  "weight": "Weight with unit (e.g. 26.73g)",
  "diameter": "Diameter with unit (e.g. 38.1mm)",
  "mintMark": "Mint mark letter if visible or empty string",
  "mint": "Full mint name",
  "mintCount": number or null,
  "rarity": "one of exactly: common, uncommon, rare, very rare, legendary",
  "condition": "Grade estimate (e.g. VF-30, MS-63, Good-4)",
  "estimatedValue": { "low": number, "mid": number, "high": number },
  "description": "2-3 sentence historical description of this coin",
  "obverse": "Description of the front/obverse design",
  "reverse": "Description of the back/reverse design",
  "designer": "Designer name or Unknown",
  "series": "Series or collection name",
  "tags": ["relevant", "keyword", "tags"],
  "confidence": number between 0 and 100
}`;

const ALLOWED_RARITY = new Set(['common', 'uncommon', 'rare', 'very rare', 'legendary']);

// VULN-15 / M2: don't trust the base64 prefix alone — decode the leading bytes
// and confirm the real JPEG/PNG magic numbers, that the string is genuinely
// base64, and that it's large enough to plausibly be an image. This stops a
// crafted "/9j/<garbage>" string from passing validation and reaching Gemini.
const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;
const MIN_IMAGE_B64_LEN = 512;   // ~384 raw bytes — smaller than any real photo
const JPEG_MAGIC = [0xff, 0xd8, 0xff];
const PNG_MAGIC  = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function isValidImageBase64(b64: string): boolean {
  if (typeof b64 !== 'string' || b64.length < MIN_IMAGE_B64_LEN) return false;
  if (!BASE64_RE.test(b64)) return false;

  // Decode just the first 12 base64 chars (→ 9 bytes) — enough for any magic number.
  let head: Uint8Array;
  try {
    const bin = atob(b64.slice(0, 12));
    head = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch {
    return false;
  }

  const startsWith = (magic: number[]) => magic.every((b, i) => head[i] === b);
  return startsWith(JPEG_MAGIC) || startsWith(PNG_MAGIC);
}

function validateCoin(raw: unknown): Record<string, unknown> {
  if (typeof raw !== 'object' || raw === null) throw new Error('Response is not an object');
  const c = raw as Record<string, unknown>;

  const str  = (v: unknown, max: number) => typeof v === 'string' && v.length <= max ? String(v) : '';
  const num  = (v: unknown, min: number, max: number) => typeof v === 'number' && v >= min && v <= max ? v : 0;
  const numN = (v: unknown) => (typeof v === 'number' && isFinite(v)) ? v : null;

  const valRaw = c.estimatedValue as Record<string, unknown> | undefined ?? {};
  const estimatedValue = {
    low:  Math.max(0, Math.min(10_000_000, num(valRaw.low,  0, 10_000_000))),
    mid:  Math.max(0, Math.min(10_000_000, num(valRaw.mid,  0, 10_000_000))),
    high: Math.max(0, Math.min(10_000_000, num(valRaw.high, 0, 10_000_000))),
  };

  const rarity = ALLOWED_RARITY.has(String(c.rarity)) ? String(c.rarity) : 'common';

  const tags = Array.isArray(c.tags)
    ? (c.tags as unknown[]).slice(0, 20).map(t => str(t, 50)).filter(Boolean)
    : [];

  return {
    name:         str(c.name, 150)        || 'Unknown Coin',
    country:      str(c.country, 100),
    year:         num(c.year, -5000, 2100),
    denomination: str(c.denomination, 50),
    composition:  str(c.composition, 100),
    weight:       str(c.weight, 30),
    diameter:     str(c.diameter, 30),
    mintMark:     str(c.mintMark, 10),
    mint:         str(c.mint, 100),
    mintCount:    numN(c.mintCount),
    rarity,
    condition:    str(c.condition, 50),
    estimatedValue,
    description:  str(c.description, 600),
    obverse:      str(c.obverse, 300),
    reverse:      str(c.reverse, 300),
    designer:     str(c.designer, 100),
    series:       str(c.series, 100),
    tags,
    confidence:   Math.max(0, Math.min(100, num(c.confidence, 0, 100))),
  };
}

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── Auth ─────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }

    // ── Rate limit: 10 scans per 15 minutes per user ──────────────────────────
    const { allowed, remaining, resetInSeconds } = await checkRateLimit(
      adminClient,
      `identify-coin:${user.id}`,
      10,
      15,
    );

    if (!allowed) return rateLimitResponse(resetInSeconds);

    // ── VULN-04: Body size limit ───────────────────────────────────────────────
    const { body: rawBody, error: sizeError } = await readBodyWithLimit(req, IMAGE_BODY_LIMIT);
    if (sizeError) return sizeError;

    const { data: payload, error: jsonError } = safeParseJson(rawBody, req);
    if (jsonError) return jsonError;

    const frontBase64 = payload.frontBase64;
    const backBase64  = payload.backBase64;

    if (!frontBase64 || typeof frontBase64 !== 'string') {
      return badRequest('frontBase64 is required', req);
    }

    // ── VULN-15: Validate base64 encodes a real image (JPEG or PNG) ───────────
    if (!isValidImageBase64(frontBase64)) {
      return badRequest('frontBase64 must be a JPEG or PNG image.', req);
    }
    if (backBase64 && typeof backBase64 === 'string' && !isValidImageBase64(backBase64)) {
      return badRequest('backBase64 must be a JPEG or PNG image.', req);
    }

    // ── VULN-02: Server-side daily scan limit ─────────────────────────────────
    const { data: scanData, error: scanError } = await adminClient.rpc(
      'check_and_increment_daily_scan',
      { p_user_id: user.id },
    );

    if (scanError) {
      console.error('[identify-coin] scan RPC error:', scanError.message);
      return internalError(req);
    }

    if (!scanData?.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Daily scan limit reached. Upgrade to Premium for unlimited scans.',
          scansRemaining: 0,
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── Build Gemini request ──────────────────────────────────────────────────
    const parts: unknown[] = [
      { text: PROMPT },
      { inline_data: { mime_type: 'image/jpeg', data: frontBase64 } },
    ];
    if (backBase64 && typeof backBase64 === 'string') {
      parts.push({ inline_data: { mime_type: 'image/jpeg', data: backBase64 } });
    }

    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiKey) {
      console.error('[identify-coin] GEMINI_API_KEY not set');
      return internalError(req);
    }

    // ── H1: Global daily circuit breaker ──────────────────────────────────────
    // Caps TOTAL Gemini calls across ALL users per day so a flood of throwaway
    // accounts (the per-user limit resets per account) cannot run up an unbounded
    // API bill. Checked here — after auth, validation and the per-user scan limit
    // all pass — so only requests genuinely about to cost money increment the
    // counter; malformed requests can't be used to exhaust the cap.
    // Set GLOBAL_DAILY_SCAN_CAP comfortably above expected legitimate traffic;
    // if it's ever hit, that's an alarm worth a billing alert. Trade-off: a
    // determined attacker can exhaust it to lock out real users — bounding cost
    // is the deliberate priority for a small app.
    const GLOBAL_DAILY_SCAN_CAP = Number(Deno.env.get('GLOBAL_DAILY_SCAN_CAP') ?? '2000');
    const globalLimit = await checkRateLimit(
      adminClient,
      'identify-coin:global',
      GLOBAL_DAILY_SCAN_CAP,
      1440, // 24-hour window
    );
    if (!globalLimit.allowed) {
      console.error('[identify-coin] GLOBAL daily scan cap reached — possible abuse');
      return rateLimitResponse(globalLimit.resetInSeconds);
    }

    const geminiRes = await fetch(`${GEMINI_URL}?key=${geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
      }),
    });

    if (!geminiRes.ok) {
      console.error('[identify-coin] Gemini error:', geminiRes.status);
      return internalError(req);
    }

    const geminiData = await geminiRes.json();
    const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.error('[identify-coin] Empty response from Gemini');
      return internalError(req);
    }

    // ── Validate response before returning to client ──────────────────────────
    const jsonText = text.replace(/```json\n?|\n?```|```/g, '').trim();
    const rawCoin  = JSON.parse(jsonText);
    const coin     = validateCoin(rawCoin);

    return new Response(
      JSON.stringify({ coin, scansRemaining: scanData.scans_remaining ?? Math.max(0, remaining - 1) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    // VULN-06: never leak internal error messages
    console.error('[identify-coin] unhandled error:', err);
    return internalError(req);
  }
});
