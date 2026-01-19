# Firebase + Groq API Setup Guide

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Create a project"**
3. Name it: `cvbuilder-pro` (or any name)
4. Disable Google Analytics (optional for testing)
5. Click **Create Project**

---

## Step 2: Enable Authentication

1. In Firebase Console → **Authentication** → **Get Started**
2. Click **Sign-in method** tab
3. Enable **Email/Password**:
   - Click on it → Toggle **Enable** → Save
4. Enable **Google**:
   - Click on it → Toggle **Enable**
   - Add your email as support email
   - Save

---

## Step 3: Create Firestore Database

1. In Firebase Console → **Firestore Database** → **Create database**
2. Select **Start in test mode** (for development)
3. Choose location: `asia-south1` (Mumbai) for India
4. Click **Enable**

---

## Step 4: Get Firebase Config

1. Go to **Project Settings** (gear icon) → **General**
2. Scroll to **Your apps** → Click **Web** icon (</>)
3. Register app with name: `cvbuilder-web`
4. Copy the config object, it looks like:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "cvbuilder-pro.firebaseapp.com",
  projectId: "cvbuilder-pro",
  storageBucket: "cvbuilder-pro.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

---

## Step 5: Get Groq API Key (Free!)

1. Go to [Groq Console](https://console.groq.com/)
2. Sign up / Login with Google
3. Go to **API Keys** → **Create API Key**
4. Copy the key (starts with `gsk_...`)

> **Note**: Groq is FREE and super fast! No credit card needed.

---

## Step 6: Create .env.local File

Create a file called `.env.local` in your project root (`c:\Users\Amritansh Singh\Desktop\cv\.env.local`):

```env
# Firebase Config
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123:web:abc

# Groq AI (Free!)
GROQ_API_KEY=gsk_your_groq_key_here

# Razorpay (Optional - for payments)
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=your_secret
```

---

## Step 7: Restart Dev Server

After creating `.env.local`, restart your dev server:

```bash
# Stop current server (Ctrl+C)
# Then restart:
npm run dev
```

---

## Step 8: Test the App

1. Go to `http://localhost:3000`
2. Click **"Start Free"** → Sign up with email or Google
3. Create a resume
4. Try the **"AI Enhance"** button on the summary field

---

## Firestore Security Rules (for Production)

When ready for production, update Firestore Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Resumes can only be accessed by their owner
    match /resumes/{resumeId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
      allow create: if request.auth != null;
    }
  }
}
```

---

## Quick Checklist

- [ ] Firebase project created
- [ ] Email/Password auth enabled
- [ ] Google auth enabled  
- [ ] Firestore database created (test mode)
- [ ] Firebase config copied
- [ ] Groq API key obtained
- [ ] `.env.local` file created
- [ ] Dev server restarted
- [ ] Tested signup and resume creation
