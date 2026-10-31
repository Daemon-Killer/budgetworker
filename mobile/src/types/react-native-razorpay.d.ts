declare module "react-native-razorpay" {
  type Payment = { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string };
  type CheckoutOptions = {
    key: string; order_id: string; amount: number; currency: string; name: string;
    description?: string; prefill?: { name?: string; contact?: string; email?: string };
    theme?: { color: string };
  };
  const RazorpayCheckout: { open(options: CheckoutOptions): Promise<Payment> };
  export default RazorpayCheckout;
}
