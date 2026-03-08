# MVP-002: AI Image T&Cs Generator - Complete Specification

**Created:** 2025-03-08
**Task ID:** MVP-002
**Estimated Build Time:** 1-2 days (MVP), 3 days (polished)
**Priority:** High - Addresses clear market gap with minimal code

---

## Executive Summary

**Vision:** A micro-SaaS that generates legally-sound, AI-specific Terms & Conditions for image-based AI products (e.g., Stable Diffusion, DALL-E clones, face swap apps, AI image generators).

**Value Proposition:** Most T&C generators produce generic boilerplate that doesn't address critical AI-specific legal needs: training data rights, model weights protection, AI Act transparency, and generative AI licensing. This tool automatically includes these clauses based on the product type, customized through an intelligent questionnaire.

**Market Gap:** Research shows existing tools (Termly, iubenda, LuminPDF) lack AI-specific clauses. Users must manually edit templates, creating legal risk and time burden.

**Target Outcome:** Build once, sell to hundreds of AI image startups. Achieve $1k MRR within 60 days with 50-100 customers.

---

## 1. User Personas

### Persona 1: Indie AI Developer
**Name:** Alex
**Background:** Solo developer, built Stable Diffusion web UI clone, 100-500 daily active users
**Technical Level:** High (can self-host, API integration)
**Budget:** $0-50/month
**Pain Points:**
- No time to research legal requirements
- Can't afford lawyer ($3000+ for custom T&Cs)
- Worried about GDPR/AI Act compliance
- Needs clear IP ownership terms for generated images
- Uncertain about training data Obviousness

**Goals:**
- Generate professional T&Cs in minutes, not weeks
- Include AI-specific clauses automatically
- Stay compliant as AI Act regulations evolve (2025-2026)
- Protect model weights and training data rights
- Offer clear licensing terms to users

**Usage Pattern:** Signs up, answers 10-question wizard, downloads PDF, pays $19-49 one-time or subscribes for updates.

### Persona 2: Startup Founder (Seed Stage)
**Name:** Maya
**Background:** Co-founder of AI headshot generator startup, 5 employees, raised $1.5M seed
**Technical Level:** Medium (outsources dev, understands business needs)
**Budget:** $100-500/month
**Pain Points:**
- Needs comprehensive terms covering biometric data (GDPR special category)
- AI Act classification (likely "limited risk" but must comply)
- Must disclose synthetic media use
- User-generated content policies
- Liability disclaimers for image quality

**Goals:**
- Production-ready T&Cs vetted for AI/Image products
- Automatic compliance updates as laws change
- Multi-jurisdiction support (US, EU, UK)
- Custom clauses for commercial use, API terms
- Integration into onboarding flow via API

**Usage Pattern:** Subscribes to "Pro" plan ($99/mo), uses API to generate custom T&Cs per client/enterprise deal.

### Persona 3: Agency / Enterprise
**Name:** TechLaw Partners
**Background:** Law firm serving AI startups, needs to deliver T&Cs quickly to clients
**Technical Level:** Low (needs white-label, bulk generation)
**Budget:** $500-2000/month
**Pain Points:**
- Manual drafting is inefficient
- Must stay current with AI Act requirements
- Need to produce multiple versions for different clients
- Want to maintain firm branding
- Require audit trail and version history

**Goals:**
- Bulk generate T&Cs for multiple clients
- White-label PDF with firm branding
- API access to integrate into client portal
- Compliance certification reports
- Priority support

**Usage Pattern:** "Enterprise" plan ($499/mo) with unlimited generation, white-label, API access.

---

## 2. Problem Statement

**The Problem:** AI image product creators face unique legal requirements but existing T&C generators don't address them.

**Specific Pain:**
1. **Training Data:** Must disclose if user uploads/images are used for training (GDPR Art. 13, AI Act transparency)
2. **Model Weights:** Need to protect IP - prohibit reverse engineering, distillation, weight extraction
3. **Synthetic Media:** EU AI Act requires labeling AI-generated content (deepfakes, synthetic images)
4. **Biometric Data:** If facial recognition or face manipulation, GDPR special category data applies (explicit consent needed)
5. **Output Ownership:** Clarify who owns generated images - user, platform, or shared?
6. **Liability:** Limit liability for AI-generated content (misrepresentation, copyright infringement, deepfake misuse)
7. **Compliance Updates:** AI Act phased enforcement (2025-2026) means T&Cs need periodic updates

**Current Workarounds:**
- Copy/paste from competitors (risky, non-compliant)
- Hire expensive lawyer ($3000-10000)
- Use generic generators and manually edit (time-consuming, may miss critical clauses)
- Ignore compliance (legal risk, investor due diligence fails)

**Market Size:** Thousands of AI image startups globally. 500+ active AI image SaaS products on Product Hunt alone. Addressable market: $5-10M/year in legal tech SaaS for AI companies.

---

## 3. Solution Overview

**Core Idea:** A wizard-driven T&C generator that asks product-specific questions and produces legally-vetted templates with AI-specific clauses automatically included.

**How It Works:**
1. User answers 10-15 multiple-choice questions about their AI image product
2. System selects appropriate template clauses based on answers
3. AI (via OpenRouter) refines language to match user's business description
4. Generates PDF + HTML version with proper formatting
5. Highlights AI Act requirements and GDPR compliance items
6. Optional subscription for automatic updates when laws change

**Key Differentiators:**
- **AI-specific clauses** out-of-the-box (training data, model weights, synthetic labeling)
- **Compliance-by-design** built for AI Act + GDPR
- **One-time or subscription** billing (Polar integration)
- **API access** for embedding in onboarding flows
- **Update service** - send new versions when regulations change
- **Multi-jurisdiction** - US, EU (GDPR), UK, Canada

