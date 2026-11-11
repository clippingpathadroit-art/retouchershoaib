/**
 * RETOUCHER SHOAIB® — CLOUDFLARE R2 HYBRID DELIVERY & AUTHENTICATION API
 * Cloudflare Pages Function route: /api/r2
 *
 * Security guarantees:
 * - Zero R2 credentials ever leave server environment (env secrets only).
 * - Admin actions require a Google-verified Director JWT exchanged for an HMAC-signed admin token.
 * - Client downloads require a verified client session token and server-side order ownership check.
 * - All large files transfer directly between browser and private R2 bucket via SigV4 Presigned URLs.
 */

const GOOGLE_CLIENT_ID = '197596089864-pu2l1snp7t1mkev70tjadr1n3g420fmv.apps.googleusercontent.com';
const AUTHORIZED_DIRECTOR_EMAIL = 'retouchershoaib@gmail.com';
const GAS_DB_URL = 'https://script.google.com/macros/s/AKfycbyFQyV8BmfMGWDd3rv3I-chTT6iIn7TH5GqCev_0_SHHOmueYZznGPCiOcO5Q7AA5QHhg/exec';

// Cloudflare R2 bills storage in decimal Gigabytes (1 GB = 1,000,000,000 bytes)
const FREE_TIER_BYTES = 10 * 1000 * 1000 * 1000;
const SAFETY_LIMIT_BYTES = 9.95 * 1000 * 1000 * 1000;
const MAX_SINGLE_OBJECT_BYTES = 20 * 1000 * 1000 * 1000; // 20 GB safety bound

let cachedGoogleJwks = null;
let cachedGoogleJwksExpiresAt = 0;

function getAllowedCorsOrigin(request) {
  const origin = request.headers.get('Origin') || '';
  if (!origin) return 'https://retouchershoaib.com';
  if (
    origin === 'https://retouchershoaib.com' ||
    origin === 'https://www.retouchershoaib.com' ||
    /^https:\/\/[a-z0-9-]+\.retouchershoaib\.pages\.dev$/i.test(origin) ||
    /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)
  ) {
    return origin;
  }
  return 'https://retouchershoaib.com';
}

function jsonResponse(payload, status = 200, request = null) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
    'X-Content-Type-Options': 'nosniff',
  };
  if (request) {
    headers['Access-Control-Allow-Origin'] = getAllowedCorsOrigin(request);
    headers['Vary'] = 'Origin';
  }
  return new Response(JSON.stringify(payload), { status, headers });
}

