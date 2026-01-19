import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { adminDb, adminDbError } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(request: NextRequest) {
    console.log("[Payment Verify] Starting payment verification...");

    try {
        const body = await request.json();
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            userId,
            plan,
        } = body;

        console.log("[Payment Verify] Request body:", {
            razorpay_order_id,
            razorpay_payment_id: razorpay_payment_id?.substring(0, 10) + "...",
            userId,
            plan
        });

        // Validate required fields
        if (!userId || !plan || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            console.error("[Payment Verify] Missing required fields");
            return NextResponse.json(
                { error: "Missing required payment fields", details: { userId: !!userId, plan: !!plan, orderId: !!razorpay_order_id, paymentId: !!razorpay_payment_id, signature: !!razorpay_signature } },
                { status: 400 }
            );
        }

        // Check if Admin DB is available
        if (!adminDb) {
            console.error("[Payment Verify] Admin DB not initialized:", adminDbError);
            return NextResponse.json(
                { error: "Database not configured", details: adminDbError },
                { status: 500 }
            );
        }

        // Verify signature
        const secret = process.env.RAZORPAY_KEY_SECRET || "";
        if (!secret) {
            console.error("[Payment Verify] RAZORPAY_KEY_SECRET not configured");
            return NextResponse.json(
                { error: "Payment verification not configured" },
                { status: 500 }
            );
        }

        const signatureBody = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", secret)
            .update(signatureBody)
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            console.error("[Payment Verify] Signature mismatch");
            return NextResponse.json(
                { error: "Invalid payment signature" },
                { status: 400 }
            );
        }

        console.log("[Payment Verify] Signature verified successfully");

        // Update user's subscription in Firestore using Admin SDK
        const userRef = adminDb.collection("users").doc(userId);
        const now = FieldValue.serverTimestamp();

        // Calculate subscription end date (12 months from now)
        const endDate = new Date();
        endDate.setFullYear(endDate.getFullYear() + 1);

        console.log("[Payment Verify] Updating Firestore for user:", userId);

        // Use set with merge
        await userRef.set({
            tier: plan,
            subscription: {
                plan: plan,
                status: "active",
                paymentId: razorpay_payment_id,
                orderId: razorpay_order_id,
                startDate: now,
                endDate: endDate,
                lastResetDate: now,
            },
            usage: {
                resumeAnalyzer: 0,
                resumeComparison: 0,
                interviewQuestions: 0,
                companyCompatibility: 0,
                resumeExports: 0,
                atsResumeGenerator: 0,
                lastResetDate: now,
            },
            updatedAt: now,
        }, { merge: true });

        console.log(`[Payment Verify] Successfully upgraded user ${userId} to ${plan}`);

        return NextResponse.json({
            success: true,
            message: "Payment verified successfully",
            plan,
        });
    } catch (error) {
        console.error("[Payment Verify] Fatal error:", error);
        return NextResponse.json(
            { error: "Payment verification failed", details: String(error) },
            { status: 500 }
        );
    }
}
