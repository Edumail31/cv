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

## 4. AI PROMPTS (LOCKED & SAFE)

### Role Detection
```text
Detect the most suitable job role from this resume data.
Return only one role and confidence.
```

### Summary Rewrite
```text
Rewrite summary for {{ROLE}}. Keep under 3 lines. No fake experience.
```

### Experience Rewrite
```text
Rewrite bullets for {{ROLE}}. Do not change company, role, or dates.
```

### Project Rewrite
```text
Optimize project description for {{ROLE}} using ATS-safe language.
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

## 12. FINAL CONFIRMATION

✔ Existing resume analysis continues to work
✔ Exact ATS-style templates are reproduced
✔ 2-click resume generation
✔ Clear monetization boundary
✔ Safe, scalable, and extensible

---

> **This file is the final execution spec. Do not deviate without data.**