**Not a Replacement for Legal Advice:** Clear disclaimer that tool generates templates, not legal advice. Suggest consultation for high-risk/complex cases.

---

## 4. MVP Scope & Core Features

### Phase 1: MVP (Day 1-2) - "Launch-Ready"

#### Must Have (Build These First)

1. **User Authentication** (Reuse BetterAuth)
   - Email/password sign-up
   - Google OAuth
   - Protected routes for document management
   - Account dashboard

2. **Wizard/Questionnaire** (5 key questions)
   - Product type: Image generator / Face swap / Style transfer / Other
   - Data sources: User uploads / Public datasets / Synthetic only
   - Biometric data: Yes/No (faces, fingerprints, etc.)
   - Commercial use allowed: Yes/No
   - API access: Yes/No (adds API Terms)
   - Storage location: US/EU/Other (GDPR implications)

3. **Document Generation Engine**
   - Template system with clause selection logic
   - PDF generation (use CraftMyPDF API or pdfkit)
   - HTML preview
   - Basic customization: company name, URL, contact email
   - Download as PDF/HTML

4. **Clause Library** (AI-specific focus)
   - Training Data License clause
   - Model Weights Protection clause (no reverse engineering)
   - Synthetic Media Disclosure (AI Act Art. 52)
   - Biometric Data Processing (GDPR Art. 9)
   - Output Ownership (user vs platform)
   - API Terms (if applicable)
   - Standard clauses: Liability, indemnification, governing law

5. **Payment Integration** (Reuse Polar)
   - One-time purchase: $29 (Basic), $79 (Pro with multi-jurisdiction)
   - Subscription: $29/mo (updates + unlimited generation)
   - Free trial: 1 document with watermark
   - Webhook handling for payment events
   - Customer portal (via Polar)

6. **Document Management**
   - View past generated documents
   - Re-download PDFs
   - Create new version (increment revision)
   - Simple version history (last 5)

7. **Responsive UI** (Reuse Tailwind components)
   - Modern dark/light mode
   - Mobile-friendly wizard
   - Clean dashboard
   - Loading states, error handling

#### Nice to Have (Day 3 Polish)

8. **Advanced Features**
   - Custom clause editor with AI suggestions
   - Multi-language support (English only in MVP, add EU languages v2)
   - Compliance checklist (GDPR, AI Act, CCPA)
   - Comparison view (before/after AI clauses)
   - Shareable link for lawyer review

9. **API Access** (Pro/Enterprise)
   - REST endpoint: POST /api/generate with JSON payload
   - Webhook for generation completion
   - API key management
   - Rate limiting

10. **Admin Dashboard** (Internal)
    - View all generated documents (PII redacted)
    - Bulk export usage data
    - Template editor (JSON editor for clauses)
    - Update notification system

---

## 5. Technical Architecture

### System Diagram

```
┌─────────────────┐
│   Next.js App   │ (Reuse existing app router structure)
│   (Port 3000)   │
└────────┬────────┘
         │
    ┌────┴────┐
    │ Auth    │ (BetterAuth - already configured)
    └────┬────┘
         │
    ┌────┴─────────────────────────────┐
    │  App Routes                      │
    │  - / (landing)                   │
    │  - /app/dashboard               │
    │  - /app/wizard                  │
    │  - /app/documents               │
    └────┬─────────────────────────────┘
         │
    ┌────┴─────────────────────────────┐
    │  API Routes                      │
    │  - /api/generate (POST)         │ ← Core generation
    │  - /api/documents (GET/POST)    │ ← CRUD
    │  - /api/polar/webhook (POST)    │ ← Payment events
    └────┬─────────────────────────────┘
         │
    ┌────┴─────────────────────────────┐
    │  lib/                            │
    │  - tcs-generator.ts              │ ← Clause selection + AI refinement
    │  - templates/                    │ ← JSON template files
    │  - pdf-generator.ts              │ ← PDF creation
    │  - compliance-checker.ts         │ ← GDPR/AI Act validation
    └────┬─────────────────────────────┘
         │
    ┌────┴─────────────────────────────┐
    │  Database (PostgreSQL)           │ (Reuse Neon DB)
    │  Tables:                         │
    │  - users (BetterAuth)            │
    │  - accounts (BetterAuth)         │
    │  - sessions (BetterAuth)         │
    │  - verifications (BetterAuth)    │
    │  - tcs_documents (NEW)           │
    │  - tcs_clauses (NEW)             │
    │  - user_answers (NEW)            │
    └──────────────────────────────────┘
```

### 5.1 Tech Stack (Reuse Existing Boilerplate)

**Frontend:**
- Next.js 15 (App Router) ✓
- React 18 + TypeScript ✓
- Tailwind CSS ✓
- Next Themes (dark/light mode) ✓
- shadcn/ui components (buttons, cards, forms) ✓

**Backend:**
- Next.js API Routes ✓
- BetterAuth (authentication) ✓
- Zod (validation) ✓

**Database:**
- Neon PostgreSQL (serverless) ✓
- better-sqlite3 fallback for local dev ✓

**Payments:**
- Polar SDK ✓
- Webhook handling ✓

**AI:**
- OpenRouter API (access to Claude/GPT for clause refinement)
- Cost: ~$0.002 per generation (negligible)

**Document Generation:**
Option A (MVP): CraftMyPDF API - free tier, REST API, easy
Option B (V2): Custom HTML→PDF with puppeteer/playwright
Option C (Simple): pdfkit (node library) - no external API

**Monitoring:**
- Sentry ✓
- Plausible Analytics ✓

**Deployment:**
- Vercel ✓
- Inngest for cron (compliance update checks) ✓

---

## 6. Database Schema (Extend Existing)

Add these tables to the existing Neon DB:

