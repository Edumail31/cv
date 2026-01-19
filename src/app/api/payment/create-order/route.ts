import { NextRequest, NextResponse } from "next/server";

// Lazy initialization to avoid build-time errors
let razorpay: InstanceType<typeof import("razorpay")> | null = null;

function getRazorpay() {
    if (!razorpay && process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const Razorpay = require("razorpay");
        razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });
    }
    return razorpay;
}

export async function POST(request: NextRequest) {
    try {
        const rp = getRazorpay();
        if (!rp) {
            return NextResponse.json(
                { error: "Payment gateway not configured" },
                { status: 503 }
            );
        }

        const { plan, userId } = await request.json();

        if (!plan || !userId) {
            return NextResponse.json(
                { error: "Plan and userId are required" },
                { status: 400 }
            );
        }

        // Pricing in paise (INR * 100)
        const pricing: Record<string, number> = {
            pro: 9900,      // ₹99
            premium: 29900, // ₹299
        };

        const amount = pricing[plan];
        if (!amount) {
            return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
        }

        const order = await rp.orders.create({
            amount,
            currency: "INR",
            receipt: `receipt_${userId}_${Date.now()}`,
            notes: {
                userId,
                plan,
            },
        });

        return NextResponse.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: process.env.RAZORPAY_KEY_ID,
        });
    } catch (error) {
        console.error("Create order error:", error);
        return NextResponse.json(
            { error: "Failed to create order" },
            { status: 500 }
        );
    }
}

