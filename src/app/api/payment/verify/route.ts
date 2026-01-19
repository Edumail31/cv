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

        console.log("[Payment Verify] Request:", { userId, plan, orderId: razorpay_order_id?.substring(0, 15) });

        // Validate required fields
        if (!userId || !plan || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return NextResponse.json(
                { error: "Missing required payment fields" },
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

        // Verify Razorpay signature
        const secret = process.env.RAZORPAY_KEY_SECRET || "";
        if (!secret) {
            return NextResponse.json(
                { error: "Payment secret not configured" },
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

        console.log("[Payment Verify] Signature verified, updating Firestore...");

        // Update user in Firestore
        const userRef = adminDb.collection("users").doc(userId);
        const now = FieldValue.serverTimestamp();

        const endDate = new Date();
        endDate.setFullYear(endDate.getFullYear() + 1);

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
        console.error("[Payment Verify] Error:", error);
        return NextResponse.json(
            { error: "Payment verification failed", details: String(error) },
            { status: 500 }
        );
    }
}
