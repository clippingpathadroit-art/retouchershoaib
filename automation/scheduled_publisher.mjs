import fs from 'fs';
import path from 'path';

/**
 * RETOUCHER SHOAIB® — Master Social Media Scheduled Publisher
 * Runs every Monday & Thursday at 7:00 PM BDT (Peak US/EU B2B Reach Window).
 * 
 * Workflow:
 * 1. Checks feed.json for newly published articles.
 * 2. Compares against automation/published_history.json to prevent duplicate posts.
 * 3. Adapts article into tailored high-converting copy using Gemini AI.
 * 4. Pushes HD image + copy + direct link to Make.com Webhook.
 * 5. Make.com publishes live to LinkedIn and Facebook Pages simultaneously.
 */

const BASE_DIR = path.resolve('C:/Users/USER/Downloads/Antigrevity Website Design');
const FEED_PATH = path.join(BASE_DIR, 'feed.json');
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

  const prompt = `
You are a senior creative copywriter and B2B social media growth strategist for "Retoucher Shoaib", a high-end commercial photo retouching and post-production studio (clients: luxury jewelry, fashion brands, beauty campaigns, e-commerce directors across US and Europe).

Article to adapt:
Title: "${article.title}"
Category: "${article.category}"
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
      console.log(`[AI] Generating copy with ${model}...`);
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
  result.image_url = result.image_url || article.image;

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
  console.log(`[Make.com] Dispatching to Webhook: ${WEBHOOK_URL}...`);
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

  if (!fs.existsSync(FEED_PATH)) {
    console.error(`Error: feed.json not found at ${FEED_PATH}`);
    return;
  }

  const feed = JSON.parse(fs.readFileSync(FEED_PATH, 'utf8'));
  const history = getPublishedHistory();

  let targetArticle = null;

  if (forceId) {
    targetArticle = feed.items.find(i => i.id === forceId);
  } else {
    // STRICT RULE: Only broadcast the LATEST published article (feed.items[0]).
    // NEVER fall back to older backlog articles if today's run was missed or pending review.
    const latest = feed.items[0];
    if (latest && !history.published_ids.includes(latest.id)) {
      targetArticle = latest;
    }
  }

  if (!targetArticle) {
    console.log('✨ The latest article in feed.json has already been broadcast to social media.');
    console.log('🔒 Anti-Stale Protection: System will never post older fallback articles.');
    return;
  }

  console.log(`🚀 New Article Found to Broadcast: "${targetArticle.title}" (${targetArticle.id})`);

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
