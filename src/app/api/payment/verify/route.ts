import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/firebase";
import { doc, setDoc, Timestamp } from "firebase/firestore";

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

        // Payment verified - Update user's subscription in Firestore
        const userRef = doc(db, "users", userId);
        const now = Timestamp.now();

        // Calculate subscription end date (12 months from now)
        const endDateMs = Date.now() + (365 * 24 * 60 * 60 * 1000);
        const subscriptionEnd = Timestamp.fromMillis(endDateMs);

        // Use setDoc with merge to ensure it works even if doc doesn't exist
        // or if there are issues with nested objects
        await setDoc(userRef, {
            tier: plan,
            subscription: {
                plan: plan,
                status: "active",
                paymentId: razorpay_payment_id,
                orderId: razorpay_order_id,
                startDate: now,
                endDate: subscriptionEnd,
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
