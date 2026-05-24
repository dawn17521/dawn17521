/**
 * Payment abstraction layer.
 *
 * Real charging requires merchant accounts and API credentials for each
 * provider (Stripe for Visa/Mastercard/credit/debit cards, PayPal, WeChat Pay,
 * Alipay). Those keys are read from environment variables (see .env.example).
 *
 * Until real credentials are supplied, `processPayment` runs in SANDBOX mode:
 * it validates the request and returns a simulated successful charge so the
 * full booking flow works end to end. To go live, implement the provider
 * branches below using the official SDKs and the env credentials.
 */

export type PaymentMethod =
  | "wechat"
  | "alipay"
  | "paypal"
  | "visa"
  | "mastercard"
  | "card";

export const PAYMENT_METHODS: { id: PaymentMethod; label: string }[] = [
  { id: "wechat", label: "微信支付 WeChat Pay" },
  { id: "alipay", label: "支付宝 Alipay" },
  { id: "paypal", label: "PayPal" },
  { id: "visa", label: "Visa" },
  { id: "mastercard", label: "Mastercard" },
  { id: "card", label: "Credit / Debit Card" },
];

const VALID_METHODS = new Set(PAYMENT_METHODS.map((m) => m.id));

export function isValidMethod(method: string): method is PaymentMethod {
  return VALID_METHODS.has(method as PaymentMethod);
}

export interface PaymentRequest {
  bookingId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
}

export interface PaymentResult {
  success: boolean;
  reference: string;
  mode: "live" | "sandbox";
  message?: string;
}

function hasLiveCredentials(method: PaymentMethod): boolean {
  switch (method) {
    case "paypal":
      return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
    case "wechat":
      return Boolean(process.env.WECHAT_PAY_MCH_ID && process.env.WECHAT_PAY_API_KEY);
    case "alipay":
      return Boolean(process.env.ALIPAY_APP_ID && process.env.ALIPAY_PRIVATE_KEY);
    case "visa":
    case "mastercard":
    case "card":
      return Boolean(process.env.STRIPE_SECRET_KEY);
    default:
      return false;
  }
}

export async function processPayment(
  req: PaymentRequest,
): Promise<PaymentResult> {
  if (req.amount <= 0) {
    return { success: false, reference: "", mode: "sandbox", message: "Invalid amount" };
  }

  if (hasLiveCredentials(req.method)) {
    // TODO: integrate the real provider SDK here using the env credentials.
    // e.g. Stripe PaymentIntents for cards, PayPal Orders API, WeChat/Alipay
    // unified order APIs. Return the real transaction reference on success.
    throw new Error(
      `Live credentials for "${req.method}" are present but the provider ` +
        `integration is not implemented yet. Implement it in src/lib/payments.ts.`,
    );
  }

  // SANDBOX: simulate a successful charge.
  const reference = `SBX-${req.method.toUpperCase()}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase()}`;

  return {
    success: true,
    reference,
    mode: "sandbox",
    message: "Sandbox payment simulated successfully.",
  };
}
