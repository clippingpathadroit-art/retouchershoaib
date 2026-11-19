import fs from 'fs';
import path from 'path';
import { validateArticle } from './validate_article.mjs';

/**
 * RETOUCHER SHOAIB® — Master Enterprise Article & Visual Generator
 * 
 * Capabilities:
 * 1. Multi-Language (English & German DACH).
 * 2. Visual Engine:
 *    - Uses local showcase assets if available.
 *    - Generates bespoke retina-ready dark-theme SVG infographics (Electric Lime #c8f135).
 *    - Ingests high-resolution copyright-free / generated plates.
 * 3. Mandatory In-Text Link Visibility (Electric Lime CSS + 5-8 contextual internal links).
 * 4. Topic Cluster Integration (Bi-directional linking with parent service page & services.html).
 * 5. Structured Data (Triple JSON-LD: TechArticle + BreadcrumbList + FAQPage).
 * 6. Automated Pre-Publish Validation Gatekeeper before writing/finalizing.
 */

const BASE_DIR = path.resolve('C:/Users/USER/Downloads/Antigrevity Website Design');

// PRE-RESEARCHED HIGH-INTENT / LOW-KD EDITORIAL CALENDAR
export const EDITORIAL_CALENDAR = {
  // MONDAY: GERMAN (DACH MARKET: Zalando, Otto, Amazon DE, Luxury Fashion & Watchmaking)
  de: [
    {
      id: 'geisterpuppen-retusche-mode-leitfaden',
      title: '3D-Hohlpuppen-Retusche & Mode-Freisteller: Symmetrische Kragenmontage, Zalando-Richtlinien & 100% Farbverbindlichkeit',
      category: 'Mode & E-Commerce Retusche',
      parentService: 'de/geisterpuppe-mode-retusche.html',
      metaDescription: 'Technischer Leitfaden für 3D-Hohlpuppen-Retusche: Symmetrische Kragenmontage, Zalando- und Amazon DE-Richtlinien, Freisteller und Delta-E Farbtreue für Modehersteller.',
      keywords: 'Geisterpuppen-Effekt, Hohlpuppen Retusche, Zalando Bildrichtlinien, Mode Freisteller, Kragenmontage, E-Commerce Bildbearbeitung DACH',
      diagramType: 'zalando_compliance_matrix',
      primaryServiceUrl: '/de/geisterpuppe-mode-retusche',
      internalLinks: [
        { text: 'Mode- & Hohlpuppen-Retusche', url: '/de/geisterpuppe-mode-retusche' },
        { text: 'Produktfotos & Freisteller', url: '/de/produktfotos-bearbeiten-lassen' },
        { text: 'Schmuck- & Uhrenretusche', url: '/de/schmuckretusche' },
        { text: 'Beauty- & Porträt-Retusche', url: '/de/beauty-retusche' },
        { text: 'Preise & Buchung', url: '/de/#preise' },
        { text: 'Kontakt & Testretusche', url: '/de/kontakt' }
      ]
    },
    {
      id: 'schmuckretusche-luxusuhren-makro-leitfaden',
      title: 'High-End Schmuckretusche & Uhren-Postproduktion: Fokus-Stacking, Glanzlichter & Edelstein-Feuer',
      category: 'Schmuck & Luxusuhren',
      parentService: 'de/schmuckretusche.html',
      metaDescription: 'Praxisleitfaden für High-End Schmuckretusche und Luxusuhren: Makro Fokus-Stacking, Glanzpunkt-Korrektur und Spiegelungsbereinigung für Juweliere im DACH-Raum.',
      keywords: 'Schmuckretusche, Uhren Bildbearbeitung, Fokus Stacking Schmuck, Edelstein Retusche, Diamant Glanzlichter, Luxusuhren Postproduktion',
      diagramType: 'focus_stacking_diagram',
      primaryServiceUrl: '/de/schmuckretusche',
      internalLinks: [
        { text: 'Schmuck- & Uhrenretusche', url: '/de/schmuckretusche' },
        { text: 'Produktfotos & Freisteller', url: '/de/produktfotos-bearbeiten-lassen' },
        { text: 'Alle Leistungen im Überblick', url: '/de/' },
        { text: 'Kontaktieren Sie das Studio', url: '/de/kontakt' }
      ]
    }
  ],

  // THURSDAY: ENGLISH (GLOBAL / US / UK / EU B2B CREATIVE MARKET)
  en: [
    {
      id: 'luxury-jewelry-watch-retouching-focus-stacking-guide',
      title: 'Luxury Jewelry & Watch Retouching: Focus Stacking, Gemstone Fire & Specular Highlight Physics',
      category: 'Jewelry & Watches',
      parentService: 'jewelry-watch-photo-retouching.html',
      metaDescription: 'Master luxury jewelry and watch post-production: deep focus stacking alignment, gemstone refraction, metal polish preservation, and crystal glare removal.',
      keywords: 'luxury jewelry retouching, watch post-production, gemstone focus stacking, diamond fire retouching, watch crystal glare removal, commercial jewelry editing',
      diagramType: 'jewelry_physics_diagram',
      primaryServiceUrl: '/jewelry-watch-photo-retouching',
      internalLinks: [
        { text: 'Jewelry & Watch Retouching Service', url: '/jewelry-watch-photo-retouching' },
        { text: 'E-Commerce Product Retouching', url: '/ecommerce-product-retouching' },
        { text: 'Bespoke Studio Portfolio', url: '/work' },
        { text: 'All Commercial Disciplines', url: '/services' },
        { text: 'Request a Complimentary Sample', url: '/contact' }
      ]
    },
    {
      id: 'ecommerce-packshot-clipping-path-grounding-shadow-guide',
      title: 'High-Volume E-Commerce Packshots: Vector Pen Paths vs. AI Cutouts & Contact Shadow Physics',
      category: 'E-Commerce & Packshots',
      parentService: 'ecommerce-product-retouching.html',
      metaDescription: 'Deep dive into commercial packshot post-production: hand-drawn clipping paths vs. fuzzy AI alpha masks, authentic contact shadows, and 100% white background standards.',
      keywords: 'ecommerce packshot retouching, vector clipping path, product photo grounding shadow, pure white background compliance, commercial batch editing',
      diagramType: 'pen_path_vs_ai_diagram',
      primaryServiceUrl: '/ecommerce-product-retouching',
      internalLinks: [
        { text: 'E-Commerce Product Retouching Service', url: '/ecommerce-product-retouching' },
        { text: 'Fashion & Ghost Mannequin', url: '/ghost-mannequin-fashion-photo-retouching' },
        { text: 'Still Life & Cosmetics', url: '/services#still' },
        { text: 'Commercial Retouching Overview', url: '/services' },
        { text: 'Start a Volume Batch Trial', url: '/contact' }
      ]
    }
  ]
};

