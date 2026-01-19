# AI Resume Analyser - Project Requirements

## 📋 Project Overview
A web application that analyzes resumes using AI to provide comprehensive scoring, insights, and interview preparation based on the uploaded resume.

---

## 🎯 Core Features

### 1. Resume Upload & Parsing
| Feature | Description |
|---------|-------------|
| **File Upload** | Drag & drop or click to upload |
| **Supported Formats** | PDF, DOCX, PNG, JPG (up to 10MB) |
| **Text Extraction** | PDF → `pdf-parse`, DOCX → `mammoth` |
| **Image OCR** | Use AI vision to extract text from image resumes |

### 2. AI Analysis (5 Dimensions)
| Dimension | What It Measures |
|-----------|------------------|
| **Educational Background** | Degrees, institutions, relevance |
| **Professional Experience** | Job titles, companies, duration, impact |
| **Technical Skills** | Programming languages, frameworks, tools |
| **Project Portfolio** | Personal/work projects, technologies used |
| **Resume Presentation** | Formatting, clarity, ATS-friendliness |

### 3. Results Display (5 Tabs)

#### Tab 1: Score & Overview
- Overall score (0-100) with letter grade (A-F)
- Circular progress indicator with grade color
- 5 dimension score cards with progress bars
- Key Strengths list
- Pro Insights (improvement tips)
- Market Value card (salary range like "₹3-7 LPA")

#### Tab 2: Profile Details
- Extracted name, email, phone
- Professional summary
- Education list (degree, school, year)
- Experience list (title, company, duration, bullets)
- Skills categorized: Technical, Languages, Soft, ML/AI
- Project Portfolio

#### Tab 3: Insights & Tips
- Market Intelligence card:
  - Expected Salary Range
  - Experience Level (Entry/Mid/Senior)
  - ATS Compatibility %
- Professional Highlights
- Role Compatibility bars (Fullstack, Frontend, Backend, DevOps, etc.)
- Recruiter Concerns (yellow warnings)

#### Tab 4: Interview Prep
- Common Recruiter Questions (clickable chips)
- AI Query System (Premium) - ask questions about the resume
- Suggested Interview Questions (4-5 based on profile)

#### Tab 5: Export Report
- Download complete analysis as PDF

### 4. Dashboard
- Welcome card with user name
- Stats: Total analyses, Average score, This month count
- Feature showcase cards
- Recent analyses history with scores
- "Analyse New Resume" CTA button

### 5. Authentication
- Email/password login & signup
- Google OAuth (optional)
- Forgot password flow
- Logout functionality

### 6. Pricing Tiers (Optional)
| Plan | Features |
|------|----------|
| **Free** | 3 analyses/month, basic insights |
| **Pro** | 10 analyses/month, AI query, export PDF |
| **Premium** | Unlimited analyses, priority support |

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** Next.js 16 (App Router)
- **UI:** React 19, Lucide Icons
- **Styling:** CSS Variables, Glassmorphism effects
- **State:** React useState/useEffect

### Backend
- **API Routes:** Next.js API routes (`/api/*`)
- **AI Provider:** Google Gemini (Generative AI) OR Groq
- **File Parsing:** pdf-parse, mammoth
- **Database:** Firebase Firestore
- **Auth:** Firebase Authentication
- **Payments:** Razorpay (optional)

---

## 🔑 Environment Variables

Create a `.env.local` file with:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# AI API Keys
GROQ_API_KEY=your_groq_api_key
GEMINI_API_KEY=your_gemini_api_key
BASETEN_API_KEY=your_baseten_api_key
OPENROUTER_API_KEY=your_openrouter_api_key

# Razorpay (for payments)
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

---

## 📁 File Structure

```
src/
├── app/
│   ├── page.tsx              # Landing page
│   ├── login/page.tsx        # Login page
│   ├── signup/page.tsx       # Signup page
│   ├── dashboard/page.tsx    # User dashboard
│   ├── analyse/page.tsx      # Upload + Results UI
│   ├── pricing/page.tsx      # Pricing plans
│   └── api/
│       └── ai/
│           └── analyse/route.ts  # AI analysis endpoint
├── lib/
│   ├── firebase.ts           # Firebase config
│   ├── resume-parser.ts      # PDF/DOCX parsing
│   └── usage.ts              # Plan limits
└── components/
    └── UpgradeModal.tsx      # Upgrade prompt
```

---

## 🎨 UI Design Guidelines

### Colors
- **Primary:** Purple gradient (#6366f1 → #8b5cf6)
- **Success:** Green (#22c55e)
- **Warning:** Yellow (#eab308)
- **Error:** Red (#ef4444)
- **Background:** Dark (#0a0a0f, #121218)

### Score Card Colors
- 80-100: Green
- 60-79: Light Green
- 40-59: Yellow
- 20-39: Orange
- 0-19: Red

### Effects
- Glassmorphism on cards
- Subtle animations on hover
- Gradient headers
- Progress bar animations

---

## 🔄 API Flow

```
1. User uploads file
   ↓
2. Frontend sends to /api/ai/analyse (FormData)
   ↓
3. Backend:
   a. Parse file (PDF/DOCX → text)
   b. For images: Use AI vision OCR
   c. Send text to Gemini/Groq for analysis
   d. Return structured JSON
   ↓
4. Frontend displays results in 5 tabs
```

---

## ✅ MVP Checklist

- [ ] Landing page with hero section
- [ ] Authentication (login/signup)
- [ ] Dashboard with analysis history
- [ ] Analyse page:
  - [ ] File upload (drag & drop)
  - [ ] PDF/DOCX parsing
  - [ ] Image OCR
  - [ ] AI analysis API
  - [ ] Score & Overview tab
  - [ ] Profile Details tab
  - [ ] Insights & Tips tab
  - [ ] Interview Prep tab
  - [ ] Export Report tab
- [ ] Firestore integration (save analyses)
- [ ] Responsive design
