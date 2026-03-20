import type { CheckoutEntity, CreateCheckoutRequest, TransactionEntity } from "creem/models/components";

export type HeadersLike =
  | Headers
  | HeadersInit
  | Record<string, string | string[] | number | undefined>;

export type RequestLike =
  | Request
  | {
      headers?: HeadersLike;
      url?: string;
    };

export type MergeStrategy = "preserve" | "overwrite" | "error";

export type DataFastTracking = {
  datafastVisitorId?: string;
  datafastSessionId?: string;
};

export type DataFastPayment = {
  amount: number;
  currency: string;
  transaction_id: string;
  datafast_visitor_id?: string;
  email?: string;
  name?: string;
  customer_id?: string;
  renewal?: boolean;
  refunded?: boolean;
  timestamp?: string;
};

export type DataFastPaymentResponse = {
  message?: string;
  transaction_id?: string;
  [key: string]: unknown;
};

export type RetryOptions = {
  retries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
};

export type Logger = {
  debug?: (message: string, context?: Record<string, unknown>) => void;
  info?: (message: string, context?: Record<string, unknown>) => void;
  warn?: (message: string, context?: Record<string, unknown>) => void;
  error?: (message: string, context?: Record<string, unknown>) => void;
};

export type CreateCheckoutInput = CreateCheckoutRequest & {
  tracking?: Partial<DataFastTracking>;
  mergeStrategy?: MergeStrategy;
};

export type CreateCheckoutContext = {
  request?: RequestLike;
  cookieHeader?: string;
};

export type CreateCheckoutResult = CheckoutEntity & {
  resolvedTracking: DataFastTracking;
};

export type HandleWebhookInput = {
  rawBody: string;
  headers: HeadersLike;
};

export type SupportedWebhookEventType =
  | "checkout.completed"
  | "subscription.paid"
  | "refund.created";

export type IgnoredWebhookReason =
  | "unsupported_event"
  | "duplicate"
  | "subscription_checkout_delegated";

export type HandleWebhookResult =
  | {
      ok: true;
      ignored: true;
      eventId: string;
      eventType: string;
      reason: IgnoredWebhookReason;
    }
  | {
      ok: true;
      ignored: false;
      eventId: string;
      eventType: SupportedWebhookEventType;
      transactionId: string;
      payment: DataFastPayment;
      datafastResponse: DataFastPaymentResponse | string | null;
    };

export interface IdempotencyStore {
  claim(key: string, ttlSeconds: number): Promise<boolean>;
  release?(key: string): Promise<void>;
}

export interface CreemLike {
  checkouts: {
    create(input: CreateCheckoutRequest): Promise<CheckoutEntity>;
  };
  transactions?: {
    getById(id: string): Promise<TransactionEntity>;
  };
}

export type CreateCreemDataFastOptions = {
  creemApiKey?: string;
  creemClient?: CreemLike;
  creemWebhookSecret: string;
  datafastApiKey: string;
  testMode?: boolean;
  strictTracking?: boolean;
  hydrateTransactions?: boolean;
  timeoutMs?: number;
  retry?: RetryOptions;
  idempotencyStore?: IdempotencyStore;
  idempotencyTtlSeconds?: number;
  datafastEndpoint?: string;
  logger?: Logger;
  fetch?: typeof globalThis.fetch;
};

export type CreemDataFastClient = {
  createCheckout(
    input: CreateCheckoutInput,
    context?: CreateCheckoutContext,
  ): Promise<CreateCheckoutResult>;
  handleWebhook(input: HandleWebhookInput): Promise<HandleWebhookResult>;
  handleWebhookRequest(request: Request): Promise<HandleWebhookResult>;
  verifyWebhookSignature(rawBody: string, headers: HeadersLike): Promise<true>;
  forwardPayment(payment: DataFastPayment): Promise<DataFastPaymentResponse | string | null>;
};

export type BaseWebhookEvent = {
  id: string;
  eventType: string;
  created_at?: number;
  object?: unknown;
};

export type WebhookCustomer = {
  id?: string;
  email?: string;
  name?: string;
  [key: string]: unknown;
};

export type WebhookProduct = {
  id?: string;
  name?: string;
  price?: number;
  currency?: string;
  [key: string]: unknown;
};

export type WebhookSubscription = {
  id?: string;
  metadata?: Record<string, unknown>;
  status?: string;
  [key: string]: unknown;
};

export type WebhookOrder = {
  id?: string;
  transaction?: string;
  amount?: number;
  amount_paid?: number;
  amountPaid?: number;
  amount_due?: number;
  amountDue?: number;
  currency?: string;
  created_at?: string;
  createdAt?: string;
  type?: string;
  [key: string]: unknown;
};

export type CheckoutCompletedObject = {
  id?: string;
  object?: string;
  order?: WebhookOrder;
  product?: WebhookProduct;
  customer?: WebhookCustomer | string;
  subscription?: WebhookSubscription | string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
};

export type SubscriptionPaidObject = {
  id?: string;
  object?: string;
  product?: WebhookProduct;
  customer?: WebhookCustomer | string;
  collection_method?: string;
  last_transaction_id?: string;
  last_transaction_date?: string;
  current_period_start_date?: string;
  current_period_end_date?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
};

export type RefundObject = {
  id?: string;
  object?: string;
  refund_amount?: number;
  refund_currency?: string;
  transaction?:
    | {
        id?: string;
        amount?: number;
        amount_paid?: number;
        amountPaid?: number;
        currency?: string;
        created_at?: number | string;
        createdAt?: number | string;
        [key: string]: unknown;
      }
    | string;
  subscription?: WebhookSubscription | string;
  customer?: WebhookCustomer | string;
  created_at?: number | string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
};
