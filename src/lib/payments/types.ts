export type PaymentProvider = "orange_money" | "wave";

export interface PaymentRequest {
  amount: number;
  phone: string;
  reference: string;
  description?: string;
}

export interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  status: "pending" | "paid" | "failed" | "cancelled";
  message: string;
}

export interface PaymentStatusResponse {
  success: boolean;
  status: "pending" | "paid" | "failed" | "cancelled";
  message: string;
}

export interface PaymentProviderInterface {
  name: string;
  initiatePayment(request: PaymentRequest): Promise<PaymentResponse>;
  checkStatus(transactionId: string): Promise<PaymentStatusResponse>;
}
