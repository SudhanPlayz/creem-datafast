import { TrackingCollisionError } from "./errors";
import type { CreateCheckoutContext, CreateCheckoutInput, DataFastTracking, MergeStrategy } from "./types";
import { getHeader, getRequestDetails, toUrl } from "./utils";

export function getTrackingFromMetadata(metadata?: Record<string, unknown>): DataFastTracking {
  return {
    datafastVisitorId:
      typeof metadata?.datafast_visitor_id === "string" ? metadata.datafast_visitor_id : undefined,
    datafastSessionId:
      typeof metadata?.datafast_session_id === "string" ? metadata.datafast_session_id : undefined,
  };
}

export function getTrackingFromCookieHeader(cookieHeader?: string): DataFastTracking {
  if (!cookieHeader) {
    return {};
  }

  const cookies = new Map<string, string>();
  for (const part of cookieHeader.split(";")) {
    const [rawKey, ...rawValue] = part.trim().split("=");
    if (!rawKey || rawValue.length === 0) {
      continue;
    }

    cookies.set(rawKey, decodeURIComponent(rawValue.join("=")));
  }

  return {
    datafastVisitorId: cookies.get("datafast_visitor_id"),
    datafastSessionId: cookies.get("datafast_session_id"),
  };
}

export function getTrackingFromUrl(input?: string): DataFastTracking {
  if (!input) {
    return {};
  }

  const url = toUrl(input);
  const params = url.searchParams;

  return {
    datafastVisitorId:
      params.get("datafast_visitor_id") ?? params.get("_df_vid") ?? undefined,
    datafastSessionId:
      params.get("datafast_session_id") ?? params.get("_df_sid") ?? undefined,
  };
}

export function toTrackingMetadata(tracking: DataFastTracking): Record<string, string> {
  const metadata: Record<string, string> = {};
  if (tracking.datafastVisitorId) {
    metadata.datafast_visitor_id = tracking.datafastVisitorId;
  }
  if (tracking.datafastSessionId) {
    metadata.datafast_session_id = tracking.datafastSessionId;
  }
  return metadata;
}

export function resolveCheckoutTracking(
  input: CreateCheckoutInput,
  context?: CreateCheckoutContext,
): {
  metadata?: Record<string, unknown>;
  tracking: DataFastTracking;
} {
  const requestDetails = getRequestDetails(context?.request);
  const queryTracking = getTrackingFromUrl(requestDetails.url);
  const requestCookieTracking = getTrackingFromCookieHeader(getHeader(requestDetails.headers, "cookie"));
  const fallbackCookieTracking = getTrackingFromCookieHeader(context?.cookieHeader);
  const existingMetadata = { ...(input.metadata ?? {}) };
  const metadataTracking = getTrackingFromMetadata(existingMetadata);
  const mergeStrategy = input.mergeStrategy ?? "preserve";

  const discoveredTracking: DataFastTracking = {
    datafastVisitorId:
      queryTracking.datafastVisitorId ??
      requestCookieTracking.datafastVisitorId ??
      fallbackCookieTracking.datafastVisitorId,
    datafastSessionId:
      queryTracking.datafastSessionId ??
      requestCookieTracking.datafastSessionId ??
      fallbackCookieTracking.datafastSessionId,
  };

  const resolvedTracking: DataFastTracking = {
    datafastVisitorId: resolveTrackingField({
      explicit: input.tracking?.datafastVisitorId,
      existing: metadataTracking.datafastVisitorId,
      incoming: discoveredTracking.datafastVisitorId,
      fieldName: "datafast_visitor_id",
      mergeStrategy,
    }),
    datafastSessionId: resolveTrackingField({
      explicit: input.tracking?.datafastSessionId,
      existing: metadataTracking.datafastSessionId,
      incoming: discoveredTracking.datafastSessionId,
      fieldName: "datafast_session_id",
      mergeStrategy,
    }),
  };

  if (resolvedTracking.datafastVisitorId) {
    existingMetadata.datafast_visitor_id = resolvedTracking.datafastVisitorId;
  }

  if (resolvedTracking.datafastSessionId) {
    existingMetadata.datafast_session_id = resolvedTracking.datafastSessionId;
  }

  return {
    metadata: Object.keys(existingMetadata).length > 0 ? existingMetadata : undefined,
    tracking: resolvedTracking,
  };
}

function resolveTrackingField({
  explicit,
  existing,
  incoming,
  fieldName,
  mergeStrategy,
}: {
  explicit?: string;
  existing?: string;
  incoming?: string;
  fieldName: string;
  mergeStrategy: MergeStrategy;
}): string | undefined {
  if (explicit) {
    return explicit;
  }

  if (!existing) {
    return incoming;
  }

  if (!incoming || incoming === existing) {
    return existing;
  }

  if (mergeStrategy === "overwrite") {
    return incoming;
  }

  if (mergeStrategy === "error") {
    throw new TrackingCollisionError(
      `Tracking field ${fieldName} already exists in metadata with a different value.`,
    );
  }

  return existing;
}
