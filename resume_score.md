# ResumeScore.app — SEO & Growth Blueprint

> **Official URL:** https://resumescore.app



> **Purpose:** Single source of truth for building, scaling, and ranking ResumeScore.app without changing existing UI or feature logic.
>
> **Audience:** Founder, engineering, SEO.

---

## 0. PRE-IMPLEMENTATION VERIFICATION (MANDATORY)

> **Important:** All strategies in this document assume the following are already implemented correctly on **https://resumescore.app**. If any item below is missing or broken, **fix it first** before scaling SEO.

### 0.1 Functional Verification
- Resume upload works end-to-end
- Resume score is generated reliably
- Resume comparison works
- Job fit score works
- Interview questions generate correctly

### 0.2 Page Accessibility
- All core pages load without auth walls
- Pages return **200 status**
- No console errors blocking render

### 0.3 Crawlability
- Pages render meaningful HTML on first load (SSR or static)
- No JS-only blank states for Googlebot
- Robots.txt allows core pages

### 0.4 Indexing Hygiene
- Homepage has `index, follow`
- No accidental `noindex` on core pages
- Canonical tags exist and are correct

### 0.5 Performance Baseline
- LCP < 3s on homepage
- CLS < 0.15
- INP < 300ms

> **Only after all checks pass should the rest of this document be executed.**

---

## 1. Brand & Positioning (Locked)

**Product Name:** ResumeScore

**Primary Domain:** ResumeScore.app

**Core Value:** ATS resume scoring + job fit + interview prep

### Hero Copy (Homepage)
- **H1:** Check Your Resume Score Before You Apply
- **Subtext:** ATS-based resume scoring, job fit analysis, and interview preparation.

### Section Intro (Features)
- **One Resume. Many Hiring Outcomes.**

### Footer
- **ResumeScore — ATS Resume Scoring & Job Matching**

---

## 2. Feature Naming (SEO-Safe)

| Existing Feature | Display Name |
|-----------------|--------------|
| Resume Analysis | ATS Resume Score |
| Resume Comparison | Compare Resume Scores |
| Interview Prep | Interview Questions from Resume |
| Company Compatibility | Job Fit Score |

---

## 3. Core Page URLs

```
/
/resume-score
/resume-comparison
/job-fit
/interview-questions-from-resume
```

---

## 4. Meta Tags (Production Ready)

### Homepage
**Title:** Resume Score Checker for ATS & Job Fit | ResumeScore

**Description:** Get your ATS resume score, compare resumes, check job fit, and generate interview questions before you apply. Free resume score.

---

### /resume-score
**Title:** ATS Resume Score Checker – Test Your Resume Online

**Description:** Check your ATS resume score instantly. See keyword gaps, formatting issues, and improvements.

---

### /resume-comparison
**Title:** Resume Comparison Tool – Compare Resume Scores

**Description:** Compare two resumes side by side and see which performs better for the same job.

---

### /job-fit
**Title:** Job Fit Score – Check Resume Match Before Applying

**Description:** See how well your resume matches a job role or company.

---

### /interview-questions-from-resume
**Title:** Interview Questions From Your Resume – AI Generated

**Description:** Get interview questions generated directly from your resume and target role.

---

## 5. Programmatic SEO Page Templates

### A. Resume Score by Role
**URL:** /resume-score/{role}

**H1:** ATS Resume Score for {Role}

**Sections:**
- What Is a Good Resume Score for a {Role}?
- Skills Recruiters Expect in a {Role} Resume
- Common Resume Mistakes for {Role}
- Improve Your {Role} Resume Score (CTA)

---

### B. Job Fit by Company + Role
**URL:** /job-fit/{company}/{role}

**H1:** Job Fit Score for {Role} at {Company}

**Sections:**
- How {Company} Screens Resumes
- Resume Keywords for {Role} at {Company}
- Resume Fit Score Breakdown
- Improve Your Job Fit Score (CTA)

---

### C. Interview Questions by Role
**URL:** /interview-questions/{role}

**H1:** Interview Questions for {Role} Based on Your Resume

**Sections:**
- Technical Interview Questions
- Resume-Based Interview Questions
- How to Prepare Using Your Resume

---

## 6. Role Keyword Seed List (Top 100)

- Software Engineer
- Frontend Developer
- Backend Developer
- Full Stack Developer
- Data Analyst
- Data Scientist
- Machine Learning Engineer
- DevOps Engineer
- Cloud Engineer
- Cybersecurity Analyst
- Product Manager
- UI/UX Designer
- QA Engineer
- Automation Tester
- Business Analyst
- Financial Analyst
- Marketing Manager
- SEO Specialist
- Content Strategist
- Sales Executive
- Account Manager
- Customer Success Manager
- HR Executive
- Recruiter
- Operations Manager
- Project Manager
- Program Manager
- Scrum Master
- Fresh Graduate
- Intern
(extend gradually)

---

## 7. Company Seed List (Job-Fit Pages)

### Tier 1
- Google
- Amazon
- Microsoft
- Apple
- Meta
- Netflix
- Tesla
- Adobe

### Tier 2
- Accenture
- Deloitte
- EY
- PwC
- Infosys
- TCS
- Wipro
- Cognizant

### Tier 3
- Atlassian
- Shopify
- Zoho
- Razorpay
- Flipkart
- Swiggy
- Zomato

---

## 8. Indexing Control Logic (CRITICAL)

### Page States

**Approved (SEO Page):**
- role ∈ approvedRoles
- company ∈ approvedCompanies
- Content ≥ 400 words
→ `index, follow`

**User-Generated (Utility Page):**
- New role or company
→ `noindex, follow`

**Thin / Invalid:**
→ `noindex, nofollow`

### Sitemap Rule
- Include ONLY approved pages
- Exclude all user-generated pages

---

## 9. Internal Linking Strategy

- Every page links to `/resume-score`
- Role pages link to job-fit + interview pages
- Use exact-match anchor text:
  - check your resume score
  - job fit score for software engineer
  - interview questions from resume

---

## 10. Free Tool Landing Pages

### /free-ats-resume-score
**H1:** Free ATS Resume Score Checker

### /resume-keyword-checker
**H1:** Resume Keyword Checker for ATS

### /resume-job-match
**H1:** Resume Job Match Checker

(All tools free, email gate optional for upgrades)

---

## 11. Schema (Homepage)

- SoftwareApplication schema
- FAQPage schema

(Already provided separately; reuse as-is)

---

## 12. Core Web Vitals Targets

| Metric | Target |
|------|--------|
| LCP | < 2.5s |
| CLS | < 0.1 |
| INP | < 200ms |

### Actions
- Preload fonts
- Lazy load AI outputs
- Skeleton loaders
- SSR for SEO pages

---

## 13. Content Pruning Strategy

### Quarterly Rules

**Delete Pages:**
- No impressions in 90 days
- < 250 words

**Merge Pages:**
- Overlapping intent roles

**Improve Pages:**
- Positions 8–20
- Low CTR

---

## 14. Execution Timeline (30 Days)

**Week 1:**
- Launch core pages
- Submit sitemap

**Week 2:**
- Publish 20 role pages
- Publish 10 job-fit pages

**Week 3:**
- Launch free tools
- Strengthen internal links

**Week 4:**
- Review GSC
- Prune losers
- Expand winners

---

## Final Rule

> **Users get infinite flexibility. Google gets only your best pages.**

This document is the permanent operating system for ResumeScore.app.

