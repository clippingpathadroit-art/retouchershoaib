import fs from 'fs';
import path from 'path';
import { validateArticle } from './validate_article.mjs';

/**
 * RETOUCHER SHOAIB® — Master Social Media Scheduled Publisher (Multi-Language: EN & DE)
 * Runs every Monday & Thursday at 7:00 PM BDT (13:00 UTC) (Peak US/EU B2B Reach Window).
 * 
 * Workflow:
 * 1. Checks ONLY the top/latest articles (index 0) in feed.json and de/feed.json.
 * 2. Compares against automation/published_history.json to prevent duplicate posts.
 * 3. STRICT ANTI-STALE RULE: Never fall back to older backlog items (index >= 1).
 * 4. Automatically detects language ('en' vs 'de') and adapts article into tailored high-converting copy using Gemini AI.
 * 5. Pushes HD image + native copy + direct link to Make.com Webhook.
 * 6. Make.com publishes live to LinkedIn and Facebook Pages simultaneously.
 */

const BASE_DIR = path.resolve('C:/Users/USER/Downloads/Antigrevity Website Design');
const FEED_PATH = path.join(BASE_DIR, 'feed.json');
const DE_FEED_PATH = path.join(BASE_DIR, 'de', 'feed.json');
const HISTORY_PATH = path.join(BASE_DIR, 'automation', 'published_history.json');
const WEBHOOK_URL = process.env.MAKE_WEBHOOK_URL || 'https://hook.eu1.make.com/tgwsml7u8d82v4ia4nophw2nltyu9yfx';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

function getPublishedHistory() {
  if (!fs.existsSync(HISTORY_PATH)) {
    return { published_ids: [], log: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf8'));
  } catch (e) {
    return { published_ids: [], log: [] };
  }
}

function savePublishedHistory(history) {
  const dir = path.dirname(HISTORY_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2), 'utf8');
}

