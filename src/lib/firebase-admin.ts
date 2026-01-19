// Firebase Admin SDK for server-side operations
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let adminDb: Firestore | null = null;
let initError: string | null = null;

function initializeAdminApp(): { db: Firestore | null; error: string | null } {
    if (adminDb) {
        return { db: adminDb, error: null };
    }

    try {
        let app: App;

        if (getApps().length > 0) {
            app = getApps()[0];
            adminDb = getFirestore(app);
            return { db: adminDb, error: null };
        }

        // Try multiple methods to get service account
        const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "resumescore-app";

        // Method 1: Individual environment variables (most reliable for Vercel)
        const privateKey = process.env.FIREBASE_PRIVATE_KEY;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

        if (privateKey && clientEmail) {
            console.log("[Firebase Admin] Using individual env vars for credentials");
            try {
                app = initializeApp({
                    credential: cert({
                        projectId: projectId,
                        clientEmail: clientEmail,
                        // Handle escaped newlines in private key
                        privateKey: privateKey.replace(/\\n/g, '\n'),
                    }),
                    projectId: projectId,
                });
                adminDb = getFirestore(app);
                console.log("[Firebase Admin] Initialized successfully with individual env vars!");
                return { db: adminDb, error: null };
            } catch (e) {
                console.error("[Firebase Admin] Error with individual env vars:", e);
            }
        }

        // Method 2: Base64 encoded JSON
        const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        if (serviceAccountBase64 && serviceAccountBase64.length > 100) {
            console.log("[Firebase Admin] Trying base64 service account, length:", serviceAccountBase64.length);
            try {
                const cleanedBase64 = serviceAccountBase64.replace(/[\s\r\n]/g, '');
                const decodedJson = Buffer.from(cleanedBase64, 'base64').toString('utf-8');
                const serviceAccount = JSON.parse(decodedJson);

                app = initializeApp({
                    credential: cert(serviceAccount),
                    projectId: serviceAccount.project_id,
                });
                adminDb = getFirestore(app);
                console.log("[Firebase Admin] Initialized successfully with base64!");
                return { db: adminDb, error: null };
            } catch (e) {
                console.error("[Firebase Admin] Error with base64:", e);
            }
        }

        // Method 3: Just project ID (won't work for writes but prevents crash)
        console.log("[Firebase Admin] No valid credentials found, using project ID only");
        app = initializeApp({ projectId });
        adminDb = getFirestore(app);
        initError = "No valid service account credentials configured";
        return { db: adminDb, error: initError };

    } catch (error) {
        console.error("[Firebase Admin] Fatal initialization error:", error);
        initError = String(error);
        return { db: null, error: initError };
    }
}

// Initialize on first import
const { db, error } = initializeAdminApp();

export { db as adminDb, error as adminDbError };
