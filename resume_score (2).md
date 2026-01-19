# ResumeScore.app — ATS Resume Regeneration & Export System

> **Domain:** https://resumescore.app  
> **Scope:** Add ATS-ready resume regeneration + export without disturbing existing features, UI, or analysis logic.

---

## 0. ANSWER TO YOUR CORE QUESTION (READ FIRST)

### ❓ Will the existing PDF/DOC extraction & analysis still work?
**YES. 100%.**

Your current system already:
- Extracts resume from PDF/DOCX
- Structures data (education, experience, skills, projects)
- Runs ATS scoring and analysis

👉 **This new system does NOT replace anything.**  
It sits **after analysis** as an *optional generation + export layer*.

Think of it as:
```
Upload → Analyze (existing) → Generate ATS Resume (new) → Export
```

Nothing breaks. Nothing changes upstream.

---

## 1. GUARANTEE ABOUT TEMPLATE MATCHING (IMPORTANT)

### ❓ Will it generate resumes that match the exact examples I uploaded?

**YES — by design.**

But not by copying files.

### HOW IT WORKS (CRITICAL UNDERSTANDING)
You are NOT storing full templates.
You are storing **Template Blueprints**:
- Fonts
- Section order
- Spacing
- Bullet style
- ATS rules

These blueprints recreate resumes that:
- Look identical in structure
- Match ATS-friendly professional examples
- Stay editable & clean

This is the **only scalable & legal approach**.

---

## 2. SYSTEM ARCHITECTURE (SAFE INSERTION)

```
Existing System
 ├── Resume Upload
 ├── Resume Parser
 ├── ATS Analysis
 ├── Score UI
 └── Insights

New Layer (ADD ONLY)
 ├── Role Detection
 ├── Resume Regeneration Engine
 ├── Template Blueprint Mapper
 ├── Export Controller
```

No existing endpoints, UI routes, or scores are touched.

---

## 3. ROLE-BASED GENERATION LOGIC (2 CLICKS ONLY)

### User Flow
1. User clicks **"Generate ATS Resume"** (new button on Export tab)
2. Modal opens:
   - Auto-detected role (editable)
   - Target profile:
     - Fresher / Entry Level
     - Product Manager
     - Software Engineer
     - Job Change (same role)
3. Click **Generate**

That’s it.

---

## 4. DEEP AI GENERATION LOGIC (CRITICAL — READ CAREFULLY)

This section **replaces any shallow text-generation logic**.  
It ensures resumes are **100% ATS-friendly, structurally complete, non-compressed, and role-optimized**.

---

### 4.1 CORE PRINCIPLES (NON-NEGOTIABLE)

AI MUST:
- Preserve **ALL sections** from uploaded resume
- Preserve **ALL content density** (no shortening)
- Preserve **chronology, companies, titles, dates**
- Rephrase text with **equal or greater length**
- NEVER remove internships, projects, coursework, profiles
- Add missing ATS-standard sections ONLY if logically required

AI MUST NOT:
- Compress bullets
- Summarize content
- Invent experience or metrics
- Change factual meaning

---

### 4.2 RESUME NORMALIZATION STAGE (PRE-AI)

Before AI rewriting, normalize parsed resume into a strict schema:

```json
{
  "header": {"name":"","email":"","phone":"","location":""},
  "sections": {
    "summary": "",
    "education": [],
    "skills": {"languages":[],"frontend":[],"backend":[],"tools":[]},
    "experience": [],
    "projects": [],
    "coursework": [],
    "profiles": []
  }
}
```

NO DATA DROPPED AT THIS STAGE.

---

### 4.3 SECTION-BY-SECTION AI REWRITE PROMPTS

#### SUMMARY (LENGTH-PRESERVING)
```text
Rewrite the summary for {{TARGET_ROLE}}.
RULES:
- Keep SAME sentence count
- Keep SAME or LONGER length
- Improve clarity & ATS keywords
- No buzzwords
- No compression
```

---

