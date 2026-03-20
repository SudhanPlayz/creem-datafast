import type { TransactionEntity } from "creem/models/components";

import type {
  BaseWebhookEvent,
  CheckoutCompletedObject,
  CreateCreemDataFastOptions,
  DataFastPayment,
  DataFastTracking,
  RefundObject,
  SubscriptionPaidObject,
  SupportedWebhookEventType,
  WebhookCustomer,
  WebhookSubscription,
} from "./types";
import { minorToMajorAmount } from "./currency";
import { UnsupportedEventError } from "./errors";
import { asNumber, asRecord, asString, cleanObject, parseJson, toIsoString } from "./utils";

type MapWebhookEventOptions = Pick<CreateCreemDataFastOptions, "creemClient" | "hydrateTransactions" | "logger">;

type MapWebhookEventResult =
  | {
      ignored: true;
      eventId: string;
      eventType: string;
      reason: "unsupported_event" | "subscription_checkout_delegated";
    }
  | {
      ignored: false;
      eventId: string;
      eventType: SupportedWebhookEventType;
      transactionId: string;
      payment: DataFastPayment;
    };

export async function mapWebhookToPayment(
  rawBody: string,
  options: MapWebhookEventOptions,
): Promise<MapWebhookEventResult> {
  const event = parseJson(rawBody) as BaseWebhookEvent;
  if (!event || typeof event.id !== "string" || typeof event.eventType !== "string") {
    throw new UnsupportedEventError("Webhook payload is missing the event id or event type.");
  }

  switch (event.eventType) {
    case "checkout.completed":
      return mapCheckoutCompleted(event);
    case "subscription.paid":
      return mapSubscriptionPaid(event, options);
    case "refund.created":
      return mapRefundCreated(event, options);
    default:
      return {
        ignored: true,
        eventId: event.id,
        eventType: event.eventType,
        reason: "unsupported_event",
      };
  }
}

async function mapCheckoutCompleted(event: BaseWebhookEvent): Promise<MapWebhookEventResult> {
  const checkout = asRecord(event.object) as CheckoutCompletedObject | undefined;
  const order = asRecord(checkout?.order);
  const orderType = asString(order?.type);
  const subscription = asSubscription(checkout?.subscription);

  if (subscription || orderType === "recurring") {
    return {
      ignored: true,
      eventId: event.id,
      eventType: event.eventType,
      reason: "subscription_checkout_delegated",
    };
  }

  const amountMinor =
    asNumber(order?.amountPaid) ??
    asNumber(order?.amount_paid) ??
    asNumber(order?.amountDue) ??
    asNumber(order?.amount_due) ??
    asNumber(order?.amount);
  const currency = asString(order?.currency) ?? asString(asRecord(checkout?.product)?.currency);

  if (amountMinor === undefined || !currency) {
    throw new UnsupportedEventError("checkout.completed webhook is missing amount or currency.");
  }

  const customer = getCustomerDetails(checkout?.customer);
  const tracking = getWebhookTracking(checkout?.metadata);
  const transactionId = asString(order?.transaction) ?? asString(order?.id) ?? event.id;
  const timestamp =
    toIsoString(order?.createdAt) ?? toIsoString(order?.created_at) ?? toIsoString(event.created_at);

  return {
    ignored: false,
    eventId: event.id,
    eventType: "checkout.completed",
    transactionId,
    payment: cleanObject({
      amount: minorToMajorAmount(amountMinor, currency),
      currency,
      transaction_id: transactionId,
      datafast_visitor_id: tracking.datafastVisitorId,
      email: customer.email,
      name: customer.name,
      customer_id: customer.id,
      renewal: false,
      timestamp,
    }),
  };
}