```sql
-- T&C Documents generated by users
CREATE TABLE tcs_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL, -- references users.id (BetterAuth)
  title TEXT NOT NULL,
  product_description TEXT,
  answers JSONB NOT NULL, -- wizard responses
  jurisdiction TEXT NOT NULL DEFAULT 'US', -- US, EU, UK, CA
  version INTEGER DEFAULT 1,
  status TEXT DEFAULT 'draft', -- draft, final, archived
  pdf_url TEXT, -- S3/Cloudflare R2 URL
  html_content TEXT, -- rendered HTML for preview
  ai_refined BOOLEAN DEFAULT false, -- whether AI touched the language
  generation_cost_cents INTEGER DEFAULT 0, -- OpenRouter cost
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_tcs_documents_user_id ON tcs_documents(user_id);
CREATE INDEX idx_tcs_documents_generated_at ON tcs_documents(generated_at);

-- Clause library (infrequently edited by admin)
CREATE TABLE tcs_clauses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clause_key TEXT UNIQUE NOT NULL, -- e.g., 'training_data_license'
  title TEXT NOT NULL,
  category TEXT NOT NULL, -- 'ai_specific', 'privacy', 'liability', 'standard'
  content_en_us TEXT NOT NULL,
  content_eu_gdpr TEXT, -- jurisdiction variants
  content_uk TEXT,
  content_ca TEXT,
  conditions JSONB, -- when this clause applies (rules)
  is_required BOOLEAN DEFAULT false, -- must include if condition matches
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store user's wizard answers for reference/audit
CREATE TABLE user_tcs_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL,
  question_key TEXT NOT NULL,
  answer_value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (document_id) REFERENCES tcs_documents(id) ON DELETE CASCADE
);

-- Compliance checklist results
CREATE TABLE tcs_compliance_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL,
  jurisdiction TEXT NOT NULL,
  gdpr_articles TEXT[], -- array of GDPR articles addressed
  ai_act_articles TEXT[], -- array of AI Act articles
  missing_items JSONB, -- checklist of what's missing
  overall_status TEXT DEFAULT 'review', -- compliant, non_compliant, review
  checked_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (document_id) REFERENCES tcs_documents(id) ON DELETE CASCADE
);
```

**Migrations:** Add to `src/lib/subscription-schema.ts` or create separate migration file `src/lib/tcs-schema.ts`.

---

## 7. Lightning-Fast Implementation Plan (3 Days)

### **Day 1: Foundation & Core Engine**

**Morning (4 hours):**
- [ ] Create database schema (run migration)
- [ ] Build clause library JSON (20-30 clauses)
- [ ] Set up AI service lib (`src/lib/tcs-generator.ts`)
- [ ] Implement wizard form (React Hook Form + Zod validation)
- [ ] Create document preview component

**Afternoon (4 hours):**
- [ ] Build PDF generation endpoint
- [ ] Implement document CRUD API routes
- [ ] Add Polar product configuration (one-time $29, $79)
- [ ] Basic dashboard UI (list documents, create new)
- [ ] Test full flow: wizard → generate → download

**Day 1 Target:** Can generate and download a basic T&C PDF with 5 key clauses.

---

### **Day 2: AI Integration & Polish**

**Morning (4 hours):**
- [ ] Integrate OpenRouter for clause refinement
- [ ] Add compliance checking (GDPR/AI Act rules engine)
- [ ] Implement multi-jurisdiction templates (US, EU, UK)
- [ ] Add clause selection logic (conditional inclusion)
- [ ] Build admin template editor (simple JSON editor UI)

**Afternoon (4 hours):**
- [ ] Polish UI (loading states, errors, success states)
- [ ] Add PDF watermark for free tier
- [ ] Implement payment flow via Polar Checkout
- [ ] Test payment + webhook + document unlock
- [ ] Mobile responsive testing

**Day 2 Target:** Fully functional MVP with payments, AI refinement, compliance checks.

---

### **Day 3: Launch Prep**

**Morning (4 hours):**
- [ ] Write documentation (README, API docs)
- [ ] Add unit tests for critical functions (clause selection, PDF gen)
- [ ] Implement rate limiting (20 docs/month free)
- [ ] Add Sentry error tracking
- [ ] Performance audit (Lighthouse >90)

**Afternoon (4 hours):**
- [ ] Deploy to Vercel (staging)
- [ ] End-to-end testing with real users (friends/alpha)
- [ ] Fix critical bugs
- [ ] Prepare launch assets (Product Hunt, Twitter)
- [ ] Set up analytics tracking (Plausible events)
- [ ] Create memory/tasks-log.md completion entry

**Day 3 Target:** MVP deployed, tested, ready for public beta launch.

---

## 8. Wireframes (Text Descriptions)

### Page 1: Landing Page (/)
```
┌─────────────────────────────────────────────────────────────┐
│  Logo "T Cs Generator for AI Products"                     │
│  [Start Free] [View Examples]                              │
├─────────────────────────────────────────────────────────────┤
│  Headline: "Generate AI-compliant Terms & Conditions       │
│  in 5 minutes"                                             │
│  Subhead: "Built for image AI startups. Includes GDPR,    │
│  AI Act, and training data clauses out of the box."       │
│                                                             │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐           │
│  │ ✅ AI-     │ │ ✅ GDPR &  │ │ ✅ One-time│           │
│  │   specific │ │   AI Act  │ │   or       │           │
│  │   clauses  │ │   ready   │ │   subscribe│           │
│  └────────────┘ └────────────┘ └────────────┘           │
│                                                             │
│  How It Works:                                             │
│  1. Answer questions about your AI image product          │
│  2. AI generates customized T&Cs                          │
│  3. Download PDF or use API                               │
│                                                             │
│  [Get Started - It's Free]                                │
└─────────────────────────────────────────────────────────────┘
```

