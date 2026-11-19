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

---

### 6. Social Media Publishing & Approval Gate (সোশ্যাল মিডিয়া আপলোড ও অনুমোদন নীতি)
- **STRICT HUMAN APPROVAL GATE (কখনো সরাসরি অটো-আপলোড নয়):**
  - এআই এজেন্ট কখনোই নিজের থেকে সরাসরি ফেসবুক পেইজ, ইনস্টাগ্রাম বা অন্য কোনো সোশ্যাল মিডিয়া প্ল্যাটফর্মে কোনো কনটেন্ট, রিল বা পোস্ট আপলোড করবে না।
  - এজেন্ট কনটেন্ট/রিল/পোস্ট ডিজাইন করে প্রথমে ব্যবহারকারীকে চ্যাট বক্সে দেখাবে।
  - শুধুমাত্র ব্যবহারকারী যখন চ্যাট বক্সে ফাইনাল ফাইলটি দেবেন অথবা সুনির্দিষ্টভাবে কনফার্ম করে বলবেন যে *"এটা আমার এপ্রুভ করা ফাইনাল আউটপুট, পোস্ট করো"*—শুধুমাত্র তখনই সেটি প্রফেশনাল এসইও কপি ও ট্যাগসহ সোশ্যাল মিডিয়ায় আপলোড বা শিডিউল করা যাবে।
  - ব্যবহারকারীর স্পষ্ট ও চূড়ান্ত অনুমোদন ছাড়া কোনো এপিআই বা স্বয়ংক্রিয় ওয়েববুক ট্রিগার করা সম্পূর্ণ নিষিদ্ধ।

---

### 7. US/EU Algorithm Targeting & Reels Publishing Rules (ইউরোপ-আমেরিকা অডিয়েন্স টার্গেটিং নীতি)
রিলস ও সোশ্যাল পোস্টগুলো যেন সরাসরি মার্কিন যুক্তরাষ্ট্র ও ইউরোপীয় ফ্যাশন/কমার্শিয়াল বায়ারদের কাছে পৌঁছায়, সেজন্য পোস্টিংয়ের সময় নিচের নিয়মগুলো অলঙ্ঘনীয়ভাবে মেনে চলতে হবে:
1. **Zero External Link Penalty:** ফেসবুক ও ইনস্টাগ্রাম রিলসের মূল ক্যাপশনে কখনোই কোনো বাহ্যিক ওয়েবসাইটের লিংক (`http://...`) বা ইমেইল দেওয়া যাবে না। ক্যাপশন থাকবে ১০০% ক্লিন (হুক + ভ্যালু + এঙ্গেজমেন্ট প্রশ্ন + ৩-টিয়ার হ্যাশট্যাগ) যাতে মেটা অ্যালগরিদম ভিডিওটিকে কোনো পেনাল্টি ছাড়া সর্বোচ্চ অর্গানিক রিচ ও Explore ফিডে পাঠায়।
2. **Geotargeting Hubs:** লোকেশন ট্যাগিংয়ের ক্ষেত্রে সবসময় নিউ ইয়র্ক, লন্ডন, প্যারিস, মিলান বা লস অ্যাঞ্জেলেস (`New York, NY`, `SoHo, Manhattan`, `London, UK`) ব্যবহার করতে হবে। কখনোই কোনো লোকাল লোকেশন ট্যাগ করা যাবে না।
3. **Timezone Synchronization:** পোস্ট পাবলিশিং শিডিউল সবসময় ইউএস/ইউকে পিক বিজনেস আওয়ারের সাথে সিঙ্ক করে **বাংলাদেশ সময় সন্ধ্যা ৭:০০ PM – ৯:৩০ PM** (নিউ ইয়র্ক সকাল ৮:৩০ AM – ১১:০০ AM) নির্ধারণ করতে হবে।
4. **Audience Purity & Zero Bangla:** পাবলিক প্রোফাইল, ক্যাপশন, অন-স্ক্রিন টাইপোগ্রাফি এবং ট্যাগে ১০০% আন্তর্জাতিক ইংরেজি ভাষা বজায় রাখতে হবে। কোনো লোকাল ফ্রেন্ড ইনভাইটেশন বা লোকাল ফোন নম্বর দৃশ্যমান রাখা যাবে না।

---

### 8. Pinterest Marketing & Autonomous Traffic SOP (পিন্টারেস্ট মার্কেটিং ও অর্গানিক গ্রোথ)
- **Profile:** `Retoucher Shoaib | High-End Photo Retouching Studio` (`@retouchershoaib`). Website `retouchershoaib.com` is 100% Claimed & Verified.
- **Master SOP File:** All board repositories, SEO Pin copywriting templates, vertical image specs (2:3 / 1000x1500px), and daily 30-60 min autonomous routines are stored in `automation/PINTEREST_MARKETING_BRAIN.md`.
- **Target Boards:**
  1. `3D Ghost Mannequin & Apparel Retouching` -> Links to `ghost-mannequin-apparel-retouching-guide` / service.
  2. `Luxury Jewelry & Watch Retouching` -> Links to jewelry service / feed.
  3. `High-End Beauty & Editorial Skin Retouching` -> Links to beauty / skin retouching guide.
  4. `Social` -> Auto-synced from `@retouchershoaib` Instagram posts.
- **Autonomous Routine:** Whenever the user prompts in any chat to do Pinterest marketing ("Pinterest মার্কেটিং করো", "Create pins for ghost mannequin", etc.), the agent automatically reads `automation/PINTEREST_MARKETING_BRAIN.md`, opens Pinterest in the browser, designs high-intent vertical pins with direct `retouchershoaib.com` backlinks, optimizes rich pin SEO, and reports progress.