export function normalizeOrderId(raw) {
  if (!raw) return '';
  let str = String(raw).trim().replace(/#?RS-?2026-?/gi, '').replace(/#?RS-?/gi, '').replace(/#/g, '');
  if (str.indexOf('2026') === 0 && str.length > 5) {
    str = str.substring(4);
  }
  return str.replace(/[^0-9]/g, '');
}

export function sanitizeFileName(rawName, fallback = 'RetoucherShoaib_Deliverables.zip') {
  const base = String(rawName || '').split(/[\\/]/).pop() || '';
  const cleaned = base
    .replace(/["'<>|:*?\\\x00-\x1F]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^\.+/, '')
    .trim();
  if (!cleaned) return fallback;
  return cleaned.slice(0, 140);
}

// ========================================================
// CRYPTO & UTF-8 HELPERS (PURE WEBCRYPTO)
// ========================================================
const te = new TextEncoder();

function toHex(buffer) {
  const bytes = new Uint8Array(buffer);
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, '0');
  }
  return out;
}

function base64UrlEncode(input) {
  const bytes = typeof input === 'string' ? te.encode(input) : new Uint8Array(input);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecodeToBytes(b64u) {
  let b64 = String(b64u || '').replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4 !== 0) b64 += '=';
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

function base64UrlDecodeToString(b64u) {
  return new TextDecoder().decode(base64UrlDecodeToBytes(b64u));
}

async function sha256Hex(data) {
  const bytes = typeof data === 'string' ? te.encode(data) : new Uint8Array(data);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return toHex(digest);
}

async function hmacSha256Raw(keyBytes, message) {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    typeof keyBytes === 'string' ? te.encode(keyBytes) : keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return await crypto.subtle.sign('HMAC', cryptoKey, te.encode(message));
}

// ========================================================
// AWS SIGV4 SIGNING & PRESIGNED URL GENERATOR (CLOUDFLARE R2)
// ========================================================
export function encodeRfc3986(str) {
  return encodeURIComponent(String(str)).replace(/[!'()*]/g, (c) =>
    '%' + c.charCodeAt(0).toString(16).toUpperCase()
  );
}

export function encodeS3Key(key) {
  return String(key)
    .split('/')
    .filter((seg) => seg.length > 0)
    .map((seg) => encodeRfc3986(seg))
    .join('/');
}

function formatAmzDates(date = new Date()) {
  const iso = date.toISOString().replace(/[:-]|\.\d{3}/g, '');
  return {
    amzDate: iso,            // YYYYMMDDTHHMMSSZ
    dateStamp: iso.slice(0, 8), // YYYYMMDD
  };
}

async function deriveSigningKey(secretAccessKey, dateStamp, region = 'auto', service = 's3') {
  const kDate = await hmacSha256Raw('AWS4' + secretAccessKey, dateStamp);
  const kRegion = await hmacSha256Raw(kDate, region);
  const kService = await hmacSha256Raw(kRegion, service);
  return await hmacSha256Raw(kService, 'aws4_request');
}

function buildCanonicalQueryString(pairs) {
  const encoded = pairs.map(([k, v]) => [encodeRfc3986(k), encodeRfc3986(v)]);
  encoded.sort((a, b) => (a[0] === b[0] ? (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0) : a[0] < b[0] ? -1 : 1));
  return encoded.map(([k, v]) => `${k}=${v}`).join('&');
}

export async function generatePresignedR2Url({
  accountId,
  bucket,
  accessKeyId,
  secretAccessKey,
  key,
  method = 'GET',
  expiresIn = 3600,
  extraQuery = {},
  now = new Date(),
}) {
  const host = `${accountId}.r2.cloudflarestorage.com`;
  const { amzDate, dateStamp } = formatAmzDates(now);
  const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
  const canonicalUri = `/${encodeRfc3986(bucket)}/${encodeS3Key(key)}`;

  const queryPairs = [
    ['X-Amz-Algorithm', 'AWS4-HMAC-SHA256'],
    ['X-Amz-Credential', `${accessKeyId}/${credentialScope}`],
    ['X-Amz-Date', amzDate],
    ['X-Amz-Expires', String(expiresIn)],
    ['X-Amz-SignedHeaders', 'host'],
  ];

  Object.entries(extraQuery || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null) {
      queryPairs.push([k, String(v)]);
    }
  });

  const canonicalQuery = buildCanonicalQueryString(queryPairs);
  const canonicalHeaders = `host:${host}\n`;
  const signedHeaders = 'host';
  const payloadHash = 'UNSIGNED-PAYLOAD';

  const canonicalRequest = [
    method.toUpperCase(),
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join('\n');

  const signingKey = await deriveSigningKey(secretAccessKey, dateStamp, 'auto', 's3');
  const signature = toHex(await hmacSha256Raw(signingKey, stringToSign));

  return `https://${host}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

export async function buildSignedS3Request({
  accountId,
  bucket,
  accessKeyId,
  secretAccessKey,
  key = '',
  method = 'GET',
  query = {},
  body = '',
  contentType = '',
  now = new Date(),
}) {
  const host = `${accountId}.r2.cloudflarestorage.com`;
  const { amzDate, dateStamp } = formatAmzDates(now);
  const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
  const encodedKey = encodeS3Key(key);
  const canonicalUri = encodedKey ? `/${encodeRfc3986(bucket)}/${encodedKey}` : `/${encodeRfc3986(bucket)}`;

  const queryPairs = [];
  Object.entries(query || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null) {
      queryPairs.push([k, String(v)]);
    }
  });
  const canonicalQuery = buildCanonicalQueryString(queryPairs);
  const bodyStr = typeof body === 'string' ? body : '';
  const payloadHash = await sha256Hex(bodyStr);

  const headerMap = {
    host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
  };
  if (contentType) {
    headerMap['content-type'] = contentType;
  }

  const sortedHeaderKeys = Object.keys(headerMap).sort();
  const canonicalHeaders = sortedHeaderKeys.map((k) => `${k}:${headerMap[k]}\n`).join('');
  const signedHeaders = sortedHeaderKeys.join(';');

  const canonicalRequest = [
    method.toUpperCase(),
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join('\n');

  const signingKey = await deriveSigningKey(secretAccessKey, dateStamp, 'auto', 's3');
  const signature = toHex(await hmacSha256Raw(signingKey, stringToSign));

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const url = `https://${host}${canonicalUri}${canonicalQuery ? '?' + canonicalQuery : ''}`;
  const reqHeaders = {
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
    Authorization: authorization,
  };
  if (contentType) {
    reqHeaders['Content-Type'] = contentType;
  }

  return {
    url,
    init: {
      method: method.toUpperCase(),
      headers: reqHeaders,
      body: method.toUpperCase() === 'GET' || method.toUpperCase() === 'HEAD' || method.toUpperCase() === 'DELETE' ? undefined : bodyStr || undefined,
    },
  };
}

async function signedR2Fetch(cfg, params) {
  const { url, init } = await buildSignedS3Request({
    accountId: cfg.accountId,
    bucket: cfg.bucket,
    accessKeyId: cfg.accessKeyId,
    secretAccessKey: cfg.secretAccessKey,
    ...params,
  });
  return await fetch(url, init);
}

// ========================================================
// XML HELPERS (FOR S3 LIST / MULTIPART RESPONSES)
// ========================================================
export function decodeXml(str) {
  return String(str || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

export function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function extractTag(xml, tagName) {
  const m = String(xml || '').match(new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)</${tagName}>`, 'i'));
  return m ? decodeXml(m[1].trim()) : '';
}

export function extractBlocks(xml, blockTag) {
  const matches = [];
  const re = new RegExp(`<${blockTag}(?:\\s[^>]*)?>([\\s\\S]*?)</${blockTag}>`, 'gi');
  let m;
  while ((m = re.exec(String(xml || ''))) !== null) {
    matches.push(m[1]);
  }
  return matches;
}

// ========================================================
// AUTHENTICATION: GOOGLE OAUTH ID TOKEN + HMAC SESSION TOKENS
// ========================================================
async function getGoogleCerts() {
  const now = Date.now();
  if (cachedGoogleJwks && now < cachedGoogleJwksExpiresAt) {
    return cachedGoogleJwks;
  }
  const res = await fetch('https://www.googleapis.com/oauth2/v3/certs');
  if (!res.ok) throw new Error('Unable to fetch Google public certificates');
  const cc = res.headers.get('cache-control') || '';
  const maxAgeMatch = cc.match(/max-age=(\d+)/i);
  const ttlMs = maxAgeMatch ? Math.max(60, parseInt(maxAgeMatch[1], 10)) * 1000 : 3600 * 1000;
  const data = await res.json();
  cachedGoogleJwks = Array.isArray(data.keys) ? data.keys : [];
  cachedGoogleJwksExpiresAt = now + ttlMs;
  return cachedGoogleJwks;
}

async function verifyGoogleIdToken(idToken) {
  const parts = String(idToken || '').trim().split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed Google credential token');
  }
  const [headerB64, payloadB64, sigB64] = parts;
  const header = JSON.parse(base64UrlDecodeToString(headerB64));
  const payload = JSON.parse(base64UrlDecodeToString(payloadB64));

  if (header.alg !== 'RS256' || !header.kid) {
    throw new Error('Unsupported Google token algorithm');
  }

  let keys = await getGoogleCerts();
  let jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) {
    cachedGoogleJwksExpiresAt = 0;
    keys = await getGoogleCerts();
    jwk = keys.find((k) => k.kid === header.kid);
  }
  if (!jwk) {
    throw new Error('Google signing certificate not found');
  }

  const key = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );

  const validSig = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    base64UrlDecodeToBytes(sigB64),
    te.encode(`${headerB64}.${payloadB64}`)
  );

  if (!validSig) {
    throw new Error('Invalid Google ID token signature');
  }

  if (payload.aud !== GOOGLE_CLIENT_ID) {
    throw new Error('Token audience mismatch');
  }
  if (payload.iss !== 'https://accounts.google.com' && payload.iss !== 'accounts.google.com') {
    throw new Error('Invalid Google token issuer');
  }
  const nowSec = Math.floor(Date.now() / 1000);
  if (!payload.exp || Number(payload.exp) < nowSec - 60) {
    throw new Error('Google credential expired — please sign in again');
  }
  if (!payload.email || payload.email_verified !== true) {
    throw new Error('Google email not verified');
  }

  return {
    email: String(payload.email).toLowerCase().trim(),
    name: payload.name || '',
  };
}

export async function issueSessionToken(secret, { sub, role, ttlSeconds }) {
  const nowSec = Math.floor(Date.now() / 1000);
  const claims = {
    sub: String(sub).toLowerCase().trim(),
    role: role === 'admin' ? 'admin' : 'client',
    iat: nowSec,
    exp: nowSec + ttlSeconds,
  };
  const payloadB64 = base64UrlEncode(JSON.stringify(claims));
  const hmacKey = await crypto.subtle.importKey(
    'raw',
    te.encode(String(secret)),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', hmacKey, te.encode(payloadB64));
  return `${payloadB64}.${base64UrlEncode(sig)}`;
}

export async function verifySessionToken(secret, token, nowSec = Math.floor(Date.now() / 1000)) {
  if (!secret) throw new Error('AUTH_SECRET is not configured');
  const raw = String(token || '').trim();
  const dot = raw.indexOf('.');
  if (dot <= 0) throw new Error('Invalid session token');

  const payloadB64 = raw.slice(0, dot);
  const sigB64 = raw.slice(dot + 1);
  if (!payloadB64 || !sigB64) throw new Error('Invalid session token format');

  const hmacKey = await crypto.subtle.importKey(
    'raw',
    te.encode(String(secret)),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );
  const ok = await crypto.subtle.verify(
    'HMAC',
    hmacKey,
    base64UrlDecodeToBytes(sigB64),
    te.encode(payloadB64)
  );
  if (!ok) throw new Error('Session token signature invalid');

  const claims = JSON.parse(base64UrlDecodeToString(payloadB64));
  if (!claims.exp || Number(claims.exp) < nowSec) {
    throw new Error('Session expired — please re-authenticate');
  }
  if (!claims.sub) throw new Error('Token missing subject');
  return claims;
}

function getBearerToken(request) {
  const auth = request.headers.get('Authorization') || '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : '';
}

async function requireAdmin(request, env) {
  const token = getBearerToken(request);
  if (!token) throw Object.assign(new Error('Director authorization token required'), { status: 401 });
  const claims = await verifySessionToken(env.AUTH_SECRET, token);
  if (claims.role !== 'admin' || claims.sub !== AUTHORIZED_DIRECTOR_EMAIL) {
    throw Object.assign(new Error('Forbidden: Studio Director privilege required'), { status: 403 });
  }
  return claims;
}

async function requireAuthenticatedUser(request, env) {
  const token = getBearerToken(request);
  if (!token) throw Object.assign(new Error('Authentication required'), { status: 401 });
  return await verifySessionToken(env.AUTH_SECRET, token);
}

// ========================================================
// R2 INVENTORY & STUDIO DATABASE HELPERS
// ========================================================
function getR2Config(env) {
  const accountId = String(env.R2_ACCOUNT_ID || '').trim();
  const bucket = String(env.R2_BUCKET_NAME || '').trim();
  const accessKeyId = String(env.R2_ACCESS_KEY_ID || '').trim();
  const secretAccessKey = String(env.R2_SECRET_ACCESS_KEY || '').trim();
  const authSecret = String(env.AUTH_SECRET || '').trim();
  const missing = [];
  if (!accountId) missing.push('R2_ACCOUNT_ID');
  if (!bucket) missing.push('R2_BUCKET_NAME');
  if (!accessKeyId) missing.push('R2_ACCESS_KEY_ID');
  if (!secretAccessKey) missing.push('R2_SECRET_ACCESS_KEY');
  if (!authSecret) missing.push('AUTH_SECRET');
  return { accountId, bucket, accessKeyId, secretAccessKey, authSecret, missing, configured: missing.length === 0 };
}

async function listBucketInventory(cfg) {
  const objects = [];
  let totalBytes = 0;
  let continuationToken = '';

  for (let page = 0; page < 20; page++) {
    const query = { 'list-type': '2', 'max-keys': '1000' };
    if (continuationToken) query['continuation-token'] = continuationToken;

    const res = await signedR2Fetch(cfg, { method: 'GET', query });
    const xml = await res.text();
    if (!res.ok) {
      throw new Error(`R2 ListObjectsV2 failed (${res.status}): ${extractTag(xml, 'Message') || xml.slice(0, 180)}`);
    }

    const blocks = extractBlocks(xml, 'Contents');
    for (const blk of blocks) {
      const key = extractTag(blk, 'Key');
      const size = Number(extractTag(blk, 'Size') || 0);
      const lastModified = extractTag(blk, 'LastModified');
      const mOrder = key.match(/^orders\/([^/]+)\//i);
      objects.push({
        key,
        size,
        lastModified,
        orderId: mOrder ? normalizeOrderId(mOrder[1]) : '',
        fileName: key.split('/').pop() || key,
      });
      totalBytes += size;
    }

    const truncated = extractTag(xml, 'IsTruncated').toLowerCase() === 'true';
    continuationToken = truncated ? extractTag(xml, 'NextContinuationToken') : '';
    if (!truncated || !continuationToken) break;
  }

  // Also inspect active/orphaned multipart uploads
  const incompleteUploads = [];
  try {
    const upRes = await signedR2Fetch(cfg, { method: 'GET', query: { uploads: '' } });
    if (upRes.ok) {
      const upXml = await upRes.text();
      for (const blk of extractBlocks(upXml, 'Upload')) {
        incompleteUploads.push({
          key: extractTag(blk, 'Key'),
          uploadId: extractTag(blk, 'UploadId'),
          initiated: extractTag(blk, 'Initiated'),
        });
      }
    }
  } catch (e) {}

  return {
    totalBytes,
    totalGB: Number((totalBytes / 1e9).toFixed(3)),
    freeTierBytes: FREE_TIER_BYTES,
    remainingBytes: Math.max(0, FREE_TIER_BYTES - totalBytes),
    objects,
    incompleteUploads,
  };
}

async function fetchStudioDatabase() {
  const res = await fetch(`${GAS_DB_URL}?action=get_database`, { redirect: 'follow' });
  const text = await res.text();
  let parsed = null;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new Error('Cloud order database returned invalid response');
  }
  if (!parsed || parsed.status !== 'success') {
    throw new Error('Cloud order database unavailable');
  }
  return parsed;
}

// ========================================================
// PAGES FUNCTION ENTRYPOINT (/api/r2)
// ========================================================
export async function onRequest(context) {
  const { request, env } = context;
  const method = request.method.toUpperCase();

  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': getAllowedCorsOrigin(request),
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '3600',
        Vary: 'Origin',
      },
    });
  }

  const url = new URL(request.url);
  const cfg = getR2Config(env);

  let body = {};
  if (method === 'POST') {
    const rawText = await request.text();
    if (rawText) {
      try {
        body = JSON.parse(rawText);
      } catch (e) {
        return jsonResponse({ status: 'error', message: 'Invalid JSON request body' }, 400, request);
      }
    }
  }

  const action = String(url.searchParams.get('action') || body.action || '').trim().toLowerCase();

  try {
    // --------------------------------------------------------
    // 1. HEALTH / CONFIGURATION STATUS (NO SECRETS EXPOSED)
    // --------------------------------------------------------
    if (action === 'status' || (!action && method === 'GET')) {
      return jsonResponse({
        status: 'success',
        configured: cfg.configured,
        missingCount: cfg.missing.length,
        freeTierGB: 10,
      }, 200, request);
    }

    if (!cfg.authSecret) {
      return jsonResponse({
        status: 'error',
        configured: false,
        message: 'Server AUTH_SECRET is not configured in Cloudflare Pages Variables and Secrets.',
      }, 503, request);
    }

    // --------------------------------------------------------
    // 2. DIRECTOR & CLIENT AUTHENTICATION EXCHANGES
    // --------------------------------------------------------
    if (action === 'auth-admin') {
      const credential = body.credential;
      if (!credential) {
        return jsonResponse({ status: 'error', message: 'Missing Google credential token' }, 400, request);
      }
      const verified = await verifyGoogleIdToken(credential);
      if (verified.email !== AUTHORIZED_DIRECTOR_EMAIL) {
        return jsonResponse({ status: 'error', message: 'Forbidden: Only authorized Studio Director account may sign in.' }, 403, request);
      }
      const token = await issueSessionToken(cfg.authSecret, {
        sub: verified.email,
        role: 'admin',
        ttlSeconds: 24 * 3600,
      });
      return jsonResponse({ status: 'success', token, email: verified.email, role: 'admin', expiresIn: 24 * 3600 }, 200, request);
    }

    if (action === 'auth-client-google') {
      const credential = body.credential;
      if (!credential) {
        return jsonResponse({ status: 'error', message: 'Missing Google credential token' }, 400, request);
      }
      const verified = await verifyGoogleIdToken(credential);
      const role = verified.email === AUTHORIZED_DIRECTOR_EMAIL ? 'admin' : 'client';
      const token = await issueSessionToken(cfg.authSecret, {
        sub: verified.email,
        role,
        ttlSeconds: 7 * 24 * 3600,
      });
      return jsonResponse({ status: 'success', token, email: verified.email, role, expiresIn: 7 * 24 * 3600 }, 200, request);
    }

    if (action === 'auth-client-password') {
      const email = String(body.email || '').toLowerCase().trim();
      const password = String(body.password || '');
      if (!email || !password) {
        return jsonResponse({ status: 'error', message: 'Email and password are required' }, 400, request);
      }
      if (email === AUTHORIZED_DIRECTOR_EMAIL) {
        return jsonResponse({ status: 'error', message: 'Director must authenticate via Google Sign-In.' }, 403, request);
      }
      const db = await fetchStudioDatabase();
      const users = db.users || {};
      const record = users[email];
      if (!record || !record.pass || String(record.pass) !== password) {
        return jsonResponse({ status: 'error', message: 'Invalid email or password for cloud session verification.' }, 401, request);
      }
      const token = await issueSessionToken(cfg.authSecret, {
        sub: email,
        role: 'client',
        ttlSeconds: 7 * 24 * 3600,
      });
      return jsonResponse({ status: 'success', token, email, role: 'client', expiresIn: 7 * 24 * 3600 }, 200, request);
    }

    // All storage actions require full R2 credentials
    if (!cfg.configured) {
      return jsonResponse({
        status: 'error',
        configured: false,
        message: 'Cloudflare R2 environment secrets are incomplete on Cloudflare Pages.',
      }, 503, request);
    }

    // --------------------------------------------------------
    // 3. CLIENT / DIRECTOR OWNERSHIP-VERIFIED DOWNLOAD URL
    // --------------------------------------------------------
    if (action === 'sign-download') {
      const claims = await requireAuthenticatedUser(request, env);
      const explicitKey = String(body.key || url.searchParams.get('key') || '').trim();
      const rawOrderId = body.orderId || url.searchParams.get('orderId');

      if (claims.role === 'admin' && explicitKey && !rawOrderId) {
        const normalizedKey = explicitKey.replace(/^r2:\/\//, '').replace(/^\/+/, '');
        if (!normalizedKey.startsWith('orders/') || normalizedKey.includes('..')) {
          return jsonResponse({ status: 'error', message: 'Invalid R2 object key.' }, 400, request);
        }
        const fileName = sanitizeFileName(normalizedKey.split('/').pop(), 'RetoucherShoaib_Master.zip');
        const downloadUrl = await generatePresignedR2Url({
          accountId: cfg.accountId,
          bucket: cfg.bucket,
          accessKeyId: cfg.accessKeyId,
          secretAccessKey: cfg.secretAccessKey,
          key: normalizedKey,
          method: 'GET',
          expiresIn: 21600,
          extraQuery: {
            'response-content-disposition': `attachment; filename="${fileName}"`,
            'response-content-type': 'application/zip',
          },
        });
        return jsonResponse({
          status: 'success',
          downloadUrl,
          fileName,
          expiresIn: 21600,
        }, 200, request);
      }

      const cleanOrderId = normalizeOrderId(rawOrderId);
      if (!cleanOrderId) {
        return jsonResponse({ status: 'error', message: 'Valid Order ID is required' }, 400, request);
      }

      const db = await fetchStudioDatabase();
      const deletedOrders = db.deletedOrders || {};
      if (
        deletedOrders[cleanOrderId] ||
        deletedOrders['#' + cleanOrderId] ||
        deletedOrders['RS-2026-' + cleanOrderId] ||
        deletedOrders['#RS-2026-' + cleanOrderId]
      ) {
        return jsonResponse({ status: 'error', message: `Order #${cleanOrderId} has been deleted.` }, 404, request);
      }

      const orders = Array.isArray(db.orders) ? db.orders : [];
      const order = orders.find((o) => normalizeOrderId(o && (o.numericId || o.id)) === cleanOrderId);

      if (!order) {
        return jsonResponse({ status: 'error', message: `Order #${cleanOrderId} was not found.` }, 404, request);
      }

      const ownerEmail = String(order.clientEmail || order.email || '').toLowerCase().trim();
      if (claims.role !== 'admin' && (!ownerEmail || ownerEmail !== claims.sub)) {
        return jsonResponse({ status: 'error', message: 'Access denied: Order belongs to another client account.' }, 403, request);
      }

      const deliveries = db.deliveries || {};
      const deliveryTarget = String(
        deliveries[cleanOrderId] ||
        deliveries['#' + cleanOrderId] ||
        deliveries['RS-2026-' + cleanOrderId] ||
        order.drive ||
        ''
      ).trim();

      if (!deliveryTarget.startsWith('r2://')) {
        if (deliveryTarget.startsWith('http://') || deliveryTarget.startsWith('https://')) {
          return jsonResponse({ status: 'drive', url: deliveryTarget }, 200, request);
        }
        return jsonResponse({ status: 'error', message: 'No downloadable file is attached to this order yet.' }, 404, request);
      }

      const r2Key = deliveryTarget.slice('r2://'.length).replace(/^\/+/, '');
      if (!r2Key || r2Key.includes('..') || !r2Key.startsWith('orders/')) {
        return jsonResponse({ status: 'error', message: 'Invalid R2 delivery object path.' }, 400, request);
      }

      const fileName = sanitizeFileName(r2Key.split('/').pop(), `RetoucherShoaib_Order_${cleanOrderId}.zip`);
      const downloadUrl = await generatePresignedR2Url({
        accountId: cfg.accountId,
        bucket: cfg.bucket,
        accessKeyId: cfg.accessKeyId,
        secretAccessKey: cfg.secretAccessKey,
        key: r2Key,
        method: 'GET',
        expiresIn: 21600, // 6 hours so large 7 GB downloads can pause & resume smoothly
        extraQuery: {
          'response-content-disposition': `attachment; filename="${fileName}"`,
          'response-content-type': 'application/zip',
        },
      });

      return jsonResponse({
        status: 'success',
        downloadUrl,
        fileName,
        expiresIn: 21600,
      }, 200, request);
    }

    // --------------------------------------------------------
    // 4. ADMIN-ONLY R2 STORAGE MANAGEMENT & MULTIPART SIGNING
    // --------------------------------------------------------
    await requireAdmin(request, env);

    if (action === 'usage') {
      const inv = await listBucketInventory(cfg);
      return jsonResponse({ status: 'success', ...inv }, 200, request);
    }

    if (action === 'sign-put') {
      const cleanOrderId = normalizeOrderId(body.orderId);
      if (!cleanOrderId) return jsonResponse({ status: 'error', message: 'Valid Order ID required' }, 400, request);

      const fileSize = Number(body.fileSize || 0);
      if (fileSize <= 0 || fileSize > 100 * 1000 * 1000) {
        return jsonResponse({ status: 'error', message: 'Use multipart upload for files larger than 100 MB.' }, 400, request);
      }

      const inv = await listBucketInventory(cfg);
      if (!body.allowOverage && inv.totalBytes + fileSize > SAFETY_LIMIT_BYTES) {
        return jsonResponse({
          status: 'quota_warning',
          message: `Uploading ${(fileSize / 1e9).toFixed(2)} GB would exceed the 10 GB R2 Free Tier (currently ${(inv.totalBytes / 1e9).toFixed(2)} GB used). Delete older ZIPs first to avoid overage charges.`,
          ...inv,
        }, 409, request);
      }

      const safeName = sanitizeFileName(body.fileName, `Order_${cleanOrderId}_Masters.zip`);
      const key = `orders/${cleanOrderId}/${safeName}`;
      const uploadUrl = await generatePresignedR2Url({
        accountId: cfg.accountId,
        bucket: cfg.bucket,
        accessKeyId: cfg.accessKeyId,
        secretAccessKey: cfg.secretAccessKey,
        key,
        method: 'PUT',
        expiresIn: 3600,
      });

      return jsonResponse({
        status: 'success',
        mode: 'single',
        key,
        r2Uri: `r2://${key}`,
        fileName: safeName,
        uploadUrl,
      }, 200, request);
    }

    if (action === 'create-multipart') {
      const cleanOrderId = normalizeOrderId(body.orderId);
      if (!cleanOrderId) return jsonResponse({ status: 'error', message: 'Valid Order ID required' }, 400, request);

      const fileSize = Number(body.fileSize || 0);
      if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > MAX_SINGLE_OBJECT_BYTES) {
        return jsonResponse({ status: 'error', message: 'Invalid file size for upload.' }, 400, request);
      }

      const inv = await listBucketInventory(cfg);
      if (!body.allowOverage && inv.totalBytes + fileSize > SAFETY_LIMIT_BYTES) {
        return jsonResponse({
          status: 'quota_warning',
          message: `Uploading ${(fileSize / 1e9).toFixed(2)} GB would exceed the 10 GB R2 Free Tier (currently ${(inv.totalBytes / 1e9).toFixed(2)} GB used). Delete older ZIPs first to keep monthly cost at $0.00.`,
          ...inv,
        }, 409, request);
      }

      const safeName = sanitizeFileName(body.fileName, `Order_${cleanOrderId}_Masters.zip`);
      const key = `orders/${cleanOrderId}/${safeName}`;
      const contentType = String(body.contentType || 'application/zip').trim() || 'application/zip';

      const initRes = await signedR2Fetch(cfg, {
        method: 'POST',
        key,
        query: { uploads: '' },
        contentType,
      });
      const initXml = await initRes.text();
      if (!initRes.ok) {
        throw new Error(`R2 CreateMultipartUpload failed (${initRes.status}): ${extractTag(initXml, 'Message') || initXml.slice(0, 180)}`);
      }
      const uploadId = extractTag(initXml, 'UploadId');
      if (!uploadId) {
        throw new Error('R2 did not return an UploadId');
      }

      return jsonResponse({
        status: 'success',
        mode: 'multipart',
        key,
        r2Uri: `r2://${key}`,
        fileName: safeName,
        uploadId,
      }, 200, request);
    }

    if (action === 'sign-parts-batch') {
      const key = String(body.key || '').trim();
      const uploadId = String(body.uploadId || '').trim();
      const partNumbers = Array.isArray(body.partNumbers) ? body.partNumbers : [];
      if (!key.startsWith('orders/') || key.includes('..') || !uploadId || partNumbers.length === 0 || partNumbers.length > 50) {
        return jsonResponse({ status: 'error', message: 'Invalid key, uploadId, or partNumbers batch.' }, 400, request);
      }

      const urls = {};
      for (const pnRaw of partNumbers) {
        const pn = parseInt(pnRaw, 10);
        if (!Number.isInteger(pn) || pn < 1 || pn > 10000) {
          return jsonResponse({ status: 'error', message: `Invalid partNumber: ${pnRaw}` }, 400, request);
        }
        urls[pn] = await generatePresignedR2Url({
          accountId: cfg.accountId,
          bucket: cfg.bucket,
          accessKeyId: cfg.accessKeyId,
          secretAccessKey: cfg.secretAccessKey,
          key,
          method: 'PUT',
          expiresIn: 7200, // 2 hours per signed batch for slow connections
          extraQuery: {
            partNumber: String(pn),
            uploadId,
          },
        });
      }

      return jsonResponse({ status: 'success', urls }, 200, request);
    }

    if (action === 'complete-multipart') {
      const key = String(body.key || '').trim();
      const uploadId = String(body.uploadId || '').trim();
      const partsRaw = Array.isArray(body.parts) ? body.parts : [];
      if (!key.startsWith('orders/') || key.includes('..') || !uploadId || partsRaw.length === 0) {
        return jsonResponse({ status: 'error', message: 'Invalid complete-multipart payload' }, 400, request);
      }

      const parts = partsRaw
        .map((p) => {
          const num = parseInt(p.partNumber || p.PartNumber, 10);
          let etag = String(p.etag || p.ETag || '').trim().replace(/^W\//i, '').replace(/^"+|"+$/g, '');
          if (etag) etag = `"${etag}"`;
          return { partNumber: num, etag };
        })
        .filter((p) => Number.isInteger(p.partNumber) && p.partNumber >= 1 && p.etag.length > 2)
        .sort((a, b) => a.partNumber - b.partNumber);

      if (parts.length !== partsRaw.length) {
        return jsonResponse({ status: 'error', message: 'One or more uploaded part ETags are missing.' }, 400, request);
      }

      const xmlPayload =
        '<CompleteMultipartUpload>' +
        parts
          .map((p) => `<Part><PartNumber>${p.partNumber}</PartNumber><ETag>${escapeXml(p.etag)}</ETag></Part>`)
          .join('') +
        '</CompleteMultipartUpload>';

      const compRes = await signedR2Fetch(cfg, {
        method: 'POST',
        key,
        query: { uploadId },
        body: xmlPayload,
        contentType: 'application/xml',
      });
      const compXml = await compRes.text();
      if (!compRes.ok || /<Error>/i.test(compXml) || !/<CompleteMultipartUploadResult/i.test(compXml)) {
        throw new Error(`R2 CompleteMultipartUpload failed: ${extractTag(compXml, 'Message') || compXml.slice(0, 200)}`);
      }

      return jsonResponse({
        status: 'success',
        key,
        r2Uri: `r2://${key}`,
      }, 200, request);
    }

    if (action === 'abort-multipart') {
      const key = String(body.key || '').trim();
      const uploadId = String(body.uploadId || '').trim();
      if (!key.startsWith('orders/') || key.includes('..') || !uploadId) {
        return jsonResponse({ status: 'error', message: 'Invalid abort-multipart payload' }, 400, request);
      }
      const abRes = await signedR2Fetch(cfg, {
        method: 'DELETE',
        key,
        query: { uploadId },
      });
      if (!abRes.ok && abRes.status !== 404) {
        const txt = await abRes.text();
        throw new Error(`Abort failed (${abRes.status}): ${extractTag(txt, 'Message') || txt.slice(0, 140)}`);
      }
      return jsonResponse({ status: 'success', abortedKey: key }, 200, request);
    }

    if (action === 'delete-object') {
      const key = String(body.key || '').trim();
      if (!key.startsWith('orders/') || key.includes('..')) {
        return jsonResponse({ status: 'error', message: 'Invalid object key' }, 400, request);
      }
      const delRes = await signedR2Fetch(cfg, {
        method: 'DELETE',
        key,
      });
      if (!delRes.ok && delRes.status !== 404) {
        const txt = await delRes.text();
        throw new Error(`Delete failed (${delRes.status}): ${extractTag(txt, 'Message') || txt.slice(0, 140)}`);
      }
      const inv = await listBucketInventory(cfg);
      return jsonResponse({ status: 'success', deletedKey: key, ...inv }, 200, request);
    }

    return jsonResponse({ status: 'error', message: `Unknown API action: ${action}` }, 400, request);
  } catch (err) {
    const status = err && err.status ? err.status : 500;
    return jsonResponse({ status: 'error', message: err.message || 'Internal R2 gateway error' }, status, request);
  }
}
