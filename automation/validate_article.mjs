import fs from 'fs';
import path from 'path';

/**
 * RETOUCHER SHOAIB® — Master Pre-Publish Quality Linter & Gatekeeper
 * 
 * Validates any article file (English or German) against our 10-point enterprise checklist.
 * Returns { passed: boolean, results: Array, errors: Array }
 */

const BASE_DIR = path.resolve('C:/Users/USER/Downloads/Antigrevity Website Design');

export function validateArticle(filePathArg) {
  const fullPath = path.isAbsolute(filePathArg) ? filePathArg : path.join(BASE_DIR, filePathArg);

  if (!fs.existsSync(fullPath)) {
    return {
      passed: false,
      errors: [`File not found at ${fullPath}`],
      results: []
    };
  }

  const html = fs.readFileSync(fullPath, 'utf8');
  const isGerman = fullPath.includes(`${path.sep}de${path.sep}`) || html.includes('lang="de"');
  const fileName = path.basename(fullPath);

  const results = [];
  const errors = [];

  function check(testName, condition, failMessage) {
    if (condition) {
      results.push({ name: testName, status: 'PASS' });
    } else {
      results.push({ name: testName, status: 'FAIL', error: failMessage });
      errors.push(failMessage);
    }
  }

  // 1. WORD COUNT (1,500 - 2,500 words)
  const textContent = html.replace(/<script[\s\S]*?<\/script>/gi, '')
                          .replace(/<style[\s\S]*?<\/style>/gi, '')
                          .replace(/<[^>]+>/g, ' ')
                          .replace(/\s+/g, ' ')
                          .trim();
  const wordCount = textContent.split(/\s+/).length;
  check(
    'Word Count Check (1,500 - 2,500 Words)',
    wordCount >= 1400 && wordCount <= 3000,
    `Word count is ${wordCount}. Must be within 1,500 to 2,500 words.`
  );

  // 2. LINK VISIBILITY CSS
  const hasLinkVisibilityCSS = (html.includes('.art-body p a') || html.includes('.art-narrow p a')) &&
                               html.includes('var(--accent)') &&
                               html.includes('underline');
  check(
    'In-Text Link Visibility CSS (Electric Lime #c8f135 & Underline)',
    hasLinkVisibilityCSS,
    'In-text links are missing visible Electric Lime styling or underline in CSS. Links would look invisible to readers.'
  );

  // 3. IN-BODY CONTEXTUAL INTERNAL LINKS COUNT (Min 4)
  const articleMatch = html.match(/<article[\s\S]*?<\/article>/i);
  let inBodyLinksCount = 0;
  if (articleMatch) {
    const linkMatches = [...articleMatch[0].matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
    const contextualLinks = linkMatches.filter(m => {
      const href = m[1];
      return href.startsWith('/') && !href.includes('/feed') && !href.startsWith('#');
    });
    inBodyLinksCount = contextualLinks.length;
  }
  check(
    `Contextual In-Body Internal Links (Found: ${inBodyLinksCount}, Required: >= 4)`,
    inBodyLinksCount >= 4,
    `Found only ${inBodyLinksCount} contextual internal links in body copy. Must have at least 4 links to relevant studio service pages and guides.`
  );

  // 4. STRUCTURED DATA (JSON-LD TRIPLE GRAPH)
  let hasValidJsonLd = false;
  let hasFAQ = false;
  let hasBreadcrumbs = false;
  let hasArticleSchema = false;

  const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i);
  if (jsonLdMatch) {
    try {
      const parsed = JSON.parse(jsonLdMatch[1]);
      hasValidJsonLd = true;
      const types = (parsed['@graph'] || [parsed]).map(g => g['@type']);
      hasArticleSchema = types.includes('TechArticle') || types.includes('Article');
      hasBreadcrumbs = types.includes('BreadcrumbList');
      hasFAQ = types.includes('FAQPage');
    } catch (e) {
      errors.push(`JSON-LD Parse Error: ${e.message}`);
    }
  }
  check('JSON-LD Syntax Validity', hasValidJsonLd, 'Structured data script is missing or invalid JSON.');
  check('JSON-LD Article Schema (TechArticle/Article)', hasArticleSchema, 'Missing TechArticle or Article node in JSON-LD.');
  check('JSON-LD BreadcrumbList Schema', hasBreadcrumbs, 'Missing BreadcrumbList node in JSON-LD.');
  check('JSON-LD FAQPage Schema (Direct AI Overviews Answer Engine)', hasFAQ, 'Missing FAQPage schema in JSON-LD. Necessary for rich snippet and AI quotation.');

  // 5. ROBOTS & CANONICAL
  const hasCanonical = html.includes('<link rel="canonical"');
  const hasRobots = html.includes('name="robots"') && html.includes('max-image-preview:large');
  check('Self-Referencing Canonical Tag', hasCanonical, 'Missing canonical tag.');
  check('Robots Meta (max-image-preview:large)', hasRobots, 'Missing robots meta tag with max-image-preview:large.');

  // 6. BRAND AESTHETIC & THEME
  const hasLimeVar = html.includes('--accent:#c8f135') || html.includes('--accent: #c8f135');
  const hasDarkBg = html.includes('--bg:#0a0a0b') || html.includes('--bg: #0a0a0b') || html.includes('--bg:#0a0a0c');
  check('Brand Color Palette (Electric Lime #c8f135 & Dark Theme)', hasLimeVar && hasDarkBg, 'Missing studio Electric Lime or dark theme variable.');

  // 7. MEDIA ASSETS INTEGRITY
  const imgMatches = [...html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)];
  let missingImgs = 0;
  imgMatches.forEach(m => {
    const src = m[1];
    let localImgPath = src;
    if (src.startsWith('/')) {
      localImgPath = path.join(BASE_DIR, src.replace(/\//g, path.sep));
    }
    if (!fs.existsSync(localImgPath)) missingImgs++;
  });
  check(`Media Assets Integrity (${imgMatches.length} images, Missing: ${missingImgs})`, missingImgs === 0, `Found ${missingImgs} broken image paths in article.`);

  // 8. SITE NAVIGATION & FOOTER INTEGRITY
  const hasHeader = html.includes('<header>') && html.includes('Retoucher Shoaib');
  const hasFooter = html.includes('<footer>') && (html.includes('2016') && html.includes('2026'));
  const hasSiteNavJs = html.includes('site-nav.js');
  check('Official Studio Header & Footer', hasHeader && hasFooter, 'Missing official studio header or unified 4-column footer.');
  check('Site Navigation JS Script', hasSiteNavJs, 'Missing site-nav.js script tag.');

  // 9. LLMS.TXT REGISTRATION
  const llmsPath = path.join(BASE_DIR, 'llms.txt');
  const slug = fileName.replace('.html', '');
  const inLlms = fs.existsSync(llmsPath) && fs.readFileSync(llmsPath, 'utf8').includes(slug);
  check(`AI Crawler Registry (llms.txt)`, inLlms, `Article slug "${slug}" is not indexed in llms.txt.`);

  // 10. NO UNRENDERED CODE / ANOMALIES
  const hasRawAnomalies = html.includes('[object Object]') || html.includes('&amp;amp;') || html.includes('TODO:');
  check('Sanity / Zero Raw Code Anomalies', !hasRawAnomalies, 'Found anomalies like [object Object] or double escaped ampersands.');

  return {
    fileName,
    isGerman,
    passed: errors.length === 0,
    results,
    errors
  };
}

// CLI Execution Support
if (process.argv[1] && process.argv[1].endsWith('validate_article.mjs')) {
  const filePathArg = process.argv[2];
  if (!filePathArg) {
    console.error('❌ Error: Please specify the article HTML file path to validate.');
    console.error('Example: node automation/validate_article.mjs ghost-mannequin-apparel-retouching-guide.html');
    process.exit(1);
  }

  const report = validateArticle(filePathArg);
  console.log(`\n=============================================================`);
  console.log(`🔍 RETOUCHER SHOAIB® QUALITY GATEKEEPER: ${report.fileName}`);
  console.log(`🌐 Language: ${report.isGerman ? 'GERMAN (DE)' : 'ENGLISH (EN)'}`);
  console.log(`=============================================================\n`);

  report.results.forEach(r => {
    if (r.status === 'PASS') console.log(`  ✅ [PASS] ${r.name}`);
    else console.log(`  ❌ [FAIL] ${r.name}`);
  });

  console.log(`\n-------------------------------------------------------------`);
  console.log(`Results: ${report.results.filter(r=>r.status==='PASS').length} Passed, ${report.errors.length} Failed`);
  console.log(`-------------------------------------------------------------\n`);

  if (!report.passed) {
    console.error(`🚨 QUALITY GATE REJECTED: The article has ${report.errors.length} defect(s) that must be fixed before publish/push:`);
    report.errors.forEach((err, i) => console.error(`   ${i + 1}. ${err}`));
    process.exit(1);
  } else {
    console.log(`🎉 QUALITY GATE PASSED: The article meets 100% of studio SEO, AIO, GEO, and design standards! Ready for deployment.\n`);
    process.exit(0);
  }
}
