import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(request: NextRequest) {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            userId,
            plan,
        } = await request.json();

        // Validate required fields
        if (!userId || !plan || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            console.error("Missing required fields:", { userId, plan, razorpay_order_id, razorpay_payment_id });
            return NextResponse.json(
                { error: "Missing required payment fields" },
                { status: 400 }
            );
        }

        // Verify signature
        const secret = process.env.RAZORPAY_KEY_SECRET || "";
        if (!secret) {
            console.error("RAZORPAY_KEY_SECRET not configured");
            return NextResponse.json(
                { error: "Payment verification not configured" },
                { status: 500 }
            );
        }

        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", secret)
            .update(body)
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            console.error("Signature mismatch:", { expected: expectedSignature, received: razorpay_signature });
            return NextResponse.json(
                { error: "Invalid payment signature" },
                { status: 400 }
            );
        }

        // Payment verified - Update user's subscription in Firestore using Admin SDK
        const userRef = adminDb.collection("users").doc(userId);
        const now = FieldValue.serverTimestamp();

        // Calculate subscription end date (12 months from now)
        const endDate = new Date();
        endDate.setFullYear(endDate.getFullYear() + 1);

        // Use set with merge to ensure it works
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

        console.log(`Successfully upgraded user ${userId} to ${plan}`);

        return NextResponse.json({
            success: true,
            message: "Payment verified successfully",
            plan,
        });
    } catch (error) {
        console.error("Payment verification error:", error);
        return NextResponse.json(
            { error: "Payment verification failed", details: String(error) },
            { status: 500 }
        );
    }
}