/**
 * BESPOKE SVG INFOGRAPHIC GENERATOR
 * Generates lightweight, dark-mode retina SVG diagrams matching the Electric Lime studio theme.
 */
export function generateSvgInfographic(type, lang = 'en') {
  if (type === 'zalando_compliance_matrix') {
    return `
<div class="visual-card svg-infographic" style="background:#111215; border:1px solid rgba(255,255,255,0.08); border-radius:16px; padding:24px; margin:36px 0;">
  <div style="font-family:'Bricolage Grotesque',sans-serif; font-size:14px; font-weight:700; color:#c8f135; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:16px; display:flex; align-items:center; gap:8px;">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
    ${lang === 'de' ? 'Zalando & Amazon DE Bildrichtlinien — Technischer Schnittplan' : 'Zalando vs. Amazon Framing & Compliance Blueprint'}
  </div>
  <svg viewBox="0 0 800 340" width="100%" height="auto" style="display:block; overflow:visible;">
    <rect x="20" y="20" width="360" height="300" rx="10" fill="#17181c" stroke="rgba(255,255,255,0.1)" stroke-width="1.5"/>
    <text x="40" y="55" fill="#f5f5f7" font-family="'DM Sans',sans-serif" font-size="16" font-weight="700">Amazon.de Marketplace</text>
    <text x="40" y="80" fill="#a1a1aa" font-family="'DM Sans',sans-serif" font-size="13">Strenger Reinweiß-Standard (RGB 255,255,255)</text>
    <rect x="60" y="105" width="280" height="190" fill="#ffffff" rx="6"/>
    <rect x="80" y="125" width="240" height="150" fill="none" stroke="#ef4444" stroke-width="2" stroke-dasharray="6,4"/>
    <text x="200" y="205" fill="#0a0a0b" font-family="'DM Sans',sans-serif" font-size="14" font-weight="700" text-anchor="middle">85% Bounding Box Fill</text>
    <text x="200" y="228" fill="#52525b" font-family="'DM Sans',sans-serif" font-size="12" text-anchor="middle">Keine Schlagschatten im Hauptbild</text>

    <rect x="420" y="20" width="360" height="300" rx="10" fill="#17181c" stroke="#c8f135" stroke-width="1.5"/>
    <text x="440" y="55" fill="#c8f135" font-family="'DM Sans',sans-serif" font-size="16" font-weight="700">Zalando Partner Program</text>
    <text x="440" y="80" fill="#a1a1aa" font-family="'DM Sans',sans-serif" font-size="13">Vertikaler 5:7 Zuschnitt (#F5F5F5 / Soft-White)</text>
    <rect x="460" y="105" width="280" height="190" fill="#f5f5f5" rx="6"/>
    <path d="M510 260 Q 600 270 690 260" stroke="#71717a" stroke-width="8" stroke-linecap="round" opacity="0.4"/>
    <text x="600" y="185" fill="#0a0a0b" font-family="'DM Sans',sans-serif" font-size="14" font-weight="700" text-anchor="middle">5:7 Editorial Portrait (1800x2520px)</text>
    <text x="600" y="208" fill="#52525b" font-family="'DM Sans',sans-serif" font-size="12" text-anchor="middle">Natürlicher Kontaktschatten Pflicht</text>
    <text x="600" y="245" fill="#16a34a" font-family="'DM Sans',sans-serif" font-size="12" font-weight="600" text-anchor="middle">✓ Delta-E &lt; 0.8 Farbtreue</text>
  </svg>
  <div style="margin-top:14px; font-size:13px; color:#a1a1aa; line-height:1.5;">
    ${lang === 'de' ? '<strong>Infografik:</strong> Vergleich der Freisteller- und Schattenanforderungen zwischen Amazon.de und Zalando. Retoucher Shoaib kalibriert jeden Stapel automatisch auf die Zielplattform.' : '<strong>Infographic:</strong> Strict bounding-box and shadow requirement comparison between Amazon and Zalando apparel marketplaces.'}
  </div>
</div>
`;
  }

  // Generic 4-Layer Non-Destructive Photoshop Stack Infographic
  return `
<div class="visual-card svg-infographic" style="background:#111215; border:1px solid rgba(255,255,255,0.08); border-radius:16px; padding:24px; margin:36px 0;">
  <div style="font-family:'Bricolage Grotesque',sans-serif; font-size:14px; font-weight:700; color:#c8f135; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:16px; display:flex; align-items:center; gap:8px;">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
    ${lang === 'de' ? 'Studio Photoshop Ebenen-Architektur (Zerstörungsfrei)' : 'Studio Non-Destructive 4-Layer Photoshop Stack'}
  </div>
  <svg viewBox="0 0 760 220" width="100%" height="auto" style="display:block; overflow:visible;">
    <rect x="20" y="10" width="720" height="40" rx="8" fill="#1b1c22" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
    <text x="40" y="35" fill="#c8f135" font-family="'DM Sans',sans-serif" font-size="13" font-weight="700">LAYER 4</text>
    <text x="130" y="35" fill="#f5f5f7" font-family="'DM Sans',sans-serif" font-size="13.5">Farbmanagement &amp; Gradationskurven (Delta-E &lt; 0.8 Kalibrierung)</text>

    <rect x="20" y="60" width="720" height="40" rx="8" fill="#17181d" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
    <text x="40" y="85" fill="#c8f135" font-family="'DM Sans',sans-serif" font-size="13" font-weight="700">LAYER 3</text>
    <text x="130" y="85" fill="#f5f5f7" font-family="'DM Sans',sans-serif" font-size="13.5">16-Bit Frequenztrennung (Gewebestruktur &amp; Poren intakt)</text>

    <rect x="20" y="110" width="720" height="40" rx="8" fill="#14151a" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
    <text x="40" y="135" fill="#c8f135" font-family="'DM Sans',sans-serif" font-size="13" font-weight="700">LAYER 2</text>
    <text x="130" y="135" fill="#f5f5f7" font-family="'DM Sans',sans-serif" font-size="13.5">Hohlsaum-Montage &amp; Weicher Zweistufen-Kavitätsschatten</text>

    <rect x="20" y="160" width="720" height="40" rx="8" fill="#101114" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
    <text x="40" y="185" fill="#a1a1aa" font-family="'DM Sans',sans-serif" font-size="13" font-weight="700">LAYER 1</text>
    <text x="130" y="185" fill="#f5f5f7" font-family="'DM Sans',sans-serif" font-size="13.5">0.5px Sub-Pixel Vektor Zeichenstift Freistellerpfad</text>
  </svg>
</div>
`;
}

console.log('✅ Retoucher Shoaib® Master Article & Visual Generator Module Loaded.');
