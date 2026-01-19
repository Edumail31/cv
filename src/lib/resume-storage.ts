// Resume Storage - Persist uploaded resume across pages with auto-expiry
const RESUME_STORAGE_KEY = 'cv_builder_resume';
const SESSION_STORAGE_KEY = 'cv_builder_session';
const RESUME_EXPIRY_MS = 3 * 60 * 1000; // 3 minutes
const SESSION_EXPIRY_DAYS = 15; // Auto signout after 15 days

export interface StoredResume {
    fileName: string;
    fileType: string;
    base64Data: string;
    uploadedAt: number;
    expiresAt: number;
    textContent?: string;
}

export interface SessionInfo {
    signedInAt: number;
    lastActivity: number;
}

// Save resume to localStorage with 3-minute expiry
export function saveResume(file: File, textContent?: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result as string;
            const now = Date.now();
            const stored: StoredResume = {
                fileName: file.name,
                fileType: file.type,
                base64Data: base64,
                uploadedAt: now,
                expiresAt: now + RESUME_EXPIRY_MS, // Expires in 3 minutes
                textContent
            };
            try {
                localStorage.setItem(RESUME_STORAGE_KEY, JSON.stringify(stored));
                // Set expiry timer
                scheduleResumeExpiry();
                resolve();
            } catch (e) {
                reject(e);
            }
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Get stored resume (checks expiry)
export function getStoredResume(): StoredResume | null {
    try {
        const stored = localStorage.getItem(RESUME_STORAGE_KEY);
        if (!stored) return null;

        const resume = JSON.parse(stored) as StoredResume;

        // Check if expired
        if (resume.expiresAt && Date.now() > resume.expiresAt) {
            clearStoredResume();
            return null;
        }

        return resume;
    } catch {
        return null;
    }
}

// Convert stored resume back to File
export function storedResumeToFile(stored: StoredResume): File {
    const byteString = atob(stored.base64Data.split(',')[1]);
    const mimeType = stored.fileType;
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    return new File([ab], stored.fileName, { type: mimeType });
}

// Clear stored resume
export function clearStoredResume(): void {
    localStorage.removeItem(RESUME_STORAGE_KEY);
}

// Check if resume is stored (and not expired)
export function hasStoredResume(): boolean {
    const stored = getStoredResume();
    return stored !== null;
}

// Get resume age in minutes
export function getResumeAgeMinutes(): number {
    const stored = getStoredResume();
    if (!stored) return -1;
    return (Date.now() - stored.uploadedAt) / (1000 * 60);
}

// Schedule resume expiry check
export function scheduleResumeExpiry(): void {
    if (typeof window === 'undefined') return;

    // Check every minute for expired resumes
    const checkInterval = setInterval(() => {
        const stored = getStoredResume();
        if (!stored) {
            clearInterval(checkInterval);
        }
    }, 60 * 1000); // Check every minute
}

// ==================
// SESSION MANAGEMENT
// ==================

// Initialize session (call on sign in) - only if not already initialized
export function initSession(): void {
    // Don't overwrite existing valid session
    const existing = getSessionInfo();
    if (existing && !isSessionExpired()) {
        // Just update activity
        updateSessionActivity();
        return;
    }

    const now = Date.now();
    const session: SessionInfo = {
        signedInAt: now,
        lastActivity: now
    };
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));

    // Enable cookies for session persistence
    document.cookie = `cv_session_active=true; max-age=${SESSION_EXPIRY_DAYS * 24 * 60 * 60}; path=/; SameSite=Strict`;
}

// Update last activity
export function updateSessionActivity(): void {
    try {
        const stored = localStorage.getItem(SESSION_STORAGE_KEY);
        if (stored) {
            const session = JSON.parse(stored) as SessionInfo;
            session.lastActivity = Date.now();
            localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
        }
    } catch {
        // Ignore errors
    }
}

// Check if session has expired (15 days)
// Returns FALSE if no session exists (allows new login to proceed)
export function isSessionExpired(): boolean {
    try {
        const stored = localStorage.getItem(SESSION_STORAGE_KEY);
        // No session = not expired (new login)
        if (!stored) return false;

        const session = JSON.parse(stored) as SessionInfo;
        const daysSinceSignIn = (Date.now() - session.signedInAt) / (1000 * 60 * 60 * 24);

        return daysSinceSignIn >= SESSION_EXPIRY_DAYS;
    } catch {
        return false; // On error, don't sign out
    }
}

// Clear session on sign out
export function clearSession(): void {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    clearStoredResume(); // Also clear resume on sign out
    document.cookie = 'cv_session_active=; max-age=0; path=/';
}

// Get session info
export function getSessionInfo(): SessionInfo | null {
    try {
        const stored = localStorage.getItem(SESSION_STORAGE_KEY);
        if (!stored) return null;
        return JSON.parse(stored) as SessionInfo;
    } catch {
        return null;
    }
}

// Get days until auto signout
export function getDaysUntilAutoSignout(): number {
    const session = getSessionInfo();
    if (!session) return 0;

    const daysSinceSignIn = (Date.now() - session.signedInAt) / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.ceil(SESSION_EXPIRY_DAYS - daysSinceSignIn));
}
