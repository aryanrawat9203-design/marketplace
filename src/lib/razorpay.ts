// Shared client-side Razorpay checkout types. The single global declaration
// lives here so every component that opens the payment modal agrees on it.

export type RazorpayResponse = {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_subscription_id?: string;
  razorpay_signature: string;
};

export type RazorpayOptions = {
  key: string;
  amount?: number;
  currency?: string;
  name: string;
  description?: string;
  // One-time purchases pass order_id; recurring AI-chat subscriptions pass
  // subscription_id instead - Razorpay Checkout reads amount/currency off
  // the subscription itself in that case.
  order_id?: string;
  subscription_id?: string;
  handler: (r: RazorpayResponse) => void;
  theme?: { color?: string };
};

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => { open: () => void };
  }
}
