import { cache } from "react";

import { getCreemCoreClient } from "./creem-core";

type ProductFeatureLike = {
  description?: string;
};

type ProductLike = {
  name?: string;
  description?: string;
  price?: number;
  currency?: string;
  billingType?: string;
  billingPeriod?: string;
  imageUrl?: string;
  productUrl?: string;
  features?: ProductFeatureLike[];
};

export type DemoOffer = {
  productId: string;
  name: string;
  description: string;
  price: number | null;
  priceLabel: string;
  currency: string;
  billingType: string;
  billingLabel: string;
  imageUrl: string;
  productUrl: string;
  features: string[];
  source: "creem" | "fallback";
  fallbackReason?: string;
  availability: {
    checkoutConfigured: boolean;
    offerLoaded: boolean;
    directPaymentLinkReady: boolean;
    imageReady: boolean;
  };
};

const DEFAULT_FEATURES = [
  "Start a real checkout from the page itself.",
  "Keep the purchase trail connected from click to confirmation.",
  "See the proof feed after payment, not instead of payment.",
];

const FALLBACK_COPY = {
  name: "Example Storefront Purchase",
  description:
    "Run a real purchase flow and keep the proof trail inside the same demo app.",
  currency: "USD",
  billingType: "onetime",
};

export const getDemoOffer = cache(async (): Promise<DemoOffer> => {
  const productId = process.env.CREEM_PRODUCT_ID?.trim() ?? "";
  if (!productId) {
    return createFallbackOffer(productId, "Missing CREEM_PRODUCT_ID.");
  }

  try {
    const product = (await getCreemCoreClient().products.get(productId)) as ProductLike;
    return mapProductToOffer(productId, product);
  } catch (error) {
    return createFallbackOffer(productId, getErrorMessage(error));
  }
});

export function formatPriceLabel(price: number | null, currency: string): string {
  if (price == null) {
    return "Live price loads from CREEM";
  }

  const normalizedCurrency = (currency || FALLBACK_COPY.currency).toUpperCase();

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: normalizedCurrency,
      maximumFractionDigits: 2,
    }).format(price / 100);
  } catch {
    return `${(price / 100).toFixed(2)} ${normalizedCurrency}`;
  }
}

export function formatBillingLabel(billingType: string, billingPeriod: string): string {
  if (billingType !== "recurring") {
    return "one-time purchase";
  }

  switch (billingPeriod) {
    case "every-month":
      return "billed every month";
    case "every-three-months":
      return "billed every three months";
    case "every-six-months":
      return "billed every six months";
    case "every-year":
      return "billed every year";
    default:
      return "recurring purchase";
  }
}

function mapProductToOffer(productId: string, product: ProductLike): DemoOffer {
  const name = normalizeText(product.name) || FALLBACK_COPY.name;
  const description = normalizeText(product.description) || FALLBACK_COPY.description;
  const currency = normalizeText(product.currency)?.toUpperCase() || FALLBACK_COPY.currency;
  const billingType = normalizeText(product.billingType) || FALLBACK_COPY.billingType;
  const billingPeriod = normalizeText(product.billingPeriod) || "once";
  const imageUrl = normalizeText(product.imageUrl) || "";
  const productUrl = normalizeText(product.productUrl) || "";
  const features = getFeatureList(product.features);
  const price = typeof product.price === "number" ? product.price : null;

  return {
    productId,
    name,
    description,
    price,
    priceLabel: formatPriceLabel(price, currency),
    currency,
    billingType,
    billingLabel: formatBillingLabel(billingType, billingPeriod),
    imageUrl,
    productUrl,
    features,
    source: "creem",
    availability: {
      checkoutConfigured: true,
      offerLoaded: true,
      directPaymentLinkReady: Boolean(productUrl),
      imageReady: Boolean(imageUrl),
    },
  };
}

function createFallbackOffer(productId: string, fallbackReason: string): DemoOffer {
  const checkoutConfigured = Boolean(productId);

  return {
    productId,
    name: FALLBACK_COPY.name,
    description: FALLBACK_COPY.description,
    price: null,
    priceLabel: formatPriceLabel(null, FALLBACK_COPY.currency),
    currency: FALLBACK_COPY.currency,
    billingType: FALLBACK_COPY.billingType,
    billingLabel: formatBillingLabel(FALLBACK_COPY.billingType, "once"),
    imageUrl: "",
    productUrl: "",
    features: DEFAULT_FEATURES,
    source: "fallback",
    fallbackReason,
    availability: {
      checkoutConfigured,
      offerLoaded: false,
      directPaymentLinkReady: false,
      imageReady: false,
    },
  };
}

function getFeatureList(features: ProductFeatureLike[] | undefined): string[] {
  const normalized = (features ?? [])
    .map((feature) => normalizeText(feature.description))
    .filter((feature): feature is string => Boolean(feature))
    .slice(0, 3);

  return normalized.length > 0 ? normalized : DEFAULT_FEATURES;
}

function normalizeText(value: string | undefined): string {
  return value?.trim() ?? "";
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Unable to load the configured CREEM product.";
}