async function generateSocialPosts(article) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY environment variable is not set.');
  }

  const isGerman = article.language === 'de' || (article.url && article.url.includes('/de/'));

  const prompt = isGerman ? `
You are a senior creative copywriter and B2B social media growth strategist for "Retoucher Shoaib", writing in fluent, professional GERMAN (Deutsch) for high-end fashion brands, e-commerce directors, creative producers, and commercial photographers in the DACH region (Germany, Austria, Switzerland: Zalando brand partners, luxury apparel labels, high-fashion boutiques).

Article to adapt:
Titel: "${article.title}"
Kategorie: "${article.category || 'Mode & E-Commerce Retusche'}"
Zusammenfassung: "${article.summary}"
Artikel-URL: "${article.url}"
Hero-Bild-URL: "${article.image}"

Generate tailored social media posts strictly in professional, native GERMAN following these guidelines:

### 1. LINKEDIN POST RULES (in German):
- Target audience: Art Directors, Creative Producers, E-Commerce Operations Leads, Commercial Photographers in Germany, Austria, and Switzerland.
- Tone: Professional, authoritative, and insightful B2B German.
- Hook: 1-2 sentence hook addressing e-commerce rejection rates, Zalando/Amazon DE compliance, or manual retouching precision vs automated AI flaws.
- Body: 3-4 structured bullet points explaining the technical craft, color fidelity (Delta-E), and quality advantages.
- Call-to-Action (CTA): Direct readers to read the full technical guide at "${article.url}".
- Hashtags: 3-5 German and international B2B tags (e.g., #Bildbearbeitung #ECommerceDACH #ZalandoPartner #Modefotografie #RetoucherShoaib).

### 2. FACEBOOK PAGE POST RULES (in German):
- Engaging story/behind-the-scenes post in German (2-3 short paragraphs).
- Direct URL link to "${article.url}".
- 2-3 relevant hashtags in German.

### 3. INSTAGRAM POST RULES (in German):
- Caption in German with visual format recommendation and 10-12 hashtags.

### 4. PINTEREST PIN RULES (in German):
- Title: Punchy SEO Pin Title (max 100 chars, e.g. "Ghost Mannequin Retusche & Neck Joint Service | Retoucher Shoaib").
- Description: Informative SEO description (150-300 chars) highlighting technical post-production with 3-4 German hashtags.

Return the response strictly as valid, parsable JSON matching this schema:
{
  "article_title": "${article.title}",
  "article_url": "${article.url}",
  "image_url": "${article.image}",
  "linkedin": {
    "post_body": "string",
    "hashtags": ["string"]
  },
  "facebook": {
    "post_body": "string",
    "hashtags": ["string"]
  },
  "instagram": {
    "visual_format_recommendation": "string",
    "caption": "string",
    "hashtags": ["string"]
  },
  "pinterest": {
    "title": "string",
    "description": "string"
  }
}
` : `
You are a senior creative copywriter and B2B social media growth strategist for "Retoucher Shoaib", a high-end commercial photo retouching and post-production studio (clients: luxury jewelry, fashion brands, beauty campaigns, e-commerce directors across US and Europe).

Article to adapt:
Title: "${article.title}"
Category: "${article.category || 'Apparel & Fashion'}"
Summary: "${article.summary}"
Article URL: "${article.url}"
Hero Image URL: "${article.image}"

Generate tailored social media posts following these strict guidelines:

### 1. LINKEDIN POST RULES:
- Target audience: Art Directors, Creative Producers, E-commerce Operations Leads, Commercial Photographers.
- Hook: Start with a strong 1-2 sentence hook highlighting a common industry pain point or contrarian insight.
- Body: 3-4 structured bullet points explaining the technical craft, ROI, or quality difference (e.g. why automated/AI solutions fail and manual 16-bit dodge & burn precision wins).
- Call-to-Action (CTA): End with an explicit prompt directing readers to read the full case study and technical breakdown at the direct URL: "${article.url}".
- Hashtags: Exactly 3 to 5 highly contextual hashtags following this strict 3-tier formula:
  1. Primary subject/technology tag directly from the article topic (e.g. #AIRetouching or #JewelryRetouching).
  2. Target client persona tag (e.g. #CreativeDirectors, #ArtBuyers, or #EcommerceProduction).
  3. High-volume industry authority tag (e.g. #PhotoRetouching, #HighEndRetouching, or #CommercialPhotography).
- Ensure the post_body includes the CTA, direct URL, and these hashtags neatly formatted at the very bottom.

### 2. FACEBOOK PAGE POST RULES:
- Target audience: Brand owners, studio managers, creative professionals.
- Tone: Conversational, insightful, authoritative yet approachable.
- Structure: Engaging story/behind-the-scenes perspective (2-3 short paragraphs).
- Direct Link: Include the article URL ("${article.url}") at the end with a clean CTA.
- Hashtags: 2-3 broad relevant hashtags.

### 3. INSTAGRAM POST RULES:
- Target audience: Visual creatives, photographers, fashion/jewelry enthusiasts.
- Visual Direction: Specify recommended visual format (e.g. "4:5 Aspect Ratio (1080x1350px) Before/After Carousel or Macro Crop").
- Caption: Micro-blog style breaking down the retouching methodology.
- Call-to-Action: Direct readers to the "Link in bio" to read the complete article on the studio feed.
- Hashtags: 10 to 12 high-intent niche hashtags grouped neatly at the bottom.

### 4. PINTEREST RICH PIN RULES:
- Target audience: Art Directors, E-Commerce Operations Managers, Fashion Producers searching Pinterest for retouching references & moodboards.
- Title: High-intent SEO title (max 100 chars, e.g. "3D Ghost Mannequin Neck Join: Symmetrical Collar Retouching | Retoucher Shoaib").
- Description: Informative B2B Pin description (150-350 chars) explaining the technical craft, compliance, and ending with a clear CTA to visit the site, followed by 3-4 hashtags.

Return the response strictly as valid, parsable JSON matching this schema:
{
  "article_title": "${article.title}",
  "article_url": "${article.url}",
  "image_url": "${article.image}",
  "linkedin": {
    "post_body": "string",
    "hashtags": ["string"]
  },
  "facebook": {
    "post_body": "string",
    "hashtags": ["string"]
  },
  "instagram": {
    "visual_format_recommendation": "string",
    "caption": "string",
    "hashtags": ["string"]
  },
  "pinterest": {
    "title": "string",
    "description": "string"
  }
}
`;

  const candidateModels = [
    'gemini-3-flash-preview',
    'gemini-3.7-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.8-flash'
  ];

  let rawText = null;
  let lastErr = null;

  for (const model of candidateModels) {
    try {
      console.log(`[AI] Generating copy with ${model} (Language: ${isGerman ? 'DE' : 'EN'})...`);
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.7
          }
        })
      });

      if (!response.ok) {
        lastErr = new Error(`${model} failed (${response.status})`);
        continue;
      }

      const data = await response.json();
      rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) break;
    } catch (e) {
      lastErr = e;
    }
  }

  if (!rawText) throw lastErr || new Error('All Gemini candidate models failed.');

  const result = JSON.parse(rawText);
  const targetImage = result.image_url || article.image || 'https://retouchershoaib.com/assets/agency_showcase/aristocracy-ivory-gala-tuxedo-ghost-mannequin-retouching.webp';
  result.url = targetImage;          // Critical: Make.com HTTP module 6 expects 'url'
  result.image = targetImage;        // Alternative common Make.com mapping
  result.image_url = targetImage;    // Explicit snake_case
  result.imageUrl = targetImage;     // Explicit camelCase
  result.article_url = result.article_url || article.url;
  result.article_link = result.article_url;
  result.link = result.article_url;
  result.title = result.article_title || article.title;

  // Pinterest Rich Pin payload normalizer
  result.pinterest = result.pinterest || {};
  result.pinterest.title = result.pinterest.title || result.article_title || article.title;
  result.pinterest.description = result.pinterest.description || article.summary || article.content_text || '';
  result.pinterest.link = article.url;
  result.pinterest_title = result.pinterest.title;
  result.pinterest_description = result.pinterest.description;
  result.pinterest_link = article.url;

  if (result.linkedin?.hashtags?.length && !result.linkedin.post_body.includes('#')) {
    result.linkedin.post_body += '\n\n' + result.linkedin.hashtags.join(' ');
  }
  if (result.facebook?.hashtags?.length && !result.facebook.post_body.includes('#')) {
    result.facebook.post_body += '\n\n' + result.facebook.hashtags.join(' ');
  }
  if (result.instagram?.hashtags?.length && !result.instagram.caption.includes('#')) {
    result.instagram.caption += '\n\n' + result.instagram.hashtags.join(' ');
  }

  return result;
}

