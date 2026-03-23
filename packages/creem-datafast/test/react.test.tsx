// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { initDataFastMock } = vi.hoisted(() => ({
  initDataFastMock: vi.fn(),
}));

vi.mock("datafast", () => ({
  initDataFast: initDataFastMock,
}));

import {
  CreemCheckoutButton,
  CreemDataFastProvider,
  CreemPaymentLinkButton,
  TrackingInspector,
  TrackingStatusBadge,
  useAttributedCheckoutAction,
  useAttributedPaymentLink,
  useDataFastTracking,
} from "../src/react/index";

describe("react attribution layer", () => {
  beforeEach(() => {
    cleanup();
    document.head.innerHTML = "";
    document.body.innerHTML = "";
    initDataFastMock.mockReset();
    vi.stubGlobal("location", new URL("https://creem-datafast.itzsudhan.com/demo"));
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("initializes DataFast, resolves the root domain, and exposes tracking state", async () => {
    const client = createMockClient();
    initDataFastMock.mockResolvedValueOnce(client);

    render(
      <CreemDataFastProvider apiUrl="/api/events" websiteId="dfid_live">
        <TrackingInspector />
      </CreemDataFastProvider>,
    );

    await screen.findByText("vis_live");

    expect(initDataFastMock).toHaveBeenCalledWith({
      websiteId: "dfid_live",
      domain: "itzsudhan.com",
      apiUrl: "/api/events",
      debug: undefined,
      flushInterval: undefined,
      maxQueueSize: undefined,
      allowLocalhost: true,
      allowedHostnames: undefined,
      autoCapturePageviews: {
        captureInitialPageview: false,
      },
    });
    expect(client.trackPageview).toHaveBeenCalledOnce();
    expect(client.flush).toHaveBeenCalledOnce();
    expect(screen.getByText("https://creem-datafast.itzsudhan.com/api/events")).toBeTruthy();
    expect(screen.getByText("Tracking Ready")).toBeTruthy();
  });

  it("passes through explicit domain and auto-capture config when initial flushing is disabled", async () => {
    const client = createMockClient({
      visitorId: "vis_domain",
      sessionId: "sess_domain",
    });
    initDataFastMock.mockResolvedValueOnce(client);

    render(
      <CreemDataFastProvider
        apiUrl="/proxy/events"
        autoCapturePageviews={{ enabled: false, debounceMs: 250 }}
        domain="https://www.pay.itzsudhan.com"
        flushInitialPageview={false}
        websiteId="dfid_domain"
      >
        <TrackingInspector />
      </CreemDataFastProvider>,
    );

    await screen.findByText("vis_domain");

    expect(initDataFastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        domain: "pay.itzsudhan.com",
        autoCapturePageviews: {
          enabled: false,
          debounceMs: 250,
        },
      }),
    );
    expect(client.trackPageview).not.toHaveBeenCalled();
    expect(client.flush).not.toHaveBeenCalled();
  });

  it("keeps auto-capture disabled and resolves multi-segment suffix domains", async () => {
    const client = createMockClient({
      visitorId: "vis_uk",
      sessionId: "sess_uk",
    });
    initDataFastMock.mockResolvedValueOnce(client);
    vi.stubGlobal("location", new URL("https://checkout.example.co.uk/demo"));

    render(
      <CreemDataFastProvider autoCapturePageviews={false} websiteId="dfid_uk">
        <TrackingInspector />
      </CreemDataFastProvider>,
    );

    await screen.findByText("vis_uk");

    expect(initDataFastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        domain: "example.co.uk",
        autoCapturePageviews: false,
      }),
    );
    expect(client.trackPageview).toHaveBeenCalledOnce();
    expect(client.flush).toHaveBeenCalledOnce();
  });

  it("supports bare domains, explicit true auto-capture, and default widget labels", async () => {
    const client = createMockClient({
      visitorId: "vis_two_part",
      sessionId: "sess_two_part",
    });
    initDataFastMock.mockResolvedValueOnce(client);
    vi.stubGlobal("location", new URL("https://example.com/demo"));

    render(
      <CreemDataFastProvider autoCapturePageviews={true} websiteId="dfid_two_part">
        <TrackingInspector title="Inspector" subtitle="Two-part domain" />
        <CreemCheckoutButton action="/api/checkout" disabled requireReady={false} />
        <CreemPaymentLinkButton href="https://creem.io/payment/prod_123" requireReady={false} />
      </CreemDataFastProvider>,
    );

    await screen.findByText("vis_two_part");

    expect(initDataFastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        domain: "example.com",
        autoCapturePageviews: {
          captureInitialPageview: false,
        },
      }),
    );
    expect(screen.getByRole("button", { name: "Launch Checkout" })).toHaveProperty("disabled", true);
    expect(screen.getByRole("link", { name: "Open Direct Creem Link" })).toBeTruthy();
  });

  it("overrides captureInitialPageview when object auto-capture config is provided", async () => {
    const client = createMockClient({
      visitorId: "vis_object_capture",
      sessionId: "sess_object_capture",
    });
    initDataFastMock.mockResolvedValueOnce(client);

    render(
      <CreemDataFastProvider
        autoCapturePageviews={{ enabled: true, debounceMs: 120, trackHashChanges: true }}
        websiteId="dfid_object_capture"
      >
        <TrackingInspector />
      </CreemDataFastProvider>,
    );

    await screen.findByText("vis_object_capture");

    expect(initDataFastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        autoCapturePageviews: {
          enabled: true,
          debounceMs: 120,
          trackHashChanges: true,
          captureInitialPageview: false,
        },
      }),
    );
  });

  it("throws when hooks are used outside the provider", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const Probe = () => {
      useDataFastTracking();
      return null;
    };

    expect(() => render(<Probe />)).toThrow(
      "useDataFastTracking must be used within CreemDataFastProvider.",
    );

    consoleError.mockRestore();
  });

  it("surfaces error state when the SDK init fails with an Error", async () => {
    initDataFastMock.mockRejectedValueOnce(new Error("Proxy down"));

    render(
      <CreemDataFastProvider websiteId="dfid_error">
        <TrackingInspector />
      </CreemDataFastProvider>,
    );

    await waitFor(() => {
      expect(screen.getAllByText("Proxy down")).toHaveLength(2);
    });

    expect(screen.getByText("Tracking Error")).toBeTruthy();
    expect(screen.getByText(DEFAULT_EVENTS_URL)).toBeTruthy();
  });

  it("wraps non-Error failures and validates missing website IDs", async () => {
    initDataFastMock.mockRejectedValueOnce("boom");

    render(
      <CreemDataFastProvider websiteId="dfid_string_error">
        <TrackingInspector />
      </CreemDataFastProvider>,
    );

    await waitFor(() => {
      expect(screen.getAllByText("Failed to initialize DataFast.")).toHaveLength(2);
    });
    cleanup();
    initDataFastMock.mockReset();

    render(
      <CreemDataFastProvider websiteId=" ">
        <TrackingInspector />
      </CreemDataFastProvider>,
    );

    await waitFor(() => {
      expect(screen.getAllByText("Missing DataFast websiteId.")).toHaveLength(2);
    });
    expect(initDataFastMock).not.toHaveBeenCalled();
  });

  it("builds attributed checkout actions and payment links from provider tracking", async () => {
    const client = createMockClient();
    initDataFastMock.mockResolvedValueOnce(client);

    render(
      <CreemDataFastProvider websiteId="dfid_hooks">
        <HookProbe />
      </CreemDataFastProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("checkout-action").textContent).toContain(
        "datafast_visitor_id=override_visitor",
      );
    });

    expect(screen.getByTestId("checkout-action").textContent).toContain(
      "datafast_session_id=override_session",
    );
    expect(screen.getByTestId("payment-link").textContent).toContain(
      "metadata%5Bdatafast_visitor_id%5D=vis_live",
    );
    expect(screen.getByTestId("payment-link").textContent).toContain(
      "metadata%5Bdatafast_session_id%5D=sess_live",
    );
    expect(screen.getByTestId("payment-link-override").textContent).toContain(
      "metadata%5Bdatafast_visitor_id%5D=override_link_visitor",
    );
    expect(screen.getByTestId("payment-link-override").textContent).toContain(
      "metadata%5Bdatafast_session_id%5D=override_link_session",
    );
    expect(screen.getByTestId("resolved-domain").textContent).toBe("itzsudhan.com");
  });

  it("disables buttons while tracking is syncing and enables them once ready", async () => {
    const client = createMockClient({
      visitorId: "vis_button",
      sessionId: "sess_button",
    });
    const deferred = createDeferred<typeof client>();
    initDataFastMock.mockReturnValueOnce(deferred.promise);
    const onClick = vi.fn();

    render(
      <CreemDataFastProvider apiUrl="/api/events" websiteId="dfid_buttons">
        <TrackingStatusBadge />
        <CreemCheckoutButton
          action="/api/checkout"
          buttonClassName="demo-button"
          className="hero-button"
          formClassName="checkout-form"
        >
          Launch
        </CreemCheckoutButton>
        <CreemPaymentLinkButton
          className="link-button"
          href="https://creem.io/payment/prod_123"
          onClick={(event) => {
            event.preventDefault();
            onClick();
          }}
        >
          Link
        </CreemPaymentLinkButton>
      </CreemDataFastProvider>,
    );

    const checkoutButton = screen.getByRole("button", { name: "Launch" });
    const paymentLink = screen.getByRole("link", { name: "Link" });

    expect(screen.getByText("Syncing Tracking")).toBeTruthy();
    expect(checkoutButton).toHaveProperty("disabled", true);
    expect(paymentLink.getAttribute("aria-disabled")).toBe("true");
    expect(paymentLink.getAttribute("href")).toBe("#");

    fireEvent.click(paymentLink);
    expect(onClick).not.toHaveBeenCalled();

    deferred.resolve(client);

    await waitFor(() => {
      expect(checkoutButton).toHaveProperty("disabled", false);
    });

    expect(screen.getByText("Tracking Ready")).toBeTruthy();
    expect(checkoutButton.className).toContain("hero-button");
    expect(checkoutButton.className).toContain("demo-button");
    expect(checkoutButton.closest("form")?.className).toContain("checkout-form");
    expect(checkoutButton.closest("form")?.getAttribute("action")).toContain(
      "datafast_visitor_id=vis_button",
    );
    expect(paymentLink.getAttribute("aria-disabled")).toBe("false");
    expect(paymentLink.getAttribute("href")).toContain(
      "metadata%5Bdatafast_visitor_id%5D=vis_button",
    );

    fireEvent.click(paymentLink);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("injects package styles once, and can opt out of style injection", async () => {
    const firstClient = createMockClient({
      visitorId: "vis_first",
      sessionId: "sess_first",
    });
    const secondClient = createMockClient({
      visitorId: "vis_second",
      sessionId: "sess_second",
    });
    const thirdClient = createMockClient({
      visitorId: "vis_third",
      sessionId: "sess_third",
    });
    initDataFastMock
      .mockResolvedValueOnce(firstClient)
      .mockResolvedValueOnce(secondClient)
      .mockResolvedValueOnce(thirdClient);

    render(
      <CreemDataFastProvider injectStyles={false} websiteId="dfid_no_styles">
        <TrackingInspector />
      </CreemDataFastProvider>,
    );

    await screen.findByText("vis_first");
    expect(document.head.querySelectorAll("#creem-datafast-react-styles")).toHaveLength(0);

    cleanup();

    render(
      <>
        <CreemDataFastProvider websiteId="dfid_styles_one">
          <TrackingInspector />
        </CreemDataFastProvider>
        <CreemDataFastProvider websiteId="dfid_styles_two">
          <TrackingInspector />
        </CreemDataFastProvider>
      </>,
    );

    await screen.findByText("vis_second");
    await screen.findByText("vis_third");
    expect(document.head.querySelectorAll("#creem-datafast-react-styles")).toHaveLength(1);
  });

  it("falls back to localhost when runtime location is unavailable", async () => {
    const client = createMockClient({
      visitorId: "vis_localhost",
      sessionId: "sess_localhost",
    });
    const deferred = createDeferred<typeof client>();
    initDataFastMock.mockReturnValueOnce(deferred.promise);
    vi.stubGlobal("location", undefined);

    render(
      <CreemDataFastProvider apiUrl="/proxy/events" websiteId="dfid_localhost">
        <TrackingInspector />
      </CreemDataFastProvider>,
    );

    expect(screen.getByText("Syncing Tracking")).toBeTruthy();
    expect(screen.getByText("Syncing")).toBeTruthy();
    expect(initDataFastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        domain: "localhost",
        apiUrl: "/proxy/events",
      }),
    );

    deferred.resolve(client);

    await screen.findByText("vis_localhost");
    expect(screen.getByText("http://localhost/proxy/events")).toBeTruthy();
  });

  it("normalizes blank hostnames back to localhost", async () => {
    const client = createMockClient({
      visitorId: "vis_blank_host",
      sessionId: "sess_blank_host",
    });
    initDataFastMock.mockResolvedValueOnce(client);
    vi.stubGlobal("location", {
      hostname: " ",
      origin: "http://localhost",
    });

    render(
      <CreemDataFastProvider websiteId="dfid_blank_host">
        <TrackingInspector />
      </CreemDataFastProvider>,
    );

    await screen.findByText("vis_blank_host");

    expect(initDataFastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        domain: "localhost",
      }),
    );
  });

  it("passes through hostname allowlists and custom localhost behavior", async () => {
    const client = createMockClient({
      visitorId: "vis_allowlist",
      sessionId: "sess_allowlist",
    });
    initDataFastMock.mockResolvedValueOnce(client);

    render(
      <CreemDataFastProvider
        allowLocalhost={false}
        allowedHostnames={["creem-datafast.itzsudhan.com", "preview.itzsudhan.com"]}
        websiteId="dfid_allowlist"
      >
        <TrackingInspector />
      </CreemDataFastProvider>,
    );

    await screen.findByText("vis_allowlist");

    expect(initDataFastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        allowLocalhost: false,
        allowedHostnames: ["creem-datafast.itzsudhan.com", "preview.itzsudhan.com"],
      }),
    );
  });

  it("ignores late init failures after the provider unmounts", async () => {
    const deferred = createDeferred<ReturnType<typeof createMockClient>>();
    void deferred.promise.catch(() => undefined);
    initDataFastMock.mockReturnValueOnce(deferred.promise);

    const view = render(
      <CreemDataFastProvider websiteId="dfid_unmount_failure">
        <TrackingInspector />
      </CreemDataFastProvider>,
    );

    view.unmount();
    deferred.reject(new Error("late failure"));

    await waitFor(() => {
      expect(initDataFastMock).toHaveBeenCalledOnce();
    });
  });

  it("ignores late init success after the provider unmounts", async () => {
    const client = createMockClient({
      visitorId: "vis_unmount_success",
      sessionId: "sess_unmount_success",
    });
    const deferred = createDeferred<typeof client>();
    initDataFastMock.mockReturnValueOnce(deferred.promise);

    const view = render(
      <CreemDataFastProvider websiteId="dfid_unmount_success">
        <TrackingInspector />
      </CreemDataFastProvider>,
    );

    view.unmount();
    deferred.resolve(client);

    await waitFor(() => {
      expect(client.getTrackingParams).toHaveBeenCalledOnce();
    });
  });
});

