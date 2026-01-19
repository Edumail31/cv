import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";

export async function POST(request: NextRequest) {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            userId,
            plan,
        } = await request.json();

        // Verify signature
        const secret = process.env.RAZORPAY_KEY_SECRET || "";
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", secret)
            .update(body)
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            return NextResponse.json(
                { error: "Invalid payment signature" },
                { status: 400 }
            );
        }

        // Payment verified - Update user's subscription in Firestore
        try {
            const userRef = doc(db, "users", userId);
            const subscriptionEnd = new Date();
            subscriptionEnd.setFullYear(subscriptionEnd.getFullYear() + 1); // 1 year subscription

            await updateDoc(userRef, {
                tier: plan, // Set user tier directly for existing code compatibility
                subscription: {
                    plan,
                    status: "active",
                    paymentId: razorpay_payment_id,
                    orderId: razorpay_order_id,
                    startDate: serverTimestamp(),
                    endDate: subscriptionEnd,
                },
                updatedAt: serverTimestamp(),
            });
        } catch (dbError) {
            console.error("Database update error:", dbError);
            // Still return success since payment was verified
        }

        return NextResponse.json({
            success: true,
            message: "Payment verified successfully",
            plan,
        });
    } catch (error) {
        console.error("Payment verification error:", error);
        return NextResponse.json(
            { error: "Payment verification failed" },
            { status: 500 }
        );
    }
}
