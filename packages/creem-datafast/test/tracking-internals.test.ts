import { describe, expect, it } from "vitest";

import {
  getTrackingFromCookieHeader,
  getTrackingFromMetadata,
  getTrackingFromUrl,
  resolveCheckoutTracking,
  toTrackingMetadata,
} from "../src/tracking";

describe("tracking internals", () => {
  it("reads tracking from metadata, cookies, and URL aliases", () => {
    expect(
      getTrackingFromMetadata({
        datafast_visitor_id: "vis_123",
        datafast_session_id: "sess_456",
      }),
    ).toEqual({
      datafastVisitorId: "vis_123",
      datafastSessionId: "sess_456",
    });
    expect(getTrackingFromMetadata({ datafast_visitor_id: 123 })).toEqual({
      datafastVisitorId: undefined,
      datafastSessionId: undefined,
    });

    expect(
      getTrackingFromCookieHeader("foo=bar; datafast_visitor_id=vis%20123; datafast_session_id=sess%20456"),
    ).toEqual({
      datafastVisitorId: "vis 123",
      datafastSessionId: "sess 456",
    });
    expect(getTrackingFromCookieHeader("broken-cookie; datafast_session_id=sess_only")).toEqual({
      datafastVisitorId: undefined,
      datafastSessionId: "sess_only",
    });
    expect(getTrackingFromCookieHeader("")).toEqual({});

    expect(getTrackingFromUrl("https://example.com?_df_vid=vid_alias&_df_sid=sid_alias")).toEqual({
      datafastVisitorId: "vid_alias",
      datafastSessionId: "sid_alias",
    });
    expect(getTrackingFromUrl()).toEqual({});
  });

  it("serializes resolved tracking back into metadata", () => {
    expect(
      toTrackingMetadata({
        datafastVisitorId: "vis_123",
        datafastSessionId: "sess_456",
      }),
    ).toEqual({
      datafast_visitor_id: "vis_123",
      datafast_session_id: "sess_456",
    });
    expect(toTrackingMetadata({})).toEqual({});
  });

  it("prefers explicit tracking over metadata and discovered request values", () => {
    const result = resolveCheckoutTracking(
      {
        productId: "prod_123",
        tracking: {
          datafastVisitorId: "explicit_vis",
        },
        metadata: {
          datafast_visitor_id: "meta_vis",
          datafast_session_id: "meta_sess",
        },
      },
      {
        request: {
          url: "https://example.com/api/checkout?datafast_visitor_id=query_vis&datafast_session_id=query_sess",
          headers: {
            cookie: "datafast_visitor_id=cookie_vis; datafast_session_id=cookie_sess",
          },
        },
        cookieHeader: "datafast_visitor_id=fallback_vis; datafast_session_id=fallback_sess",
      },
    );

    expect(result.tracking).toEqual({
      datafastVisitorId: "explicit_vis",
      datafastSessionId: "meta_sess",
    });
    expect(result.metadata).toEqual({
      datafast_visitor_id: "explicit_vis",
      datafast_session_id: "meta_sess",
    });
  });

  it("falls back from request cookies to explicit fallback cookieHeader and returns undefined metadata when empty", () => {
    const withFallback = resolveCheckoutTracking(
      {
        productId: "prod_123",
      },
      {
        request: {
          url: "https://example.com/api/checkout",
          headers: {},
        },
        cookieHeader: "datafast_session_id=fallback_sess",
      },
    );

    expect(withFallback).toEqual({
      metadata: {
        datafast_session_id: "fallback_sess",
      },
      tracking: {
        datafastVisitorId: undefined,
        datafastSessionId: "fallback_sess",
      },
    });

    expect(
      resolveCheckoutTracking({
        productId: "prod_456",
      }),
    ).toEqual({
      metadata: undefined,
      tracking: {
        datafastVisitorId: undefined,
        datafastSessionId: undefined,
      },
    });
  });

  it("keeps existing metadata when incoming tracking matches or is absent", () => {
    expect(
      resolveCheckoutTracking(
        {
          productId: "prod_123",
          metadata: {
            datafast_visitor_id: "meta_vis",
          },
        },
        {
          request: {
            url: "https://example.com/api/checkout?datafast_visitor_id=meta_vis",
          },
        },
      ),
    ).toEqual({
      metadata: {
        datafast_visitor_id: "meta_vis",
      },
      tracking: {
        datafastVisitorId: "meta_vis",
        datafastSessionId: undefined,
      },
    });

    expect(
      resolveCheckoutTracking({
        productId: "prod_123",
        metadata: {
          datafast_session_id: "meta_sess",
        },
      }),
    ).toEqual({
      metadata: {
        datafast_session_id: "meta_sess",
      },
      tracking: {
        datafastVisitorId: undefined,
        datafastSessionId: "meta_sess",
      },
    });
  });
});
