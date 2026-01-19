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

        const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

        console.log("[Firebase Admin] Initializing...");
        console.log("[Firebase Admin] Service account key exists:", !!serviceAccountBase64);
        console.log("[Firebase Admin] Key length:", serviceAccountBase64?.length || 0);
        console.log("[Firebase Admin] Project ID:", projectId);

        if (serviceAccountBase64 && serviceAccountBase64.length > 100) {
            try {
                // Clean the base64 string (remove any whitespace/newlines)
                const cleanedBase64 = serviceAccountBase64.replace(/\s/g, '');

                // Decode base64
                const decodedJson = Buffer.from(cleanedBase64, 'base64').toString('utf-8');
                console.log("[Firebase Admin] Decoded JSON length:", decodedJson.length);
                console.log("[Firebase Admin] First 50 chars:", decodedJson.substring(0, 50));

                // Parse JSON
                const serviceAccount = JSON.parse(decodedJson);
                console.log("[Firebase Admin] Parsed project_id:", serviceAccount.project_id);
                console.log("[Firebase Admin] Parsed client_email:", serviceAccount.client_email);

                app = initializeApp({
                    credential: cert(serviceAccount),
                    projectId: serviceAccount.project_id,
                });
                console.log("[Firebase Admin] Initialized with service account successfully!");
            } catch (parseError) {
                console.error("[Firebase Admin] Error parsing service account:", parseError);
                initError = `Service account parse error: ${String(parseError)}`;

                // Fallback to project ID only
                if (projectId) {
                    console.log("[Firebase Admin] Falling back to project ID only...");
                    app = initializeApp({ projectId });
                } else {
                    throw new Error("No project ID available for fallback");
                }
            }
        } else if (projectId) {
            console.log("[Firebase Admin] No service account, using project ID only...");
            app = initializeApp({ projectId });
        } else {
            throw new Error("No Firebase credentials available");
        }

        adminDb = getFirestore(app);
        console.log("[Firebase Admin] Firestore initialized successfully!");
        return { db: adminDb, error: null };

    } catch (error) {
        console.error("[Firebase Admin] Fatal initialization error:", error);
        initError = String(error);
        return { db: null, error: initError };
    }
}

// Initialize on first import
const { db, error } = initializeAdminApp();

export { db as adminDb, error as adminDbError };