async function dispatchToMake(payload) {
  if (!payload.url && payload.image_url) {
    payload.url = payload.image_url;
  }
  if (!payload.url) {
    throw new Error('Pre-flight check failed: Required parameter "url" (image URL) is missing in payload. Halting to prevent Make.com BundleValidationError.');
  }
  console.log(`[Make.com] Dispatching to Webhook: ${WEBHOOK_URL}...`);
  console.log(`[Make.com] Verified parameters: image url="${payload.url}", article url="${payload.article_url}"`);
  const res = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    throw new Error(`Make.com webhook failed (${res.status}): ${await res.text()}`);
  }
  console.log('✅ [Make.com] Successfully received and dispatched to LinkedIn & Facebook!');
}

async function runScheduledPublisher(forceId = null) {
  console.log(`\n======================================================`);
  console.log(`📅 Retoucher Shoaib® Social Auto-Publisher [${new Date().toISOString()}]`);
  console.log(`======================================================`);

  const history = getPublishedHistory();

  let targetArticle = null;

  if (forceId) {
    // Explicit force mode: search both feeds
    let allArticles = [];
    if (fs.existsSync(FEED_PATH)) {
      try {
        const feed = JSON.parse(fs.readFileSync(FEED_PATH, 'utf8'));
        if (Array.isArray(feed.items)) allArticles.push(...feed.items);
      } catch (e) {}
    }
    if (fs.existsSync(DE_FEED_PATH)) {
      try {
        const deFeed = JSON.parse(fs.readFileSync(DE_FEED_PATH, 'utf8'));
        if (Array.isArray(deFeed.items)) allArticles.push(...deFeed.items.map(i => ({ ...i, language: 'de' })));
      } catch (e) {}
    }
    targetArticle = allArticles.find(i => i.id === forceId);
  } else {
    // STRICT ANTI-STALE LOGIC:
    // Only inspect the FIRST/LATEST article in each feed (index 0).
    // NEVER fall back to index 1, 2, 3...
    
    // Check German feed latest (de/feed.json item 0)
    if (fs.existsSync(DE_FEED_PATH)) {
      try {
        const deFeed = JSON.parse(fs.readFileSync(DE_FEED_PATH, 'utf8'));
        const latestDe = deFeed.items?.[0];
        if (latestDe && !history.published_ids.includes(latestDe.id)) {
          targetArticle = { ...latestDe, language: 'de' };
        }
      } catch (e) {}
    }

    // If no fresh German article, check English feed latest (feed.json item 0)
    if (!targetArticle && fs.existsSync(FEED_PATH)) {
      try {
        const feed = JSON.parse(fs.readFileSync(FEED_PATH, 'utf8'));
        const latestEn = feed.items?.[0];
        if (latestEn && !history.published_ids.includes(latestEn.id)) {
          targetArticle = latestEn;
        }
      } catch (e) {}
    }
  }

  if (!targetArticle) {
    console.log('✨ All fresh articles (top of feed.json & de/feed.json) have already been broadcast.');
    console.log('🔒 Anti-Stale Protection: System strictly refuses to broadcast older backlog articles.');
    return;
  }

  console.log(`🚀 New Article Found to Broadcast: "${targetArticle.title}" (${targetArticle.id}) [Lang: ${targetArticle.language || 'en'}]`);

  // PRE-PUBLISH QUALITY GATEKEEPER CHECK
  const articleHtmlFile = targetArticle.language === 'de'
    ? path.join(BASE_DIR, 'de', `${targetArticle.id}.html`)
    : path.join(BASE_DIR, `${targetArticle.id}.html`);

  if (fs.existsSync(articleHtmlFile)) {
    console.log(`🛡️ Running Pre-Publish Quality Gatekeeper on ${path.basename(articleHtmlFile)}...`);
    const validation = validateArticle(articleHtmlFile);
    if (!validation.passed) {
      console.error(`🚨 PUBLISHER HALTED: Article "${targetArticle.id}" failed the Quality Gatekeeper:`);
      validation.errors.forEach((err, i) => console.error(`   ${i + 1}. ${err}`));
      console.error(`❌ Social broadcast cancelled to protect studio brand integrity.`);
      return;
    }
    console.log(`✅ [Gatekeeper Passed] 100% SEO, AIO, GEO and Design Standards Verified!`);
  }

  try {
    const payload = await generateSocialPosts(targetArticle);
    await dispatchToMake(payload);

    // Record in history
    if (!history.published_ids.includes(targetArticle.id)) {
      history.published_ids.push(targetArticle.id);
    }
    history.log.push({
      article_id: targetArticle.id,
      title: targetArticle.title,
      language: targetArticle.language || 'en',
      published_at: new Date().toISOString(),
      status: 'success'
    });
    savePublishedHistory(history);

    console.log(`🎉 Article "${targetArticle.id}" successfully broadcast and logged!`);
  } catch (err) {
    console.error('❌ Social broadcast failed:', err.message);
  }
}

// Check if running directly
const forceArg = process.argv[2];
runScheduledPublisher(forceArg);
