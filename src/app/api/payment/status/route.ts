import { NextResponse } from "next/server";

export async function GET() {
    const hasKeyId = !!process.env.RAZORPAY_KEY_ID;
    const hasKeySecret = !!process.env.RAZORPAY_KEY_SECRET;

    return NextResponse.json({
        razorpay: {
            keyIdConfigured: hasKeyId,
            keySecretConfigured: hasKeySecret,
            keyIdPrefix: hasKeyId ? process.env.RAZORPAY_KEY_ID?.substring(0, 10) + "..." : "NOT SET",
        },
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
    });
}
