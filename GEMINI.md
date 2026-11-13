# Retoucher Shoaib — Commercial Post-Production Studio
## Core Project Guidelines & Standards

This document establishes the mandatory standards for all development, SEO, typography, copywriting, and design work on the **Retoucher Shoaib** website. All future tasks must strictly adhere to these rules.

---

### 1. Brand Identity & Copywriting Standards (কন্টেন্ট ও ব্র্যান্ড আইডেন্টিটি)
- **Studio / Team Representation:**
  - Retoucher Shoaib is a **commercial post-production studio & high-end retouching team**, NOT a solo freelance individual.
  - Always use team/studio framing: *"We"*, *"Our Studio"*, *"Our Retouching Team"*, *"Shoaib & Our Team"*.
  - Use singular "Shoaib" **only** when specifically referencing Shoaib in his formal role as the Founder & Lead Retoucher (e.g., founder bio, direct sign-off).
- **Tone & Voice:**
  - High-end, commercial luxury caliber (aligned with New York, Paris, London, and Milan luxury brands, fashion editorial magazines, and global e-commerce retailers).
  - Emphasize technical mastery (non-destructive dodge & burn, frequency separation, focus stacking, sub-pixel path clipping, CMYK/RGB/Pantone color accuracy, 100% manual non-destructive PSD workflows).
  - Highlight commercial reliability: tight turnaround times, dedicated account management, stringent NDA & confidentiality compliance.
  - Strictly avoid generic AI buzzwords or amateur marketing fluff.

---

### 2. SEO & Asset Optimization Standards (এসইও ও এসেট অপ্টিমাইজেশন)
- **Image Filename Conventions:**
  - **Service Keywords are Mandatory:** Every portfolio or showcase image filename must explicitly include commercial retouching/editing service keywords (e.g., `-retouching.webp`, `-packshot-retouching.webp`, `-photo-editing.webp`, `-cutout.webp`).
  - **Never Use Pure E-Commerce Product Names:** Do not use raw fashion/product-only names (e.g., `tweed-sleeveless-sheath-dress.webp`). Google must recognize the studio as a retouching service provider, not an e-commerce apparel store or a competitor to our clients.
  - **Length:** Keep filenames concise (3 to 5 words, kebab-case, under 50 characters).
- **Image Alt Attributes (`alt` Tags):**
  - **Natural English Sentences:** Must be grammatically fluent, descriptive, and service-focused.
  - **Character Limit:** Strictly follow Google's best-practice limit (~100–125 characters).
  - **Standard Formula:**  
    `[Concise Title] — commercial [category] post-production: [Step 1], [Step 2]`
  - **Zero Keyword Stuffing:** Never repeat words like "Retouching" or "Fashion" multiple times within the same alt tag.
- **Portfolio Titles (`it.t` in `work.html`):**
  - Keep titles punchy and elegant (3 to 5 words, under 40 characters).
  - Formula: `[Subject/Garment/Product] + [Service Keyword]` (e.g., *Tweed Sheath Dress Retouching*, *Skeleton Tourbillon Watch Retouching*, *Aristocracy Navy Blazer Packshot*).
- **Metadata & Headings:**
  - Maintain a strict heading hierarchy (`h1` > `h2` > `h3`).
  - Keep JSON-LD Schema markup valid (`ProfessionalService` / `Organization`).

---

### 3. Typography & Legibility Standards (টাইপোগ্রাফি ও ফন্ট সাইজ)
- **Minimum Font Sizes:**
  - Body text must never fall below 14px (recommended 15px–17px, line-height 1.5–1.7).
  - Secondary labels, tags, and subnav links must remain legible (minimum 13px–14px, never illegible 10px–11px).
- **Contrast & Readability:**
  - Maintain WCAG AA compliant contrast ratios against dark backgrounds (`#0a0a0a` / `#111111`) and light containers.
  - Use clear text tokens (primary text: `#f5f5f5` / `#ffffff`, muted text: `#a3a3a3` to `#d4d4d4`; avoid washed-out low-contrast gray `#555` or below).
- **Navigation & Subnav:**
  - Subnav pills and sticky navigation bars must never wrap awkwardly or clip at standard desktop resolutions (1280px, 1366px, 1440px) or mobile screens.

---

### 4. Layout, Responsiveness & Visual Quality (ডিজাইন ও রেসপনসিভনেস)
- **Zero Horizontal Overflow:**
  - All pages must have `overflowX: false` and `mobOverflow: false` across all device viewports (tested at 1440px desktop and 390px/375px mobile).
- **Zero Broken Links / Assets:**
  - Every image referenced in HTML, CSS, or JS must exist on disk.
  - Run verification scripts before finalizing any changes.
- **Responsive Views:**
  - In `work.html`, ensure both Grid View and List View display cleanly without layout shifts or uneven badge/text wrapping.

---

### 5. Development & Verification Workflow (ডেভেলপমেন্ট প্রসেস)
1. **Analyze First:** Inspect existing architecture and related scripts before modifying markup.
2. **Automated Verification:**
   - Run link checker (`check_links.mjs`) to verify 0 broken local references.
   - Run headless Chrome audit (`full_site_audit.mjs`) to verify 0 missing alt tags, 0 broken images, and 0 layout overflows.
3. **Commit & Push:**
   - Commit with clear semantic commit messages (e.g., `seo(...)`, `fix(...)`, `feat(...)`).
   - Push to `origin/main` only after full verification passes.