#### SKILLS (STRUCTURE LOCKED)
```text
Reorder and refine skills for {{TARGET_ROLE}}.
RULES:
- Do NOT remove any skill
- Do NOT merge skill categories
- Preserve list length
- Reorder for ATS relevance only
```

---

#### EXPERIENCE / INTERNSHIPS (STRICT)
```text
Rewrite each bullet for {{TARGET_ROLE}}.
STRICT RULES:
- Do NOT change company, role, dates
- Preserve bullet count
- Each bullet must be SAME or LONGER length
- Use action + system + outcome phrasing
- No invented metrics
```

---

#### PROJECTS (DEPTH-PRESERVING)
```text
Rewrite project descriptions for {{TARGET_ROLE}}.
RULES:
- Preserve ALL technical detail
- Do NOT shorten
- Explicitly mention tools, architecture, and intent
- ATS-safe wording only
```

---

#### COURSEWORK / PROFILES
```text
Rewrite coursework & profiles section.
RULES:
- Preserve all items
- Improve clarity
- Do NOT remove links or platforms
```

---

### 4.4 SECTION COMPLETENESS CHECK (POST-AI)

```pseudo
for each original_section:
  if missing in generated_resume:
    FAIL and regenerate
```

No resume can be exported unless **100% section parity** exists.

---

### 4.5 TEMPLATE & FORMAT ENFORCEMENT (FINAL PASS)

Formatting engine applies:
- Custom font (Inter / ATS-safe alternative)
- Consistent margins (1 inch)
- Section separators (underline or rule)
- Single-column layout
- Bullet indentation normalization

Example:
```
EXPERIENCE
────────────
```

---

## 5. TEMPLATE BLUEPRINT MODEL

### 5.1 Section Dividers & Formatting (CONFIRMED)

**YES — resumes WILL have clean dividing lines between sections.**

Divider rules (ATS-safe):
- Thin horizontal line OR
- Spacing + section heading underline
- No tables, no graphics, no icons

Example:
```
EXPERIENCE
────────────

PROJECTS
────────────
```

This matches professional ATS-friendly resumes and the examples you uploaded.

---

```json
{
  "role": "Product Manager",
  "sections": ["Summary","Experience","Projects","Skills","Education"],
  "font": "Inter",
  "spacing": "ATS-tight",
  "bullet_style": "action-impact",
  "rules": {
    "single_column": true,
    "no_icons": true,
    "no_tables": true
  }
}
```

This ensures outputs match your uploaded examples.

---

## 6. FORMATTER GUARANTEE (BEFORE DOWNLOAD)

Before **ANY** export, a formatter runs automatically:

Formatter responsibilities:
- Apply section dividers consistently
- Enforce font, spacing, and margins
- Remove visual noise
- Validate ATS safety

```pseudo
if formatting_invalid:
  auto-fix → revalidate → export
```

User NEVER downloads an unformatted resume.

---

## 7. EXPORT RULES (MONETIZATION LOCKED)

### FREE
- 1 export / month
- PDF only
- Watermarked
- Not editable

### PRO
- 5 exports / month
- Editable DOCX
- Editable PDF
- No watermark

### PREMIUM
- 10 exports / month
- Editable DOCX + PDF
- No watermark

---

## 7. EXPORT ENFORCEMENT LOGIC

```pseudo
if plan == FREE and used >= 1 → block + upsell
if plan == PRO and used >= 5 → block + upsell
if plan == PREMIUM and used >= 10 → block
```

Watermark applied only for FREE.

---

## 8. DATABASE TABLES (ADD ONLY)

### generated_resumes
```sql
generated_resumes (
  id UUID,
  resume_id UUID,
  role TEXT,
  content JSONB,
  created_at TIMESTAMP
)
```

### exports
```sql
exports (
  id UUID,
  user_id UUID,
  generated_resume_id UUID,
  format TEXT,
  watermarked BOOLEAN,
  created_at TIMESTAMP
)
```

---

## 9. API CONTRACTS (NON-BREAKING)

### Generate Resume
```
POST /api/resume/generate
```

### Export Resume
```
POST /api/resume/export
```

---

