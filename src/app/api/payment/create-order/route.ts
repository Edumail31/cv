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

// Multi-currency pricing
// Note: Razorpay requires amounts in smallest currency unit (paise for INR, cents for USD)
const PRICING = {
    INR: {
        pro: 9900,      // ₹99
        premium: 29900, // ₹299
    },
    USD: {
        pro: 500,       // $5
        premium: 1000,  // $10
    }
};

export async function POST(request: NextRequest) {
    try {
        const rp = getRazorpay();
        if (!rp) {
            return NextResponse.json(
                { error: "Payment gateway not configured" },
                { status: 503 }
            );
        }

        const { plan, userId, currency = "INR" } = await request.json();

        if (!plan || !userId) {
            return NextResponse.json(
                { error: "Plan and userId are required" },
                { status: 400 }
            );
        }

        // Validate currency
        const validCurrency = currency === "USD" ? "USD" : "INR";
        const pricing = PRICING[validCurrency as keyof typeof PRICING];

        const amount = pricing[plan as keyof typeof pricing];
        if (!amount) {
            return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
        }

        // Receipt has 40 char max limit in Razorpay - use short format
        // userId is stored in notes for reference
        const order = await rp.orders.create({
            amount,
            currency: validCurrency,
            receipt: `rcpt_${Date.now()}`,
            notes: {
                userId,
                plan,
                currency: validCurrency,
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