const DEFAULT_EVENTS_URL = "https://datafa.st/api/events";

function HookProbe() {
  const action = useAttributedCheckoutAction("/api/checkout", {
    tracking: {
      datafastVisitorId: "override_visitor",
      datafastSessionId: "override_session",
    },
  });
  const link = useAttributedPaymentLink("https://creem.io/payment/prod_123");
  const overrideLink = useAttributedPaymentLink("https://creem.io/payment/prod_456", {
    tracking: {
      datafastVisitorId: "override_link_visitor",
      datafastSessionId: "override_link_session",
    },
  });
  const context = useDataFastTracking();

  return (
    <div>
      <output data-testid="checkout-action">{action}</output>
      <output data-testid="payment-link">{link}</output>
      <output data-testid="payment-link-override">{overrideLink}</output>
      <output data-testid="resolved-domain">{context.resolvedDomain}</output>
    </div>
  );
}

function createMockClient(input?: { visitorId?: string; sessionId?: string }) {
  return {
    trackPageview: vi.fn().mockResolvedValue(undefined),
    flush: vi.fn().mockResolvedValue(undefined),
    getTrackingParams: vi.fn().mockReturnValue({
      _df_vid: input?.visitorId ?? "vis_live",
      _df_sid: input?.sessionId ?? "sess_live",
    }),
  };
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });

  return { promise, resolve, reject };
}