## 10. FRONTEND — IMG 4 (EXPORT TAB) REDESIGN

### Current Problem
- Shows analysis report export
- No regeneration option

### New Layout (NO OTHER UI TOUCHED)

#### Section 1: ATS Resume Generator
> **Generate ATS-Friendly Resume**  
Create a role-optimized, submission-ready resume from your analysis.

[ Generate Resume ]

---

#### Section 2: Export Options (Dynamic)

| User Plan | Buttons |
|---------|--------|
| Free | Download Watermarked PDF |
| Pro | Download Editable DOCX / PDF |
| Premium | Download Editable DOCX / PDF |

If limit reached:
> Upgrade to export more ATS-ready resumes.

---

## 11. STRICT NON-DISTURBANCE GUARANTEE

This implementation:
- ❌ Does NOT modify scoring
- ❌ Does NOT modify analysis
- ❌ Does NOT modify dashboard
- ❌ Does NOT affect SEO pages
- ❌ Does NOT change existing exports

It is **additive only**.

---

## 11. AUTO-DELETE & PRIVACY GUARANTEE

### Resume Auto-Deletion Policy

To ensure **full privacy**:

- Generated resumes are stored **temporarily**
- Auto-deleted after **5 minutes** if not exported
- Immediate delete after successful export (optional config)

```pseudo
on resume_generated:
  schedule delete in 5 minutes

on export_complete:
  delete generated_resume
```

Original uploaded resumes follow your existing retention policy.

---

## 11. AUTO KEYWORD DENSITY OPTIMIZER (ADVANCED — ATS CORE)

This module ensures resumes are **keyword-optimized without keyword stuffing** and remain human-readable.

---

### 11.1 INPUTS

- Parsed resume content (post-rewrite)
- Target role (e.g., Software Engineer, Product Manager)
- Optional job description (if provided)

---

### 11.2 KEYWORD EXTRACTION LOGIC

```pseudo
keywords_from_jd = extract_skills_and_phrases(job_description)
keywords_from_role = predefined_role_keywords[target_role]
final_keyword_set = merge_and_dedupe(keywords_from_jd, keywords_from_role)
```

Keywords are categorized into:
- Core skills
- Tools & technologies
- Soft skills
- Role-specific verbs

---

### 11.3 TARGET DENSITY RULES (ATS-SAFE)

| Keyword Type | Optimal Density |
|-------------|----------------|
| Core Skills | 1–2% |
| Tools | 0.5–1% |
| Soft Skills | ≤0.5% |

Hard limit: **No keyword > 2.5% density**

---

### 11.4 INJECTION STRATEGY (NON-DESTRUCTIVE)

Keywords may be injected ONLY into:
- Summary
- Experience bullets
- Project descriptions

RULES:
- Never add keywords to headers
- Never repeat keyword twice in same bullet
- Never alter factual meaning

---

### 11.5 AI PROMPT (KEYWORD OPTIMIZATION)

```text
Optimize the resume content for ATS keyword density.
RULES:
- Use provided keyword list
- Stay within density limits
- Preserve sentence length
- Do not add buzzwords
- Do not repeat keywords unnaturally

Resume Content:
{{resume_text}}

Keywords:
{{keyword_list}}
```

---

### 11.6 VALIDATION GATE (MANDATORY)

```pseudo
for each keyword:
  if density > max_allowed:
    regenerate section
```

Export is blocked until validation passes.

---

### 11.7 UI (NON-INTRUSIVE)

Optional badge shown post-generation:
> ATS Keyword Match: 92%

No UI clutter. No extra steps.

---

## 12. FINAL CONFIRMATION

✔ Resume length preserved
✔ All sections retained
✔ ATS keyword density optimized
✔ No keyword stuffing
✔ Human-readable
✔ All previous guarantees still valid


✔ Existing resume analysis continues to work
✔ Exact ATS-style templates are reproduced
✔ 2-click resume generation
✔ Clear monetization boundary
✔ Safe, scalable, and extensible

---

> **This file is the final execution spec. Do not deviate without data.**

