export const demoConfig = {
  appBaseUrl: process.env.APP_BASE_URL ?? "http://localhost:3000",
  creemProductId: process.env.CREEM_PRODUCT_ID ?? "",
  creemPaymentLink:
    process.env.NEXT_PUBLIC_CREEM_PAYMENT_LINK ??
    (process.env.CREEM_PRODUCT_ID ? `https://creem.io/payment/${process.env.CREEM_PRODUCT_ID}` : ""),
  datafastWebsiteId: process.env.NEXT_PUBLIC_DATAFAST_WEBSITE_ID ?? "",
};

export function getDemoHostname(): string {
  try {
    return new URL(demoConfig.appBaseUrl).hostname;
  } catch {
    return "localhost";
  }
}