### Page 2: Wizard (/app/wizard)
```
┌─────────────────────────────────────────────────────────────┐
│  [← Back to Dashboard]                                    │
├─────────────────────────────────────────────────────────────┤
│  Generate New Document                                    │
│  ──────────────────────────────────────────              │
│  Step 2 of 6                                              │
│  [●○○○○○]                                                 │
│                                                             │
│  Question: What type of AI image product do you build?   │
│  ┌──────────────────────────────────────────────┐        │
│  │ ○ AI Image Generator (text-to-image)        │        │
│  │ ○ Face Swap / Deepfake Tool                 │        │
│  │ ○ Style Transfer / Avatar Generator         │        │
│  │ ○ Background Removal / Enhancement          │        │
│  │ ○ Other (specify) ________________         │        │
│  └──────────────────────────────────────────────┘        │
│  [← Previous]                    [Next →]                │
└─────────────────────────────────────────────────────────────┘
```

### Page 3: Dashboard (/app/dashboard)
```
┌─────────────────────────────────────────────────────────────┐
│  [User Avatar] [Name] | [Account] | [Logout]              │
├─────────────────────────────────────────────────────────────┤
│  My Documents                                             │
│  ┌──────────────────────────────────────────────┐        │
│  │ ✅ My AI Image T&Cs (Final)      | EU    | 2d ago│  │
│  │    📄 pdf                          ⬇ Download│        │
│  │                                     ✏ Edit   │        │
│  ├──────────────────────────────────────────────┤        │
│  │ Draft: FaceSwap App Terms        | US    | 1h ago│  │
│  │    📄 pdf                          ⬇ Download│        │
│  │                                     ✏ Edit   │        │
│  └──────────────────────────────────────────────┘        │
│                                                             │
│  [Generate New Document]                                  │
│                                                             │
│  Subscription: Pro Plan ($29/mo)                          │
│  Next billing: Apr 15 | 15 docs remaining                │
└─────────────────────────────────────────────────────────────┘
```

### Page 4: Admin Template Editor (Internal)
```
┌─────────────────────────────────────────────────────────────┐
│  Clause Library                                            │
├─────────────────────────────────────────────────────────────┤
│  Filter: [All ▼] [AI-Specific ▼] [Privacy ▼]             │
│                                                             │
│  ┌────────────────────────────────────────────────┐       │
│  │ training_data_license                          │       │
│  │ Category: AI-Specific                         │       │
│  │ Required if: user_upload_data == true         │       │
│  │                                                 │       │
│  │ When you upload images to our service, you    │       │
│  │ grant us a perpetual, irrevocable, royalty-   │       │
│  │ free license to use that data for AI model    │       │
│  │ training...                                    │       │
│  │                                                 │       │
│  │ [Edit] [Preview] [Delete]                     │       │
│  └────────────────────────────────────────────────┘       │
│                                                             │
│  [Add New Clause]                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. Core Data Models

### TypeScript Types

```typescript
// src/types/tcs.ts

export type Jurisdiction = 'US' | 'EU' | 'UK' | 'CA';

export type ProductType = 
  | 'image_generator'
  | 'face_swap'
  | 'style_transfer'
  | 'enhancement'
  | 'other';

export type BiometricData = 'yes' | 'no';

export type CommercialUse = 'allowed' | 'prohibited' | 'restricted';

export interface WizardAnswers {
  productType: ProductType;
  productDescription: string;
  usesUserUploads: boolean;
  biometricData: BiometricData;
  commercialUse: CommercialUse;
  hasAPI: boolean;
  dataStorageLocation: 'US' | 'EU' | 'other';
  targetAudience: 'general' | 'enterprise' | 'both';
  companyName: string;
  companyUrl: string;
  contactEmail: string;
}

