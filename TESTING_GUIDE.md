# Test Suite - AI Resume Analyser

This document contains a set of test scripts and manual procedures to verify the robustness of the application. **Note: These tests are prepared but not yet executed.**

## 1. API Endpoint Testing

### Test: `POST /api/ai/analyse` (Resume Analysis)
**Goal:** Verify that the AI analysis works correctly with both Gemini and Groq, and handles file uploads.

**cURL Command (Manual Execution):**
```bash
# Test with a sample text
curl -X POST http://localhost:3000/api/ai/analyse \
  -H "Content-Type: application/json" \
  -H "x-user-id: [YOUR_TEST_USER_ID]" \
  -d '{"text": "Sample professional experience: 10 years as a Senior Software Engineer at Google. Skills: Python, React, AWS."}'
```

**Verification Steps:**
- [ ] Check if the response contains `success: true`.
- [ ] Verify that `analysis` object contains scores, profile, and skills.
- [ ] Check Firestore `analyses` collection for a new entry under the user's ID.

---

## 2. Authentication Flow Testing

### Test Script: Login/Signup Redirection
**Procedure:**
1. Visit `/signup`.
2. Enter dummy credentials.
3. Click "Create Account".
4. **Expected Result:** Redirection to `/dashboard` upon success.

### Test Script: Protected Routes
**Procedure:**
1. Open an incognito window.
2. Attempt to visit `http://localhost:3000/dashboard` directly.
3. **Expected Result:** Redirection to `/login`.

---

## 3. Edge Case Scenarios

### Test: Empty or Short Resume
**Procedure:**
- Upload a file with less than 50 characters of text.
- **Expected Result:** API should return `400 Bad Request` with message "Resume text too short or empty".

### Test: Image OCR Reliability
**Procedure:**
- Upload a screenshot of a resume (JPG/PNG).
- **Expected Result:** Backend should use Gemini Vision to extract text and then provide analysis.

---

## 4. UI/UX Verification

### Test: Responsive Tabs
**Procedure:**
- Open the Analysis screen.
- Resize the browser to mobile width.
- **Expected Result:** Tabs should be scrollable or stacked correctly without breaking the layout.

---

## 5. Persistence Maintenance

### Test: PDF Export Quality
**Procedure:**
1. Navigate to the "Export Report" tab after analysis.
2. Click "Download PDF Report".
3. **Expected Result:** A print dialog or PDF download should be triggered. The resulting document should contain:
   - Overall Score and Grade.
   - Skill breakdown.
   - Professional experience and education lists.
   - Actionable insights and tips.
   - Proper branding ("Resume Analyser").