async function mapSubscriptionPaid(
  event: BaseWebhookEvent,
  options: MapWebhookEventOptions,
): Promise<MapWebhookEventResult> {
  const subscription = asRecord(event.object) as SubscriptionPaidObject | undefined;
  const product = asRecord(subscription?.product);
  const transactionId = asString(subscription?.last_transaction_id) ?? asString(subscription?.id) ?? event.id;
  const hydratedTransaction = options.hydrateTransactions
    ? await tryHydrateTransaction(transactionId, options)
    : undefined;
  const currency = hydratedTransaction?.currency ?? asString(product?.currency);
  const amountMinor =
    hydratedTransaction?.amountPaid ??
    hydratedTransaction?.amount ??
    asNumber(product?.price);

  if (amountMinor === undefined || !currency) {
    throw new UnsupportedEventError("subscription.paid webhook is missing amount or currency.");
  }

  const customer = getCustomerDetails(subscription?.customer);
  const tracking = getWebhookTracking(subscription?.metadata);
  const timestamp =
    toIsoString(hydratedTransaction?.createdAt) ??
    toIsoString(subscription?.current_period_start_date) ??
    toIsoString(subscription?.last_transaction_date) ??
    toIsoString(event.created_at);

  return {
    ignored: false,
    eventId: event.id,
    eventType: "subscription.paid",
    transactionId,
    payment: cleanObject({
      amount: minorToMajorAmount(amountMinor, currency),
      currency,
      transaction_id: transactionId,
      datafast_visitor_id: tracking.datafastVisitorId,
      email: customer.email,
      name: customer.name,
      customer_id: customer.id,
      renewal: true,
      timestamp,
    }),
  };
}

async function mapRefundCreated(
  event: BaseWebhookEvent,
  options: MapWebhookEventOptions,
): Promise<MapWebhookEventResult> {
  const refund = asRecord(event.object) as RefundObject | undefined;
  const transaction = asRecord(refund?.transaction);
  const subscription = asSubscription(refund?.subscription);
  const transactionId = asString(refund?.id) ?? asString(transaction?.id) ?? event.id;
  const hydratedTransaction =
    options.hydrateTransactions && asString(transaction?.id)
      ? await tryHydrateTransaction(asString(transaction?.id) ?? transactionId, options)
      : undefined;
  const currency =
    asString(refund?.refund_currency) ??
    hydratedTransaction?.currency ??
    asString(transaction?.currency);
  const amountMinor =
    asNumber(refund?.refund_amount) ??
    hydratedTransaction?.refundedAmount ??
    asNumber(transaction?.amountPaid) ??
    asNumber(transaction?.amount_paid) ??
    asNumber(transaction?.amount);

  if (amountMinor === undefined || !currency) {
    throw new UnsupportedEventError("refund.created webhook is missing refund amount or currency.");
  }

  const customer = getCustomerDetails(refund?.customer);
  const tracking = getWebhookTracking(refund?.metadata, subscription?.metadata);
  const timestamp =
    toIsoString(refund?.created_at) ??
    toIsoString(hydratedTransaction?.createdAt) ??
    toIsoString(transaction?.createdAt) ??
    toIsoString(transaction?.created_at) ??
    toIsoString(event.created_at);

  return {
    ignored: false,
    eventId: event.id,
    eventType: "refund.created",
    transactionId,
    payment: cleanObject({
      amount: minorToMajorAmount(amountMinor, currency),
      currency,
      transaction_id: transactionId,
      datafast_visitor_id: tracking.datafastVisitorId,
      email: customer.email,
      name: customer.name,
      customer_id: customer.id,
      refunded: true,
      timestamp,
    }),
  };
}

async function tryHydrateTransaction(
  transactionId: string,
  options: MapWebhookEventOptions,
): Promise<TransactionEntity | undefined> {
  if (!options.creemClient?.transactions?.getById) {
    return undefined;
  }

  try {
    return await options.creemClient.transactions.getById(transactionId);
  } catch (error) {
    options.logger?.warn?.("Falling back to webhook payload after transaction hydration failure.", {
      transactionId,
      error: error instanceof Error ? error.message : String(error),
    });
    return undefined;
  }
}

function getCustomerDetails(input: WebhookCustomer | string | undefined): {
  id?: string;
  email?: string;
  name?: string;
} {
  if (typeof input === "string") {
    return { id: input };
  }

  return {
    id: asString(input?.id),
    email: asString(input?.email),
    name: asString(input?.name),
  };
}

function getWebhookTracking(...sources: Array<Record<string, unknown> | undefined>): DataFastTracking {
  for (const source of sources) {
    const visitorId = typeof source?.datafast_visitor_id === "string" ? source.datafast_visitor_id : undefined;
    const sessionId = typeof source?.datafast_session_id === "string" ? source.datafast_session_id : undefined;
    if (visitorId || sessionId) {
      return {
        datafastVisitorId: visitorId,
        datafastSessionId: sessionId,
      };
    }
  }

  return {};
}

function asSubscription(input: unknown): WebhookSubscription | undefined {
  return asRecord(input) as WebhookSubscription | undefined;
}