export interface TcsDocument {
  id: string;
  userId: string;
  title: string;
  answers: WizardAnswers;
  jurisdiction: Jurisdiction;
  version: number;
  status: 'draft' | 'final' | 'archived';
  pdfUrl?: string;
  htmlContent: string;
  aiRefined: boolean;
  generationCostCents: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Clause {
  id: string;
  key: string;
  title: string;
  category: 'ai_specific' | 'privacy' | 'liability' | 'standard';
  content: Record<Jurisdiction, string>;
  conditions: Record<string, any>;
  isRequired: boolean;
}

export interface ComplianceCheck {
  gdprArticles: string[];
  aiActArticles: string[];
  missingItems: {
    requiredClauses: string[];
    disclosures: string[];
  };
  overallStatus: 'compliant' | 'non_compliant' | 'review';
}
```

---

## 10. API Endpoints

### Public (Authenticated)

#### `GET /api/documents`
List user's generated documents
- Query: `?page=1&limit=20`
- Response: `{ documents: TcsDocument[], total: number }`

#### `POST /api/documents`
Generate new document
- Body: `WizardAnswers`
- Returns: `{ document: TcsDocument }`
- Creates draft, starts PDF generation
- Rate limit: 20/month free, unlimited paid

#### `GET /api/documents/[id]`
Get single document details
- Response: `{ document: TcsDocument }`

#### `POST /api/documents/[id]/generate-pdf`
Trigger PDF generation (async)
- Response: `{ document: TcsDocument, pdfUrl: string }`

#### `DELETE /api/documents/[id]`
Delete document (soft delete to null pdfUrl)

#### `POST /api/documents/[id]/upgrade`
Upgrade to Pro (via Polar checkout)
- Redirects to Polar checkout

---

### Admin (Secret Token Protected)

#### `GET /api/admin/clauses`
List all clauses (for editor)

#### `PUT /api/admin/clauses/[id]`
Update clause content

#### `POST /api/admin/clauses`
Create new clause

#### `GET /api/admin/documents`
List all documents (PII redacted)

---

### Webhooks

#### `POST /api/polar/webhook`
Handle Polar events:
- `checkout.completed` → unlock document features
- `subscription.created` → grant unlimited generation
- `subscription.canceled` → revert to free tier

---

## 11. Clause Library (Seed Data)

### AI-Specific Clauses (Essential)

**1. Training Data License** (`training_data_license`)
```json
{
  "key": "training_data_license",
  "title": "Training Data License",
  "category": "ai_specific",
  "content": {
    "US": "When you upload or provide content to our Service, you grant us a perpetual, irrevocable, royalty-free, worldwide license to use, modify, and create derivative works from such content solely for the purpose of training, improving, and operating our AI models. You retain ownership of your content but waive any moral rights. We will not sell your content to third parties.",
    "EU": "When you upload or provide content to our Service, you grant us a lawful basis under GDPR Article 6(1)(f) (legitimate interests) to process your personal data for AI model training. You may withdraw consent at any time via [email], which will cease future processing but does not affect past model training. We conduct legitimate interest assessments (LIA) and implement appropriate safeguards including pseudonymization and data minimization.",
    "UK": "Similar to EU with UK GDPR references"
  },
  "conditions": { "usesUserUploads": true },
  "isRequired": true
}
```

**2. Model Weights Protection** (`model_weights_protection`)
```json
{
  "key": "model_weights_protection", 
  "title": "Model Weights and IP Protection",
  "category": "ai_specific",
  "content": {
    "US": "Our AI models, including weights, parameters, architecture, and training code, are proprietary intellectual property. Reverse engineering, distillation, model extraction, or unauthorized access is strictly prohibited. You may only access models via our provided API endpoints. Violation constitutes IP infringement and may result in immediate termination and legal action.",
    "EU": "In addition to the above, we maintain trade secret protection under EU Directive (EU) 2016/943. Unauthorized obtaining or use of our model weights constitutes misappropriation of trade secrets."
  },
  "conditions": { "hasModel": true },
  "isRequired": true
}
```

**3. Synthetic Media Disclosure** (`synthetic_media_disclosure`)
```json
{
  "key": "synthetic_media_disclosure",
  "title": "Synthetic Media Disclosure (AI Act Art. 52)",
  "category": "ai_specific", 
  "content": {
    "US": "Images generated by our service may contain synthetic or AI-generated content. We clearly label such outputs when technically feasible. Users are responsible for disclosing AI generation when publishing images, especially for editorial, advertising, or political content, in accordance with applicable law (e.g., proposed NO FAKES Act).",
    "EU": "In accordance with EU AI Act Article 52, when our system generates synthetic media (deepfakes) or manipulates existing content, we will: (1) disclose in a machine-readable format that the content is AI-generated, and (2) provide clear opportunities for users to declare their intent to generate such content. This transparency measure helps users comply with their own obligations under the AI Act."
  },
  "conditions": { 
    "or": [{ "productType": "face_swap" }, { "syntheticMedia": true }] 
  },
  "isRequired": false
}
```

**4. Biometric Data Processing** (`biometric_data_processing`)
```json
{
  "key": "biometric_data_processing",
  "title": "Biometric Data Processing (GDPR Art. 9)",
  "category": "privacy",
  "content": {
    "US": "If our service processes facial images or other biometric data, we comply with applicable state laws (e.g., Illinois BIPA, CCPA). We obtain explicit, opt-in consent before processing biometric data, store it separately, and delete it upon request. Biometric data is never sold.",
    "EU": "Processing of biometric data for uniquely identifying natural persons constitutes special category data under GDPR Article 9(1). We rely on explicit consent under Article 9(2)(a). You must provide explicit, separate consent via granular options before uploading facial images. You may withdraw consent at any time, which will delete your data within 30 days."
  },
  "conditions": { "biometricData": "yes" },
  "isRequired": true
}
```

**5. Output Ownership & License** (`output_ownership`)
```json
{
  "key": "output_ownership",
  "title": "Output Ownership and License",
  "category": "ai_specific",
  "content": {
    "US": "You own all right, title, and interest in the images generated from your prompts, subject to our pre-existing rights in the AI model. You receive a worldwide, royalty-free, perpetual license to use outputs for any legal purpose, including commercial use. However, outputs may contain elements derived from training data; you are responsible for ensuring outputs do not infringe third-party rights.",
    "EU": "In accordance with EU AI Act Article 28(1), you as the user are considered the 'deployer' and own the outputs. Our service acts as 'provider' of the AI system. You must respect intellectual property rights and may need to disclose AI involvement when publishing (see Synthetic Media clause).}"
  },
  "conditions": {},
  "isRequired": true
}
```

**6. API Terms** (`api_terms`) - if hasAPI=true
```json
{
  "key": "api_terms",
  "title": "API Terms of Service",
  "category": "standard",
  "content": {
    "US": "API access is provided subject to rate limits, authentication requirements, and acceptable use policies. Programmatic access may require separate API key. You are responsible for securing your API credentials and any data transmitted through the API. We reserve the right to suspend API access for abuse or non-payment."
  },
  "conditions": { "hasAPI": true },
  "isRequired": false
}
```

### Standard Clauses (Reuse boilerplate)

**Liability Limitation** (`liability_limitation`)
**Indemnification** (`indemnification`)
**Governing Law** (`governing_law`) - based on jurisdiction
**Dispute Resolution** (`dispute_resolution`)
**Service Modifications** (`service_modifications`)
**User Conduct** (`user_conduct`)
**Privacy Policy Reference** (`privacy_policy`)

*(Use existing standard clauses from boilerplate)*

---

## 12. Compliance & Legal Considerations

### 12.1 GDPR Compliance

**Key Requirements Addressed:**

1. **Article 13/14 - Information to Data Subjects**
   - Clearly disclose data collection purposes (training, service improvement)
   - Data retention periods (e.g., "prompts retained for 24 months for training")
   - Data sharing (no sale, limited to service providers)
   - User rights (access, rectification, erasure, portability)

2. **Article 6 - Lawful Basis**
   - For free tier: Legitimate interest + explicit consent for sensitive data
   - For paid tier: Contract performance + consent for marketing
   - Consent must be granular, revocable

3. **Article 9 - Special Category Data** (Biometrics)
   - Explicit, opt-in consent required
   - Separate from general terms
   - Right to withdraw at any time
   - High-risk processing → DPIA required (we provide guidance)

4. **Data Protection Impact Assessment (DPIA)**
   - Guide users to conduct their own DPIA if processing high-risk data
   - Provide template DPIA questions in admin resources
   - Document our own DPIA for the service

5. **Data Minimization & Purpose Limitation**
   - Only collect necessary data (name, email, prompts)
   - Retention periods clearly stated (e.g., 24 months for training, then deletion)
   - Anonymization for analytics

6. **International Data Transfers**
   - If dataStorageLocation=EU, host in EU region (Neon EU)
   - If US, use Standard Contractual Clauses (SCCs) with subprocessors
   - Provide Data Processing Addendum (DPA) upon request

### 12.2 EU AI Act Compliance

**Risk Classification for AI Image Products:**
- **General image generators:** Typically "limited risk" (transparency obligations)
- **Face recognition/modification:** Potentially "high-risk" (biometric classification)
- **Deepfake/synthetic media:** "Limited risk" with specific transparency requirements

**Obligations We Help Clients Meet:**

1. **Article 52 - Transparency Obligations**
   - Mandatory disclosure when interacting with AI
   - Synthetic media labeling (visible or machine-readable)
   - Include synthetic disclosure clause automatically when applicable

2. **Article 13 - Data and Governance** (for high-risk systems)
   - Provide guidance on training data documentation
   - Help users complete technical documentation (Annex IV)
   - Encourage data quality and bias mitigation practices

3. **Technical Documentation** (Annex IV)
   - Generate template compliance appendix
   - Include fields for: model architecture, training data sources, performance metrics, risk assessments

4. **Human Oversight**
   - Recommend human review workflows for high-risk use cases
   - Include clause on user responsibility for human oversight

**Phased Enforcement (2025-2026):**
| Date | Obligation | Our Service Impact |
|------|------------|-------------------|
| Feb 2025 | Prohibited AI practices | None (not targeting) |
| Aug 2025 | Limited risk transparency | Synthetic media clauses ready |
| Aug 2026 | High-risk requirements | Biometric clauses + compliance toolkit |

**Strategy:** Build clauses now, add compliance update notifications via email/Inngest.

### 12.3 Other Jurisdictions

- **CCPA/CPRA (California):** Include "Do Not Sell" language, data deletion rights
- **HIPAA (Healthcare):** If medical images, need BAA (offer as add-on)
- **COPPA (Children):** Age gate + parental consent clause if targeting <13
- **CAN-SPAM:** Clear unsubscribe, physical address in emails

### 12.4 Disclaimers & Limitation of Liability (Critical!)

```markdown
NOT LEGAL ADVICE: This service provides template documents prepared from general guidelines. We are not a law firm and do not provide legal advice. Your use of these templates does not create an attorney-client relationship. You are solely responsible for ensuring your terms comply with all applicable laws and regulations. For complex or high-risk applications, consult a qualified attorney.

NO WARRANTY: Documents are provided "as is" without warranties of any kind, including merchantability, fitness for a particular purpose, or accuracy. We do not guarantee that generated terms will be legally enforceable or protect you from liability.

LIABILITY LIMIT: Our total liability arising from these documents shall not exceed the amount you paid us in the past 12 months.
```

**Implementation:** Display prominently before checkout and in footer of downloaded PDFs.

---

## 13. 3-Day Implementation Plan (Detailed)

### **Prerequisites (Before Day 1)**

- [x] Existing Next.js boilerplate already set up (✓ confirmed)
- [x] Polar account created with test mode enabled
- [x] Neon database provisioned (or use local SQLite)
- [x] OpenRouter API key obtained
- [x] BetterAuth configured (Google OAuth + email)

**Setup Tasks (1 hour):**
1. Create Polar products in dashboard:
   - "Basic One-time" ($29) - single document, US only
   - "Pro One-time" ($79) - multi-jurisdiction
   - "Pro Subscription" ($29/mo) - unlimited + updates
2. Create `.env.local` with: `POLAR_CLIENT_ID`, `POLAR_CLIENT_SECRET`, `OPENROUTER_API_KEY`
3. Create database tables: `tcs_documents`, `tcs_clauses`, `user_tcs_answers`, `tcs_compliance_checks`
4. Seed `tcs_clauses` table with 30 clauses (copy from section 11)

---

### **Day 1: Core Generation Engine**

**Block 1 (2 hours): Wizard & Answers**
- [ ] Create `src/components/wizard/WizardForm.tsx`
  - Multi-step form with 6 pages
  - React Hook Form + Zod validation
  - Store answers in React state, send to API on complete
- [ ] Define Zod schema for `WizardAnswers`
- [ ] Create navigation: Previous/Next buttons, progress bar
- [ ] Save draft answers to `user_tcs_answers` every step

**Block 2 (2 hours): Clause Selection Logic**
- [ ] Create `src/lib/tcs-generator.ts`
  - Function `selectClauses(answers: WizardAnswers): Clause[]`
  - Filter clauses by conditions (JSON logic)
  - Ensure required clauses are included
  - Prioritize jurisdiction-specific versions
- [ ] Unit test with sample answers

**Block 3 (2 hours): HTML Rendering + Preview**
- [ ] Create `src/components/preview/DocumentPreview.tsx`
  - Render clauses as formatted HTML
  - Insert dynamic fields (company name, date)
  - Show jurisdiction header/footer
- [ ] Create `src/lib/template-renderer.ts`
  - Function `renderHtml(document: TcsDocument): string`
  - Use simple string replacement or EJS-like syntax
  - Include basic CSS styling (reuse Tailwind classes)

**Block 4 (2 hours): Document CRUD**
- [ ] API `POST /api/documents` → save draft
- [ ] API `GET /api/documents` → list
- [ ] API `GET /api/documents/[id]` → details + HTML render
- [ ] Dashboard page `/app/documents` → list cards
- [ ] Test end-to-end: form submission → draft created → preview works

**End of Day 1 Deliverable:** Can create a draft document with HTML preview, saved to DB, visible in dashboard.

---

### **Day 2: AI Enhancement & PDF Generation**

**Block 1 (2 hours): PDF Generation**
- [ ] Research CraftMyPDF API or pdfkit
  - Recommended: CraftMyPDF (free tier, template-based)
  - Alternative: @react-pdf/renderer (pure JS, no external deps but slower)
- [ ] Implement `src/lib/pdf-generator.ts`
  - Function `generatePdf(document: TcsDocument): Promise<Buffer>`
  - Convert HTML → PDF (use CraftMyPDF template upload first, then convert)
  - Upload to Cloudflare R2 or AWS S3 (use existing Vercel Blob storage?)
  - Return public URL
- [ ] For MVP simplicity: Generate PDF client-side using `window.print()` to PDF with print styles
  - Pros: Free, no server cost
  - Cons: Lower quality, manual step
  - **Decision:** Use `window.print()` for MVP to save time. Upgrade to server PDF in V2.

**Block 2 (2 hours): OpenRouter Integration**
- [ ] Create `src/lib/ai-refiner.ts`
  - Function `refineClause(clause: Clause, context: string): Promise<string>`
  - Prompt engineering: "Rewrite this legal clause to be clearer while maintaining legal precision for an AI image startup..."
  - Use OpenRouter with Claude Haiku (cheap, fast)
  - Cost estimate: $0.0002 per clause, 10 clauses = $0.002 per document
- [ ] Store refinement in `tcs_documents.ai_refined`
- [ ] Cache refinements to avoid re-generating same clauses

**Block 3 (2 hours): Compliance Checker**
- [ ] Create `src/lib/compliance-checker.ts`
  - Function `checkCompliance(document: TcsDocument): ComplianceCheck`
  - Rule-based: Does document contain required clauses?
  - Check: biometricData === 'yes' → has biometric clause? Yes/No
  - Check: syntheticMedia → has disclosure clause?
  - Check: jurisdiction EU → GDPR articles referenced?
  - Return missing items list with suggestions
- [ ] Display compliance status in dashboard (pass/warning/fail)

**Block 4 (2 hours): Polar Integration**
- [ ] Create Polar products (already done in prep)
- [ ] Implement checkout:
  - Free tier: Generate draft → Complete → Show "Upgrade to download"
  - Paid: Generate draft → Click Upgrade → Polar Checkout → webhook → unlock
- [ ] Webhook handler `/api/polar/webhook`
  - Verify signature
  - Update user's subscription status (store in DB or use BetterAuth metadata)
  - Unlock document for download
- [ ] Customer portal link (Polar-hosted)
- [ ] Test full payment flow in Polar sandbox

**End of Day 2 Deliverable:** Complete generation → download PDF (via print) for paid users. Polar payments working.

---

### **Day 3: Polish & Launch**

**Block 1 (2 hours): Admin & Template Editor**
- [ ] Create admin page `/app/admin/clauses` (protected by RATE_LIMIT_ADMIN_SECRET)
  - Table view of clauses
  - JSON editor (use react-json-view or simple textarea)
  - Save button → PUT /api/admin/clauses/[id]
- [ ] Add seed script for initial clauses (can re-run to reset)
- [ ] Test editing a clause, regenerating document with updated content

**Block 2 (2 hours): Rate Limiting & Quotas**
- [ ] Implement custom rate limiter (reuse existing `rate-limiter-flexible`)
  - Free users: 3 documents/month
  - Pro subscription: unlimited
  - Store in Redis (Upstash) or use in-memory with TTL (simple for MVP)
- [ ] Show quota remaining in dashboard
- [ ] Upgrade nudge when at limit

**Block 3 (2 hours): Testing & Bug Fixes**
- [ ] Unit tests:
  - `clause-selector.test.ts` - test all condition combinations
  - `compliance-checker.test.ts` - test required clause detection
- [ ] E2E test (manual):
  - Sign up → wizard → generate draft → upgrade → download
  - Test EU jurisdiction with biometric data → verify clauses present
- [ ] Fix any broken PDF formatting (print styles in preview)
- [ ] Mobile responsiveness check

**Block 4 (2 hours): Documentation & Deployment**
- [ ] Write API docs in README.md
- [ ] Deploy to Vercel (production)
  - Add env vars
  - Configure domain
  - Enable production branch deployments
- [ ] Set up Plausible analytics events:
  - `document_generated`
  - `payment_completed`
  - `wizard_completed`
- [ ] Prepare launch:
  - Product Hunt page (draft)
  - Twitter announcement thread (draft)
  - Indie Hackers post (draft)
- [ ] Add completion entry to `/data/workspace/memory/tasks-log.md`

**End of Day 3 Deliverable:** MVP deployed, tested, launch-ready.

---

## 14. Success Metrics (MVP Launch)

**Technical KPIs:**
- [ ] End-to-end generation < 30 seconds (wizard to PDF)
- [ ] 99% uptime (Sentry monitoring)
- [ ] Lighthouse score > 90
- [ ] < 10% document generation error rate
- [ ] PDF generation cost < $0.01 per doc

**Business KPIs (Week 1-4):**
- [ ] 50+ signups (free tier)
- [ ] 10+ documents generated
- [ ] 3+ paying customers ($100+ MRR)
- [ ] Customer feedback score > 4/5
- [ ] 0% revenue churn (retain all paying customers)

**Stretch Goals (Month 2):**
- [ ] $1k MRR
- [ ] API usage by 5+ customers
- [ ] 100+ documents generated total
- [ ] 20+ paying customers

---

## 15. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Legal liability from user relying on T&Cs | Low | High | **Clear disclaimers**: "Not legal advice", "Consult attorney". Suggest lawyer review. |
| Generic AI output not precise enough | Medium | Medium | Fine-tune prompts, provide manual edit mode, accept clause-level editing |
| Payment integration bugs | Low | Medium | Test Polar sandbox thoroughly, handle webhooks idempotently |
| Low user adoption | Medium | High | Validate with 10 beta users before full launch; iterate based on feedback |
| Compliance rules change (AI Act) | Medium | Medium | Build update notification system (email + admin dashboard) |
| Competitor copies and undercuts | Medium | Medium | First-mover advantage; focus on AI-specific depth; build community |
| AI API costs exceed revenue | Low | Medium | Cache refinements, monitor costs daily, switch to cheaper model if needed |
| Database schema changes mid-build | Low | Medium | Finalize schema before Day 1; avoid schema changes in Day 2-3 |

---

## 16. Post-MVP Roadmap (V2-V3)

**V2 (Week 4-6):**
- [ ] Multi-language support (German, French, Spanish)
- [ ] Advanced clause editor with live preview
- [ ] API access with rate limiting (Pro plan)
- [ ] White-label PDF branding (Enterprise)
- [ ] Bulk generation (CSV upload)
- [ ] Compliance certification report (PDF)
- [ ] Integration with Stripe/Polar for subscription management

**V3 (Month 3-4):**
- [ ] Template marketplace (custom clauses from law firms)
- [ ] Auto-update notifications (Inngest cron)
- [ ] Collaborative editing (team accounts)
- [ ] Mobile app (React Native)
- [ ] Advanced analytics (document views, clause usage)
- [ ] Enterprise SSO (SAML/OIDC)
- [ ] On-premise deployment option

**V4+ (Month 6+):**
- [ ] Expand to other AI products: video, audio, text, robotics
- [ ] Full legal advise marketplace (connect to lawyers)
- [ ] AI-powered compliance monitoring (scan your product, generate recommended clauses)
- [ ] International expansion: Asia-Pacific regulations

---

## 17. Checklist for Completion

**Before marking task complete:**
- [ ] Document created at `/data/workspace/docs/mvp-002-tcs-generator.md`
- [ ] Database schema executed (tables created)
- [ ] Clause library seeded (30+ clauses)
- [ ] Wizard form functional (all 6 steps)
- [ ] Document generation produces valid HTML preview
- [ ] PDF generation works (via print or API)
- [ ] Polar payment integration tested (sandbox)
- [ ] Compliance checker functional
- [ ] Dashboard displays documents
- [ ] Admin clause editor working
- [ ] Rate limiting implemented
- [ ] Unit tests passing (critical functions)
- [ ] Deployed to Vercel (URL verified)
- [ ] Sentry configured
- [ ] Analytics events added
- [ ] Entry added to `/data/workspace/memory/tasks-log.md`: `✅ MVP-002: AI Image T&Cs Generator spec completed, ready for implementation`

---

## Appendix A: Clause Condition Logic

Implement a simple rule engine:

```typescript
// Example conditions object for a clause
{
  "usesUserUploads": true,
  "biometricData": "yes",
  "or": [
    { "productType": ["face_swap", "style_transfer"] },
    { "syntheticMedia": true }
  ],
  "and": [
    { "hasAPI": true }
  ]
}
```

Evaluation:
1. If condition key matches wizard answer AND value matches → include
2. OR conditions: any match → include
3. AND conditions: all must match → include
4. No conditions → always include

---

## Appendix B: AI Refinement Prompt Template

```
You are a legal assistant specializing in AI and technology law.

Context:
- This clause will be part of Terms & Conditions for an AI image product.
- Product type: {productType}
- Jurisdiction: {jurisdiction}
- Clause category: {category}
- Original clause text:
{originalContent}

Task:
Rewrite the clause to be:
1. Clear and concise (8th-grade reading level)
2. Legally precise and enforceable
3. Tailored to {productType} and {jurisdiction} law
4. Include practical examples where helpful

Return ONLY the revised clause text. Do not include commentary.
```

---

## Appendix C: Jurisdiction-Specific Customizations

**EU (GDPR):**
- Add "Data Controller" / "Data Processor" definitions
- Include DPA section (annex)
- Reference GDPR Articles explicitly
- 30-day data deletion window
- Right to object to automated decisions

**UK:**
- UK GDPR references
- ICO as supervisory authority
- UK-specific sunset periods

**California (CCPA/CPRA):**
- "Do Not Sell" disclosures
- "Shine the Light" privacy rights
- 12-month data retention presumption
- Minors' data restrictions

**Canada (PIPEDA):**
- Cross-border data flow disclosures
- Data breach notification timeline (72h)
- Consent definitions

---

## Conclusion

This specification provides everything needed to build and launch the AI Image T&Cs Generator in 3 days. The MVP focuses on:

✅ **Core value**: AI-specific clauses out-of-the-box
✅ **Speed**: Reuse existing Next.js + Polar boilerplate
✅ **Compliance**: GDPR + AI Act ready
✅ **Monetization**: One-time + subscription via Polar
✅ **Scalability**: Modular design, easy to extend
✅ **Legal safety**: Strong disclaimers, clarity on non-legal-advice nature

**Next Steps:** Assign to sub-agent or begin implementation immediately. All decisions made; technical specs complete. The only remaining work is execution.
