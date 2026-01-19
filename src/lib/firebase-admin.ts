// Firebase Admin SDK for server-side operations
// This bypasses Firestore security rules and should only be used in API routes
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let adminApp: App;
let adminDb: Firestore;

function initializeAdminApp() {
    if (getApps().length === 0) {
        // Check if we have a service account key in env vars
        const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

        if (serviceAccountBase64) {
            // Parse the base64 encoded service account
            try {
                const serviceAccount = JSON.parse(
                    Buffer.from(serviceAccountBase64, 'base64').toString('utf-8')
                );
                adminApp = initializeApp({
                    credential: cert(serviceAccount),
                    projectId: serviceAccount.project_id,
                });
            } catch (e) {
                console.error("Error parsing service account:", e);
                // Fall back to application default credentials
                adminApp = initializeApp({
                    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                });
            }
        } else {
            // Use application default credentials (works in Google Cloud)
            // or initialize with project ID only (limited functionality)
            adminApp = initializeApp({
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            });
        }
    } else {
        adminApp = getApps()[0];
    }

    adminDb = getFirestore(adminApp);
    return { adminApp, adminDb };
}

// Initialize on module load
const { adminDb: db } = initializeAdminApp();

export { db as adminDb };
export default adminApp!;
